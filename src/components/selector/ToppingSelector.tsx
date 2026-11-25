"use client";

import { useState } from "react";

const SCALE_OPTIONS = ["ไม่ใส่", "บุก +5฿"] as const;
export type ScaleOption = (typeof SCALE_OPTIONS)[number];

export function ToppingSelector({
  value,
  onChange,
}: {
  value?: ScaleOption;
  onChange?: (val: ScaleOption) => void;
}) {
  const [selected, setSelected] = useState<ScaleOption>(value ?? "ไม่ใส่");
  const current = value ?? selected;

  const handleSelect = (opt: ScaleOption) => {
    if (!value) setSelected(opt);
    onChange?.(opt);
  };

  return (
    <div
      role="radiogroup"
      aria-label="เลือกท็อปปิ้ง"
      className="flex items-center justify-end gap-4 text-2xl"
    >
      {SCALE_OPTIONS.map((opt) => {
        const isActive = current === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => handleSelect(opt)}
            className={`cursor-pointer rounded-full border-2 px-6 py-3 font-medium transition active:scale-95 ${
              isActive
                ? "bg-[#b2bb1e] text-white border-[#b2bb1e]"
                : "bg-transparent text-taupe-600 hover:bg-taupe-600/10 border-taupe-600"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}