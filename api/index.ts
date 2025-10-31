import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createWalletClient, http, parseUnits, erc20Abi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";

// Environment validation
const X402_FACILITATOR_URL = process.env.X402_FACILITATOR_URL || "https://x402.org/api/v1";
const PAYX_TOKEN_ADDRESS = process.env.PAYX_TOKEN_ADDRESS as `0x${string}`;
const DISTRIBUTOR_PRIVATE_KEY = process.env.DISTRIBUTOR_PRIVATE_KEY as `0x${string}`;
const TOKENS_PER_USDC = BigInt(process.env.TOKENS_PER_USDC || "20000");
const NETWORK = process.env.NETWORK || "base";

if (!PAYX_TOKEN_ADDRESS || !DISTRIBUTOR_PRIVATE_KEY) {
  throw new Error("Missing required environment variables: PAYX_TOKEN_ADDRESS, DISTRIBUTOR_PRIVATE_KEY");
}

const chain = NETWORK === "base" ? base : baseSepolia;
const account = privateKeyToAccount(DISTRIBUTOR_PRIVATE_KEY as `0x${string}`);
const client = createWalletClient({
  account,
  chain,
  transport: http(process.env.BASE_RPC_URL),
});

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
 * Distribute PAYX tokens to user wallet
 */
async function distributeTokens(
  to: `0x${string}`,
  usdcAmount: string
): Promise<`0x${string}`> {
  // Calculate PAYX amount: amount * TOKENS_PER_USDC
  const usdcBigInt = parseUnits(usdcAmount, 6); // USDC has 6 decimals
  const payxAmount = (usdcBigInt * TOKENS_PER_USDC) / parseUnits("1", 6);

  // Get PAYX token decimals (assuming 18, adjust if different)
  const payxDecimals = 18n;
  const payxAmountScaled = (payxAmount * parseUnits("1", Number(payxDecimals))) / parseUnits("1", 6);

  const hash = await client.writeContract({
    address: PAYX_TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: "transfer",
    args: [to, payxAmountScaled],
  });

  return hash;
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

    // Payment verified - proceed with token distribution
    try {
      const distributionHash = await distributeTokens(wallet, amount);

      // Calculate PAYX received
      const usdcBigInt = parseUnits(amount, 6);
      const payxReceived = (usdcBigInt * TOKENS_PER_USDC) / parseUnits("1", 6);

      return res.status(200).json({
        status: "success",
        transactionHash: paymentStatus.transactionHash,
        usdcPaid: amount,
        payxReceived: payxReceived.toString(),
        distributedTxHash: distributionHash,
        network: NETWORK,
      });
    } catch (distributionError: any) {
      console.error("Token distribution error:", distributionError);
      return res.status(500).json({
        error: "Token distribution failed",
        details: distributionError.message,
        paymentVerified: true,
      });
    }
  } catch (error: any) {
    console.error("Payment endpoint error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}
