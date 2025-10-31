# PAYX Token Sale - x402 Payment Integration

Pay-per-use token sale system on Base network using x402 payment protocol and Daydreams Router integration.

## Overview

PAYX payment system accepts USDC payments on Base network using x402 payment protocol. The system verifies payments via x402 facilitator and returns payment status.

## Features

- **x402 Payment Protocol**: Standardized micropayment handling with 402 Payment Required status
- **Base Network**: USDC payments settled on Base mainnet (or Sepolia for testing)
- **Payment Verification**: x402 facilitator validates payments
- **Daydreams Router Integration**: Optional AI service access gated by payment verification

## Architecture

```
User → POST /api/pay → x402 Middleware
                      ↓
              Payment Required? (402)
                      ↓
         x402 Facilitator Verification
                      ↓
              Payment Verified (200)
                      ↓
         Daydreams Router Access (optional)
```

## Environment Variables

Create a `.env` file in the project root:

```env
# x402 Configuration
X402_FACILITATOR_URL=https://x402.org/api/v1

# Network
NETWORK=base  # or base-sepolia for testing

# Daydreams Router (required for AI service)
SELLER_PRIVATE_KEY=0x...  # Private key of seller wallet for Daydreams Router auth
PAYMENT_AMOUNT_PER_REQUEST=100000  # $0.10 USDC per AI request (in 6-decimal units)
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
# or
bun install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

- `X402_FACILITATOR_URL`: x402 facilitator API endpoint (default: https://x402.org/api/v1)
- `NETWORK`: Network to use (`base` for mainnet, `base-sepolia` for testing)
- `SELLER_PRIVATE_KEY`: Private key of seller wallet for Daydreams Router authentication
- `PAYMENT_AMOUNT_PER_REQUEST`: Amount per AI request in USDC (6-decimal units, default: 100000 = $0.10)

### 4. Run Locally

```bash
npm run dev
# or
bun run dev
```

### 5. Deploy to Vercel

The project is configured for Vercel deployment:

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

## API Endpoints

### POST /api/pay

Purchase PAYX tokens using USDC via x402 payment protocol.

**Request Body:**
```json
{
  "wallet": "0x...",
  "amount": "1.0",
  "prompt": "What is the capital of France?"  // Optional: AI prompt for Daydreams Router
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Payment verified successfully",
  "transactionHash": "0x...",
  "usdcPaid": "1.0",
  "network": "base",
  "verifiedAt": "2025-01-30T12:00:00.000Z",
  "aiResponse": {
    "text": "The capital of France is Paris.",
    "model": "google-vertex/gemini-2.5-flash"
  }
}
```

Note: `aiResponse` is only included if `prompt` was provided in the request and Daydreams Router is configured.

**Payment Required (402):**
```json
{
  "status": "payment_required",
  "message": "Payment not verified. Please complete payment via x402 facilitator.",
  "facilitatorUrl": "https://x402.org/..."
}
```

**Error Response (400/500):**
```json
{
  "error": "Error message",
  "details": "..."
}
```

## x402 Middleware Flow

1. **Request Received**: User sends POST /api/pay with wallet, amount, and optional prompt
2. **Payment Check**: Middleware verifies payment via x402 facilitator
3. **402 Status**: If payment not found, return 402 Payment Required with facilitator URL
4. **Payment Verified**: x402 facilitator confirms USDC payment on Base
5. **Daydreams Router**: If prompt provided, route AI request through Daydreams Router with x402 payment
6. **Response**: Return success with transaction hash, payment details, and optional AI response

## Daydreams Router Integration

The system automatically routes AI requests through Daydreams Router after payment verification:

**Flow:**
```
Your App → POST /api/pay (with prompt)
            ↓
         x402 Payment Verification
            ↓
         Dreams Router → Provider (Google/OpenAI/etc)
            ↓
         Response with AI answer
```

**Configuration:**
- `SELLER_PRIVATE_KEY`: Wallet private key for Daydreams Router authentication
- `PAYMENT_AMOUNT_PER_REQUEST`: Amount charged per AI request (default: $0.10 USDC)
- Model: `google-vertex/gemini-2.5-flash` (default, configurable)

**Usage:**
Include a `prompt` field in your POST request to receive an AI response after payment verification.

## Payment Verification Logic

- **Payment Required**: Returns 402 status if payment not verified
- **Verification**: Uses x402 facilitator to verify USDC payment on Base network
- **Success**: Returns 200 status with transaction hash when payment verified

## Testing

See `TEST_PLAN.md` for detailed test scenarios including:
- Payment flow without prior payment (402 response)
- Payment verification and token distribution
- Error handling for insufficient balance
- Daydreams Router access after payment

## Network Configuration

- **Production**: Base Mainnet (`network=base`)
- **Testing**: Base Sepolia (`network=base-sepolia`)

Update `BASE_RPC_URL` and `NETWORK` environment variables accordingly.

## Security Considerations

- Private keys stored securely in environment variables (never commit to git)
- Payment verification via x402 facilitator before token distribution
- Transaction signatures validated on-chain
- Rate limiting recommended for production

## References

- [x402 Protocol Documentation](https://x402.org)
- [Daydreams Router Documentation](https://docs.daydreams.systems/docs/router)
- [Base Network Documentation](https://docs.base.org)
