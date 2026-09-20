import net from "net";
import { toMenuKey } from "./utils";

/**
 * Send an order to the Python socket server.
 * Format: `menu_name,1\n` (snake_case name, count)
 */
export function sendOrder(menuName: string, count: number = 1) {
  const key = toMenuKey(menuName);
  const message = `${key},${count}\n`;

  const socket = net.createConnection({ port: 12345, host: "localhost" }, () => {
    console.log("[socket] Sending:", message.trim());
    socket.write(message);
    socket.end();
  });

  socket.on("error", (err) => {
    console.error("[socket] Error:", err.message);
  });
}
