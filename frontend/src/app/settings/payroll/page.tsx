'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SettingsLayout, Card, Field, Grid2, SaveBar, ToggleRow, SectionTitle, fieldStyle } from '../_components';
import { settingsApi } from '@/lib/api';

export default function PayrollSettings() {
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [f, setF] = useState({
    defaultWorkingDays: 22,
    payDay: 28,
    overtimeEnabled: false,
    overtimeMultiplier: 1.5,
  });
  const s = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });

  useEffect(() => {
    if (settings) setF({
      defaultWorkingDays:  (settings as any).defaultWorkingDays  || 22,
      payDay:              (settings as any).payDay              || 28,
      overtimeEnabled:     (settings as any).overtimeEnabled     || false,
      overtimeMultiplier:  (settings as any).overtimeMultiplier  || 1.5,
    });
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: (dto: any) => settingsApi.update(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); setSaved(true); setTimeout(() => setSaved(false), 3000); },
    onError: (e: any) => alert('Save failed: ' + (e?.response?.data?.message || e?.message)),
  });

  const inp = fieldStyle;

  return (
    <SettingsLayout title="Payroll" subtitle="Core payroll configuration applied to every pay run">
      <Card>
        <SectionTitle>Pay cycle</SectionTitle>
        <Grid2>
          <Field label="Working days per month">
            <input style={inp} type="number" min={20} max={31} value={f.defaultWorkingDays} onChange={e => s('defaultWorkingDays', +e.target.value)} />
            <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 5 }}>Used to calculate daily rate for LOP deductions</p>
          </Field>
          <Field label="Pay day (day of month)">
            <input style={inp} type="number" min={1} max={31} value={f.payDay} onChange={e => s('payDay', +e.target.value)} />
            <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 5 }}>Day salaries are disbursed each month</p>
          </Field>
        </Grid2>
      </Card>

      <Card>
        <SectionTitle>Overtime</SectionTitle>
        <ToggleRow
          label="Enable overtime calculations"
          description="When enabled, hours beyond standard working hours are paid at the overtime rate"
          checked={f.overtimeEnabled}
          onChange={v => s('overtimeEnabled', v)}
        />
        {f.overtimeEnabled && (
          <div style={{ marginTop: 16 }}>
            <Field label="Overtime multiplier">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input style={{ ...inp, maxWidth: 120 }} type="number" step={0.25} min={1} max={3} value={f.overtimeMultiplier} onChange={e => s('overtimeMultiplier', +e.target.value)} />
                <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>× hourly rate</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 5 }}>e.g. 1.5 = time-and-a-half, 2.0 = double time</p>
            </Field>
          </div>
        )}
      </Card>

      <SaveBar onSave={() => saveMut.mutate(f)} saving={saveMut.isPending} saved={saved} />
    </SettingsLayout>
  );
}
