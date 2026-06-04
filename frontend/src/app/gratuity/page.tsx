'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { employeesApi } from '@/lib/api';
import { useRegionStore } from '@/store/auth.store';
import { formatCurrency } from '@/lib/utils';
 
function r2(n: number) { return Math.round(n * 100) / 100; }
 
function calcGratuity(basicMonthly: number, joiningDate: string) {
  const ms = Date.now() - new Date(joiningDate).getTime();
  const years = ms / (365.25 * 24 * 3600 * 1000);
  if (years < 1) return { years, accrual: 0, daily: 0 };
  const dailyBasic = (basicMonthly * 12) / 365;
  const accrual = years <= 5
    ? r2(dailyBasic * 21 * years)
    : r2(dailyBasic * (21 * 5 + 30 * (years - 5)));
  return { years, accrual, daily: r2(dailyBasic) };
}
 
function calcGratuityAt(basicMonthly: number, joiningDate: string, targetDate: Date) {
  const ms = targetDate.getTime() - new Date(joiningDate).getTime();
  const years = Math.max(0, ms / (365.25 * 24 * 3600 * 1000));
  if (years < 1) return 0;
  const dailyBasic = (basicMonthly * 12) / 365;
  return years <= 5
    ? r2(dailyBasic * 21 * years)
    : r2(dailyBasic * (21 * 5 + 30 * (years - 5)));
}
 
