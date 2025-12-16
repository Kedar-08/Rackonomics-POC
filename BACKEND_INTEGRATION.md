# Backend Integration Guide

This guide describes how the Expo Image Sync frontend is architected for seamless integration with the Python backend.

## API Contract

The frontend expects a backend API implementing the contract defined in [src/api/contract.ts](src/api/contract.ts).

### Core Endpoints

#### 1. **POST /assets/upload** - Upload a photo

**Request:**

- Method: `POST`
- Content-Type: `multipart/form-data`
- Fields:
  | Field | Type | Required | Description |
  | --- | --- | --- | --- |
  | `file` | File | ✅ | Binary photo file (JPEG/PNG) |
  | `filename` | string | ✅ | Original filename |
  | `mimeType` | string | ✅ | File MIME type (e.g., "image/jpeg") |
  | `timestamp` | number | ✅ | Photo capture timestamp (ms since epoch) |
  | `latitude` | number | ❌ | GPS latitude (null if not available) |
  | `longitude` | number | ❌ | GPS longitude (null if not available) |
  | `userId` | number | ✅ | User ID (integer) |
  | `username` | string | ✅ | Username (for display) |
  | `photoCategory` | string | ✅ | Category (e.g., "Site", "Equipment", "Issue") |

**Response (200 OK):**

```json
{
  "status": "ok",
  "serverId": "unique_server_id_string"
}
```

**Error Response (4xx/5xx):**

```json
{
  "status": "error",
  "code": "ERROR_CODE",
  "message": "Human-readable error message"
}
```

#### 2. **GET /health** - Health check (optional but recommended)

**Request:**

- Method: `GET`
- No authentication required

**Response (200 OK):**

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

#### 3. **POST /auth/login** - User login (optional, for future use)

**Request:**

```json
{
  "username": "user@example.com",
  "password": "password"
}
```

**Response (200 OK):**

```json
{
  "status": "ok",
  "token": "jwt_token_string",
  "user": {
    "id": 123,
    "username": "user@example.com",
    "name": "John Doe"
  }
}
```

## Frontend Configuration

The frontend uses environment variables to control backend behavior:

### Development (Mock Backend)

```bash
REACT_APP_API_BASE_URL=http://localhost:3000/api
REACT_APP_USE_MOCK=true          # Use built-in mock for testing
REACT_APP_LOG_VERBOSE=true       # Enable detailed logging
```

### Development (Real Backend)

```bash
REACT_APP_API_BASE_URL=http://localhost:8000/api
REACT_APP_USE_MOCK=false
REACT_APP_LOG_VERBOSE=true
```

### Android Emulator (Real Backend)

```bash
# Use this to connect emulator to host machine
REACT_APP_API_BASE_URL=http://10.0.2.2:8000/api
REACT_APP_USE_MOCK=false
```

### Production

```bash
REACT_APP_API_BASE_URL=https://api.production.com/api
REACT_APP_USE_MOCK=false
REACT_APP_LOG_VERBOSE=false
```

## Frontend Architecture

### 1. **Centralized Configuration** (`src/config.ts`)

All backend URLs, timeouts, and feature flags are defined in a single location. Backend team doesn't need to modify code to switch between mock/real backends.

### 2. **Type-Safe API Client** (`src/utils/api.ts`)

- Implements `uploadAsset()` function with proper error handling
- Supports both mock and real backends transparently
- Timeout: 30 seconds (configurable via `REACT_APP_UPLOAD_TIMEOUT`)
- Retries: Handled by QueueManager with exponential backoff

### 3. **Queue Manager** (`src/services/QueueManager.ts`)

- Batches photos for efficient upload
- Processes 5 assets at a time, max 3 concurrent uploads
- Automatic retry with exponential backoff + jitter
- Survives app restarts (queue persisted to SQLite)

### 4. **Network Detection** (`src/hooks/useNetworkStatus.ts`)

- Polls network every 2 seconds
- Auto-retries queued uploads when connection restored
- Gracefully handles permission denied

### 5. **Storage** (`src/db/db.ts`)

- SQLite database stores all photos locally
- Each photo records: filename, thumbnail, capture timestamp, location, category, status
- Status values: `pending` (not yet uploaded), `syncing` (uploading), `synced` (uploaded), `failed` (upload failed)

