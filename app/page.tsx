'use client';

import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId } from 'wagmi';
import { base } from 'wagmi/chains';
// x402 payment is handled entirely via backend Dreams Router - no direct wallet transfers

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
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
        // x402 Payment Required - Dreams Router initiated payment
        // User's wallet should open automatically for x402 payment
        const data = await response.json();
        setPaymentStatus('x402 payment initiated. Please approve payment in your wallet...');
        
        // Wait a moment for x402 payment to process, then retry
        setTimeout(async () => {
          try {
            setPaymentStatus('Verifying x402 payment...');
            
            const retryResponse = await fetch('/api/pay', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                wallet: address,
                amount: '5000000',
              }),
            });

            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              setPaymentStatus(`✅ Payment successful! ${retryData.message || ''}`);
            } else if (retryResponse.status === 402) {
              // Still processing, wait longer
              setPaymentStatus('Waiting for x402 payment confirmation...');
              setError('Payment is processing. Please wait...');
            } else {
              const errorData = await retryResponse.json();
              const errorMsg = errorData.message || errorData.error || 'Payment verification failed';
              const details = errorData.details ? ` Details: ${errorData.details}` : '';
              throw new Error(`${errorMsg}${details}`);
            }
          } catch (retryErr: any) {
            setError(retryErr.message || 'Payment verification failed');
            setPaymentStatus(null);
          } finally {
            setIsProcessing(false);
          }
        }, 5000); // Wait 5 seconds for x402 payment processing
        
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

