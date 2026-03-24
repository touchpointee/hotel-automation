'use client';
import { useState, useEffect } from 'react';
import styles from '../admin.module.css';
import AdminSidebar from '../AdminSidebar';

export default function RoomsPage() {
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  
  const [isFloorModalOpen, setIsFloorModalOpen] = useState(false);
  const [editFloorId, setEditFloorId] = useState(null);
  const initialFloorForm = { name: '', directions: '' };
  const [floorForm, setFloorForm] = useState(initialFloorForm);

  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editRoomId, setEditRoomId] = useState(null);
  const initialRoomForm = { room_no: '', floor_id: '', directions: '' };
  const [roomForm, setRoomForm] = useState(initialRoomForm);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // OTA Calendar Sync
  const [syncRoom, setSyncRoom] = useState(null);
  const [icalSources, setIcalSources] = useState([]);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => { 
    fetchFloors(); 
    fetchRooms(); 
  }, []);

  async function fetchFloors() {
    try {
      const res = await fetch('/api/floors');
      const data = await res.json();
      setFloors(data.floors || []);
    } catch (e) { console.error('Failed to fetch floors:', e); }
  }

  async function fetchRooms() {
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      setRooms(data.rooms || []);
    } catch (e) { console.error('Failed to fetch rooms:', e); }
  }

  // --- Floor Handlers ---
  function openFloorModal(floor = null) {
    if (floor) {
      setFloorForm({ name: floor.name, directions: floor.directions });
      setEditFloorId(floor._id);
    } else {
      setFloorForm(initialFloorForm);
      setEditFloorId(null);
    }
    setError('');
    setIsFloorModalOpen(true);
  }

  async function handleDeleteFloor(id) {
    if (!confirm('Are you sure you want to delete this floor? Ensure no rooms are assigned to it first.')) return;
    try {
      const res = await fetch(`/api/floors/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchFloors();
    } catch (e) { alert(e.message); }
  }

  async function handleFloorSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const url = editFloorId ? `/api/floors/${editFloorId}` : '/api/floors';
      const method = editFloorId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(floorForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIsFloorModalOpen(false);
      fetchFloors();
      fetchRooms();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  // --- Room Handlers ---
  function openRoomModal(room = null, autoFloorId = '') {
    if (room) {
      setRoomForm({ room_no: room.room_no, floor_id: room.floor_id?._id || '', directions: room.directions || '' });
      setEditRoomId(room._id);
    } else {
      setRoomForm({ ...initialRoomForm, floor_id: autoFloorId });
      setEditRoomId(null);
    }
    setError('');
    setIsRoomModalOpen(true);
  }

  async function handleDeleteRoom(id) {
    if (!confirm('Are you sure you want to delete this room mapping?')) return;
    try {
      const res = await fetch(`/api/rooms/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete room');
      fetchRooms();
    } catch (e) { alert(e.message); }
  }

  async function handleRoomSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const url = editRoomId ? `/api/rooms/${editRoomId}` : '/api/rooms';
      const method = editRoomId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIsRoomModalOpen(false);
      fetchRooms();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  // OTA Sync helpers
  function openSyncModal(room) {
    setSyncRoom(room);
    setIcalSources((room.ical_sources || []).map(s => ({ platform: s.platform, url: s.url, syncStatus: s.syncStatus })));
    setSyncMsg('');
    setCopiedUrl(false);
  }

  async function saveIcalSources() {
    if (!syncRoom) return;
    setSyncLoading(true); setSyncMsg('');
    try {
      const valid = icalSources.filter(s => s.url?.trim());
      const res = await fetch(`/api/rooms/${syncRoom._id}/ical`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icalSources: valid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSyncMsg('✅ Calendar sources saved! Click "Sync from OTAs" on the dashboard to sync now.');
      fetchRooms();
    } catch (err) { setSyncMsg(`⚠️ ${err.message}`); }
    finally { setSyncLoading(false); }
  }

  const unassignedRooms = rooms.filter(r => !r.floor_id || !floors.find(f => f._id === r.floor_id._id));

  return (
    <div className={styles.layout}>
      <AdminSidebar activePath="/admin/rooms" />

      <div className={styles.mainContainer}>
        <header className={styles.topbar}>
          <h2 className={styles.topbarTitle}>Hierarchical Floor Management</h2>
        </header>

        <main className={styles.content}>
          <div className={styles.toolbar}>
            <div>
              <h2 className={styles.subtitle}>Building Map</h2>
              <p className={styles.desc}>
                Organize DJ IMPERIALS into floors, then add rooms to them.
                This structure will guide guests during check-in.
              </p>
            </div>
            <button onClick={() => openFloorModal()} className={styles.primaryBtn}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add New Floor
            </button>
          </div>

          <div>
            {floors.length === 0 && (
              <div className={styles.card} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                No floors have been created yet. Click "Add New Floor" to get started!
              </div>
            )}

            {floors.map(floor => {
              const floorRooms = rooms.filter(r => r.floor_id?._id === floor._id);
              return (
                <div key={floor._id} className={styles.card} style={{ marginBottom: 32, overflow: 'visible' }}>
                  {/* Floor Header block */}
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        🏢 {floor.name}
                        <span style={{ fontSize: 12, backgroundColor: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>{floorRooms.length} Rooms</span>
                      </h3>
                      <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{floor.directions}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <button onClick={() => openRoomModal(null, floor._id)} className={styles.primaryBtn} style={{ padding: '6px 14px', fontSize: 13, backgroundColor: '#10b981' }}>+ Add Room Here</button>
                      <button onClick={() => openFloorModal(floor)} className={styles.actionBtn}>Edit Floor</button>
                      <button onClick={() => handleDeleteFloor(floor._id)} className={`${styles.actionBtn} ${styles.actionBtnDanger}`}>Del</button>
                    </div>
                  </div>

                  {/* Rooms List for this Floor */}
                  <div style={{ padding: floorRooms.length > 0 ? '0' : '24px' }}>
                    {floorRooms.length === 0 ? (
                      <div style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center' }}>No rooms assigned to this floor yet.</div>
                    ) : (
                      <table className={styles.table} style={{ margin: 0 }}>
                        <thead style={{ backgroundColor: '#ffffff' }}>
                          <tr>
                            <th className={styles.th}>Room / Door No.</th>
                            <th className={styles.th}>Additional Directions</th>
                            <th className={styles.th}>OTA Sync</th>
                            <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {floorRooms.map(r => (
                            <tr key={r._id} className={styles.tr}>
                              <td className={styles.td} style={{ width: '20%' }}><span className={styles.roomTag}>{r.room_no}</span></td>
                              <td className={styles.td}><span style={{ color: '#475569', fontSize: 13 }}>{r.directions || '-'}</span></td>
                              <td className={styles.td}>
                                <span style={{ fontSize: 11, color: (r.ical_sources||[]).length > 0 ? '#16a34a' : '#94a3b8' }}>
                                  {(r.ical_sources||[]).length} OTA{(r.ical_sources||[]).length !== 1 ? 's' : ''}
                                </span>
                              </td>
                              <td className={styles.td} style={{ textAlign: 'right', width: '25%' }}>
                                <div className={styles.actions} style={{ justifyContent: 'flex-end' }}>
                                  <button onClick={() => openRoomModal(r)} className={styles.actionBtn} style={{ padding: '4px 10px', fontSize: 12 }}>Edit</button>
                                  <button onClick={() => openSyncModal(r)} className={styles.actionBtn} style={{ padding: '4px 10px', fontSize: 12 }}>📅 Sync</button>
                                  <button onClick={() => handleDeleteRoom(r._id)} className={`${styles.actionBtn} ${styles.actionBtnDanger}`} style={{ padding: '4px 10px', fontSize: 12 }}>Del</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Orphaned Rooms */}
            {unassignedRooms.length > 0 && (
              <div className={styles.card} style={{ marginBottom: 32, border: '1px solid #fecaca' }}>
                <div style={{ padding: '16px 24px', backgroundColor: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: '#b91c1c' }}>⚠️ Unassigned Rooms</h3>
                </div>
                <table className={styles.table}>
                  <tbody>
                    {unassignedRooms.map(r => (
                      <tr key={r._id} className={styles.tr}>
                        <td className={styles.td}><span className={styles.roomTag}>{r.room_no}</span></td>
                        <td className={styles.td}><span style={{ color: '#475569', fontSize: 13 }}>Missing Floor Data</span></td>
                        <td className={styles.td} style={{ textAlign: 'right' }}>
                          <div className={styles.actions} style={{ justifyContent: 'flex-end' }}>
                            <button onClick={() => openRoomModal(r)} className={styles.actionBtn}>Reassign Floor</button>
                            <button onClick={() => handleDeleteRoom(r._id)} className={`${styles.actionBtn} ${styles.actionBtnDanger}`}>Del</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* FLOOR MODAL */}
      {isFloorModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsFloorModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{editFloorId ? 'Edit Floor Details' : 'Create New Floor'}</h2>
              <button className={styles.closeBtn} onClick={() => setIsFloorModalOpen(false)}>&times;</button>
            </div>
            <div className={styles.modalBody}>
              {error && <div className={styles.errorBox}>⚠️ {error}</div>}
              <form id="floor-form" onSubmit={handleFloorSubmit} className={styles.formGrid}>
                <div className={`${styles.formField} ${styles.fullWidth}`}>
                  <label className={styles.label}>Floor Name (e.g. Basement, Level 2)</label>
                  <input className={styles.input} value={floorForm.name} onChange={e => setFloorForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className={`${styles.formField} ${styles.fullWidth}`}>
                  <label className={styles.label}>Base Floor Directions (e.g. Take the west elevator to floor 2)</label>
                  <textarea className={styles.input} value={floorForm.directions} onChange={e => setFloorForm(f => ({ ...f, directions: e.target.value }))} required style={{ height: 100, resize: 'vertical' }} />
                </div>
              </form>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setIsFloorModalOpen(false)}>Cancel</button>
              <button form="floor-form" type="submit" className={styles.submitBtn} disabled={loading}>{loading ? 'Saving...' : 'Save Floor'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ROOM MODAL */}
      {isRoomModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsRoomModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{editRoomId ? 'Edit Room' : 'Add Room to Floor'}</h2>
              <button className={styles.closeBtn} onClick={() => setIsRoomModalOpen(false)}>&times;</button>
            </div>
            <div className={styles.modalBody}>
              {error && <div className={styles.errorBox}>⚠️ {error}</div>}
              <form id="room-form" onSubmit={handleRoomSubmit} className={styles.formGrid}>
                <div className={styles.formField}>
                  <label className={styles.label}>Room / Door Number (Unique)</label>
                  <input className={styles.input} value={roomForm.room_no} onChange={e => setRoomForm(f => ({ ...f, room_no: e.target.value }))} placeholder="e.g. 201" required />
                </div>
                <div className={styles.formField}>
                  <label className={styles.label}>Assigned Floor</label>
                  <select className={styles.select} value={roomForm.floor_id} onChange={e => setRoomForm(f => ({ ...f, floor_id: e.target.value }))} required>
                    <option value="" disabled>Select Floor</option>
                    {floors.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                  </select>
                </div>
                <div className={`${styles.formField} ${styles.fullWidth}`}>
                  <label className={styles.label}>Specific Door Directions (Optional)</label>
                  <textarea className={styles.input} value={roomForm.directions} onChange={e => setRoomForm(f => ({ ...f, directions: e.target.value }))} placeholder="e.g. First door on the left." style={{ height: 80, resize: 'vertical' }} />
                </div>
              </form>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setIsRoomModalOpen(false)}>Cancel</button>
              <button form="room-form" type="submit" className={styles.submitBtn} disabled={loading}>{loading ? 'Saving...' : 'Save Room'}</button>
            </div>
          </div>
        </div>
      )}

      {/* OTA CALENDAR SYNC MODAL */}
      {syncRoom && (
        <div className={styles.modalOverlay} onClick={() => { setSyncRoom(null); setSyncMsg(''); }}>
          <div className={styles.modalContent} style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>📅 OTA Calendar Sync – {syncRoom.room_no}</h2>
              <button className={styles.closeBtn} onClick={() => { setSyncRoom(null); setSyncMsg(''); }}>&times;</button>
            </div>
            <div className={styles.modalBody}>
              {/* Export URL */}
              <div style={{ marginBottom: 20 }}>
                <label className={styles.label}>Your hotel calendar URL (share with OTAs so they can import your bookings)</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <input readOnly value={typeof window !== 'undefined' ? `${window.location.origin}/api/calendar/room/${syncRoom._id}` : ''}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 12, fontFamily: 'monospace', background: '#f8fafc' }} />
                  <button
                    onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}/api/calendar/room/${syncRoom._id}`); setCopiedUrl(true); setTimeout(() => setCopiedUrl(false), 2000); }}
                    style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: copiedUrl ? '#d1fae5' : '#fff', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}
                  >{copiedUrl ? '✅ Copied!' : '📋 Copy'}</button>
                </div>
              </div>

              {/* iCal Sources */}
              <div style={{ marginBottom: 16 }}>
                <label className={styles.label}>Import bookings FROM OTAs (paste their iCal export URL below)</label>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 10px' }}>On Airbnb/Booking.com go to Availability → Export calendar → Copy link. Paste it here.</p>
                {icalSources.map((src, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <select value={src.platform}
                      onChange={e => setIcalSources(s => s.map((x, j) => j === i ? { ...x, platform: e.target.value } : x))}
                      style={{ width: 130, padding: '7px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, flexShrink: 0 }}>
                      <option value="airbnb">Airbnb</option>
                      <option value="booking.com">Booking.com</option>
                      <option value="goibibo">Goibibo</option>
                      <option value="makemytrip">MakeMyTrip</option>
                      <option value="direct">Other</option>
                    </select>
                    <input placeholder="Paste iCal URL..." value={src.url}
                      onChange={e => setIcalSources(s => s.map((x, j) => j === i ? { ...x, url: e.target.value } : x))}
                      style={{ flex: 1, padding: '7px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 12, fontFamily: 'monospace' }} />
                    {src.syncStatus && <span style={{ fontSize: 11, color: src.syncStatus === 'success' ? '#16a34a' : '#dc2626', whiteSpace: 'nowrap' }}>{src.syncStatus}</span>}
                    <button onClick={() => setIcalSources(s => s.filter((_, j) => j !== i))}
                      style={{ padding: '5px 10px', borderRadius: 8, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
                <button onClick={() => setIcalSources(s => [...s, { platform: 'airbnb', url: '' }])}
                  style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px dashed #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: 13, color: '#64748b', marginTop: 4 }}>
                  + Add OTA Calendar
                </button>
              </div>

              {syncMsg && <div style={{ fontSize: 13, marginBottom: 8 }}>{syncMsg}</div>}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => { setSyncRoom(null); setSyncMsg(''); }}>Cancel</button>
              <button className={styles.submitBtn} disabled={syncLoading} onClick={saveIcalSources}>
                {syncLoading ? 'Saving...' : 'Save Sources'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

