"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode } from "lucide-react";
// import { TeaOrder } from "../cha-chak/page";

interface PriceResponse {
  breakdown: {
    basePrice: number;
    sweetPrice: number;
    donatePrice: number;
    toppingPrice: number;
  };
  totalPrice: number;
  qrPayload: string;
}

const SWEET_LABELS: Record<string, string> = {
  "50%": "หวานน้อย (50%)",
  "100%": "หวานปกติ (100%)",
  "150%": "หวานมาก (150%)",
};

export default function PaymentPage() {
  const [draft, setDraft] = useState<any | null>(null);
  const [priceData, setPriceData] = useState<PriceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("tea_order");
    if (!raw) {
      setError("ไม่พบข้อมูลรายการสั่งซื้อ");
      return;
    }

    const parsed: any = JSON.parse(raw);
    setDraft(parsed);

    const fetchPrice = async () => {
      try {
        const res = await fetch("/api/orders/price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sweet: parsed.sweet,
            donate: parsed.donate,
            topping: parsed.topping,
          }),
        });

        if (!res.ok) {
          throw new Error("ไม่สามารถคำนวณราคาได้");
        }

        const data: PriceResponse = await res.json();
        setPriceData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      }
    };

    fetchPrice();
  }, []);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-rose-600">{error}</p>
      </main>
    );
  }

  if (!draft || !priceData) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-zinc-500">Loading order...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-zinc-100 px-6 pt-20">
      <div className="my-60 max-w-3xl w-full">
        <h2 className="text-center text-7xl font-bold text-black font-noto-sans-thai mb-28">
          เลือกวิธีการชำระเงิน
        </h2>

        <div className="flex gap-12">
          <button
            type="button"
            className="flex w-full cursor-pointer flex-col items-center justify-between gap-6 rounded-2xl border border-transparent bg-white p-6 text-black drop-shadow-sm transition-all duration-150 ease-out hover:-translate-y-1 hover:drop-shadow-md active:translate-y-0 active:scale-[0.97] active:bg-zinc-50 active:drop-shadow-xs"
          >
            <span className="flex items-center gap-3 font-noto-sans-thai text-2xl font-medium">
              <QrCode /> Thai QR | PromptPay
            </span>
            <img
              className="h-36 object-contain"
              src="/images/promptpay.png"
              alt="qrpayment"
            />
          </button>

          <button
            type="button"
            className="flex w-full flex-col items-center justify-start gap-6 rounded-2xl bg-white p-6 text-black drop-shadow-sm transition-all duration-150 ease-out hover:-translate-y-1 hover:drop-shadow-md active:translate-y-0 active:scale-[0.97] active:bg-zinc-50 active:drop-shadow-xs"
          >
            <span className="flex items-center gap-3 font-noto-sans-thai text-2xl font-medium">
              <img
                className="h-8 w-8 object-contain"
                src="/images/thai-baht.png"
                alt=""
              />
              จ่ายด้วยเงินสด
            </span>

            <img className="w-52" src="/images/cash.png" alt="" />
          </button>
        </div>
      </div>

      <div className="mt-auto p-4 flex items-center justify-end">
        <button
          type="button"
          //   onClick={handleNextPay}
          className="font-kanit cursor-pointer text-3xl rounded-full bg-taupe-900 px-10 py-4 text-white shadow hover:bg-taupe-600"
        >
          ยกเลิก
        </button>
      </div>
    </main>
  );
}
