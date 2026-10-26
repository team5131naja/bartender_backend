"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";

interface PopupProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactElement<React.HTMLAttributes<HTMLDivElement>>;
  zIndex?: number;
  label?: string;
}

export default function Popup({
  open,
  onClose,
  children,
  zIndex = 50,
  label = "Order dialog",
}: PopupProps) {
  const [viewport, setViewport] = useState<{ height: number; top: number } | null>(null);

  useEffect(() => {
    const visualViewport = window.visualViewport;
    if (!open || !visualViewport) return;

    // Keep the dialog inside the visible area when a mobile keyboard opens.
    const updateViewport = () => {
      setViewport({ height: visualViewport.height, top: visualViewport.offsetTop });
    };

    updateViewport();
    visualViewport.addEventListener("resize", updateViewport);
    visualViewport.addEventListener("scroll", updateViewport);
    return () => {
      visualViewport.removeEventListener("resize", updateViewport);
      visualViewport.removeEventListener("scroll", updateViewport);
    };
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50" style={{ zIndex }} />
        <Dialog.Viewport
          className="fixed inset-0 flex max-h-dvh items-center justify-center overflow-y-auto overscroll-contain p-4"
          style={{ zIndex, ...(viewport && { height: viewport.height, top: viewport.top }) }}
        >
          <Dialog.Popup
            render={children}
            aria-label={label}
            className="min-w-0 max-h-full overflow-y-auto overscroll-contain break-words outline-none"
          />
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
