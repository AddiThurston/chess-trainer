import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";

export function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, code: "error", message }, { status });
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/** The signed-in admin, or null. Admin routes answer 403 on null. */
export async function adminUser() {
  const user = await currentUser();
  return user?.isAdmin ? user : null;
}

export const ADMIN_ONLY = "Only the admin can do this.";
