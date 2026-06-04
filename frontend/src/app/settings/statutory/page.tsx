'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SettingsLayout, Card, Field, SaveBar, ToggleRow, SectionTitle, fieldStyle } from '../_components';
import { settingsApi } from '@/lib/api';
import { useRegionStore } from '@/store/auth.store';
 
const LWF_STATES = [
  'ANDHRA_PRADESH','GUJARAT','HARYANA','KARNATAKA','KERALA',
  'MADHYA_PRADESH','MAHARASHTRA','ODISHA','PUNJAB','TAMIL_NADU',
  'TELANGANA','WEST_BENGAL',
];
 
export default function StatutorySettings() {
  const { region } = useRegionStore();
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [f, setF] = useState({
    pfEnabled: true,          pfWageCeiling: 15000,
    esiEnabled: true,         esiEmployerCeiling: 21000,
    ptEnabled: true,
    lwfEnabled: false,        lwfState: 'TAMIL_NADU',
    taxRegime: 'NEW',
    gratuityEnabled: true,    gpssaEnabled: false,
    wpsEnabled: true,         bankName: '', wpsRoutingCode: '',
  });
  const s = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
 
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });
 
  useEffect(() => {
    if (settings) {
      const st = settings as any;
      setF(p => ({
        ...p,
        pfEnabled: st.pfEnabled !== false,
        pfWageCeiling: st.pfWageCeiling || 15000,
        esiEnabled: st.esiEnabled !== false,
        esiEmployerCeiling: st.esiEmployerCeiling || 21000,
        ptEnabled: st.ptEnabled !== false,
        lwfEnabled: st.lwfEnabled || false,
        lwfState: st.lwfState || 'TAMIL_NADU',
        taxRegime: st.taxRegime || 'NEW',
        gratuityEnabled: st.gratuityEnabled !== false,
        gpssaEnabled: st.gpssaEnabled || false,
        wpsEnabled: st.wpsEnabled !== false,
        bankName: st.bankName || '',
        wpsRoutingCode: st.wpsRoutingCode || '',
      }));
    }
  }, [settings]);
 
  const saveMut = useMutation({
    mutationFn: (dto: any) => settingsApi.update(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (e: any) => {
      alert('Save failed: ' + (e?.response?.data?.message || 'Run: npx prisma migrate dev'));
    },
  });
 
  const inp = fieldStyle;
 
  return (
    <SettingsLayout title="Statutory" subtitle={`Mandatory compliance configuration for ${region === 'UAE' ? 'UAE' : 'India'}`}>
 
      {region === 'INDIA' && (
        <>
          <Card>
            <SectionTitle>Provident fund</SectionTitle>
            <ToggleRow
              label="Provident Fund (PF)"
              description="Employee 12% + Employer 12% contribution on basic salary"
              checked={f.pfEnabled}
              onChange={v => s('pfEnabled', v)}
            />
            {f.pfEnabled && (
              <div style={{ marginTop: 16 }}>
                <Field label="PF wage ceiling (₹)">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input style={{ ...inp, maxWidth: 160 }} type="number" value={f.pfWageCeiling} onChange={e => s('pfWageCeiling', +e.target.value)} />
                    <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>PF calculated on min(basic, ceiling)</span>
                  </div>
                </Field>
              </div>
            )}
          </Card>
 
          <Card>
            <SectionTitle>Employees' State Insurance</SectionTitle>
            <ToggleRow
              label="ESI"
              description="Employee 0.75% + Employer 3.25% · Applicable only if gross salary is within the ceiling"
              checked={f.esiEnabled}
              onChange={v => s('esiEnabled', v)}
            />
            {f.esiEnabled && (
              <div style={{ marginTop: 16 }}>
                <Field label="ESI gross salary ceiling (₹)">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input style={{ ...inp, maxWidth: 160 }} type="number" value={f.esiEmployerCeiling} onChange={e => s('esiEmployerCeiling', +e.target.value)} />
                    <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Employees earning above this are exempt</span>
                  </div>
                </Field>
              </div>
            )}
          </Card>
 
          <Card>
            <SectionTitle>Professional tax & LWF</SectionTitle>
            <ToggleRow
              label="Professional Tax (PT)"
              description="State-level slab-based deduction — maximum ₹1,250 per month"
              checked={f.ptEnabled}
              onChange={v => s('ptEnabled', v)}
            />
            <ToggleRow
              label="Labour Welfare Fund (LWF)"
              description="State-specific, collected half-yearly or monthly"
              checked={f.lwfEnabled}
              onChange={v => s('lwfEnabled', v)}
            />
            {f.lwfEnabled && (
              <div style={{ marginTop: 16 }}>
                <Field label="LWF state">
                  <select style={{ ...inp, maxWidth: 280 }} value={f.lwfState} onChange={e => s('lwfState', e.target.value)}>
                    {LWF_STATES.map(st => <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>)}
                  </select>
                </Field>
              </div>
            )}
          </Card>
 
          <Card>
            <SectionTitle>Income tax regime</SectionTitle>
            <Field label="Default tax regime for all employees">
              <select style={{ ...inp, maxWidth: 480 }} value={f.taxRegime} onChange={e => s('taxRegime', e.target.value)}>
                <option value="NEW">New regime — Finance Act 2026 (default under ITA 2025)</option>
                <option value="OLD">Old regime — employee must individually opt in</option>
              </select>
            </Field>
 
            <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', marginTop: 4 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--line)', borderBottom: '1px solid var(--line)' }}>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Income range</th>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Tax rate</th>
                  </tr>
                </thead>
                <tbody>
                  {(f.taxRegime === 'NEW'
                    ? [['Up to ₹4,00,000','Nil'],['₹4,00,001 – ₹8,00,000','5%'],['₹8,00,001 – ₹12,00,000','10%'],['₹12,00,001 – ₹16,00,000','15%'],['₹16,00,001 – ₹20,00,000','20%'],['₹20,00,001 – ₹24,00,000','25%'],['Above ₹24,00,000','30%']]
                    : [['Up to ₹2,50,000','Nil'],['₹2,50,001 – ₹5,00,000','5%'],['₹5,00,001 – ₹10,00,000','20%'],['Above ₹10,00,000','30%']]
                  ).map(([range, rate]) => (
                    <tr key={range} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '9px 14px', color: 'var(--ink-2)', fontSize: 13 }}>{range}</td>
                      <td style={{ padding: '9px 14px', color: 'var(--ink)', fontWeight: 600, fontSize: 13 }}>{rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 10 }}>
              {f.taxRegime === 'NEW'
                ? 'Standard deduction ₹75,000 · Full rebate (Sec 156(2)) if income ≤ ₹12,00,000 · Cess 4%'
                : 'Standard deduction ₹50,000 · 80C ₹1.5L · 80D ₹25,000 · HRA exemption applicable'}
            </p>
          </Card>
        </>
      )}
 
      {region === 'UAE' && (
        <>
          <Card>
            <SectionTitle>Gratuity</SectionTitle>
            <ToggleRow
              label="Gratuity accrual"
              description="21 days basic per year for years 1–5, 30 days per year for year 6 onwards — UAE Labour Law Article 51"
              checked={f.gratuityEnabled}
              onChange={v => s('gratuityEnabled', v)}
            />
          </Card>
 
          <Card>
            <SectionTitle>Social insurance</SectionTitle>
            <ToggleRow
              label="GPSSA / GOSI (UAE nationals only)"
              description="Employer contribution 12.5% + Employee contribution 5% of basic salary"
              checked={f.gpssaEnabled}
              onChange={v => s('gpssaEnabled', v)}
            />
          </Card>
 
          <Card>
            <SectionTitle>Wages Protection System</SectionTitle>
            <ToggleRow
              label="WPS enabled"
              description="Mandatory salary disbursement through WPS-approved banks for all UAE employers"
              checked={f.wpsEnabled}
              onChange={v => s('wpsEnabled', v)}
            />
            {f.wpsEnabled && (
              <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Bank name">
                  <input style={inp} value={f.bankName} onChange={e => s('bankName', e.target.value)} placeholder="Emirates NBD" />
                </Field>
                <Field label="WPS routing code">
                  <input style={inp} value={f.wpsRoutingCode} onChange={e => s('wpsRoutingCode', e.target.value)} placeholder="033" />
                </Field>
              </div>
            )}
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 12 }}>
              WPS SIF files are generated automatically in Reports after each payrun is processed and marked paid.
            </p>
          </Card>
        </>
      )}
 
      <SaveBar onSave={() => saveMut.mutate(f)} saving={saveMut.isPending} saved={saved} />
    </SettingsLayout>
  );
}