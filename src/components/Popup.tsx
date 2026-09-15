"use client";

import { useEffect, useRef } from "react";

interface PopupProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  zIndex?: number;
}

export default function Popup({
  open,
  onClose,
  children,
  zIndex = 50,
}: PopupProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 flex items-center justify-center bg-black/50 p-4"
      style={{ zIndex }}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      {children}
    </div>
  );
}
