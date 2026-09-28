import initSqlJs, { Database } from "sql.js";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data.db");

let db: Database | null = null;

async function initDb(): Promise<Database> {
  if (db) return db;

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

    // Insert default menus if empty
    const countResult = db.exec("SELECT COUNT(*) as c FROM menus");
    const menuCount = countResult[0]?.values[0]?.[0] ?? 0;

    if (menuCount === 0) {
      const defaultMenus = [
        ["Cosmopolitan", "/images/Cocktail/cosmopolitan.png"],
        ["Magic Gimlet", "/images/Cocktail/magic-gimlet.jpg"],
        ["Pineapple Gin Sour", "/images/Cocktail/pineapple-gin-sour.webp"],
        ["Bay Breeze", "/images/Cocktail/bay-breeze.jpg"],
        ["Tom Collins", "/images/Cocktail/tom-collins.jpg"],
        ["Vodka Sour", "/images/Cocktail/vodka-sour.jpg"],
        ["Magic Lemonade", "/images/Mocktail/magic-lemonade.jpeg"],
        ["Cranberry Cooler", "/images/Mocktail/cranberry-cooler.jpeg"],
        ["Pineapple Fizz", "/images/Mocktail/pineapple-fizz.jpeg"],
        ["Sunset Punch", "/images/Mocktail/sunset-punch.jpeg"],
        ["Butterfly Pineapple", "/images/Mocktail/butterfly-pineapple.jpg"],
      ];
      for (const [name, imageUrl] of defaultMenus) {
        db.run("INSERT INTO menus (name, image_url) VALUES (?, ?)", [name, imageUrl]);
      }
      console.log("[db] Seeded", defaultMenus.length, "default menus");
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
