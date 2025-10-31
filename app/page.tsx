'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { useState, useEffect } from 'react';
import { erc20Abi } from 'viem';

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`; // Base mainnet USDC
const RECIPIENT_ADDRESS = '0x6a40e304193d2BD3fa7479c35a45bA4CCDBb4683' as `0x${string}`; // Seller wallet
const PAYMENT_AMOUNT = parseUnits('5', 6); // $5 USDC (6 decimals)

export default function Home() {
  const { address, isConnected } = useAccount();
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
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
    setPaymentStatus('Preparing transaction...');

    writeContract(
      {
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [RECIPIENT_ADDRESS, PAYMENT_AMOUNT],
      },
      {
        onError: (err: any) => {
          setError(err.message || 'Transaction failed');
          setPaymentStatus(null);
        },
      }
    );
  };

  // Handle transaction success
  useEffect(() => {
    if (isConfirmed && hash && address) {
      setPaymentStatus('Payment successful! Registering...');
      
      // Register payment with backend
      fetch('/api/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: address,
          amount: '5000000',
          transactionHash: hash,
        }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(await res.text());
          return res.json();
        })
        .then((data) => {
          setPaymentStatus(`Payment successful! Transaction: ${hash}`);
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

