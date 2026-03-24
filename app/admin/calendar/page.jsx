'use client';
import { useEffect, useState } from 'react';
import styles from '../admin.module.css';
import AdminSidebar from '../AdminSidebar';

export default function CalendarPage() {
  const [rooms, setRooms] = useState([]);
  const [syncLoading, setSyncLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/rooms').then((r) => r.json()).then((d) => setRooms(d.rooms || []));
  }, []);

  async function triggerSync() {
    setSyncLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/calendar/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      const ok = (data.results || []).filter((r) => r.status === 'ok').length;
      const fail = (data.results || []).filter((r) => r.status === 'error').length;
      setMessage(`Synced ${ok} source(s)${fail ? `, ${fail} failed` : ''}.`);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setSyncLoading(false);
    }
  }

  return (
    <div className={styles.layout}>
      <AdminSidebar activePath="/admin/calendar" />
      <div className={styles.mainContainer}>
        <header className={styles.topbar}>
          <h2 className={styles.topbarTitle}>Calendar Sync</h2>
        </header>
        <main className={styles.content}>
          <div className={styles.toolbar}>
            <div className={styles.stats}>Manage inbound OTA imports and outbound room calendars.</div>
            <button className={styles.primaryBtn} onClick={triggerSync} disabled={syncLoading}>
              {syncLoading ? 'Syncing...' : 'Run Full Sync'}
            </button>
          </div>
          {message && <div className={styles.card} style={{ padding: 16, marginBottom: 16 }}>{message}</div>}
          <div className={styles.card}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Room</th>
                    <th className={styles.th}>Configured OTA Sources</th>
                    <th className={styles.th}>Export URL</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room) => (
                    <tr key={room._id} className={styles.tr}>
                      <td className={styles.td}>{room.room_no}</td>
                      <td className={styles.td}>{(room.ical_sources || []).length}</td>
                      <td className={styles.td}>
                        <code>{`${typeof window !== 'undefined' ? window.location.origin : ''}/api/calendar/room/${room._id}`}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
