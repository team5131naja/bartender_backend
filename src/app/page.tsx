"use client";

import { useEffect, useState } from "react";
import StatusPopup from "@/components/StatusPopup";
import LoadError from "@/components/LoadError";

interface Order {
  id: number;
  uuid: string;
  menu_id: number;
  status: "pending" | "preparing" | "completed" | "cancelled";
  description: string | null;
  customer_id: number;
  customer_name: string;
}

export default function Home() {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState(false);

  const [statusPopup, setStatusPopup] = useState<{
    status: "created" | "pending" | "preparing" | "completed" | "cancelled";
    message: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        const orderUuid = localStorage.getItem("orderUuid");
        if (orderUuid) {
          const response = await fetch(`/api/orders?uuid=${encodeURIComponent(orderUuid)}`, { signal: AbortSignal.timeout(15000) });
          if (response.status === 404) {
            localStorage.removeItem("orderUuid");
          } else {
            if (!response.ok) throw new Error("Unable to load saved order");
            const data = await response.json();
            if (!data.success || !data.data) throw new Error("Invalid order response");
            if (isMounted) setOrder(data.data);
            return;
          }
        }
      } catch (error) {
        console.error(error);
        if (isMounted) setLoadError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    init();
    return () => { isMounted = false; };
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

  function handleNewOrder() {
    localStorage.removeItem("orderUuid");
    setOrder(null);
  }

  function renderPage() {
    if (loadError) return <LoadError />;

    // --- Loading ---
    if (loading) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-black">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-black dark:border-zinc-700 dark:border-t-white" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
        </div>
      );
    }

    // --- Status: completed ---
    if (order?.status === "completed") {
      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 dark:bg-black">
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
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 dark:bg-black">
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
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 dark:bg-black">
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
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 dark:bg-black">
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

    // --- No active order → Category selection ---
    return (
      <div className="flex min-h-screen flex-col justify-between bg-zinc-50 dark:bg-black text-black dark:text-white">
        {/* Top Header */}
        <header className="mx-auto w-full max-w-7xl px-6 py-6 sm:px-10 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">
              Robotic Bartender System
            </span>
          </div>

          <a
            href="/dashboard"
            className="text-xs font-semibold text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors"
          >
            Staff Dashboard →
          </a>
        </header>

        {/* Main Content */}
        <main className="mx-auto w-full max-w-5xl px-6 sm:px-10 py-12 my-auto">
          <div className="text-center mb-10 sm:mb-12">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-black dark:text-white">
              Choose Your Drink
            </h1>
            <p className="mt-3 text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">
              Select a category below to explore our robotic bar menu
            </p>
          </div>

          <div className="grid grid-cols-1 landscape:md:grid-cols-2 gap-6 sm:gap-8">
            {/* Card 1: Cocktails & Mocktails */}
            <a
              href="/cocktails"
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 active:scale-[0.98]"
            >
              <div className="aspect-[16/10] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                <img
                  src="/images/Cocktail/cosmopolitan.png"
                  alt="Craft Cocktails & Mocktails"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              <div className="p-6 sm:p-7 flex flex-col flex-1 justify-between">
                <div>
                  <span className="inline-block text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    11 Formulas
                  </span>
                  <h2 className="mt-3 text-2xl font-bold text-black dark:text-white group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                    Craft Cocktails & Mocktails
                  </h2>
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Classic cocktails, signature drinks, and fresh non-alcoholic mocktails crafted by our robotic bartender.
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between font-semibold text-sm text-black dark:text-white pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <span>Browse Cocktails</span>
                  <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                </div>
              </div>
            </a>

            {/* Card 2: Southern ชาชัก */}
            <a
              href="/cha-chak"
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 active:scale-[0.98]"
            >
              <div className="aspect-[16/10] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                <img
                  src="/images/ChaChak/signature-cha-chak.jpg"
                  alt="Southern ชาชัก"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              <div className="p-6 sm:p-7 flex flex-col flex-1 justify-between">
                <div>
                  <span className="inline-block text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    5 formulars
                  </span>
                  <h2 className="mt-3 text-2xl font-bold text-black dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    Southern ชาชัก
                  </h2>
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Authentic Southern Thai pulled tea with rich, velvety milk froth and aromatic roasted tea leaves.
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between font-semibold text-sm text-black dark:text-white pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <span>Browse ชาชัก</span>
                  <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                </div>
              </div>
            </a>
          </div>
        </main>

        {/* Footer */}
        <footer className="mx-auto w-full max-w-7xl px-6 py-6 sm:px-10 text-center text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-200/80 dark:border-zinc-800/80">
          Dobot Robotic Bar System • Powered by Next.js
        </footer>


      </div>
    );
  }
  return (
    <>
      {renderPage()}
      <StatusPopup
        open={!!statusPopup}
        onClose={() => setStatusPopup(null)}
        status={statusPopup?.status ?? "pending"}
        message={statusPopup?.message ?? ""}
      />
    </>
  );
}
