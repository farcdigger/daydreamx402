# Token Presale - Base Network

Token presale payment system with RainbowKit wallet connection and USDC payments on Base network.

## Overview

Users connect their wallet via RainbowKit, pay $5 USDC, and participate in the token presale. Payments are processed on Base mainnet.

## Features

- **RainbowKit Integration**: Professional wallet connection UI supporting multiple wallets
- **Base Network**: USDC payments on Base mainnet
- **Wagmi + Viem**: Type-safe Ethereum interactions
- **Next.js 14**: Modern React framework with App Router

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create `.env.local` file:

```env
# Dreams Router Configuration (required - one of the following)
# Option 1: API Key (recommended - get from https://router.daydreams.systems)
DREAMSROUTER_API_KEY=your_api_key_here

# Option 2: EVM Private Key (alternative)
SELLER_PRIVATE_KEY=0x... # Private key of seller wallet for x402 payments

# Payment Configuration
SELLER_WALLET=0x6a40e304193d2BD3fa7479c35a45bA4CCDBb4683
PAYMENT_AMOUNT=5000000 # $5 USDC (6 decimals)
NETWORK=base # Base network for payments

# Note: Get Dreams Router API key from https://router.daydreams.systems
# Note: No WalletConnect Project ID needed - Using MetaMask only
```

### 3. Run Locally

```bash
npm run dev
```

Visit http://localhost:3000

### 4. Deploy to Vercel

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `DREAMSROUTER_API_KEY` (required - get from https://router.daydreams.systems) **OR**
   - `SELLER_PRIVATE_KEY` (alternative - private key of seller wallet)
   - `SELLER_WALLET` (optional, defaults to provided address)
   - `PAYMENT_AMOUNT` (optional, defaults to 5000000)
   - `NETWORK` (optional, defaults to "base")
3. Deploy automatically

## How It Works (x402 Payment Flow)

1. **User visits site** → RainbowKit wallet selector appears
2. **User connects wallet** → MetaMask (browser extension)
3. **User clicks "Pay $5 USDC"** → Frontend sends request to backend
4. **Backend checks x402 payment** → Returns 402 Payment Required if no payment headers
5. **Backend initiates x402 payment via Dreams Router** → Server-side only:
   - Backend uses `createDreamsRouter.evm()` with seller's private key
   - Makes AI call via `generateText()` with Dreams Router model
   - x402 facilitator automatically processes payment
   - Client receives 402 response
6. **Client completes payment** → Direct USDC transfer (x402 handled backend)
7. **Backend verifies payment** → Payment recorded
8. **Success** → Payment confirmed and registered

**Note:** Dreams SDK runs only server-side (Node.js required). Client-side uses direct USDC transfer when 402 received.

## Tech Stack

- **Next.js 14**: React framework with App Router
- **RainbowKit**: Wallet connection UI
- **Wagmi**: React Hooks for Ethereum
- **Viem**: TypeScript Ethereum library
- **Base Network**: Layer 2 for payments
- **Daydreams Router**: x402 payment protocol integration (server-side only)
  - `@daydreamsai/ai-sdk-provider`: Dreams Router provider for Vercel AI SDK
  - `ai` (Vercel AI SDK): AI model calls with x402 payments
  - `x402`: x402 payment protocol

## Payment Details

- **Amount**: $5 USDC
- **Network**: Base mainnet
- **USDC Contract**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Recipient**: `0x6a40e304193d2BD3fa7479c35a45bA4CCDBb4683`

## API Endpoints

### POST /api/pay

Register a payment transaction.

**Request:**
```json
{
  "wallet": "0x...",
  "amount": "5000000",
  "transactionHash": "0x..."
}
```

**Response:**
```json
{
  "status": "success",
  "wallet": "0x...",
  "paymentAmount": "5000000",
  "paymentAmountUSD": "5.00",
  "paymentRecipient": "0x...",
  "transactionHash": "0x...",
  "timestamp": "..."
}
```

## References

- [RainbowKit Documentation](https://rainbowkit.com/tr/docs/installation)
- [Wagmi Documentation](https://wagmi.sh)
- [Base Network](https://base.org)
