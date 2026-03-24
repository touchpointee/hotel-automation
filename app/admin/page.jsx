'use client';
import { useState, useEffect } from 'react';
import styles from './admin.module.css';
import AdminSidebar from './AdminSidebar';

function formatStayDisplay(value) {
  if (!value) return '';
  const normalized = typeof value === 'string' ? value.trim().replace(' ', 'T') : value;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AdminPage() {
  const [bookings, setBookings] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [availableFloors, setAvailableFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  
  const initialForm = { guest_name: '', guest_phone: '', room_no: '', check_in: '', check_out: '', status: 'pending', id_proof: null, id_proof_status: 'unuploaded', source: 'direct', guest_email: '', number_of_guests: 1, payment_status: 'pending', amount: '', notes: '' };
  const [form, setForm] = useState(initialForm);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  // OTA Confirm workflow
  const [confirmModal, setConfirmModal] = useState(null); // { booking }
  const [confirmRoomFloor, setConfirmRoomFloor] = useState('');
  const [confirmRoom, setConfirmRoom] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmedOtp, setConfirmedOtp] = useState(null); // shows OTP after confirm

  useEffect(() => { 
    // Set default date to today to avoid hydration mismatch
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setFilterDate(`${year}-${month}-${day}`);

    fetchBookings(); 
    fetchRooms();
    fetchFloors();
  }, []);

  async function fetchFloors() {
    try {
      const res = await fetch('/api/floors');
      const data = await res.json();
      setAvailableFloors(data.floors || []);
    } catch (e) {
      console.error('Failed to fetch floors:', e);
    }
  }

  async function fetchRooms() {
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      setAvailableRooms(data.rooms || []);
    } catch (e) {
      console.error('Failed to fetch rooms:', e);
    }
  }

  async function fetchBookings() {
    try {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (e) {
      console.error('Failed to fetch bookings:', e);
    }
  }

  async function handleOTASync() {
    setSyncLoading(true); setSyncResult(null);
    try {
      const res = await fetch('/api/calendar/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      const ok = (data.results || []).filter(r => r.status === 'ok').length;
      const fail = (data.results || []).filter(r => r.status === 'error').length;
      setSyncResult(`Synced ${ok} source${ok !== 1 ? 's' : ''}${fail > 0 ? `, ${fail} failed` : ''}`);
      fetchBookings();
    } catch (e) {
      setSyncResult(`Error: ${e.message}`);
    } finally {
      setSyncLoading(false);
      setTimeout(() => setSyncResult(null), 6000);
    }
  }

  async function handleConfirmOTA() {
    if (!confirmModal || !confirmRoom) return;
    setConfirmLoading(true);
    try {
      const res = await fetch(`/api/bookings/${confirmModal._id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_no: confirmRoom }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConfirmedOtp(data.otp);
      setConfirmModal(null);
      fetchBookings();
    } catch (e) {
      alert(e.message);
    } finally {
      setConfirmLoading(false);
    }
  }

  function openCreateModal() {
    setForm(initialForm);
    setSelectedFloor('');
    setEditId(null);
    setError('');
    setSuccess(null);
    setIsModalOpen(true);
  }

  function openEditModal(booking) {
    setForm({
      guest_name: booking.guest_name,
      guest_phone: booking.guest_phone,
      room_no: booking.room_no,
      check_in: booking.check_in,
      check_out: booking.check_out,
      status: booking.status,
      id_proof: booking.id_proof,
      id_proof_status: booking.id_proof_status,
    });
    
    // Auto-select the correct floor for the existing room
    const roomMatches = availableRooms.find(r => r.room_no === booking.room_no);
    setSelectedFloor(roomMatches ? (roomMatches.floor_id?._id || '') : '');

    setEditId(booking._id);
    setError('');
    setSuccess(null);
    setIsModalOpen(true);
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this booking?')) return;
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete booking');
      fetchBookings();
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess(null);
    try {
      const url = editId ? `/api/bookings/${editId}` : '/api/bookings';
      const method = editId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      if (!editId) {
        setSuccess({ created: true, otp: data.booking.otp });
        setForm(initialForm);
      } else {
        setIsModalOpen(false);
      }
      fetchBookings();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const getStatusClass = (status) => {
    switch(status) {
      case 'pending': return styles.badgePending;
      case 'checked_in': return styles.badgeCheckedIn;
      case 'checked_out': return styles.badgeCheckedOut;
      default: return '';
    }
  };

  const isRoomAvailable = (roomNo) => {
    if (!form.check_in || !form.check_out) return true;
    const newIn = new Date(form.check_in);
    const newOut = new Date(form.check_out);
    if (isNaN(newIn.getTime()) || isNaN(newOut.getTime()) || newIn >= newOut) return true;

    return !bookings.some(b => {
      if (b._id === editId) return false; 
      if (b.status === 'checked_out') return false; 
      if (b.room_no !== roomNo) return false;

      const bIn = new Date(b.check_in);
      const bOut = new Date(b.check_out);

      // Overlap condition
      return newIn < bOut && newOut > bIn;
    });
  };

  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'pending' && b.status !== 'pending') return false;
    if (activeTab === 'checked_in' && b.status !== 'checked_in') return false;

    if (filterDate) {
      const selectedD = new Date(filterDate);
      selectedD.setHours(0, 0, 0, 0);
      const nextD = new Date(selectedD);
      nextD.setDate(nextD.getDate() + 1);

      const bIn = new Date(b.check_in);
      const bOut = new Date(b.check_out);

      // Bookings overlapping with the selected day
      if (!(bIn < nextD && bOut > selectedD)) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className={styles.layout}>
      <AdminSidebar activePath="/admin" />
      <div className={styles.mainContainer}>
        <header className={styles.topbar}>
          <div className={styles.topbarStack}>
            <h2 className={styles.topbarTitle}>Dashboard Overview</h2>
            <p className={styles.pageIntro}>Bookings, OTA sync, and kiosk OTPs for today and upcoming stays.</p>
          </div>
        </header>

        <main className={styles.content}>
          <div className={styles.toolbar}>
            <div className={styles.toolbarCluster}>
              <div className={styles.tabsMenu}>
                <button type="button" className={`${styles.tabBtn} ${activeTab==='all' ? styles.tabActive : ''}`} onClick={() => setActiveTab('all')}>All Bookings</button>
                <button type="button" className={`${styles.tabBtn} ${activeTab==='checked_in' ? styles.tabActive : ''}`} onClick={() => setActiveTab('checked_in')}>In-House</button>
                <button type="button" className={`${styles.tabBtn} ${activeTab==='pending' ? styles.tabActive : ''}`} onClick={() => setActiveTab('pending')}>Waiting</button>
              </div>

              <div className={styles.dateFilter}>
                <span className={styles.dateFilterLabel}>Date</span>
                <input
                  type="date"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  className={styles.dateFilterInput}
                  title="Filter by date"
                />
                {filterDate && (
                  <button type="button" className={styles.ghostBtn} onClick={() => setFilterDate('')} aria-label="Clear date filter">
                    &times;
                  </button>
                )}
              </div>
            </div>

            <div className={styles.toolbarActions}>
              <div className={styles.stats}>
                Showing <strong>{filteredBookings.length}</strong> {filteredBookings.length === 1 ? 'booking' : 'bookings'}
              </div>
              {syncResult && <span className={styles.syncFeedback}>{syncResult}</span>}
              <button
                type="button"
                onClick={handleOTASync}
                disabled={syncLoading}
                className={styles.secondaryBtn}
              >
                <svg className={styles.iconSm} width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {syncLoading ? 'Syncing…' : 'Sync from OTAs'}
              </button>
              <button type="button" onClick={openCreateModal} className={styles.primaryBtn}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                New Booking
              </button>
            </div>
          </div>

          <div className={styles.card}>
            {filteredBookings.length === 0 ? (
              <div className={styles.empty}>No bookings yet. Click &quot;New Booking&quot; to start.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Guest Info</th>
                      <th className={styles.th}>Source</th>
                      <th className={styles.th}>Room</th>
                      <th className={styles.th}>Stay Dates (In / Out)</th>
                      <th className={styles.th}>Kiosk OTP</th>
                      <th className={styles.th}>ID Proof</th>
                      <th className={styles.th}>Status</th>
                      <th className={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map(b => {
                      const isOverdue = b.status === 'checked_in' && new Date() > new Date(b.check_out);
                      return (
                      <tr key={b._id} className={styles.tr}>
                        <td className={styles.td}>
                          <div className={styles.guestName}>{b.guest_name}</div>
                          <div className={styles.cellMuted}>{b.guest_phone}</div>
                          {b.guest_email && <div className={styles.cellMutedSm}>{b.guest_email}</div>}
                        </td>
                        <td className={styles.td}>
                          <span className={styles.sourcePill}>
                            {b.source || 'direct'}
                          </span>
                        </td>
                        <td className={styles.td}>
                          <span className={styles.roomTag}>{b.room_no}</span>
                        </td>
                        <td className={styles.td}>
                          <div className={styles.stayDatePrimary}>{formatStayDisplay(b.check_in)}</div>
                          {isOverdue ? (
                            <div className={styles.stayDateOverdue}>
                              Out {formatStayDisplay(b.check_out)} (overdue)
                            </div>
                          ) : (
                            <div className={styles.stayDateSecondary}>
                              Out {formatStayDisplay(b.check_out)}
                            </div>
                          )}
                        </td>
                        <td className={styles.td}>
                          <span className={styles.otpCode}>{b.otp}</span>
                        </td>
                        <td className={styles.td}>
                          {b.id_proof_status === 'uploaded' && b.id_proof ? (
                            <button onClick={() => openEditModal(b)} className={styles.actionBtn}>View Details</button>
                          ) : (
                            <span className={styles.idPending}>Pending</span>
                          )}
                        </td>
                        <td className={styles.td}>
                          <span className={`${styles.badge} ${getStatusClass(b.status)}`}>
                            {b.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className={styles.td}>
                          <div className={styles.actions}>
                            {/* OTA bookings without OTP get Assign & Confirm button */}
                            {!b.otp && b.source !== 'direct' && b.source !== 'offline' && (
                              <button
                                type="button"
                                onClick={() => { setConfirmModal(b); setConfirmRoomFloor(''); setConfirmRoom(''); }}
                                className={styles.assignRoomBtn}
                              >
                                <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                Assign room
                              </button>
                            )}
                            <button type="button" onClick={() => openEditModal(b)} className={styles.actionBtn}>Edit</button>
                            <button type="button" onClick={() => handleDelete(b._id)} className={`${styles.actionBtn} ${styles.actionBtnDanger}`}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Booking Modal (Create / Edit) */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{editId ? 'Edit Booking' : 'Create New Booking'}</h2>
              <button type="button" className={styles.closeBtn} onClick={() => setIsModalOpen(false)} aria-label="Close">&times;</button>
            </div>
            
            <div className={styles.modalBody}>
              {success && (
                <div className={styles.successBox}>
                  <div className={styles.successTitle}>Booking created</div>
                  <div className={styles.successSub}>Share this OTP with the guest for kiosk check-in:</div>
                  <div className={styles.successOtp}>{success.otp}</div>
                </div>
              )}

              {error && <div className={styles.errorBox}>{error}</div>}

              <form id="booking-form" onSubmit={handleSubmit} className={styles.formGrid}>
                <div className={styles.formField}>
                  <label className={styles.label}>Guest Name</label>
                  <input className={styles.input} value={form.guest_name} onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))} placeholder="John Doe" required />
                </div>
                <div className={styles.formField}>
                  <label className={styles.label}>Phone Number</label>
                  <input className={styles.input} value={form.guest_phone} onChange={e => setForm(f => ({ ...f, guest_phone: e.target.value }))} placeholder="+1 234 567 890" required />
                </div>
                
                <div className={styles.formField}>
                  <label className={styles.label}>Select Floor</label>
                  <select 
                    className={styles.select} 
                    value={selectedFloor} 
                    onChange={e => {
                      setSelectedFloor(e.target.value);
                      setForm(f => ({ ...f, room_no: '' })); // Reset room on floor change
                    }} 
                    required
                  >
                    <option value="" disabled>Choose a floor...</option>
                    {availableFloors.map(f => (
                      <option key={f._id} value={f._id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formField}>
                  <label className={styles.label}>Select Room</label>
                  <select 
                    className={styles.select} 
                    value={form.room_no} 
                    onChange={e => setForm(f => ({ ...f, room_no: e.target.value }))} 
                    required
                    disabled={!selectedFloor}
                  >
                    <option value="" disabled>Choose a room...</option>
                    {availableRooms.filter(r => r.floor_id?._id === selectedFloor).map(r => {
                      const available = isRoomAvailable(r.room_no);
                      return (
                        <option key={r._id} value={r.room_no} disabled={!available}>
                          Room {r.room_no} {!available && '(Occupied)'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className={styles.formField}>
                  <label className={styles.label}>Check-in Date & Time</label>
                  <input 
                    type="datetime-local"
                    className={styles.input} 
                    value={form.check_in ? form.check_in.replace(' ', 'T') : ''} 
                    onChange={e => setForm(f => ({ ...f, check_in: e.target.value.replace('T', ' ') }))} 
                    required 
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.label}>Check-out Date & Time</label>
                  <input 
                    type="datetime-local"
                    className={styles.input} 
                    value={form.check_out ? form.check_out.replace(' ', 'T') : ''} 
                    onChange={e => setForm(f => ({ ...f, check_out: e.target.value.replace('T', ' ') }))} 
                    required 
                  />
                </div>

                <div className={styles.formField}>
                  <label className={styles.label}>Booking Source</label>
                  <select className={styles.select} value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                    <option value="direct">Direct</option>
                    <option value="offline">Offline</option>
                    <option value="airbnb">Airbnb</option>
                    <option value="booking.com">Booking.com</option>
                    <option value="goibibo">Goibibo</option>
                    <option value="makemytrip">MakeMyTrip</option>
                  </select>
                </div>

                <div className={styles.formField}>
                  <label className={styles.label}>Payment Status</label>
                  <select className={styles.select} value={form.payment_status} onChange={e => setForm(f => ({ ...f, payment_status: e.target.value }))}>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="partial">Partial</option>
                  </select>
                </div>

                <div className={styles.formField}>
                  <label className={styles.label}>Amount (₹)</label>
                  <input type="number" className={styles.input} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} min="0" />
                </div>

                <div className={`${styles.formField} ${styles.fullWidth}`}>
                  <label className={styles.label}>Guest Email (optional)</label>
                  <input type="email" className={styles.input} value={form.guest_email} onChange={e => setForm(f => ({ ...f, guest_email: e.target.value }))} />
                </div>

                <div className={`${styles.formField} ${styles.fullWidth}`}>
                  <label className={styles.label}>Notes (optional)</label>
                  <input className={styles.input} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>

                {editId && (
                  <div className={`${styles.formField} ${styles.fullWidth}`}>
                    <label className={styles.label}>Booking Status</label>
                    <select 
                      className={styles.select}
                      value={form.status} 
                      onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    >
                      <option value="pending">Pending</option>
                      <option value="checked_in">Checked In</option>
                      <option value="checked_out">Checked Out</option>
                    </select>
                  </div>
                )}

                {editId && form.id_proof_status === 'uploaded' && form.id_proof && (
                  <div className={`${styles.formField} ${styles.fullWidth} ${styles.idProofPanel}`}>
                    <label className={`${styles.label} ${styles.idProofLabel}`}>Guest ID document</label>
                    <div className={styles.idProofStack}>
                      <img
                        src={`/api/documents/${form.id_proof}`}
                        alt="Guest ID proof"
                        className={styles.idProofImage}
                      />
                      <a href={`/api/documents/${form.id_proof}?download=true`} download className={`${styles.primaryBtn} ${styles.downloadLinkBtn}`}>
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download document
                      </a>
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button form="booking-form" type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Saving...' : editId ? 'Update Booking' : 'Create Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OTA ASSIGN ROOM & CONFIRM MODAL */}
      {confirmModal && (
        <div className={styles.modalOverlay} onClick={() => setConfirmModal(null)}>
          <div className={`${styles.modalContent} ${styles.modalNarrow}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Assign room and confirm</h2>
              <button type="button" className={styles.closeBtn} onClick={() => setConfirmModal(null)} aria-label="Close">&times;</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.confirmSummary}>
                <div className={styles.confirmSummaryName}>{confirmModal.guest_name}</div>
                <div className={styles.confirmSummaryDates}>
                  {formatStayDisplay(confirmModal.check_in)} — {formatStayDisplay(confirmModal.check_out)}
                </div>
                <div className={styles.confirmSummaryRow}>
                  <span className={styles.sourcePill}>{confirmModal.source}</span>
                </div>
              </div>
              <p className={styles.confirmHint}>
                Select the room to assign. An OTP will be generated for kiosk check-in.
              </p>
              <div className={styles.formField}>
                <label className={styles.label}>Filter by floor</label>
                <select className={styles.select} value={confirmRoomFloor} onChange={e => { setConfirmRoomFloor(e.target.value); setConfirmRoom(''); }}>
                  <option value="">All floors</option>
                  {availableFloors.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                </select>
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>Room</label>
                <select className={styles.select} value={confirmRoom} onChange={e => setConfirmRoom(e.target.value)} required>
                  <option value="">Choose a room…</option>
                  {availableRooms
                    .filter(r => !confirmRoomFloor || r.floor_id?._id === confirmRoomFloor)
                    .map(r => {
                      const occupied = bookings.some(b =>
                        b.room_no === r.room_no &&
                        b._id !== confirmModal._id &&
                        ['pending', 'confirmed', 'checked_in'].includes(b.status)
                      );
                      return (
                        <option key={r._id} value={r.room_no} disabled={occupied}>
                          Room {r.room_no}{r.name && r.name !== r.room_no ? ` — ${r.name}` : ''}{occupied ? ' (Occupied)' : ''}
                        </option>
                      );
                    })}
                </select>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setConfirmModal(null)}>Cancel</button>
              <button
                type="button"
                className={styles.submitBtn}
                disabled={!confirmRoom || confirmLoading}
                onClick={handleConfirmOTA}
              >
                {confirmLoading ? 'Confirming…' : 'Confirm and generate OTP'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmedOtp && (
        <div className={`${styles.modalOverlay} ${styles.modalOverlayElevated}`} onClick={() => setConfirmedOtp(null)}>
          <div className={`${styles.modalContent} ${styles.otpSuccessModal}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Booking confirmed</h2>
              <button type="button" className={styles.closeBtn} onClick={() => setConfirmedOtp(null)} aria-label="Close">&times;</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.successBox}>
                <p className={styles.successSub}>Share this OTP with the guest for kiosk check-in:</p>
                <div className={styles.successOtp}>{confirmedOtp}</div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.submitBtn} onClick={() => setConfirmedOtp(null)}>Dismiss</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
