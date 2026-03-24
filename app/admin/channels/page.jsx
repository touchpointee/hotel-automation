'use client';
import { useEffect, useMemo, useState } from 'react';
import styles from '../admin.module.css';
import AdminSidebar from '../AdminSidebar';

export default function ChannelsPage() {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    fetch('/api/rooms').then((r) => r.json()).then((d) => setRooms(d.rooms || []));
  }, []);

  const totals = useMemo(() => {
    const counts = {};
    for (const room of rooms) {
      for (const src of room.ical_sources || []) {
        const key = src.platform || src.channel || 'other';
        counts[key] = (counts[key] || 0) + 1;
      }
    }
    return counts;
  }, [rooms]);

  return (
    <div className={styles.layout}>
      <AdminSidebar activePath="/admin/channels" />
      <div className={styles.mainContainer}>
        <header className={styles.topbar}>
          <div className={styles.topbarStack}>
            <h2 className={styles.topbarTitle}>OTA connections</h2>
            <p className={styles.pageIntro}>Summary of feeds linked across rooms. Add or edit feeds under each room.</p>
          </div>
        </header>
        <main className={styles.content}>
          <div className={`${styles.card} ${styles.cardPad}`}>
            <p className={styles.stats}>
              Configure feeds in{' '}
              <a href="/admin/rooms" className={styles.textLink}>Rooms and floors</a>
              .
            </p>
          </div>
          <div className={styles.card}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Channel</th>
                    <th className={styles.th}>Feeds</th>
                    <th className={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(totals).length === 0 && (
                    <tr className={styles.tr}>
                      <td className={styles.td} colSpan={3}>
                        <span className={styles.cellMuted}>No OTA feeds configured yet.</span>
                      </td>
                    </tr>
                  )}
                  {Object.entries(totals).map(([channel, count]) => (
                    <tr key={channel} className={styles.tr}>
                      <td className={`${styles.td} ${styles.capitalize}`}>{channel}</td>
                      <td className={styles.td}>{count}</td>
                      <td className={styles.td}><span className={`${styles.badge} ${styles.badgeCheckedIn}`}>Connected</span></td>
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
