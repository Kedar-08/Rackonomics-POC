import { LocalAssetRecord, ServerUploadResponse } from "../types";
import * as Network from "expo-network";
import { API_CONFIG, LOG_CONFIG } from "../config";
import { UploadResponse, isUploadSuccess } from "../api/contract";

// Use centralized config instead of hardcoded values
const API_BASE = API_CONFIG.baseUrl;
const USE_MOCK = API_CONFIG.useMock;
const UPLOAD_TIMEOUT = API_CONFIG.uploadTimeoutMs;

// Emit clear startup info so we can tell whether the app is using mock mode
if (LOG_CONFIG.logApiCalls) {
  console.log(
    `ℹ️  API client mode: ${USE_MOCK ? "MOCK" : "REAL"}, baseUrl: ${API_BASE}`
  );
}

export async function uploadPhoto(
  asset: LocalAssetRecord
): Promise<ServerUploadResponse> {
  // Mock mode for testing - simulates successful upload ONLY if online
  if (USE_MOCK) {
    console.log(`📤 Uploading ${asset.filename}...`);

    // Check if device is actually online (mock should behave like real API)
    try {
      const netState = await Network.getNetworkStateAsync();
      if (!netState.isConnected) {
        console.log(`❌ Upload failed: Device is offline`);
        throw new Error("Network request failed - device is offline");
      }
    } catch (error) {
      // If we can't check network state, assume offline and fail
      console.log(`❌ Upload failed: Cannot verify network connection`);
      throw new Error("Network request failed - cannot verify connection");
    }

    await new Promise((r) => setTimeout(r, 2000)); // Simulate 2 second upload
    // Generate a realistic server ID (like a UUID or server-generated ID)
    const mockServerId = `srv${Math.random().toString(36).substring(2, 10)}`;
    console.log(`✅ Upload complete: ${mockServerId}`);
    return {
      status: "ok",
      serverId: mockServerId,
    };
  }

  // Real upload with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT);

  try {
    const form = new FormData();

    // Use URI if available, otherwise use base64
    if (asset.uri && asset.uri.length > 0) {
      const file: any = {
        uri: asset.uri,
        name: asset.filename,
        type: asset.mimeType,
      };
      form.append("file", file as any);
    } else {
      const file: any = {
        name: asset.filename,
        type: asset.mimeType,
        data: asset.imageBase64,
      };
      form.append("file", file as any);
    }

    form.append("filename", asset.filename);
    form.append("mimeType", asset.mimeType);
    form.append("timestamp", String(asset.timestampMs));
    form.append(
      "latitude",
      asset.latitude != null ? String(asset.latitude) : ""
    );
    form.append(
      "longitude",
      asset.longitude != null ? String(asset.longitude) : ""
    );

    const response = await fetch(`${API_BASE}/assets/upload`, {
      method: "POST",
      body: form as any,
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const json = await response.json();
    return json as ServerUploadResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Upload timeout - please check your connection");
    }
    throw error;
  }
}

/**
 * Health check - verify backend is reachable and healthy
 * Optional but recommended for debugging connection issues
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(
      `${API_BASE.replace(/\/api\/?$/, "")}/health`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );
    return response.ok;
  } catch (error) {
    if (LOG_CONFIG.logApiCalls) {
      console.log(`⚠️ [Health Check] Backend unreachable:`, error);
    }
    return false;
  }
}
