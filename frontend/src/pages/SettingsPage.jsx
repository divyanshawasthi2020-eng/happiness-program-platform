// ─── Settings Page (complete rewrite) ────────────────────────────────────────
import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';

export function SettingsPage() {
  const { teacher, updateTeacher } = useAuthStore();
  const [profile, setProfile]     = useState({ name:'', city:'', phone:'', email:'', waNumber:'', orgLink:'' });
  const [smtp, setSmtp]           = useState({ host:'', port:587, secure:false, user:'', pass:'', from:'' });
  const [smtpSaved, setSmtpSaved] = useState(false);
  const [waQR, setWaQR]           = useState(null);
  const [waReady, setWaReady]     = useState(false);
  const [tab, setTab]             = useState('profile'); // profile | email | whatsapp | export | danger

  useEffect(() => {
    if (teacher) {
      setProfile({
        name:     teacher.name     || '',
        city:     teacher.city     || '',
        phone:    teacher.phone    || '',
        email:    teacher.email    || '',
        waNumber: teacher.waNumber || '',
        orgLink:  teacher.orgLink  || '',
      });
    }
  }, [teacher]);

  // Poll WA-JS status every 3s when on whatsapp tab
  useEffect(() => {
    if (tab !== 'whatsapp') return;
    const poll = async () => {
      try {
        const { data } = await api.get('/wa/qr');
        setWaQR(data.qr || null);
        setWaReady(data.ready || false);
      } catch (_) {}
    };
    poll();
    const t = setInterval(poll, 3000);
    return () => clearInterval(t);
  }, [tab]);

  const saveProfile = async () => {
    try {
      const { data } = await api.put('/teachers/me', profile);
      updateTeacher(data);
      toast.success('Profile saved');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    }
  };

  const saveSmtp = async () => {
    if (!smtp.host || !smtp.user || !smtp.pass) return toast.error('Host, username, and password are required');
    try {
      await api.put('/teachers/me/smtp', smtp);
      setSmtpSaved(true);
      toast.success('SMTP saved and verified ✓');
    } catch (err) {
      toast.error(err.response?.data?.error || 'SMTP verification failed — check your credentials');
    }
  };

  const testEmail = async () => {
    try {
      const { data } = await api.post('/teachers/me/smtp/test', { to: profile.email });
      toast.success(data.message);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Test email failed');
    }
  };

  const exportLeads = (fmt) => {
    const url = `/api/export/leads.${fmt}`;
    window.open(url, '_blank');
  };

  const exportCampaigns = (fmt) => {
    window.open(`/api/export/campaigns.${fmt}`, '_blank');
  };

  const exportBackup = () => {
    window.open('/api/export/full-backup.json', '_blank');
    toast.success('Full backup downloading…');
  };

  const TABS = [
    { id:'profile',   label:'Profile' },
    { id:'email',     label:'Email (SMTP)' },
    { id:'whatsapp',  label:'WhatsApp' },
    { id:'export',    label:'Export & Backup' },
    { id:'danger',    label:'Danger Zone' },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Settings</div>
        <div className="page-sub">Configure your profile, email, and integrations</div>
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:20, borderBottom:'0.5px solid var(--border)', paddingBottom:0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="btn btn-ghost"
            style={{
              borderRadius:'8px 8px 0 0', borderBottom: tab===t.id ? '2px solid var(--gold)' : '2px solid transparent',
              color: tab===t.id ? 'var(--gold-d)' : 'var(--text2)', fontWeight: tab===t.id ? 600 : 400,
              background: tab===t.id ? 'var(--gold-l)' : 'transparent', padding:'8px 16px',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Profile tab ── */}
      {tab === 'profile' && (
        <div className="card" style={{ maxWidth: 540 }}>
          <div className="card-hdr"><span className="card-title">Teacher profile</span></div>
          {[
            { key:'name',     label:'Display name',      type:'text',  ph:'Meera Sharma' },
            { key:'email',    label:'Email address',     type:'email', ph:'meera@email.com' },
            { key:'city',     label:'Your city',         type:'text',  ph:'Mumbai' },
            { key:'phone',    label:'Your phone number', type:'text',  ph:'9876543210' },
            { key:'waNumber', label:'WhatsApp number (with country code)', type:'text', ph:'919876543210' },
            { key:'orgLink',  label:'Organisation registration link',      type:'url',  ph:'https://www.artofliving.org/...' },
          ].map(f => (
            <div key={f.key} className="form-field">
              <label className="form-label">{f.label}</label>
              <input className="form-input" type={f.type}
                value={profile[f.key] || ''} placeholder={f.ph}
                onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))} />
            </div>
          ))}
          <div className="form-field">
            <label className="form-label">Teacher code (your login key)</label>
            <input className="form-input" value={teacher?.code || ''} disabled
              style={{ color:'var(--text3)', cursor:'not-allowed' }} />
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:5 }}>
              Code cannot be changed. It is your unique identifier. Keep it private.
            </div>
          </div>
          <button className="btn btn-primary" onClick={saveProfile}>Save profile</button>
        </div>
      )}

      {/* ── Email tab ── */}
      {tab === 'email' && (
        <div className="card" style={{ maxWidth: 540 }}>
          <div className="card-hdr"><span className="card-title">Email configuration (SMTP)</span></div>
          <div className="banner-info">
            <strong>Free options:</strong><br/>
            • <strong>Gmail</strong> — myaccount.google.com → Security → App passwords → create for "Mail". Use smtp.gmail.com:587<br/>
            • <strong>Brevo</strong> (sendinblue.com) — free 300 emails/day. Use smtp-relay.brevo.com:587
          </div>
          {[
            { key:'host',   label:'SMTP host',              ph:'smtp.gmail.com',               type:'text' },
            { key:'port',   label:'Port',                   ph:'587',                           type:'number' },
            { key:'user',   label:'Username / email',       ph:'your@gmail.com',               type:'text' },
            { key:'pass',   label:'Password / App password',ph:'xxxx xxxx xxxx xxxx',          type:'password' },
            { key:'from',   label:'From name & address',    ph:'Happiness Program <you@gmail.com>', type:'text' },
          ].map(f => (
            <div key={f.key} className="form-field">
              <label className="form-label">{f.label}</label>
              <input className="form-input" type={f.type}
                value={smtp[f.key] || ''}
                onChange={e => setSmtp(p => ({ ...p, [f.key]: f.type==='number' ? parseInt(e.target.value)||587 : e.target.value }))}
                placeholder={f.ph} />
            </div>
          ))}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
            <input type="checkbox" id="smtpSecure" checked={smtp.secure}
              onChange={e => setSmtp(p => ({ ...p, secure: e.target.checked }))} />
            <label htmlFor="smtpSecure" style={{ fontSize:13, cursor:'pointer' }}>
              Use SSL/TLS (port 465) — leave unchecked for port 587 STARTTLS
            </label>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button className="btn btn-primary" onClick={saveSmtp}>Save &amp; verify SMTP</button>
            {smtpSaved && (
              <button className="btn" onClick={testEmail}>Send test email to {profile.email || 'your email'}</button>
            )}
          </div>
          {smtpSaved && (
            <div className="banner-success" style={{ marginTop:12 }}>
              SMTP verified successfully. Email campaigns are enabled.
            </div>
          )}
        </div>
      )}

      {/* ── WhatsApp tab ── */}
      {tab === 'whatsapp' && (
        <div style={{ maxWidth:600 }}>
          <div className="card">
            <div className="card-hdr"><span className="card-title">WhatsApp — Tier 1 (wa.me links, free)</span></div>
            <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7, marginBottom:12 }}>
              The default mode. Every lead has a "Send WhatsApp" button that opens WhatsApp with a pre-filled message.
              Campaigns generate links and open them automatically with a configurable delay. <strong>No setup needed.</strong>
            </div>
            <div className="banner-success">Active by default — no configuration required.</div>
          </div>

          <div className="card">
            <div className="card-hdr">
              <span className="card-title">WhatsApp — Tier 2 (WA-JS, free automated)</span>
              <span className={`badge ${waReady ? 'b-completed' : 'b-draft'}`}>
                {waReady ? '● Connected' : '○ Not connected'}
              </span>
            </div>
            <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7, marginBottom:12 }}>
              Open-source automated sending via <code>whatsapp-web.js</code>. Scan the QR code once — then campaigns send
              automatically without clicking. Requires WA_MODE=wajs in backend .env.
            </div>

            {waReady ? (
              <div className="banner-success">WA-JS is connected and ready for automated sending.</div>
            ) : waQR ? (
              <div>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>
                  Scan this QR with WhatsApp → Linked Devices → Link a device:
                </div>
                <div style={{ background:'#fff', padding:16, borderRadius:10, display:'inline-block', border:'0.5px solid var(--border)' }}>
                  {/* QR rendered as text — use a real QR library in production */}
                  <pre style={{ fontSize:8, lineHeight:1, fontFamily:'monospace', color:'#000' }}>{waQR.slice(0,200)}…</pre>
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:8, textAlign:'center' }}>
                    Install a browser QR library to render this properly.<br/>
                    Add <code>react-qr-code</code> to frontend for visual QR.
                  </div>
                </div>
              </div>
            ) : (
              <div className="banner-warn">
                WA-JS not running. To enable: set <code>WA_MODE=wajs</code> in <code>backend/.env</code> and restart.
                Then install: <code>npm install whatsapp-web.js qrcode-terminal --prefix backend</code>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-hdr"><span className="card-title">WhatsApp — Tier 3 (official API, paid)</span></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {[
                { name:'Interakt', price:'₹999/mo', features:'Indian support, good UX, bulk sending', url:'https://interakt.ai' },
                { name:'WATI',     price:'₹2,500/mo', features:'Full chatbot, team inbox, sequences', url:'https://wati.io' },
                { name:'360dialog',price:'~$5/mo', features:'Cheapest official API access', url:'https://360dialog.com' },
                { name:'Twilio',   price:'Pay per msg', features:'Global, reliable, developer-friendly', url:'https://twilio.com' },
              ].map(p => (
                <a key={p.name} href={p.url} target="_blank" rel="noreferrer"
                  style={{ display:'block', border:'0.5px solid var(--border)', borderRadius:10, padding:12, textDecoration:'none', color:'inherit' }}>
                  <div style={{ fontWeight:600, fontSize:13 }}>{p.name}</div>
                  <div style={{ color:'var(--coral)', fontSize:12, margin:'3px 0' }}>{p.price}</div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>{p.features}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Export tab ── */}
      {tab === 'export' && (
        <div style={{ maxWidth:540 }}>
          <div className="card">
            <div className="card-hdr"><span className="card-title">Export leads</span></div>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:12, lineHeight:1.6 }}>
              Download all your leads. Exports include name, phone, email, city, source, interest, status, course, and date added.
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button className="btn btn-primary" onClick={() => exportLeads('xlsx')}>Download Excel (.xlsx)</button>
              <button className="btn" onClick={() => exportLeads('csv')}>Download CSV</button>
              <button className="btn" onClick={() => exportLeads('json')}>Download JSON</button>
            </div>
          </div>

          <div className="card">
            <div className="card-hdr"><span className="card-title">Export campaigns</span></div>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:12 }}>
              Download campaign performance data including sent counts and delivery rates.
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button className="btn btn-primary" onClick={() => exportCampaigns('xlsx')}>Download Excel (.xlsx)</button>
              <button className="btn" onClick={() => exportCampaigns('csv')}>Download CSV</button>
            </div>
          </div>

          <div className="card">
            <div className="card-hdr"><span className="card-title">Full data backup</span></div>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:12, lineHeight:1.6 }}>
              Download a complete JSON backup of all your data: leads, courses, campaigns, templates, and reminders. Use this to migrate between environments or keep an offline copy.
            </div>
            <button className="btn btn-primary" onClick={exportBackup}>Download full backup (.json)</button>
          </div>
        </div>
      )}

      {/* ── Danger Zone tab ── */}
      {tab === 'danger' && (
        <div style={{ maxWidth:540 }}>
          <div className="card" style={{ border:'1px solid var(--red)', borderRadius:'var(--radius-lg)' }}>
            <div className="card-hdr">
              <span className="card-title" style={{ color:'var(--red)' }}>Danger Zone</span>
            </div>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:16, lineHeight:1.6 }}>
              These actions are irreversible. Please export a backup before proceeding.
            </div>

            <div style={{ borderTop:'0.5px solid var(--border)', paddingTop:16 }}>
              <div style={{ fontWeight:600, fontSize:13, marginBottom:4 }}>Delete all my leads</div>
              <div style={{ fontSize:12, color:'var(--text3)', marginBottom:10 }}>Permanently deletes all leads. Campaigns and courses are kept.</div>
              <button className="btn btn-danger" onClick={async () => {
                if (!confirm('Delete ALL your leads? This cannot be undone.')) return;
                const input = prompt('Type DELETE to confirm:');
                if (input !== 'DELETE') return toast.error('Confirmation failed');
                try {
                  const leads = await api.get('/leads?limit=10000');
                  const ids = leads.data.leads.map(l => l.id);
                  if (ids.length > 0) await api.post('/leads/bulk-delete', { ids });
                  toast.success(`Deleted ${ids.length} leads`);
                } catch (err) { toast.error('Delete failed'); }
              }}>Delete all leads</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
