import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const menuMap: Record<number, string> = {
    1: "Arnold Palmer Mocktail",
    2: "Espresso Martini",
    3: "Midori Sour",
    4: "Butterfly Pea Lemonade",
    5: "Black Russian",
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