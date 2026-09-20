"use client";

import { useEffect, useState } from "react";
import Popup from "@/components/Popup";
import StatusPopup from "@/components/StatusPopup";

interface Order {
  id: number;
  uuid: string;
  menu_id: number;
  status: "pending" | "preparing" | "completed" | "cancelled";
  description: string | null;
  customer_id: number;
  customer_name: string;
}

interface MenuItem {
  id: number;
  name: string;
  image_url: string;
}

export default function Home() {
  const [order, setOrder] = useState<Order | null>(null);
  const [menu, setMenu] = useState<MenuItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [inputName, setInputName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [statusPopup, setStatusPopup] = useState<{
    status: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        // Check if user has an existing order
        const orderUuid = localStorage.getItem("orderUuid");

        if (orderUuid) {
          const orderRes = await fetch(
            `/api/orders?uuid=${encodeURIComponent(orderUuid)}`,
          );
          if (orderRes.ok) {
            const orderData = await orderRes.json();

            if (orderData.success && orderData.data) {
              setOrder(orderData.data);
              setLoading(false);
              return;
            }
          }
          // Order not found, clear stored uuid
          localStorage.removeItem("orderUuid");
        }

        // No active order — fetch menu to show
        const menuRes = await fetch("/api/menu");
        if (menuRes.ok) {
          const menuData = await menuRes.json();
          setMenu(menuData.data);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Poll order status every 3 seconds when order is pending/preparing
  useEffect(() => {
    if (!order || order.status === "completed" || order.status === "cancelled") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/orders?uuid=${encodeURIComponent(order.uuid)}`,
        );
        const data = await res.json();
        if (data.success && data.data) {
          setOrder(data.data);
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [order?.status]);

  async function handleOrder() {
    if (!selectedMenu || !inputName.trim() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuId: selectedMenu.id,
          customerName: inputName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatusPopup({
          status: "cancelled",
          message: data.message || "Failed to place order.",
        });
        setSelectedMenu(null);
        return;
      }

      // Store order uuid
      localStorage.setItem("orderUuid", data.data.orderUuid);

      // Fetch full order to display status
      const orderRes = await fetch(
        `/api/orders?uuid=${encodeURIComponent(data.data.orderUuid)}`,
      );
      const orderData = await orderRes.json();

      setSelectedMenu(null);
      setOrder(orderData.data);
      setStatusPopup({
        status: "pending",
        message: `Your order for ${selectedMenu.name} has been placed!`,
      });
    } catch {
      setStatusPopup({
        status: "cancelled",
        message: "Something went wrong.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNewOrder() {
    localStorage.removeItem("orderUuid");
    setOrder(null);
    // Fetch menu
    fetch("/api/menu")
      .then((res) => res.json())
      .then((data) => setMenu(data.data));
  }

  // --- Loading ---
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-black dark:border-zinc-700 dark:border-t-white" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  // --- Status: completed ---
  if (order?.status === "completed") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <span className="text-4xl">✓</span>
          </div>
          <h1 className="mt-6 text-3xl font-bold text-black dark:text-white">
            Order Completed
          </h1>
          <p className="mt-3 text-zinc-500 dark:text-zinc-400">
            Your order has been completed. Enjoy your drink!
          </p>
          <button
            onClick={handleNewOrder}
            className="mt-8 w-full rounded-xl bg-black px-4 py-3 font-semibold text-white transition hover:bg-zinc-800 active:scale-[0.98] dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Order Again
          </button>
        </div>
      </div>
    );
  }

  // --- Status: preparing ---
  if (order?.status === "preparing") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
            <span className="text-4xl">👨‍🍳</span>
          </div>
          <h1 className="mt-6 text-3xl font-bold text-black dark:text-white">
            Being Prepared
          </h1>
          <p className="mt-3 text-zinc-500 dark:text-zinc-400">
            Your order is being prepared. Hang tight!
          </p>
          <div className="mt-6 flex items-center justify-center gap-1.5">
            <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 dark:bg-zinc-500" />
            <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms] dark:bg-zinc-500" />
            <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms] dark:bg-zinc-500" />
          </div>
        </div>
      </div>
    );
  }

  // --- Status: pending ---
  if (order?.status === "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
            <span className="text-4xl">⏳</span>
          </div>
          <h1 className="mt-6 text-3xl font-bold text-black dark:text-white">
            Order Pending
          </h1>
          <p className="mt-3 text-zinc-500 dark:text-zinc-400">
            Waiting for staff to accept your order.
          </p>
          <div className="mt-6 flex items-center justify-center gap-1.5">
            <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 dark:bg-zinc-500" />
            <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms] dark:bg-zinc-500" />
            <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms] dark:bg-zinc-500" />
          </div>
          <button
            onClick={async () => {
              try {
                const response = await fetch("/api/orders/cancel", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ orderUuid: order.uuid }),
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                  setStatusPopup({
                    status: "cancelled",
                    message: data.message || "Failed to cancel.",
                  });
                  return;
                }
                setOrder((prev) =>
                  prev ? { ...prev, status: "cancelled" } : prev,
                );
                setStatusPopup({
                  status: "cancelled",
                  message: "Your order has been cancelled.",
                });
              } catch {
                setStatusPopup({
                  status: "cancelled",
                  message: "Something went wrong.",
                });
              }
            }}
            className="mt-8 w-full rounded-xl bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-700 active:scale-[0.98]"
          >
            Cancel Order
          </button>
        </div>
      </div>
    );
  }

  // --- Status: cancelled ---
  if (order?.status === "cancelled") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <span className="text-4xl">✕</span>
          </div>
          <h1 className="mt-6 text-3xl font-bold text-black dark:text-white">
            Order Cancelled
          </h1>
          <p className="mt-3 text-zinc-500 dark:text-zinc-400">
            {order.description === "cancelled by admin"
              ? "Your order has been cancelled by the admin."
              : "Your order has been cancelled."}
          </p>
          <button
            onClick={handleNewOrder}
            className="mt-8 w-full rounded-xl bg-black px-4 py-3 font-semibold text-white transition hover:bg-zinc-800 active:scale-[0.98] dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Order Again
          </button>
        </div>
      </div>
    );
  }

  // --- No active order → Menu selection ---
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-full px-10 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-black dark:text-white">
            Choose Your Drink
          </h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Tap a drink to place your order
          </p>
        </div>

        <div className="grid grid-cols-6 gap-3 sm:gap-4">
          {menu?.map((item) => (
            <button
              onClick={() => {
                setSelectedMenu(item);
                setInputName("");
              }}
              key={item.id}
              className="group overflow-hidden rounded-2xl bg-white text-left shadow-sm transition hover:shadow-md active:scale-[0.97] dark:bg-zinc-900 dark:hover:shadow-none"
            >
              <div className="aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="h-full w-full object-cover transition"
                />
              </div>
              <div className="p-3">
                <h2 className="font-semibold text-black dark:text-white">
                  {item.name}
                </h2>
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* Name input popup */}
      <Popup open={!!selectedMenu} onClose={() => setSelectedMenu(null)}>
        <div
          className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900"
          onClick={(e) => e.stopPropagation()}
        >
          {selectedMenu && (
            <div className="mb-4 overflow-hidden rounded-xl">
              <img
                src={selectedMenu.image_url}
                alt={selectedMenu.name}
                className="h-40 w-full object-cover"
              />
            </div>
          )}

          <h2 className="text-xl font-bold text-black dark:text-white">
            {selectedMenu?.name}
          </h2>

          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Enter your name to place order
          </p>

          <input
            type="text"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleOrder();
            }}
            placeholder="Your name"
            className="mt-4 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-black outline-none transition focus:border-black focus:ring-1 focus:ring-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-white dark:focus:ring-white"
            autoFocus
          />

          <div className="mt-5 flex gap-3">
            <button
              onClick={() => setSelectedMenu(null)}
              className="flex-1 rounded-xl bg-zinc-100 px-4 py-3 font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Cancel
            </button>

            <button
              disabled={!inputName.trim() || isSubmitting}
              onClick={handleOrder}
              className="flex-1 rounded-xl bg-black px-4 py-3 font-semibold text-white transition hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              {isSubmitting ? "Ordering..." : "Order"}
            </button>
          </div>
        </div>
      </Popup>

      <StatusPopup
        open={!!statusPopup}
        onClose={() => setStatusPopup(null)}
        status={(statusPopup?.status as any) ?? "pending"}
        message={statusPopup?.message ?? ""}
      />
    </div>
  );
}
