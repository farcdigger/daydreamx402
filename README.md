# Daydreams Router + x402 Payment Integration

Pay-per-use AI service using Daydreams Router with x402 USDC micropayments on Base network.

Based on: [Daydreams Router Documentation](https://docs.daydreams.systems/docs/router)

## Overview

This project demonstrates a complete AI service that uses x402 micropayments through the Daydreams Router. Each AI request triggers an automatic payment of $0.10 USDC.

**Architecture:**
```
Your App → POST /api/pay → Daydreams Router → Provider (Google/OpenAI/etc)
                                ↓
                         x402 Payment ($0.10 USDC)
                                ↓
                         AI Response
```

## Features

- **x402 Micropayments**: Automatic USDC payment per AI request
- **Daydreams Router**: Unified interface for multiple AI providers
- **Base Network**: Payments settled on Base (mainnet or Sepolia)
- **Zero Configuration**: Simple POST request to get AI responses

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create `.env` file:

```env
SELLER_PRIVATE_KEY=0x...  # Private key of wallet for Daydreams Router auth
PAYMENT_AMOUNT=100000     # $0.10 USDC per request (6-decimal units)
NETWORK=base-sepolia      # base-sepolia (test) or base (mainnet)
```

### 3. Deploy to Vercel

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically

## API Usage

### POST /api/pay

Send a prompt and receive an AI response. Payment is handled automatically via x402.

**Request:**
```bash
curl -X POST https://your-project.vercel.app/api/pay \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is the capital of France?"}'
```

**Response:**
```json
{
  "status": "success",
  "response": "The capital of France is Paris.",
  "model": "google-vertex/gemini-2.5-flash",
  "network": "base-sepolia",
  "paymentAmount": "100000",
  "userBalance": "..."
}
```

## How It Works

Based on the [Daydreams Router documentation](https://docs.daydreams.systems/docs/router):

1. **Initialize Router**: `createDreamsRouterAuth` sets up authentication with x402 payments
2. **Create Agent**: `createDreams` with `dreamsRouter("model-name")` creates the AI agent
3. **Execute Request**: `agent.complete(prompt)` triggers:
   - x402 payment (automatically deducted)
   - AI model call via Daydreams Router
   - Standardized response

## Configuration

### Payment Amount

Set `PAYMENT_AMOUNT` in 6-decimal USDC units:
- `100000` = $0.10 USDC
- `1000000` = $1.00 USDC
- `500000` = $0.50 USDC

### Network

- `base-sepolia`: Base Sepolia testnet (for testing)
- `base`: Base mainnet (for production)

### Model

Default model: `google-vertex/gemini-2.5-flash`

You can change the model in `api/pay.ts`:
```typescript
model: dreamsRouter("openai/gpt-4")  // Example: OpenAI GPT-4
```

## References

- [Daydreams Router Documentation](https://docs.daydreams.systems/docs/router)
- [x402 Payment Protocol](https://x402.org)
- [Base Network](https://base.org)

