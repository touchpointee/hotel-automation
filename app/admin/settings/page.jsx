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
        <div className={styles.topbarStack}>
          <h2 className={styles.topbarTitle}>Settings</h2>
          <p className={styles.pageIntro}>Sync and integration notes for this deployment.</p>
        </div>
      </header>
      <main className={styles.content}>
        <div className={`${styles.card} ${styles.cardPadLg}`}>
          <h3 className={styles.subtitle}>Sync preferences</h3>
          <div className={styles.settingsGrid}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={cronEnabled}
                onChange={(e) => setCronEnabled(e.target.checked)}
              />
              Enable background calendar sync every 15 minutes
            </label>
            <p className={styles.stats}>
              Auth and login use your existing system.
            </p>
            <p className={styles.stats}>
              OTA credentials stay with each platform. This portal stores feed URLs per room and sync metadata only.
            </p>
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}
