import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { fail, readJson, text } from "@/lib/api";
import { currentUser, SESSION_COOKIE, SESSION_DAYS, signIn, signOut } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, user: await currentUser() });
}

export async function POST(request: Request) {
  const body = await readJson(request);
  const username = text(body?.username);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!username || !password) return fail("Enter a username and a password.");
  const token = await signIn(username, password);
  if (!token) return fail("That username and password do not match.", 401);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: "/",
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await signOut(token);
  store.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
