# PAYX Token Sale - Test Plan

Comprehensive test scenarios for x402 payment integration and token distribution.

## Test Environment Setup

### Prerequisites
- Base Sepolia testnet access
- Test USDC on Base Sepolia
- Test PAYX token contract deployed
- x402 facilitator testnet endpoint configured
- Vercel deployment or local server running

### Environment Variables (Test)
```env
NETWORK=base-sepolia
BASE_RPC_URL=https://sepolia.base.org
X402_FACILITATOR_URL=https://testnet.x402.org/api/v1
PAYX_TOKEN_ADDRESS=0x...  # Test token address
DISTRIBUTOR_PRIVATE_KEY=0x...  # Test distributor wallet
TOKENS_PER_USDC=20000
```

## Test Scenarios

### Test Case 1: Payment Required (402 Status)
**Objective**: Verify 402 response when payment not completed

**Steps**:
1. Send POST `/api/pay` with wallet and amount
2. Do NOT complete x402 payment
3. Verify response

**Expected Result**:
```json
Status: 402 Payment Required
Body: {
  "status": "payment_required",
  "message": "Payment not verified. Please complete payment via x402 facilitator.",
  "facilitatorUrl": "...",
  "required": {
    "wallet": "0x...",
    "amount": "1.0",
    "currency": "USDC",
    "network": "base-sepolia"
  }
}
```

**Validation**:
- ✅ Status code is 402
- ✅ Response includes facilitator URL
- ✅ Required payment details are correct
- ✅ No token distribution occurs

---

### Test Case 2: Payment Verification & Token Distribution
**Objective**: Complete payment flow and verify token distribution

**Steps**:
1. Send POST `/api/pay` with wallet and amount (e.g., 1.0 USDC)
2. Complete payment via x402 facilitator
3. Wait for x402 verification
4. Re-send POST `/api/pay` with same parameters
5. Verify token distribution

**Expected Result**:
```json
Status: 200 OK
Body: {
  "status": "success",
  "transactionHash": "0x...",
  "usdcPaid": "1.0",
  "payxReceived": "20000",
  "distributedTxHash": "0x...",
  "network": "base-sepolia"
}
```

**Validation**:
- ✅ Status code is 200
- ✅ Transaction hash for payment is returned
- ✅ PAYX amount is correct (20,000 for 1 USDC)
- ✅ Distribution transaction hash is present
- ✅ Verify on-chain: PAYX tokens in user wallet
- ✅ Verify on-chain: USDC deducted from user wallet

---

### Test Case 3: Invalid Wallet Address
**Objective**: Reject invalid wallet format

**Steps**:
1. Send POST `/api/pay` with invalid wallet address
2. Verify error response

**Expected Result**:
```json
Status: 400 Bad Request
Body: {
  "error": "Invalid wallet address format"
}
```

**Validation**:
- ✅ Status code is 400
- ✅ Error message indicates invalid format
- ✅ No token distribution attempted

---

### Test Case 4: Invalid Amount
**Objective**: Reject invalid or negative amounts

**Steps**:
1. Send POST `/api/pay` with amount = -1
2. Verify error response
3. Repeat with amount = 0
4. Repeat with amount = "invalid"

**Expected Result**:
```json
Status: 400 Bad Request
Body: {
  "error": "Invalid amount. Must be a positive number."
}
```

**Validation**:
- ✅ Status code is 400
- ✅ Error message indicates invalid amount
- ✅ Negative amounts rejected
- ✅ Zero amounts rejected
- ✅ Non-numeric values rejected

---

### Test Case 5: Insufficient Distributor Balance
**Objective**: Handle case when distributor wallet lacks PAYX tokens

**Steps**:
1. Configure distributor wallet with 0 PAYX balance
2. Complete x402 payment (1 USDC)
3. Send POST `/api/pay` with verified payment
4. Verify error handling

**Expected Result**:
```json
Status: 500 Internal Server Error
Body: {
  "error": "Token distribution failed",
  "details": "...",
  "paymentVerified": true
}
```

**Validation**:
- ✅ Payment verification succeeds
- ✅ Distribution fails gracefully
- ✅ Error message indicates distribution issue
- ✅ User payment is not lost (can retry later)

---

### Test Case 6: Multiple Payments - Same Wallet
**Objective**: Allow multiple purchases from same wallet

**Steps**:
1. Complete payment for 1 USDC, verify 20,000 PAYX received
2. Complete payment for 0.5 USDC, verify 10,000 PAYX received
3. Verify total PAYX balance = 30,000

**Expected Result**:
- ✅ Each payment processed independently
- ✅ Token amounts accumulate correctly
- ✅ No duplicate payment errors

---

### Test Case 7: CORS Headers
**Objective**: Verify CORS configuration for web frontend

**Steps**:
1. Send OPTIONS request to `/api/pay`
2. Verify CORS headers

**Expected Result**:
```
Status: 200 OK
Headers:
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: POST, OPTIONS
  Access-Control-Allow-Headers: Content-Type
```

**Validation**:
- ✅ OPTIONS request succeeds
- ✅ CORS headers are present
- ✅ Frontend can make requests from browser

---

