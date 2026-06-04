'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SettingsLayout, Card, SaveBar, ToggleRow } from '../_components';
import { settingsApi } from '@/lib/api';

const NOTIFS = [
  { key:'notifyPayrunDraft',      label:'Pay run created as draft',             desc:'Notify admins when a draft payrun is generated' },
  { key:'notifyPayrunApproved',   label:'Pay run approved',                     desc:'Notify when a payrun moves to approved status' },
  { key:'notifyPayslipReleased',  label:'Payslip released to employee',         desc:'Notify employees when their payslip is available' },
  { key:'notifyLeaveApproval',    label:'Leave request approved or rejected',    desc:'Notify employees of leave decisions' },
  { key:'notifyLoanApproval',     label:'Loan request approved or rejected',     desc:'Notify employees of loan decisions' },
];

export default function NotificationsSettings() {
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [f, setF] = useState<Record<string,boolean>>({ notifyPayrunDraft:true, notifyPayrunApproved:true, notifyPayslipReleased:true, notifyLeaveApproval:true, notifyLoanApproval:true });
  const { data: settings } = useQuery({ queryKey:['settings'], queryFn:settingsApi.get });
  useEffect(()=>{ if(settings){ const st=settings as any; const upd:Record<string,boolean>={}; NOTIFS.forEach(n=>{ upd[n.key]=st[n.key]!==false; }); setF(upd); } },[settings]);
  const saveMut = useMutation({ mutationFn:(dto:any)=>settingsApi.update(dto), onSuccess:()=>{ qc.invalidateQueries({queryKey:['settings']}); setSaved(true); setTimeout(()=>setSaved(false),3000); } });
  return (
    <SettingsLayout title="Notifications" subtitle="Configure automated email notifications sent by the system">
      <Card>
        {NOTIFS.map(n=>(
          <ToggleRow key={n.key} label={n.label} description={n.desc} checked={f[n.key]||false} onChange={v=>setF(p=>({...p,[n.key]:v}))} />
        ))}
      </Card>
      <div style={{ background:'var(--bg)', border:'1px solid var(--line)', borderRadius:10, padding:'14px 18px', fontSize:13, color:'var(--ink-3)', marginBottom:16 }}>
        Notifications are sent to the SMTP address configured in your backend environment. Ensure SMTP_HOST, SMTP_USER, and SMTP_PASS are set in your backend .env file.
      </div>
      <SaveBar onSave={()=>saveMut.mutate(f)} saving={saveMut.isPending} saved={saved} />
    </SettingsLayout>
  );
}
