import { BehaviorSubject, Observable } from "rxjs";
import {
  getPendingAssets,
  reservePendingAssets,
  markUploaded,
  markFailed,
  setPending,
  incrementRetryCapped,
  resetUploadingAssets,
} from "../db/db";
import { syncEventBus } from "./SyncEventBus";
import { emitQueueChanged } from "./QueueEvents";
import { uploadPhoto } from "../utils/api";
import * as Network from "expo-network";
import { QUEUE_CONFIG } from "../config";
import type {
  LocalAssetRecord,
  QueueMetrics,
  ServerUploadResponse,
  SyncSettings,
} from "../types";

const MAX_CONCURRENT_UPLOADS = 3;
const BATCH_SIZE = 5;
const MAX_RETRIES = 5;

export class QueueManager {
  private metrics$ = new BehaviorSubject<QueueMetrics>(
    this.getInitialMetrics()
  );
  private processingAssets = new Map<number, Promise<void>>();
  private isPaused = false;
  private isProcessing = false;
  private completedCount = 0;
  private failedCount = 0;
  private uploadTimes: number[] = [];
  private settings: SyncSettings = {
    autoUploadEnabled: true,
    onlyWiFi: false,
  };

  constructor(settings?: SyncSettings) {
    if (settings) {
      this.settings = settings;
    }
    // Don't initialize queue in constructor - let it initialize on first use
  }

  // Allow settings to be updated at runtime
  updateSettings(settings: SyncSettings): void {
    this.settings = settings;
  }

  private async initializeQueue(): Promise<void> {
    try {
      const pending = await getPendingAssets(100);
      this.updateMetrics();
    } catch (error) {
      // Silently ignore - table may not exist yet
    }
  }

  async enqueue(assetId: number): Promise<void> {
    await this.updateMetrics();
    syncEventBus.emitAssetQueued(assetId);

    if (!this.isProcessing && !this.isPaused) {
      void this.processQueue();
    }
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || this.isPaused) {
      console.log(
        `📤 [processQueue] Already processing or paused. isProcessing=${this.isProcessing}, isPaused=${this.isPaused}`
      );
      return;
    }

    // Check if device is online before processing (but don't block if check fails)
    let canProceed = true;
    try {
      const netState = await Network.getNetworkStateAsync();

      if (!netState.isConnected) {
        console.log("📤 [processQueue] Device is offline, skipping");
        return; // Device is offline, don't process
      }

      // If Wi-Fi only mode is enabled, check connection type
      if (
        this.settings.onlyWiFi &&
        netState.type !== Network.NetworkStateType.WIFI
      ) {
        console.log(
          `📤 [processQueue] Not on WiFi (${netState.type}), skipping`
        );
        return; // Not on Wi-Fi, don't process
      }
    } catch (networkError) {
      // Network check failed (likely permission denied)
      if (QUEUE_CONFIG.allowProceedIfNetworkCheckFails) {
        console.warn(
          "⚠️ [processQueue] Network check failed, but allowProceedIfNetworkCheckFails=true so proceeding:",
          networkError
        );
        canProceed = true;
      } else {
        console.warn(
          "⚠️ [processQueue] Network check failed - treating as offline (not proceeding):",
          networkError
        );
        return; // Do not proceed when network status cannot be verified
      }
    }

    this.isProcessing = true;
    console.log("📤 [processQueue] Starting...");

