/* eslint-disable @typescript-eslint/no-require-imports -- Load isolated CommonJS handler modules with mocked I/O. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

// Execute the real handlers with isolated storage/socket dependencies.
function loadSource(file, mocks = {}) {
  const filename = path.resolve(__dirname, "..", file);
  const instance = new Module(filename, module);
  instance.filename = filename;
  instance.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = instance.require.bind(instance);
  instance.require = (id) => Object.hasOwn(mocks, id) ? mocks[id] : originalRequire(id);
  instance._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, filename);
  return instance.exports;
}

const auth = loadSource("src/lib/auth.ts");
function request(method, body, authenticated = true, query = "") {
  return new Request(`http://localhost:3000/api/orders${query}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(authenticated ? { cookie: `${auth.SESSION_COOKIE}=${auth.createStaffSession("test")}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function ordersHarness(initial, sendOrder = async () => true) {
  const orders = new Map(initial.map((order) => [order.uuid, { ...order }]));
  const sent = [];
  let reads = 0;
  const db = {
    dbGet: async (_sql, params) => { reads++; return orders.get(params[0]) ?? null; },
    dbAll: async () => { reads++; return [...orders.values()]; },
    dbRun: async (_sql, [status, uuid, expectedStatus]) => {
      const order = orders.get(uuid);
      if (!order || order.status !== expectedStatus) return { changes: 0 };
      order.status = status;
      return { changes: 1 };
    },
  };
  const handlers = loadSource("src/app/api/orders/route.ts", {
    "@/lib/auth": auth, "@/lib/db": db,
    "@/lib/socket": { sendOrder: async (name) => { sent.push(name); return sendOrder(name); } },
  });
  return { handlers, db, orders, sent, reads: () => reads };
}

test("staff APIs reject unauthenticated requests before accessing storage or the robot", async () => {
  const h = ordersHarness([]);
  assert.equal((await h.handlers.GET(request("GET", undefined, false))).status, 401);
  assert.equal((await h.handlers.DELETE(request("DELETE", { uuid: "a" }, false))).status, 401);
  assert.equal((await h.handlers.POST(request("POST", { menus: [{ uuid: "a" }] }, false))).status, 401);
  const counts = loadSource("src/app/api/orders/count/route.ts", { "@/lib/auth": auth, "@/lib/db": h.db });
  assert.equal((await counts.GET(request("GET", undefined, false))).status, 401);
  assert.equal(h.reads(), 0);
  assert.equal(h.sent.length, 0);
});

test("session cookie is issued on login, checked server-side and revoked on logout", async () => {
  const handlers = loadSource("src/app/api/auth/route.ts", { "@/lib/auth": auth });
  assert.equal((await handlers.GET(request("GET", undefined, false))).status, 401);
  const response = await handlers.POST(request("POST", {
    username: process.env.ADMIN_USER ?? "admin", password: process.env.ADMIN_PASS ?? "admin",
  }, false));
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=strict/i);
  const authenticated = new Request("http://localhost/api/auth", { headers: { cookie: cookie.split(";")[0] } });
  assert.equal((await handlers.GET(authenticated)).status, 200);
  await handlers.DELETE(authenticated);
  assert.equal((await handlers.GET(authenticated)).status, 401);
});

test("session cookies support local HTTP kiosks and require secure transport on HTTPS", () => {
  assert.equal(auth.sessionCookieOptions(new Request("http://192.168.1.2:3000")).secure, false);
  assert.equal(auth.sessionCookieOptions(new Request("https://bar.example")).secure, true);
});

test("concurrent acceptance and retries dispatch an order once using the database menu", async () => {
  let release;
  const h = ordersHarness([{ uuid: "a", status: "pending", menu_name: "Trusted menu" }],
    () => new Promise((resolve) => { release = resolve; }));
  const first = h.handlers.POST(request("POST", { menus: [{ uuid: "a", menu_id: "Forged menu" }] }));
  await new Promise(setImmediate);
  const second = await h.handlers.POST(request("POST", { menus: [{ uuid: "a" }] }));
  assert.equal(second.status, 200);
  release(true);
  assert.equal((await first).status, 200);
  assert.equal((await h.handlers.POST(request("POST", { menus: [{ uuid: "a" }] }))).status, 200);
  assert.deepEqual(h.sent, ["Trusted menu"]);
});

test("unknown and cancelled orders never reach the robot", async () => {
  const h = ordersHarness([{ uuid: "cancelled", status: "cancelled", menu_name: "Tea" }]);
  assert.equal((await h.handlers.POST(request("POST", { menus: [{ uuid: "missing" }] }))).status, 404);
  assert.equal((await h.handlers.POST(request("POST", { menus: [{ uuid: "cancelled" }] }))).status, 409);
  assert.equal(h.sent.length, 0);
});

test("retrying a partially failed batch does not resend its successful orders", async () => {
  let failed = false;
  const h = ordersHarness([
    { uuid: "a", status: "pending", menu_name: "A" },
    { uuid: "b", status: "pending", menu_name: "B" },
  ], async (name) => { if (name === "B" && !failed) { failed = true; return false; } return true; });
  const body = { menus: [{ uuid: "a" }, { uuid: "b" }] };
  assert.equal((await h.handlers.POST(request("POST", body))).status, 503);
  assert.equal((await h.handlers.POST(request("POST", body))).status, 200);
  assert.deepEqual(h.sent, ["A", "B", "B"]);
});

test("concurrent first database writes survive initialization and persistence", async () => {
  let persisted;
  const memoryFs = {
    existsSync: () => false,
    readFileSync: (filename) => {
      assert.match(filename, /sql-wasm\.wasm$/);
      return fs.readFileSync(filename);
    },
    writeFileSync: (_filename, buffer) => { persisted = Buffer.from(buffer); },
  };
  const db = loadSource("src/lib/db.ts", { fs: memoryFs });
  await Promise.all(["parallel-a", "parallel-b"].map((name) => db.dbRun(
    "INSERT INTO customers (uuid, name) VALUES (?, ?)", [name, name],
  )));
  assert.deepEqual((await db.dbAll("SELECT name FROM customers ORDER BY name")).map((row) => row.name), ["parallel-a", "parallel-b"]);
  const SQL = await require("sql.js")();
  const reopened = new SQL.Database(persisted);
  assert.equal(reopened.exec("SELECT COUNT(*) FROM customers")[0].values[0][0], 2);
  reopened.close();
});
