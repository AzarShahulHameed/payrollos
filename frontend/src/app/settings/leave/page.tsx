'use client';
import { SettingsLayout, Card } from '../_components';
import { useRegionStore } from '@/store/auth.store';

export default function LeavePoliciesSettings() {
  const { region } = useRegionStore();
  const policies = region === 'UAE'
    ? [
        { type:'Annual Leave',      days:30,  basis:'Calendar year',    law:'UAE Labour Law Art. 29' },
        { type:'Sick Leave',        days:90,  basis:'Calendar year',    law:'UAE Labour Law Art. 31' },
        { type:'Maternity Leave',   days:90,  basis:'Per confinement',  law:'UAE Labour Law Art. 32' },
        { type:'Paternity Leave',   days:5,   basis:'Per birth',        law:'UAE Cabinet Decision' },
        { type:'Hajj Leave',        days:30,  basis:'Once in service',  law:'UAE Labour Law Art. 29(4)' },
        { type:'Unpaid Leave',      days:null,basis:'As approved',      law:'Employer discretion' },
      ]
    : [
        { type:'Privilege Leave',   days:21,  basis:'Calendar year',    law:'Factories Act / Shop & Est.' },
        { type:'Sick Leave',        days:10,  basis:'Calendar year',    law:'State-specific' },
        { type:'Casual Leave',      days:7,   basis:'Calendar year',    law:'State-specific' },
        { type:'Maternity Leave',   days:182, basis:'Per confinement',  law:'Maternity Benefit Act' },
        { type:'Paternity Leave',   days:15,  basis:'Per birth',        law:'CCS Leave Rules' },
        { type:'Unpaid Leave',      days:null,basis:'As approved',      law:'Employer discretion' },
      ];
  return (
    <SettingsLayout title="Leave policies" subtitle={`Statutory entitlements under ${region === 'UAE' ? 'UAE Federal Labour Law' : 'Indian labour legislation'}`}>
      <Card>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid var(--line)' }}>
              {['Leave type','Entitlement','Basis','Legal reference'].map(h=>(
                <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {policies.map(p=>(
              <tr key={p.type} style={{ borderBottom:'1px solid var(--line)' }}
                onMouseEnter={e=>(e.currentTarget.style.background='var(--bg)')}
                onMouseLeave={e=>(e.currentTarget.style.background='')}>
                <td style={{ padding:'13px 14px', fontWeight:500, color:'var(--ink)', fontSize:13.5 }}>{p.type}</td>
                <td style={{ padding:'13px 14px', fontSize:13.5, color:'var(--ink)', fontVariantNumeric:'tabular-nums' }}>
                  {p.days !== null ? `${p.days} days` : <span style={{ color:'var(--ink-3)' }}>Variable</span>}
                </td>
                <td style={{ padding:'13px 14px', fontSize:13, color:'var(--ink-3)' }}>{p.basis}</td>
                <td style={{ padding:'13px 14px', fontSize:12, color:'var(--ink-4)' }}>{p.law}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div style={{ background:'var(--bg)', border:'1px solid var(--line)', borderRadius:10, padding:'14px 18px', fontSize:13, color:'var(--ink-3)', lineHeight:1.6 }}>
        Leave entitlements are applied to all employees in this region. Policy changes take effect for new leave requests only. Contact support to customise entitlements.
      </div>
    </SettingsLayout>
  );
}
