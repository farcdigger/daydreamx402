import type { VercelRequest, VercelResponse } from "@vercel/node";

// Environment validation
const X402_FACILITATOR_URL = process.env.X402_FACILITATOR_URL || "https://x402.org/api/v1";
const NETWORK = process.env.NETWORK || "base";

interface PaymentRequest {
  wallet: `0x${string}`;
  amount: string;
  signature?: `0x${string}`;
}

interface X402PaymentStatus {
  verified: boolean;
  amount: string;
  currency: string;
  transactionHash?: string;
}

/**
 * Verify payment via x402 facilitator
 */
async function verifyPayment(
  wallet: `0x${string}`,
  amount: string
): Promise<X402PaymentStatus | null> {
  try {
    const response = await fetch(
      `${X402_FACILITATOR_URL}/verify?wallet=${wallet}&amount=${amount}&network=${NETWORK}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data as X402PaymentStatus;
  } catch (error) {
    console.error("x402 verification error:", error);
    return null;
  }
}


/**
 * Main payment endpoint with x402 middleware
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
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { wallet, amount, signature } = req.body as PaymentRequest;

    // Validate request
    if (!wallet || !amount) {
      return res.status(400).json({
        error: "Missing required fields: wallet, amount",
      });
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        error: "Invalid wallet address format",
      });
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        error: "Invalid amount. Must be a positive number.",
      });
    }

    // x402 Payment Verification
    const paymentStatus = await verifyPayment(wallet, amount);

    if (!paymentStatus || !paymentStatus.verified) {
      // Return 402 Payment Required
      return res.status(402).json({
        status: "payment_required",
        message: "Payment not verified. Please complete payment via x402 facilitator.",
        facilitatorUrl: `${X402_FACILITATOR_URL}/pay?wallet=${wallet}&amount=${amount}&network=${NETWORK}`,
        required: {
          wallet,
          amount,
          currency: "USDC",
          network: NETWORK,
        },
      });
    }

    // Payment verified - return success
    return res.status(200).json({
      status: "success",
      message: "Payment verified successfully",
      transactionHash: paymentStatus.transactionHash,
      usdcPaid: amount,
      network: NETWORK,
      verifiedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Payment endpoint error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}
