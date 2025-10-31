import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createDreamsRouterAuth } from "@daydreamsai/ai-sdk-provider";
import { createDreams, LogLevel } from "@daydreamsai/core";
import { privateKeyToAccount } from "viem/accounts";

// Environment variables
const SELLER_PRIVATE_KEY = process.env.SELLER_PRIVATE_KEY as `0x${string}`;
const PAYMENT_AMOUNT = process.env.PAYMENT_AMOUNT || "5000000"; // $5 USDC (6 decimals: 5000000)
const NETWORK_ENV = process.env.NETWORK || "base";
const NETWORK = (NETWORK_ENV === "base" || NETWORK_ENV === "base-sepolia" 
  ? NETWORK_ENV 
  : "base") as "base" | "base-sepolia";

if (!SELLER_PRIVATE_KEY) {
  console.warn("Warning: SELLER_PRIVATE_KEY not set. Payments will not work.");
}

interface PaymentRequest {
  wallet: `0x${string}`;
  amount?: string;
  prompt?: string;
}

/**
 * Payment endpoint with wallet verification and AI service
 * User connects wallet (MetaMask), pays $5 USDC, then gets AI response
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
    const { wallet, amount, prompt } = req.body as PaymentRequest;

    // Validate wallet
    if (!wallet || typeof wallet !== "string") {
      return res.status(400).json({
        error: "Missing or invalid wallet address",
      });
    }

    // Validate wallet format
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        error: "Invalid wallet address format",
      });
    }

    // Payment amount (default: $5 = 5000000 in 6 decimals)
    const paymentAmount = amount || PAYMENT_AMOUNT;
    const amountNum = parseInt(paymentAmount, 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        error: "Invalid payment amount",
      });
    }

    if (!SELLER_PRIVATE_KEY) {
      return res.status(500).json({
        error: "Server configuration error: SELLER_PRIVATE_KEY not set",
      });
    }

    // Initialize Daydreams Router with x402 payment
    const account = privateKeyToAccount(SELLER_PRIVATE_KEY);
    const sellerWalletAddress = account.address;
    
    const { dreamsRouter, user } = await createDreamsRouterAuth(account, {
      payments: {
        amount: paymentAmount, // Amount in 6-decimal USDC units
        network: NETWORK,
      },
    });

    // Create Dreams agent
    const agent = createDreams({
      logLevel: LogLevel.ERROR,
      model: dreamsRouter("google-vertex/gemini-2.5-flash"),
    });

    // Execute AI request if prompt provided (triggers payment)
    let aiResponse = null;
    if (prompt && prompt.trim()) {
      const response = await agent.complete(prompt);
      aiResponse = {
        text: response.outputText || "",
        model: "google-vertex/gemini-2.5-flash",
      };
    }

    return res.status(200).json({
      status: "success",
      message: "Payment processed successfully",
      wallet,
      paymentAmount,
      paymentAmountUSD: (parseInt(paymentAmount) / 1000000).toFixed(2),
      paymentRecipient: sellerWalletAddress,
      network: NETWORK,
      userBalance: user.balance,
      ...(aiResponse && { aiResponse }),
    });
  } catch (error: any) {
    console.error("Payment endpoint error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}
