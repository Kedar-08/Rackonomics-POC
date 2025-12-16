/**
 * Centralized configuration for the app
 * Environment-driven: use .env or process.env to override
 */

// API Configuration
export const API_CONFIG = {
  // Backend API base URL - set via environment or use default
  // For development with adb reverse: http://localhost:3000/api
  // For Android emulator: http://10.0.2.2:3000/api (localhost shortcut)
  // For production: https://api.yourbackend.com/api
  baseUrl: process.env.REACT_APP_API_BASE_URL || "http://localhost:3000/api",

  // Use mock server instead of real API (for development/testing)
  // Default to real backend mode; set to true if you want built-in mock simulation
  useMock: (process.env.REACT_APP_USE_MOCK ?? "false") === "true",

  // Upload endpoint timeout (milliseconds)
  uploadTimeoutMs: 30000,

  // Health check interval (milliseconds) - optional, for monitoring
  healthCheckIntervalMs: 60000,
};

// Network Configuration
export const NETWORK_CONFIG = {
  // Check network status every 1 second (more responsive UI)
  pollIntervalMs: 1000,

  // Only upload when on WiFi (disable for cellular)
  onlyWiFi: false,
};

// Queue Configuration
export const QUEUE_CONFIG = {
  // Max concurrent uploads
  maxConcurrent: 3,

  // Assets per batch
  batchSize: 5,

  // Max retries before marking as failed
  maxRetries: 5,

  // Retry backoff: exponential with jitter
  baseBackoffMs: 1000,
  maxBackoffMs: 30000,
  // Should the queue proceed with uploads when the network check fails (e.g. permission denied)?
  // Default: false -> treat failed network check as offline and do not upload
  allowProceedIfNetworkCheckFails: false,
};

// Logging Configuration
export const LOG_CONFIG = {
  // Enable verbose logs (set to false in production)
  verbose: (process.env.REACT_APP_LOG_VERBOSE ?? "false") === "true",

  // Log API calls
  logApiCalls: true,

  // Log network status changes
  logNetworkChanges: true,
};

/**
 * Helper to check if running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Helper to check if using mock backend
 */
export function isMockMode(): boolean {
  return API_CONFIG.useMock;
}
