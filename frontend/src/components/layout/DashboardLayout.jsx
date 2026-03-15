import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';

const NAV = [
  { to: '/',           icon: GridIcon,     label: 'Overview' },
  { to: '/leads',      icon: UsersIcon,    label: 'Leads' },
  { to: '/courses',    icon: CalIcon,      label: 'Courses' },
  { to: '/campaigns',  icon: SendIcon,     label: 'Campaigns' },
  { to: '/analytics',  icon: ChartIcon,    label: 'Analytics' },
  { to: '/templates',  icon: MsgIcon,      label: 'Templates' },
  { to: '/posters',    icon: ImageIcon,    label: 'Posters' },
  { to: '/reminders',  icon: ClockIcon,    label: 'Reminders' },
  { to: '/settings',   icon: SettingsIcon, label: 'Settings' },
];

export default function DashboardLayout() {
  const { teacher, logout, init } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => { init(); }, []);
  useEffect(() => { setOpen(false); }, [location.pathname]);

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const initials = (n = '') => n.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();

  const sidebarStyle = {
    width: 196, flexShrink: 0, background: 'var(--surface)',
    borderRight: '0.5px solid var(--border)', padding: '12px 0',
    overflowY: 'auto',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* ── Mobile overlay backdrop ── */}
      {open && (
        <div onClick={() => setOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)',
          zIndex: 200, display: 'none',
        }} className="mobile-overlay" />
      )}

      {/* ── Top bar ── */}
      <header style={{
        background: 'var(--surface)', borderBottom: '0.5px solid var(--border)',
        padding: '0 16px', height: 52, display: 'flex', alignItems: 'center',
        gap: 10, position: 'sticky', top: 0, zIndex: 100,
      }}>
        {/* Hamburger (mobile only) */}
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'none', background: 'none', border: 'none',
            cursor: 'pointer', padding: '4px 6px', color: 'var(--text2)',
          }}
          className="hamburger-btn"
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', background: 'var(--gold-l)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#BA7517" strokeWidth="2"/>
              <path d="M8 13.5s1.5 2.5 4 2.5 4-2.5 4-2.5" stroke="#BA7517" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="9.5" cy="10" r="1.2" fill="#BA7517"/>
              <circle cx="14.5" cy="10" r="1.2" fill="#BA7517"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Happiness Program</div>
            <div style={{ fontSize: 10, color: 'var(--text3)' }}>Teacher Platform</div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Teacher info */}
        {teacher && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', background: 'var(--gold-l)',
              color: 'var(--gold-d)', fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {initials(teacher.name)}
            </div>
            <div className="teacher-name-block" style={{ lineHeight: 1.3 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{teacher.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{teacher.code}</div>
            </div>
            <button className="btn btn-sm" onClick={handleLogout}>Sign out</button>
          </div>
        )}
      </header>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── Sidebar ── */}
        <nav
          className="sidebar-nav"
          style={{
            ...sidebarStyle,
            position: 'sticky', top: 52, height: 'calc(100vh - 52px)',
          }}
        >
          <SidebarContent />
        </nav>

        {/* ── Mobile drawer sidebar ── */}
        <nav
          className="sidebar-mobile"
          style={{
            ...sidebarStyle,
            position: 'fixed', top: 0, left: 0,
            height: '100vh', zIndex: 210,
            transform: open ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform .22s ease',
            boxShadow: open ? '4px 0 20px rgba(0,0,0,.15)' : 'none',
            display: 'none',
            paddingTop: 56,
          }}
        >
          <button
            onClick={() => setOpen(false)}
            style={{
              position: 'absolute', top: 14, right: 14,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 20, color: 'var(--text3)', lineHeight: 1,
            }}
          >×</button>
          <SidebarContent />
        </nav>

        {/* ── Main content ── */}
        <main style={{ flex: 1, padding: '20px 20px 40px', overflowY: 'auto', minWidth: 0 }}>
          <Outlet />
        </main>
      </div>

      {/* ── Responsive styles ── */}
      <style>{`
        @media (max-width: 768px) {
          .hamburger-btn  { display: flex !important; }
          .sidebar-nav    { display: none !important; }
          .sidebar-mobile { display: block !important; }
          .mobile-overlay { display: block !important; }
          .teacher-name-block { display: none; }
        }
      `}</style>
    </div>
  );
}

function SidebarContent() {
  return (
    <>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.6px', padding: '10px 16px 4px' }}>Main</div>
      {NAV.slice(0, 6).map(n => <SideNavItem key={n.to} {...n} />)}
      <div style={{ height: 0.5, background: 'var(--border)', margin: '8px 14px' }} />
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.6px', padding: '6px 16px 4px' }}>Tools</div>
      {NAV.slice(6).map(n => <SideNavItem key={n.to} {...n} />)}
    </>
  );
}

function SideNavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '9px 16px', fontSize: 13,
        color: isActive ? 'var(--gold-d)' : 'var(--text2)',
        background: isActive ? 'var(--gold-l)' : 'transparent',
        borderLeft: isActive ? '2px solid var(--gold)' : '2px solid transparent',
        fontWeight: isActive ? 600 : 400,
        textDecoration: 'none', transition: 'all .12s',
        whiteSpace: 'nowrap',
      })}
    >
      <Icon size={15} />
      {label}
    </NavLink>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────
function GridIcon({ size=16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
  </svg>;
}
function UsersIcon({ size=16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>;
}
function CalIcon({ size=16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1" y="3" width="14" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M5 1v4M11 1v4M1 7h14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>;
}
function SendIcon({ size=16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M14 2L7 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M14 2L9.5 14 7 9 2 6.5 14 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>;
}
function ChartIcon({ size=16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M1 12l4-4 3 3 4-5 3 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M1 15h14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>;
}
function MsgIcon({ size=16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M14 9.5a2 2 0 01-2 2H5l-3 2.5V4a2 2 0 012-2h8a2 2 0 012 2v5.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>;
}
function ImageIcon({ size=16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1" y="2" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="5.5" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M1 10l4-3 3 3 2-2 5 4" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
  </svg>;
}
function ClockIcon({ size=16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>;
}
function SettingsIcon({ size=16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.4 1.4M11.55 11.55l1.4 1.4M3.05 12.95l1.4-1.4M11.55 4.45l1.4-1.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>;
}
