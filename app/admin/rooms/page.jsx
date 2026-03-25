'use client';
import { useState, useEffect } from 'react';
import styles from '../admin.module.css';
import AdminSidebar from '../AdminSidebar';

export default function RoomsPage() {
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);

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

  const [syncRoom, setSyncRoom] = useState(null);
  const [icalSources, setIcalSources] = useState([]);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    fetchFloors();
    fetchRooms();
    fetchBookings();
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

  async function fetchBookings() {
    try {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (e) { console.error('Failed to fetch bookings:', e); }
  }

  function getRoomAvailability(roomNo) {
    const roomBookings = bookings.filter((b) => String(b.room_no) === String(roomNo));
    const hasCheckedIn = roomBookings.some((b) => {
      const st = String(b.status || '');
      return st === 'checked_in' || st === 'checked-in';
    });
    return hasCheckedIn ? { key: 'checked_in', label: 'Checked In' } : { key: 'free', label: 'Free' };
  }

  function getAvailabilityBadgeClass(key) {
    switch (key) {
      case 'checked_in':
        return styles.badgeCheckedIn;
      case 'free':
      default:
        return styles.badgeCheckedOut;
    }
  }

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
      setSyncMsg('Calendar sources saved. Use “Sync from OTAs” on the dashboard to run a sync now.');
      fetchRooms();
    } catch (err) { setSyncMsg(`Error: ${err.message}`); }
    finally { setSyncLoading(false); }
  }

  const unassignedRooms = rooms.filter(r => !r.floor_id || !floors.find(f => f._id === r.floor_id._id));

  return (
    <div className={styles.layout}>
      <AdminSidebar activePath="/admin/rooms" />
      <div className={styles.mainContainer}>
        <header className={styles.topbar}>
          <div className={styles.topbarStack}>
            <h2 className={styles.topbarTitle}>Rooms and floors</h2>
            <p className={styles.pageIntro}>Define floors and rooms, then attach OTA calendar feeds per room.</p>
          </div>
        </header>

        <main className={styles.content}>
          <div className={styles.toolbar}>
            <div>
              <h2 className={styles.subtitle}>Building map</h2>
              <p className={styles.desc}>
                Organize DJ IMPERIALS into floors, then add rooms to them.
                This structure guides guests during check-in.
              </p>
            </div>
            <button type="button" onClick={() => openFloorModal()} className={styles.primaryBtn}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add floor
            </button>
          </div>

          <div>
            {floors.length === 0 && (
              <div className={`${styles.card} ${styles.emptyStateCard}`}>
                No floors yet. Add a floor to get started.
              </div>
            )}

            {floors.map(floor => {
              const floorRooms = rooms.filter(r => r.floor_id?._id === floor._id);
              return (
                <div key={floor._id} className={`${styles.card} ${styles.floorCard}`}>
                  <div className={styles.floorCardHeader}>
                    <div>
                      <h3 className={styles.floorTitleRow}>
                        <svg width={20} height={20} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className={styles.navIcon} aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {floor.name}
                        <span className={styles.floorRoomBadge}>{floorRooms.length} rooms</span>
                      </h3>
                      <div className={styles.floorDirections}>{floor.directions}</div>
                    </div>
                    <div className={styles.floorHeaderActions}>
                      <button type="button" onClick={() => openRoomModal(null, floor._id)} className={styles.successAccentBtn}>
                        Add room here
                      </button>
                      <button type="button" onClick={() => openFloorModal(floor)} className={styles.actionBtn}>Edit floor</button>
                      <button type="button" onClick={() => handleDeleteFloor(floor._id)} className={`${styles.actionBtn} ${styles.actionBtnDanger}`}>Delete</button>
                    </div>
                  </div>

                  <div className={floorRooms.length > 0 ? styles.roomsTableSection : styles.roomsTableSectionEmpty}>
                    {floorRooms.length === 0 ? (
                      <div className={styles.roomsEmptyHint}>No rooms on this floor yet.</div>
                    ) : (
                      <table className={`${styles.table} ${styles.tableNoMargin}`}>
                        <thead className={styles.theadPlain}>
                          <tr>
                            <th className={styles.th}>Room / door no.</th>
                            <th className={styles.th}>Directions</th>
                            <th className={styles.th}>OTA sync</th>
                            <th className={`${styles.th} ${styles.thRight}`}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {floorRooms.map(r => {
                            const av = getRoomAvailability(r.room_no);
                            return (
                              <tr key={r._id} className={styles.tr}>
                                <td className={`${styles.td} ${styles.w20}`}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <span className={styles.roomTag}>{r.room_no}</span>
                                    <span className={`${styles.badge} ${getAvailabilityBadgeClass(av.key)}`}>
                                      {av.label}
                                    </span>
                                  </div>
                                </td>
                                <td className={styles.td}><span className={styles.cellMuted}>{r.directions || '—'}</span></td>
                                <td className={styles.td}>
                                <span className={`${styles.otaCount} ${(r.ical_sources || []).length > 0 ? styles.otaCountOn : styles.otaCountOff}`}>
                                  {(r.ical_sources || []).length} feed{(r.ical_sources || []).length !== 1 ? 's' : ''}
                                </span>
                                </td>
                                <td className={`${styles.td} ${styles.tdRight} ${styles.w25}`}>
                                  <div className={`${styles.actions} ${styles.actionsEnd}`}>
                                    <button type="button" onClick={() => openRoomModal(r)} className={styles.actionBtnSm}>Edit</button>
                                    <button type="button" onClick={() => openSyncModal(r)} className={styles.actionBtnSm}>
                                      <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden style={{ marginRight: 4, verticalAlign: 'middle' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      Sync
                                    </button>
                                    <button type="button" onClick={() => handleDeleteRoom(r._id)} className={`${styles.actionBtnSm} ${styles.actionBtnDanger}`}>Delete</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              );
            })}

            {unassignedRooms.length > 0 && (
              <div className={`${styles.card} ${styles.warningCard} ${styles.floorCard}`}>
                <div className={styles.warningCardHeader}>
                  <h3 className={styles.warningCardTitle}>Unassigned rooms</h3>
                </div>
                <table className={styles.table}>
                  <tbody>
                    {unassignedRooms.map(r => (
                      <tr key={r._id} className={styles.tr}>
                        <td className={styles.td}><span className={styles.roomTag}>{r.room_no}</span></td>
                        <td className={styles.td}><span className={styles.cellMuted}>Missing floor</span></td>
                        <td className={`${styles.td} ${styles.tdRight}`}>
                          <div className={`${styles.actions} ${styles.actionsEnd}`}>
                            <button type="button" onClick={() => openRoomModal(r)} className={styles.actionBtn}>Reassign floor</button>
                            <button type="button" onClick={() => handleDeleteRoom(r._id)} className={`${styles.actionBtn} ${styles.actionBtnDanger}`}>Delete</button>
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

      {isFloorModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsFloorModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{editFloorId ? 'Edit floor' : 'New floor'}</h2>
              <button type="button" className={styles.closeBtn} onClick={() => setIsFloorModalOpen(false)} aria-label="Close">&times;</button>
            </div>
            <div className={styles.modalBody}>
              {error && <div className={styles.errorBox}>{error}</div>}
              <form id="floor-form" onSubmit={handleFloorSubmit} className={styles.formGrid}>
                <div className={`${styles.formField} ${styles.fullWidth}`}>
                  <label className={styles.label}>Floor name</label>
                  <input className={styles.input} value={floorForm.name} onChange={e => setFloorForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className={`${styles.formField} ${styles.fullWidth}`}>
                  <label className={styles.label}>Directions for this floor</label>
                  <textarea className={`${styles.input} ${styles.textarea}`} value={floorForm.directions} onChange={e => setFloorForm(f => ({ ...f, directions: e.target.value }))} required />
                </div>
              </form>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setIsFloorModalOpen(false)}>Cancel</button>
              <button form="floor-form" type="submit" className={styles.submitBtn} disabled={loading}>{loading ? 'Saving…' : 'Save floor'}</button>
            </div>
          </div>
        </div>
      )}

      {isRoomModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsRoomModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{editRoomId ? 'Edit room' : 'Add room'}</h2>
              <button type="button" className={styles.closeBtn} onClick={() => setIsRoomModalOpen(false)} aria-label="Close">&times;</button>
            </div>
            <div className={styles.modalBody}>
              {error && <div className={styles.errorBox}>{error}</div>}
              <form id="room-form" onSubmit={handleRoomSubmit} className={styles.formGrid}>
                <div className={styles.formField}>
                  <label className={styles.label}>Room / door number</label>
                  <input className={styles.input} value={roomForm.room_no} onChange={e => setRoomForm(f => ({ ...f, room_no: e.target.value }))} placeholder="e.g. 201" required />
                </div>
                <div className={styles.formField}>
                  <label className={styles.label}>Floor</label>
                  <select className={styles.select} value={roomForm.floor_id} onChange={e => setRoomForm(f => ({ ...f, floor_id: e.target.value }))} required>
                    <option value="" disabled>Select floor</option>
                    {floors.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                  </select>
                </div>
                <div className={`${styles.formField} ${styles.fullWidth}`}>
                  <label className={styles.label}>Door directions (optional)</label>
                  <textarea className={`${styles.input} ${styles.textarea} ${styles.textareaSm}`} value={roomForm.directions} onChange={e => setRoomForm(f => ({ ...f, directions: e.target.value }))} placeholder="e.g. First door on the left." />
                </div>
              </form>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setIsRoomModalOpen(false)}>Cancel</button>
              <button form="room-form" type="submit" className={styles.submitBtn} disabled={loading}>{loading ? 'Saving…' : 'Save room'}</button>
            </div>
          </div>
        </div>
      )}

      {syncRoom && (
        <div className={styles.modalOverlay} onClick={() => { setSyncRoom(null); setSyncMsg(''); }}>
          <div className={`${styles.modalContent} ${styles.syncModalWide}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Calendar sync — room {syncRoom.room_no}</h2>
              <button type="button" className={styles.closeBtn} onClick={() => { setSyncRoom(null); setSyncMsg(''); }} aria-label="Close">&times;</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.syncBlock}>
                <label className={styles.label}>Export URL (share with OTAs)</label>
                <div className={styles.copyRow}>
                  <input
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/api/calendar/room/${syncRoom._id}` : ''}
                    className={styles.monoReadonly}
                  />
                  <button
                    type="button"
                    className={`${styles.copyBtn} ${copiedUrl ? styles.copyBtnDone : ''}`}
                    onClick={async () => {
                      await navigator.clipboard.writeText(`${window.location.origin}/api/calendar/room/${syncRoom._id}`);
                      setCopiedUrl(true);
                      setTimeout(() => setCopiedUrl(false), 2000);
                    }}
                  >
                    {copiedUrl ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className={styles.syncBlock}>
                <label className={styles.label}>Import from OTAs (iCal URL)</label>
                <p className={styles.syncHint}>In Airbnb or Booking.com: Availability → Export calendar → copy the link and paste it below.</p>
                {icalSources.map((src, i) => (
                  <div key={i} className={styles.syncFieldRow}>
                    <select
                      value={src.platform}
                      onChange={e => setIcalSources(s => s.map((x, j) => j === i ? { ...x, platform: e.target.value } : x))}
                      className={styles.syncPlatformSelect}
                    >
                      <option value="airbnb">Airbnb</option>
                      <option value="booking.com">Booking.com</option>
                      <option value="goibibo">Goibibo</option>
                      <option value="makemytrip">MakeMyTrip</option>
                      <option value="direct">Other</option>
                    </select>
                    <input
                      placeholder="Paste iCal URL…"
                      value={src.url}
                      onChange={e => setIcalSources(s => s.map((x, j) => j === i ? { ...x, url: e.target.value } : x))}
                      className={styles.syncUrlInput}
                    />
                    {src.syncStatus && (
                      <span className={`${styles.syncStatusTag} ${src.syncStatus === 'success' ? styles.syncStatusOk : styles.syncStatusErr}`}>{src.syncStatus}</span>
                    )}
                    <button type="button" className={styles.removeIcalBtn} onClick={() => setIcalSources(s => s.filter((_, j) => j !== i))} aria-label="Remove feed">×</button>
                  </div>
                ))}
                <button type="button" className={styles.addIcalBtn} onClick={() => setIcalSources(s => [...s, { platform: 'airbnb', url: '' }])}>
                  Add OTA feed
                </button>
              </div>

              {syncMsg && <div className={styles.syncFeedback}>{syncMsg}</div>}
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => { setSyncRoom(null); setSyncMsg(''); }}>Cancel</button>
              <button type="button" className={styles.submitBtn} disabled={syncLoading} onClick={saveIcalSources}>
                {syncLoading ? 'Saving…' : 'Save sources'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
