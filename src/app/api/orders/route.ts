import { dbAll, dbGet, dbRun } from "@/lib/db";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { sendOrder } from "@/lib/socket";
import { staffSession } from "@/lib/auth";

// GET: fetch orders (with optional uuid or status filter)
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const uuid = url.searchParams.get("uuid");
    const status = url.searchParams.get("status");

    // Single order by uuid (for home page status check)
    if (uuid) {
      const order = await dbGet(
        `SELECT orders.*, customers.name AS customer_name
         FROM orders LEFT JOIN customers ON orders.customer_id = customers.uuid
         WHERE orders.uuid = ?`,
        [uuid],
      );

      if (!order) {
        return NextResponse.json(
          { success: false, message: "Order not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({ success: true, data: order });
    }

    if (!staffSession(request)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // Orders by status (for dashboard)
    if (status) {
      const orders = await dbAll(
        `SELECT orders.*, customers.name AS customer_name 
     FROM orders 
     JOIN customers ON orders.customer_id = customers.uuid 
     WHERE orders.status = ?`,
        [status],
      );
      return NextResponse.json(orders);
    }

    // All orders with menu_id (for dashboard)
    const orders = await dbAll(
      "SELECT * FROM orders WHERE menu_id IS NOT NULL",
    );
    return NextResponse.json(orders);
  } catch (error) {
    console.error("[api/orders] GET error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch orders" },
      { status: 500 },
    );
  }
}

// POST: create a new order OR accept orders (dashboard)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Dashboard: accept selected orders → set status to "preparing"
    if (body.menus && Array.isArray(body.menus)) {
      if (!staffSession(request)) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
      }
      const uuids = [...new Set(body.menus.map((order: { uuid?: unknown }) => order?.uuid))];
      if (!uuids.length || uuids.some((uuid) => typeof uuid !== "string" || !uuid)) {
        return NextResponse.json({ success: false, message: "Order UUIDs are required" }, { status: 400 });
      }
      let sent = 0;
      for (const uuid of uuids) {
        // Only trusted menu data is sent to the robot. Claim the order before I/O.
        const order = await dbGet(
          `SELECT orders.status, menus.name AS menu_name FROM orders
           JOIN menus ON orders.menu_id = menus.id WHERE orders.uuid = ?`, [uuid],
        );
        if (!order) {
          return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
        }
        // A retry of a partly completed batch must not dispatch previous jobs again.
        if (order.status === "preparing" || order.status === "completed") continue;
        if (order.status !== "pending") {
          return NextResponse.json({ success: false, message: "Order is not pending" }, { status: 409 });
        }
        const claimed = await dbRun(
          "UPDATE orders SET status = ? WHERE uuid = ? AND status = ?",
          ["preparing", uuid, "pending"],
        );
        if (claimed.changes !== 1) continue;
        let delivered = false;
        try {
          delivered = await sendOrder(order.menu_name, 1);
        } finally {
          if (!delivered) {
            await dbRun("UPDATE orders SET status = ? WHERE uuid = ? AND status = ?", ["pending", uuid, "preparing"]);
          }
        }
        if (!delivered) {
          return NextResponse.json({ success: false, message: "Cannot connect to DOBOT server (localhost:12345). Please ensure the Python socket server is running." }, { status: 503 });
        }
        sent++;
      }
      return NextResponse.json({ success: true, message: `${sent} order(s) sent to DOBOT` });
    }

    // Home page: create new order
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

    // Create order
    const orderUuid = randomUUID();
    await dbRun(
      "INSERT INTO orders (uuid, menu_id, customer_id, status) VALUES (?, ?, ?, ?)",
      [orderUuid, menuId, customerUuid, "pending"],
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

// DELETE: delete order by uuid (query param or body) or multiple uuids (body)
export async function DELETE(request: Request) {
  if (!staffSession(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(request.url);
    const queryUuid = url.searchParams.get("uuid");

    let uuids: string[] = [];

    if (queryUuid) {
      uuids.push(queryUuid);
    } else {
      try {
        const body = await request.json();
        if (body.uuid) {
          uuids.push(body.uuid);
        } else if (Array.isArray(body.uuids)) {
          uuids.push(...body.uuids);
        }
      } catch {
        // Body was empty or invalid JSON
      }
    }

    if (uuids.length === 0) {
      return NextResponse.json(
        { success: false, message: "uuid or uuids are required" },
        { status: 400 },
      );
    }

    for (const uuid of uuids) {
      await dbRun("DELETE FROM orders WHERE uuid = ?", [uuid]);
    }

    return NextResponse.json({
      success: true,
      message: `${uuids.length} order(s) deleted successfully`,
    });
  } catch (error) {
    console.error("[api/orders] DELETE error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete order" },
      { status: 500 },
    );
  }
}
