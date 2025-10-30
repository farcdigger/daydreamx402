import { app } from "../src/server";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const url = `https://${req.headers.host}${req.url}`;
    const method = req.method || "GET";
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === "string") headers.set(k, v);
    }
    const body = method === "GET" || method === "HEAD" ? undefined : (req as any);
    const request = new Request(url, { method, headers, body } as any);
    const response = await app.fetch(request);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
}

