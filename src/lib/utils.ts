import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const menuMap: Record<number, string> = {
    1: "Cosmopolitan",
    2: "Magic Gimlet",
    3: "Pineapple Gin Sour",
    4: "Bay Breeze",
    5: "Tom Collins",
    6: "Vodka Sour",
    7: "Magic Lemonade",
    8: "Cranberry Cooler",
    9: "Pineapple Fizz",
    10: "Sunset Punch",
    11: "Butterfly Pineapple",
  };

export function getMenuNameById(id: number) {

  return menuMap[id] ?? "Unknown Menu Item";
}

export function getMenuIdByName(name: string): number | undefined {
  const entry = Object.entries(menuMap).find(
    ([, menuName]) => menuName === name
  );

  return entry ? Number(entry[0]) : undefined;
}

export function toMenuKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "_");
}