import { NextRequest, NextResponse } from 'next/server';
import { generateX402Payment } from '@daydreamsai/ai-sdk-provider';
import { privateKeyToAccount } from 'viem/accounts';

// Payment config per Quickstart: https://docs.daydreams.systems/docs/router/quickstart
const NETWORK_ENV = process.env.NETWORK || "base";
const PAYMENT_AMOUNT = process.env.PAYMENT_AMOUNT || "5000000"; // $5 USDC (6 decimals)
const SELLER_PRIVATE_KEY = process.env.SELLER_PRIVATE_KEY as `0x${string}`;
const DREAMSROUTER_API_KEY = process.env.DREAMSROUTER_API_KEY;
const ROUTER_API_URL = 'https://router.daydreams.systems/v1/chat/completions';

// Generate x402 payment header per Quickstart guide
// https://docs.daydreams.systems/docs/router/quickstart
async function generatePaymentHeader() {
  if (!SELLER_PRIVATE_KEY) {
    console.error('SELLER_PRIVATE_KEY is required for x402 payments');
    return null;
  }

  try {
    const account = privateKeyToAccount(SELLER_PRIVATE_KEY);
    
    // Generate x402-compliant payment header
    const paymentHeader = await generateX402Payment(account, {
      amount: PAYMENT_AMOUNT, // $5 USDC (6 decimals)
      network: NETWORK_ENV as 'base' | 'base-sepolia',
    });

    console.log('Generated x402 payment header');
    return paymentHeader;
  } catch (error: any) {
    console.error('Failed to generate payment header:', error);
    console.error('Error details:', error?.message, error?.stack);
    return null;
  }
}

// x402 Payment Flow per Quickstart: https://docs.daydreams.systems/docs/router/quickstart
// 1. Generate X-Payment header using generateX402Payment
// 2. Make request to REST API with X-Payment header
// 3. If 402 returned, payment required - client completes payment and retries

