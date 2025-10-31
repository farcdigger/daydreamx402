import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Root API endpoint - Health check and API info
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  return res.status(200).json({
    status: "ok",
    service: "Token Presale Payment API",
    endpoints: {
      "/api": "This endpoint (API info)",
      "/api/pay": "POST - $5 USDC payment for token presale",
    },
  });
}

