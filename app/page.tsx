'use client';

import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId, useSignTypedData } from 'wagmi';
import { base } from 'wagmi/chains';
import { generateX402PaymentBrowser } from '@daydreamsai/ai-sdk-provider';
// x402 payment per Quickstart: https://docs.daydreams.systems/docs/router/quickstart

const PAYMENT_AMOUNT = '5000000'; // $5 USDC (6 decimals)
const NETWORK = 'base'; // Base network

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { signTypedDataAsync } = useSignTypedData();
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    setError(null);
    setPaymentStatus('Initiating x402 payment via Dreams Router...');
    setIsProcessing(true);

    if (chainId !== base.id) {
      setError('Please switch to Base network');
      setPaymentStatus(null);
      setIsProcessing(false);
      return;
    }

    try {
      // Request x402 payment from backend (Dreams Router handles payment)
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

      if (response.status === 402) {
        // x402 Payment Required - generate payment header and retry
        const data = await response.json();
        setPaymentStatus('x402 payment required. Generating payment header...');
        
        try {
          // Generate x402 payment header per Quickstart
          // https://docs.daydreams.systems/docs/router/quickstart
          if (!address || !signTypedDataAsync) {
            throw new Error('Wallet not connected or signing not available');
          }

          setPaymentStatus('Signing payment request in wallet...');
          
          const paymentHeader = await generateX402PaymentBrowser(
            address,
            signTypedDataAsync,
            { 
              amount: PAYMENT_AMOUNT, 
              network: NETWORK as 'base' | 'base-sepolia'
            }
          );

          console.log('Generated x402 payment header, retrying with X-Payment header');
          setPaymentStatus('Payment header generated. Completing payment...');

          // Retry request with X-Payment header
          const retryResponse = await fetch('/api/pay', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Payment': paymentHeader, // x402 payment header
            },
            body: JSON.stringify({
              wallet: address,
              amount: PAYMENT_AMOUNT,
            }),
          });

          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            setPaymentStatus(`✅ Payment successful! ${retryData.message || ''}`);
            setIsProcessing(false);
          } else if (retryResponse.status === 402) {
            // Still 402 - payment not completed
            const errorData = await retryResponse.json();
            setPaymentStatus('Payment not yet completed. Please try again.');
            setError(errorData.message || 'Payment is still processing');
            setIsProcessing(false);
          } else {
            const errorData = await retryResponse.json();
            const errorMsg = errorData.message || errorData.error || 'Payment verification failed';
            const details = errorData.details ? ` Details: ${errorData.details}` : '';
            throw new Error(`${errorMsg}${details}`);
          }
        } catch (paymentErr: any) {
          console.error('x402 payment generation error:', paymentErr);
          setError(paymentErr.message || 'Failed to generate x402 payment. Please try again.');
          setPaymentStatus(null);
          setIsProcessing(false);
        }
        
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        const errorMsg = errorData.message || errorData.error || 'Payment request failed';
        const details = errorData.details ? ` Details: ${errorData.details}` : '';
        throw new Error(`${errorMsg}${details}`);
      }

      // Payment successful
      const data = await response.json();
      setPaymentStatus(`✅ Payment successful! ${data.message || ''}`);
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      setPaymentStatus(null);
    } finally {
      setIsProcessing(false);
    }
  };

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
                  ...(isProcessing ? styles.buttonDisabled : {}),
                }}
                onClick={handlePayment}
                disabled={isProcessing}
              >
                {isProcessing
                  ? 'Processing x402 payment...'
                  : 'Pay $5 USDC (x402)'}
              </button>
            </div>

            {paymentStatus && (
              <div style={styles.success}>
                {paymentStatus}
              </div>
            )}

            {error && <div style={styles.error}>{error}</div>}
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

