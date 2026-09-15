import { dbAll, dbGet, dbRun } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const menus = await dbAll("SELECT * FROM menus WHERE available != 0");

  return NextResponse.json({
    success: true,
    data: menus,
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  const { orderUuid, menuId, customerId, customerName } = body;

  if (!orderUuid || !menuId || !customerId || !customerName) {
    return NextResponse.json(
      {
        success: false,
        message: "orderUuid, menuId, customerId and customerName are required",
      },
      { status: 400 },
    );
  }

  const order = await dbGet(
    "SELECT * FROM orders WHERE uuid = ? AND customer_id = ?",
    [orderUuid, customerId],
  );

  if (!order) {
    return NextResponse.json(
      { success: false, message: "Order not found" },
      { status: 404 },
    );
  }

  if (order.status === "pending") {
    return NextResponse.json(
      { success: false, data: { status: "pending" }, message: "Order is already pending" },
      { status: 400 },
    );
  } else if (order.status === "preparing") {
    return NextResponse.json(
      { success: false, data: { status: "preparing" }, message: "Order is preparing" },
      { status: 400 },
    );
  } else if (order.status === "completed") {
    return NextResponse.json(
      { success: false, data: { status: "completed" }, message: "Order is already completed" },
      { status: 400 },
    );
  } else if (order.status === "cancelled") {
    if (order.description === "cancelled by admin") {
      return NextResponse.json(
        { success: false, data: { status: "cancelled" }, message: "Order is cancelled" },
        { status: 400 },
      );
    }
  }

  const menu = await dbGet("SELECT * FROM menus WHERE id = ?", [menuId]);
  if (!menu) {
    return NextResponse.json(
      { success: false, message: "Menu item not found" },
      { status: 404 },
    );
  }

  await dbRun(
    "UPDATE orders SET status = ?, menu_id = ? WHERE uuid = ? AND customer_id = ?",
    ["pending", menuId, orderUuid, customerId],
  );

  return NextResponse.json({
    success: true,
    data: { status: "pending" },
    message: "Order placed successfully",
  });
}
