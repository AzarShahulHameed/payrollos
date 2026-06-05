'use client';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const AV = ['#0a84ff','#28a745','#ff9500','#af52de','#ff375f'];
const avColor = (n='') => AV[(n?.charCodeAt(0)||0) % AV.length];
const locIcon = (t?:string) => t==='OFFICE'?'🏢':t==='REMOTE'?'💼':t==='HOME'?'🏠':'❓';
const locColor = (t?:string) => t==='OFFICE'?'#0a84ff':t==='REMOTE'?'#ff9500':t==='HOME'?'#28a745':'#6e6e73';

export default function LiveAttendance() {
  const { user } = useAuthStore();
  const isAdmin = ['SUPER_ADMIN','ADMIN','HR'].includes(user?.role||'');

  const { data: live = [], isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['live-attendance'],
    queryFn: () => api.get('/attendance/live').then(r=>r.data),
    refetchInterval: 30000,
  });

  const records = live as any[];
  const active  = records.filter(r => r.isActive);
  const done    = records.filter(r => !r.isActive);

  return (
    <AppLayout>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:700, letterSpacing:'-.02em', color:'var(--ink)' }}>Live attendance</h1>
          <p style={{ fontSize:14, color:'var(--ink-3)', marginTop:4 }}>
            {new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})} · Updates every 30 seconds
          </p>
        </div>
        <div style={{ fontSize:12, color:'var(--ink-3)' }}>
          Last updated: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) : '—'}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
        {[
          { label:'Currently working', value:active.length, color:'#28a745' },
          { label:'Completed today',   value:done.length,   color:'#6e6e73' },
          { label:'Total today',       value:records.length, color:'#0a84ff' },
        ].map(c=>(
          <div key={c.label} style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:12, padding:'18px 20px' }}>
            <div style={{ fontSize:28, fontWeight:800, color:c.color }}>{c.value}</div>
            <div style={{ fontSize:13, color:'var(--ink-3)', marginTop:4 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {active.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:12 }}>Currently working ({active.length})</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
            {active.map((r:any) => (
              <div key={r.id} style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:14, padding:'18px 20px', boxShadow:'var(--sh-sm)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                  <div style={{ width:44, height:44, borderRadius:'50%', background:avColor(r.employee?.firstName), display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:14, fontWeight:700, flexShrink:0, overflow:'hidden' }}>
                    {r.employee?.photoUrl ? <img src={r.employee.photoUrl} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }} /> : `${r.employee?.firstName?.[0]||''}${r.employee?.lastName?.[0]||''}`}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>{r.employee?.firstName} {r.employee?.lastName}</div>
                    <div style={{ fontSize:12, color:'var(--ink-3)' }}>{r.employee?.designation}</div>
                  </div>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:'#28a745' }} />
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <span style={{ fontSize:12.5, fontWeight:600, color:locColor(r.locationType), background:locColor(r.locationType)+'18', padding:'4px 10px', borderRadius:999 }}>
                    {locIcon(r.locationType)} {r.locationType}
                  </span>
                  <span style={{ fontSize:12.5, color:'var(--ink-2)', background:'var(--bg)', padding:'4px 10px', borderRadius:999, border:'1px solid var(--line)' }}>
                    {r.hoursToday?.toFixed(1)}h
                  </span>
                </div>
                {isAdmin && r.latitude && (
                  <div style={{ marginTop:10, padding:'7px 10px', background:'var(--bg)', borderRadius:8, fontSize:11.5, color:'var(--ink-3)' }}>
                    📍 {r.latitude?.toFixed(4)}, {r.longitude?.toFixed(4)}
                    {r.wifiIp && ` · ${r.wifiIp}`}
                    {r.geoValidated !== null && <span style={{ marginLeft:6, color:r.geoValidated?'#28a745':'#d83933', fontWeight:600 }}>{r.geoValidated?'✓ GPS':'✗ GPS'}</span>}
                    {r.ipValidated  !== null && <span style={{ marginLeft:6, color:r.ipValidated ?'#28a745':'#d83933', fontWeight:600 }}>{r.ipValidated ?'✓ IP':'✗ IP'}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {records.length === 0 && !isLoading && (
        <div style={{ padding:'60px 0', textAlign:'center', color:'var(--ink-3)' }}>
          <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)', marginBottom:6 }}>No attendance today</div>
          <div style={{ fontSize:13.5 }}>No employees have clocked in yet</div>
        </div>
      )}
    </AppLayout>
  );
}
