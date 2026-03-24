'use client';
import Image from 'next/image';
import Link from 'next/link';
import styles from './admin.module.css';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/rooms', label: 'Rooms & Floors' },
  { href: '/admin/calendar', label: 'Calendar Sync' },
  { href: '/admin/channels', label: 'OTA Connections' },
  { href: '/admin/settings', label: 'Settings' },
];

export default function AdminSidebar({ activePath }) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <h1 className={styles.title}>
          <span className={styles.brandRow}>
            <Image
              src="/logo.png"
              alt="DJ IMPERIALS"
              width={40}
              height={40}
              className={styles.brandLogo}
              priority
            />
            <span>DJ IMPERIALS Admin</span>
          </span>
        </h1>
      </div>
      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${activePath === item.href ? styles.navItemActive : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className={styles.sidebarFooter}>
        <a href="/kiosk" className={styles.kioskLink} target="_blank">
          Open Kiosk ↗
        </a>
        <button
          onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/login'; }}
          className={styles.signOutBtn}
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
