import React, { useEffect, useState } from 'react';
import api from '../services/api.js';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = ['#BA7517','#1D9E75','#534AB7','#D85A30','#378ADD','#E24B4A','#888780'];

export default function AnalyticsPage() {
  const [overview,  setOverview]  = useState(null);
  const [timeSeries,setTimeSeries]= useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/overview'),
      api.get('/analytics/leads-over-time'),
      api.get('/analytics/campaigns'),
    ]).then(([o, t, c]) => {
      setOverview(o.data);
      setTimeSeries(t.data);
      setCampaigns(c.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty-state"><div>Loading analytics…</div></div>;
  if (!overview) return null;

  const statusData  = overview.byStatus.map((s, i)  => ({ name: s.status,   value: s._count, fill: COLORS[i % COLORS.length] }));
  const sourceData  = overview.bySource.map((s, i)  => ({ name: s.source,   value: s._count, fill: COLORS[i % COLORS.length] }));
  const interestData= overview.byInterest.map((s,i) => ({ name: s.interest, value: s._count, fill: COLORS[i % COLORS.length] }));

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Analytics</div>
        <div className="page-sub">Performance overview across all leads, courses, and campaigns</div>
      </div>

      {/* Top metrics */}
      <div className="metrics">
        {[
          { val: overview.totalLeads,     lbl: 'Total leads',      color: 'var(--text)' },
          { val: overview.registered,     lbl: 'Registered',       color: 'var(--teal-m)' },
          { val: `${overview.conversionRate}%`, lbl: 'Conversion rate', color: 'var(--purple)' },
          { val: overview.activeCourses,  lbl: 'Active courses',   color: 'var(--gold)' },
          { val: overview.recentWeek,     lbl: 'New this week',    color: 'var(--blue)' },
          { val: overview.recentMonth,    lbl: 'New this month',   color: 'var(--text2)' },
          { val: overview.campaigns.sent, lbl: 'Messages sent',    color: 'var(--teal)' },
          { val: overview.campaigns.total,lbl: 'Campaigns run',    color: 'var(--text3)' },
        ].map(m => (
          <div key={m.lbl} className="metric">
            <div className="metric-val" style={{ color: m.color }}>{m.val}</div>
            <div className="metric-lbl">{m.lbl}</div>
          </div>
        ))}
      </div>

      {/* Lead growth over time */}
      <div className="card">
        <div className="card-hdr"><span className="card-title">Lead growth — last 12 weeks</span></div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={timeSeries}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#BA7517" strokeWidth={2} dot={{ r: 3 }} name="New leads" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Distribution charts */}
      <div className="three-col">
        <div className="card">
          <div className="card-hdr"><span className="card-title">By status</span></div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:8 }}>
            {statusData.map(d => (
              <span key={d.name} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--text2)' }}>
                <span style={{ width:8, height:8, borderRadius:2, background:d.fill, display:'inline-block' }}/>
                {d.name} {d.value}
              </span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={statusData} dataKey="value" cx="50%" cy="50%" outerRadius={60} innerRadius={30}>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-hdr"><span className="card-title">By source</span></div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={sourceData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
              <Tooltip />
              <Bar dataKey="value" name="Leads" radius={[0,4,4,0]}>
                {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-hdr"><span className="card-title">By interest</span></div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={interestData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" name="Leads" radius={[4,4,0,0]}>
                {interestData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Campaign performance table */}
      {campaigns.length > 0 && (
        <div className="card">
          <div className="card-hdr"><span className="card-title">Campaign performance</span></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Campaign</th><th>Channel</th><th>Course</th>
                  <th>Status</th><th>Sent</th><th>Total</th><th>Delivery</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight:600 }}>{c.name}</td>
                    <td><span className="badge b-new" style={{ fontSize:10 }}>{c.channel}</span></td>
                    <td style={{ color:'var(--text2)' }}>{c.course || '—'}</td>
                    <td><span className={`badge b-${c.status.toLowerCase()}`}>{c.status}</span></td>
                    <td>{c.sent}</td>
                    <td>{c.total}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div className="bar-bg" style={{ width:60 }}>
                          <div className="bar-fill" style={{ width:`${c.openRate}%`, background:'var(--teal-m)' }} />
                        </div>
                        <span style={{ fontSize:11, color:'var(--text3)' }}>{c.openRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
