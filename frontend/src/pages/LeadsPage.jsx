import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import * as XLSX from 'xlsx';
import { useAuthStore } from '../store/authStore.js';

const STATUS_OPTIONS   = ['NEW','CONTACTED','REGISTERED','COMPLETED','DROPPED'];
const INTEREST_OPTIONS = ['HOT','WARM','COLD'];
const SOURCE_OPTIONS   = ['INSTAGRAM','WHATSAPP','GOOGLE_FORM','REFERRAL','OFFLINE','IMPORT','WEBSITE'];
const BADGE_MAP = { HOT:'b-hot', WARM:'b-warm', COLD:'b-cold', NEW:'b-new', CONTACTED:'b-contacted', REGISTERED:'b-registered', COMPLETED:'b-completed', DROPPED:'b-dropped' };

const blank = { name:'', phone:'', email:'', city:'', source:'WHATSAPP', interest:'WARM', status:'NEW', courseId:'' };

export default function LeadsPage() {
  const { teacher } = useAuthStore();
  const [leads, setLeads]       = useState([]);
  const [courses, setCourses]   = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [modal, setModal]       = useState(null); // null | 'add' | 'edit' | 'wa' | 'import'
  const [form, setForm]         = useState(blank);
  const [editId, setEditId]     = useState(null);
  const [waMsgIdx, setWaMsgIdx] = useState(0);
  const [waLead, setWaLead]     = useState(null);
  const [waText, setWaText]     = useState('');
  const [importRows, setImportRows] = useState([]);
  const [filters, setFilters]   = useState({ status:'', interest:'', source:'', courseId:'' });
  const LIMIT = 50;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, ...filters };
      const { data } = await api.get('/leads', { params });
      setLeads(data.leads);
      setTotal(data.pagination.total);
    } finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => { api.get('/courses').then(r => setCourses(r.data)); }, []);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const openAdd  = () => { setForm(blank); setEditId(null); setModal('add'); };
  const openEdit = (l) => { setForm({ ...l, courseId: l.courseId||'' }); setEditId(l.id); setModal('add'); };

  const saveLead = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    try {
      if (editId) {
        await api.put(`/leads/${editId}`, form);
        toast.success('Lead updated');
      } else {
        await api.post('/leads', form);
        toast.success('Lead added');
      }
      setModal(null);
      fetchLeads();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    }
  };

  const deleteLead = async (id) => {
    if (!confirm('Delete this lead?')) return;
    await api.delete(`/leads/${id}`);
    toast.success('Deleted');
    fetchLeads();
  };

  const bulkDelete = async () => {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} leads?`)) return;
    await api.post('/leads/bulk-delete', { ids: [...selected] });
    setSelected(new Set());
    toast.success(`${selected.size} leads deleted`);
    fetchLeads();
  };

  // ── WhatsApp ───────────────────────────────────────────────────────────────
  const WA_TEMPLATES = [
    'Namaste {Name}! Thank you for your interest in the Happiness Program.\n\nI\'m {TeacherName}, an Art of Living teacher. Quick question: are you looking to manage stress, sleep better, or find more inner peace?',
    'The Happiness Program is a 5-day course in {City} on {CourseDate}.\n\n✅ Backed by 100+ studies\n✅ Better sleep, less stress\n✅ 50M+ participants worldwide\n\nRegister: {OrgLink}',
    'Hi {Name}! Just a reminder — Happiness Program in {City} on {CourseDate}.\n\nSeats are filling up fast! Register: {OrgLink}\n\n— {TeacherName}',
  ];

  const openWA = (lead) => {
    setWaLead(lead);
    setWaMsgIdx(0);
    setWaText(fillTemplate(WA_TEMPLATES[0], lead));
    setModal('wa');
  };

  const fillTemplate = (tmpl, lead) => {
    const nextCourse = courses.sort((a,b) => new Date(a.courseDate)-new Date(b.courseDate))
      .find(c => new Date(c.courseDate) >= new Date());
    return tmpl
      .replace(/\{Name\}/g,        lead?.name?.split(' ')[0] || 'there')
      .replace(/\{TeacherName\}/g, teacher?.name || '')
      .replace(/\{City\}/g,        lead?.city || teacher?.city || '')
      .replace(/\{CourseDate\}/g,  nextCourse ? new Date(nextCourse.courseDate).toLocaleDateString('en-IN',{day:'numeric',month:'long'}) : '')
      .replace(/\{OrgLink\}/g,     teacher?.orgLink || 'https://www.artofliving.org');
  };

  const sendWA = () => {
    const phone = (waLead?.phone || '').replace(/[^0-9]/g, '');
    if (!phone) return toast.error('No phone number for this lead');
    const full = phone.startsWith('91') || phone.length >= 11 ? phone : '91' + phone;
    window.open(`https://wa.me/${full}?text=${encodeURIComponent(waText)}`, '_blank');
    setModal(null);
    toast.success('WhatsApp opened');
  };

  // ── Import ─────────────────────────────────────────────────────────────────
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
               'application/vnd.ms-excel': ['.xls'], 'text/csv': ['.csv'] },
    maxSize: 10 * 1024 * 1024,
    onDrop: async ([file]) => {
      if (!file) return;
      const form = new FormData();
      form.append('file', file);
      try {
        const { data } = await api.post('/upload/leads', form);
        setImportRows(data.rows);
        setModal('import');
      } catch (err) {
        toast.error(err.response?.data?.error || 'Parse failed');
      }
    },
  });

  const confirmImport = async () => {
    try {
      const { data } = await api.post('/leads/bulk-import', { leads: importRows });
      toast.success(`${data.inserted} leads imported, ${data.skipped} skipped (duplicates)`);
      setModal(null);
      setImportRows([]);
      fetchLeads();
    } catch (err) {
      toast.error('Import failed');
    }
  };

  const downloadTemplate = async () => {
    const res = await api.get('/upload/template', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a'); a.href = url; a.download = 'leads_template.xlsx'; a.click();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const allSelected = leads.length > 0 && leads.every(l => selected.has(l.id));
  const toggleAll   = () => setSelected(allSelected ? new Set() : new Set(leads.map(l => l.id)));
  const toggleOne   = (id) => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s); };

  return (
    <div>
      <div className="page-header-row">
        <div>
          <div className="page-title">Lead Pipeline</div>
          <div className="page-sub">{total} leads total</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div {...getRootProps()} style={{ cursor: 'pointer' }}>
            <input {...getInputProps()} />
            <button className="btn">Import CSV/Excel</button>
          </div>
          <button className="btn" onClick={downloadTemplate}>Download template</button>
          {selected.size > 0 && (
            <button className="btn btn-danger btn-sm" onClick={bulkDelete}>
              Delete {selected.size}
            </button>
          )}
          <button className="btn btn-primary" onClick={openAdd}>+ Add lead</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { key: 'status',   opts: STATUS_OPTIONS,   label: 'Status' },
            { key: 'interest', opts: INTEREST_OPTIONS, label: 'Interest' },
            { key: 'source',   opts: SOURCE_OPTIONS,   label: 'Source' },
          ].map(f => (
            <select key={f.key} className="form-select" style={{ flex: '0 0 auto', width: 140 }}
              value={filters[f.key]}
              onChange={e => { setFilters(p => ({ ...p, [f.key]: e.target.value })); setPage(1); }}>
              <option value="">All {f.label}</option>
              {f.opts.map(o => <option key={o} value={o}>{o.charAt(0)+o.slice(1).toLowerCase()}</option>)}
            </select>
          ))}
          <select className="form-select" style={{ flex: '0 0 auto', width: 180 }}
            value={filters.courseId}
            onChange={e => { setFilters(p => ({ ...p, courseId: e.target.value })); setPage(1); }}>
            <option value="">All courses</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.city} · {new Date(c.courseDate).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: '0 0 4px' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="checkbox-col"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
                <th>Name</th><th>Phone</th><th>Email</th><th>City</th>
                <th>Source</th><th>Interest</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? <tr><td colSpan={9} style={{ textAlign: 'center', padding: 30, color: 'var(--text3)' }}>Loading…</td></tr>
                : leads.length === 0
                  ? <tr><td colSpan={9}>
                      <div className="empty-state">
                        <div className="empty-icon">👥</div>
                        <div className="empty-title">No leads yet</div>
                        <div>Add your first lead or import a CSV file</div>
                      </div>
                    </td></tr>
                  : leads.map(l => (
                      <tr key={l.id}>
                        <td><input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleOne(l.id)} /></td>
                        <td style={{ fontWeight: 600 }}>{l.name}</td>
                        <td style={{ color: 'var(--text2)' }}>{l.phone || '—'}</td>
                        <td style={{ color: 'var(--text2)', fontSize: 12 }}>{l.email || '—'}</td>
                        <td style={{ color: 'var(--text3)' }}>{l.city || '—'}</td>
                        <td><span className="badge b-new" style={{ fontSize: 10 }}>{l.source}</span></td>
                        <td><span className={`badge ${BADGE_MAP[l.interest]||'b-new'}`}>{l.interest}</span></td>
                        <td><span className={`badge ${BADGE_MAP[l.status]||'b-new'}`}>{l.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn-icon" title="Send WhatsApp" onClick={() => openWA(l)}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="#25D366">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.5 2C6.253 2 2 6.253 2 11.5c0 1.67.434 3.24 1.2 4.61L2 22l6.044-1.184A9.476 9.476 0 0011.5 21c5.247 0 9.5-4.253 9.5-9.5S16.747 2 11.5 2z"/>
                              </svg>
                            </button>
                            <button className="btn-icon" title="Edit" onClick={() => openEdit(l)}>
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                            </button>
                            <button className="btn-icon" title="Delete" onClick={() => deleteLead(l.id)}>
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 5h10M6 5V3h4v2M7 8v4M9 8v4M4 5l1 9h6l1-9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
              }
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {total > LIMIT && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '12px 0', fontSize: 13 }}>
            <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ color: 'var(--text2)', padding: '0 8px', lineHeight: '28px' }}>
              Page {page} of {Math.ceil(total / LIMIT)}
            </span>
            <button className="btn btn-sm" disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>

      {/* ── ADD/EDIT MODAL ── */}
      {modal === 'add' && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-title">{editId ? 'Edit lead' : 'Add new lead'}</div>
            <button className="modal-close" onClick={() => setModal(null)}>×</button>
            <div className="form-row">
              <div className="form-field"><label className="form-label">Full name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="Priya Sharma" /></div>
              <div className="form-field"><label className="form-label">Phone</label>
                <input className="form-input" value={form.phone} onChange={e => setForm(p=>({...p,phone:e.target.value}))} placeholder="98765 43210" /></div>
            </div>
            <div className="form-row">
              <div className="form-field"><label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} placeholder="priya@email.com" /></div>
              <div className="form-field"><label className="form-label">City</label>
                <input className="form-input" value={form.city} onChange={e => setForm(p=>({...p,city:e.target.value}))} placeholder="Mumbai" /></div>
            </div>
            <div className="form-row">
              {[
                { key:'source',   label:'Source',   opts: SOURCE_OPTIONS },
                { key:'interest', label:'Interest', opts: INTEREST_OPTIONS },
                { key:'status',   label:'Status',   opts: STATUS_OPTIONS },
              ].map(f => (
                <div key={f.key} className="form-field">
                  <label className="form-label">{f.label}</label>
                  <select className="form-select" value={form[f.key]} onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))}>
                    {f.opts.map(o => <option key={o} value={o}>{o.charAt(0)+o.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
              ))}
              <div className="form-field"><label className="form-label">Course</label>
                <select className="form-select" value={form.courseId} onChange={e => setForm(p=>({...p,courseId:e.target.value}))}>
                  <option value="">— No course —</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.city} · {new Date(c.courseDate).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:8 }}>
              <button className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveLead}>Save lead</button>
            </div>
          </div>
        </div>
      )}

      {/* ── WHATSAPP MODAL ── */}
      {modal === 'wa' && waLead && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-title">Send WhatsApp</div>
            <button className="modal-close" onClick={() => setModal(null)}>×</button>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14 }}>
              To: <strong>{waLead.name}</strong> · <span style={{ color: 'var(--teal)' }}>{waLead.phone}</span>
            </div>
            <div className="form-field">
              <label className="form-label">Template</label>
              <select className="form-select" value={waMsgIdx}
                onChange={e => { const i=parseInt(e.target.value); setWaMsgIdx(i); setWaText(fillTemplate(WA_TEMPLATES[i], waLead)); }}>
                <option value={0}>Inquiry reply</option>
                <option value={1}>Course intro + registration link</option>
                <option value={2}>Pre-course reminder</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Message (edit before sending)</label>
              <textarea className="form-textarea" rows={8} value={waText}
                onChange={e => setWaText(e.target.value)} />
            </div>
            <div className="banner-info" style={{ fontSize: 12 }}>
              Opens WhatsApp Web or app with message pre-filled. 100% free — no API needed.
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-wa" onClick={sendWA}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.5 2C6.253 2 2 6.253 2 11.5c0 1.67.434 3.24 1.2 4.61L2 22l6.044-1.184A9.476 9.476 0 0011.5 21c5.247 0 9.5-4.253 9.5-9.5S16.747 2 11.5 2z"/></svg>
                Open in WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── IMPORT MODAL ── */}
      {modal === 'import' && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-title">Import leads — preview</div>
            <button className="modal-close" onClick={() => setModal(null)}>×</button>
            <div className="banner-success">{importRows.length} leads found. Preview below (first 5 shown).</div>
            <div className="table-wrap" style={{ marginBottom: 16 }}>
              <table>
                <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>City</th><th>Source</th><th>Interest</th><th>Status</th></tr></thead>
                <tbody>{importRows.slice(0,5).map((r,i) => (
                  <tr key={i}>
                    <td>{r.name||'—'}</td><td>{r.phone||'—'}</td><td>{r.email||'—'}</td>
                    <td>{r.city||'—'}</td><td>{r.source||'—'}</td>
                    <td>{r.interest||'—'}</td><td>{r.status||'—'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmImport}>
                Import all {importRows.length} leads
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
