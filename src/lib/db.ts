import initSqlJs, { Database } from "sql.js";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data.db");

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();

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
      customer_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (menu_id) REFERENCES menus(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);

  // Insert default menus if empty
  const menuCount = db.exec("SELECT COUNT(*) FROM menus")[0]?.values[0]?.[0] as number;
  if (menuCount === 0) {
    const defaultMenus = [
      ["Arnold Palmer Mocktail", "/images/arnold-palmer.jpg"],
      ["Espresso Martini", "/images/espresso-martini.jpg"],
      ["Midori Sour", "/images/midori-sour.jpg"],
      ["Butterfly Pea Lemonade", "/images/butterfly-pea.jpg"],
      ["Black Russian", "/images/black-russian.jpg"],
    ];
    for (const [name, imageUrl] of defaultMenus) {
      db.run("INSERT INTO menus (name, image_url) VALUES (?, ?)", [name, imageUrl]);
    }
  }

  saveDb();
  return db;
}

export function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Helper: run a query and return all rows as objects
export async function dbAll(sql: string, params: any[] = []): Promise<any[]> {
  const database = await getDb();
  const stmt = database.prepare(sql);
  stmt.bind(params);

  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Helper: run a query and return first row as object
export async function dbGet(sql: string, params: any[] = []): Promise<any | null> {
  const rows = await dbAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Helper: run a write query (INSERT/UPDATE/DELETE)
export async function dbRun(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid: number }> {
  const database = await getDb();
  database.run(sql, params);
  saveDb();
  return {
    changes: database.getRowsModified(),
    lastInsertRowid: database.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] as number,
  };
}
