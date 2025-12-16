import * as SQLite from "expo-sqlite";
const MAX_LOGS = 500; // Keep last 500 logs on device

export interface LogEntry {
  id?: number;
  timestamp: number;
  level: "info" | "warn" | "error" | "network" | "sync";
  message: string;
  data?: string;
}

let logDb: SQLite.WebSQLDatabase | null = null;

async function getDb(): Promise<SQLite.WebSQLDatabase> {
  if (logDb) return logDb;

  logDb = SQLite.openDatabase("photosync.db");

  return new Promise((resolve, reject) => {
    logDb!.transaction((tx) => {
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS device_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp INTEGER,
          level TEXT,
          message TEXT,
          data TEXT
        );`,
        [],
        () => resolve(logDb!),
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
}

export async function addDeviceLog(
  level: LogEntry["level"],
  message: string,
  data?: any
) {
  try {
    const db = await getDb();

    return new Promise<void>((resolve) => {
      try {
        db.transaction((tx) => {
          const dataStr = data ? JSON.stringify(data) : null;
          tx.executeSql(
            "INSERT INTO device_logs (timestamp, level, message, data) VALUES (?, ?, ?, ?)",
            [Date.now(), level, message, dataStr],
            () => {
              // Clean up old logs
              tx.executeSql(
                `DELETE FROM device_logs WHERE id NOT IN (
                  SELECT id FROM device_logs ORDER BY id DESC LIMIT ?
                )`,
                [MAX_LOGS]
              );
              resolve();
            },
            (_, error) => {
              // Silently fail - don't want to crash
              resolve();
              return false;
            }
          );
        });
      } catch (error) {
        // Silently fail on transaction error
        resolve();
      }
    });
  } catch (error) {
    // Silently fail - don't crash the app if logging fails
  }
}

export async function getDeviceLogs(): Promise<LogEntry[]> {
  try {
    const db = await getDb();

    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          "SELECT * FROM device_logs ORDER BY timestamp ASC",
          [],
          (_, result) => {
            resolve(result.rows._array || []);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  } catch (error) {
    return [];
  }
}

export async function clearDeviceLogs() {
  try {
    const db = await getDb();

    return new Promise<void>((resolve) => {
      db.transaction((tx) => {
        tx.executeSql("DELETE FROM device_logs", [], () => resolve());
      });
    });
  } catch (error) {
    // Silently fail
  }
}

export function formatDeviceLogs(logs: LogEntry[]): string {
  return logs
    .map((log) => {
      const date = new Date(log.timestamp).toLocaleTimeString();
      const dataStr = log.data ? ` ${log.data}` : "";
      return `[${date}] ${log.level.toUpperCase()}: ${log.message}${dataStr}`;
    })
    .join("\n");
}
