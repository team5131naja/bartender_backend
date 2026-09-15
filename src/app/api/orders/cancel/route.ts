import { dbGet, dbRun } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  const { orderUuid } = body;

  if (!orderUuid) {
    return NextResponse.json(
      { success: false, message: "orderUuid is required" },
      { status: 400 },
    );
  }

  const order = await dbGet("SELECT * FROM orders WHERE uuid = ?", [orderUuid]);

  if (!order) {
    return NextResponse.json(
      { success: false, message: "Order not found" },
      { status: 404 },
    );
  }

  if (order.status === "pending") {
    await dbRun(
      "UPDATE orders SET status = ?, description = ? WHERE uuid = ?",
      ["cancelled", "cancelled by user", orderUuid],
    );

    return NextResponse.json({
      success: true,
      data: { status: "cancelled by user" },
      message: "Order cancelled successfully",
    });
  }

  return NextResponse.json(
    { success: false, message: "Order cannot be cancelled" },
    { status: 400 },
  );
}
