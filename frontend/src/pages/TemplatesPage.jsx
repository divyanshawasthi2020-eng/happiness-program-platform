// ─── Templates Page ───────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';

const CATEGORY_OPTS = ['NURTURE','REMINDER','POST_COURSE','TESTIMONIAL','ANNOUNCEMENT'];
const CHANNEL_OPTS  = ['WHATSAPP','EMAIL','BOTH'];
const VARS = ['{Name}','{City}','{CourseDate}','{TeacherName}','{OrgLink}'];

export function TemplatesPage() {
  const { teacher }     = useAuthStore();
  const [templates, setTemplates] = useState([]);
  const [modal, setModal] = useState(null);
  const [preview, setPreview] = useState('');
  const [form, setForm] = useState({ title:'', channel:'WHATSAPP', category:'NURTURE', body:'', subject:'', isShared:false });
  const [editId, setEditId] = useState(null);

  useEffect(() => { fetch(); }, []);

  const fetch = async () => {
    const { data } = await api.get('/templates');
    setTemplates(data);
  };

  const openCreate = () => { setForm({ title:'', channel:'WHATSAPP', category:'NURTURE', body:'', subject:'', isShared:false }); setEditId(null); setModal('edit'); };
  const openEdit   = (t) => { setForm({ title:t.title, channel:t.channel, category:t.category, body:t.body, subject:t.subject||'', isShared:t.isShared }); setEditId(t.id); setModal('edit'); };

  const save = async () => {
    if (!form.title || !form.body) return toast.error('Title and body required');
    try {
      if (editId) { await api.put(`/templates/${editId}`, form); toast.success('Updated'); }
      else        { await api.post('/templates', form);         toast.success('Template created'); }
      setModal(null); fetch();
    } catch (err) { toast.error('Save failed'); }
  };

  const del = async (id) => {
    if (!confirm('Remove this template?')) return;
    await api.delete(`/templates/${id}`);
    fetch();
  };

  const showPreview = async (id) => {
    const { data } = await api.post(`/templates/${id}/preview`);
    setPreview(data.preview);
    setModal('preview');
  };

  const insertVar = (v) => setForm(p => ({ ...p, body: p.body + v }));

  return (
    <div>
      <div className="page-header-row">
        <div>
          <div className="page-title">Message Templates</div>
          <div className="page-sub">Shared library — your templates + templates shared by other teachers</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New template</button>
      </div>

      <div className="banner-info">
        Templates with <strong>Share with all teachers</strong> enabled are visible to everyone. Global templates (built-in) are available by default.
        Variables: {VARS.map(v => <code key={v} style={{ margin:'0 3px', padding:'1px 5px', background:'var(--gold-l)', borderRadius:4, fontSize:11 }}>{v}</code>)}
      </div>

      {['WHATSAPP','EMAIL'].map(ch => {
        const group = templates.filter(t => t.channel === ch || t.channel === 'BOTH');
        if (!group.length) return null;
        return (
          <div key={ch} className="card">
            <div className="card-hdr">
              <span className="card-title">{ch === 'WHATSAPP' ? '💬 WhatsApp templates' : '📧 Email templates'}</span>
            </div>
            {group.map(t => (
              <div key={t.id} style={{ padding:'10px 0', borderBottom:'0.5px solid var(--border)' }}>
                <div className="flex-between" style={{ marginBottom:4 }}>
                  <div>
                    <span style={{ fontWeight:600, fontSize:13 }}>{t.title}</span>
                    {t.isGlobal && <span className="badge b-free" style={{ marginLeft:6, fontSize:10 }}>Built-in</span>}
                    {t.isShared && !t.isGlobal && <span className="badge b-cold" style={{ marginLeft:6, fontSize:10 }}>Shared</span>}
                    {t.isOwn && <span className="badge b-warm" style={{ marginLeft:6, fontSize:10 }}>Mine</span>}
                    <span className="badge b-draft" style={{ marginLeft:6, fontSize:10 }}>{t.category}</span>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn btn-sm" onClick={() => showPreview(t.id)}>Preview</button>
                    {t.isOwn && <>
                      <button className="btn btn-sm" onClick={() => openEdit(t)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => del(t.id)}>Remove</button>
                    </>}
                  </div>
                </div>
                <div style={{ fontSize:12, color:'var(--text2)', whiteSpace:'pre-line', lineHeight:1.6, maxHeight:80, overflow:'hidden', textOverflow:'ellipsis' }}>
                  {t.body.slice(0,200)}{t.body.length>200?'…':''}
                </div>
                {t.teacher && !t.isGlobal && (
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>By: {t.teacher.name}</div>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {/* Edit/Create modal */}
      {modal === 'edit' && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" style={{ maxWidth:600 }}>
            <div className="modal-title">{editId ? 'Edit template' : 'New template'}</div>
            <button className="modal-close" onClick={() => setModal(null)}>×</button>
            <div className="form-row">
              <div className="form-field" style={{ flex:2 }}><label className="form-label">Title *</label>
                <input className="form-input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="e.g. Initial inquiry reply" /></div>
              <div className="form-field"><label className="form-label">Channel</label>
                <select className="form-select" value={form.channel} onChange={e=>setForm(p=>({...p,channel:e.target.value}))}>
                  {CHANNEL_OPTS.map(c=><option key={c} value={c}>{c}</option>)}
                </select></div>
              <div className="form-field"><label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                  {CATEGORY_OPTS.map(c=><option key={c} value={c}>{c}</option>)}
                </select></div>
            </div>
            {(form.channel === 'EMAIL' || form.channel === 'BOTH') && (
              <div className="form-field"><label className="form-label">Email subject</label>
                <input className="form-input" value={form.subject} onChange={e=>setForm(p=>({...p,subject:e.target.value}))} placeholder="Happiness Program in {City} — {CourseDate}" /></div>
            )}
            <div className="form-field">
              <div className="flex-between" style={{ marginBottom:6 }}>
                <label className="form-label" style={{ margin:0 }}>Message body *</label>
                <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                  {VARS.map(v => <button key={v} className="btn btn-sm" style={{ fontSize:10, padding:'2px 7px' }} onClick={()=>insertVar(v)}>{v}</button>)}
                </div>
              </div>
              <textarea className="form-textarea" rows={8} value={form.body} onChange={e=>setForm(p=>({...p,body:e.target.value}))} placeholder="Type your message. Use {Name}, {City}, {CourseDate}, {TeacherName}, {OrgLink} for personalisation." />
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <input type="checkbox" id="shareChk" checked={form.isShared} onChange={e=>setForm(p=>({...p,isShared:e.target.checked}))} />
              <label htmlFor="shareChk" style={{ fontSize:13, cursor:'pointer' }}>Share with all teachers</label>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save template</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {modal === 'preview' && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-title">Message preview</div>
            <button className="modal-close" onClick={()=>setModal(null)}>×</button>
            <div style={{ background:'var(--bg)', borderRadius:10, padding:14, fontFamily:'system-ui', fontSize:14, lineHeight:1.7, whiteSpace:'pre-line', border:'0.5px solid var(--border)' }}>
              {preview}
            </div>
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:10 }}>
              Preview uses sample data: Name=Priya, City=Mumbai, etc.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplatesPage;
