import { NextResponse } from "next/server";
import generatePayload from "promptpay-qr";

const BASE_TEA_PRICE = 49; // ราคาชาชักเริ่มต้น (ปรับตามราคาจริงของร้าน)
const SHOP_PROMPTPAY_ID = "0832014792"; // เบอร์พร้อมเพย์หรือเลขบัตรประชาชนร้าน

const SWEET_PRICES: Record<string, number> = {
  "50%": 0,
  "100%": 0,
  "150%": 0,
};

const DONATE_PRICES: Record<string, number> = {
  "0฿": 0,
  "10฿": 10,
  "20฿": 20,
};

const TOPPING_PRICES: Record<string, number> = {
  "ไม่ใส่": 0,
  "บุก +5฿": 5,
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sweet, donate, topping, count } = body as {
      sweet?: string;
      donate?: string;
      topping?: string;
      count?: number;
    };

    if (
      !sweet ||
      !donate ||
      !topping ||
      !count ||
      !(sweet in SWEET_PRICES) ||
      !(donate in DONATE_PRICES) ||
      !(topping in TOPPING_PRICES)
    ) {
      return NextResponse.json(
        { error: "Invalid order options" },
        { status: 400 }
      );
    }

    const basePrice = BASE_TEA_PRICE;
    const sweetPrice = SWEET_PRICES[sweet];
    const donatePrice = DONATE_PRICES[donate];
    const toppingPrice = TOPPING_PRICES[topping];
    const totalPrice = ((basePrice + sweetPrice + toppingPrice) * count) + donatePrice;

    const qrPayload = generatePayload(SHOP_PROMPTPAY_ID, {
      amount: totalPrice,
    });

    return NextResponse.json({
      breakdown: {
        basePrice,
        sweetPrice,
        donatePrice,
        toppingPrice,
        count,
      },
      totalPrice,
      qrPayload,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to calculate order price" },
      { status: 500 }
    );
  }
}