export default function GratuityPage() {
  const { region } = useRegionStore();
  const [tab, setTab] = useState<'tracker' | 'calculator'>('tracker');
  const [calcBasic, setCalcBasic] = useState(10000);
  const [calcJoining, setCalcJoining] = useState('2020-01-01');
  const [calcEnd, setCalcEnd] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
 
  const { data: empData, isLoading } = useQuery({
    queryKey: ['employees-gratuity', region, search],
    queryFn: () => employeesApi.getAll({ region, search: search || undefined, limit: 100, status: 'ACTIVE' }),
  });
  const employees = (empData as any)?.data || [];
 
  // Calculate gratuity for all employees
  const rows = employees
    .map((emp: any) => {
      const basic = emp.salaryStructure?.basicSalary || 0;
      const g = calcGratuity(basic, emp.joiningDate);
      return { ...emp, ...g, basic };
    })
    .sort((a: any, b: any) => b.accrual - a.accrual);
 
  const totalLiability = rows.reduce((a: number, r: any) => a + r.accrual, 0);
  const totalEmployees = rows.length;
  const eligible = rows.filter((r: any) => r.years >= 1);
  const longServing = rows.filter((r: any) => r.years >= 5);
 
  // Calculator
  const calcResult = (() => {
    if (!calcBasic || !calcJoining || !calcEnd) return null;
    const start = new Date(calcJoining);
    const end   = new Date(calcEnd);
    if (end <= start) return null;
    const ms    = end.getTime() - start.getTime();
    const years = ms / (365.25 * 24 * 3600 * 1000);
    if (years < 1) return { years, gratuity: 0, note: 'Less than 1 year — not eligible' };
    const dailyBasic = (calcBasic * 12) / 365;
    let gratuity;
    if (years <= 5) gratuity = r2(dailyBasic * 21 * years);
    else gratuity = r2(dailyBasic * (21 * 5 + 30 * (years - 5)));
    // Also compute year-by-year projection
    const projection = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(y => {
      const d = new Date(start); d.setFullYear(d.getFullYear() + y);
      return { year: y, date: d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }), amount: calcGratuityAt(calcBasic, calcJoining, d) };
    });
    return { years, gratuity, dailyBasic, projection };
  })();
 
  if (region === 'INDIA') {
    return (
      <AppLayout>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🇮🇳</div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>India Gratuity</h2>
          <p style={{ color: '#6e6e73', marginTop: 8, fontSize: 14, maxWidth: 480 }}>
            India gratuity is shown per employee in the payslip and reports section. Formula: (Basic/26) × 15 × years of service. Minimum 5 years required.
          </p>
          <a href="/reports" style={{ marginTop: 18, padding: '10px 22px', background: '#0a84ff', color: '#fff', borderRadius: 9, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Go to Reports →</a>
        </div>
      </AppLayout>
    );
  }
 
  return (
    <AppLayout>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>Gratuity tracker</h1>
          <p style={{ fontSize: 14, color: '#6e6e73', marginTop: 4 }}>UAE Labour Law Art. 51 — End of service benefit liability</p>
        </div>
      </div>
 
      {/* Law info box */}
      <div style={{ background: '#fff', border: '1px solid #e3e3e6', borderRadius: 14, padding: '16px 20px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,.06)', display: 'flex', gap: 32 }}>
        {[
          ['📅', 'Minimum service', '1 year — no gratuity below 1 year'],
          ['📐', 'Years 1–5', '21 calendar days of basic per year'],
          ['📐', 'Years 6+', '30 calendar days of basic per year'],
          ['⚠️', 'Maximum cap', 'No statutory cap (unlimited)'],
          ['💡', 'Resignation < 5 yrs', '1–3 yrs: 1/3rd · 3–5 yrs: 2/3rd of full'],
          ['🏦', 'Paid on', 'Termination, resignation, or retirement'],
        ].map(([icon, label, value]) => (
          <div key={label as string} style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#a1a1a6', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 12.5, color: '#1d1d1f', fontWeight: 500 }}>{value}</div>
          </div>
        ))}
      </div>
 
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e3e3e6', marginBottom: 22 }}>
        {[['tracker', '📊 Liability tracker'], ['calculator', '🧮 What-if calculator']].map(([t, lbl]) => (
          <button key={t} onClick={() => setTab(t as any)} style={{ padding: '10px 18px', border: 'none', background: 'transparent', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: tab === t ? '#0a84ff' : '#6e6e73', borderBottom: `2.5px solid ${tab === t ? '#0a84ff' : 'transparent'}`, marginBottom: -1 }}>{lbl}</button>
        ))}
      </div>
 
      {/* ── TRACKER TAB ─────────────────────────────── */}
      {tab === 'tracker' && (
        <div>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            <div style={{ background: '#fdecea', border: '1px solid #fcc', borderRadius: 14, padding: '18px 18px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#d83933', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>⚠️ TOTAL LIABILITY</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#d83933', fontVariantNumeric: 'tabular-nums' }}>AED {totalLiability.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: '#d83933', opacity: .7, marginTop: 4 }}>If all employees resign today</div>
            </div>
            <div style={{ background: '#e8f1fe', border: '1px solid #0a84ff33', borderRadius: 14, padding: '18px 18px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#0a84ff', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>👥 TOTAL EMPLOYEES</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#0a84ff' }}>{totalEmployees}</div>
              <div style={{ fontSize: 12, color: '#0a84ff', opacity: .7, marginTop: 4 }}>{eligible.length} eligible (≥ 1 yr service)</div>
            </div>
            <div style={{ background: '#e7f6ea', border: '1px solid #28a74533', borderRadius: 14, padding: '18px 18px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#28a745', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>📅 LONG SERVICE (5+ YRS)</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#28a745' }}>{longServing.length}</div>
              <div style={{ fontSize: 12, color: '#28a745', opacity: .7, marginTop: 4 }}>30 days/year rate applies</div>
            </div>
            <div style={{ background: '#fdf3e0', border: '1px solid #c7770033', borderRadius: 14, padding: '18px 18px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#c77700', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>💰 AVG PER EMPLOYEE</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#c77700', fontVariantNumeric: 'tabular-nums' }}>AED {eligible.length ? Math.round(totalLiability / eligible.length).toLocaleString() : 0}</div>
              <div style={{ fontSize: 12, color: '#c77700', opacity: .7, marginTop: 4 }}>Among eligible employees</div>
            </div>
          </div>
 
          {/* Search */}
          <div style={{ position: 'relative', maxWidth: 340, marginBottom: 14 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a1a1a6' }}>⌕</span>
            <input style={{ width: '100%', height: 36, padding: '0 12px 0 34px', border: '1px solid #d2d2d6', borderRadius: 9, fontSize: 13.5, fontFamily: 'inherit', outline: 'none' }}
              placeholder="Search employee…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
 
          {/* Table */}
          <div style={{ background: '#fff', border: '1px solid #e3e3e6', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e3e3e6', background: '#fafafa' }}>
                  {['Employee', 'Joining date', 'Service', 'Basic/month', 'Daily basic', 'Rate', 'Gratuity liability', 'Trend'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: ['Gratuity liability', 'Daily basic', 'Basic/month'].includes(h) ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: '#a1a1a6', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#a1a1a6' }}>Loading…</td></tr>
                : rows.length === 0 ? (
                  <tr><td colSpan={8}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '52px 24px', textAlign: 'center' }}>
                      <div style={{ fontSize: 40, opacity: .3, marginBottom: 14 }}>🏦</div>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>No UAE employees</div>
                      <div style={{ fontSize: 13.5, color: '#a1a1a6', marginTop: 5 }}>Add UAE employees to track gratuity liability</div>
                    </div>
                  </td></tr>
                ) : rows.map((emp: any) => {
                  const yrs = emp.years;
                  const eligible = yrs >= 1;
                  const rate = yrs >= 5 ? '30 days/yr' : yrs >= 1 ? '21 days/yr' : '—';
                  const pct = totalLiability > 0 ? (emp.accrual / totalLiability) * 100 : 0;
                  return (
                    <tr key={emp.id} style={{ borderBottom: '1px solid rgba(0,0,0,.04)', transition: 'background .1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f7f9fc')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#0a84ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                            {emp.firstName?.[0]}{emp.lastName?.[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{emp.firstName} {emp.lastName}</div>
                            <div style={{ fontSize: 11.5, color: '#a1a1a6' }}>{emp.department?.name || emp.employeeCode}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#6e6e73' }}>{new Date(emp.joiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: eligible ? '#e7f6ea' : '#f2f2f7', color: eligible ? '#28a745' : '#a1a1a6', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999 }}>
                          {yrs >= 1 ? `${Math.floor(yrs)}y ${Math.floor((yrs % 1) * 12)}m` : `${Math.floor(yrs * 12)}m`}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>AED {emp.basic.toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#6e6e73' }}>AED {emp.daily.toLocaleString()}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {eligible ? <span style={{ background: yrs >= 5 ? '#e8f1fe' : '#e7f6ea', color: yrs >= 5 ? '#0a84ff' : '#28a745', fontSize: 11.5, fontWeight: 600, padding: '2px 9px', borderRadius: 999 }}>{rate}</span> : <span style={{ color: '#a1a1a6' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {eligible ? (
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: emp.accrual > 50000 ? '#d83933' : '#1d1d1f', fontVariantNumeric: 'tabular-nums' }}>AED {emp.accrual.toLocaleString()}</div>
                            <div style={{ fontSize: 11, color: '#a1a1a6' }}>{pct.toFixed(1)}% of total</div>
                          </div>
                        ) : <span style={{ color: '#a1a1a6', fontSize: 12 }}>Not eligible yet</span>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {eligible && (
                          <div style={{ width: 80, height: 6, background: '#f0f0f5', borderRadius: 3 }}>
                            <div style={{ width: `${Math.min(100, pct * 2)}%`, height: '100%', background: emp.accrual > 50000 ? '#d83933' : '#0a84ff', borderRadius: 3 }} />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {rows.length > 0 && (
                  <tr style={{ background: '#fafafa', borderTop: '2px solid #e3e3e6' }}>
                    <td colSpan={6} style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13.5 }}>Total liability ({eligible.length} eligible employees)</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontSize: 16, color: '#d83933', fontVariantNumeric: 'tabular-nums' }}>AED {totalLiability.toLocaleString()}</td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
 
      {/* ── CALCULATOR TAB ───────────────────────────── */}
      {tab === 'calculator' && (
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, alignItems: 'start' }}>
          {/* Inputs */}
          <div style={{ background: '#fff', border: '1px solid #e3e3e6', borderRadius: 14, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>🧮 Gratuity calculator</h3>
            {[
              { label: 'Monthly basic salary (AED)', key: 'basic', type: 'number', value: calcBasic, onChange: (v: any) => setCalcBasic(+v) },
              { label: 'Date of joining', key: 'joining', type: 'date', value: calcJoining, onChange: (v: any) => setCalcJoining(v) },
              { label: 'Last working day / today', key: 'end', type: 'date', value: calcEnd, onChange: (v: any) => setCalcEnd(v) },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#6e6e73', marginBottom: 6 }}>{f.label}</label>
                <input type={f.type as any} value={f.value} onChange={e => f.onChange(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #d2d2d6', borderRadius: 9, fontSize: 13.5, fontFamily: 'inherit', outline: 'none' }} />
              </div>
            ))}
            <div style={{ background: '#f7f9fc', borderRadius: 10, padding: '12px 14px', fontSize: 12.5, color: '#6e6e73', lineHeight: 1.6, marginTop: 4 }}>
              <strong>Formula:</strong><br />
              Years 1–5: <code>Daily basic × 21 × years</code><br />
              Years 6+: <code>Daily basic × (21×5 + 30×(years−5))</code><br />
              Daily basic = (Monthly basic × 12) ÷ 365
            </div>
          </div>
 
          {/* Results */}
          <div>
            {!calcResult ? (
              <div style={{ background: '#fff', border: '1px solid #e3e3e6', borderRadius: 14, padding: '52px 24px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                <div style={{ fontSize: 40, opacity: .3, marginBottom: 14 }}>🧮</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Enter details to calculate</div>
              </div>
            ) : calcResult.years < 1 ? (
              <div style={{ background: '#fdf3e0', border: '1px solid #c7770033', borderRadius: 14, padding: 24 }}>
                <div style={{ fontSize: 18 }}>⚠️</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 8 }}>Not eligible for gratuity</div>
                <div style={{ color: '#6e6e73', marginTop: 4 }}>Employee has {Math.floor(calcResult.years * 12)} months of service. Minimum 1 year required.</div>
              </div>
            ) : (
              <div>
                {/* Result card */}
                <div style={{ background: 'linear-gradient(135deg, #0a84ff, #0066cc)', borderRadius: 14, padding: '28px 32px', color: '#fff', marginBottom: 16 }}>
                  <div style={{ fontSize: 13, opacity: .8, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>Total gratuity payable</div>
                  <div style={{ fontSize: 42, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.02em' }}>AED {calcResult.gratuity.toLocaleString()}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.2)' }}>
                    <div><div style={{ fontSize: 11, opacity: .7 }}>YEARS OF SERVICE</div><div style={{ fontSize: 16, fontWeight: 700, marginTop: 3 }}>{calcResult.years.toFixed(2)}</div></div>
                    <div><div style={{ fontSize: 11, opacity: .7 }}>DAILY BASIC</div><div style={{ fontSize: 16, fontWeight: 700, marginTop: 3 }}>AED {calcResult.dailyBasic.toLocaleString()}</div></div>
                    <div><div style={{ fontSize: 11, opacity: .7 }}>RATE APPLIED</div><div style={{ fontSize: 16, fontWeight: 700, marginTop: 3 }}>{calcResult.years > 5 ? '30 days/yr (6+)' : '21 days/yr (1–5)'}</div></div>
                  </div>
                </div>
 
                {/* Year-by-year projection */}
                <div style={{ background: '#fff', border: '1px solid #e3e3e6', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #e3e3e6', fontSize: 15, fontWeight: 600 }}>📈 Year-by-year projection</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                    <thead><tr style={{ background: '#fafafa', borderBottom: '1px solid #e3e3e6' }}>
                      <th style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#a1a1a6', textTransform: 'uppercase', letterSpacing: '.04em' }}>Year</th>
                      <th style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#a1a1a6', textTransform: 'uppercase', letterSpacing: '.04em' }}>By date</th>
                      <th style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#a1a1a6', textTransform: 'uppercase', letterSpacing: '.04em' }}>Rate</th>
                      <th style={{ padding: '10px 18px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#a1a1a6', textTransform: 'uppercase', letterSpacing: '.04em' }}>Gratuity (AED)</th>
                      <th style={{ padding: '10px 18px', fontSize: 11, fontWeight: 600, color: '#a1a1a6', textTransform: 'uppercase', letterSpacing: '.04em' }}>Bar</th>
                    </tr></thead>
                    <tbody>
                      {(calcResult.projection || []).map((p: any) => {
                        const maxAmt = calcResult.projection[9]?.amount || 1;
                        return (
                          <tr key={p.year} style={{ borderBottom: '1px solid rgba(0,0,0,.04)', background: Math.abs(calcResult.years - p.year) < 0.1 ? '#e8f1fe' : undefined }}>
                            <td style={{ padding: '11px 18px', fontWeight: 700 }}>Year {p.year}</td>
                            <td style={{ padding: '11px 18px', color: '#6e6e73' }}>{p.date}</td>
                            <td style={{ padding: '11px 18px' }}>
                              <span style={{ background: p.year > 5 ? '#e8f1fe' : '#e7f6ea', color: p.year > 5 ? '#0a84ff' : '#28a745', fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>
                                {p.year > 5 ? '30 days/yr' : '21 days/yr'}
                              </span>
                            </td>
                            <td style={{ padding: '11px 18px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                              {p.amount > 0 ? `AED ${p.amount.toLocaleString()}` : <span style={{ color: '#a1a1a6' }}>—</span>}
                            </td>
                            <td style={{ padding: '11px 18px' }}>
                              <div style={{ width: 120, height: 8, background: '#f0f0f5', borderRadius: 4 }}>
                                <div style={{ width: `${(p.amount / maxAmt) * 100}%`, height: '100%', background: p.year > 5 ? '#0a84ff' : '#28a745', borderRadius: 4 }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}