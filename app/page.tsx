'use client';

import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt, useWalletClient } from 'wagmi';
import { parseUnits } from 'viem';
import { erc20Abi } from 'viem';
import { base } from 'wagmi/chains';
import { createDreams } from '@daydreamsai/core';
import { createDreamsRouterAuth } from '@daydreamsai/core';
import { createOpenAI } from '@daydreamsai/ai-sdk-provider';

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`; // Base mainnet USDC
const RECIPIENT_ADDRESS = '0x6a40e304193d2BD3fa7479c35a45bA4CCDBb4683' as `0x${string}`; // Seller wallet
const PAYMENT_AMOUNT = parseUnits('5', 6); // $5 USDC (6 decimals)

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [x402Headers, setX402Headers] = useState<{ payment?: string; signature?: string } | null>(null);
  
  const { 
    writeContract, 
    data: hash, 
    isPending, 
    error: writeError 
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({
      hash,
    });

  const handlePayment = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    setError(null);
    setPaymentStatus('Preparing payment...');

    if (chainId !== base.id) {
      setError('Please switch to Base network');
      setPaymentStatus(null);
      return;
    }

    try {
      // Step 1: Try to register payment (will get 402 if payment required)
      const response = await fetch('/api/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: address,
          amount: '5000000',
        }),
      });

      // If 402 Payment Required, user needs to complete x402 payment via Daydreams Router
      if (response.status === 402) {
        setPaymentStatus('Payment required. Initiating x402 payment via Daydreams Router...');
        
        if (!walletClient || !address) {
          setError('Wallet client not available');
          setPaymentStatus(null);
          return;
        }

        try {
          // Create Dreams Router Auth with user's wallet for x402 payment
          const account = {
            address: address as `0x${string}`,
            signMessage: async (message: string) => {
              const signature = await walletClient.signMessage({
                account: address as `0x${string}`,
                message,
              });
              return signature;
            },
            signTypedData: async (params: any) => {
              const signature = await walletClient.signTypedData({
                account: address as `0x${string}`,
                ...params,
              });
              return signature;
            },
          } as any;

          const dreamsAuth = createDreamsRouterAuth({
            account,
            payments: {
              amount: PAYMENT_AMOUNT,
              network: 'base',
            },
          });

          // For x402 payment, we need to make an AI call through Dreams Router
          // This will automatically trigger the x402 payment flow via facilitator
          setPaymentStatus('Initiating x402 payment via Daydreams Router...');
          
          try {
            // Check if OpenAI API key is available (optional for x402 flow)
            const openaiApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
            
            if (openaiApiKey) {
              // Create Dreams instance with x402 payment enabled
              const openai = createOpenAI({
                apiKey: openaiApiKey,
              });

              const dreams = createDreams({
                auth: dreamsAuth,
                model: openai('gpt-4o-mini'), // Minimal model for x402 payment trigger
              });

              // Make a minimal AI call to trigger x402 payment
              // This will automatically initiate the x402 payment flow via facilitator
              setPaymentStatus('Processing x402 payment...');
              
              const result = await dreams.agent.complete('Token presale payment');
              
              // x402 payment is handled automatically by Dreams Router
              // The payment transaction will be processed via x402 facilitator
              setPaymentStatus('x402 payment processed via Daydreams Router!');
              
              // After successful payment, retry the API call with x402 headers
              // Note: In production, x402 headers would be captured from the payment response
              setPaymentStatus('Payment successful! Verifying...');
              
              // Retry the payment registration
              const retryResponse = await fetch('/api/pay', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  // x402 headers would be included here in production
                },
                body: JSON.stringify({
                  wallet: address,
                  amount: '5000000',
                }),
              });
              
              if (retryResponse.ok) {
                const retryData = await retryResponse.json();
                setPaymentStatus(`Payment verified! ${retryData.message || ''}`);
              } else if (retryResponse.status === 402) {
                // Still 402, payment wasn't captured properly
                throw new Error('x402 payment verification failed');
              }
            } else {
              // No OpenAI API key - use direct x402 payment flow via facilitator
              // For token presale, we'll use direct USDC transfer as x402 facilitator alternative
              throw new Error('OpenAI API key not configured. Using direct payment method.');
            }
            
          } catch (dreamsError: any) {
            console.error('Dreams Router x402 payment error:', dreamsError);
            // If Dreams Router payment fails, fallback to direct transfer
            setPaymentStatus('Using direct USDC transfer...');
            writeContract({
              address: USDC_ADDRESS,
              abi: erc20Abi as readonly any[],
              functionName: 'transfer',
              args: [RECIPIENT_ADDRESS, PAYMENT_AMOUNT],
            } as any);
            return;
          }
        } catch (x402Error: any) {
          console.error('x402 payment setup error:', x402Error);
          setError(`x402 payment error: ${x402Error.message}`);
          setPaymentStatus(null);
        }
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment failed');
      }

      const data = await response.json();
      setPaymentStatus(`Payment successful! ${data.message || ''}`);
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      setPaymentStatus(null);
    }
  };

  // Handle transaction success - register with backend (with x402 headers if needed)
  useEffect(() => {
    if (isConfirmed && hash && address) {
      setPaymentStatus('Payment successful! Registering...');
      
      // Register payment with backend (with x402 headers after payment)
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add x402 headers if available from previous payment
      if (x402Headers?.payment && x402Headers?.signature) {
        headers['x-402-payment'] = x402Headers.payment;
        headers['x-402-signature'] = x402Headers.signature;
      }
      
      fetch('/api/pay', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          wallet: address,
          amount: '5000000',
          transactionHash: hash,
        }),
      })
        .then(async (res) => {
          if (res.status === 402) {
            // If still 402, payment wasn't verified via x402
            throw new Error('Payment verification failed. Please retry.');
          }
          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || 'Registration failed');
          }
          return res.json();
        })
        .then((data) => {
          setPaymentStatus(`Payment verified and recorded! Transaction: ${hash}`);
        })
        .catch((err) => {
          setError(err.message);
          setPaymentStatus(null);
        });
    }
  }, [isConfirmed, hash, address]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>💰 Token Presale</h1>
        <p style={styles.subtitle}>
          Pay $5 USDC to participate in token presale • Base Network
        </p>

        <div style={styles.walletSection}>
          <ConnectButton />
        </div>

        {isConnected && (
          <>
            <div style={styles.paymentSection}>
              <div style={styles.amount}>$5.00 USDC</div>
              <button
                style={{
                  ...styles.button,
                  ...(isPending || isConfirming ? styles.buttonDisabled : {}),
                }}
                onClick={handlePayment}
                disabled={isPending || isConfirming}
              >
                {isPending
                  ? 'Confirm in wallet...'
                  : isConfirming
                  ? 'Processing...'
                  : 'Pay $5 USDC'}
              </button>
            </div>

            {paymentStatus && (
              <div style={styles.success}>
                {paymentStatus}
                {hash && (
                  <a
                    href={`https://basescan.org/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.link}
                  >
                    View on Basescan
                  </a>
                )}
              </div>
            )}

            {error && <div style={styles.error}>{error}</div>}
            {writeError && (
              <div style={styles.error}>
                Transaction error: {writeError.message}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  card: {
    background: 'white',
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    padding: '40px',
    maxWidth: '600px',
    width: '100%',
  },
  title: {
    color: '#333',
    marginBottom: '10px',
    fontSize: '28px',
  },
  subtitle: {
    color: '#666',
    marginBottom: '30px',
    fontSize: '14px',
  },
  walletSection: {
    marginBottom: '30px',
  },
  paymentSection: {
    marginBottom: '30px',
  },
  amount: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#667eea',
    textAlign: 'center',
    margin: '20px 0',
  },
  button: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '14px 28px',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    transition: 'transform 0.2s',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  success: {
    background: '#d4edda',
    color: '#155724',
    padding: '15px',
    borderRadius: '10px',
    marginTop: '20px',
    textAlign: 'center',
  },
  error: {
    background: '#fee',
    color: '#c33',
    padding: '15px',
    borderRadius: '10px',
    marginTop: '20px',
  },
  link: {
    display: 'block',
    marginTop: '10px',
    color: '#667eea',
    textDecoration: 'underline',
  },
};

