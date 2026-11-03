import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function EmailVerification() {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('Verifying your email address…');
  const [error, setError] = useState('');
  const verificationStarted = useRef(false);
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  useEffect(() => {
    if (verificationStarted.current) return;
    verificationStarted.current = true;
    if (!uid || !token) {
      setError('This verification link is incomplete. Request a new verification email.');
      setMessage('');
      return;
    }

    api.verifyEmail(uid, token)
      .then((response) => {
        setMessage(response?.detail || 'Email verified. An administrator must approve your account before sign-in.');
      })
      .catch((verificationError) => {
        setError(verificationError.message || 'Unable to verify this email link.');
        setMessage('');
      });
  }, [uid, token]);

  return (
    <section className="login-page">
      <div className="login-card">
        <h1>Email verification</h1>
        {error && <div role="alert" style={{ color: '#f87171' }}>{error}</div>}
        {message && <div role="status">{message}</div>}
        <Link to="/login" className="btn btn-primary">Go to sign in</Link>
      </div>
    </section>
  );
}
