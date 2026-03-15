import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api.js';

const STATUS_BADGE = { DRAFT:'b-draft', SCHEDULED:'b-scheduled', RUNNING:'b-running', PAUSED:'b-paused', COMPLETED:'b-completed', FAILED:'b-failed' };

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [courses,   setCourses]   = useState([]);
  const [modal, setModal]         = useState(null);
  const [activeCampaign, setActiveCampaign] = useState(null); // running WA campaign
  const [waLinks, setWaLinks]     = useState([]);
  const [waSent, setWaSent]       = useState(0);
  const [waPaused, setWaPaused]   = useState(false);
  const waTimerRef                = useRef(null);
  const [form, setForm] = useState({
    name:'', templateId:'', courseId:'', channel:'WHATSAPP',
    filterStatus:'', filterInterest:'', delayMs: 4000, scheduledAt:'',
  });

  useEffect(() => {
    fetch();
    api.get('/templates').then(r => setTemplates(r.data.filter(t => t.isActive)));
    api.get('/courses').then(r => setCourses(r.data));
  }, []);

  const fetch = async () => {
    const { data } = await api.get('/campaigns');
    setCampaigns(data);
  };

  const createCampaign = async () => {
    if (!form.name || !form.templateId) return toast.error('Name and template required');
    try {
      await api.post('/campaigns', form);
      toast.success('Campaign created');
      setModal(null);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const startCampaign = async (id) => {
    try {
      const { data } = await api.post(`/campaigns/${id}/start`);

      if (data.type === 'whatsapp_links') {
        // Start WA sending loop in the browser
        setActiveCampaign(id);
        setWaLinks(data.links);
        setWaSent(0);
        setWaPaused(false);
        startWALoop(data.links, id, data.delayMs);
      } else {
        toast.success(`Email campaign started — ${data.totalLeads} emails queued`);
        fetch();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Start failed');
    }
  };

  const startWALoop = (links, campaignId, delayMs) => {
    let i = 0;
    const run = () => {
      if (i >= links.length) {
        setActiveCampaign(null);
        toast.success(`Campaign complete! ${links.length} messages sent.`);
        fetch();
        return;
      }
      const link = links[i];
      window.open(link.url, '_blank');

      // Log sent
      api.post(`/campaigns/${campaignId}/log-sent`, { leadId: link.leadId, status: 'SENT' }).catch(() => {});

      setWaSent(i + 1);
      i++;
      waTimerRef.current = setTimeout(run, delayMs);
    };
    run();
  };

  const pauseWA = () => {
    clearTimeout(waTimerRef.current);
    setWaPaused(true);
  };

  const pauseCampaign = async (id) => {
    await api.post(`/campaigns/${id}/pause`);
    toast.success('Campaign paused');
    fetch();
  };

  const deleteCampaign = async (id) => {
    if (!confirm('Delete this campaign?')) return;
    await api.delete(`/campaigns/${id}`);
    fetch();
  };

  return (
    <div>
      <div className="page-header-row">
        <div>
          <div className="page-title">Campaigns</div>
          <div className="page-sub">Send bulk WhatsApp and email messages</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ name:'', templateId:'', courseId:'', channel:'WHATSAPP', filterStatus:'', filterInterest:'', delayMs:4000, scheduledAt:'' }); setModal('create'); }}>
          + New campaign
        </button>
      </div>

      {/* WA Strategy Banner */}
      <div className="banner-info">
        <strong>WhatsApp strategy:</strong> This system uses wa.me links (free, zero ban risk). Each message opens WhatsApp with content pre-filled — you click Send. A configurable delay prevents sending too fast.
        For automated bulk sending without clicks, upgrade to <strong>Interakt (₹999/mo)</strong> or <strong>WATI (₹2,500/mo)</strong>.
      </div>

      {/* Active WA campaign progress */}
      {activeCampaign && (
        <div className="card" style={{ borderColor: '#25D366' }}>
          <div className="card-hdr">
            <span className="card-title" style={{ color: '#25D366' }}>Campaign running — {waSent} / {waLinks.length} sent</span>
            {!waPaused
              ? <button className="btn btn-sm btn-danger" onClick={pauseWA}>Pause</button>
              : <span style={{ fontSize: 13, color: 'var(--text3)' }}>Paused</span>
            }
          </div>
          <div className="bar-bg" style={{ marginBottom: 8 }}>
            <div className="bar-fill" style={{ width: `${Math.round(waSent / waLinks.length * 100)}%`, background: '#25D366' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>
            WhatsApp is opening automatically. Each message is pre-filled — just click Send in WhatsApp.
            {waPaused && <span style={{ color: 'var(--gold)' }}> Campaign paused. Close this bar to stop.</span>}
          </div>
        </div>
      )}

      {/* Campaigns list */}
      {campaigns.length === 0
        ? <div className="card"><div className="empty-state">
            <div className="empty-icon">📤</div>
            <div className="empty-title">No campaigns yet</div>
            <div>Create your first campaign to send bulk messages</div>
          </div></div>
        : campaigns.map(c => (
            <div className="card" key={c.id}>
              <div className="flex-between" style={{ marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>
                    {c.channel} · {c.template?.title} · {c.totalLeads} leads
                    {c.course && ` · ${c.course.city}`}
                  </div>
                </div>
                <span className={`badge ${STATUS_BADGE[c.status]||'b-draft'}`}>{c.status}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  Sent: {c.sentCount} / {c.totalLeads} · Failed: {c.failedCount}
                </div>
                <div style={{ flex: 1 }} />
                {['DRAFT','SCHEDULED'].includes(c.status) && (
                  <button className={`btn btn-sm ${c.channel === 'WHATSAPP' ? 'btn-wa' : 'btn-primary'}`}
                    onClick={() => startCampaign(c.id)}>
                    ▶ Start
                  </button>
                )}
                {c.status === 'RUNNING' && (
                  <button className="btn btn-sm" onClick={() => pauseCampaign(c.id)}>Pause</button>
                )}
                <button className="btn btn-sm btn-danger" onClick={() => deleteCampaign(c.id)}>Delete</button>
              </div>
              {c.status === 'RUNNING' && (
                <div style={{ marginTop: 10 }}>
                  <div className="bar-bg">
                    <div className="bar-fill" style={{ width: `${Math.round(c.sentCount / (c.totalLeads||1) * 100)}%`, background: 'var(--gold-m)' }} />
                  </div>
                </div>
              )}
            </div>
          ))
      }

      {/* Create modal */}
      {modal === 'create' && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-title">New campaign</div>
            <button className="modal-close" onClick={() => setModal(null)}>×</button>

            <div className="form-field"><label className="form-label">Campaign name *</label>
              <input className="form-input" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Mumbai April — Final reminder" /></div>

            <div className="form-row">
              <div className="form-field"><label className="form-label">Channel</label>
                <select className="form-select" value={form.channel} onChange={e => setForm(p=>({...p,channel:e.target.value}))}>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">Email</option>
                  <option value="BOTH">Both</option>
                </select>
              </div>
              <div className="form-field"><label className="form-label">Template *</label>
                <select className="form-select" value={form.templateId} onChange={e => setForm(p=>({...p,templateId:e.target.value}))}>
                  <option value="">Select template…</option>
                  {templates.filter(t => t.channel === form.channel || t.channel === 'BOTH' || form.channel === 'BOTH')
                    .map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field"><label className="form-label">Course (optional)</label>
                <select className="form-select" value={form.courseId} onChange={e => setForm(p=>({...p,courseId:e.target.value}))}>
                  <option value="">All courses</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.city} · {new Date(c.courseDate).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</option>)}
                </select>
              </div>
              <div className="form-field"><label className="form-label">Filter by status</label>
                <select className="form-select" value={form.filterStatus} onChange={e => setForm(p=>({...p,filterStatus:e.target.value}))}>
                  <option value="">All statuses</option>
                  {['NEW','CONTACTED','REGISTERED','COMPLETED'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-field"><label className="form-label">Filter by interest</label>
                <select className="form-select" value={form.filterInterest} onChange={e => setForm(p=>({...p,filterInterest:e.target.value}))}>
                  <option value="">All interest</option>
                  {['HOT','WARM','COLD'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Delay between messages (ms): {form.delayMs}ms = {(form.delayMs/1000).toFixed(1)}s</label>
              <input type="range" min={1500} max={15000} step={500} value={form.delayMs}
                onChange={e => setForm(p=>({...p,delayMs:parseInt(e.target.value)}))}
                style={{ width: '100%' }} />
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                Recommended: 3–5 seconds between messages to avoid WhatsApp rate limiting.
              </div>
            </div>

            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:8 }}>
              <button className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={createCampaign}>Create campaign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
