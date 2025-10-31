# PAYX Token Sale - x402 Payment Integration

Pay-per-use token sale system on Base network using x402 payment protocol and Daydreams Router integration.

## Overview

PAYX token sale enables users to purchase PAYX tokens using USDC on Base network. The system uses x402 middleware for payment verification and automatically distributes 20,000 PAYX tokens per 1 USDC paid.

## Features

- **x402 Payment Protocol**: Standardized micropayment handling with 402 Payment Required status
- **Base Network**: USDC payments settled on Base mainnet (or Sepolia for testing)
- **Automatic Token Distribution**: 20,000 PAYX per 1 USDC without claim buttons
- **Daydreams Router Integration**: Optional AI service access gated by payment verification
- **Payment Verification**: x402 facilitator validates payments before token distribution

## Architecture

```
User → POST /pay → x402 Middleware
                      ↓
              Payment Required? (402)
                      ↓
         x402 Facilitator Verification
                      ↓
              Payment Verified
                      ↓
          Token Distribution (20k PAYX/USDC)
                      ↓
         Daydreams Router Access (optional)
```

## Environment Variables

Create a `.env` file in the project root:

```env
# x402 Configuration
X402_FACILITATOR_URL=https://x402.org/api/v1
BASE_RPC_URL=https://mainnet.base.org

# Token Distribution
PAYX_TOKEN_ADDRESS=0x...  # PAYX ERC-20 contract address
DISTRIBUTOR_PRIVATE_KEY=0x...  # Private key for token distribution
TOKENS_PER_USDC=20000  # 20,000 PAYX per 1 USDC

# Daydreams Router (optional)
DAYDREAMS_API_KEY=your_api_key_here
DAYDREAMS_NETWORK=base  # or base-sepolia for testing

# Network
NETWORK=base  # or base-sepolia for testing
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

- `PAYX_TOKEN_ADDRESS`: Your PAYX ERC-20 token contract address on Base
- `DISTRIBUTOR_PRIVATE_KEY`: Private key of wallet that holds PAYX tokens for distribution
- `X402_FACILITATOR_URL`: x402 facilitator API endpoint
- `BASE_RPC_URL`: Base network RPC endpoint

### 3. Deploy Token Contract

Ensure your PAYX token contract is deployed on Base network (or Base Sepolia for testing). The distributor wallet must have sufficient PAYX balance for distribution.

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
  "transactionHash": "0x...",
  "usdcPaid": "1.0",
  "payxReceived": "20000",
  "distributedTxHash": "0x..."
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
3. **402 Status**: If payment not found, return 402 Payment Required
4. **Payment Verified**: x402 facilitator confirms USDC payment on Base
5. **Token Calculation**: Calculate PAYX = amount * 20,000
6. **Token Distribution**: Automatically send PAYX to user wallet
7. **Response**: Return transaction hash and token amount

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

## Token Distribution Logic

- **Rate**: 20,000 PAYX per 1 USDC
- **Automatic**: No claim buttons, distribution happens immediately after payment verification
- **On-chain**: Token transfer executed on Base network
- **Gas**: Paid by distributor wallet

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