export async function POST(req: NextRequest) {
  try {
    // Check if client sent X-Payment header (payment already completed)
    const clientPaymentHeader = req.headers.get('X-Payment') || req.headers.get('x-payment');
    
    if (clientPaymentHeader) {
      console.log('Client provided X-Payment header - verifying payment with Router');
      
      // Make request to Router API with client's payment header
      try {
        const routerResponse = await fetch(ROUTER_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Payment': clientPaymentHeader,
          },
          body: JSON.stringify({
            model: 'google-vertex/gemini-2.5-flash',
            messages: [{ role: 'user', content: 'Token presale payment confirmation' }],
            stream: false,
          }),
        });

        if (routerResponse.ok) {
          const data = await routerResponse.json();
          console.log('Payment verified successfully with Router');
          
          return NextResponse.json({
            status: "success",
            message: "x402 payment verified and recorded successfully",
            x402Payment: true,
            network: NETWORK_ENV,
            amount: PAYMENT_AMOUNT,
            timestamp: new Date().toISOString(),
          });
        } else if (routerResponse.status === 402) {
          // Still 402 - payment not completed yet
          return NextResponse.json(
            {
              error: "Payment required",
              message: "Payment not yet completed. Please complete payment and retry.",
              x402Payment: true,
            },
            { status: 402 }
          );
        } else {
          const errorText = await routerResponse.text();
          throw new Error(`Router API error: ${routerResponse.status} - ${errorText}`);
        }
      } catch (routerError: any) {
        console.error('Router API verification error:', routerError);
        return NextResponse.json(
          {
            error: "Payment verification failed",
            message: routerError?.message || "Failed to verify payment with Router",
          },
          { status: 500 }
        );
      }
    }
    
    // No payment header - generate one and make initial request
    console.log('No X-Payment header - generating payment header and initiating payment');
    
    // Option 1: Use API key if available
    if (DREAMSROUTER_API_KEY) {
      console.log('Using API key auth');
      
      try {
        const routerResponse = await fetch(ROUTER_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DREAMSROUTER_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'google-vertex/gemini-2.5-flash',
            messages: [{ role: 'user', content: 'Token presale payment confirmation' }],
            stream: false,
          }),
        });

        if (routerResponse.ok) {
          const data = await routerResponse.json();
          return NextResponse.json({
            status: "success",
            message: "Payment processed successfully (API key auth)",
            x402Payment: false,
            timestamp: new Date().toISOString(),
          });
        } else if (routerResponse.status === 402) {
          // 402 Payment Required - need x402 payment
          const x402Header = routerResponse.headers.get('x-402-payment');
          
          return NextResponse.json(
            {
              error: "Payment required",
              message: "x402 payment required. Use generateX402PaymentBrowser in client.",
              x402Payment: true,
              network: NETWORK_ENV,
              amount: PAYMENT_AMOUNT,
            },
            { 
              status: 402,
              headers: x402Header ? { 'x-402-payment': x402Header } : {},
            }
          );
        } else {
          const errorText = await routerResponse.text();
          throw new Error(`Router API error: ${routerResponse.status} - ${errorText}`);
        }
      } catch (routerError: any) {
        console.error('Router API error:', routerError);
        return NextResponse.json(
          {
            error: "Router API error",
            message: routerError?.message || "Failed to communicate with Router",
          },
          { status: 500 }
        );
      }
    }
    
    // Option 2: Generate x402 payment header and make request
    if (!SELLER_PRIVATE_KEY) {
      return NextResponse.json(
        { 
          error: "Payment gateway not configured.",
          message: "Missing DREAMSROUTER_API_KEY or SELLER_PRIVATE_KEY. Get API key from https://router.daydreams.systems",
        },
        { status: 500 }
      );
    }

    const paymentHeader = await generatePaymentHeader();
    if (!paymentHeader) {
      return NextResponse.json(
        {
          error: "Failed to generate payment header",
          message: "Could not generate x402 payment header",
        },
        { status: 500 }
      );
    }

    console.log('Making request to Router API with X-Payment header');
    
    // Make request with X-Payment header per Quickstart
    try {
      const routerResponse = await fetch(ROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Payment': paymentHeader, // x402-compliant payment
        },
        body: JSON.stringify({
          model: 'google-vertex/gemini-2.5-flash',
          messages: [{ role: 'user', content: 'Token presale payment confirmation' }],
          stream: false,
        }),
      });

      if (routerResponse.ok) {
        const data = await routerResponse.json();
        console.log('Payment successful via Router API');
        
        return NextResponse.json({
          status: "success",
          message: "x402 payment processed successfully",
          x402Payment: true,
          network: NETWORK_ENV,
          amount: PAYMENT_AMOUNT,
          timestamp: new Date().toISOString(),
        });
      } else if (routerResponse.status === 402) {
        // Still 402 - payment needs to be completed
        const x402Header = routerResponse.headers.get('x-402-payment');
        
        return NextResponse.json(
          {
            error: "Payment required",
            message: "x402 payment required. Complete payment and retry with X-Payment header.",
            x402Payment: true,
            network: NETWORK_ENV,
            amount: PAYMENT_AMOUNT,
          },
          { 
            status: 402,
            headers: x402Header ? { 'x-402-payment': x402Header } : {},
          }
        );
      } else {
        const errorText = await routerResponse.text();
        throw new Error(`Router API error: ${routerResponse.status} - ${errorText}`);
      }
    } catch (routerError: any) {
      console.error('Router API error:', routerError);
      return NextResponse.json(
        {
          error: "Payment gateway error",
          message: routerError?.message || "Failed to process payment via Router API",
          details: routerError?.stack?.substring(0, 300) || "Unknown error",
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
      'Access-Control-Allow-Headers': 'Content-Type, X-Payment, x-payment, Authorization',
    },
  });
}