    try {
      // Ensure queue is initialized
      try {
        await this.initializeQueue();
      } catch (initError) {
        console.error("📤 [processQueue] Error initializing queue:", initError);
        return; // Can't proceed if we can't init
      }

      let batch;
      try {
        batch = await reservePendingAssets(BATCH_SIZE);
      } catch (batchError) {
        console.error("📤 [processQueue] Error getting batch:", batchError);
        return;
      }
      console.log(`📤 [processQueue] Got batch of ${batch.length} assets`);

      while (batch.length > 0 && !this.isPaused) {
        const concurrentCount = this.processingAssets.size;

        if (concurrentCount >= MAX_CONCURRENT_UPLOADS) {
          console.log(
            `📤 [processQueue] Max concurrent (${MAX_CONCURRENT_UPLOADS}) reached, waiting...`
          );
          try {
            await Promise.race(Array.from(this.processingAssets.values()));
          } catch (raceError) {
            console.error(
              "📤 [processQueue] Error waiting for uploads:",
              raceError
            );
          }
          continue;
        }

        for (const asset of batch) {
          console.log(
            `📤 [processQueue] Uploading asset ${asset.id}: ${asset.filename}`
          );
          const promise = this.uploadAsset(asset);
          this.processingAssets.set(asset.id, promise);
          promise.finally(() => this.processingAssets.delete(asset.id));
        }

        try {
          await this.updateMetrics();
        } catch (metricsError) {
          console.error(
            "📤 [processQueue] Error updating metrics:",
            metricsError
          );
        }
        await new Promise((r) => setTimeout(r, 500));

        try {
          batch = await reservePendingAssets(BATCH_SIZE);
        } catch (nextBatchError) {
          console.error(
            "📤 [processQueue] Error getting next batch:",
            nextBatchError
          );
          break;
        }
        if (batch.length > 0) {
          console.log(
            `📤 [processQueue] Got next batch of ${batch.length} assets`
          );
        }
      }

      console.log("✅ [processQueue] Completed");
    } catch (error) {
      console.error("❌ [processQueue] Unexpected error:", error);
      // Don't re-throw - let the app continue
    } finally {
      this.isProcessing = false;
    }
  }

  private async uploadAsset(asset: LocalAssetRecord): Promise<void> {
    const startTime = Date.now();
    console.log(
      `⬆️ [uploadAsset] Starting upload for asset ${asset.id}: ${asset.filename}`
    );
    syncEventBus.emitAssetUploading(asset.id);

    try {
      const response = await this.uploadOne(asset);
      console.log(
        `⬆️ [uploadAsset] Got response for asset ${asset.id}:`,
        response.status
      );

      if (response.status === "ok") {
        await markUploaded(asset.id, response.serverId);
        const duration = Date.now() - startTime;
        this.uploadTimes.push(duration);
        this.completedCount++;
        console.log(
          `✅ [uploadAsset] Asset ${asset.id} uploaded successfully (${duration}ms)`
        );
        syncEventBus.emitAssetUploaded(asset.id, response.serverId, duration);
        await this.updateMetrics();
      } else {
        throw new Error("Server returned error status");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(
        `❌ [uploadAsset] Failed to upload asset ${asset.id}:`,
        errorMsg
      );
      await this.handleUploadFailure(asset.id, errorMsg);
    }
  }

  private async handleUploadFailure(
    assetId: number,
    errorMsg: string
  ): Promise<void> {
    const newRetries = await incrementRetryCapped(assetId, MAX_RETRIES);

    if (newRetries >= MAX_RETRIES) {
      await markFailed(assetId);
      this.failedCount++;
      syncEventBus.emitAssetFailed(assetId, errorMsg, true);
    } else {
      await setPending(assetId);
      const backoffMs = this.calculateBackoff(newRetries);
      syncEventBus.emitAssetRetrying(assetId, newRetries, backoffMs, errorMsg);

      await new Promise((r) => setTimeout(r, backoffMs));
      void this.enqueue(assetId);
    }

    this.updateMetrics();
  }

  private async uploadOne(
    asset: LocalAssetRecord
  ): Promise<ServerUploadResponse> {
    // Actually upload to server - will throw error if offline or server unreachable
    return await uploadPhoto(asset);
  }

  private calculateBackoff(attempt: number): number {
    const baseDelay = Math.min(30000, 1000 * Math.pow(2, attempt - 1));
    const jitter = baseDelay * 0.2 * (Math.random() - 0.5);
    return Math.max(1000, baseDelay + jitter);
  }

  getMetrics$(): Observable<QueueMetrics> {
    return this.metrics$.asObservable();
  }

  private async updateMetrics(): Promise<void> {
    // Get actual pending count from database
    const pending = await getPendingAssets(1000).catch(() => []);
    const totalQueued = pending.length;

    const metrics: QueueMetrics = {
      totalQueued,
      inProgress: this.processingAssets.size,
      completed: this.completedCount,
      failed: this.failedCount,
      averageUploadTime:
        this.uploadTimes.length > 0
          ? this.uploadTimes.reduce((a, b) => a + b, 0) /
            this.uploadTimes.length
          : 0,
      errorRate:
        this.completedCount + this.failedCount > 0
          ? this.failedCount / (this.completedCount + this.failedCount)
          : 0,
      lastSyncTime: Date.now(),
    };

    this.metrics$.next(metrics);
  }

  private getInitialMetrics(): QueueMetrics {
    return {
      totalQueued: 0,
      inProgress: 0,
      completed: 0,
      failed: 0,
      averageUploadTime: 0,
      errorRate: 0,
      lastSyncTime: 0,
    };
  }
}

// Singleton instance
let queueManagerInstance: QueueManager | null = null;

export function getQueueManager(): QueueManager {
  if (!queueManagerInstance) {
    queueManagerInstance = new QueueManager();
  }
  return queueManagerInstance;
}

export default getQueueManager();

// Retry all pending - reset stuck uploads and start processing
export async function retryAllPending(): Promise<void> {
  console.log("🔄 [retryAllPending] Starting...");
  try {
    // Reset any stuck "uploading" rows back to "pending"
    try {
      await resetUploadingAssets();
      console.log("✅ [retryAllPending] Reset uploading assets");
    } catch (resetError) {
      console.error(
        "❌ [retryAllPending] Error resetting uploading assets:",
        resetError
      );
      // Continue anyway - don't let DB errors stop the retry
    }

    // Emit change so UI refreshes
    try {
      emitQueueChanged();
      console.log("✅ [retryAllPending] Emitted queue changed event");
    } catch (emitError) {
      console.error(
        "❌ [retryAllPending] Error emitting queue changed:",
        emitError
      );
      // Continue anyway
    }

    // Start processing queue
    try {
      const qm = getQueueManager();
      console.log("✅ [retryAllPending] Processing queue...");
      await qm.processQueue();
      console.log("✅ [retryAllPending] Queue processing complete");
    } catch (processError) {
      console.error(
        "❌ [retryAllPending] Error processing queue:",
        processError
      );
      // Continue anyway - don't crash on process error
    }
  } catch (error) {
    // Final safety net - catch any unexpected errors
    console.error("❌ [retryAllPending] Unexpected error:", error);
    // Don't re-throw - let the app continue
  }
}
