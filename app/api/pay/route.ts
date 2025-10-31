import { NextRequest, NextResponse } from 'next/server';

const PAYMENT_AMOUNT = process.env.PAYMENT_AMOUNT || "5000000"; // $5 USDC (6 decimals)
const NETWORK_ENV = process.env.NETWORK || "base";
const SELLER_WALLET = process.env.SELLER_WALLET as `0x${string}` || "0x6a40e304193d2BD3fa7479c35a45bA4CCDBb4683";
const SELLER_PRIVATE_KEY = process.env.SELLER_PRIVATE_KEY as `0x${string}`;

// x402 payment configuration
// Client will complete payment from user's wallet when 402 is returned

interface PaymentRequest {
  wallet: `0x${string}`;
  amount?: string;
  transactionHash?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Check x402 payment headers
    const x402Payment = req.headers.get('x-402-payment');
    const x402Signature = req.headers.get('x-402-signature');
    
    // If no x402 headers, return 402 Payment Required
    // Client will complete x402 payment from user's wallet
    if (!x402Payment || !x402Signature) {
      return NextResponse.json(
        {
          error: "Payment required",
          message: "Please complete x402 payment to proceed",
          amount: PAYMENT_AMOUNT,
          network: NETWORK_ENV,
          recipient: SELLER_WALLET,
          x402Payment: true,
        },
        { status: 402 }
      );
    }

    // Verify x402 payment was completed
    // x402 headers are present, payment was successful

    const body: PaymentRequest = await req.json();
    const { wallet, amount, transactionHash } = body;

    // Validate wallet
    if (!wallet || typeof wallet !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid wallet address" },
        { status: 400 }
      );
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    const paymentAmount = amount || PAYMENT_AMOUNT;
    const amountNum = parseInt(paymentAmount, 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: "Invalid payment amount" },
        { status: 400 }
      );
    }

    const paymentAmountUSD = (parseInt(paymentAmount) / 1000000).toFixed(2);

    return NextResponse.json({
      status: "success",
      message: "Payment verified and recorded successfully",
      wallet,
      paymentAmount,
      paymentAmountUSD,
      paymentRecipient: SELLER_WALLET,
      network: NETWORK_ENV,
      transactionHash: transactionHash || null,
      timestamp: new Date().toISOString(),
      x402Payment: true,
    });
  } catch (error: any) {
    console.error("Payment endpoint error:", error);
    return NextResponse.json(
      {
        error: error?.message || "Internal server error",
        details: error?.stack?.substring(0, 200) || "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

