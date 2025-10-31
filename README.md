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
# WalletConnect Project ID (required)
# Get from https://cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# x402 Payment Configuration (required)
SELLER_PRIVATE_KEY=0x... # Private key of seller wallet for x402 payments
SELLER_WALLET=0x6a40e304193d2BD3fa7479c35a45bA4CCDBb4683
PAYMENT_AMOUNT=5000000 # $5 USDC (6 decimals)
NETWORK=base # Base network for payments

# OpenAI API Key (optional, for x402 payment via Daydreams Router)
# If not provided, system will use direct USDC transfer as fallback
NEXT_PUBLIC_OPENAI_API_KEY=sk-... # Optional: For x402 payment flow via Dreams Router
```

### 3. Get WalletConnect Project ID

1. Visit https://cloud.walletconnect.com
2. Create a free account
3. Create a new project
4. Copy your Project ID
5. Add to `.env.local` as `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

### 4. Run Locally

```bash
npm run dev
```

Visit http://localhost:3000

### 5. Deploy to Vercel

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` (required)
   - `SELLER_PRIVATE_KEY` (required for x402 payments)
   - `SELLER_WALLET` (optional, defaults to provided address)
   - `PAYMENT_AMOUNT` (optional, defaults to 5000000)
   - `NETWORK` (optional, defaults to "base")
   - `NEXT_PUBLIC_OPENAI_API_KEY` (optional, for x402 payment via Daydreams Router)
3. Deploy automatically

## How It Works (x402 Payment Flow)

1. **User visits site** → RainbowKit wallet selector appears
2. **User connects wallet** → MetaMask, WalletConnect, Coinbase Wallet, etc.
3. **User clicks "Pay $5 USDC"** → Frontend sends request to backend
4. **Backend checks x402 payment** → Returns 402 Payment Required if no payment headers
5. **Client-side x402 payment** → Daydreams Router with user's wallet creates x402 payment:
   - Creates `createDreamsRouterAuth` with user's wallet account
   - Makes AI call via `createDreams` to trigger x402 payment flow
   - x402 facilitator processes payment automatically
6. **Backend verifies payment** → x402 headers verified, payment recorded
7. **Success** → Payment confirmed and registered

**Note:** If `NEXT_PUBLIC_OPENAI_API_KEY` is not set, the system falls back to direct USDC transfer.

## Tech Stack

- **Next.js 14**: React framework with App Router
- **RainbowKit**: Wallet connection UI
- **Wagmi**: React Hooks for Ethereum
- **Viem**: TypeScript Ethereum library
- **Base Network**: Layer 2 for payments
- **Daydreams Router**: x402 payment protocol integration
  - `@daydreamsai/core`: Core Dreams Router SDK
  - `@daydreamsai/ai-sdk-provider`: AI SDK provider for x402 payments

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
