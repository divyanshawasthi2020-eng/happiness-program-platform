// ─── Courses Page ──────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';

export function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [leads,   setLeads]   = useState([]);
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState({ city:'', courseDate:'', seats:25, venue:'' });
  const [editId, setEditId]   = useState(null);

  useEffect(() => {
    api.get('/courses').then(r => setCourses(r.data));
    api.get('/leads?limit=1000').then(r => setLeads(r.data.leads));
  }, []);

  const save = async () => {
    if (!form.city || !form.courseDate) return toast.error('City and date required');
    try {
      if (editId) { await api.put(`/courses/${editId}`, form); toast.success('Updated'); }
      else        { await api.post('/courses', form);          toast.success('Course added'); }
      setModal(null);
      api.get('/courses').then(r => setCourses(r.data));
    } catch (err) { toast.error(err.response?.data?.errors?.[0]?.msg || 'Save failed'); }
  };

  const del = async (id) => {
    if (!confirm('Archive this course?')) return;
    await api.delete(`/courses/${id}`);
    setCourses(c => c.filter(x => x.id !== id));
  };

  return (
    <div>
      <div className="page-header-row">
        <div><div className="page-title">My Courses</div><div className="page-sub">Manage all Happiness Program batches</div></div>
        <button className="btn btn-primary" onClick={() => { setForm({ city:'', courseDate:'', seats:25, venue:'' }); setEditId(null); setModal('edit'); }}>+ New course</button>
      </div>

      {courses.length === 0
        ? <div className="card"><div className="empty-state"><div className="empty-icon">📅</div><div className="empty-title">No courses yet</div><div>Add your first course batch</div></div></div>
        : courses.map(c => {
            const reg = leads.filter(l => l.courseId === c.id && ['REGISTERED','COMPLETED'].includes(l.status)).length;
            const fill = Math.round(reg / c.seats * 100);
            const daysLeft = Math.ceil((new Date(c.courseDate) - new Date()) / 86400000);
            return (
              <div className="card" key={c.id}>
                <div className="flex-between" style={{ marginBottom:10 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:16 }}>{c.city} — Happiness Program</div>
                    <div style={{ fontSize:13, color:'var(--text2)', marginTop:3 }}>
                      {new Date(c.courseDate).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'long',year:'numeric'})}
                      {c.venue && ` · ${c.venue}`}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <span className="badge" style={{ background: daysLeft < 0 ? 'var(--bg)':'var(--gold-l)', color: daysLeft<0?'var(--text3)':'var(--gold-d)' }}>
                      {daysLeft < 0 ? 'Completed' : `${daysLeft} days left`}
                    </span>
                    <button className="btn-icon" onClick={() => { setForm({ city:c.city, courseDate:c.courseDate.split('T')[0], seats:c.seats, venue:c.venue||'' }); setEditId(c.id); setModal('edit'); }}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                    </button>
                    <button className="btn-icon" onClick={() => del(c.id)}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 5h10M6 5V3h4v2M7 8v4M9 8v4M4 5l1 9h6l1-9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text2)', marginBottom:6 }}>
                  <span>Seats filled: {reg} / {c.seats}</span><span>{fill}%</span>
                </div>
                <div className="bar-bg"><div className="bar-fill" style={{ width:`${fill}%`, background:'var(--gold-m)' }} /></div>
                {c._count && <div style={{ fontSize:11, color:'var(--text3)', marginTop:8 }}>{c._count.leads} total leads assigned</div>}
              </div>
            );
          })
      }

      {modal === 'edit' && (
        <div className="modal-backdrop" onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-title">{editId ? 'Edit course' : 'Add new course'}</div>
            <button className="modal-close" onClick={()=>setModal(null)}>×</button>
            <div className="form-row">
              <div className="form-field"><label className="form-label">City *</label><input className="form-input" value={form.city} onChange={e=>setForm(p=>({...p,city:e.target.value}))} placeholder="Mumbai" /></div>
              <div className="form-field"><label className="form-label">Date *</label><input className="form-input" type="date" value={form.courseDate} onChange={e=>setForm(p=>({...p,courseDate:e.target.value}))} /></div>
            </div>
            <div className="form-row">
              <div className="form-field"><label className="form-label">Total seats</label><input className="form-input" type="number" value={form.seats} onChange={e=>setForm(p=>({...p,seats:parseInt(e.target.value)||25}))} min="1" /></div>
              <div className="form-field"><label className="form-label">Venue</label><input className="form-input" value={form.venue} onChange={e=>setForm(p=>({...p,venue:e.target.value}))} placeholder="Art of Living Centre" /></div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:8 }}>
              <button className="btn" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save course</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reminders Page ───────────────────────────────────────────────────────────
