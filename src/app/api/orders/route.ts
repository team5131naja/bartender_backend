import { dbAll, dbGet, dbRun } from "@/lib/db";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

// GET: fetch orders (with optional uuid or status filter)
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const uuid = url.searchParams.get("uuid");
    const status = url.searchParams.get("status");

    // Single order by uuid (for home page status check)
    if (uuid) {
      const order = await dbGet(
        `SELECT orders.*, customers.id AS customer_id, customers.name AS customer_name
         FROM orders JOIN customers ON orders.customer_id = customers.id
         WHERE orders.uuid = ?`,
        [uuid],
      );

      if (!order) {
        return NextResponse.json(
          { success: false, message: "Order not found" },
          { status: 200 },
        );
      }

      return NextResponse.json({ success: true, data: order });
    }

    // Orders by status (for dashboard)
    if (status) {
      const orders = await dbAll("SELECT * FROM orders WHERE status = ?", [status]);
      return NextResponse.json(orders);
    }

    // All orders with menu_id (for dashboard)
    const orders = await dbAll("SELECT * FROM orders WHERE menu_id IS NOT NULL");
    return NextResponse.json(orders);
  } catch (error) {
    console.error("[api/orders] GET error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch orders" },
      { status: 500 },
    );
  }
}

// POST: create a new order with menu selection and customer name
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { menuId, customerName } = body;

    if (!menuId || !customerName?.trim()) {
      return NextResponse.json(
        { success: false, message: "menuId and customerName are required" },
        { status: 400 },
      );
    }

    // Verify menu exists
    const menu = await dbGet("SELECT * FROM menus WHERE id = ?", [menuId]);
    if (!menu) {
      return NextResponse.json(
        { success: false, message: "Menu item not found" },
        { status: 404 },
      );
    }

    // Create customer
    const customerUuid = randomUUID();
    const customerResult = await dbRun(
      "INSERT INTO customers (uuid, name) VALUES (?, ?)",
      [customerUuid, customerName.trim()],
    );
    const customerId = customerResult.lastInsertRowid;

    // Create order
    const orderUuid = randomUUID();
    await dbRun(
      "INSERT INTO orders (uuid, menu_id, customer_id, status) VALUES (?, ?, ?, ?)",
      [orderUuid, menuId, customerId, "pending"],
    );

    return NextResponse.json({
      success: true,
      message: "Order created",
      data: {
        orderUuid,
        menuName: menu.name,
      },
    });
  } catch (error) {
    console.error("[api/orders] POST error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create order" },
      { status: 500 },
    );
  }
}
