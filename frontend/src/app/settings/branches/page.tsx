'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SettingsLayout, Card, Field, fieldStyle } from '../_components';
import { branchesApi } from '@/lib/api';

function BranchForm({ initial, onSave, onCancel, saving }: any) {
  const [f, setF] = useState(initial || { name:'', region:'UAE', address:'', phone:'', isHQ:false });
  const s = (k:string,v:any) => setF((p:any)=>({...p,[k]:v}));
  const inp = fieldStyle;
  const btn = (bg='#0a84ff',fg='#fff'): React.CSSProperties => ({ padding:'7px 14px',background:bg,color:fg,border:'none',borderRadius:7,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit' });
  return (
    <div style={{ background:'var(--bg)', border:'1px solid var(--line)', borderRadius:10, padding:20, marginBottom:16 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <Field label="Branch name"><input style={inp} value={f.name} onChange={e=>s('name',e.target.value)} placeholder="e.g. Dubai HQ" /></Field>
        <Field label="Region">
          <select style={inp} value={f.region} onChange={e=>s('region',e.target.value)}>
            <option value="UAE">UAE</option><option value="INDIA">India</option>
          </select>
        </Field>
        <Field label="Address"><input style={inp} value={f.address||''} onChange={e=>s('address',e.target.value)} placeholder="Office address" /></Field>
        <Field label="Phone"><input style={inp} value={f.phone||''} onChange={e=>s('phone',e.target.value)} placeholder="+971 4 000 0000" /></Field>
      </div>
      <label style={{ display:'flex', alignItems:'center', gap:10, fontSize:13.5, color:'var(--ink)', cursor:'pointer', marginBottom:16 }}>
        <input type="checkbox" checked={f.isHQ} onChange={e=>s('isHQ',e.target.checked)} />
        Mark as headquarters
      </label>
      <div style={{ display:'flex', gap:10 }}>
        <button style={btn()} onClick={()=>onSave(f)} disabled={!f.name||saving}>{saving?'Saving…':initial?'Save changes':'Add branch'}</button>
        <button style={btn('var(--bg)','var(--ink-2)')} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function BranchesSettings() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [confirming, setConfirming] = useState<string|null>(null);
  const { data: branches = [] } = useQuery({ queryKey:['branches'], queryFn:()=>branchesApi.getAll() });
  const createMut = useMutation({ mutationFn:(dto:any)=>branchesApi.create(dto), onSuccess:()=>{ qc.invalidateQueries({queryKey:['branches']}); setShowAdd(false); } });
  const updateMut = useMutation({ mutationFn:({id,dto}:any)=>branchesApi.update(id,dto), onSuccess:()=>{ qc.invalidateQueries({queryKey:['branches']}); setEditing(null); } });
  const deleteMut = useMutation({ mutationFn:(id:string)=>branchesApi.remove(id), onSuccess:()=>{ qc.invalidateQueries({queryKey:['branches']}); setConfirming(null); } });
  const btn = (bg='#0a84ff',fg='#fff'): React.CSSProperties => ({ padding:'7px 14px',background:bg,color:fg,border:'none',borderRadius:7,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit' });
  return (
    <SettingsLayout title="Branches" subtitle="Manage office locations. Each branch can have its own employees and payroll region.">
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
        <button style={btn()} onClick={()=>setShowAdd(v=>!v)}>{showAdd?'Cancel':'Add branch'}</button>
      </div>
      {showAdd && <BranchForm onSave={(f:any)=>createMut.mutate(f)} onCancel={()=>setShowAdd(false)} saving={createMut.isPending} />}
      <Card>
        {(branches as any[]).length===0 ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--ink-3)', fontSize:13.5 }}>No branches yet</div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ borderBottom:'1px solid var(--line)' }}>
              {['Branch','Region','Employees','Address',''].map((h,i)=>(
                <th key={h} style={{ padding:'8px 12px', textAlign:i===4?'right':'left', fontSize:11, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(branches as any[]).map((b:any)=>(
                <tr key={b.id} style={{ borderBottom:'1px solid var(--line)' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='var(--bg)')}
                  onMouseLeave={e=>(e.currentTarget.style.background='')}>
                  {editing?.id===b.id ? (
                    <td colSpan={5} style={{ padding:'12px' }}>
                      <BranchForm initial={editing} onSave={(f:any)=>updateMut.mutate({id:b.id,dto:f})} onCancel={()=>setEditing(null)} saving={updateMut.isPending} />
                    </td>
                  ) : (
                    <>
                      <td style={{ padding:'12px' }}>
                        <span style={{ fontWeight:500, color:'var(--ink)' }}>{b.name}</span>
                        {b.isHQ && <span style={{ marginLeft:8, background:'#e8f1fe', color:'#0a84ff', fontSize:10.5, fontWeight:600, padding:'2px 8px', borderRadius:999 }}>HQ</span>}
                      </td>
                      <td style={{ padding:'12px', color:'var(--ink-2)', fontSize:13 }}>{b.region}</td>
                      <td style={{ padding:'12px', color:'var(--ink-3)', fontSize:13 }}>{b._count?.employees||0}</td>
                      <td style={{ padding:'12px', color:'var(--ink-3)', fontSize:13, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.address||'—'}</td>
                      <td style={{ padding:'12px', textAlign:'right' }}>
                        {confirming===b.id ? (
                          <span style={{ display:'flex', gap:6, justifyContent:'flex-end', alignItems:'center' }}>
                            <span style={{ fontSize:12.5, color:'var(--ink-3)' }}>Delete?</span>
                            <button style={btn('#d83933')} onClick={()=>deleteMut.mutate(b.id)}>Delete</button>
                            <button style={btn('var(--bg)','var(--ink-2)')} onClick={()=>setConfirming(null)}>Cancel</button>
                          </span>
                        ) : (
                          <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                            <button style={btn('var(--bg)','var(--ink)')} onClick={()=>setEditing(b)}>Edit</button>
                            {!b.isHQ && <button style={btn('#fdecea','#d83933')} onClick={()=>setConfirming(b.id)}>Delete</button>}
                          </div>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </SettingsLayout>
  );
}
