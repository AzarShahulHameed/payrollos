'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SettingsLayout, Card, Field, Grid2, fieldStyle } from '../_components';
import { settingsApi } from '@/lib/api';

const ROLES = ['ADMIN','HR','MANAGER','ACCOUNTANT','EMPLOYEE'];
const ROLE_DESC: Record<string,string> = {
  SUPER_ADMIN:'Full access — owner account',
  ADMIN:'Full access to all modules',
  HR:'HR, leaves, attendance, documents',
  MANAGER:'View and approve team requests',
  ACCOUNTANT:'Payroll, reports, statutory',
  EMPLOYEE:'ESS portal only',
};
const AV = ['#0a84ff','#28a745','#ff9500','#af52de','#ff375f'];
const av = (n='') => AV[(n?.charCodeAt(0)||0) % AV.length];

export default function UsersSettings() {
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [confirming, setConfirming] = useState<string|null>(null);
  const [invite, setInvite] = useState({ firstName:'', lastName:'', email:'', role:'HR' });
  const [inviteError, setInviteError] = useState('');
  const si = (k:string,v:string) => setInvite(p=>({...p,[k]:v}));

  const { data: users=[] } = useQuery({ queryKey:['users'], queryFn:settingsApi.getUsers });

  const inviteMut = useMutation({
    mutationFn: (dto:any) => settingsApi.inviteUser(dto),
    onSuccess: () => {
      qc.invalidateQueries({queryKey:['users']});
      setShowInvite(false);
      setInvite({firstName:'',lastName:'',email:'',role:'HR'});
      setInviteError('');
    },
    onError: (e:any) => setInviteError(e?.response?.data?.message || 'Invitation failed'),
  });

  const roleMut = useMutation({
    mutationFn: ({id,role}:any) => settingsApi.updateUserRole(id, role),
    onSuccess: () => qc.invalidateQueries({queryKey:['users']}),
  });

  const removeMut = useMutation({
    mutationFn: (id:string) => settingsApi.removeUser(id),
    onSuccess: () => { qc.invalidateQueries({queryKey:['users']}); setConfirming(null); },
    onError: (e:any) => alert(e?.response?.data?.message || 'Cannot remove this user'),
  });

  const inp = fieldStyle;
  const btn = (bg='#0a84ff',fg='#fff'):React.CSSProperties => ({ padding:'7px 14px',background:bg,color:fg,border:'none',borderRadius:7,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit' });

  return (
    <SettingsLayout title="Users & roles" subtitle="Manage who has access and what they can do">
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
        <button style={btn()} onClick={()=>{ setShowInvite(v=>!v); setInviteError(''); }}>
          {showInvite ? 'Cancel' : 'Invite user'}
        </button>
      </div>

      {showInvite && (
        <Card>
          <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)', marginBottom:20 }}>Invite new user</div>
          {inviteError && <div style={{ background:'#fdecea', border:'1px solid #fcc', borderRadius:8, padding:'10px 14px', fontSize:13.5, color:'#d83933', marginBottom:16 }}>{inviteError}</div>}
          <Grid2>
            <Field label="First name"><input style={inp} value={invite.firstName} onChange={e=>si('firstName',e.target.value)} placeholder="First name" /></Field>
            <Field label="Last name"><input style={inp} value={invite.lastName} onChange={e=>si('lastName',e.target.value)} placeholder="Last name" /></Field>
            <Field label="Email address"><input style={inp} type="email" value={invite.email} onChange={e=>si('email',e.target.value)} placeholder="name@company.com" /></Field>
            <Field label="Role">
              <select style={inp} value={invite.role} onChange={e=>si('role',e.target.value)}>
                {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
              <p style={{ fontSize:12, color:'var(--ink-3)', marginTop:5 }}>{ROLE_DESC[invite.role]}</p>
            </Field>
          </Grid2>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button style={btn()} onClick={()=>{ setInviteError(''); inviteMut.mutate(invite); }} disabled={!invite.email||!invite.firstName||inviteMut.isPending}>
              {inviteMut.isPending?'Sending…':'Send invitation'}
            </button>
            <button style={btn('var(--bg)','var(--ink-2)')} onClick={()=>setShowInvite(false)}>Cancel</button>
          </div>
          <p style={{ fontSize:12, color:'var(--ink-3)', marginTop:12 }}>
            A welcome email with login credentials will be sent automatically.
          </p>
        </Card>
      )}

      <Card>
        {(users as any[]).length===0 ? (
          <div style={{ padding:'32px 0', textAlign:'center', color:'var(--ink-3)', fontSize:13.5 }}>No users yet</div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ borderBottom:'1px solid var(--line)' }}>
              {['User','Email','Role','Access level','Actions'].map((h,i)=>(
                <th key={h} style={{ padding:'9px 14px', textAlign:i>=4?'right':'left', fontSize:11, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(users as any[]).map((u:any)=>(
                <tr key={u.id} style={{ borderBottom:'1px solid var(--line)' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='var(--bg)')}
                  onMouseLeave={e=>(e.currentTarget.style.background='')}>
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:32,height:32,borderRadius:'50%',background:av(u.firstName),display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:12,fontWeight:700,flexShrink:0,overflow:'hidden' }}>
                        {u.photoUrl ? <img src={u.photoUrl} style={{ width:'100%',height:'100%',objectFit:'cover' }} alt="" /> : `${u.firstName?.[0]||''}${u.lastName?.[0]||''}`.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize:13.5, fontWeight:500, color:'var(--ink)' }}>{u.firstName} {u.lastName}</div>
                        <div style={{ fontSize:11.5, color:'var(--ink-3)' }}>Joined {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:'12px 14px', color:'var(--ink-2)', fontSize:13 }}>{u.email}</td>
                  <td style={{ padding:'12px 14px' }}>
                    {u.role==='SUPER_ADMIN'
                      ? <span style={{ fontSize:13, color:'var(--ink-3)' }}>Owner</span>
                      : <select value={u.role} onChange={e=>roleMut.mutate({id:u.id,role:e.target.value})}
                          style={{ padding:'5px 10px', border:'1px solid var(--line-2)', borderRadius:7, fontSize:13, fontFamily:'inherit', background:'var(--surface)', color:'var(--ink)', cursor:'pointer' }}>
                          {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                        </select>
                    }
                  </td>
                  <td style={{ padding:'12px 14px', fontSize:12.5, color:'var(--ink-3)' }}>{ROLE_DESC[u.role]||''}</td>
                  <td style={{ padding:'12px 14px', textAlign:'right' }}>
                    {u.role!=='SUPER_ADMIN' && (
                      confirming===u.id ? (
                        <div style={{ display:'flex', gap:6, justifyContent:'flex-end', alignItems:'center' }}>
                          <span style={{ fontSize:12.5, color:'var(--ink-3)' }}>Remove {u.firstName}?</span>
                          <button style={btn('#d83933')} onClick={()=>removeMut.mutate(u.id)}>Remove</button>
                          <button style={btn('var(--bg)','var(--ink-2)')} onClick={()=>setConfirming(null)}>Cancel</button>
                        </div>
                      ) : (
                        <button style={btn('#fdecea','#d83933')} onClick={()=>setConfirming(u.id)}>Remove</button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </SettingsLayout>
  );
}
