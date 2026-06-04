'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { payrunApi } from '@/lib/api';
import { useRegionStore } from '@/store/auth.store';
import { formatCurrency, initials } from '@/lib/utils';

const STEPS = ['DRAFT','IN_REVIEW','APPROVED','PROCESSED','PAID'];
const STEP_LABELS: Record<string,string> = { DRAFT:'Draft', IN_REVIEW:'Review', APPROVED:'Approved', PROCESSED:'Processed', PAID:'Paid' };
const ACTIONS: Record<string,{label:string;fn:string;cls:string}> = {
  DRAFT:     { label:'Submit for review', fn:'submit',   cls:'btn-primary' },
  IN_REVIEW: { label:'Approve payrun',   fn:'approve',  cls:'btn-green'   },
  APPROVED:  { label:'Process payroll',  fn:'process',  cls:'btn-primary' },
  PROCESSED: { label:'Mark as paid',     fn:'markPaid', cls:'btn-green'   },
};
const STATUS_CLS: Record<string,string> = { DRAFT:'chip-gray', IN_REVIEW:'chip-warn', APPROVED:'chip-info', PROCESSED:'chip-info', PAID:'chip-ok' };
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function PayrunPage() {
  const { region } = useRegionStore();
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const cur = region === 'UAE' ? 'AED' : 'INR';

  const { data: payruns = [] } = useQuery({ queryKey: ['payruns', region], queryFn: () => payrunApi.getAll({ region }) });
  const { data: payrun, isLoading: detailLoading } = useQuery({ queryKey: ['payrun', selectedId], queryFn: () => selectedId ? payrunApi.getOne(selectedId) : null, enabled: !!selectedId });

  const draftMutation = useMutation({
    mutationFn: () => payrunApi.getOrCreateDraft({ year, month, region }),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['payruns'] });
      qc.invalidateQueries({ queryKey: ['kpi'] });
      setSelectedId((data as any).id);
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({ fn, id }: any) => (payrunApi as any)[fn](id),
    onSuccess: () => {
      // Invalidate payrun data
      qc.invalidateQueries({ queryKey: ['payruns'] });
      qc.invalidateQueries({ queryKey: ['payrun', selectedId] });
      // Invalidate dashboard / analytics (totals change after payrun status changes)
      qc.invalidateQueries({ queryKey: ['kpi'] });
      qc.invalidateQueries({ queryKey: ['trend'] });
      qc.invalidateQueries({ queryKey: ['dept'] });
      // Invalidate HR data (loans/advances get marked after paid)
      qc.invalidateQueries({ queryKey: ['loans'] });
      qc.invalidateQueries({ queryKey: ['advances'] });
      qc.invalidateQueries({ queryKey: ['reimb'] });
      qc.invalidateQueries({ queryKey: ['payslips'] });
    },
  });

  const regenMutation = useMutation({
    mutationFn: (id: string) => payrunApi.regenerate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payrun', selectedId] }),
  });

  const stepIdx = payrun ? STEPS.indexOf(payrun.status) : -1;

  return (
    <AppLayout>
      <div className="page-hd">
        <div>
          <h1 className="page-title">Pay run</h1>
          <p className="page-sub">Manage payroll runs · {region}</p>
        </div>
        <div className="hdr-controls">
          <select className="select-sm" value={month} onChange={e => setMonth(+e.target.value)}>
            {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select className="select-sm" value={year} onChange={e => setYear(+e.target.value)}>
            {[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => draftMutation.mutate()} disabled={draftMutation.isPending}>
            {draftMutation.isPending ? 'Opening…' : `Open ${MONTHS_S[month-1]} ${year} payrun`}
          </button>
        </div>
      </div>

      <div className="payrun-layout">
        {/* Sidebar */}
        <div className="payrun-sidebar">
          <div className="payrun-sidebar-hd">All payruns</div>
          {(payruns as any[]).length === 0 ? (
            <div style={{ padding:'24px 16px', textAlign:'center', color:'var(--ink-4)', fontSize:13 }}>No payruns yet</div>
          ) : (payruns as any[]).map((pr: any) => (
            <div key={pr.id} className={`payrun-item${selectedId === pr.id ? ' active' : ''}`} onClick={() => setSelectedId(pr.id)}>
              <div className="payrun-item-name">{pr.name}</div>
              <div className="payrun-item-meta">
                <span className={`chip ${STATUS_CLS[pr.status]||'chip-gray'}`} style={{ fontSize:11, padding:'2px 8px' }}>{STEP_LABELS[pr.status]}</span>
                <span className="muted">{pr.employeeCount ?? 0} emp</span>
              </div>
            </div>
          ))}
        </div>

        {/* Main */}
        <div>
          {!selectedId ? (
            <div className="card">
              <div className="empty-state" style={{ padding:'60px 0' }}>
                <div className="empty-icon">📋</div>
                <div className="empty-title">Select a payrun</div>
                <div className="empty-sub">Choose from the list or open a new payrun</div>
              </div>
            </div>
          ) : detailLoading ? (
            <div className="card"><div className="loading-state">Loading payrun…</div></div>
          ) : payrun ? (
            <div>
              {/* Step tracker */}
              <div className="card" style={{ padding:0, marginBottom:14 }}>
                <div className="steps">
                  {STEPS.map((s, i) => (
                    <div key={s} className="step" style={{ flex: i < STEPS.length-1 ? 1 : 'none' }}>
                      <div className={`step-dot${i < stepIdx ? ' done' : ''}${i === stepIdx ? ' active' : ''}`}>
                        {i < stepIdx ? '✓' : i+1}
                      </div>
                      <div className={`step-label${i === stepIdx ? ' active' : ''}${i < stepIdx ? ' done' : ''}`}>
                        {STEP_LABELS[s]}
                      </div>
                      {i < STEPS.length-1 && (
                        <div className={`step-line${i < stepIdx ? ' done' : ''}`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="stat-grid stagger">
                {[
                  { lbl:'Total gross',   val: payrun.totalGross ?? 0,     cur: true  },
                  { lbl:'Net pay',       val: payrun.totalNet ?? 0,        cur: true  },
                  { lbl:'Deductions',    val: payrun.totalDeductions ?? 0, cur: true  },
                  { lbl:'Employees',     val: payrun.employeeCount ?? 0,   cur: false },
                ].map(s => (
                  <div key={s.lbl} className="stat">
                    <div className="stat-label">{s.lbl}</div>
                    <div className="stat-value">
                      {s.cur
                        ? <>{formatCurrency(s.val, cur)}</>
                        : <>{s.val}</>
                      }
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              {payrun.status in ACTIONS && (
                <div className="action-bar" style={{ marginBottom:14 }}>
                  {payrun.status === 'DRAFT' && (
                    <button className="btn btn-ghost" onClick={() => regenMutation.mutate(payrun.id)} disabled={regenMutation.isPending}>
                      ↺ Regenerate (picks up changes)
                    </button>
                  )}
                  <button
                    className={`btn ${ACTIONS[payrun.status].cls}`}
                    onClick={() => actionMutation.mutate({ fn: ACTIONS[payrun.status].fn, id: payrun.id })}
                    disabled={actionMutation.isPending}
                  >
                    {ACTIONS[payrun.status].label}
                  </button>
                </div>
              )}

              {/* Payslips */}
              <div className="table-wrap">
                <div className="table-head">
                  <h3>Payslips <span className="muted" style={{ fontWeight:400, fontSize:13 }}>({payrun.payslips?.length || 0})</span></h3>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th className="r">Gross</th>
                      {region === 'INDIA' && <><th className="r">PF</th><th className="r">TDS</th></>}
                      {region === 'UAE'   && <><th className="r">Housing</th><th className="r">LOP days</th></>}
                      <th className="r">Deductions</th>
                      <th className="r">Net pay</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(payrun.payslips || []).map((slip: any) => (
                      <tr key={slip.id}>
                        <td>
                          <div className="emp">
                            <div className="av av-32" style={{ background: '#0a84ff' }}>
                              {slip.employee?.photoUrl
                                ? <img src={slip.employee.photoUrl} alt="" />
                                : initials(slip.employee?.firstName, slip.employee?.lastName)
                              }
                            </div>
                            <div>
                              <div className="emp-nm">{slip.employee?.firstName} {slip.employee?.lastName}</div>
                              <div className="emp-meta">{slip.employee?.designation}</div>
                            </div>
                          </div>
                        </td>
                        <td className="td-muted">{slip.employee?.department?.name || '—'}</td>
                        <td className="r td-mono">{formatCurrency(slip.grossSalary, cur)}</td>
                        {region === 'INDIA' && (
                          <>
                            <td className="r td-mono td-muted">{formatCurrency(slip.pfEmployee, cur)}</td>
                            <td className="r td-mono td-muted">{formatCurrency(slip.tdsAmount, cur)}</td>
                          </>
                        )}
                        {region === 'UAE' && (
                          <>
                            <td className="r td-mono td-muted">{formatCurrency(slip.housingAllowance, cur)}</td>
                            <td className="r td-muted">{slip.lopDays > 0 ? `${slip.lopDays}d` : '—'}</td>
                          </>
                        )}
                        <td className="r td-mono td-danger">{formatCurrency(slip.totalDeductions, cur)}</td>
                        <td className="r td-mono td-bold">{formatCurrency(slip.netSalary, cur)}</td>
                        <td><span className={`chip ${STATUS_CLS[(slip.status||'').toUpperCase()]||'chip-gray'}`} style={{ fontSize:11 }}>{slip.status}</span></td>
                      </tr>
                    ))}
                    {(!payrun.payslips?.length) && (
                      <tr><td colSpan={9}>
                        <div className="empty-state" style={{ padding:'32px 0' }}>
                          <div className="empty-icon">👤</div>
                          <div className="empty-title">No payslips generated</div>
                          <div className="empty-sub">Add employees first, then regenerate this payrun</div>
                        </div>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AppLayout>
  );
}