## Integration Checklist

### Backend Team

- [ ] Implement POST `/assets/upload` endpoint accepting multipart/form-data
- [ ] Validate required fields (file, filename, mimeType, timestamp, userId, username, photoCategory)
- [ ] Store file with unique serverId identifier
- [ ] Return JSON response with `status: "ok"` and `serverId`
- [ ] Implement error handling returning `status: "error"`, `code`, `message`
- [ ] (Recommended) Implement GET `/health` endpoint for debugging
- [ ] (Optional) Implement POST `/auth/login` for authentication

### Frontend Team (Already Done)

- [x] Centralized config in `src/config.ts`
- [x] Type-safe API client in `src/utils/api.ts`
- [x] API contract types in `src/api/contract.ts`
- [x] Queue manager with retry logic
- [x] Network detection and auto-retry
- [x] SQLite storage for offline support
- [x] Mock server for development testing
- [x] Environment-driven configuration

## How to Test Backend Integration

### Using Mock Server (Fastest)

```bash
# Install dependencies
npm install

# Start mock server
node scripts/mock-server.js

# Start Expo app with mock disabled
REACT_APP_USE_MOCK=false REACT_APP_API_BASE_URL=http://localhost:3000/api expo start

# Take a photo in the app (it will POST to mock server)
```

### Using Real Python Backend

```bash
# 1. Python team deploys backend to http://localhost:8000
# 2. Start Expo app with backend URL
REACT_APP_API_BASE_URL=http://localhost:8000/api REACT_APP_USE_MOCK=false expo start

# 3. Take a photo (should see POST request in Python backend logs)
# 4. Verify response has status: "ok" and serverId field
```

### Testing Offline Behavior

1. Take a photo while offline → Status shows "Pending"
2. Go back online → Status automatically changes to "Syncing"
3. If upload succeeds → Status becomes "Synced"
4. If upload fails → Status becomes "Failed" (auto-retry in 5, 10, 30 seconds)

## API Error Handling

The frontend expects error responses in this format:

```json
{
  "status": "error",
  "code": "ERROR_CODE",
  "message": "Description"
}
```

Common error codes the frontend handles:

- `INVALID_REQUEST` - Missing required fields
- `UNAUTHORIZED` - Authentication failed
- `FORBIDDEN` - User not authorized for this action
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource already exists
- `SERVER_ERROR` - Internal server error

All errors trigger auto-retry logic in QueueManager.

## Performance Considerations

1. **File Uploads**: Network timeout is 30 seconds; consider this for large files
2. **Batch Size**: Queue processes 5 assets at a time; adjust via `QUEUE_CONFIG` in `src/config.ts`
3. **Concurrent Uploads**: Max 3 concurrent uploads; prevents network saturation
4. **Retry Backoff**: Exponential with jitter; first retry at 5s, then 10s, 30s, etc.

## Monitoring & Debugging

### Frontend Logs

Enable verbose logging:

```bash
REACT_APP_LOG_VERBOSE=true
```

### Backend Health Check

Frontend can verify backend connectivity:

```bash
curl http://localhost:8000/api/health
```

### Queue Status

Check queue metrics in app's Settings screen:

- Pending: Count of photos waiting to upload
- Syncing: Count currently uploading
- Last Sync: Timestamp of last successful upload

## Migration from Mock to Real Backend

1. **Verify backend implements API contract** (check [src/api/contract.ts](src/api/contract.ts))
2. **Test with mock server first**:
   ```bash
   node scripts/mock-server.js
   REACT_APP_API_BASE_URL=http://localhost:3000/api REACT_APP_USE_MOCK=false expo start
   ```
3. **Switch to real backend**:
   ```bash
   REACT_APP_API_BASE_URL=http://your-backend-url/api REACT_APP_USE_MOCK=false expo start
   ```
4. **Monitor logs** for any request/response mismatches
5. **Run through offline sync workflow** to verify end-to-end functionality

## Questions?

Frontend code is well-documented. Key files:

- [src/api/contract.ts](src/api/contract.ts) - API contract definitions
- [src/utils/api.ts](src/utils/api.ts) - API client implementation
- [src/services/QueueManager.ts](src/services/QueueManager.ts) - Queue & retry logic
- [src/config.ts](src/config.ts) - Centralized configuration
