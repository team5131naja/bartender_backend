import { NextResponse } from "next/server";

// Simple hardcoded credentials
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin";

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.username || !body.password) {
    return NextResponse.json(
      { success: false, message: "Username and password are required" },
      { status: 400 },
    );
  }

  if (body.username === ADMIN_USER && body.password === ADMIN_PASS) {
    return NextResponse.json({
      success: true,
      username: ADMIN_USER,
    });
  }

  return NextResponse.json(
    { success: false, message: "Invalid credentials" },
    { status: 401 },
  );
}
