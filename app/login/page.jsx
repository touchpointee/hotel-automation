'use client';
import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './login.module.css';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(r => {
      if (r.ok) router.replace('/admin');
    }).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      const from = searchParams.get('from') || '/admin';
      window.location.href = from;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.shell}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.logoWrap}>
            <Image
              src="/logo.png"
              alt="DJ IMPERIALS"
              width={72}
              height={72}
              priority
              className={styles.logo}
            />
          </div>
          <h1 className={styles.title}>DJ IMPERIALS</h1>
          <p className={styles.subtitle}>Admin Portal</p>
        </div>

        {error && (
          <div className={styles.errorBox} role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-username">
              Username
            </label>
            <input
              id="login-username"
              type="text"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="admin"
              required
              autoFocus
              className={styles.input}
              autoComplete="username"
            />
          </div>
          <div className={`${styles.field} ${styles.fieldLast}`}>
            <label className={styles.label} htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              required
              className={styles.input}
              autoComplete="current-password"
            />
          </div>
          <button type="submit" disabled={loading} className={styles.submit}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className={styles.fallback} />}>
      <LoginForm />
    </Suspense>
  );
}
