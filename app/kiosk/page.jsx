'use client';
import { useState, useEffect } from 'react';

const STEP = { OTP: 'otp', CONFIRM: 'confirm', UPLOAD: 'upload', CARD: 'card', DONE: 'done', ERROR: 'error' };

export default function KioskPage() {
  const [step, setStep] = useState(STEP.OTP);
  const [otp, setOtp] = useState('');
  const [booking, setBooking] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cardPlaced, setCardPlaced] = useState(false);
  const [host, setHost] = useState('');

  useEffect(() => { setHost(window.location.origin); }, []);

  useEffect(() => {
    let interval;
    if (step === STEP.UPLOAD && booking) {
      // Start upload session
      fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: booking.otp, action: 'start_upload' }),
      });

      interval = setInterval(async () => {
        try {
          const res = await fetch('/api/checkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ otp: booking.otp, action: 'check_upload' }),
          });
          const data = await res.json();
          if (data.uploaded) {
            setCardPlaced(false);
            setStep(STEP.CARD);
          }
        } catch (e) {
          console.error('Polling error', e);
        }
      }, 3000);
    }
    
    return () => {
      clearInterval(interval);
      if (booking && step === STEP.UPLOAD) {
        // Stop upload session once navigated away
        fetch('/api/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ otp: booking.otp, action: 'stop_upload' }),
        });
      }
    };
  }, [step, booking]);

  async function handleLookup() {
    if (!otp.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otp.trim(), action: 'lookup' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBooking(data.booking);
      setStep(STEP.CONFIRM);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleIssueCard() {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: booking.otp, action: 'confirm' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      setStep(STEP.DONE);
    } catch (e) { setError(e.message); setStep(STEP.ERROR); }
    finally { setLoading(false); }
  }

  function reset() {
    setStep(STEP.OTP); setOtp(''); setBooking(null);
    setResult(null); setError(''); setCardPlaced(false);
  }

  return (
    <div style={s.root}>
      <div style={s.header}>
        <div style={s.logo}>
          <img src="/logo.png" alt="" width={40} height={40} style={{ borderRadius: 8, objectFit: 'contain', display: 'block' }} />
          <span style={s.logoText}>DJ IMPERIALS</span>
        </div>
        <div style={s.headerSub}>Self Check-In</div>
      </div>

      <div style={s.content}>

        {step === STEP.OTP && (
          <div style={s.card}>
            <div style={s.icon}>🔑</div>
            <h2 style={s.heading}>Welcome!</h2>
            <p style={s.sub}>Enter the check-in code provided by the front desk</p>
            <input
              style={s.otpInput}
              value={otp}
              readOnly
              placeholder="_ _ _ _ _ _"
            />
            <div style={s.numpad}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '⌫'].map(btn => (
                <button
                  key={btn}
                  style={{ ...s.numBtn, ...(btn === 'C' ? { color: '#c0392b' } : {}) }}
                  onClick={() => {
                    if (btn === 'C') setOtp('');
                    else if (btn === '⌫') setOtp(prev => prev.slice(0, -1));
                    else if (otp.length < 6) setOtp(prev => prev + btn);
                  }}
                >
                  {btn}
                </button>
              ))}
            </div>
            {error && <div style={s.errorBox}>⚠️ {error}</div>}
            <button style={{ ...s.btn, opacity: loading || otp.length < 6 ? 0.5 : 1 }} onClick={handleLookup} disabled={loading || otp.length < 6}>
              {loading ? 'Looking up...' : 'Continue →'}
            </button>
          </div>
        )}

        {step === STEP.CONFIRM && booking && (
          <div style={s.card}>
            <div style={s.icon}>✅</div>
            <h2 style={s.heading}>Confirm Your Details</h2>
            <div style={s.detailsBox}>
              <Row label="Guest Name" value={booking.guest_name} big />
              <Row label="Room" value={booking.room_no} />
              <Row label="Check-in" value={booking.check_in} />
              <Row label="Check-out" value={booking.check_out} />
            </div>
            <div style={s.btnRow}>
              <button style={{ ...s.btn, ...s.btnGray }} onClick={reset}>← Back</button>
              <button style={s.btn} onClick={() => { setStep(STEP.UPLOAD); }}>Confirm →</button>
            </div>
          </div>
        )}

        {step === STEP.UPLOAD && booking && (
          <div style={s.card}>
            <div style={s.icon}>📱</div>
            <h2 style={s.heading}>ID Verification</h2>
            <p style={s.sub}>Please scan the QR code to upload your ID proof securely from your mobile phone.</p>
            <div style={{ background: '#fff', padding: 12, borderRadius: 16, border: '2px dashed #1a6b3a', marginTop: 16 }}>
              {host ? (
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(host + '/upload/' + booking.otp)}`}
                  alt="QR Code"
                  style={{ width: 200, height: 200, display: 'block' }}
                />
              ) : (
                <div style={{ width: 200, height: 200, background: '#eee' }}></div>
              )}
            </div>
            <p style={{ marginTop: 24, fontSize: 16, color: '#1a6b3a', fontWeight: 'bold' }}>
              Waiting for upload... <span style={s.spinnerInline} />
            </p>
            <p style={{ fontSize: 14, color: '#666', marginTop: 8 }}>The screen will automatically continue once uploaded.</p>
            <button style={{ ...s.btn, ...s.btnGray, marginTop: 12 }} onClick={() => setStep(STEP.CONFIRM)}>← Back</button>
          </div>
        )}

        {step === STEP.CARD && (
          <div style={s.card}>
            {!cardPlaced ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 20,
                  padding: '20px 0',
                  width: '100%',
                  animation: 'popIn 0.3s ease-out',
                }}
              >
                <div
                  style={{
                    width: 210,
                    height: 220,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    overflow: 'hidden',
                    background: '#f5f7fa',
                  }}
                >
                  <video
                    src="/card.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                  />
                </div>

                <h2 style={{ ...s.heading, color: '#1a6b3a' }}>Place Card First</h2>
                <p style={{ ...s.sub, fontSize: 16, lineHeight: 1.5, color: '#444' }}>
                  Please grab a blank room key and place it flat on the encoder device next to this screen.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 12, marginTop: 16 }}>
                  <button style={{ ...s.btn, padding: '16px', fontSize: 18 }} onClick={() => setCardPlaced(true)}>
                    Okay, It's Placed ✓
                  </button>
                  <button style={{ ...s.btn, ...s.btnGray, padding: '16px', fontSize: 16 }} onClick={reset}>
                    Restart Check-in
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={s.icon}>💳</div>
                <h2 style={s.heading}>Ready to Encode</h2>
                <p style={s.sub}>Click the button below to securely program your room key.</p>
                <div style={s.encoderBox}>
                  <div style={{ fontSize: 52 }}>📤</div>
                  <div style={{ color: '#888', fontSize: 13, marginTop: 8 }}>Card Encoder</div>
                </div>
                {loading && <div style={s.programmingBox}><div style={s.spinner} /><span>Programming your key card...</span></div>}
                {!loading && (
                  <button style={s.btn} onClick={handleIssueCard}>
                    Get My Key →
                  </button>
                )}
                {error && <div style={s.errorBox}>⚠️ {error}</div>}
              </>
            )}
          </div>
        )}

        {step === STEP.DONE && result && (
          <div style={s.card}>
            <div style={{ fontSize: 64, textAlign: 'center' }}>🎉</div>
            <h2 style={{ ...s.heading, color: '#1a6b3a' }}>You're Checked In!</h2>
            <p style={s.sub}>Welcome, <strong>{result.guest_name}</strong>!</p>
            <div style={s.roomBadge}>Room <span style={s.roomNo}>{result.room_no}</span></div>
            
            <div style={{ background: '#f0f7f3', border: '1px solid #c5e0cd', borderRadius: 8, padding: 16, marginTop: 20, width: '100%', boxSizing: 'border-box' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1a6b3a', textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📍</span> Way to Room
              </div>
              <div style={{ fontSize: 16, color: '#1a1a2e', lineHeight: 1.5, fontWeight: 500 }}>
                {result.directions}
              </div>
            </div>

            <p style={{ color: '#888', fontSize: 13, marginTop: 24 }}>Check-out: <strong>{result.check_out}</strong></p>
            <p style={{ color: '#555', fontSize: 14, marginTop: 8 }}>Your key card is ready. Enjoy your stay! 🌟</p>
            <button style={{ ...s.btn, marginTop: 24 }} onClick={reset}>Done ✓</button>
          </div>
        )}

        {step === STEP.ERROR && (
          <div style={s.card}>
            <div style={s.icon}>❌</div>
            <h2 style={{ ...s.heading, color: '#c0392b' }}>Check-in Failed</h2>
            <div style={s.errorBox}>{error}</div>
            {error && error.includes('23') ? (
              <>
                <p style={s.sub}>No card was detected on the encoder. Please make sure the key card is placed perfectly flat.</p>
                <button style={s.btn} onClick={() => { setError(''); setStep(STEP.CARD); setCardPlaced(false); }}>← Place Card Again</button>
              </>
            ) : (
              <>
                <p style={s.sub}>Please visit the front desk for assistance.</p>
                <button style={s.btn} onClick={reset}>← Start Over</button>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

function Row({ label, value, big }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
      <span style={{ fontSize: 13, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      <span style={{ fontSize: big ? 20 : 15, fontWeight: big ? 700 : 500, color: '#1a1a2e' }}>{value}</span>
    </div>
  );
}

const s = {
  root: { minHeight: '100vh', background: 'linear-gradient(160deg, #0a2e1a, #0d3d24)', display: 'flex', flexDirection: 'column' },
  header: { padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 16 },
  logo: { display: 'flex', alignItems: 'center', gap: 12 },
  logoText: { fontSize: 20, fontWeight: 700, color: '#c9a84c', letterSpacing: 2 },
  headerSub: { fontSize: 16, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' },
  content: { flex: 1, padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  card: { position: 'relative', background: '#fff', borderRadius: 24, padding: '24px 32px', width: '100%', maxWidth: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 },
  icon: { fontSize: 40 },
  heading: { fontSize: 24, fontWeight: 700, color: '#1a1a2e', margin: 0, textAlign: 'center' },
  sub: { fontSize: 15, color: '#666', textAlign: 'center', margin: 0 },
  otpInput: { width: '100%', padding: '14px', fontSize: 28, fontFamily: 'monospace', fontWeight: 800, letterSpacing: 12, textAlign: 'center', border: '2px solid #ddd', borderRadius: 12, outline: 'none', boxSizing: 'border-box' },
  numpad: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, width: '100%', boxSizing: 'border-box' },
  numBtn: { padding: '12px', fontSize: 20, fontWeight: 600, background: '#f8f9fa', border: '2px solid #eaeaea', borderRadius: 12, cursor: 'pointer', color: '#1a1a2e', fontFamily: 'inherit' },
  btn: { width: '100%', padding: 14, background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  btnGray: { background: '#f0f0f0', color: '#333' },
  btnRow: { display: 'flex', gap: 12, width: '100%' },
  errorBox: { position: 'absolute', top: -20, left: '50%', transform: 'translate(-50%, -100%)', background: '#fff0f0', border: '1px solid #ffaaaa', color: '#c0392b', padding: '10px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, width: 'max-content', maxWidth: '320px', textAlign: 'center', boxShadow: '0 8px 20px rgba(192, 57, 43, 0.2)', zIndex: 100 },
  detailsBox: { width: '100%', background: '#f8f9fa', borderRadius: 12, padding: '4px 16px' },
  encoderBox: { width: '100%', background: '#f0f7f3', border: '2px dashed #1a6b3a', borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center' },
  checkLabel: { display: 'flex', alignItems: 'center', cursor: 'pointer', alignSelf: 'flex-start' },
  programmingBox: { display: 'flex', alignItems: 'center', gap: 12, color: '#1a6b3a', fontSize: 15, fontWeight: 600 },
  spinner: { width: 22, height: 22, border: '3px solid #cde8d8', borderTop: '3px solid #1a6b3a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  spinnerInline: { display: 'inline-block', width: 14, height: 14, border: '3px solid rgba(26,107,58,0.2)', borderTopColor: '#1a6b3a', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginLeft: 8, verticalAlign: 'middle' },
  roomBadge: { fontSize: 18, color: '#555', background: '#f0f7f3', padding: '10px 28px', borderRadius: 50, border: '1px solid #c5e0cd' },
  roomNo: { fontSize: 32, fontWeight: 800, color: '#1a6b3a', marginLeft: 8 },
};
