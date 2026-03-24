'use client';
import { useState } from 'react';
import styles from '../admin.module.css';
import AdminSidebar from '../AdminSidebar';

export default function SettingsPage() {
  const [cronEnabled, setCronEnabled] = useState(true);

  return (
    <div className={styles.layout}>
      <AdminSidebar activePath="/admin/settings" />
      <div className={styles.mainContainer}>
        <header className={styles.topbar}>
          <h2 className={styles.topbarTitle}>Settings</h2>
        </header>
        <main className={styles.content}>
          <div className={styles.card} style={{ padding: 24 }}>
            <h3 style={{ marginTop: 0 }}>Sync Preferences</h3>
            <div style={{ display: 'grid', gap: 14, maxWidth: 520 }}>
              <label className={styles.label}>
                <input
                  type="checkbox"
                  checked={cronEnabled}
                  onChange={(e) => setCronEnabled(e.target.checked)}
                  style={{ marginRight: 10 }}
                />
                Enable background calendar sync every 15 minutes
              </label>
              <div className={styles.stats}>
                Auth/login remains unchanged and uses your existing system.
              </div>
              <div className={styles.stats}>
                OTA credentials are managed by each OTA. This portal stores feed links per room and sync metadata.
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
