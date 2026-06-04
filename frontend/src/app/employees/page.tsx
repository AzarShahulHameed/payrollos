'use client';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { employeesApi, settingsApi, api } from '@/lib/api';
import { useRegionStore } from '@/store/auth.store';
import { formatCurrency, initials } from '@/lib/utils';
 
const AV_COLORS = ['#0a84ff','#28a745','#ff9500','#af52de','#ff375f','#30b0c7','#ff6b35'];
const avColor = (n?: string) => AV_COLORS[(n?.charCodeAt(0)||0) % AV_COLORS.length];
 
// ── CSV template columns ─────────────────────────────────────────────────────
const UAE_COLS = [
  { col: 'firstName',         required: true,  example: 'Azar',           note: 'First name of employee' },
  { col: 'lastName',          required: true,  example: 'Shahul',         note: 'Last name of employee' },
  { col: 'email',             required: true,  example: 'azar@co.ae',     note: 'Work email address (unique)' },
  { col: 'phone',             required: false, example: '+971501234567',  note: 'Mobile number with country code' },
  { col: 'designation',       required: true,  example: 'Finance Manager',note: 'Job title / designation' },
  { col: 'joiningDate',       required: true,  example: '2024-01-15',     note: 'Format: YYYY-MM-DD' },
  { col: 'basicSalary',       required: true,  example: '12000',          note: 'Monthly basic salary in AED' },
  { col: 'housingAllowance',  required: false, example: '4000',           note: 'Monthly housing allowance AED' },
  { col: 'transportAllowance',required: false, example: '1000',           note: 'Monthly transport allowance AED' },
  { col: 'medicalAllowance',  required: false, example: '500',            note: 'Monthly medical allowance AED' },
  { col: 'otherAllowances',   required: false, example: '0',              note: 'Other monthly allowances AED' },
  { col: 'emiratesId',        required: false, example: '784-1990-1234567-1', note: 'UAE Emirates ID number' },
  { col: 'passportNo',        required: false, example: 'A12345678',      note: 'Passport number' },
  { col: 'visaNo',            required: false, example: '101/2024/12345', note: 'UAE visa number' },
  { col: 'nationality',       required: false, example: 'Indian',         note: 'Employee nationality' },
  { col: 'iban',              required: false, example: 'AE070331234567890123456', note: 'IBAN for WPS salary transfer' },
  { col: 'isUaeNational',     required: false, example: 'false',          note: 'true/false — GPSSA applies if true' },
];
 
