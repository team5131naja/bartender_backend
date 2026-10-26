import { NextResponse } from "next/server";
import { createStaffSession, deleteStaffSession, staffSession, SESSION_COOKIE, SESSION_MAX_AGE, sessionCookieOptions } from "@/lib/auth";

// Simple hardcoded credentials
const ADMIN_USER = process.env.ADMIN_USER ?? "admin";
const ADMIN_PASS = process.env.ADMIN_PASS ?? "admin";

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.username || !body.password) {
    return NextResponse.json(
      { success: false, message: "Username and password are required" },
      { status: 400 },
    );
  }

  if (body.username === ADMIN_USER && body.password === ADMIN_PASS) {
    deleteStaffSession(request);
    const response = NextResponse.json({
      success: true,
      username: ADMIN_USER,
    });
    response.cookies.set(SESSION_COOKIE, createStaffSession(ADMIN_USER), {
      ...sessionCookieOptions(request), maxAge: SESSION_MAX_AGE,
    });
    return response;
  }

  return NextResponse.json(
    { success: false, message: "Invalid credentials" },
    { status: 401 },
  );
}

export async function GET(request: Request) {
  const session = staffSession(request);
  return NextResponse.json(
    session ? { success: true, username: session.username } : { success: false },
    { status: session ? 200 : 401, headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(request: Request) {
  deleteStaffSession(request);
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(request), maxAge: 0 });
  return response;
}
