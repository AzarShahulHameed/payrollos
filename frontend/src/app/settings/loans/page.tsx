'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SettingsLayout, Card, Field, Grid2, SaveBar, fieldStyle } from '../_components';
import { settingsApi } from '@/lib/api';
import { useRegionStore } from '@/store/auth.store';

export default function LoansSettings() {
  const { region } = useRegionStore();
  const cur = region === 'UAE' ? 'AED' : '₹';
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [f, setF] = useState({ maxLoanAmount:100000, maxInstallments:24, maxAdvanceAmount:50000 });
  const s = (k:string,v:any) => setF(p=>({...p,[k]:v}));
  const { data: settings } = useQuery({ queryKey:['settings'], queryFn:settingsApi.get });
  useEffect(()=>{ if(settings){ const st=settings as any; setF({ maxLoanAmount:st.maxLoanAmount||100000, maxInstallments:st.maxInstallments||24, maxAdvanceAmount:st.maxAdvanceAmount||50000 }); } },[settings]);
  const saveMut = useMutation({ mutationFn:(dto:any)=>settingsApi.update(dto), onSuccess:()=>{ qc.invalidateQueries({queryKey:['settings']}); setSaved(true); setTimeout(()=>setSaved(false),3000); } });
  const inp = fieldStyle;
  return (
    <SettingsLayout title="Loans & advances" subtitle="Configure maximum limits for employee financial assistance">
      <Card>
        <Grid2>
          <Field label={`Maximum loan amount (${cur})`}>
            <input style={inp} type="number" value={f.maxLoanAmount} onChange={e=>s('maxLoanAmount',+e.target.value)} />
            <p style={{ fontSize:12, color:'var(--ink-3)', marginTop:5 }}>Repaid as monthly EMIs deducted from payroll</p>
          </Field>
          <Field label="Maximum loan duration (months)">
            <input style={inp} type="number" min={1} max={60} value={f.maxInstallments} onChange={e=>s('maxInstallments',+e.target.value)} />
            <p style={{ fontSize:12, color:'var(--ink-3)', marginTop:5 }}>Maximum repayment period</p>
          </Field>
          <Field label={`Maximum salary advance (${cur})`}>
            <input style={inp} type="number" value={f.maxAdvanceAmount} onChange={e=>s('maxAdvanceAmount',+e.target.value)} />
            <p style={{ fontSize:12, color:'var(--ink-3)', marginTop:5 }}>Deducted in full from next month's payroll</p>
          </Field>
        </Grid2>
      </Card>
      <SaveBar onSave={()=>saveMut.mutate(f)} saving={saveMut.isPending} saved={saved} />
    </SettingsLayout>
  );
}
