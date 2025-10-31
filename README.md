# Token Presale API - Hono Backend

x402 payment API for token presale using Dreams Router, built with Hono.

## Overview

Backend API for processing x402 payments via Dreams Router on Base network. Returns 402 Payment Required when payment is needed, verifies payments when X-Payment header is provided.

## Features

- **Hono Framework**: Fast, lightweight web framework
- **x402 Payments**: USDC micropayments via Dreams Router
- **Base Network**: Payments processed on Base mainnet
- **Vercel Serverless**: Deploy to Vercel as serverless function

## Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Environment Variables

Create `.env` file:

```env
# Dreams Router Configuration (required - one of the following)
# Option 1: API Key (recommended - get from https://router.daydreams.systems)
DREAMSROUTER_API_KEY=your_api_key_here

# Option 2: EVM Private Key (alternative)
SELLER_PRIVATE_KEY=0x... # Private key of seller wallet for x402 payments

# Payment Configuration
PAYMENT_AMOUNT=5000000 # $5 USDC (6 decimals)
NETWORK=base # Base network for payments (base or base-sepolia)

# Optional
ROUTER_API_URL=https://router.daydreams.systems/v1/chat/completions
PORT=3000
```

### 3. Run Locally

```bash
bun run dev
```

Server will start on http://localhost:3000

### 4. Deploy to Vercel

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `DREAMSROUTER_API_KEY` (required - get from https://router.daydreams.systems) **OR**
   - `SELLER_PRIVATE_KEY` (required for x402 payments - private key of seller wallet)
   - `PAYMENT_AMOUNT` (optional, defaults to 5000000 for $5 USDC)
   - `NETWORK` (optional, defaults to "base" - use "base" for mainnet or "base-sepolia" for testnet)
3. Deploy automatically

## API Endpoints

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "network": "base"
}
```

### POST /pay

x402 payment endpoint per [Quickstart](https://docs.daydreams.systems/docs/router/quickstart).

**Request Headers (Optional):**
- `X-Payment`: x402 payment header (if payment already completed)

**Request Body (Optional):**
```json
{
  "wallet": "0x...",
  "amount": "5000000"
}
```

**Response 402 (Payment Required):**
```json
{
  "error": "Payment required",
  "message": "x402 payment required. Complete payment and retry with X-Payment header.",
  "x402Payment": true,
  "network": "base",
  "amount": "5000000"
}
```

**Response 200 (Success):**
```json
{
  "status": "success",
  "message": "x402 payment verified and recorded successfully",
  "x402Payment": true,
  "network": "base",
  "amount": "5000000",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## How It Works (x402 Payment Flow)

1. **Client requests payment** → `POST /pay` without X-Payment header
2. **Server checks payment** → If no header, generates x402 payment header or uses API key
3. **Server calls Router API** → `https://router.daydreams.systems/v1/chat/completions`
4. **Router returns 402** → Server returns 402 to client
5. **Client generates payment** → Uses `generateX402PaymentBrowser` (Quickstart guide)
6. **Client retries with header** → `POST /pay` with `X-Payment` header
7. **Server verifies** → Calls Router API with X-Payment header
8. **Success** → Payment verified and recorded

## Technology Stack

- **Hono**: Web framework
- **@daydreamsai/ai-sdk-provider**: x402 payment generation
- **viem**: Ethereum library for account management
- **Bun**: Runtime (or Node.js via Vercel)

## API Documentation

See [Dreams Router Quickstart](https://docs.daydreams.systems/docs/router/quickstart) for x402 payment details.

## License

MIT