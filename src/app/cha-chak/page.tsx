"use client";

import { useEffect, useRef, useState } from "react";
import Popup from "@/components/Popup";
import StatusPopup from "@/components/StatusPopup";
import LoadError from "@/components/LoadError";
import { NamePopupWithKeyboard } from "@/components/floating";
import { SweetSelector, type ScaleOption as SweetScaleOption } from "@/components/selector/SweetSelector";
import { ToppingSelector, type ScaleOption as ToppingScaleOption } from "@/components/selector/ToppingSelector";
import { DonateSelector, type ScaleOption as DonateScaleOption } from "@/components/selector/DonateSelector";
import { useRouter } from "next/navigation";

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
  category?: string;
}

export default function ChaChakPage() {

  const router = useRouter()

  const [order, setOrder] = useState<Order | null>(null);
  const [menu, setMenu] = useState<MenuItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [inputName, setInputName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [price, setPrice] = useState<Number>(49)
  const [sweet, setSweet] = useState<SweetScaleOption>("100%")
  const [topping, setTopping] = useState<ToppingScaleOption>("ไม่ใส่")
  const [donate, setDonate] = useState<DonateScaleOption>("0฿")

  const [loadError, setLoadError] = useState(false);

  const [isNamePopupOpen, setIsNamePopupOpen] = useState(false);

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
          const response = await fetch(
            `/api/orders?uuid=${encodeURIComponent(orderUuid)}`,
            { signal: AbortSignal.timeout(15000) },
          );
          if (response.status === 404) {
            localStorage.removeItem("orderUuid");
          } else {
            if (!response.ok) throw new Error("Unable to load saved order");
            const data = await response.json();
            if (!data.success || !data.data)
              throw new Error("Invalid order response");
            if (isMounted) setOrder(data.data);
            return;
          }
        }

        const menuRes = await fetch("/api/menu?category=cha_chak", {
          signal: AbortSignal.timeout(15000),
        });
        if (!menuRes.ok) throw new Error("Unable to load menus");
        const menuData = await menuRes.json();
        if (!menuData.success || !Array.isArray(menuData.data))
          throw new Error("Invalid menu response");
        if (isMounted) setMenu(menuData.data);
      } catch (error) {
        console.error(error);
        if (isMounted) setLoadError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  // Poll order status every 3 seconds when order is pending/preparing
  useEffect(() => {
    if (!order || order.status === "completed" || order.status === "cancelled")
      return;

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

  useEffect(() => {
    console.log("change")

    let price = 49;

    if (topping == "บุก +5฿") {
      price += 5;
    }

    price += Number(donate.replace(/[^\d]/g, "")) || 0;
    setPrice(price)
  }, [sweet, topping, donate])

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

      // The POST already created the order. Track it immediately even if GET fails.
      setSelectedMenu(null);
      setOrder({
        id: 0,
        uuid: data.data.orderUuid,
        menu_id: selectedMenu.id,
        status: "pending",
        description: null,
        customer_id: 0,
        customer_name: inputName.trim(),
      });
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

  async function handleNewOrder() {
    localStorage.removeItem("orderUuid");
    setOrder(null);
    setLoading(true);
    try {
      const response = await fetch("/api/menu?category=cha_chak", {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("Unable to load menus");
      const data = await response.json();
      if (!data.success || !Array.isArray(data.data))
        throw new Error("Invalid menu response");
      setMenu(data.data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  function renderPage() {
    if (loadError) return <LoadError />;

    // --- Loading ---
    if (loading) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-black">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-black dark:border-zinc-700 dark:border-t-white" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Loading ชาชัก menu...
          </p>
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
              Your order has been completed. Enjoy your ชาชัก!
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
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full dark:bg-red-900/30">
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

    // --- Menu Selection ---
    return (
      <div className="flex flex-col min-h-screen bg-zinc-100">
        <main className="mx-auto flex w-full flex-1 flex-col pt-20">
          {/* <div className="bg-[#d2761f] h-30"></div> */}
          <div className="flex flex-col justify-center px-10">
            {/* Header */}

            {/* Menu Grid */}
            <div className="relative flex justify-center">
              {/* วงกลมสีดำขนาดเล็กอยู่ด้านหลัง */}
              <div className="pointer-events-none absolute top-1/2 left-1/2 z-0 h-90 w-90 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#db8c4d]" />

              {/* รูปภาพอยู่ด้านหน้า */}
              <div className="relative z-10 aspect-square w-full max-w-[360pt] overflow-hidden">
                <img
                  src={"/images/ChaChak/chachak2.png"}
                  className="h-full w-full -translate-y-10 object-cover drop-shadow-xl transition"
                />
              </div>
            </div>

            <div className="flex justify-center -translate-y-1/2">
              <h1 className="font-ekkamaiVibe font-black text-taupe-600 tracking-tighter text-6xl">
                TEH TARIK ชาชัก
              </h1>
            </div>

            <form action="">
              <div className="flex justify-between bg-white font-kanit text-taupe-600 p-8 rounded-4xl mt-5">
                <h2 className="text-3xl">เลือกความหวานที่ลงตัว</h2>
                <div className="flex items-start">
                  <SweetSelector value={sweet} onChange={(v) => {
                    setSweet(v)
                  }} />
                </div>
              </div>

              <div className="bg-white font-kanit text-taupe-600 p-8 rounded-4xl mt-5">
                <h2 className="text-3xl">เลือกท็อปปิ้ง</h2>
                <ToppingSelector value={topping} onChange={(v) => {
                    setTopping(v)
                  }} />
              </div>
              <div className="bg-white font-kanit text-taupe-600 p-8 rounded-4xl mt-5">
                <h2 className="text-3xl">โดเนทให้ผู้พัฒนา</h2>
                <DonateSelector value={donate} onChange={(v) => {
                    setDonate(v)
                  }} />
              </div>
            </form>
          </div>

          <div className="mt-auto p-4 flex items-center justify-end">
            <button
              type="button"
              onClick={() => {
                router.push("/pay");
              }}
              className="font-kanit cursor-pointer text-3xl rounded-full bg-taupe-900 px-10 py-4 text-white shadow hover:bg-taupe-600"
            >
              ซื้อเลย <span>{price.valueOf()}฿</span>
            </button>
          </div>

          <NamePopupWithKeyboard
            isOpen={isNamePopupOpen}
            onClose={() => setIsNamePopupOpen(false)}
          />
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
