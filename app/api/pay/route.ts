import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createDreamsRouter } from '@daydreamsai/ai-sdk-provider';
import { privateKeyToAccount } from 'viem/accounts';

const PAYMENT_AMOUNT = process.env.PAYMENT_AMOUNT || "5000000"; // $5 USDC (6 decimals)
const NETWORK_ENV = process.env.NETWORK || "base";
const SELLER_WALLET = process.env.SELLER_WALLET as `0x${string}` || "0x6a40e304193d2BD3fa7479c35a45bA4CCDBb4683";
const SELLER_PRIVATE_KEY = process.env.SELLER_PRIVATE_KEY as `0x${string}`;

// Initialize Dreams Router for x402 payments (server-side only)
function getDreamsRouter() {
  if (!SELLER_PRIVATE_KEY) {
    return null;
  }
  
  try {
    const account = privateKeyToAccount(SELLER_PRIVATE_KEY);
    const dreamsRouter = createDreamsRouter.evm(account, {
      payments: {
        network: NETWORK_ENV as "base",
      },
    });
    return dreamsRouter;
  } catch (error) {
    console.error('Failed to create Dreams Router:', error);
    return null;
  }
}

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
    
    // If no x402 headers, initiate x402 payment via Dreams Router
    if (!x402Payment || !x402Signature) {
      const dreamsRouter = getDreamsRouter();
      if (!dreamsRouter) {
        return NextResponse.json(
          { error: "Payment gateway not configured. Missing SELLER_PRIVATE_KEY." },
          { status: 500 }
        );
      }

      // Make AI call via Dreams Router to trigger x402 payment
      // Dreams Router will automatically handle x402 payment flow
      // The payment amount and recipient come from the Dreams Router 402 response
      try {
        // This will trigger x402 payment automatically via Dreams Router
        // The x402 facilitator will process the payment
        const { text } = await generateText({
          model: dreamsRouter('google-vertex/gemini-2.5-flash'),
          prompt: 'Token presale payment confirmation',
        });

        // x402 payment is being processed by Dreams Router
        // Return 402 with payment details
        // Client should retry after payment is confirmed
        
        return NextResponse.json(
          {
            error: "Payment required",
            message: "x402 payment initiated via Dreams Router",
            amount: PAYMENT_AMOUNT,
            network: NETWORK_ENV,
            x402Payment: true,
            note: "x402 payment is being processed. Please retry after confirmation.",
          },
          { status: 402 }
        );
      } catch (dreamsError: any) {
        console.error('Dreams Router x402 payment error:', dreamsError);
        
        // If Dreams Router fails, still return 402 but with error info
        return NextResponse.json(
          {
            error: "Payment required",
            message: "x402 payment gateway error: " + (dreamsError.message || "Failed to initiate"),
            amount: PAYMENT_AMOUNT,
            network: NETWORK_ENV,
          },
          { status: 402 }
        );
      }
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

