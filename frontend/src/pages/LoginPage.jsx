import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [name, setName]     = useState('');
  const [code, setCode]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const { login, token }    = useAuthStore();
  const navigate            = useNavigate();

  useEffect(() => {
    if (token) navigate('/', { replace: true });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim())  return setError('Please enter your name.');
    if (!code.trim())  return setError('Please enter your teacher code.');
    if (code.length < 3) return setError('Code must be at least 3 characters.');

    setLoading(true);
    try {
      await login(name.trim(), code.trim().toUpperCase());
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', padding: 20,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Subtle background glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 50% at 50% -5%, #FAEEDA 0%, transparent 65%)',
      }} />

      <div style={{
        background: 'var(--surface)', border: '0.5px solid var(--border)',
        borderRadius: 20, padding: '44px 40px', width: '100%', maxWidth: 420,
        position: 'relative', zIndex: 1,
        boxShadow: '0 2px 40px rgba(186,117,23,.09)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 58, height: 58, borderRadius: '50%', background: 'var(--gold-l)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 12,
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#BA7517" strokeWidth="2"/>
              <path d="M8 13.5s1.5 2.5 4 2.5 4-2.5 4-2.5" stroke="#BA7517" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="9.5" cy="10" r="1.2" fill="#BA7517"/>
              <circle cx="14.5" cy="10" r="1.2" fill="#BA7517"/>
            </svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Happiness Program</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
            Teacher Platform · Art of Living
          </div>
        </div>

        {error && (
          <div style={{
            background: 'var(--red-l)', color: 'var(--red)', fontSize: 13,
            padding: '10px 14px', borderRadius: 8, marginBottom: 18,
            border: '0.5px solid #F09595',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label">Your name</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. Meera Sharma"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
              autoFocus
            />
          </div>
          <div className="form-field">
            <label className="form-label">Teacher code</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. MEERA2024"
              value={code}
              onChange={e => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
              autoComplete="off"
            />
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5 }}>
              Letters and numbers only. First login creates your account.
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: 13, fontSize: 14, marginTop: 4, justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Enter Dashboard'}
          </button>
        </form>

        <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginTop: 18, lineHeight: 1.6 }}>
          Each teacher gets a private workspace.<br />
          Your code is your password — keep it safe.
        </div>
      </div>
    </div>
  );
}
