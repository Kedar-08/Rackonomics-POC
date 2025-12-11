import {
  execSql,
  queryOne,
  hashPassword,
  verifyPassword,
} from "../utils/dbHelpers";

export interface StoredUser {
  id: number;
  email: string;
  username: string;
  passwordHash: string;
  role: "AUDITOR";
  createdAt: string;
  updatedAt: string;
}

/**
 * Initialize the users table if it doesn't exist
 */
export async function initializeUsersTable(): Promise<void> {
  await execSql(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY NOT NULL,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'AUDITOR',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )`
  );
}

/**
 * Get user by email address
 */
export async function getUserByEmail(
  email: string
): Promise<StoredUser | null> {
  return queryOne<StoredUser>(`SELECT * FROM users WHERE email = ?`, [email]);
}

/**
 * Get user by username
 */
export async function getUserByUsername(
  username: string
): Promise<StoredUser | null> {
  return queryOne<StoredUser>(`SELECT * FROM users WHERE username = ?`, [
    username,
  ]);
}

/**
 * Get user by ID
 */
export async function getUserById(id: number): Promise<StoredUser | null> {
  return queryOne<StoredUser>(`SELECT * FROM users WHERE id = ?`, [id]);
}

/**
 * Verify password against stored hash (wrapper around helper)
 */
export async function verifyPasswordHash(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    return await verifyPassword(password, hash);
  } catch (error) {
    console.error("Error verifying password:", error);
    return false;
  }
}

/**
 * Create or get AUDITOR user (all users are AUDITORs)
 */
export async function createOrGetAuditor(
  email: string,
  username: string
): Promise<StoredUser> {
  let existing = await getUserByEmail(email);
  if (existing) {
    return existing;
  }

  existing = await getUserByUsername(username);
  if (existing) {
    return existing;
  }

  const passwordHash = await hashPassword("Auditor123");
  const now = new Date().toISOString();

  await execSql(
    `INSERT INTO users (email, username, passwordHash, role, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [email, username, passwordHash, "AUDITOR", now, now]
  );

  return (await getUserByEmail(email)) as StoredUser;
}
