import React, { useState, useEffect } from 'react';

interface LoginScreenProps {
  onUnlock: () => void;
}

export function LoginScreen({ onUnlock }: LoginScreenProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isFirstTime, setIsFirstTime] = useState(false);

  const SAVED_PIN_KEY = 'unlockd_pin_hash';

  useEffect(() => {
    const savedHash = localStorage.getItem(SAVED_PIN_KEY);
    setIsFirstTime(!savedHash);
  }, []);

  const hashPin = async (inputPin: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(inputPin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const handleSetPin = async () => {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }
    const pinHash = await hashPin(pin);
    localStorage.setItem(SAVED_PIN_KEY, pinHash);
    setIsFirstTime(false);
    onUnlock();
  };

  const handleLogin = async () => {
    const savedHash = localStorage.getItem(SAVED_PIN_KEY);
    const inputHash = await hashPin(pin);

    if (inputHash === savedHash) {
      setError('');
      onUnlock();
    } else {
      setError('Incorrect PIN');
      setPin('');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0b0f19 0%, #1e293b 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ 
        textAlign: 'center', 
        maxWidth: '380px',
        padding: '40px 30px',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderRadius: '16px',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.7)'
      }}>
        <h1 style={{ 
          fontSize: '32px', 
          marginBottom: '8px',
          background: 'linear-gradient(90deg, #10b981, #3b82f6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 'bold'
        }}>
          Unlock'D
        </h1>
        <p style={{ color: '#94a3b8', marginBottom: '32px', fontSize: '15px' }}>
          {isFirstTime ? 'Create a secure 4-digit PIN' : 'Enter your PIN to access the ledger'}
        </p>

        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          maxLength={6}
          placeholder="••••"
          style={{
            width: '100%',
            padding: '18px',
            fontSize: '28px',
            textAlign: 'center',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '12px',
            color: 'white',
            marginBottom: '20px',
            letterSpacing: '8px',
            boxSizing: 'border-box'
          }}
        />

        {error && <p style={{ color: '#ef4444', marginBottom: '20px', fontSize: '14px' }}>{error}</p>}

        <button
          onClick={isFirstTime ? handleSetPin : handleLogin}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: '#10b981',
            color: '#0b0f19',
            border: 'none',
            borderRadius: '12px',
            fontWeight: 'bold',
            fontSize: '17px',
            cursor: 'pointer'
          }}
        >
          {isFirstTime ? 'Set PIN' : 'Unlock Secure Ledger'}
        </button>
      </div>
    </div>
  );
}