const INDIA_COLS = [
  { col: 'firstName',     required: true,  example: 'Priya',          note: 'First name of employee' },
  { col: 'lastName',      required: true,  example: 'Nair',           note: 'Last name of employee' },
  { col: 'email',         required: true,  example: 'priya@co.in',    note: 'Work email address (unique)' },
  { col: 'phone',         required: false, example: '+919876543210',  note: 'Mobile number with country code' },
  { col: 'designation',   required: true,  example: 'Software Engineer', note: 'Job title / designation' },
  { col: 'joiningDate',   required: true,  example: '2024-01-15',     note: 'Format: YYYY-MM-DD' },
  { col: 'ctcAnnual',     required: true,  example: '1200000',        note: 'Annual CTC in INR' },
  { col: 'basicPct',      required: false, example: '40',             note: 'Basic salary % of CTC (default 40)' },
  { col: 'taxRegime',     required: false, example: 'NEW',            note: 'NEW or OLD (default NEW)' },
  { col: 'cityType',      required: false, example: 'METRO',          note: 'METRO or NON_METRO (affects HRA)' },
  { col: 'panNumber',     required: false, example: 'ABCDE1234F',     note: 'PAN card number' },
  { col: 'uanNumber',     required: false, example: '100123456789',   note: 'Universal Account Number (PF)' },
  { col: 'aadharNumber',  required: false, example: '9876 5432 1012', note: 'Aadhar card number' },
  { col: 'bankAccount',   required: false, example: '1234567890',     note: 'Bank account number' },
];
 
 
function exportEmployeesCSV(employees: any[], region: string) {
  const cur = region === 'UAE' ? 'AED' : 'INR';
  const headers = ['Employee Code','First Name','Last Name','Email','Phone','Department','Designation','Joining Date','Status','Basic Salary','IBAN','Nationality'];
  const rows = employees.map((e:any) => [
    e.employeeCode||'',
    e.firstName||'',
    e.lastName||'',
    e.email||'',
    e.phone||'',
    e.department?.name||'',
    e.designation||'',
    e.joiningDate ? new Date(e.joiningDate).toLocaleDateString('en-GB') : '',
    e.status||'',
    e.salaryStructure?.basicSalary || e.salaryStructure?.ctcAnnual || '',
    e.iban||'',
    e.nationality||'',
  ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `employees-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}
 
 
// ── Salary Increment Panel ─────────────────────────────────────
function IncrementPanel({ employees, region, onClose, onDone }: any) {
  const cur = region === 'UAE' ? 'AED' : '₹';
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pct, setPct]           = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [reason, setReason]     = useState('');
  const [preview, setPreview]   = useState<Record<string,number>>({});
  const [applying, setApplying] = useState(false);
  const [result, setResult]     = useState<any>(null);
 
  const activeEmps = (employees as any[]).filter(e => e.status === 'ACTIVE' && e.salaryStructure);
 
  const toggleAll = () => {
    if (selected.size === activeEmps.length) setSelected(new Set());
    else setSelected(new Set(activeEmps.map((e:any)=>e.id)));
  };
 
  const toggle = (id: string) => {
    setSelected(p => { const n = new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });
  };
 
  const calcPreview = (id: string, base: number) => {
    if (!pct || isNaN(+pct)) return base;
    return Math.round(base * (1 + +pct/100));
  };
 
  const getBasic = (emp: any) =>
    emp.salaryStructure?.basicSalary || Math.round((emp.salaryStructure?.ctcAnnual||0)/12);
 
  const handleApply = async () => {
    if (!selected.size)    { alert('Select at least one employee'); return; }
    if (!pct)              { alert('Enter increment percentage'); return; }
    if (!effectiveDate)    { alert('Select effective date'); return; }
    if (!window.confirm(`Apply ${pct}% increment to ${selected.size} employee${selected.size>1?'s':''}?
Effective: ${effectiveDate}
 
This creates a salary revision record for each selected employee.`)) return;
 
    setApplying(true);
    const results = { success: 0, failed: 0, errors: [] as string[] };
 
    for (const empId of Array.from(selected)) {
      const emp = activeEmps.find((e:any)=>e.id===empId);
      if (!emp) continue;
      const ss = emp.salaryStructure;
      const dto: any = { effectiveDate, reason: reason || `Salary increment ${pct}%` };
      if (ss.basicSalary)        dto.newBasicSalary = Math.round(ss.basicSalary*(1+(+pct)/100));
      if (ss.housingAllowance)   dto.newHousing     = Math.round(ss.housingAllowance*(1+(+pct)/100));
      if (ss.transportAllowance) dto.newTransport   = Math.round(ss.transportAllowance*(1+(+pct)/100));
      if (ss.ctcAnnual)          dto.newCtcAnnual   = Math.round(ss.ctcAnnual*(1+(+pct)/100));
      try {
        await api.post(`/arrears/apply`, { ...dto, employeeId: empId });
        results.success++;
      } catch (e: any) {
        results.failed++;
        results.errors.push(`${emp.firstName} ${emp.lastName}: ${e?.response?.data?.message||'failed'}`);
      }
    }
    setApplying(false);
    setResult(results);
  };
 
  if (result) return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:12, padding:24, marginBottom:20 }}>
      <div style={{ fontSize:16, fontWeight:700, color:'var(--ink)', marginBottom:16 }}>Increment applied</div>
      <div style={{ background:'#e7f6ea', border:'1px solid #28a74533', borderRadius:10, padding:'16px 20px', marginBottom:12 }}>
        <div style={{ fontSize:15, fontWeight:600, color:'#28a745', marginBottom:4 }}>{result.success} employee{result.success!==1?'s':''} updated successfully</div>
        <div style={{ fontSize:13.5, color:'#48484a' }}>{pct}% increment · Effective {new Date(effectiveDate).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'})}</div>
      </div>
      {result.errors.length>0 && (
        <div style={{ background:'#fdecea', border:'1px solid #fcc', borderRadius:10, padding:'14px 18px', marginBottom:12, fontSize:13 }}>
          <div style={{ fontWeight:600, color:'#d83933', marginBottom:6 }}>{result.failed} failed:</div>
          {result.errors.map((e:string,i:number)=><div key={i} style={{ color:'#d83933' }}>{e}</div>)}
        </div>
      )}
      <button onClick={onDone} style={{ padding:'9px 20px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:8, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Done</button>
    </div>
  );
 
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:12, padding:24, marginBottom:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--ink)' }}>Salary increment</div>
          <div style={{ fontSize:13, color:'var(--ink-3)', marginTop:3 }}>Select employees, set increment %, review new salaries, then apply. Each change is recorded with effective date.</div>
        </div>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink-3)', fontSize:20, padding:4 }}>×</button>
      </div>
 
      {/* Controls */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:20 }}>
        <div>
          <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>Increment %</label>
          <input type="number" min={0} max={200} placeholder="e.g. 10" value={pct}
            onChange={e=>setPct(e.target.value)}
            style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--line-2)', borderRadius:8, fontSize:13.5, fontFamily:'inherit', background:'var(--surface)', color:'var(--ink)', outline:'none' }} />
        </div>
        <div>
          <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>Effective date</label>
          <input type="date" value={effectiveDate} onChange={e=>setEffectiveDate(e.target.value)}
            style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--line-2)', borderRadius:8, fontSize:13.5, fontFamily:'inherit', background:'var(--surface)', color:'var(--ink)', outline:'none' }} />
        </div>
        <div>
          <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>Reason</label>
          <input type="text" value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Annual appraisal 2026"
            style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--line-2)', borderRadius:8, fontSize:13.5, fontFamily:'inherit', background:'var(--surface)', color:'var(--ink)', outline:'none' }} />
        </div>
      </div>
 
      {/* Employee table with checkboxes and preview */}
      <div style={{ border:'1px solid var(--line)', borderRadius:10, overflow:'hidden', marginBottom:16 }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13.5 }}>
          <thead><tr style={{ borderBottom:'1px solid var(--line)', background:'var(--bg)' }}>
            <th style={{ padding:'10px 14px', width:40 }}>
              <input type="checkbox" checked={selected.size===activeEmps.length&&activeEmps.length>0}
                onChange={toggleAll} style={{ cursor:'pointer' }} />
            </th>
            {['Employee','Department','Current salary',pct?`New salary (+${pct}%)`:'New salary','Change'].map((h,i)=>(
              <th key={h} style={{ padding:'10px 14px', textAlign:i>=2?'right':'left', fontSize:11, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {activeEmps.map((emp:any)=>{
              const base    = getBasic(emp);
              const newBase = calcPreview(emp.id, base);
              const diff    = newBase - base;
              const checked = selected.has(emp.id);
              return (
                <tr key={emp.id}
                  onClick={()=>toggle(emp.id)}
                  style={{ cursor:'pointer', borderBottom:'1px solid var(--line)', background:checked?'#e8f1fe22':'' }}>
                  <td style={{ padding:'11px 14px' }} onClick={e=>e.stopPropagation()}>
                    <input type="checkbox" checked={checked} onChange={()=>toggle(emp.id)} style={{ cursor:'pointer' }} />
                  </td>
                  <td style={{ padding:'11px 14px' }}>
                    <div style={{ fontWeight:500, color:'var(--ink)' }}>{emp.firstName} {emp.lastName}</div>
                    <div style={{ fontSize:12, color:'var(--ink-3)' }}>{emp.employeeCode}</div>
                  </td>
                  <td style={{ padding:'11px 14px', color:'var(--ink-3)', fontSize:13 }}>{emp.department?.name||'—'}</td>
                  <td style={{ padding:'11px 14px', textAlign:'right', fontVariantNumeric:'tabular-nums', color:'var(--ink)' }}>
                    {cur} {base.toLocaleString()}
                  </td>
                  <td style={{ padding:'11px 14px', textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight:600, color:pct?'#28a745':'var(--ink-3)' }}>
                    {pct ? `${cur} ${newBase.toLocaleString()}` : '—'}
                  </td>
                  <td style={{ padding:'11px 14px', textAlign:'right', fontSize:13, color:diff>0?'#28a745':'var(--ink-3)', fontVariantNumeric:'tabular-nums' }}>
                    {diff>0 ? `+${cur} ${diff.toLocaleString()}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
 
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontSize:13.5, color:'var(--ink-3)' }}>
          {selected.size} of {activeEmps.length} employees selected
          {selected.size>0 && pct && ` · Total additional cost: ${cur} ${(Array.from(selected).reduce((s,id)=>{ const e=activeEmps.find((x:any)=>x.id===id); return s+(e?Math.round(getBasic(e)*+pct/100):0); },0)).toLocaleString()}/month`}
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ padding:'9px 18px', background:'var(--bg)', color:'var(--ink-2)', border:'1px solid var(--line)', borderRadius:8, fontSize:13.5, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
          <button onClick={handleApply} disabled={!selected.size||!pct||!effectiveDate||applying}
            style={{ padding:'9px 22px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:8, fontSize:13.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:(!selected.size||!pct||!effectiveDate||applying)?.6:1 }}>
            {applying?'Applying…':`Apply to ${selected.size} employee${selected.size!==1?'s':''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
 
export default function EmployeesPage() {
  const { region } = useRegionStore();
  const qc = useQueryClient();
  const cur = region === 'UAE' ? 'AED' : 'INR';
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showIncrement, setShowIncrement] = useState(false);
  const [incrForm, setIncrForm] = useState({ departmentId:'', percentage:'', effectiveDate:'' });
  const [incrResult, setIncrResult] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [page, setPage] = useState(1);
 
  const { data, isLoading } = useQuery({
    queryKey: ['employees', region, search, page],
    queryFn: () => employeesApi.getAll({ region, search, page, limit: 20 }),
  });
 
  const createMut = useMutation({
    mutationFn: (dto: any) => employeesApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); setShowAddModal(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, dto }: any) => employeesApi.update(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); setShowAddModal(false); setEditing(null); },
  });
 
  const incrMut = useMutation({
    mutationFn: (dto:any) => api.post('/employees/bulk-increment', dto).then(r=>r.data),
    onSuccess: (data:any) => { qc.invalidateQueries({queryKey:['employees']}); setIncrResult(data); },
    onError: (e:any) => alert(e?.response?.data?.message||'Increment failed'),
  });
 
  const { data: depts = [] } = useQuery({ queryKey:['departments'], queryFn:()=>settingsApi.getDepartments() });
 
  const employees = (data as any)?.data || [];
  const total = (data as any)?.total || 0;
  const pages = Math.ceil(total / 20);
 
  return (
    <AppLayout>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:700, letterSpacing:'-.02em' }}>Employees</h1>
          <p style={{ fontSize:14, color:'var(--ink-3)', marginTop:4 }}>{total} employees · {region} region</p>
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <button onClick={()=>exportEmployeesCSV(employees as any[], region)}
            style={{ padding:'9px 16px', background:'#fff', border:'1px solid var(--line-2)', borderRadius:9, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            Export CSV
          </button>
          <button onClick={()=>{ setShowIncrement(v=>!v); setIncrResult(null); setIncrForm({departmentId:'',percentage:'',effectiveDate:''}); }}
            style={{ padding:'9px 16px', background:'#fff', border:'1px solid var(--line-2)', borderRadius:9, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            Bulk increment
          </button>
          <button onClick={()=>setShowImportModal(true)}
            style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 18px', border:'1px solid var(--line-2)', borderRadius:9, fontSize:13.5, fontWeight:600, background:'#fff', cursor:'pointer', fontFamily:'inherit' }}>
            Import CSV
          </button>
          <button className="btn btn-primary" onClick={()=>{ setEditing(null); setShowAddModal(true); }}>
            + Add employee
          </button>
        </div>
      </div>
 
      {/* Salary Increment — per employee, with record trail */}
      {showIncrement && (
        <IncrementPanel
          employees={employees as any[]}
          region={region}
          onClose={()=>{ setShowIncrement(false); setIncrResult(null); }}
          onDone={()=>{ qc.invalidateQueries({queryKey:['employees']}); setShowIncrement(false); }}
        />
      )}
 
      {/* Search */}
      <div style={{ position:'relative', maxWidth:380, marginBottom:16 }}>
        <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--ink-4)', fontSize:16, lineHeight:1 }}>⌕</span>
        <input
          style={{ width:'100%', height:36, padding:'0 12px 0 34px', border:'1px solid var(--line-2)', borderRadius:9, fontSize:13.5, fontFamily:'inherit', outline:'none', background:'#fff' }}
          placeholder="Search by name, ID, email…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>
 
      {/* Table */}
      <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:14, overflow:'hidden', boxShadow:'var(--sh-sm)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13.5 }}>
          <thead>
            <tr style={{ borderBottom:'1px solid var(--line)', background:'#fafafa' }}>
              {['Employee','Department','Designation','Joining date', region==='UAE'?'Basic (AED)':'CTC / yr (₹)','Status',''].map(h => (
                <th key={h} style={{ padding:'11px 20px', textAlign: h===''||h.startsWith('Basic')||h.startsWith('CTC') ? 'right' : 'left', fontSize:11.5, fontWeight:600, color:'var(--ink-4)', textTransform:'uppercase', letterSpacing:'.03em', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_,i) => (
                <tr key={i}><td colSpan={7} style={{ padding:'12px 20px' }}>
                  <div style={{ height:36, background:'linear-gradient(90deg,#e8e8ed 25%,#f5f5f7 50%,#e8e8ed 75%)', backgroundSize:'200% 100%', borderRadius:8, animation:'shimmer 1.4s infinite' }} />
                </td></tr>
              ))
            ) : employees.length === 0 ? (
              <tr><td colSpan={7}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'56px 24px', textAlign:'center' }}>
                  <div style={{ fontSize:40, opacity:.3, marginBottom:14 }}>👤</div>
                  <div style={{ fontSize:15, fontWeight:600 }}>No employees yet</div>
                  <div style={{ fontSize:13.5, color:'var(--ink-4)', marginTop:5 }}>Add employees one by one or import from CSV</div>
                </div>
              </td></tr>
            ) : employees.map((emp: any) => (
              <tr key={emp.id}
                style={{ borderBottom:'1px solid rgba(0,0,0,.04)', cursor:'pointer', transition:'background .1s' }}
                onMouseEnter={e=>(e.currentTarget.style.background='#f7f9fc')}
                onMouseLeave={e=>(e.currentTarget.style.background='')}>
                <td style={{ padding:'13px 20px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                    <div style={{ width:34, height:34, borderRadius:'50%', background:emp.photoUrl?'transparent':avColor(emp.firstName), display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:12, fontWeight:700, flexShrink:0, overflow:'hidden' }}>
                      {emp.photoUrl ? <img src={emp.photoUrl} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" /> : initials(emp.firstName, emp.lastName)}
                    </div>
                    <div>
                      <div style={{ fontWeight:600 }}>{emp.firstName} {emp.lastName}</div>
                      <div style={{ fontSize:11.5, color:'var(--ink-4)', marginTop:1 }}>{emp.employeeCode}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding:'13px 20px', color:'var(--ink-3)' }}>{emp.department?.name || '—'}</td>
                <td style={{ padding:'13px 20px', color:'var(--ink-3)' }}>{emp.designation || '—'}</td>
                <td style={{ padding:'13px 20px', color:'var(--ink-3)', whiteSpace:'nowrap' }}>
                  {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
                </td>
                <td style={{ padding:'13px 20px', textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight:500 }}>
                  {region==='UAE' ? formatCurrency(emp.salaryStructure?.basicSalary||0, cur) : formatCurrency(emp.salaryStructure?.ctcAnnual||0, cur)}
                </td>
                <td style={{ padding:'13px 20px' }}>
                  <span style={{ background:emp.status==='ACTIVE'?'#e7f6ea':'#fdecea', color:emp.status==='ACTIVE'?'#28a745':'#d83933', fontSize:11.5, fontWeight:600, padding:'3px 10px', borderRadius:999 }}>{emp.status}</span>
                </td>
                <td style={{ padding:'13px 20px', textAlign:'right' }}>
                  <button onClick={()=>{setEditing(emp);setShowAddModal(true);}} style={{ padding:'5px 13px', border:'1px solid var(--line-2)', borderRadius:8, fontSize:12.5, fontWeight:500, background:'#fff', cursor:'pointer', fontFamily:'inherit' }}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
 
      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:18 }}>
          <button disabled={page===1} onClick={()=>setPage(p=>p-1)} style={{ padding:'6px 14px', border:'1px solid var(--line-2)', borderRadius:8, fontSize:13, background:'#fff', cursor:'pointer', opacity:page===1?.4:1, fontFamily:'inherit' }}>← Previous</button>
          <span style={{ fontSize:13, color:'var(--ink-4)' }}>Page {page} of {pages}</span>
          <button disabled={page>=pages} onClick={()=>setPage(p=>p+1)} style={{ padding:'6px 14px', border:'1px solid var(--line-2)', borderRadius:8, fontSize:13, background:'#fff', cursor:'pointer', opacity:page>=pages?.4:1, fontFamily:'inherit' }}>Next →</button>
        </div>
      )}
 
      {/* Add/Edit Modal */}
      {showAddModal && (
        <EmpModal
          region={region} employee={editing}
          onClose={() => { setShowAddModal(false); setEditing(null); }}
          onSave={(dto: any) => editing ? updateMut.mutate({ id:editing.id, dto }) : createMut.mutate({ ...dto, region })}
          saving={createMut.isPending || updateMut.isPending}
        />
      )}
 
      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          region={region}
          onClose={() => setShowImportModal(false)}
          onImported={() => { qc.invalidateQueries({ queryKey:['employees'] }); setShowImportModal(false); }}
        />
      )}
    </AppLayout>
  );
}
 
// ─────────────────────────────────────────────────────────────────────────────
// IMPORT MODAL
// ─────────────────────────────────────────────────────────────────────────────
function ImportModal({ region, onClose, onImported }: any) {
  const [step, setStep] = useState<'guide'|'upload'|'preview'|'done'>('guide');
  const [rows, setRows] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ok:number;fail:number;msgs:string[]}>({ok:0,fail:0,msgs:[]});
  const fileRef = useRef<HTMLInputElement>(null);
  const cols = region === 'UAE' ? UAE_COLS : INDIA_COLS;
 
  const downloadTemplate = () => {
    const headers = cols.map(c => c.col).join(',');
    const example = cols.map(c => c.example).join(',');
    const csv = `${headers}\n${example}\n`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = `payrollos-employee-template-${region.toLowerCase()}.csv`;
    a.click();
  };
 
  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return { rows:[], errors:['CSV must have at least one data row'] };
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g,''));
    const required = cols.filter(c=>c.required).map(c=>c.col);
    const missing = required.filter(r => !headers.includes(r));
    if (missing.length) return { rows:[], errors:[`Missing required columns: ${missing.join(', ')}`] };
 
    const parsed: any[] = [];
    const errs: string[] = [];
    lines.slice(1).forEach((line, i) => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g,''));
      const obj: any = {};
      headers.forEach((h,idx) => { obj[h] = vals[idx] || ''; });
      const rowErrors: string[] = [];
      required.forEach(r => { if (!obj[r]) rowErrors.push(`Row ${i+2}: "${r}" is required`); });
      if (rowErrors.length) errs.push(...rowErrors);
      else parsed.push(obj);
    });
    return { rows: parsed, errors: errs };
  };
 
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const { rows: r, errors: er } = parseCSV(ev.target?.result as string);
      setRows(r); setErrors(er);
      setStep('preview');
    };
    reader.readAsText(file);
  };
 
  const handleImport = async () => {
    setImporting(true);
    let ok = 0, fail = 0;
    const msgs: string[] = [];
    for (const row of rows) {
      try {
        const ss = region === 'UAE'
          ? { basicSalary:+row.basicSalary||0, housingAllowance:+row.housingAllowance||0, transportAllowance:+row.transportAllowance||0, medicalAllowance:+row.medicalAllowance||0, otherAllowances:+row.otherAllowances||0 }
          : { ctcAnnual:+row.ctcAnnual||0, basicPct:+row.basicPct||40, taxRegime:row.taxRegime||'NEW', cityType:row.cityType||'METRO' };
        const { basicSalary,housingAllowance,transportAllowance,medicalAllowance,otherAllowances,ctcAnnual,basicPct,taxRegime,cityType, ...emp } = row;
        await employeesApi.create({ ...emp, region, isUaeNational: emp.isUaeNational==='true', salaryStructure: ss });
        ok++;
      } catch (e: any) {
        fail++;
        msgs.push(`${row.firstName} ${row.lastName}: ${e?.response?.data?.message || 'Failed'}`);
      }
    }
    setResults({ ok, fail, msgs });
    setImporting(false);
    setStep('done');
    if (ok > 0) setTimeout(onImported, 1500);
  };
 
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,.4)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(8px)' }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#fff', borderRadius:18, width:680, maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
 
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px', borderBottom:'1px solid var(--line)', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:17, fontWeight:700 }}>Import employees from CSV</div>
            <div style={{ fontSize:13, color:'var(--ink-4)', marginTop:2 }}>{region} region · Bulk add employees</div>
          </div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:'50%', border:'none', background:'rgba(0,0,0,.07)', cursor:'pointer', fontSize:17, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink-3)' }}>×</button>
        </div>
 
        {/* Progress steps */}
        <div style={{ display:'flex', padding:'14px 24px', borderBottom:'1px solid var(--line)', gap:0, flexShrink:0 }}>
          {[['guide','1. Understand format'],['upload','2. Upload file'],['preview','3. Preview & confirm'],['done','4. Done']].map(([s,lbl],i)=>(
            <div key={s} style={{ display:'flex', alignItems:'center', flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:22, height:22, borderRadius:'50%', background:step===s?'#0a84ff':['guide','upload','preview','done'].indexOf(step)>i?'#28a745':'#e5e5ea', color:'#fff', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {['guide','upload','preview','done'].indexOf(step)>i?'✓':i+1}
                </div>
                <span style={{ fontSize:12, fontWeight:step===s?600:400, color:step===s?'#0a84ff':'var(--ink-4)', whiteSpace:'nowrap' }}>{lbl}</span>
              </div>
              {i<3 && <div style={{ flex:1, height:1, background:'var(--line)', margin:'0 8px' }} />}
            </div>
          ))}
        </div>
 
        {/* Body */}
        <div style={{ padding:24, overflowY:'auto', flex:1 }}>
 
          {/* STEP 1 — Guide */}
          {step==='guide' && (
            <div>
              <div style={{ background:'#e8f1fe', border:'1px solid rgba(10,132,255,.2)', borderRadius:12, padding:'16px 18px', marginBottom:20 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#0055b0', marginBottom:8, display:'flex', alignItems:'center', gap:8 }}>ℹ️ Before you import — read this</div>
                <div style={{ fontSize:13.5, color:'#0055b0', lineHeight:1.7 }}>
                  The CSV file must have exact column headers as shown below. Download the template to get started — it already has the correct headers and one example row you can replace with real data.
                </div>
              </div>
 
              {/* Required fields */}
              <div style={{ marginBottom:18 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--red)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--red)', display:'inline-block' }} /> Required columns
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {cols.filter(c=>c.required).map(c => (
                    <div key={c.col} style={{ background:'#fff7f7', border:'1px solid rgba(216,57,51,.15)', borderRadius:9, padding:'10px 14px' }}>
                      <div style={{ fontFamily:'monospace', fontSize:13, fontWeight:700, color:'var(--red)', marginBottom:3 }}>{c.col}</div>
                      <div style={{ fontSize:12, color:'var(--ink-3)', marginBottom:2 }}>{c.note}</div>
                      <div style={{ fontSize:11.5, color:'var(--ink-4)' }}>Example: <code style={{ background:'#f0f0f5', padding:'1px 5px', borderRadius:4 }}>{c.example}</code></div>
                    </div>
                  ))}
                </div>
              </div>
 
              {/* Optional fields */}
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--ink-4)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--ink-4)', display:'inline-block' }} /> Optional columns
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {cols.filter(c=>!c.required).map(c => (
                    <div key={c.col} style={{ background:'#fafafa', border:'1px solid var(--line)', borderRadius:9, padding:'10px 14px' }}>
                      <div style={{ fontFamily:'monospace', fontSize:13, fontWeight:600, color:'var(--ink-2)', marginBottom:3 }}>{c.col}</div>
                      <div style={{ fontSize:12, color:'var(--ink-3)', marginBottom:2 }}>{c.note}</div>
                      <div style={{ fontSize:11.5, color:'var(--ink-4)' }}>Example: <code style={{ background:'#f0f0f5', padding:'1px 5px', borderRadius:4 }}>{c.example}</code></div>
                    </div>
                  ))}
                </div>
              </div>
 
              {/* Rules */}
              <div style={{ background:'#fdf3e0', border:'1px solid rgba(199,119,0,.2)', borderRadius:12, padding:'14px 18px' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#c77700', marginBottom:8 }}>⚠️ Important rules</div>
                <ul style={{ fontSize:13, color:'#8a5500', lineHeight:1.8, paddingLeft:18 }}>
                  <li>Column headers are <strong>case-sensitive</strong> — use exactly as shown above</li>
                  <li><code style={{ background:'rgba(0,0,0,.07)', padding:'1px 5px', borderRadius:4 }}>joiningDate</code> must be in <strong>YYYY-MM-DD</strong> format (e.g. 2024-01-15)</li>
                  <li><code style={{ background:'rgba(0,0,0,.07)', padding:'1px 5px', borderRadius:4 }}>email</code> must be unique per employee — duplicates will be skipped</li>
                  {region==='UAE' && <li><code style={{ background:'rgba(0,0,0,.07)', padding:'1px 5px', borderRadius:4 }}>isUaeNational</code> must be exactly <strong>true</strong> or <strong>false</strong></li>}
                  {region==='INDIA' && <li><code style={{ background:'rgba(0,0,0,.07)', padding:'1px 5px', borderRadius:4 }}>taxRegime</code> must be <strong>NEW</strong> or <strong>OLD</strong></li>}
                  <li>Save the file as <strong>.csv (comma separated)</strong> — not .xlsx or .xls</li>
                </ul>
              </div>
            </div>
          )}
 
          {/* STEP 2 — Upload */}
          {step==='upload' && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 0' }}>
              <div style={{ fontSize:48, marginBottom:16, opacity:.7 }}>📂</div>
              <div style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>Choose your CSV file</div>
              <div style={{ fontSize:13.5, color:'var(--ink-4)', marginBottom:28, textAlign:'center', maxWidth:380 }}>
                The file must follow the template format. Make sure all required columns are present.
              </div>
              <label style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 22px', background:'#0a84ff', color:'#fff', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', boxShadow:'var(--sh-sm)' }}>
                <span style={{ fontSize:16 }}>📎</span> Choose CSV file
                <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display:'none' }} />
              </label>
              <div style={{ marginTop:28, padding:'14px 20px', background:'#f7f9fc', border:'1px solid var(--line)', borderRadius:10, fontSize:13, color:'var(--ink-3)', textAlign:'center', maxWidth:400 }}>
                Don't have a file yet?{' '}
                <button onClick={downloadTemplate} style={{ color:'#0a84ff', background:'none', border:'none', cursor:'pointer', fontWeight:600, fontSize:13, fontFamily:'inherit' }}>
                  Download the template →
                </button>
              </div>
            </div>
          )}
 
          {/* STEP 3 — Preview */}
          {step==='preview' && (
            <div>
              {errors.length > 0 && (
                <div style={{ background:'#fdecea', border:'1px solid rgba(216,57,51,.25)', borderRadius:10, padding:'14px 18px', marginBottom:16 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--red)', marginBottom:8 }}>❌ {errors.length} error{errors.length!==1?'s':''} found — fix your CSV and re-upload</div>
                  <ul style={{ fontSize:12.5, color:'#8b0000', paddingLeft:16 }}>{errors.map((e,i)=><li key={i}>{e}</li>)}</ul>
                </div>
              )}
              {rows.length > 0 && (
                <>
                  <div style={{ background:'#e7f6ea', border:'1px solid rgba(40,167,69,.25)', borderRadius:10, padding:'12px 16px', marginBottom:16, fontSize:13.5, color:'#1a5c2a', fontWeight:500 }}>
                    ✅ {rows.length} employee{rows.length!==1?'s':''} ready to import
                    {errors.length>0 && <span style={{ color:'var(--red)' }}> · {errors.length} row{errors.length!==1?'s':''} skipped due to errors</span>}
                  </div>
                  <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:12, overflow:'hidden', maxHeight:360, overflowY:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                      <thead>
                        <tr style={{ background:'#fafafa', borderBottom:'1px solid var(--line)', position:'sticky', top:0 }}>
                          <th style={{ padding:'9px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--ink-4)', textTransform:'uppercase', letterSpacing:'.03em' }}>#</th>
                          <th style={{ padding:'9px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--ink-4)', textTransform:'uppercase', letterSpacing:'.03em' }}>Name</th>
                          <th style={{ padding:'9px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--ink-4)', textTransform:'uppercase', letterSpacing:'.03em' }}>Email</th>
                          <th style={{ padding:'9px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--ink-4)', textTransform:'uppercase', letterSpacing:'.03em' }}>Designation</th>
                          <th style={{ padding:'9px 14px', textAlign:'right', fontSize:11, fontWeight:600, color:'var(--ink-4)', textTransform:'uppercase', letterSpacing:'.03em' }}>{region==='UAE'?'Basic AED':'CTC ₹'}</th>
                          <th style={{ padding:'9px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--ink-4)', textTransform:'uppercase', letterSpacing:'.03em' }}>Joining</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r,i) => (
                          <tr key={i} style={{ borderBottom:'1px solid rgba(0,0,0,.04)' }}>
                            <td style={{ padding:'10px 14px', color:'var(--ink-4)', fontSize:12 }}>{i+1}</td>
                            <td style={{ padding:'10px 14px', fontWeight:600 }}>{r.firstName} {r.lastName}</td>
                            <td style={{ padding:'10px 14px', color:'var(--ink-3)', fontSize:12.5 }}>{r.email}</td>
                            <td style={{ padding:'10px 14px', color:'var(--ink-3)' }}>{r.designation}</td>
                            <td style={{ padding:'10px 14px', textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight:500 }}>
                              {region==='UAE' ? (+r.basicSalary||0).toLocaleString() : (+r.ctcAnnual||0).toLocaleString()}
                            </td>
                            <td style={{ padding:'10px 14px', color:'var(--ink-3)', fontSize:12.5 }}>{r.joiningDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
 
          {/* STEP 4 — Done */}
          {step==='done' && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 0', textAlign:'center' }}>
              {results.ok > 0 && (
                <>
                  <div style={{ fontSize:52, marginBottom:16 }}>🎉</div>
                  <div style={{ fontSize:18, fontWeight:700, color:'#28a745', marginBottom:8 }}>Import successful!</div>
                  <div style={{ fontSize:14, color:'var(--ink-3)', marginBottom: results.fail>0?16:0 }}>
                    <strong>{results.ok}</strong> employee{results.ok!==1?'s':''} added successfully
                    {results.fail>0 && <>, <strong style={{ color:'var(--red)' }}>{results.fail}</strong> failed</>}
                  </div>
                </>
              )}
              {results.fail > 0 && results.ok === 0 && (
                <>
                  <div style={{ fontSize:52, marginBottom:16 }}>😞</div>
                  <div style={{ fontSize:18, fontWeight:700, color:'var(--red)', marginBottom:8 }}>Import failed</div>
                </>
              )}
              {results.msgs.length > 0 && (
                <div style={{ background:'#fdecea', border:'1px solid rgba(216,57,51,.2)', borderRadius:10, padding:'14px 18px', width:'100%', textAlign:'left', maxHeight:200, overflowY:'auto' }}>
                  <div style={{ fontSize:12.5, fontWeight:600, color:'var(--red)', marginBottom:8 }}>Errors:</div>
                  <ul style={{ fontSize:12.5, color:'#8b0000', paddingLeft:16 }}>{results.msgs.map((m,i)=><li key={i} style={{ marginBottom:3 }}>{m}</li>)}</ul>
                </div>
              )}
            </div>
          )}
        </div>
 
        {/* Footer */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 24px', borderTop:'1px solid var(--line)', background:'#fafafa', borderRadius:'0 0 18px 18px', flexShrink:0 }}>
          <div>
            {step !== 'done' && (
              <button onClick={downloadTemplate} style={{ fontSize:13.5, color:'#0a84ff', background:'none', border:'none', cursor:'pointer', fontWeight:500, fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
                ↓ Download template CSV
              </button>
            )}
          </div>
          <div style={{ display:'flex', gap:10 }}>
            {step==='done' ? (
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            ) : (
              <>
                <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                {step==='guide' && <button className="btn btn-primary" onClick={()=>setStep('upload')}>Continue →</button>}
                {step==='upload' && <button className="btn btn-ghost" onClick={()=>setStep('guide')}>← Back</button>}
                {step==='preview' && (
                  <>
                    <button className="btn btn-ghost" onClick={()=>setStep('upload')}>← Re-upload</button>
                    {rows.length > 0 && (
                      <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
                        {importing ? `Importing ${rows.length} employees…` : `Import ${rows.length} employee${rows.length!==1?'s':''}`}
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
 
// ─────────────────────────────────────────────────────────────────────────────
// ADD / EDIT EMPLOYEE MODAL
// ─────────────────────────────────────────────────────────────────────────────
function EmpModal({ region, employee, onClose, onSave, saving }: any) {
  const [tab, setTab] = useState<'personal'|'salary'>('personal');
  const [f, setF] = useState({
    firstName:employee?.firstName||'', lastName:employee?.lastName||'',
    email:employee?.email||'', phone:employee?.phone||'',
    departmentId:employee?.departmentId||employee?.department?.id||'',
    designation:employee?.designation||'', joiningDate:employee?.joiningDate?.split('T')[0]||'',
    emiratesId:employee?.emiratesId||'', visaNo:employee?.visaNo||'',
    passportNo:employee?.passportNo||'', iban:employee?.iban||'',
    isUaeNational:employee?.isUaeNational||false, nationality:employee?.nationality||'',
    panNumber:employee?.panNumber||'', uanNumber:employee?.uanNumber||'',
    aadharNumber:employee?.aadharNumber||'', bankAccount:employee?.bankAccount||'',
    basicSalary:employee?.salaryStructure?.basicSalary||'',
    housingAllowance:employee?.salaryStructure?.housingAllowance||'',
    transportAllowance:employee?.salaryStructure?.transportAllowance||'',
    medicalAllowance:employee?.salaryStructure?.medicalAllowance||'',
    otherAllowances:employee?.salaryStructure?.otherAllowances||'',
    ctcAnnual:employee?.salaryStructure?.ctcAnnual||'',
    basicPct:employee?.salaryStructure?.basicPct||40,
    taxRegime:employee?.salaryStructure?.taxRegime||'NEW',
    cityType:employee?.salaryStructure?.cityType||'METRO',
  });
  const s = (k:string,v:any) => setF(p=>({...p,[k]:v}));
  type InpStyle = React.CSSProperties;
  const inp = (field?: string): InpStyle => ({
    width:'100%', padding:'9px 12px',
    border:`1px solid ${field && errs[field] ? '#d83933' : 'var(--line-2)'}`,
    borderRadius:9, fontSize:13.5, fontFamily:'inherit', outline:'none',
    background: field && errs[field] ? '#fffafa' : '#fff',
    color:'var(--ink)',
  } as InpStyle);
 
 
  const [errs, setErrs] = useState<Record<string,string>>({});
 
  const validate = (): boolean => {
    const e: Record<string,string> = {};
    if (!f.firstName.trim())    e.firstName    = 'Required';
    if (!f.lastName.trim())     e.lastName     = 'Required';
    if (!f.designation.trim())  e.designation  = 'Required';
    if (!f.joiningDate)         e.joiningDate  = 'Required';
    if (!f.email.trim())        e.email        = 'Required';
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(f.email)) e.email = 'Invalid email format';
 
    if (region === 'UAE') {
      if (!f.basicSalary || +f.basicSalary <= 0) e.basicSalary = 'Basic salary must be > 0';
      if (f.iban && !/^AE[0-9]{21}$/.test(f.iban.replace(/\s/g,''))) e.iban = 'UAE IBAN: AE + 21 digits (e.g. AE070331234567890123456)';
      if (f.emiratesId && !/^784-[0-9]{4}-[0-9]{7}-[0-9]$/.test(f.emiratesId)) e.emiratesId = 'Format: 784-YYYY-NNNNNNN-C';
      if (f.phone && !/^\+971[0-9]{8,9}$/.test(f.phone.replace(/\s/g,''))) e.phone = 'UAE format: +971XXXXXXXXX';
    }
    if (region === 'INDIA') {
      if (!f.ctcAnnual || +f.ctcAnnual <= 0) e.ctcAnnual = 'CTC must be > 0';
      if (f.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(f.panNumber)) e.panNumber = 'Format: ABCDE1234F (5 letters + 4 digits + 1 letter)';
      if (f.aadharNumber && !/^[0-9]{12}$/.test(f.aadharNumber.replace(/\s/g,''))) e.aadharNumber = 'Aadhar must be 12 digits';
      if (f.uanNumber && !/^[0-9]{12}$/.test(f.uanNumber)) e.uanNumber = 'UAN must be 12 digits';
    }
    setErrs(e);
    return Object.keys(e).length === 0;
  };
 
  const handleSave = () => {
    if (!validate()) return;
    const ss = region==='UAE'
      ? { basicSalary:+f.basicSalary, housingAllowance:+f.housingAllowance, transportAllowance:+f.transportAllowance, medicalAllowance:+f.medicalAllowance, otherAllowances:+f.otherAllowances }
      : { ctcAnnual:+f.ctcAnnual, basicPct:+f.basicPct, taxRegime:f.taxRegime, cityType:f.cityType };
    const { basicSalary,housingAllowance,transportAllowance,medicalAllowance,otherAllowances,ctcAnnual,basicPct,taxRegime,cityType,...emp } = f;
    // Remove empty departmentId to avoid FK error
    if (!emp.departmentId) delete (emp as any).departmentId;
    onSave({ ...emp, salaryStructure:ss });
  };
 
  const ErrMsg = ({ field }: { field: string }) => errs[field]
    ? <div style={{ fontSize:11.5, color:'#d83933', marginTop:4 }}>⚠ {errs[field]}</div>
    : null;
 
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,.35)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(8px)' }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#fff', borderRadius:18, width:600, maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:'0 18px 50px rgba(0,0,0,.18)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid var(--line)', flexShrink:0 }}>
          <div style={{ fontSize:17, fontWeight:700 }}>{employee?'Edit employee':'Add employee'}</div>
          <button onClick={onClose} style={{ width:26, height:26, borderRadius:'50%', border:'none', background:'rgba(0,0,0,.07)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink-3)' }}>×</button>
        </div>
        <div style={{ display:'flex', padding:'0 22px', borderBottom:'1px solid var(--line)', flexShrink:0 }}>
          {(['personal','salary'] as const).map(t => (
            <button key={t} onClick={()=>setTab(t)} style={{ padding:'12px 16px', border:'none', background:'transparent', fontSize:13.5, fontWeight:600, color:tab===t?'#0a84ff':'var(--ink-3)', borderBottom:`2px solid ${tab===t?'#0a84ff':'transparent'}`, cursor:'pointer', fontFamily:'inherit', marginBottom:-1, transition:'all .12s' }}>
              {t==='personal'?'Personal details':'Salary & payroll'}
            </button>
          ))}
        </div>
        <div style={{ padding:22, overflowY:'auto', flex:1 }}>
          {tab==='personal' && (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color: errs['firstName'] ? '#d83933' : 'var(--ink-3)', marginBottom:6 }}>First name *</label><input style={inp('firstName')} value={f.firstName} onChange={e=>{s('firstName',e.target.value);if(errs.firstName)setErrs(p=>({...p,firstName:''}));}} />  {errs['firstName'] && <div style={{ fontSize:11.5, color:'#d83933', marginTop:4 }}>⚠ {errs['firstName']}</div>}</div>
                <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color: errs['lastName'] ? '#d83933' : 'var(--ink-3)', marginBottom:6 }}>Last name *</label><input style={inp('lastName')} value={f.lastName} onChange={e=>{s('lastName',e.target.value);if(errs.lastName)setErrs(p=>({...p,lastName:''}));}} />  {errs['lastName'] && <div style={{ fontSize:11.5, color:'#d83933', marginTop:4 }}>⚠ {errs['lastName']}</div>}</div>
                <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color: errs['email'] ? '#d83933' : 'var(--ink-3)', marginBottom:6 }}>Email *</label><input style={inp('email')} type="email" value={f.email} onChange={e=>{s('email',e.target.value);if(errs.email)setErrs(p=>({...p,email:''}));}} />  {errs['email'] && <div style={{ fontSize:11.5, color:'#d83933', marginTop:4 }}>⚠ {errs['email']}</div>}</div>
                <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color: errs['phone'] ? '#d83933' : 'var(--ink-3)', marginBottom:6 }}>Phone</label><input style={inp('phone')} value={f.phone} onChange={e=>{s('phone',e.target.value);if(errs.phone)setErrs(p=>({...p,phone:''}));}} placeholder={region==='UAE'?'+971XXXXXXXXX':'+91XXXXXXXXXX'} />  {errs['phone'] && <div style={{ fontSize:11.5, color:'#d83933', marginTop:4 }}>⚠ {errs['phone']}</div>}</div>
                <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color: errs['designation'] ? '#d83933' : 'var(--ink-3)', marginBottom:6 }}>Designation *</label><input style={inp('designation')} value={f.designation} onChange={e=>{s('designation',e.target.value);if(errs.designation)setErrs(p=>({...p,designation:''}));}} />  {errs['designation'] && <div style={{ fontSize:11.5, color:'#d83933', marginTop:4 }}>⚠ {errs['designation']}</div>}</div>
                <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color: errs['joiningDate'] ? '#d83933' : 'var(--ink-3)', marginBottom:6 }}>Joining date *</label><input style={inp('joiningDate')} type="date" value={f.joiningDate} onChange={e=>{s('joiningDate',e.target.value);if(errs.joiningDate)setErrs(p=>({...p,joiningDate:''}));}} />  {errs['joiningDate'] && <div style={{ fontSize:11.5, color:'#d83933', marginTop:4 }}>⚠ {errs['joiningDate']}</div>}</div>
              </div>
              {region==='UAE' && (
                <>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--ink-4)', textTransform:'uppercase', letterSpacing:'.05em', margin:'16px 0 12px', paddingBottom:8, borderBottom:'1px solid var(--line)' }}>UAE details</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color: 'var(--ink-3)', marginBottom:6 }}>Nationality</label><input style={inp()} value={f.nationality} onChange={e=>s('nationality',e.target.value)} /></div>
                    <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color: errs['emiratesId'] ? '#d83933' : 'var(--ink-3)', marginBottom:6 }}>Emirates ID</label><input style={inp('emiratesId')} value={f.emiratesId} onChange={e=>{s('emiratesId',e.target.value);if(errs.emiratesId)setErrs(p=>({...p,emiratesId:''}));}} placeholder="784-1990-1234567-1" />  {errs['emiratesId'] && <div style={{ fontSize:11.5, color:'#d83933', marginTop:4 }}>⚠ {errs['emiratesId']}</div>}</div>
                    <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color: 'var(--ink-3)', marginBottom:6 }}>Passport number</label><input style={inp()} value={f.passportNo} onChange={e=>s('passportNo',e.target.value)} /></div>
                    <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color: 'var(--ink-3)', marginBottom:6 }}>Visa number</label><input style={inp()} value={f.visaNo} onChange={e=>s('visaNo',e.target.value)} /></div>
                    <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color: errs['iban'] ? '#d83933' : 'var(--ink-3)', marginBottom:6 }}>IBAN (WPS)</label><input style={inp('iban')} value={f.iban} onChange={e=>{s('iban',e.target.value.toUpperCase());if(errs.iban)setErrs(p=>({...p,iban:''}));}} placeholder="AE070331234567890123456" />  {errs['iban'] && <div style={{ fontSize:11.5, color:'#d83933', marginTop:4 }}>⚠ {errs['iban']}</div>}</div>
                    <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color: 'var(--ink-3)', marginBottom:6 }}>UAE national (GPSSA)</label><select style={inp()} value={f.isUaeNational?'yes':'no'} onChange={e=>s('isUaeNational',e.target.value==='yes')}><option value="no">No</option><option value="yes">Yes — GPSSA applies</option></select></div>
                  </div>
                </>
              )}
              {region==='INDIA' && (
                <>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--ink-4)', textTransform:'uppercase', letterSpacing:'.05em', margin:'16px 0 12px', paddingBottom:8, borderBottom:'1px solid var(--line)' }}>India details</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color: errs['panNumber'] ? '#d83933' : 'var(--ink-3)', marginBottom:6 }}>PAN number</label><input style={inp('panNumber')} value={f.panNumber} onChange={e=>{s('panNumber',e.target.value.toUpperCase());if(errs.panNumber)setErrs(p=>({...p,panNumber:''}));}} placeholder="ABCDE1234F" />  {errs['panNumber'] && <div style={{ fontSize:11.5, color:'#d83933', marginTop:4 }}>⚠ {errs['panNumber']}</div>}</div>
                    <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color: errs['uanNumber'] ? '#d83933' : 'var(--ink-3)', marginBottom:6 }}>UAN number</label><input style={inp('uanNumber')} value={f.uanNumber} onChange={e=>{s('uanNumber',e.target.value.replace(/\D/g,'').slice(0,12));if(errs.uanNumber)setErrs(p=>({...p,uanNumber:''}));}} placeholder="12 digit UAN" maxLength={12} />  {errs['uanNumber'] && <div style={{ fontSize:11.5, color:'#d83933', marginTop:4 }}>⚠ {errs['uanNumber']}</div>}</div>
                    <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color: errs['aadharNumber'] ? '#d83933' : 'var(--ink-3)', marginBottom:6 }}>Aadhar number</label><input style={inp('aadharNumber')} value={f.aadharNumber} onChange={e=>{s('aadharNumber',e.target.value.replace(/\D/g,'').slice(0,12));if(errs.aadharNumber)setErrs(p=>({...p,aadharNumber:''}));}} placeholder="12 digit Aadhar" maxLength={12} />  {errs['aadharNumber'] && <div style={{ fontSize:11.5, color:'#d83933', marginTop:4 }}>⚠ {errs['aadharNumber']}</div>}</div>
                    <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color: 'var(--ink-3)', marginBottom:6 }}>Bank account</label><input style={inp()} value={f.bankAccount} onChange={e=>s('bankAccount',e.target.value)} /></div>
                  </div>
                </>
              )}
            </>
          )}
          {tab==='salary' && region==='UAE' && (
            <>
              <div style={{ background:'#e8f1fe', borderRadius:10, padding:'11px 14px', fontSize:12.5, color:'#0055b0', marginBottom:18 }}>All amounts in AED per month.</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color: 'var(--ink-3)', marginBottom:6 }}>Basic salary (AED) *</label><input style={inp()} type="number" value={f.basicSalary} onChange={e=>s('basicSalary',e.target.value)} /></div>
                <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color: 'var(--ink-3)', marginBottom:6 }}>Housing allowance</label><input style={inp()} type="number" value={f.housingAllowance} onChange={e=>s('housingAllowance',e.target.value)} /></div>
                <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color: 'var(--ink-3)', marginBottom:6 }}>Transport allowance</label><input style={inp()} type="number" value={f.transportAllowance} onChange={e=>s('transportAllowance',e.target.value)} /></div>
                <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color: 'var(--ink-3)', marginBottom:6 }}>Medical allowance</label><input style={inp()} type="number" value={f.medicalAllowance} onChange={e=>s('medicalAllowance',e.target.value)} /></div>
                <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color: 'var(--ink-3)', marginBottom:6 }}>Other allowances</label><input style={inp()} type="number" value={f.otherAllowances} onChange={e=>s('otherAllowances',e.target.value)} /></div>
              </div>
              {+f.basicSalary > 0 && (
                <div style={{ background:'#e7f6ea', borderRadius:10, padding:'11px 14px', fontSize:13, color:'#28a745', fontWeight:500 }}>
                  Total monthly: AED {(+f.basicSalary + +f.housingAllowance + +f.transportAllowance + +f.medicalAllowance + +f.otherAllowances).toLocaleString()}
                </div>
              )}
            </>
          )}
          {tab==='salary' && region==='INDIA' && (
            <>
              <div style={{ background:'#e8f1fe', borderRadius:10, padding:'11px 14px', fontSize:12.5, color:'#0055b0', marginBottom:18 }}>Enter annual CTC. Components are auto-calculated.</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color: 'var(--ink-3)', marginBottom:6 }}>CTC per annum (₹) *</label><input style={inp()} type="number" value={f.ctcAnnual} onChange={e=>s('ctcAnnual',e.target.value)} /></div>
                <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color: 'var(--ink-3)', marginBottom:6 }}>Tax regime</label><select style={inp()} value={f.taxRegime} onChange={e=>s('taxRegime',e.target.value)}><option value="NEW">New regime (ITA 2025)</option><option value="OLD">Old regime</option></select></div>
                <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color: 'var(--ink-3)', marginBottom:6 }}>Basic % of CTC</label><input style={inp()} type="number" min="30" max="60" value={f.basicPct} onChange={e=>s('basicPct',e.target.value)} /></div>
                <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color: 'var(--ink-3)', marginBottom:6 }}>City type</label><select style={inp()} value={f.cityType} onChange={e=>s('cityType',e.target.value)}><option value="METRO">Metro (50% HRA)</option><option value="NON_METRO">Non-metro (40% HRA)</option></select></div>
              </div>
              {+f.ctcAnnual > 0 && (
                <div style={{ background:'#e7f6ea', borderRadius:10, padding:'13px 16px', fontSize:13, color:'#28a745', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                  <div><div style={{ fontSize:11, opacity:.8 }}>Monthly CTC</div><div style={{ fontWeight:600 }}>₹{Math.round(+f.ctcAnnual/12).toLocaleString()}</div></div>
                  <div><div style={{ fontSize:11, opacity:.8 }}>Basic/month</div><div style={{ fontWeight:600 }}>₹{Math.round(+f.ctcAnnual/12*+f.basicPct/100).toLocaleString()}</div></div>
                  <div><div style={{ fontSize:11, opacity:.8 }}>HRA/month</div><div style={{ fontWeight:600 }}>₹{Math.round(+f.ctcAnnual/12*+f.basicPct/100*(f.cityType==='METRO'?.5:.4)).toLocaleString()}</div></div>
                </div>
              )}
            </>
          )}
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'16px 22px', borderTop:'1px solid var(--line)', background:'#fafafa', borderRadius:'0 0 18px 18px', flexShrink:0 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':employee?'Save changes':'Add employee'}</button>
        </div>
      </div>
    </div>
  );
}