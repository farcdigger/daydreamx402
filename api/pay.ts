import type { VercelRequest, VercelResponse } from "@vercel/node";

// Environment variables
const PAYMENT_AMOUNT = process.env.PAYMENT_AMOUNT || "5000000"; // $5 USDC (6 decimals: 5000000)
const NETWORK_ENV = process.env.NETWORK || "base";
const SELLER_WALLET = process.env.SELLER_WALLET as `0x${string}` || "0x6a40e304193d2BD3fa7479c35a45bA4CCDBb4683"; // Payment recipient

interface PaymentRequest {
  wallet: `0x${string}`;
  amount?: string;
  transactionHash?: string;
}

/**
 * Token Presale Payment Endpoint
 * User connects MetaMask wallet and pays $5 USDC for token presale
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
    const { wallet, amount, transactionHash } = req.body as PaymentRequest;

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

    // Payment amount in USD
    const paymentAmountUSD = (parseInt(paymentAmount) / 1000000).toFixed(2);

    // Record payment with transaction hash
    // Note: In production, verify transaction on-chain before confirming payment
    
    return res.status(200).json({
      status: "success",
      message: "Payment recorded successfully",
      wallet,
      paymentAmount,
      paymentAmountUSD,
      paymentRecipient: SELLER_WALLET,
      network: NETWORK_ENV,
      transactionHash: transactionHash || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Payment endpoint error:", error);
    const errorMessage = error?.message || "Internal server error";
    const errorDetails = error?.stack || error?.toString();
    
    // Ensure we always return valid JSON
    return res.status(500).json({
      error: errorMessage,
      details: typeof errorDetails === 'string' ? errorDetails.substring(0, 200) : 'Unknown error',
    });
  }
}
