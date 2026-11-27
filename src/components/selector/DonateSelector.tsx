"use client";

import { playSynthTap } from "@/lib/playSynthTap";
import { useState } from "react";

const SCALE_OPTIONS = ["0฿", "10฿", "20฿"] as const;
export type ScaleOption = (typeof SCALE_OPTIONS)[number];

export function DonateSelector({
  value,
  onChange,
}: {
  value?: ScaleOption;
  onChange?: (val: ScaleOption) => void;
}) {
  const [selected, setSelected] = useState<ScaleOption>(value ?? "0฿");
  const current = value ?? selected;

  const handleSelect = (opt: ScaleOption) => {
    if (!value) setSelected(opt);
    onChange?.(opt);
  };

  return (
    <div
      role="radiogroup"
      aria-label="โดเนท"
      className="flex w-96 items-center justify-end gap-3 text-2xl"
    >
      {SCALE_OPTIONS.map((opt) => {
        const isActive = current === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => {
              handleSelect(opt);
              playSynthTap();
            }}
            className={`cursor-pointer w-full rounded-full border-2 px-6 py-3 font-medium transition active:scale-95 ${
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
