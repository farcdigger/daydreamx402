import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Root API endpoint - Health check and API info
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  return res.status(200).json({
    status: "ok",
    service: "Daydreams Router + x402 Payment API",
    endpoints: {
      "/api": "This endpoint (API info)",
      "/api/pay": "POST - AI service with x402 payment",
    },
    documentation: "https://docs.daydreams.systems/docs/router",
  });
}