export function RemindersPage() {
  const [reminders, setReminders] = useState([]);
  const [form, setForm] = useState({ time:'06:30', frequency:'DAILY', text:'' });

  useEffect(() => { api.get('/reminders').then(r => setReminders(r.data)); }, []);

  const add = async () => {
    if (!form.text.trim()) return toast.error('Enter reminder text');
    const { data } = await api.post('/reminders', form);
    setReminders(p => [...p, data]);
    setForm(p => ({ ...p, text:'' }));
    toast.success('Reminder added');
  };

  const del = async (id) => {
    await api.delete(`/reminders/${id}`);
    setReminders(p => p.filter(r => r.id !== id));
  };

  const toggle = async (r) => {
    const { data } = await api.put(`/reminders/${r.id}`, { isActive: !r.isActive });
    setReminders(p => p.map(x => x.id === r.id ? data : x));
  };

  return (
    <div>
      <div className="page-header"><div className="page-title">Reminders</div><div className="page-sub">Schedule recurring messages and task reminders</div></div>
      <div className="card">
        <div className="card-hdr"><span className="card-title">Add reminder</span></div>
        <div className="form-row" style={{ alignItems:'flex-end' }}>
          <div><label className="form-label">Time</label><input type="time" className="form-input" style={{width:120}} value={form.time} onChange={e=>setForm(p=>({...p,time:e.target.value}))} /></div>
          <div><label className="form-label">Frequency</label>
            <select className="form-select" style={{width:130}} value={form.frequency} onChange={e=>setForm(p=>({...p,frequency:e.target.value}))}>
              <option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="ONCE">Once</option>
            </select>
          </div>
          <div style={{flex:1}}><label className="form-label">Message</label><input className="form-input" value={form.text} onChange={e=>setForm(p=>({...p,text:e.target.value}))} placeholder="e.g. Morning SK practice reminder" /></div>
          <button className="btn btn-primary" onClick={add}>+ Add</button>
        </div>
      </div>
      <div className="card">
        <div className="card-hdr"><span className="card-title">Your reminders</span></div>
        {reminders.length===0
          ? <div className="empty-state"><div>No reminders yet</div></div>
          : reminders.map(r => (
              <div key={r.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'0.5px solid var(--border)' }}>
                <div style={{ width:54, fontWeight:700, color:'var(--teal)', flexShrink:0, fontSize:13 }}>{r.time}</div>
                <span className="badge b-new" style={{fontSize:10}}>{r.frequency}</span>
                <div style={{ flex:1, fontSize:13, color: r.isActive ? 'var(--text)' : 'var(--text3)' }}>{r.text}</div>
                <div style={{ display:'flex', gap:6 }}>
                  <button className={`btn btn-sm ${r.isActive?'':'btn-ghost'}`} onClick={()=>toggle(r)}>{r.isActive?'Active':'Inactive'}</button>
                  <button className="btn-icon" onClick={()=>del(r.id)}><svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 5h10M6 5V3h4v2M7 8v4M9 8v4M4 5l1 9h6l1-9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                </div>
              </div>
            ))
        }
      </div>
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────

// Settings page moved to its own file for maintainability
export { SettingsPage } from './SettingsPage.jsx';

export default CoursesPage;
