## x402 Nanoservice (Base mainnet) – $5 / $10 / $100 payments

This nanoservice exposes HTTP endpoints to charge fixed amounts ($5, $10, $100) on Base mainnet via x402 using Dreams SDK. It authenticates with a wallet private key and triggers a minimal AI request to execute the payment.

### Prerequisites

- Bun installed
- A deploy wallet private key with funds on Base mainnet

### Environment

Create a `.env` file with:

```
PRIVATE_KEY=0xYOUR_PRIVATE_KEY
PORT=3000
```

### Install & Run

```
bun install
bun run src/server.ts
```

The server listens on `PORT` (default 3000). Health:

```
GET /health
```

### Payments

All endpoints trigger a one-time charge by issuing a minimal model request. Network is `base-mainnet`.

```
POST /pay/5
POST /pay/10
POST /pay/100
```

Response (example):

```json
{
  "status": "charged",
  "amountUsd": 5,
  "amountUnits": "5000000",
  "network": "base-mainnet",
  "userBalance": "...",
  "modelReply": "..."
}
```

### Reference

- Building a Nanoservice Agent (Dreams docs): `https://docs.dreams.fun/docs/tutorials/x402/nanoservice#step-1-set-up-authentication`


