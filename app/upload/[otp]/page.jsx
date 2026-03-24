'use client';
import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function MobileUploadPage() {
  const { otp } = useParams();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploadedFilename, setUploadedFilename] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, uploading, review, success, error
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      // Create local preview
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(selected);
      setStatus('idle');
      setErrorMsg('');
    }
  };

  // Check if session is active when page loads
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ otp, action: 'check_session' })
        });
        const data = await res.json();
        if (data.active === false) {
          setStatus('error');
          setErrorMsg('This upload link is mostly inactive or has expired. Please go back to the Kiosk, tap Confirm again, and scan the new QR code.');
        }
      } catch (e) {
        console.error('Session check error', e);
      }
    };
    if (otp) checkSession();
  }, [otp]);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setStatus('uploading');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('otp', otp);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setUploadedFilename(data.filename);
      setStatus('review');
    } catch (e) {
      setStatus('error');
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp, action: 'confirm_upload' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Confirm failed');
      setStatus('success');
    } catch (e) {
      console.error(e);
      setStatus('error');
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.root}>
      <div style={s.header}>
        <div style={s.logo}>🏨 DJ IMPERIALS</div>
      </div>
      
      <div style={s.content}>
        {status === 'success' ? (
          <div style={s.card}>
            <div style={{ fontSize: 64 }}>✅</div>
            <h2 style={s.heading}>Upload Complete!</h2>
            <p style={s.sub}>Your ID proof has been securely uploaded.</p>
            <p style={{ ...s.sub, fontWeight: 'bold', color: '#1a6b3a' }}>
              Please look back at the Kiosk screen to continue your check-in.
            </p>
          </div>
        ) : status === 'error' ? (
          <div style={s.card}>
            <h2 style={{ ...s.heading, color: '#c0392b' }}>Upload Unavailable</h2>
            <div style={s.errorBox}>⚠️ {errorMsg}</div>
          </div>
        ) : status === 'review' ? (
          <div style={s.card}>
            <h2 style={s.heading}>Review ID Proof</h2>
            <p style={s.sub}>Please check if the uploaded document is clear.</p>
            <div style={s.previewContainer}>
              <img src={`/api/documents/${uploadedFilename}`} alt="Uploaded ID" style={s.previewImg} />
            </div>
            <button 
              style={{ ...s.retakeBtn, marginTop: 12, width: '100%' }} 
              onClick={() => { setStatus('idle'); setFile(null); setPreview(null); }} 
              disabled={loading}
            >
              Retake Photo
            </button>
            <button 
              style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }} 
              onClick={handleConfirm} 
              disabled={loading}
            >
              {loading ? 'Confirming...' : 'Confirm Details'}
            </button>
          </div>
        ) : (
          <div style={s.card}>
            <h2 style={s.heading}>ID Verification</h2>
            <p style={s.sub}>Please upload a clear picture of your ID Proof (Aadhaar, Passport, etc.)</p>
            
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {!preview ? (
              <div style={s.uploadBox} onClick={() => fileInputRef.current.click()}>
                <div style={{ fontSize: 48 }}>📷</div>
                <div style={{ marginTop: 12, fontWeight: 600 }}>Tap to Take Photo</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>or choose from gallery</div>
              </div>
            ) : (
              <div style={s.previewContainer}>
                <img src={preview} alt="ID Preview" style={s.previewImg} />
                <button style={s.retakeBtn} onClick={() => fileInputRef.current.click()}>
                  Retake Photo
                </button>
              </div>
            )}

            {preview && (
              <button 
                style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }} 
                onClick={handleUpload}
                disabled={loading}
              >
                {loading ? 'Uploading...' : 'Upload ID Proof'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  root: { minHeight: '100vh', background: '#f8f9fa', display: 'flex', flexDirection: 'column' },
  header: { padding: '16px', background: '#0a2e1a', display: 'flex', justifyContent: 'center' },
  logo: { fontSize: 20, fontWeight: 700, color: '#c9a84c', letterSpacing: 1 },
  content: { flex: 1, padding: '24px 16px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' },
  card: { background: '#fff', borderRadius: 16, padding: '32px 24px', width: '100%', maxWidth: 400, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' },
  heading: { fontSize: 24, fontWeight: 700, color: '#1a1a2e', margin: 0 },
  sub: { fontSize: 15, color: '#666', margin: 0, lineHeight: 1.5 },
  uploadBox: { width: '100%', border: '2px dashed #1a6b3a', borderRadius: 12, padding: '40px 20px', backgroundColor: '#f0f7f3', cursor: 'pointer', marginTop: 12 },
  previewContainer: { width: '100%', display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 },
  previewImg: { width: '100%', maxHeight: 250, objectFit: 'cover', borderRadius: 12, border: '1px solid #ddd' },
  retakeBtn: { background: 'transparent', color: '#1a6b3a', border: '1px solid #1a6b3a', padding: '10px', borderRadius: 8, fontWeight: 600 },
  submitBtn: { width: '100%', padding: '16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 12, fontSize: 17, fontWeight: 700, marginTop: 8 },
  errorBox: { background: '#fff0f0', border: '1px solid #ffaaaa', color: '#c0392b', padding: '12px', borderRadius: 8, fontSize: 14, width: '100%' }
};
