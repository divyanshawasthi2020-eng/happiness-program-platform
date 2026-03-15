import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';

const TEMPLATES = [
  { key:'classic_gold',   name:'Classic Gold',   bg:'#FAEEDA', accent:'#BA7517', textColor:'#1A1A18' },
  { key:'sunset_warm',    name:'Sunset Warm',    bg:'#FFF3E8', accent:'#D85A30', textColor:'#1A1A18' },
  { key:'calm_teal',      name:'Calm Teal',      bg:'#E1F5EE', accent:'#0F6E56', textColor:'#1A1A18' },
  { key:'deep_purple',    name:'Deep Purple',    bg:'#EEEDFE', accent:'#534AB7', textColor:'#1A1A18' },
];

export default function PostersPage() {
  const { teacher }       = useAuthStore();
  const [posters, setPosters] = useState([]);
  const [canvaStatus, setCanvaStatus] = useState(null);
  const [modal, setModal] = useState(null);
  const [selectedTmpl, setSelectedTmpl] = useState(TEMPLATES[0]);
  const [form, setForm]   = useState({ city:'', courseDate:'', teacherName:'', venue:'', time:'' });
  const canvasRef         = useRef(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    api.get('/posters').then(r => setPosters(r.data));
    api.get('/posters/canva-auth-url').then(r => setCanvaStatus(r.data));
    setForm(p => ({ ...p, teacherName: teacher?.name || '' }));
  }, []);

  // Draw poster on canvas
  useEffect(() => {
    if (modal !== 'create') return;
    drawPoster();
  }, [form, selectedTmpl, modal]);

  function drawPoster() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = 800, H = 800;
    canvas.width = W; canvas.height = H;

    const { bg, accent, textColor } = selectedTmpl;

    // Background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Top accent bar
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, W, 80);

    // Art of Living header text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ART OF LIVING', W/2, 38);
    ctx.font = '16px Segoe UI, sans-serif';
    ctx.fillText('Happiness Program', W/2, 62);

    // Big decorative circle
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.12;
    ctx.beginPath(); ctx.arc(W/2, H/2, 280, 0, Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 0.07;
    ctx.beginPath(); ctx.arc(W/2, H/2, 340, 0, Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 1;

    // Smiley
    ctx.strokeStyle = accent;
    ctx.fillStyle = accent;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(W/2, 220, 60, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(W/2 - 20, 208, 7, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(W/2 + 20, 208, 7, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(W/2, 228, 28, 0.15*Math.PI, 0.85*Math.PI); ctx.stroke();

    // Main headline
    ctx.fillStyle = textColor;
    ctx.font = 'bold 52px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Discover', W/2, 345);
    ctx.fillStyle = accent;
    ctx.fillText('Happiness', W/2, 410);

    // Divider
    ctx.fillStyle = accent;
    ctx.fillRect(W/2 - 60, 428, 120, 3);

    // Benefits row
    const benefits = ['Better Sleep', 'Less Stress', 'More Energy'];
    ctx.font = '15px Segoe UI, sans-serif';
    ctx.fillStyle = textColor;
    benefits.forEach((b, i) => {
      const x = 200 + i * 200;
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.arc(x, 468, 14, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Segoe UI, sans-serif';
      ctx.fillText('✓', x - 4, 473);
      ctx.fillStyle = textColor;
      ctx.font = '14px Segoe UI, sans-serif';
      ctx.fillText(b, x, 498);
    });

    // Date pill
    if (form.courseDate) {
      ctx.fillStyle = accent;
      roundRect(ctx, W/2 - 140, 524, 280, 44, 22);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      const dateStr = new Date(form.courseDate).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
      ctx.fillText(dateStr, W/2, 551);
    }

    // City
    if (form.city) {
      ctx.fillStyle = textColor;
      ctx.font = '22px Segoe UI, sans-serif';
      ctx.fillText(`📍 ${form.city}`, W/2, 600);
    }

    // Venue / Time
    if (form.venue || form.time) {
      ctx.fillStyle = 'var(--text3)';
      ctx.font = '15px Segoe UI, sans-serif';
      ctx.fillStyle = '#888';
      ctx.fillText([form.venue, form.time].filter(Boolean).join(' · '), W/2, 632);
    }

    // Teacher name
    if (form.teacherName) {
      ctx.fillStyle = textColor;
      ctx.font = 'bold 18px Segoe UI, sans-serif';
      ctx.fillText(form.teacherName, W/2, 682);
      ctx.font = '13px Segoe UI, sans-serif';
      ctx.fillStyle = '#888';
      ctx.fillText('Art of Living Teacher', W/2, 702);
    }

    // Bottom bar
    ctx.fillStyle = accent;
    ctx.fillRect(0, H - 50, W, 50);
    ctx.fillStyle = '#fff';
    ctx.font = '13px Segoe UI, sans-serif';
    ctx.fillText('www.artofliving.org', W/2, H - 20);

    setPreview(canvas.toDataURL('image/png'));
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  const downloadPoster = () => {
    if (!preview) return;
    const a = document.createElement('a');
    a.href = preview;
    a.download = `happiness-program-${form.city||'poster'}.png`;
    a.click();
    toast.success('Poster downloaded!');
  };

  const savePoster = async () => {
    try {
      await api.post('/posters', {
        templateKey: selectedTmpl.key,
        city: form.city, courseDate: form.courseDate,
        teacherName: form.teacherName, data: { ...form, template: selectedTmpl.key },
      });
      toast.success('Poster saved');
      const r = await api.get('/posters');
      setPosters(r.data);
      setModal(null);
    } catch (err) {
      toast.error('Save failed');
    }
  };

  return (
    <div>
      <div className="page-header-row">
        <div>
          <div className="page-title">Poster Generator</div>
          <div className="page-sub">Create promotional posters for WhatsApp, Instagram, and print</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(p => ({ ...p, teacherName: teacher?.name||'' })); setModal('create'); }}>
          + Create poster
        </button>
      </div>

      {/* Canva connect banner */}
      {canvaStatus && (
        <div className="banner-info">
          <strong>Canva integration:</strong>{' '}
          {canvaStatus.available
            ? <><a href={canvaStatus.url} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)', fontWeight: 600 }}>Connect your Canva account</a> to open and edit poster designs directly in Canva.</>
            : <>Set <code>CANVA_CLIENT_ID</code> in backend <code>.env</code> to enable Canva editing. Get free API access at <a href="https://www.canva.com/developers/" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>canva.com/developers</a>.</>
          }
        </div>
      )}

      {/* Saved posters */}
      {posters.length > 0 && (
        <div className="card">
          <div className="card-hdr"><span className="card-title">Saved posters</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 12 }}>
            {posters.map(p => (
              <div key={p.id} style={{ border: '0.5px solid var(--border)', borderRadius: 10, padding: 12, background: 'var(--bg)' }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{p.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{p.city} · {p.courseDate || 'No date'}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <button className="btn btn-sm" onClick={() => { setForm({ city:p.city||'', courseDate:p.courseDate||'', teacherName:p.teacherName||'', venue: p.data?.venue||'', time: p.data?.time||'' }); setSelectedTmpl(TEMPLATES.find(t=>t.key===p.templateKey)||TEMPLATES[0]); setModal('create'); }}>
                    Edit
                  </button>
                  {p.canvaUrl && <a href={p.canvaUrl} target="_blank" rel="noreferrer" className="btn btn-sm" style={{ textDecoration:'none' }}>Canva</a>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Template gallery */}
      <div className="card">
        <div className="card-hdr"><span className="card-title">Available templates</span></div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))', gap:12 }}>
          {TEMPLATES.map(t => (
            <div key={t.key} style={{ borderRadius:12, overflow:'hidden', border: '0.5px solid var(--border)', cursor:'pointer' }}
              onClick={() => { setSelectedTmpl(t); setModal('create'); }}>
              <div style={{ height:100, background:t.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ width:40, height:40, borderRadius:'50%', background:t.accent, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:20, color:'#fff' }}>☺</span>
                </div>
              </div>
              <div style={{ padding:'10px 12px', background:'var(--surface)' }}>
                <div style={{ fontWeight:600, fontSize:13 }}>{t.name}</div>
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>Click to create</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create modal */}
      {modal === 'create' && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" style={{ maxWidth: 900 }}>
            <div className="modal-title">Create poster</div>
            <button className="modal-close" onClick={() => setModal(null)}>×</button>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
              {/* Controls */}
              <div>
                <div className="form-field"><label className="form-label">Template style</label>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {TEMPLATES.map(t => (
                      <div key={t.key}
                        onClick={() => setSelectedTmpl(t)}
                        style={{ padding:'6px 12px', borderRadius:8, fontSize:12, cursor:'pointer', fontWeight: selectedTmpl.key===t.key?600:400, background: selectedTmpl.key===t.key ? t.bg : 'var(--bg)', border: `1px solid ${selectedTmpl.key===t.key ? t.accent : 'var(--border)'}`, color: selectedTmpl.key===t.key ? t.accent : 'var(--text2)' }}>
                        {t.name}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="form-field"><label className="form-label">City</label>
                  <input className="form-input" value={form.city} onChange={e => setForm(p=>({...p,city:e.target.value}))} placeholder="Mumbai" /></div>
                <div className="form-field"><label className="form-label">Course date</label>
                  <input className="form-input" type="date" value={form.courseDate} onChange={e => setForm(p=>({...p,courseDate:e.target.value}))} /></div>
                <div className="form-field"><label className="form-label">Teacher name</label>
                  <input className="form-input" value={form.teacherName} onChange={e => setForm(p=>({...p,teacherName:e.target.value}))} placeholder="Meera Sharma" /></div>
                <div className="form-field"><label className="form-label">Venue</label>
                  <input className="form-input" value={form.venue} onChange={e => setForm(p=>({...p,venue:e.target.value}))} placeholder="Art of Living Centre, Andheri" /></div>
                <div className="form-field"><label className="form-label">Time</label>
                  <input className="form-input" value={form.time} onChange={e => setForm(p=>({...p,time:e.target.value}))} placeholder="7:00 PM – 9:00 PM" /></div>
                <div style={{ display:'flex', gap:8, marginTop:4 }}>
                  <button className="btn btn-primary" onClick={downloadPoster}>Download PNG</button>
                  <button className="btn" onClick={savePoster}>Save poster</button>
                </div>
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:10, lineHeight:1.6 }}>
                  Downloaded poster is 800×800px — perfect for WhatsApp and Instagram square posts.<br/>
                  For stories (9:16), resize in Canva after downloading.
                </div>
              </div>
              {/* Preview */}
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:8 }}>Live preview</div>
                <canvas ref={canvasRef} style={{ width:'100%', borderRadius:10, border:'0.5px solid var(--border)' }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
