import type { LocalAssetRecord } from "../types";
import { execSql, queryAll, queryOne, insertOne } from "../utils/dbHelpers";

// Simple UUID v4-like generator that doesn't require crypto.getRandomValues()
function generateUUID(): string {
  const chars = "0123456789abcdef";
  let uuid = "";
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += "-";
    } else if (i === 14) {
      uuid += "4"; // UUID v4
    } else if (i === 19) {
      uuid +=
        chars[Math.floor(Math.random() * 16) & (i === 19 ? 0x3 | 0x8 : 0xf)];
    } else {
      uuid += chars[Math.floor(Math.random() * 16)];
    }
  }
  return uuid;
}

export async function initializeSchema(): Promise<void> {
  // Check if table exists and has uuid column
  try {
    const result = await queryOne<any>(`PRAGMA table_info(assets)`);
    if (result) {
      // Table exists, check if it has uuid column
      const columns = await queryAll<any>(`PRAGMA table_info(assets)`);
      const hasUuid = columns.some((col: any) => col.name === "uuid");

      if (!hasUuid) {
        // Table exists but missing uuid column - drop and recreate
        console.log("Migrating assets table - dropping old schema");
        await execSql(`DROP TABLE IF EXISTS assets`);
      }
    }
  } catch (err) {
    // Table doesn't exist, safe to create
  }

  console.log("Creating/verifying assets table schema");
  await execSql(
    `CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      timestamp_ms INTEGER NOT NULL,
      status TEXT NOT NULL,
      retries INTEGER NOT NULL DEFAULT 0,
      latitude REAL,
      longitude REAL,
      image_base64 TEXT NOT NULL,
      uri TEXT,
      server_id TEXT,
      file_size_bytes INTEGER,
      user_id INTEGER,
      username TEXT,
      photo_category TEXT DEFAULT 'Site',
      last_attempt_at INTEGER
    )`
  );

  // Migration: Add last_attempt_at column if missing
  try {
    await execSql(`ALTER TABLE assets ADD COLUMN last_attempt_at INTEGER`);
  } catch (err) {
    // Column already exists, ignore error
  }

  // Reset stale "uploading" rows on startup (5 minute threshold)
  const now = Date.now();
  const staleMs = 5 * 60 * 1000; // 5 minutes
  try {
    await execSql(
      `UPDATE assets SET status = 'pending' WHERE status = 'uploading' AND (last_attempt_at IS NULL OR last_attempt_at < ?)`,
      [now - staleMs]
    );
    console.log("Reset stale uploading assets to pending");
  } catch (err) {
    console.error("Error resetting stale uploads:", err);
  }

  // Migration: Clear invalid server IDs from previous mock versions
  // (e.g., "local_1_", "server_1_timestamp", etc.)
  try {
    await execSql(
      `UPDATE assets SET server_id = NULL WHERE server_id LIKE 'local_%' OR server_id LIKE 'server_%'`
    );
  } catch (err) {
    // Ignore if column doesn't exist yet
  }
}

