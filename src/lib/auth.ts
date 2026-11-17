import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { query } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

export const SESSION_COOKIE = "session";
export const SESSION_DAYS = 30;

export type User = { id: number; username: string; isAdmin: boolean };

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await query<{ id: number; username: string; is_admin: boolean }>(
    `select users.id, users.username, users.is_admin
     from sessions join users on users.id = sessions.user_id
     where sessions.token = $1 and sessions.expires_at > now()`,
    [token],
  );
  return rows[0] ? { id: rows[0].id, username: rows[0].username, isAdmin: rows[0].is_admin } : null;
}

/** Returns a session token, or null when the name or password is wrong. */
export async function signIn(username: string, password: string) {
  const rows = await query<{ id: number; password_hash: string }>(
    "select id, password_hash from users where username = $1",
    [username],
  );
  if (!rows[0] || !verifyPassword(password, rows[0].password_hash)) return null;
  const token = randomBytes(32).toString("hex");
  await query("insert into sessions (token, user_id, expires_at) values ($1, $2, now() + make_interval(days => $3))", [
    token,
    rows[0].id,
    SESSION_DAYS,
  ]);
  return token;
}

export async function signOut(token: string) {
  await query("delete from sessions where token = $1", [token]);
}
