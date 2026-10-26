import { randomBytes } from "node:crypto";

export const SESSION_COOKIE = "bartender_session";
export const SESSION_MAX_AGE = 8 * 60 * 60;

const state = globalThis as typeof globalThis & {
  bartenderSessions?: Map<string, { username: string; expiresAt: number }>;
};
const sessions = state.bartenderSessions ??= new Map();

function tokenFrom(request: Request) {
  return request.headers.get("cookie")?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
}

export function staffSession(request: Request) {
  const token = tokenFrom(request);
  const session = token ? sessions.get(token) : undefined;
  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }
  return session;
}

export function createStaffSession(username: string) {
  for (const [token, session] of sessions) {
    if (session.expiresAt <= Date.now()) sessions.delete(token);
  }
  const token = randomBytes(32).toString("hex");
  sessions.set(token, { username, expiresAt: Date.now() + SESSION_MAX_AGE * 1000 });
  return token;
}

export function deleteStaffSession(request: Request) {
  const token = tokenFrom(request);
  if (token) sessions.delete(token);
}

export function sessionCookieOptions(request: Request) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: new URL(request.url).protocol === "https:",
    path: "/",
  };
}
