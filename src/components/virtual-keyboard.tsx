import { RefObject, useEffect, useRef, useState } from "react";
import { createLayout, VirtualKeyboard } from "@usefy/virtual-keyboard";

const lettersOnly = createLayout({
  name: "letters",
  rows: [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    [
      { key: "Shift", label: "⇧", action: "shift", width: 1.5 },
      "z",
      "x",
      "c",
      "v",
      "b",
      "n",
      "m",
      { key: "Backspace", label: "⌫", action: "backspace", width: 1.5 },
    ],
    [
      { key: " ", label: "Space", action: "space", width: 5 },
      { key: "Enter", label: "↵", action: "enter", width: 1.5 },
    ],
  ],
});

interface MyVirtualKeyboardProps {
  inputRef: RefObject<HTMLInputElement | null>;
}

export function MyVirtualKeyboard({ inputRef }: MyVirtualKeyboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const highlightEnter = () => {
    const root = containerRef.current;
    if (!root) return;

    const enterBtn = Array.from(root.querySelectorAll("button")).find((btn) => {
      const aria = (btn.getAttribute("aria-label") || "").toLowerCase();
      const text = btn.textContent?.trim() || "";
      return aria === "enter" || text === "↵" || text.toLowerCase() === "enter";
    });

    if (!enterBtn) return;

    enterBtn.setAttribute("data-pressed", "true");

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      enterBtn.removeAttribute("data-pressed");
    }, 150);
  };

  return (
    <div ref={containerRef}>
      <VirtualKeyboard
        theme="light"
        inputRef={inputRef}
        layouts={[lettersOnly]}
        onKeyPress={(key) => {
          if (key?.action === "enter" || key?.key === "Enter") {
            highlightEnter();
          }
        }}
      />
    </div>
  );
}