"use client";

import Popup from "./Popup";

type OrderStatus = "created" | "pending" | "preparing" | "completed" | "cancelled";

interface StatusPopupProps {
  open: boolean;
  onClose: () => void;
  status: OrderStatus;
  message: string;
}

const STATUS_CONFIG: Record<
  OrderStatus,
  { icon: string; title: string; bgClass: string }
> = {
  created: {
    icon: "📝",
    title: "Order Created",
    bgClass: "bg-zinc-100 dark:bg-zinc-800",
  },
  pending: {
    icon: "⏳",
    title: "Order Pending",
    bgClass: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  preparing: {
    icon: "👨‍🍳",
    title: "Order Preparing",
    bgClass: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  completed: {
    icon: "✓",
    title: "Order Completed",
    bgClass: "bg-green-100 dark:bg-green-900/30",
  },
  cancelled: {
    icon: "✕",
    title: "Order Cancelled",
    bgClass: "bg-red-100 dark:bg-red-900/30",
  },
};

export default function StatusPopup({
  open,
  onClose,
  status,
  message,
}: StatusPopupProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Popup open={open} onClose={onClose} zIndex={60}>
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${config.bgClass}`}
        >
          <span className="text-3xl">{config.icon}</span>
        </div>

        <h2 className="mt-4 text-2xl font-bold text-black dark:text-white">
          {config.title}
        </h2>

        <p className="mt-2 text-zinc-500">{message}</p>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-black px-4 py-3 font-semibold text-white transition active:scale-95"
        >
          OK
        </button>
      </div>
    </Popup>
  );
}
