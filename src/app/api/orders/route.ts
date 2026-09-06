import { conn } from "@/lib/turso";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    if (status) {
        const stmt = await conn.prepare("SELECT * FROM orders WHERE status = ?");
        const result = await stmt.all([status]);
        console.log("1 ", result)
        return NextResponse.json(result);
    }

    const stmt = await conn.prepare("SELECT * FROM orders WHERE menu_id IS NOT NULL");
    const result = await stmt.all();

    // console.log(result)

    return NextResponse.json(result);
}