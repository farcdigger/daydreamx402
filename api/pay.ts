import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createDreamsRouterAuth } from "@daydreamsai/ai-sdk-provider";
import { createDreams, LogLevel } from "@daydreamsai/core";
import { privateKeyToAccount } from "viem/accounts";

// Environment variables
const SELLER_PRIVATE_KEY = process.env.SELLER_PRIVATE_KEY as `0x${string}`;
const PAYMENT_AMOUNT = process.env.PAYMENT_AMOUNT || "100000"; // $0.10 USDC (6 decimals)
const NETWORK_ENV = process.env.NETWORK || "base";
const NETWORK = (NETWORK_ENV === "base" || NETWORK_ENV === "base-sepolia" 
  ? NETWORK_ENV 
  : "base") as "base" | "base-sepolia";

if (!SELLER_PRIVATE_KEY) {
  throw new Error("SELLER_PRIVATE_KEY environment variable is required");
}

/**
 * Main payment endpoint with x402 payment via Daydreams Router
 * Based on: https://docs.daydreams.systems/docs/router
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        error: "Missing required field: prompt",
      });
    }

    // Initialize Daydreams Router with x402 payment
    // Reference: https://docs.daydreams.systems/docs/router
    const account = privateKeyToAccount(SELLER_PRIVATE_KEY);
    const sellerWalletAddress = account.address; // Payment recipient address
    
    const { dreamsRouter, user } = await createDreamsRouterAuth(account, {
      payments: {
        amount: PAYMENT_AMOUNT, // $0.10 USDC per request (6-decimal units)
        network: NETWORK,
      },
    });

    // Create Dreams agent with router
    const agent = createDreams({
      logLevel: LogLevel.ERROR,
      model: dreamsRouter("google-vertex/gemini-2.5-flash"),
    });

    // Execute AI request - this triggers x402 payment
    // Payment goes to sellerWalletAddress (derived from SELLER_PRIVATE_KEY)
    const response = await agent.complete(prompt);

    return res.status(200).json({
      status: "success",
      response: response.outputText || "",
      model: "google-vertex/gemini-2.5-flash",
      network: NETWORK,
      paymentAmount: PAYMENT_AMOUNT,
      paymentRecipient: sellerWalletAddress, // Wallet address that receives payments
      userBalance: user.balance,
    });
  } catch (error: any) {
    console.error("Daydreams Router error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}
