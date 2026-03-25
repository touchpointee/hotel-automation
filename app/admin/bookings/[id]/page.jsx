'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import AdminSidebar from '../../AdminSidebar';
import styles from '../../admin.module.css';

function formatStayDisplay(value) {
  if (!value) return '';
  const normalized = typeof value === 'string' ? value.trim().replace(' ', 'T') : value;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function formatAmountDisplay(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '—';
  return `₹${n}`;
}

function getFileExt(filename = '') {
  const ext = filename.split('.').pop() || '';
  return ext.toLowerCase();
}

export default function BookingDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [booking, setBooking] = useState(null);
  const [directions, setDirections] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewError, setPreviewError] = useState(false);

  const [files, setFiles] = useState([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  const uploadedDocs = booking?.id_proofs?.length
    ? booking.id_proofs
    : booking?.id_proof
      ? [booking.id_proof]
      : [];

  const primaryIdProof = booking?.id_proof || (uploadedDocs.length ? uploadedDocs[uploadedDocs.length - 1] : null);

  const isImage = useMemo(() => {
    if (!primaryIdProof) return false;
    const ext = getFileExt(primaryIdProof);
    return ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
  }, [primaryIdProof]);

  async function fetchBooking() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/bookings/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load booking');
      setBooking(data.booking);
      setDirections(data.directions || null);
      setPreviewError(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) fetchBooking();
  }, [id]);

  async function handleUpload(e) {
    e.preventDefault();
    if (!files || files.length === 0) return;
    if (!id) return;

    setUploadLoading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const formData = new FormData();
      for (const f of files) {
        formData.append('file', f);
      }

      const res = await fetch(`/api/bookings/${id}/documents`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setUploadSuccess('Document uploaded successfully.');
      setFiles([]);
      await fetchBooking();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploadLoading(false);
    }
  }

  return (
    <div className={styles.layout}>
      <AdminSidebar activePath="/admin" />
      <div className={styles.mainContainer}>
        <header className={styles.topbar}>
          <div className={styles.topbarStack}>
            <h2 className={styles.topbarTitle}>Booking Details</h2>
            <p className={styles.pageIntro}>Manage guest details and documents for this booking.</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button type="button" className={styles.secondaryBtn} onClick={() => router.push('/admin')}>
              Back to dashboard
            </button>
          </div>
        </header>

        <main className={styles.content}>
          {loading ? (
            <div className={styles.card}>Loading…</div>
          ) : error ? (
            <div className={`${styles.card} ${styles.emptyStateCard}`}>{error}</div>
          ) : !booking ? (
            <div className={`${styles.card} ${styles.emptyStateCard}`}>Booking not found.</div>
          ) : (
            <div className={styles.card}>
              <div className={styles.bookingDetailInner}>
                <div className={styles.bookingDetailHeader}>
                  <div>
                    <h3 className={styles.subtitle} style={{ marginBottom: 6 }}>
                      Guest: {booking.guest_name}
                    </h3>
                    <div className={styles.cellMuted} style={{ marginBottom: 8 }}>
                      {booking.guest_phone}
                      {booking.guest_email ? ` • ${booking.guest_email}` : ''}
                    </div>
                    <div className={styles.cellMuted}>Room: {booking.room_no || '—'}</div>
                  </div>
                  <div style={{ minWidth: 240 }}>
                    <div className={styles.badge} style={{ display: 'inline-block', marginBottom: 8 }}>
                      Status: {booking.status?.replace('_', ' ') || '—'}
                    </div>
                    {booking.otp && (
                      <div className={styles.cellMuted} style={{ marginTop: 6 }}>
                        Kiosk OTP: <span className={styles.otpCode}>{booking.otp}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.detailRows}>
                  <div className={styles.detailRow}>
                    <div className={styles.detailKey}>CHECK-IN</div>
                    <div className={styles.detailVal}>{formatStayDisplay(booking.check_in) || '—'}</div>
                  </div>

                  <div className={styles.detailRow}>
                    <div className={styles.detailKey}>CHECK-OUT</div>
                    <div className={styles.detailVal}>{formatStayDisplay(booking.check_out) || '—'}</div>
                  </div>

                  <div className={styles.detailRow}>
                    <div className={styles.detailKey}>SOURCE</div>
                    <div className={styles.detailVal}>{booking.source || 'direct'}</div>
                  </div>

                  <div className={styles.detailRow}>
                    <div className={styles.detailKey}>PAYMENT STATUS</div>
                    <div className={styles.detailVal}>{booking.payment_status || 'pending'}</div>
                  </div>

                  <div className={styles.detailRow}>
                    <div className={styles.detailKey}>AMOUNT</div>
                    <div className={styles.detailVal}>{formatAmountDisplay(booking.amount)}</div>
                  </div>

                  <div className={styles.detailRow}>
                    <div className={styles.detailKey}>DIRECTIONS</div>
                    <div className={styles.detailVal}>{directions || '—'}</div>
                  </div>

                  {(booking.card_no || booking.card_id) && (
                    <div className={styles.detailRow}>
                      <div className={styles.detailKey}>CARD INFO</div>
                      <div className={styles.detailVal}>
                        {booking.card_no ? `card_no: ${booking.card_no}` : ''}
                        {booking.card_no && booking.card_id ? ' • ' : ''}
                        {booking.card_id ? `card_id: ${booking.card_id}` : ''}
                      </div>
                    </div>
                  )}

                  <div className={styles.detailRow}>
                    <div className={styles.detailKey}>ID PROOF</div>
                    <div className={styles.detailVal}>
                      {primaryIdProof ? (
                        <>
                          <div className={styles.idProofMeta}>
                            {booking.id_proof_status || 'unuploaded'} • {uploadedDocs.length || 1} document(s)
                            {primaryIdProof ? ` — ${primaryIdProof}` : ''}
                          </div>

                          {isImage ? (
                            previewError ? (
                              <div className={styles.cellMuted}>Image preview unavailable.</div>
                            ) : (
                              <img
                                src={`/api/documents/${primaryIdProof}`}
                                alt="Uploaded ID proof"
                                className={styles.idProofImage}
                                style={{ maxWidth: 520, borderRadius: 12, border: '1px solid #ddd' }}
                                onError={() => setPreviewError(true)}
                              />
                            )
                          ) : (
                            <div className={styles.cellMuted}>
                              Preview not available for this file type.{' '}
                                <a href={`/api/documents/${primaryIdProof}?download=true`} download>
                                Download
                              </a>
                            </div>
                          )}

                          {isImage && previewError && (
                            <div className={styles.errorBox} style={{ marginTop: 12, marginBottom: 0 }}>
                              Preview could not be loaded. The file may be missing on the server. You can try downloading it below or re-uploading.
                            </div>
                          )}

                          <div style={{ marginTop: 12 }}>
                            <a
                              href={`/api/documents/${primaryIdProof}?download=true`}
                              download
                              className={styles.primaryBtn}
                            >
                              Download document
                            </a>
                          </div>

                          {uploadedDocs.length > 1 && (
                            <div style={{ marginTop: 12 }}>
                              <div className={styles.cellMuted} style={{ marginBottom: 8 }}>
                                Other documents:
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {uploadedDocs.map((name) => (
                                  <a
                                    key={name}
                                    href={`/api/documents/${name}?download=true`}
                                    download
                                    className={styles.textLink}
                                    style={{ maxWidth: 520, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                  >
                                    {name}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <span className={styles.idPending}>No document uploaded yet</span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 22 }} />

                <form onSubmit={handleUpload}>
                  <div className={styles.formField}>
                    <label className={styles.label}>Upload / replace document for this booking</label>
                    <input
                      type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                    required
                    />
                  </div>

                  {uploadError && (
                    <div className={styles.errorBox} style={{ marginTop: 12 }}>
                      {uploadError}
                    </div>
                  )}
                  {uploadSuccess && (
                    <div className={styles.successBox} style={{ marginTop: 12 }}>
                      {uploadSuccess}
                    </div>
                  )}

                  <div style={{ marginTop: 16 }}>
                    <button type="submit" className={styles.submitBtn} disabled={uploadLoading}>
                      {uploadLoading ? 'Uploading…' : 'Upload document'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

