'use client';
import { useState, useEffect } from 'react';
import styles from './admin.module.css';
import AdminSidebar from './AdminSidebar';

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
      setSyncResult(`✅ Synced ${ok} source${ok !== 1 ? 's' : ''}${fail > 0 ? `, ⚠️ ${fail} failed` : ''}`);
      fetchBookings();
    } catch (e) {
      setSyncResult(`⚠️ ${e.message}`);
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

      {/* Main Content Area */}
      <div className={styles.mainContainer}>
        <header className={styles.topbar}>
          <h2 className={styles.topbarTitle}>Dashboard Overview</h2>
        </header>

        <main className={styles.content}>
          <div className={styles.toolbar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div className={styles.tabsMenu}>
                <button className={`${styles.tabBtn} ${activeTab==='all' ? styles.tabActive : ''}`} onClick={() => setActiveTab('all')}>All Bookings</button>
                <button className={`${styles.tabBtn} ${activeTab==='checked_in' ? styles.tabActive : ''}`} onClick={() => setActiveTab('checked_in')}>In-House</button>
                <button className={`${styles.tabBtn} ${activeTab==='pending' ? styles.tabActive : ''}`} onClick={() => setActiveTab('pending')}>Waiting</button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px 8px' }}>
                <span style={{ fontSize: '13px', color: '#64748b', marginRight: '8px' }}>Date:</span>
                <input 
                  type="date" 
                  value={filterDate} 
                  onChange={e => setFilterDate(e.target.value)} 
                  style={{ border: 'none', outline: 'none', fontSize: '13px', color: '#0f172a', background: 'transparent' }}
                  title="Filter by Date"
                />
                {filterDate && (
                  <button onClick={() => setFilterDate('')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px', padding: '0 4px', fontWeight: 'bold' }}>&times;</button>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div className={styles.stats}>
                Showing <strong>{filteredBookings.length}</strong> {filteredBookings.length === 1 ? 'booking' : 'bookings'}
              </div>
              {syncResult && <span style={{ fontSize: 13, color: '#64748b' }}>{syncResult}</span>}
              <button
                onClick={handleOTASync}
                disabled={syncLoading}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', cursor: syncLoading ? 'default' : 'pointer', fontSize: 13, color: '#475569', opacity: syncLoading ? 0.7 : 1 }}
              >
                {syncLoading ? '🔄 Syncing...' : '🔄 Sync from OTAs'}
              </button>
              <button onClick={openCreateModal} className={styles.primaryBtn}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{b.guest_phone}</div>
                          {b.guest_email && <div style={{ fontSize: '12px', color: '#94a3b8' }}>{b.guest_email}</div>}
                        </td>
                        <td className={styles.td}>
                          <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 99, background: '#f1f5f9', color: '#475569', fontWeight: 600, textTransform: 'capitalize' }}>
                            {b.source || 'direct'}
                          </span>
                        </td>
                        <td className={styles.td}>
                          <span className={styles.roomTag}>{b.room_no}</span>
                        </td>
                        <td className={styles.td}>
                          <div style={{ fontSize: '14px', color: '#0f172a' }}>{b.check_in}</div>
                          <div style={{ fontSize: '13px', color: isOverdue ? '#dc2626' : '#64748b', marginTop: '4px', fontWeight: isOverdue ? 'bold' : 'normal' }}>
                            to {b.check_out} {isOverdue && '(Overdue!)'}
                          </div>
                        </td>
                        <td className={styles.td}>
                          <span className={styles.otpCode}>{b.otp}</span>
                        </td>
                        <td className={styles.td}>
                          {b.id_proof_status === 'uploaded' && b.id_proof ? (
                            <button onClick={() => openEditModal(b)} className={styles.actionBtn}>View Details</button>
                          ) : (
                            <span style={{ color: '#888', fontSize: '13px' }}>Pending</span>
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
                                onClick={() => { setConfirmModal(b); setConfirmRoomFloor(''); setConfirmRoom(''); }}
                                style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid #f59e0b', background: '#fffbeb', color: '#92400e', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                              >
                                🏠 Assign Room
                              </button>
                            )}
                            <button onClick={() => openEditModal(b)} className={styles.actionBtn}>Edit</button>
                            <button onClick={() => handleDelete(b._id)} className={`${styles.actionBtn} ${styles.actionBtnDanger}`}>Del</button>
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
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            
            <div className={styles.modalBody}>
              {success && (
                <div className={styles.successBox}>
                  <div style={{ fontWeight: 600 }}>✅ Booking Created Successfully!</div>
                  <div style={{ fontSize: '14px', color: '#047857', marginTop: '8px' }}>Share this OTP with the guest for kiosk check-in:</div>
                  <div className={styles.successOtp}>{success.otp}</div>
                </div>
              )}

              {error && <div className={styles.errorBox}>⚠️ {error}</div>}

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
                  <div className={`${styles.formField} ${styles.fullWidth}`} style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <label className={styles.label} style={{ marginBottom: 12 }}>Guest ID Document</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
                      <img 
                        src={`/api/documents/${form.id_proof}`} 
                        alt="ID Proof" 
                        style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 8, border: '1px solid #cbd5e1', objectFit: 'contain', background: '#fff' }} 
                      />
                      <a href={`/api/documents/${form.id_proof}?download=true`} download className={styles.primaryBtn} style={{ textDecoration: 'none' }}>
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Document
                      </a>
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>Cancel</button>
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
          <div className={styles.modalContent} style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>🏠 Assign Room & Confirm Booking</h2>
              <button className={styles.closeBtn} onClick={() => setConfirmModal(null)}>&times;</button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', marginBottom: 20, fontSize: 14 }}>
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{confirmModal.guest_name}</div>
                <div style={{ color: '#64748b', fontSize: 13 }}>{confirmModal.check_in} → {confirmModal.check_out}</div>
                <div style={{ marginTop: 6 }}>
                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 99, background: '#f1f5f9', color: '#475569', fontWeight: 600, textTransform: 'capitalize' }}>
                    {confirmModal.source}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                Select the room to assign. An OTP will be auto-generated for kiosk check-in.
              </p>
              <div style={{ marginBottom: 12 }}>
                <label className={styles.label}>Filter by Floor</label>
                <select className={styles.select} value={confirmRoomFloor} onChange={e => { setConfirmRoomFloor(e.target.value); setConfirmRoom(''); }}>
                  <option value="">All Floors</option>
                  {availableFloors.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className={styles.label}>Select Room *</label>
                <select className={styles.select} value={confirmRoom} onChange={e => setConfirmRoom(e.target.value)} required>
                  <option value="">Choose a room...</option>
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
              <button className={styles.cancelBtn} onClick={() => setConfirmModal(null)}>Cancel</button>
              <button
                className={styles.submitBtn}
                disabled={!confirmRoom || confirmLoading}
                onClick={handleConfirmOTA}
              >
                {confirmLoading ? 'Confirming...' : '✅ Confirm & Generate OTP'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OTP SUCCESS BANNER — shown after confirming OTA booking */}
      {confirmedOtp && (
        <div style={{
          position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#0f172a', color: '#fff', borderRadius: 16, padding: '20px 32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)', zIndex: 2000, textAlign: 'center', minWidth: 320,
        }}>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>✅ Booking Confirmed! Share this OTP with guest:</div>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '0.15em', color: '#a5f3fc', fontFamily: 'monospace', margin: '8px 0' }}>{confirmedOtp}</div>
          <button
            onClick={() => setConfirmedOtp(null)}
            style={{ marginTop: 12, padding: '6px 20px', borderRadius: 8, background: '#1e293b', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: 13 }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