export async function insertAsset(params: {
  filename: string;
  mimeType: string;
  timestampMs: number;
  status: "pending" | "uploaded" | "failed";
  retries?: number;
  latitude?: number | null;
  longitude?: number | null;
  imageBase64: string;
  uri?: string | null;
  fileSizeBytes?: number;
  userId?: number | null;
  username?: string | null;
  photoCategory?: string | null;
}): Promise<number> {
  const uuid = generateUUID();
  return insertOne(
    `INSERT INTO assets (uuid, filename, mime_type, timestamp_ms, status, retries, latitude, longitude, image_base64, uri, file_size_bytes, user_id, username, photo_category)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuid,
      params.filename,
      params.mimeType,
      params.timestampMs,
      params.status,
      params.retries ?? 0,
      params.latitude ?? null,
      params.longitude ?? null,
      params.imageBase64,
      params.uri ?? null,
      params.fileSizeBytes ?? null,
      params.userId ?? null,
      params.username ?? null,
      params.photoCategory ?? "Site",
    ]
  );
}

export async function getAllAssets(): Promise<LocalAssetRecord[]> {
  const rows = await queryAll<any>(`SELECT * FROM assets ORDER BY id DESC`);
  return rows.map(mapRow);
}

export async function getPendingAssets(limit = 5): Promise<LocalAssetRecord[]> {
  const rows = await queryAll<any>(
    `SELECT * FROM assets WHERE status IN ('pending', 'failed') ORDER BY id ASC LIMIT ?`,
    [limit]
  );
  return rows.map(mapRow);
}

export async function reservePendingAssets(
  limit = 5
): Promise<LocalAssetRecord[]> {
  // Fetch ids to reserve (include failed items to retry when online)
  const sel = await queryAll<{ id: number }>(
    `SELECT id FROM assets WHERE status IN ('pending', 'failed') ORDER BY id ASC LIMIT ?`,
    [limit]
  );
  if (sel.length === 0) return [];

  const ids = sel.map((r) => r.id);
  const placeholders = ids.map(() => "?").join(",");

  // Mark them as uploading
  await execSql(
    `UPDATE assets SET status = 'uploading' WHERE id IN (${placeholders})`,
    ids
  );

  // Return the full rows
  const rowsRes = await queryAll<any>(
    `SELECT * FROM assets WHERE id IN (${placeholders}) ORDER BY id ASC`,
    ids
  );
  return rowsRes.map(mapRow);
}

export async function markUploaded(
  id: number,
  serverId: string
): Promise<void> {
  await execSql(
    `UPDATE assets SET status = 'uploaded', server_id = ? WHERE id = ?`,
    [serverId, id]
  );
}

export async function incrementRetry(id: number): Promise<number> {
  await execSql(`UPDATE assets SET retries = retries + 1 WHERE id = ?`, [id]);
  const row = await queryOne<{ retries: number }>(
    `SELECT retries FROM assets WHERE id = ?`,
    [id]
  );
  return row?.retries ?? 0;
}

export async function markFailed(id: number): Promise<void> {
  await execSql(`UPDATE assets SET status = 'failed' WHERE id = ?`, [id]);
}

export async function setPending(id: number): Promise<void> {
  await execSql(`UPDATE assets SET status = 'pending' WHERE id = ?`, [id]);
}

export async function resetFailedAssets(): Promise<void> {
  // Reset all failed items back to pending with retry count reset
  await execSql(
    `UPDATE assets SET status = 'pending', retries = 0 WHERE status = 'failed'`
  );
}

export async function resetAsset(id: number): Promise<void> {
  // Reset specific asset back to pending with retry count reset
  await execSql(
    `UPDATE assets SET status = 'pending', retries = 0 WHERE id = ?`,
    [id]
  );
}

export async function incrementRetryCapped(
  id: number,
  maxRetries: number
): Promise<number> {
  const row = await queryOne<{ retries: number }>(
    `SELECT retries FROM assets WHERE id = ?`,
    [id]
  );
  const current = row?.retries ?? 0;
  if (current >= maxRetries) return current;
  await execSql(`UPDATE assets SET retries = ? WHERE id = ?`, [
    current + 1,
    id,
  ]);
  return current + 1;
}

function mapRow(r: any): LocalAssetRecord {
  return {
    id: r.id,
    uuid: r.uuid || `local_${r.id}_${Date.now()}`, // Generate UUID if missing (for existing rows)
    filename: r.filename,
    mimeType: r.mime_type,
    timestampMs: r.timestamp_ms,
    status: r.status,
    retries: r.retries,
    latitude: r.latitude ?? null,
    longitude: r.longitude ?? null,
    imageBase64: r.image_base64,
    uri: r.uri ?? null,
    serverId: r.server_id ?? null,
    fileSizeBytes: r.file_size_bytes ?? null,
    userId: r.user_id ?? null,
    username: r.username ?? null,
    photoCategory: (r.photo_category as any) ?? "Site",
  };
}

export async function deleteAsset(id: number): Promise<void> {
  await execSql(`DELETE FROM assets WHERE id = ?`, [id]);
}
export async function resetUploadingAssets(): Promise<void> {
  // Reset any stuck "uploading" rows back to "pending"
  await execSql(
    `UPDATE assets SET status = 'pending' WHERE status = 'uploading'`
  );
  console.log("Reset all uploading assets to pending");
}

export interface AssetWithUser extends LocalAssetRecord {
  userId?: number | null;
  username?: string | null;
}

export async function getAssetsByUserId(
  userId: number
): Promise<AssetWithUser[]> {
  const rows = await queryAll<any>(
    `SELECT * FROM assets WHERE user_id = ? ORDER BY timestamp_ms DESC`,
    [userId]
  );
  return rows.map((row) => ({
    ...mapRow(row),
    userId: row.user_id ?? null,
    username: row.username ?? null,
  }));
}
