/**
 * API Contract - defines all request/response shapes for frontend-backend communication
 * Share this with your Python backend team to ensure compatibility
 */

/**
 * POST /assets/upload
 * Upload a photo to the server
 *
 * Request (FormData):
 *   - file: File object (multipart/form-data)
 *   - filename: string
 *   - mimeType: string (e.g., "image/jpeg")
 *   - timestamp: number (milliseconds since epoch)
 *   - latitude: number (optional)
 *   - longitude: number (optional)
 *   - userId: number (optional)
 *   - username: string (optional)
 *   - photoCategory: string (optional, one of: "Site", "Circuit", "Power", "Space")
 *
 * Response (JSON 200 OK):
 *   {
 *     "status": "ok",
 *     "serverId": "string (unique server-side identifier)"
 *   }
 *
 * Error Response (4xx/5xx):
 *   {
 *     "status": "error",
 *     "message": "string (error description)",
 *     "code": "string (error code, optional)"
 *   }
 */

/**
 * Server response after photo upload
 */
export interface UploadResponse {
  status: "ok" | "error";
  serverId?: string; // Present when status === "ok"
  message?: string; // Present when status === "error"
  code?: string; // Optional error code
}

/**
 * GET /health
 * Health check endpoint (optional but recommended)
 *
 * Response (JSON 200 OK):
 *   {
 *     "status": "ok",
 *     "timestamp": "ISO 8601 string",
 *     "version": "string"
 *   }
 */
export interface HealthCheckResponse {
  status: "ok" | "error";
  timestamp?: string;
  version?: string;
  message?: string;
}

/**
 * POST /auth/login (future, for real auth)
 * Authenticate user
 *
 * Request (JSON):
 *   {
 *     "email": "string",
 *     "password": "string"
 *   }
 *
 * Response (JSON 200 OK):
 *   {
 *     "accessToken": "string (JWT)",
 *     "refreshToken": "string (optional)",
 *     "user": {
 *       "id": "number",
 *       "email": "string",
 *       "username": "string",
 *       "name": "string",
 *       "role": "string (e.g., 'AUDITOR')"
 *     }
 *   }
 */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: number;
    email: string;
    username: string;
    name: string;
    role: string;
  };
}

/**
 * API Error Details
 * Standardized error shape for all endpoints
 */
export interface ApiError {
  status: "error";
  code: string; // e.g., "OFFLINE", "TIMEOUT", "SERVER_ERROR"
  message: string;
  statusCode?: number; // HTTP status
  details?: Record<string, any>; // Extra context
}

/**
 * Determine if a response is an error
 */
export function isApiError(response: any): response is ApiError {
  return response?.status === "error";
}

/**
 * Determine if response is a successful upload
 */
export function isUploadSuccess(response: any): response is UploadResponse {
  return response?.status === "ok" && !!response?.serverId;
}
