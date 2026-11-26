"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
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
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 pt-20 bg-zinc-100">
      <div className="flex flex-col max-w-lg items-center rounded-2xl border border-zinc-200 bg-white shadow-sm pb-10">
        <h2>เลือกวิธีชำระเงิน</h2>
      </div>

      <div className="relative flex justify-center">
        {/* วงกลมสีดำขนาดเล็กอยู่ด้านหลัง */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-0 h-90 w-90 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#db8c4d]" />

        {/* รูปภาพอยู่ด้านหน้า */}
        <div className="relative z-10 aspect-square w-full max-w-[360pt] overflow-hidden">
          <img
            src={"/images/ChaChak/chachak2.png"}
            className="h-full w-full -translate-y-10 object-cover drop-shadow-xl transition"
          />
        </div>
      </div>

      {/* Order Summary */}
      <div className="w-full font-kanit max-w-lg rounded-2xl">
        <div className="flex flex-col justify-center items-center text-base font-bold text-black">
          <p className="text-4xl text-taupe-600">
            ชาชัก สูตรหวาน {draft.sweet}
          </p>
          <span className="text-6xl text-[#b2bb1e]">
            ฿{priceData.totalPrice.toFixed(2)}
          </span>
        </div>
      </div>

      {/* <div className="flex flex-col gap-3 mt-6 w-full px-15 font-kanit mb-5 text-taupe-600">
          <div className="flex justify-between">
            <p className="text-2xl font-medium">ชื่อบัญชี</p>
            <p className="text-2xl font-medium">คมณฤทธิ์ สินคง</p>
          </div>
          <div className="flex justify-between">
            <p className="text-2xl font-medium">จำนวน</p>
            <p className="text-2xl font-medium">
              ฿{priceData.totalPrice.toFixed(2)}
            </p>
          </div>
        </div> */}

      {/* PromptPay QR */}
      {/* <div className="flex flex-col max-w-lg items-center rounded-2xl border border-zinc-200 bg-white shadow-sm pb-10">
        <img
          className="rounded-t-2xl"
          src="/images/thai-qr-payment.png"
          alt=""
        />
        <QRCodeSVG value={priceData.qrPayload} size={300} level="M" />
        
      </div> */}

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
