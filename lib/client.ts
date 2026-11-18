/** Client-side JSON fetch that throws an Error carrying the API's user-facing message. */
export async function api<T = unknown>(url: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
    headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Something went wrong. Please try again.");
  return data as T;
}

export const jsonFetcher = <T,>(url: string) => api<T>(url);

/** Random id that works on plain-http LAN addresses too (crypto.randomUUID needs HTTPS). */
export function randomId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** True when the request never reached the server (Wi-Fi dropped, etc.), so it's safe to resend. */
export function isNetworkError(e: unknown) {
  return e instanceof TypeError;
}
