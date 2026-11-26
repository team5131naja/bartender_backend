"use client";

import { useState } from "react";

const SCALE_OPTIONS = [
  { value: "50%", label: "น้อย" },
  { value: "100%", label: "ปกติ" },
  { value: "150%", label: "มาก" },
] as const;

export type ScaleOption = (typeof SCALE_OPTIONS)[number]["value"];

export function SweetSelector({
  value,
  onChange,
}: {
  value?: ScaleOption;
  onChange?: (val: ScaleOption) => void;
}) {
  const [selected, setSelected] = useState<ScaleOption>(value ?? "100%");
  const current = value ?? selected;

  const handleSelect = (opt: ScaleOption) => {
    if (!value) setSelected(opt);
    onChange?.(opt);
  };

  return (
    <div
      role="radiogroup"
      aria-label="ระดับความเข้มข้นหรือขนาด"
      className="flex w-96 items-end justify-center gap-3 text-2xl"
    >
      {SCALE_OPTIONS.map(({ value: opt, label }) => {
        const isActive = current === opt;
        return (
          <div key={opt} className="flex flex-col w-full items-center gap-2">
            <span
              id={`sweet-label-${opt}`}
              className={`font-medium transition ${
                isActive ? "text-taupe-600" : "text-taupe-600/60"
              }`}
            >
              {label}
            </span>
            <button
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-labelledby={`sweet-label-${opt}`}
              onClick={() => handleSelect(opt)}
              className={`cursor-pointer w-full rounded-full px-6 py-3 font-medium transition active:scale-95 ${
                isActive
                  ? "bg-[#b2bb1e] text-white border-2 border-[#b2bb1e]"
                  : "bg-transparent text-taupe-600 hover:bg-taupe-600/10 border-2 border-taupe-600"
              }`}
            >
              {opt}
            </button>
          </div>
        );
      })}
    </div>
  );
}