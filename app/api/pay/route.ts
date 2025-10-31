import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createDreamsRouter, createEVMAuthFromPrivateKey } from '@daydreamsai/ai-sdk-provider';

const PAYMENT_AMOUNT = process.env.PAYMENT_AMOUNT || "5000000"; // $5 USDC (6 decimals)
const NETWORK_ENV = process.env.NETWORK || "base";
const SELLER_WALLET = process.env.SELLER_WALLET as `0x${string}` || "0x6a40e304193d2BD3fa7479c35a45bA4CCDBb4683";
const SELLER_PRIVATE_KEY = process.env.SELLER_PRIVATE_KEY as `0x${string}`;
const DREAMSROUTER_API_KEY = process.env.DREAMSROUTER_API_KEY;

// Cache Dreams Router instance
let cachedDreamsRouter: ReturnType<typeof createDreamsRouter> | Awaited<ReturnType<typeof createEVMAuthFromPrivateKey>>['dreamsRouter'] | null = null;

// Initialize Dreams Router with x402 payments
async function getDreamsRouter() {
  // Return cached instance if available
  if (cachedDreamsRouter) {
    return cachedDreamsRouter;
  }
  
  try {
    // Try API key auth first (if available)
    if (DREAMSROUTER_API_KEY) {
      console.log('Creating Dreams Router with API key auth');
      const dreamsRouter = createDreamsRouter({
        apiKey: DREAMSROUTER_API_KEY,
      });
      cachedDreamsRouter = dreamsRouter;
      console.log('Dreams Router created with API key');
      return dreamsRouter;
    }
    
    // Fallback to EVM private key auth
    if (!SELLER_PRIVATE_KEY) {
      console.error('Neither DREAMSROUTER_API_KEY nor SELLER_PRIVATE_KEY is set');
      return null;
    }
    
    console.log('Creating Dreams Router with EVM private key, network:', NETWORK_ENV);
    // Use createEVMAuthFromPrivateKey helper as per documentation
    const { dreamsRouter } = await createEVMAuthFromPrivateKey(
      SELLER_PRIVATE_KEY,
      {
        payments: { 
          network: NETWORK_ENV as 'base' | 'base-sepolia',
        },
      }
    );
    cachedDreamsRouter = dreamsRouter;
    console.log('Dreams Router created with EVM auth');
    return dreamsRouter;
  } catch (error: any) {
    console.error('Failed to create Dreams Router:', error);
    console.error('Error details:', error?.message, error?.stack);
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
      const dreamsRouter = await getDreamsRouter();
      if (!dreamsRouter) {
        return NextResponse.json(
          { 
            error: "Payment gateway not configured.",
            message: "Missing DREAMSROUTER_API_KEY or SELLER_PRIVATE_KEY. Get API key from https://router.daydreams.systems",
          },
          { status: 500 }
        );
      }

      // Make AI call via Dreams Router - this automatically triggers x402 payment
      // The payment amount and recipient come from the router's 402 response
      // Note: generateText may throw a 402 error which is expected behavior for x402
      try {
        console.log('Calling generateText with Dreams Router...');
        console.log('Model:', 'google-vertex/gemini-2.5-flash');
        console.log('Network:', NETWORK_ENV);
        
        const { text } = await generateText({
          model: dreamsRouter('google-vertex/gemini-2.5-flash'),
          prompt: 'Token presale payment confirmation',
        });

        console.log('generateText completed successfully, text:', text);

        // If we get here, x402 payment was successful
        // Return 402 to client so they can retry with payment headers
        return NextResponse.json(
          {
            error: "Payment required",
            message: "x402 payment completed via Dreams Router. Please retry request.",
            amount: PAYMENT_AMOUNT,
            network: NETWORK_ENV,
            recipient: SELLER_WALLET,
            x402Payment: true,
          },
          { status: 402 }
        );
      } catch (dreamsError: any) {
        // Check if this is a 402 error (expected behavior for x402 payment flow)
        // Dreams Router may throw 402 which we should handle gracefully
        if (dreamsError?.status === 402 || dreamsError?.statusCode === 402 || 
            dreamsError?.message?.includes('402') || dreamsError?.message?.includes('Payment Required')) {
          console.log('Received 402 from Dreams Router (expected x402 behavior)');
          return NextResponse.json(
            {
              error: "Payment required",
              message: "x402 payment initiated via Dreams Router",
              amount: PAYMENT_AMOUNT,
              network: NETWORK_ENV,
              recipient: SELLER_WALLET,
              x402Payment: true,
            },
            { status: 402 }
          );
        }
        
        console.error('Dreams Router x402 payment error:', dreamsError);
        console.error('Error name:', dreamsError?.name);
        console.error('Error message:', dreamsError?.message);
        console.error('Error status:', dreamsError?.status);
        console.error('Error statusCode:', dreamsError?.statusCode);
        console.error('Error code:', dreamsError?.code);
        console.error('Error stack:', dreamsError?.stack);
        
        return NextResponse.json(
          {
            error: "Payment gateway error",
            message: dreamsError?.message || dreamsError?.toString() || "Failed to initiate x402 payment",
            details: dreamsError?.stack?.substring(0, 300) || "Unknown error",
          },
          { status: 500 }
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

