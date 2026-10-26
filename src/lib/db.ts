import initSqlJs, { Database } from "sql.js";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data.db");

let db: Database | null = null;
let initialization: Promise<Database> | null = null;

async function initDb(): Promise<Database> {
  if (initialization) return initialization;
  if (db) return db;
  initialization = initializeDb();
  try {
    return await initialization;
  } catch (error) {
    db = null;
    throw error;
  } finally {
    initialization = null;
  }
}

async function initializeDb(): Promise<Database> {
  try {
    // Load WASM binary manually to avoid pnpm path issues
    const wasmPath = path.join(process.cwd(), "node_modules", "sql.js", "dist", "sql-wasm.wasm");
    const wasmBinary = fs.readFileSync(wasmPath);
    const SQL = await initSqlJs({ wasmBinary });

    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }

    // Create tables
    db.run(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS menus (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        image_url TEXT,
        available INTEGER DEFAULT 1
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT NOT NULL UNIQUE,
        menu_id INTEGER,
        description TEXT,
        status TEXT DEFAULT 'created',
        customer_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (menu_id) REFERENCES menus(id),
        FOREIGN KEY (customer_id) REFERENCES customers(uuid)
      )
    `);

    // Ensure category column exists
    try {
      db.run("ALTER TABLE menus ADD COLUMN category TEXT DEFAULT 'cocktail'");
    } catch {
      // Column already exists
    }

    // Insert default menus if empty
    const countResult = db.exec("SELECT COUNT(*) as c FROM menus");
    const menuCount = countResult[0]?.values[0]?.[0] ?? 0;

    const defaultMenus = [
      ["Cosmopolitan", "/images/Cocktail/cosmopolitan.png", "cocktail"],
      ["Magic Gimlet", "/images/Cocktail/magic-gimlet.jpg", "cocktail"],
      ["Pineapple Gin Sour", "/images/Cocktail/pineapple-gin-sour.webp", "cocktail"],
      ["Bay Breeze", "/images/Cocktail/bay-breeze.jpg", "cocktail"],
      ["Tom Collins", "/images/Cocktail/tom-collins.jpg", "cocktail"],
      ["Vodka Sour", "/images/Cocktail/vodka-sour.jpg", "cocktail"],
      ["Magic Lemonade", "/images/Mocktail/magic-lemonade.jpeg", "cocktail"],
      ["Cranberry Cooler", "/images/Mocktail/cranberry-cooler.jpeg", "cocktail"],
      ["Pineapple Fizz", "/images/Mocktail/pineapple-fizz.jpeg", "cocktail"],
      ["Sunset Punch", "/images/Mocktail/sunset-punch.jpeg", "cocktail"],
      ["Butterfly Pineapple", "/images/Mocktail/butterfly-pineapple.jpg", "cocktail"],
      ["ชาชัก", "/images/ChaChak/signature-cha-chak.jpg", "cha_chak"],
      ["ชาชักโกโก้", "/images/ChaChak/cocoa-cha-chak.jpg", "cha_chak"],
      ["ชาเขียวชัก", "/images/ChaChak/green-cha-chak.jpg", "cha_chak"],
      ["ชาชักน้ำผึ้งมะนาว", "/images/ChaChak/honey-lime-tea.jpg", "cha_chak"],
      ["ชาชักโฮจิฉะ", "/images/ChaChak/houjicha-coconut.jpg", "cha_chak"],
    ];

    if (menuCount === 0) {
      for (const [name, imageUrl, cat] of defaultMenus) {
        db.run("INSERT INTO menus (name, image_url, category) VALUES (?, ?, ?)", [name, imageUrl, cat]);
      }
      console.log("[db] Seeded", defaultMenus.length, "default menus");
    } else {
      // Ensure cocktails are categorized
      db.run("UPDATE menus SET category = 'cocktail' WHERE id <= 11 AND (category IS NULL OR category = '')");

      // Ensure cha chak items are present and categorized
      const chaChakItems = [
        [12, "ชาชัก", "/images/ChaChak/signature-cha-chak.jpg", "cha_chak"],
        [13, "ชาชักโกโก้", "/images/ChaChak/cocoa-cha-chak.jpg", "cha_chak"],
        [14, "ชาเขียวชัก", "/images/ChaChak/green-cha-chak.jpg", "cha_chak"],
        [15, "ชาชักน้ำผึ้งมะนาว", "/images/ChaChak/honey-lime-tea.jpg", "cha_chak"],
        [16, "ชาชักโฮจิฉะ", "/images/ChaChak/houjicha-coconut.jpg", "cha_chak"],
      ];

      for (const [id, name, imageUrl, cat] of chaChakItems) {
        const check = db.exec(`SELECT COUNT(*) as c FROM menus WHERE name = '${name}'`);
        if ((check[0]?.values[0]?.[0] ?? 0) === 0) {
          db.run("INSERT INTO menus (id, name, image_url, category) VALUES (?, ?, ?, ?)", [id, name, imageUrl, cat]);
        } else {
          db.run("UPDATE menus SET category = ?, image_url = ? WHERE name = ?", [cat, imageUrl, name]);
        }
      }
    }

    saveDb();
    return db;
  } catch (error) {
    console.error("[db] Init failed:", error);
    throw error;
  }
}

export function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

export async function dbAll(sql: string, params: any[] = []): Promise<any[]> {
  const database = await initDb();
  const stmt = database.prepare(sql);
  stmt.bind(params);

  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

export async function dbGet(sql: string, params: any[] = []): Promise<any | null> {
  const rows = await dbAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function dbRun(
  sql: string,
  params: any[] = [],
): Promise<{ changes: number; lastInsertRowid: number }> {
  const database = await initDb();
  database.run(sql, params);
  saveDb();
  return {
    changes: database.getRowsModified(),
    lastInsertRowid: database.exec("SELECT last_insert_rowid()")[0]
      ?.values[0]?.[0] as number,
  };
}
