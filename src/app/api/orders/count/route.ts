import { conn } from "@/lib/turso";
import { NextResponse } from "next/server";

export async function GET() {
  const stmt = await conn.prepare(`     SELECT
      COUNT(CASE WHEN status = 'created' THEN 1 END) AS created,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending,
      COUNT(CASE WHEN status = 'prepared' THEN 1 END) AS prepared,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed
    FROM orders
    WHERE menu_id IS NOT NULL
  `);

  const result = await stmt.get();

  console.log("Order counts:", result);

  return NextResponse.json(result);
}
