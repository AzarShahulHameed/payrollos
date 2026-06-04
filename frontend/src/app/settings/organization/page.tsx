'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SettingsLayout, Card, Field, Grid2, SaveBar, fieldStyle } from '../_components';
import { settingsApi } from '@/lib/api';
import { useRegionStore, useAuthStore } from '@/store/auth.store';
import PhotoUpload from '@/components/ui/PhotoUpload';

export default function OrganisationSettings() {
  const { region } = useRegionStore();
  const { updateUser } = useAuthStore();
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [f, setF] = useState({
    name: '', email: '', phone: '', address: '',
    website: '', taxId: '', industry: '', logoUrl: '',
  });
  const s = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const { data: org } = useQuery({ queryKey: ['org'], queryFn: settingsApi.getOrg });

  // Sync when org loads
  useEffect(() => {
    if (org) setF({
      name:     (org as any).name     || '',
      email:    (org as any).email    || '',
      phone:    (org as any).phone    || '',
      address:  (org as any).address  || '',
      website:  (org as any).website  || '',
      taxId:    (org as any).taxId    || '',
      industry: (org as any).industry || '',
      logoUrl:  (org as any).logoUrl  || '',
    });
  }, [org]);

  const saveMut = useMutation({
    mutationFn: (dto: any) => settingsApi.updateOrg(dto),
    onSuccess: (data: any) => {
      // Invalidate org cache everywhere it's used
      qc.invalidateQueries({ queryKey: ['org'] });
      qc.invalidateQueries({ queryKey: ['org-for-payslip'] });
      qc.invalidateQueries({ queryKey: ['payslip-full'] });
      // Update sidebar brand name instantly
      if (data?.name) updateUser({ organizationName: data.name });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (e: any) => {
      alert('Save failed: ' + (e?.response?.data?.message || e?.message || 'Check console'));
    },
  });

  const inp = fieldStyle;

  return (
    <SettingsLayout title="Organisation" subtitle="Company details that appear on payslips, reports, and documents">

      <Card>
        {/* Logo */}
        <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--line)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 14 }}>Company logo</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Logo preview */}
            <div style={{ width: 80, height: 80, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {f.logoUrl
                ? <img src={f.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                : <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink-4)' }}>{(f.name || 'O')[0].toUpperCase()}</span>
              }
            </div>
            <div>
              <PhotoUpload
                currentUrl={f.logoUrl}
                folder="payrollos/orgs"
                size={80}
                shape="rounded"
                label="Upload logo"
                initials={(f.name || 'O')[0].toUpperCase()}
                onUploaded={url => { setF(p => ({ ...p, logoUrl: url })); }}
              />
              <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>PNG or JPG, minimum 200×200px. Appears on payslips and reports.</p>
            </div>
          </div>
        </div>

        {/* Company details */}
        <Grid2>
          <Field label="Company name">
            <input style={inp} value={f.name} onChange={e => s('name', e.target.value)} placeholder="Acme Consulting LLC" />
          </Field>
          <Field label="Email address">
            <input style={inp} type="email" value={f.email} onChange={e => s('email', e.target.value)} placeholder="hr@company.com" />
          </Field>
          <Field label="Phone number">
            <input style={inp} value={f.phone} onChange={e => s('phone', e.target.value)} placeholder="+971 4 000 0000" />
          </Field>
          <Field label="Website">
            <input style={inp} value={f.website} onChange={e => s('website', e.target.value)} placeholder="https://company.com" />
          </Field>
          <Field label={region === 'UAE' ? 'TRN / Tax Registration Number' : 'PAN / GST Number'}>
            <input style={inp} value={f.taxId} onChange={e => s('taxId', e.target.value)} placeholder={region === 'UAE' ? '100xxxxxxxxx003' : 'AAAAA0000A'} />
          </Field>
          <Field label="Industry">
            <select style={inp} value={f.industry} onChange={e => s('industry', e.target.value)}>
              <option value="">Select industry</option>
              {['Accounting & Auditing','Banking & Finance','Construction','Consulting','Education','Healthcare','Hospitality','IT & Technology','Legal','Manufacturing','Retail','Real Estate','Trading','Other'].map(i => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </Field>
        </Grid2>

        <Field label="Registered address">
          <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' } as any}
            value={f.address} onChange={e => s('address', e.target.value)}
            placeholder="Full registered office address" />
        </Field>

        <SaveBar onSave={() => saveMut.mutate(f)} saving={saveMut.isPending} saved={saved} />
      </Card>

      {/* Info box */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '14px 18px', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6 }}>
        Changes to company name and logo reflect immediately on all new payslips, WPS reports, and exported documents.
        Existing processed payslips retain the details at the time of processing.
      </div>
    </SettingsLayout>
  );
}
