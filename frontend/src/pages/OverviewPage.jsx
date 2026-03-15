import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore.js';
import api from '../services/api.js';
import {
  LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, Tooltip,
  XAxis, YAxis, ResponsiveContainer,
} from 'recharts';

const COLORS = ['#BA7517','#1D9E75','#534AB7','#D85A30','#378ADD','#888780'];

export default function OverviewPage() {
  const { teacher } = useAuthStore();
  const [stats, setStats]     = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/leads/stats'),
      api.get('/courses'),
    ]).then(([s, c]) => {
      setStats(s.data);
      setCourses(c.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty-state"><div>Loading…</div></div>;

  const nextCourse = courses
    .filter(c => new Date(c.courseDate) >= new Date())
    .sort((a, b) => new Date(a.courseDate) - new Date(b.courseDate))[0];

  const daysLeft = nextCourse
    ? Math.max(0, Math.ceil((new Date(nextCourse.courseDate) - new Date()) / 86400000))
    : '—';

  const reg = stats?.byStatus?.find(s => s.status === 'REGISTERED')?._count || 0;
  const comp= stats?.byStatus?.find(s => s.status === 'COMPLETED')?._count  || 0;
  const rate = stats?.total > 0 ? Math.round((reg + comp) / stats.total * 100) : 0;

  // Funnel data
  const contacted = stats?.byStatus
    ?.filter(s => ['CONTACTED','REGISTERED','COMPLETED'].includes(s.status))
    .reduce((a,b) => a + b._count, 0) || 0;

  const funnel = [
    { label: 'Total leads',  n: stats?.total || 0, color: '#BA7517' },
    { label: 'Contacted',    n: contacted,           color: '#534AB7' },
    { label: 'Registered',   n: reg + comp,          color: '#0F6E56' },
    { label: 'Completed',    n: comp,                color: '#1D9E75' },
  ];
  const fMax = funnel[0].n || 1;

  // Source chart data
  const srcData = (stats?.bySource || []).map((s, i) => ({
    name: s.source,
    value: s._count,
    fill: COLORS[i % COLORS.length],
  }));

  // Promo tasks
  const promoTasks = nextCourse ? [
    { daysOffset: -15, label: 'Launch announcement poster' },
    { daysOffset: -12, label: 'Post knowledge reel' },
    { daysOffset: -10, label: 'Share testimonial video' },
    { daysOffset: -7,  label: '7-day reminder poster' },
    { daysOffset: -3,  label: 'Last call broadcast' },
    { daysOffset: -1,  label: 'Final reminder — all channels' },
    { daysOffset:  0,  label: 'Add participants to WhatsApp group' },
  ] : [];

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Overview</div>
        <div className="page-sub">
          Welcome back, {teacher?.name} · {stats?.total || 0} total leads
        </div>
      </div>

      {/* Metrics */}
      <div className="metrics">
        <div className="metric">
          <div className="metric-val">{stats?.total || 0}</div>
          <div className="metric-lbl">Total leads</div>
        </div>
        <div className="metric">
          <div className="metric-val" style={{ color: 'var(--teal-m)' }}>{reg + comp}</div>
          <div className="metric-lbl">Registered</div>
        </div>
        <div className="metric">
          <div className="metric-val" style={{ color: 'var(--purple)' }}>{rate}%</div>
          <div className="metric-lbl">Conversion rate</div>
        </div>
        <div className="metric">
          <div className="metric-val" style={{ color: 'var(--gold)' }}>{daysLeft}</div>
          <div className="metric-lbl">Days to next course</div>
          <div className="metric-sub">
            {nextCourse
              ? `${nextCourse.city} · ${new Date(nextCourse.courseDate).toLocaleDateString('en-IN',{month:'short',day:'numeric'})}`
              : 'No course yet'}
          </div>
        </div>
        <div className="metric">
          <div className="metric-val">{courses.length}</div>
          <div className="metric-lbl">Total courses</div>
        </div>
        <div className="metric">
          <div className="metric-val" style={{ color: 'var(--teal)' }}>{stats?.recentWeek || 0}</div>
          <div className="metric-lbl">New this week</div>
        </div>
      </div>

      <div className="two-col">
        {/* Funnel */}
        <div className="card">
          <div className="card-hdr"><span className="card-title">Lead funnel</span></div>
          {funnel.map(f => (
            <div className="funnel-row" key={f.label}>
              <div className="funnel-num" style={{ color: f.color }}>{f.n}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{f.label}</div>
                <div className="bar-bg">
                  <div className="bar-fill" style={{ width: `${Math.round(f.n / fMax * 100)}%`, background: f.color }} />
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', width: 30, textAlign: 'right' }}>
                {Math.round(f.n / fMax * 100)}%
              </div>
            </div>
          ))}
        </div>

        {/* Source chart */}
        <div className="card">
          <div className="card-hdr"><span className="card-title">Leads by source</span></div>
          {srcData.length === 0
            ? <div className="empty-state" style={{ padding: '20px 0' }}>No leads yet</div>
            : <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {srcData.map(s => (
                    <span key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text2)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: s.fill, display: 'inline-block' }} />
                      {s.name} {s.value}
                    </span>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={srcData} dataKey="value" cx="50%" cy="50%" outerRadius={65} innerRadius={38}>
                      {srcData.map((s, i) => <Cell key={i} fill={s.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </>
          }
        </div>
      </div>

      {/* Upcoming tasks */}
      {nextCourse && (
        <div className="card">
          <div className="card-hdr">
            <span className="card-title">Promotion tasks — {nextCourse.city}</span>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>
              Course: {new Date(nextCourse.courseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
            {promoTasks.map(t => {
              const taskDate = new Date(nextCourse.courseDate);
              taskDate.setDate(taskDate.getDate() + t.daysOffset);
              const past = taskDate < new Date();
              return (
                <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'var(--bg)', fontSize: 12 }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                    border: `1.5px solid ${past ? 'var(--teal-m)' : 'var(--gold)'}`,
                    background: past ? 'var(--teal-m)' : 'transparent',
                  }} />
                  <span style={{ flex: 1, textDecoration: past ? 'line-through' : 'none', color: past ? 'var(--text3)' : 'var(--text)' }}>{t.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0 }}>
                    {taskDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interest breakdown */}
      {stats?.byInterest?.length > 0 && (
        <div className="card">
          <div className="card-hdr"><span className="card-title">Interest breakdown</span></div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={stats.byInterest.map(s => ({ name: s.interest, count: s._count }))}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#BA7517" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
