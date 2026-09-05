function getApiBase() {
  const hostBase = typeof window === "undefined"
    ? (process.env.INTERNAL_API_BASE ?? "http://server:8000")
    : (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000");

  return hostBase.replace(/\/+$/, "");
}

export class FastifyRequestError extends Error {
  constructor(
    public readonly method: string,
    public readonly path: string,
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Fastify request failed: ${method} ${path} -> ${status}: ${body}`);
  }
}

// General-purpose typed fetch wrapper for calling the Fastify server from
// Next.js server-side code. Callers supply the response type; this does not
// know about any specific route.
export async function serverFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? "GET";
  const apiBase = getApiBase();
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw new FastifyRequestError(method, path, res.status, await res.text());
  }

  return res.json() as Promise<T>;
}
