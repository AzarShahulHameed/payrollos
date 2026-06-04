'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { api } from '@/lib/api';


function exportAuditCSV(logs: any[]) {
  const headers = ['Time','User','Email','Action','Entity','Entity ID','Changes'];
  const rows = logs.map((log: any) => {
    let changes = '';
    try {
      const nv = log.newValues ? JSON.parse(log.newValues) : null;
      const ov = log.oldValues ? JSON.parse(log.oldValues) : null;
      if (nv && ov) changes = Object.keys(nv).filter(k=>nv[k]!==ov[k]).map(k=>`${k}: ${ov[k]} → ${nv[k]}`).join(' | ');
      else if (nv) changes = Object.entries(nv).map(([k,v])=>`${k}: ${v}`).join(' | ');
    } catch {}
    return [
      new Date(log.createdAt).toLocaleString('en-GB'),
      `${log.performedBy?.firstName||''} ${log.performedBy?.lastName||''}`.trim(),
      log.performedBy?.email || '',
      log.action || '',
      log.entityType || '',
      log.entityId || '',
      changes,
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',');
  });
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

export default function AuditLogPage() {
  const [entityType, setEntityType] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-log', entityType],
    queryFn: () => api.get('/audit-log', { params: { limit: 200, ...(entityType && { entityType }) } }).then(r => r.data),
  });

  const TYPES = ['','EMPLOYEE','PAYRUN','LEAVE','LOAN','ADVANCE','SALARY','USER','FULL_AND_FINAL'];
  const ACTION_COLORS: Record<string,{bg:string;c:string}> = {
    CREATE:       {bg:'#e7f6ea',c:'#28a745'},
    UPDATE:       {bg:'#e8f1fe',c:'#0a84ff'},
    DELETE:       {bg:'#fdecea',c:'#d83933'},
    APPROVE:      {bg:'#e7f6ea',c:'#28a745'},
    REJECT:       {bg:'#fdecea',c:'#d83933'},
    SUBMIT:       {bg:'#fdf3e0',c:'#c77700'},
    FULL_AND_FINAL:{bg:'#fdecea',c:'#d83933'},
    LOGIN:        {bg:'#f2f2f7',c:'#6e6e73'},
  };

  return (
    <AppLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>Audit log</h1>
          <p style={{ fontSize: 14, color: '#6e6e73', marginTop: 4 }}>Track all changes made in the system</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <button onClick={()=>exportAuditCSV(logs as any[])} disabled={(logs as any[]).length===0}
            style={{ padding:'7px 16px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:8, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity:(logs as any[]).length===0?.5:1 }}>
            Export CSV
          </button>
          <select value={entityType} onChange={e => setEntityType(e.target.value)}
          style={{ height: 34, padding: '0 28px 0 10px', border: '1px solid #d2d2d6', borderRadius: 9, fontSize: 13.5, background: '#fff', fontFamily: 'inherit', outline: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236e6e73' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', WebkitAppearance: 'none' as any }}>
          {TYPES.map(t => <option key={t} value={t}>{t || 'All entities'}</option>)}
        </select>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e3e3e6', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead><tr style={{ borderBottom: '1px solid #e3e3e6', background: '#fafafa' }}>
            {['Time','User','Action','Entity','Entity ID','Changes'].map(h => (
              <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#a1a1a6', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#a1a1a6' }}>Loading…</td></tr>
            : (logs as any[]).length === 0 ? (
              <tr><td colSpan={6}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '52px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 40, opacity: .3, marginBottom: 14 }}>📋</div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>No audit logs yet</div>
                  <div style={{ fontSize: 13.5, color: '#a1a1a6', marginTop: 5 }}>Actions will appear here as your team uses the system</div>
                </div>
              </td></tr>
            ) : (logs as any[]).map((log: any) => {
              const ac = ACTION_COLORS[log.action?.split('_')[0]] || {bg:'#f2f2f7',c:'#6e6e73'};
              let changes = '';
              try {
                const nv = log.newValues ? JSON.parse(log.newValues) : null;
                const ov = log.oldValues ? JSON.parse(log.oldValues) : null;
                if (nv && ov) {
                  const diffs = Object.keys(nv).filter(k => nv[k] !== ov[k]).map(k => `${k}: ${ov[k]} → ${nv[k]}`);
                  changes = diffs.slice(0,2).join(', ');
                } else if (nv) {
                  changes = Object.entries(nv).slice(0,2).map(([k,v]) => `${k}: ${v}`).join(', ');
                }
              } catch {}
              return (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(0,0,0,.04)', transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f7f9fc')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ padding: '12px 18px', color: '#6e6e73', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                    {new Date(log.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
                  </td>
                  <td style={{ padding: '12px 18px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{log.performedBy?.firstName} {log.performedBy?.lastName}</div>
                    <div style={{ fontSize: 11.5, color: '#a1a1a6' }}>{log.performedBy?.email}</div>
                  </td>
                  <td style={{ padding: '12px 18px' }}>
                    <span style={{ background: ac.bg, color: ac.c, fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 999 }}>{log.action}</span>
                  </td>
                  <td style={{ padding: '12px 18px', color: '#6e6e73' }}>{log.entityType}</td>
                  <td style={{ padding: '12px 18px', color: '#a1a1a6', fontSize: 12, fontFamily: 'monospace' }}>{log.entityId?.slice(0,8)}…</td>
                  <td style={{ padding: '12px 18px', color: '#6e6e73', fontSize: 12.5, maxWidth: 280 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{changes || '—'}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