### Test Case 8: Network Configuration
**Objective**: Verify correct network (Base vs Base Sepolia)

**Steps**:
1. Set `NETWORK=base-sepolia` in environment
2. Send payment request
3. Verify network in response matches config

**Expected Result**:
- ✅ Response includes correct network identifier
- ✅ x402 facilitator called with correct network parameter
- ✅ Token distribution on correct network

---

### Test Case 9: Rate Calculation Accuracy
**Objective**: Verify 20,000 PAYX per 1 USDC rate

**Test Amounts**:
- 1 USDC → 20,000 PAYX
- 0.1 USDC → 2,000 PAYX
- 0.01 USDC → 200 PAYX
- 10 USDC → 200,000 PAYX

**Validation**:
- ✅ All calculations are accurate
- ✅ Decimal handling correct
- ✅ Large amounts handled (if applicable)

---

### Test Case 10: Transaction Replay Protection
**Objective**: Prevent duplicate token distribution for same payment

**Steps**:
1. Complete payment for 1 USDC
2. Send POST `/api/pay` with verified payment → receive 20,000 PAYX
3. Immediately send same POST again
4. Verify behavior

**Expected Result** (Option A - Allow replay):
- ✅ Second request also distributes tokens (if x402 allows)

**Expected Result** (Option B - Prevent duplicate):
- ✅ Second request returns error or skips distribution

**Note**: Implementation depends on x402 facilitator behavior. Document chosen approach.

---

## Integration Tests

### Integration Test 1: End-to-End Payment Flow
**Objective**: Complete flow from payment initiation to token receipt

**Steps**:
1. User initiates payment via frontend
2. Frontend calls POST `/api/pay`
3. Receive 402 response with facilitator URL
4. User completes payment via x402 facilitator
5. Frontend polls or webhooks confirm payment
6. Frontend re-calls POST `/api/pay`
7. Receive success response
8. Verify tokens in user wallet (on-chain check)

**Validation**:
- ✅ All steps complete successfully
- ✅ User receives correct token amount
- ✅ Transaction hashes are valid
- ✅ Total time < 60 seconds

---

### Integration Test 2: Daydreams Router Access
**Objective**: Verify AI service access after payment

**Steps**:
1. Complete payment and token distribution
2. Initialize Daydreams Router with payment verification
3. Make AI request
4. Verify access granted

**Expected Result**:
- ✅ Router accepts request
- ✅ AI service responds
- ✅ Payment verification passed

**Note**: This requires Daydreams Router API key and test setup.

---

## Performance Tests

### Performance Test 1: Concurrent Requests
**Objective**: Handle multiple simultaneous payment requests

**Steps**:
1. Send 10 concurrent POST `/api/pay` requests
2. Measure response times
3. Verify all handled correctly

**Target**:
- ✅ All requests respond within 5 seconds
- ✅ No race conditions in token distribution
- ✅ No duplicate distributions

---

### Performance Test 2: Large Amount Handling
**Objective**: Process large USDC amounts correctly

**Steps**:
1. Test with 100 USDC (2,000,000 PAYX)
2. Verify calculation accuracy
3. Verify gas costs reasonable

**Validation**:
- ✅ Calculation correct
- ✅ Transaction succeeds
- ✅ Gas cost acceptable

---

## Security Tests

### Security Test 1: Signature Validation
**Objective**: Verify payment signatures (if implemented)

**Steps**:
1. Send request with invalid signature
2. Verify rejection

**Expected Result**:
- ✅ Invalid signatures rejected
- ✅ Valid signatures accepted

---

### Security Test 2: Private Key Exposure
**Objective**: Ensure private keys never logged or exposed

**Steps**:
1. Review server logs
2. Review error messages
3. Check response bodies

**Validation**:
- ✅ No private keys in logs
- ✅ No private keys in error messages
- ✅ No private keys in responses

---

## Test Checklist

- [ ] Test Case 1: 402 Payment Required
- [ ] Test Case 2: Payment Verification & Distribution
- [ ] Test Case 3: Invalid Wallet
- [ ] Test Case 4: Invalid Amount
- [ ] Test Case 5: Insufficient Balance
- [ ] Test Case 6: Multiple Payments
- [ ] Test Case 7: CORS Headers
- [ ] Test Case 8: Network Configuration
- [ ] Test Case 9: Rate Calculation
- [ ] Test Case 10: Replay Protection
- [ ] Integration Test 1: End-to-End Flow
- [ ] Integration Test 2: Daydreams Router
- [ ] Performance Test 1: Concurrent Requests
- [ ] Performance Test 2: Large Amounts
- [ ] Security Test 1: Signature Validation
- [ ] Security Test 2: Private Key Exposure

---

## Test Environment URLs

**Local Development:**
- API: http://localhost:3000/api/pay

**Vercel Deployment:**
- API: https://[project-name].vercel.app/api/pay

**Base Sepolia Explorer:**
- https://sepolia.basescan.org

**Base Mainnet Explorer:**
- https://basescan.org

---

## Reporting

For each test:
1. Document actual results
2. Note any deviations from expected
3. Log transaction hashes for on-chain verification
4. Screenshot responses when applicable

