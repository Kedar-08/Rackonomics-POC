import { LocalAssetRecord, ServerUploadResponse } from "../types";
import * as Network from "expo-network";

// Using adb reverse tunnel (device connected via USB)
// Run: adb reverse tcp:3000 tcp:3000
const API_BASE = "http://localhost:3000/api";
const UPLOAD_TIMEOUT = 30000; // 30 seconds
// Disable the internal JS mock so the app performs real network uploads
const USE_MOCK = false;

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
