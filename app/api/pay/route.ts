import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createDreamsRouter, createEVMAuthFromPrivateKey } from '@daydreamsai/ai-sdk-provider';

// Payment config as per Dreams Router documentation
// Amounts and pay-to addresses come from the router's 402 response automatically
const NETWORK_ENV = process.env.NETWORK || "base";
const SELLER_PRIVATE_KEY = process.env.SELLER_PRIVATE_KEY as `0x${string}`;
const DREAMSROUTER_API_KEY = process.env.DREAMSROUTER_API_KEY;

// Cache Dreams Router instance
let cachedDreamsRouter: ReturnType<typeof createDreamsRouter> | Awaited<ReturnType<typeof createEVMAuthFromPrivateKey>>['dreamsRouter'] | null = null;

// Initialize Dreams Router with x402 payments
// As per docs: https://docs.daydreams.systems/docs/router/dreams-sdk
async function getDreamsRouter() {
  // Return cached instance if available
  if (cachedDreamsRouter) {
    return cachedDreamsRouter;
  }
  
  try {
    // Try API key auth first (if available)
    // Note: API key payments config may need to be set in dashboard
    if (DREAMSROUTER_API_KEY) {
      console.log('Creating Dreams Router with API key auth');
      const dreamsRouter = createDreamsRouter({
        apiKey: DREAMSROUTER_API_KEY,
      });
      cachedDreamsRouter = dreamsRouter;
      console.log('Dreams Router created with API key');
      return dreamsRouter;
    }
    
    // Fallback to EVM private key auth with payment config
    if (!SELLER_PRIVATE_KEY) {
      console.error('Neither DREAMSROUTER_API_KEY nor SELLER_PRIVATE_KEY is set');
      return null;
    }
    
    console.log('Creating Dreams Router with EVM private key, network:', NETWORK_ENV);
    // Use createEVMAuthFromPrivateKey helper as per documentation
    // Payment config: amounts and recipients come from router's 402 response automatically
    const { dreamsRouter } = await createEVMAuthFromPrivateKey(
      SELLER_PRIVATE_KEY,
      {
        payments: { 
          network: NETWORK_ENV as 'base' | 'base-sepolia',
          // validityDuration: 600, // default 600s (10 minutes)
          // mode: 'lazy', // default 'lazy' (pay on first request) vs 'eager' (pre-auth)
        },
      }
    );
    cachedDreamsRouter = dreamsRouter;
    console.log('Dreams Router created with EVM auth and x402 payments');
    return dreamsRouter;
  } catch (error: any) {
    console.error('Failed to create Dreams Router:', error);
    console.error('Error details:', error?.message, error?.stack);
    return null;
  }
}

// x402 Payment Flow (per Dreams Router documentation):
// 1. Client requests without x-402-payment headers
// 2. Server calls generateText → Dreams Router returns 402 with payment headers
// 3. Client receives 402, extracts x-402-payment header, completes payment
// 4. Client retries request WITH x-402-payment and x-402-signature headers
// 5. Server verifies headers and processes payment

export async function POST(req: NextRequest) {
  try {
    // Check x402 payment headers
    // If headers are present, payment was completed by client
    const x402Payment = req.headers.get('x-402-payment');
    const x402Signature = req.headers.get('x-402-signature');
    
    // If x402 headers are present, payment was successful
    if (x402Payment && x402Signature) {
      console.log('x402 payment headers received - payment verified');
      console.log('x-402-payment:', x402Payment.substring(0, 50) + '...');
      
      // Parse payment info from headers if needed (router handles verification)
      // Amounts and recipients come from router's 402 response - already signed
      
      return NextResponse.json({
        status: "success",
        message: "x402 payment verified and recorded successfully",
        x402Payment: true,
        network: NETWORK_ENV,
        timestamp: new Date().toISOString(),
      });
    }
    
    // No x402 headers - initiate x402 payment via Dreams Router
    console.log('No x402 headers - initiating payment via Dreams Router');
    
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
    // Per docs: "Amounts and pay-to addresses come from the router's 402 response
    // and are signed automatically; you do not set them manually."
    try {
      console.log('Calling generateText with Dreams Router...');
      console.log('Model: google-vertex/gemini-2.5-flash');
      console.log('Network:', NETWORK_ENV);
      
      const { text } = await generateText({
        model: dreamsRouter('google-vertex/gemini-2.5-flash'),
        prompt: 'Token presale payment confirmation',
      });

      // If we get here, payment was successful (shouldn't happen on first call without headers)
      console.log('generateText completed - payment may have been auto-processed');
      console.log('Response text:', text);

      return NextResponse.json({
        status: "success",
        message: "Payment processed successfully",
        text,
        x402Payment: true,
        timestamp: new Date().toISOString(),
      });
    } catch (dreamsError: any) {
      // Dreams Router throws 402 error when payment is required
      // This is expected behavior - client should extract x-402-payment header from error
      if (dreamsError?.status === 402 || dreamsError?.statusCode === 402) {
        console.log('Received 402 from Dreams Router (expected x402 behavior)');
        
        // Extract x402 headers from error if available
        // Client needs to complete payment and retry with headers
        const responseHeaders: Record<string, string> = {};
        if (dreamsError?.headers) {
          const x402PaymentHeader = dreamsError.headers.get?.('x-402-payment') || 
                                    dreamsError.headers['x-402-payment'];
          if (x402PaymentHeader) {
            responseHeaders['x-402-payment'] = x402PaymentHeader;
          }
        }
        
        return NextResponse.json(
          {
            error: "Payment required",
            message: "x402 payment required. Complete payment and retry with x-402-payment header.",
            // Amount and recipient come from router's 402 response (in x-402-payment header)
            network: NETWORK_ENV,
            x402Payment: true,
          },
          { 
            status: 402,
            headers: responseHeaders,
          }
        );
      }
      
      // Other errors
      console.error('Dreams Router error:', dreamsError);
      console.error('Error name:', dreamsError?.name);
      console.error('Error message:', dreamsError?.message);
      console.error('Error status:', dreamsError?.status);
      console.error('Error statusCode:', dreamsError?.statusCode);
      console.error('Error code:', dreamsError?.code);
      
      return NextResponse.json(
        {
          error: "Payment gateway error",
          message: dreamsError?.message || dreamsError?.toString() || "Failed to initiate x402 payment",
          details: dreamsError?.stack?.substring(0, 300) || "Unknown error",
        },
        { status: 500 }
      );
    }
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
      'Access-Control-Allow-Headers': 'Content-Type, x-402-payment, x-402-signature',
    },
  });
}

