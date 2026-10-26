import { dbGet } from "@/lib/db";
import { NextResponse } from "next/server";
import { staffSession } from "@/lib/auth";

export async function GET(request: Request) {
  if (!staffSession(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const result = await dbGet(`
    SELECT
      COUNT(CASE WHEN status = 'created' THEN 1 END) AS created,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending,
      COUNT(CASE WHEN status = 'preparing' THEN 1 END) AS preparing,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed
    FROM orders
  `);

  return NextResponse.json(result);
}
