import { useState, useCallback, useEffect } from "react";
import {
  getAllAssets,
  initializeSchema,
  resetAsset,
  deleteAsset,
} from "../db/db";
import { syncEventBus, type SyncEventPayload } from "../services/SyncEventBus";
import { getQueueManager } from "../services/QueueManager";
import { queueEvents } from "../services/QueueEvents";
import type { LocalAssetRecord } from "../types";
import type { AuthUser } from "../types";

export function useAssets(user: AuthUser | null) {
  const [items, setItems] = useState<LocalAssetRecord[]>([]);
  const [syncingIds, setSyncingIds] = useState<Set<number>>(new Set());
  const [failedIds, setFailedIds] = useState<Set<number>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  // Load all assets from DB
  const reload = useCallback(async () => {
    const all = await getAllAssets();
    setItems(all);
  }, []);

  // Refresh: reload + process queue
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    const queueManager = getQueueManager();
    await queueManager.processQueue();
    setRefreshing(false);
  }, [reload]);

  // Retry failed asset
  const handleRetry = useCallback(
    async (assetId: number) => {
      console.log(`🔄 Retrying asset ${assetId}`);
      await resetAsset(assetId);
      await reload();
      const queueManager = getQueueManager();
      await queueManager.enqueue(assetId);
    },
    [reload]
  );

  // Delete asset (simplified - AUDITOR only)
  const handleDeleteAsset = useCallback(
    async (assetId: number, filename: string) => {
      try {
        await deleteAsset(assetId);
        await reload();
      } catch (error) {
        console.error("Error deleting asset:", error);
        throw error;
      }
    },
    [reload]
  );

  // Initialize DB + listen to sync events and queue changes
  useEffect(() => {
    void (async () => {
      await initializeSchema();
      await reload();
    })();

    const handleAssetUploading = (payload: SyncEventPayload) => {
      if (payload.assetId) {
        setSyncingIds((prev) => new Set(prev).add(payload.assetId!));
      }
    };

    const handleAssetUploaded = (payload: SyncEventPayload) => {
      if (payload.assetId) {
        setSyncingIds((prev) => {
          const updated = new Set(prev);
          updated.delete(payload.assetId!);
          return updated;
        });
        setFailedIds((prev) => {
          const updated = new Set(prev);
          updated.delete(payload.assetId!);
          return updated;
        });
      }
      void reload();
    };

    const handleAssetFailed = (payload: SyncEventPayload) => {
      if (payload.assetId) {
        setSyncingIds((prev) => {
          const updated = new Set(prev);
          updated.delete(payload.assetId!);
          return updated;
        });
        setFailedIds((prev) => new Set(prev).add(payload.assetId!));
      }
    };

    // Listen to queue changes to refresh UI and clear syncing IDs when queue is empty
    const handleQueueChanged = () => {
      void reload();
      // Clear all syncing IDs when queue changes (may now be empty)
      setSyncingIds(new Set());
    };

    syncEventBus.onSyncEvent("asset:uploading", handleAssetUploading);
    syncEventBus.onSyncEvent("asset:uploaded", handleAssetUploaded);
    syncEventBus.onSyncEvent("asset:failed", handleAssetFailed);
    queueEvents.on("changed", handleQueueChanged);

    return () => {
      syncEventBus.offSyncEvent("asset:uploading", handleAssetUploading);
      syncEventBus.offSyncEvent("asset:uploaded", handleAssetUploaded);
      syncEventBus.offSyncEvent("asset:failed", handleAssetFailed);
      queueEvents.off("changed", handleQueueChanged);
    };
  }, [reload]);

  return {
    items,
    syncingIds,
    failedIds,
    refreshing,
    onRefresh,
    handleRetry,
    handleDeleteAsset,
  };
}
