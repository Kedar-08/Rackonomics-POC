export type AssetStatus = "pending" | "uploading" | "uploaded" | "failed";
export type UserRole = "AUDITOR"; // Single role for tablet app - ready for backend roles (AM, Admin, etc.)
export type PhotoCategory = "Circuit" | "Space" | "Power" | "Site";

export interface LocalAssetRecord {
  id: number;
  uuid: string; // Client-generated UUID for idempotency
  filename: string;
  mimeType: string;
  timestampMs: number;
  status: AssetStatus;
  retries: number;
  latitude?: number | null;
  longitude?: number | null;
  imageBase64: string;
  uri?: string | null;
  serverId?: string | null;
  fileSizeBytes?: number;
  userId?: number | null;
  username?: string | null;
  photoCategory?: PhotoCategory | null;
}

export interface QueueMetrics {
  totalQueued: number;
  inProgress: number;
  completed: number;
  failed: number;
  averageUploadTime: number;
  errorRate: number;
  lastSyncTime: number;
}

export interface ServerUploadResponse {
  serverId: string;
  status: "ok" | "error";
}

// Authentication Types
export interface AuthUser {
  id: string;
  email: string;
  username: string;
  name: string;
  role: UserRole;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isSignedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  // signup removed for POC - users managed externally
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

export interface SyncSettings {
  autoUploadEnabled: boolean;
  onlyWiFi: boolean;
}

export interface SyncTelemetry {
  autoSyncRuns: number;
  successfulUploads: number;
  failedUploads: number;
  lastSyncTime: number | null;
}

export interface SettingsContextType {
  settings: SyncSettings;
  telemetry: SyncTelemetry;
  updateSettings: (settings: Partial<SyncSettings>) => Promise<void>;
  resetTelemetry: () => Promise<void>;
}
