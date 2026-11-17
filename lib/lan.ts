import { networkInterfaces } from "os";

/** This computer's Wi-Fi/LAN IPv4 addresses (e.g. 192.168.1.20), so phones on the same network can reach the dev server. */
export function lanAddresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .map((i) => i!.address);
}
