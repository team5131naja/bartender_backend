"use client";

import { useState } from "react";

const SCALE_OPTIONS = ["50%", "100%", "150%"] as const;
type ScaleOption = (typeof SCALE_OPTIONS)[number];

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
      className="flex items-center justify-end gap-4 text-xl"
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
            className={`cursor-pointer rounded-full border-2 border-taupe-600 px-4 py-2 font-medium transition active:scale-95 ${
              isActive
                ? "bg-taupe-600 text-white"
                : "bg-transparent text-taupe-600 hover:bg-taupe-600/10"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}