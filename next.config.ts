import type { NextConfig } from "next";
import { lanAddresses } from "./lib/lan";

const nextConfig: NextConfig = {
  // Let phones on the same Wi-Fi open the dev server (to test table QR codes).
  allowedDevOrigins: lanAddresses(),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
