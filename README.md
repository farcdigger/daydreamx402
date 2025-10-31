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

# Daydreams Router (optional)
DAYDREAMS_API_KEY=your_api_key_here
DAYDREAMS_NETWORK=base  # or base-sepolia for testing
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
  "signature": "0x..."  // Optional: for payment verification
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
  "verifiedAt": "2025-01-30T12:00:00.000Z"
}
```

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

1. **Request Received**: User sends POST /api/pay with wallet and amount
2. **Payment Check**: Middleware verifies payment via x402 facilitator
3. **402 Status**: If payment not found, return 402 Payment Required with facilitator URL
4. **Payment Verified**: x402 facilitator confirms USDC payment on Base
5. **Response**: Return success with transaction hash and payment details

## Daydreams Router Integration

After successful payment, users can optionally access AI services:

```typescript
import { createDreamsRouterAuth } from "@daydreamsai/ai-sdk-provider";
import { privateKeyToAccount } from "viem/accounts";

// Initialize router with payment verification
const { dreamsRouter } = await createDreamsRouterAuth(
  privateKeyToAccount(DISTRIBUTOR_PRIVATE_KEY),
  {
    payments: {
      amount: "0", // Already paid via x402
      network: "base",
    },
  }
);
```

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
