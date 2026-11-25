import { useEffect, useRef, useState } from "react";
import { MyVirtualKeyboard } from "./virtual-keyboard";

const ANIMATION_MS = 200;
const MAX_LETTERS = 20;

function sanitizeName(value: string): string {
  return value.replace(/[^a-zA-Z\s]/g, "").slice(0, MAX_LETTERS);
}

export function NamePopupWithKeyboard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLFormElement>(null);
  const keyboardWrapperRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [isEntered, setIsEntered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      const raf = window.requestAnimationFrame(() => {
        setIsEntered(true);
        inputRef.current?.focus();
      });
      return () => window.cancelAnimationFrame(raf);
    }

    setIsEntered(false);
    const timer = window.setTimeout(() => {
      setIsRendered(false);
    }, ANIMATION_MS);

    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    const inputEl = inputRef.current;
    if (!inputEl || !isRendered) return;

    const syncFromInput = () => {
      const cleaned = sanitizeName(inputEl.value);
      if (inputEl.value !== cleaned) {
        inputEl.value = cleaned;
      }
      setName(cleaned);
    };

    inputEl.addEventListener("input", syncFromInput);
    return () => inputEl.removeEventListener("input", syncFromInput);
  }, [isRendered]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    console.log("Submitted name:", trimmed);
    setIsOpen(false);
  };

  return (
    <div className="p-2">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
      >
        Enter Name
      </button>

      {isRendered && (
        <div
          style={{ transitionDuration: `${ANIMATION_MS}ms` }}
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/50 p-4 transition-opacity ease-out ${
            isEntered ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          onPointerDown={(e) => {
            const target = e.target as Node;
            if (
              !modalRef.current?.contains(target) &&
              !keyboardWrapperRef.current?.contains(target)
            ) {
              setIsOpen(false);
            }
          }}
        >
          {/* Popup Form Card */}
          <form
            ref={modalRef}
            onSubmit={handleSubmit}
            style={{ transitionDuration: `${ANIMATION_MS}ms` }}
            className={`w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all ease-out ${
              isEntered
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-4 scale-95 opacity-0"
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Enter Your Name
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="popup-name-input"
                  className="text-sm font-medium text-slate-700"
                >
                  Name
                </label>
                <span className="text-xs text-slate-400">
                  {name.length}/{MAX_LETTERS}
                </span>
              </div>

              <input
                ref={inputRef}
                id="popup-name-input"
                type="text"
                maxLength={MAX_LETTERS}
                value={name}
                onChange={(e) => setName(sanitizeName(e.target.value))}
                placeholder="Max 20 letters..."
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </form>

          {/* Virtual Keyboard Directly Under the Popup Card */}
          <div
            ref={keyboardWrapperRef}
            onPointerDown={(e) => e.preventDefault()}
            style={{ transitionDuration: `${ANIMATION_MS}ms` }}
            className={`w-full rounded-2xl border bg-white p-3 shadow-2xl transition-all ease-out ${
              isEntered
                ? "translate-y-0 scale-100 opacity-100"
                : "pointer-events-none translate-y-4 scale-95 opacity-0"
            }`}
          >
            <MyVirtualKeyboard inputRef={inputRef} />
          </div>
        </div>
      )}
    </div>
  );
}