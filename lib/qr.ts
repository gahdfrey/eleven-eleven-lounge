import QRCode from "qrcode";

/** Black-on-white SVG QR code (high contrast scans best, even on a dark page). */
export function qrSvg(url: string) {
  return QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
}
