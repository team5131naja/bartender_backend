"use client";

import generatePayload from "promptpay-qr";
import { QRCodeSVG } from "qrcode.react";

interface PromptPayQRProps {
  /** 10-digit phone number (e.g., "0812345678") or 13-digit ID */
  promptPayId: string;
  /** Exact amount in THB (optional — omit if letting the customer enter the amount) */
  amount?: number;
  size?: number;
}

export function PromptPayQR({
  promptPayId,
  amount,
  size = 240,
}: PromptPayQRProps) {
  const payload = generatePayload(promptPayId, { amount });

  return (
    <div className="inline-flex flex-col items-center rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      {/* Thai QR Payment Header */}
      <div className="mb-3 flex w-full items-center justify-center rounded-lg bg-[#113566] py-1.5 text-xs font-bold tracking-wider text-white">
        THAI QR PAYMENT • PROMPTPAY
      </div>

      {/* QR Code */}
      <div className="rounded-xl bg-white p-2">
        <QRCodeSVG
          value={payload}
          size={size}
          level="M"
          includeMargin={false}
        />
      </div>

      {/* Amount Display */}
      {typeof amount === "number" && (
        <div className="mt-3 text-center">
          <p className="text-xs text-zinc-500">ยอดชำระ (Amount)</p>
          <p className="text-2xl font-bold text-black">
            ฿{amount.toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
}