'use client';
import { useState, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { useRegionStore } from '@/store/auth.store';
import { api } from '@/lib/api';

type Step = 'info' | 'upload' | 'validate' | 'result';

const FIELD_DOCS: Record<string, { label: string; required: boolean; desc: string; example: string }[]> = {
  UAE: [
    { label:'firstName',         required:true,  desc:'Employee first name',                        example:'John'              },
    { label:'lastName',          required:true,  desc:'Employee last name',                         example:'Smith'             },
    { label:'email',             required:true,  desc:'Work email address (must be unique)',         example:'john@company.com'  },
    { label:'designation',       required:true,  desc:'Job title / designation',                    example:'Software Engineer' },
    { label:'joiningDate',       required:true,  desc:'Date of joining (YYYY-MM-DD format)',         example:'2024-01-15'        },
    { label:'basicSalary',       required:true,  desc:'Monthly basic salary in AED',                example:'8000'              },
    { label:'housingAllowance',  required:false, desc:'Monthly housing allowance in AED',           example:'3000'              },
    { label:'transportAllowance',required:false, desc:'Monthly transport allowance in AED',         example:'1000'              },
    { label:'medicalAllowance',  required:false, desc:'Monthly medical allowance in AED',           example:'500'               },
    { label:'otherAllowances',   required:false, desc:'Other monthly allowances in AED',            example:'0'                 },
    { label:'phone',             required:false, desc:'Phone number with country code',             example:'+971501234567'     },
    { label:'nationality',       required:false, desc:'Employee nationality',                       example:'Indian'            },
    { label:'emiratesId',        required:false, desc:'Emirates ID number',                         example:'784-1990-1234567-1'},
    { label:'visaNo',            required:false, desc:'UAE Visa number',                            example:'201/2024/123456'   },
    { label:'passportNo',        required:false, desc:'Passport number',                           example:'A1234567'          },
    { label:'iban',              required:false, desc:'IBAN for WPS salary transfer',              example:'AE070331234567890'  },
    { label:'bankAccount',       required:false, desc:'Bank account number',                       example:'0331234567890'     },
    { label:'isUaeNational',     required:false, desc:'UAE national (GPSSA applies): true/false',  example:'false'             },
    { label:'departmentName',    required:false, desc:'Department name (created if not exists)',   example:'Engineering'       },
  ],
  INDIA: [
    { label:'firstName',         required:true,  desc:'Employee first name',                        example:'Priya'             },
    { label:'lastName',          required:true,  desc:'Employee last name',                         example:'Sharma'            },
    { label:'email',             required:true,  desc:'Work email address (must be unique)',         example:'priya@company.com' },
    { label:'designation',       required:true,  desc:'Job title / designation',                    example:'Developer'         },
    { label:'joiningDate',       required:true,  desc:'Date of joining (YYYY-MM-DD format)',         example:'2024-01-15'        },
    { label:'ctcAnnual',         required:true,  desc:'Annual CTC in INR',                          example:'1200000'           },
    { label:'phone',             required:false, desc:'Phone number with country code',             example:'+919876543210'     },
    { label:'panNumber',         required:false, desc:'PAN card number (AAAAA9999A format)',        example:'ABCDE1234F'        },
    { label:'uanNumber',         required:false, desc:'Universal Account Number for PF',           example:'100123456789'      },
    { label:'aadharNumber',      required:false, desc:'12-digit Aadhaar number',                   example:'123456789012'      },
    { label:'bankAccount',       required:false, desc:'Bank account number',                       example:'12345678901234'    },
    { label:'taxRegime',         required:false, desc:'Tax regime: NEW or OLD (default: NEW)',      example:'NEW'               },
    { label:'basicPct',          required:false, desc:'Basic salary % of CTC (default: 40)',        example:'40'                },
    { label:'cityType',          required:false, desc:'METRO or NON_METRO for HRA (default: METRO)',example:'METRO'            },
    { label:'departmentName',    required:false, desc:'Department name (created if not exists)',   example:'Engineering'       },
  ],
};

export default function EmployeeImportPage() {
  const { region } = useRegionStore();
  const [step, setStep]           = useState<Step>('info');
  const [csvContent, setCsvContent] = useState('');
  const [fileName, setFileName]   = useState('');
  const [validation, setValidation] = useState<any>(null);
  const [result, setResult]       = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fields = FIELD_DOCS[region] || FIELD_DOCS.UAE;
  const required = fields.filter(f => f.required);
  const optional = fields.filter(f => !f.required);

  // Download template
  const downloadTemplate = () => {
    const headers = fields.map(f => f.label);
    const example = fields.map(f => f.example);
    const csv = [headers.join(','), example.join(',')].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `employee-import-${region.toLowerCase()}-template.csv`;
    a.click();
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      setCsvContent(e.target?.result as string || '');
      setStep('validate');
    };
    reader.readAsText(file);
  };

  const validateMut = useMutation({
    mutationFn: () => api.post('/employees/import/validate', { csvContent, region }).then(r => r.data),
    onSuccess: (data) => { setValidation(data); },
  });

  const importMut = useMutation({
    mutationFn: () => api.post('/employees/import', { csvContent, region }).then(r => r.data),
    onSuccess: (data) => { setResult(data); setStep('result'); },
  });

  const inp = { padding:'8px 12px', border:'1px solid #d2d2d6', borderRadius:8, fontSize:13.5, fontFamily:'inherit', outline:'none', background:'#fff' } as const;

  return (
    <AppLayout>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <a href="/employees" style={{ fontSize:13, color:'#0a84ff', textDecoration:'none' }}>← Employees</a>
          </div>
          <h1 style={{ fontSize:26, fontWeight:700, letterSpacing:'-.02em' }}>Bulk import employees</h1>
          <p style={{ fontSize:14, color:'#6e6e73', marginTop:4 }}>Import multiple employees at once using a CSV file · {region}</p>
        </div>
      </div>

      {/* Progress steps */}
      <div style={{ display:'flex', alignItems:'center', marginBottom:32, background:'#fff', border:'1px solid #e3e3e6', borderRadius:14, padding:'16px 24px', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
        {[['info','1','Review requirements'],['upload','2','Upload file'],['validate','3','Validate data'],['result','4','Import complete']].map(([s,n,lbl], i, arr) => {
          const done = ['info','upload','validate','result'].indexOf(step) > i;
          const active = step === s;
          return (
            <div key={s} style={{ display:'flex', alignItems:'center', flex: i < arr.length-1 ? 1 : 'none' }}>
              <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background: done?'#28a745':active?'#0a84ff':'#e5e5ea', color:'#fff', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', boxShadow: active?'0 0 0 4px rgba(10,132,255,.2)':undefined }}>
                  {done ? '✓' : n}
                </div>
                <span style={{ fontSize:13, fontWeight: active?600:400, color: active?'#0a84ff':done?'#48484a':'#a1a1a6', whiteSpace:'nowrap' }}>{lbl}</span>
              </div>
              {i < arr.length-1 && <div style={{ flex:1, height:1.5, background: done?'#28a745':'#e5e5ea', margin:'0 12px' }} />}
            </div>
          );
        })}
      </div>

      {/* STEP 1 — Info / Disclaimer */}
      {step === 'info' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          {/* Required fields */}
          <div style={{ background:'#fff', border:'1px solid #e3e3e6', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #e3e3e6', background:'#fdecea', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:18 }}>🔴</span>
              <div>
                <div style={{ fontSize:15, fontWeight:600, color:'#1d1d1f' }}>Required fields</div>
                <div style={{ fontSize:12.5, color:'#d83933', marginTop:2 }}>These must be present in every row</div>
              </div>
            </div>
            <div style={{ padding:8 }}>
              {required.map(f => (
                <div key={f.label} style={{ padding:'10px 14px', borderBottom:'1px solid #f5f5f7' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <code style={{ fontSize:12, background:'#fdecea', color:'#d83933', padding:'2px 7px', borderRadius:5, fontWeight:600 }}>{f.label}</code>
                  </div>
                  <div style={{ fontSize:12.5, color:'#48484a' }}>{f.desc}</div>
                  <div style={{ fontSize:11.5, color:'#a1a1a6', marginTop:2 }}>e.g. <em>{f.example}</em></div>
                </div>
              ))}
            </div>
          </div>

          {/* Optional fields */}
          <div style={{ background:'#fff', border:'1px solid #e3e3e6', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #e3e3e6', background:'#e7f6ea', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:18 }}>🟢</span>
              <div>
                <div style={{ fontSize:15, fontWeight:600, color:'#1d1d1f' }}>Optional fields</div>
                <div style={{ fontSize:12.5, color:'#28a745', marginTop:2 }}>Leave blank if not available</div>
              </div>
            </div>
            <div style={{ padding:8 }}>
              {optional.map(f => (
                <div key={f.label} style={{ padding:'10px 14px', borderBottom:'1px solid #f5f5f7' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <code style={{ fontSize:12, background:'#e7f6ea', color:'#28a745', padding:'2px 7px', borderRadius:5, fontWeight:600 }}>{f.label}</code>
                  </div>
                  <div style={{ fontSize:12.5, color:'#48484a' }}>{f.desc}</div>
                  <div style={{ fontSize:11.5, color:'#a1a1a6', marginTop:2 }}>e.g. <em>{f.example}</em></div>
                </div>
              ))}
            </div>
          </div>

          {/* Rules / Disclaimer */}
          <div style={{ gridColumn:'span 2', background:'#fff', border:'1px solid #e3e3e6', borderRadius:14, padding:20, boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
              <span>⚠️</span> Important rules &amp; notes
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              {[
                ['📋','CSV format only','File must be UTF-8 encoded CSV. First row = column headers exactly matching the field names above.'],
                ['📧','Unique email','Each employee email must be unique. Duplicate emails will be skipped with an error.'],
                ['📅','Date format','joiningDate must be YYYY-MM-DD (e.g. 2024-01-15). Other formats will fail validation.'],
                ['💰','Salary values','Salary fields must be positive numbers only — no currency symbols, commas or spaces.'],
                ['🔤','PAN format','India: PAN must be 10 characters in format AAAAA9999A (5 letters, 4 digits, 1 letter).'],
                ['🏢','Departments','If departmentName is provided and doesn\'t exist, it will be created automatically.'],
                ['🔢','Max rows','Maximum 500 employees per import. For larger imports, split into multiple files.'],
                ['✅','Validation first','Always click Validate before importing to catch errors without affecting your data.'],
                ['↩️','No undo','Import cannot be reversed. Validate carefully before proceeding with import.'],
              ].map(([icon, title, desc]) => (
                <div key={title as string} style={{ background:'#f7f9fc', borderRadius:10, padding:'13px 14px' }}>
                  <div style={{ fontSize:18, marginBottom:7 }}>{icon}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#1d1d1f', marginBottom:4 }}>{title}</div>
                  <div style={{ fontSize:12.5, color:'#6e6e73', lineHeight:1.5 }}>{desc}</div>
                </div>
              ))}
            </div>

            <div style={{ display:'flex', gap:12, marginTop:20, paddingTop:20, borderTop:'1px solid #e3e3e6' }}>
              <button onClick={downloadTemplate} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                ↓ Download CSV template
              </button>
              <button onClick={() => setStep('upload')} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', background:'#fff', color:'#1d1d1f', border:'1px solid #d2d2d6', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                I understand, continue →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2 — Upload */}
      {step === 'upload' && (
        <div style={{ maxWidth:600, margin:'0 auto' }}>
          <div style={{ background:'#fff', border:'1px solid #e3e3e6', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid #e3e3e6' }}>
              <div style={{ fontSize:17, fontWeight:600 }}>Upload your CSV file</div>
              <div style={{ fontSize:13.5, color:'#6e6e73', marginTop:4 }}>File must match the template format for {region} employees</div>
            </div>
            <div style={{ padding:24 }}>
              {/* Drop zone */}
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor='#0a84ff'; e.currentTarget.style.background='#e8f1fe'; }}
                onDragLeave={e => { e.currentTarget.style.borderColor='#d2d2d6'; e.currentTarget.style.background='#f7f9fc'; }}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                style={{ border:'2px dashed #d2d2d6', borderRadius:12, padding:'48px 24px', textAlign:'center', cursor:'pointer', background:'#f7f9fc', transition:'all .15s' }}
              >
                <div style={{ fontSize:48, marginBottom:14 }}>📂</div>
                <div style={{ fontSize:16, fontWeight:600, color:'#1d1d1f', marginBottom:6 }}>Drop your CSV file here</div>
                <div style={{ fontSize:13.5, color:'#6e6e73', marginBottom:16 }}>or click to browse</div>
                <div style={{ fontSize:12.5, color:'#a1a1a6' }}>Accepts .csv files only · Max 500 rows</div>
              </div>
              <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

              {/* Or paste */}
              <div style={{ marginTop:20 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#6e6e73', marginBottom:8, display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ flex:1, height:1, background:'#e3e3e6' }} />
                  or paste CSV content
                  <div style={{ flex:1, height:1, background:'#e3e3e6' }} />
                </div>
                <textarea
                  style={{ ...inp, width:'100%', minHeight:160, resize:'vertical', fontFamily:'monospace', fontSize:12 }}
                  placeholder={`firstName,lastName,email,designation,joiningDate,${region==='UAE'?'basicSalary':'ctcAnnual'}\nJohn,Smith,john@co.com,Engineer,2024-01-15,${region==='UAE'?'8000':'1200000'}`}
                  value={csvContent}
                  onChange={e => { setCsvContent(e.target.value); setFileName('Pasted content'); }}
                />
              </div>

              <div style={{ display:'flex', gap:10, marginTop:16 }}>
                <button onClick={() => setStep('info')} style={{ padding:'9px 18px', background:'#fff', border:'1px solid #d2d2d6', borderRadius:9, fontSize:13.5, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>← Back</button>
                <button onClick={downloadTemplate} style={{ padding:'9px 18px', background:'#fff', border:'1px solid #d2d2d6', borderRadius:9, fontSize:13.5, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>↓ Download template</button>
                {csvContent && (
                  <button onClick={() => { setStep('validate'); validateMut.mutate(); }} style={{ marginLeft:'auto', padding:'9px 20px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:9, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                    Validate file →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3 — Validate */}
      {step === 'validate' && (
        <div style={{ maxWidth:800, margin:'0 auto' }}>
          <div style={{ background:'#fff', border:'1px solid #e3e3e6', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid #e3e3e6', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:17, fontWeight:600 }}>Validation results</div>
                <div style={{ fontSize:13.5, color:'#6e6e73', marginTop:3 }}>{fileName}</div>
              </div>
              {!validation && (
                <button onClick={() => validateMut.mutate()} disabled={validateMut.isPending} style={{ padding:'8px 18px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:9, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  {validateMut.isPending ? 'Validating…' : 'Run validation'}
                </button>
              )}
            </div>
            <div style={{ padding:24 }}>
              {!validation && !validateMut.isPending && (
                <div style={{ textAlign:'center', padding:'40px 0', color:'#a1a1a6' }}>
                  <div style={{ fontSize:36, marginBottom:12 }}>🔍</div>
                  <div style={{ fontSize:14, fontWeight:500 }}>Click "Run validation" to check your file</div>
                </div>
              )}

              {validateMut.isPending && (
                <div style={{ textAlign:'center', padding:'40px 0', color:'#6e6e73' }}>
                  <div style={{ fontSize:36, marginBottom:12 }}>⏳</div>
                  <div style={{ fontSize:14 }}>Validating your data…</div>
                </div>
              )}

              {validation && (
                <>
                  {/* Summary */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
                    <div style={{ background:'#e7f6ea', borderRadius:12, padding:'16px 18px' }}>
                      <div style={{ fontSize:28, fontWeight:700, color:'#28a745' }}>{validation.valid?.length || 0}</div>
                      <div style={{ fontSize:13, color:'#28a745', fontWeight:500, marginTop:4 }}>✓ Valid rows</div>
                    </div>
                    <div style={{ background: validation.errors?.length ? '#fdecea' : '#f5f5f7', borderRadius:12, padding:'16px 18px' }}>
                      <div style={{ fontSize:28, fontWeight:700, color: validation.errors?.length ? '#d83933' : '#a1a1a6' }}>{validation.errors?.length || 0}</div>
                      <div style={{ fontSize:13, color: validation.errors?.length ? '#d83933' : '#a1a1a6', fontWeight:500, marginTop:4 }}>✗ Errors</div>
                    </div>
                    <div style={{ background:'#f7f9fc', borderRadius:12, padding:'16px 18px' }}>
                      <div style={{ fontSize:28, fontWeight:700, color:'#1d1d1f' }}>{(validation.valid?.length || 0) + (validation.errors?.length || 0)}</div>
                      <div style={{ fontSize:13, color:'#6e6e73', fontWeight:500, marginTop:4 }}>Total rows</div>
                    </div>
                  </div>

                  {/* Errors */}
                  {validation.errors?.length > 0 && (
                    <div style={{ marginBottom:20 }}>
                      <div style={{ fontSize:13.5, fontWeight:600, color:'#d83933', marginBottom:8 }}>Errors to fix before importing:</div>
                      <div style={{ background:'#fdecea', borderRadius:10, padding:14, maxHeight:200, overflowY:'auto' }}>
                        {validation.errors.map((e: string, i: number) => (
                          <div key={i} style={{ fontSize:12.5, color:'#d83933', padding:'4px 0', borderBottom:'1px solid rgba(216,57,51,.1)', display:'flex', gap:8 }}>
                            <span style={{ flexShrink:0 }}>⚠</span> {e}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Valid preview */}
                  {validation.valid?.length > 0 && (
                    <div>
                      <div style={{ fontSize:13.5, fontWeight:600, color:'#28a745', marginBottom:8 }}>Preview of valid rows (first 5):</div>
                      <div style={{ overflowX:'auto', borderRadius:10, border:'1px solid #e3e3e6' }}>
                        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
                          <thead>
                            <tr style={{ background:'#f7f9fc' }}>
                              {['Name','Email','Designation','Joining date', region==='UAE'?'Basic salary':'CTC annual'].map(h => (
                                <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontWeight:600, color:'#6e6e73', textTransform:'uppercase', fontSize:10.5, letterSpacing:'.04em', borderBottom:'1px solid #e3e3e6' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {validation.valid.slice(0, 5).map((row: any, i: number) => (
                              <tr key={i} style={{ borderBottom:'1px solid #f5f5f7' }}>
                                <td style={{ padding:'9px 14px', fontWeight:500 }}>{row.firstName} {row.lastName}</td>
                                <td style={{ padding:'9px 14px', color:'#6e6e73' }}>{row.email}</td>
                                <td style={{ padding:'9px 14px', color:'#6e6e73' }}>{row.designation}</td>
                                <td style={{ padding:'9px 14px', color:'#6e6e73' }}>{row.joiningDate}</td>
                                <td style={{ padding:'9px 14px', fontVariantNumeric:'tabular-nums', fontWeight:500 }}>{region==='UAE'?`AED ${(+row.basicSalary).toLocaleString()}`:`₹${(+row.ctcAnnual).toLocaleString()}`}</td>
                              </tr>
                            ))}
                            {validation.valid.length > 5 && (
                              <tr><td colSpan={5} style={{ padding:'9px 14px', color:'#a1a1a6', fontSize:12, textAlign:'center' }}>+{validation.valid.length - 5} more rows…</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', padding:'16px 24px', borderTop:'1px solid #e3e3e6', background:'#fafafa', borderRadius:'0 0 14px 14px' }}>
              <button onClick={() => { setStep('upload'); setValidation(null); }} style={{ padding:'9px 18px', background:'#fff', border:'1px solid #d2d2d6', borderRadius:9, fontSize:13.5, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>← Back</button>
              {validation?.valid?.length > 0 && (
                <button onClick={() => importMut.mutate()} disabled={importMut.isPending} style={{ padding:'9px 22px', background:'#28a745', color:'#fff', border:'none', borderRadius:9, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  {importMut.isPending ? 'Importing…' : `Import ${validation.valid.length} employees →`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 4 — Result */}
      {step === 'result' && result && (
        <div style={{ maxWidth:600, margin:'0 auto' }}>
          <div style={{ background:'#fff', border:'1px solid #e3e3e6', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ padding:'32px 36px', textAlign:'center', borderBottom:'1px solid #e3e3e6' }}>
              <div style={{ fontSize:56, marginBottom:16 }}>{result.failed === 0 ? '🎉' : '⚠️'}</div>
              <div style={{ fontSize:22, fontWeight:700, color:'#1d1d1f', marginBottom:8 }}>
                {result.failed === 0 ? 'Import complete!' : 'Import completed with some errors'}
              </div>
              <div style={{ fontSize:14, color:'#6e6e73' }}>
                {result.created} employees added successfully
              </div>
            </div>
            <div style={{ padding:24 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:result.errors?.length ? 20 : 0 }}>
                <div style={{ background:'#e7f6ea', borderRadius:12, padding:'16px 18px', textAlign:'center' }}>
                  <div style={{ fontSize:28, fontWeight:700, color:'#28a745' }}>{result.created}</div>
                  <div style={{ fontSize:12.5, color:'#28a745', fontWeight:500, marginTop:4 }}>Created</div>
                </div>
                <div style={{ background:'#fdf3e0', borderRadius:12, padding:'16px 18px', textAlign:'center' }}>
                  <div style={{ fontSize:28, fontWeight:700, color:'#c77700' }}>{result.skipped}</div>
                  <div style={{ fontSize:12.5, color:'#c77700', fontWeight:500, marginTop:4 }}>Skipped</div>
                </div>
                <div style={{ background:'#f7f9fc', borderRadius:12, padding:'16px 18px', textAlign:'center' }}>
                  <div style={{ fontSize:28, fontWeight:700, color:'#1d1d1f' }}>{result.total}</div>
                  <div style={{ fontSize:12.5, color:'#6e6e73', fontWeight:500, marginTop:4 }}>Total rows</div>
                </div>
              </div>

              {result.errors?.length > 0 && (
                <div style={{ background:'#fdecea', borderRadius:10, padding:14, maxHeight:180, overflowY:'auto' }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#d83933', marginBottom:8 }}>Issues encountered:</div>
                  {result.errors.map((e: string, i: number) => (
                    <div key={i} style={{ fontSize:12.5, color:'#d83933', padding:'3px 0', display:'flex', gap:8 }}>
                      <span style={{ flexShrink:0 }}>⚠</span> {e}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display:'flex', gap:10, padding:'16px 24px', borderTop:'1px solid #e3e3e6', background:'#fafafa', borderRadius:'0 0 14px 14px' }}>
              <a href="/employees" style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 20px', background:'#0a84ff', color:'#fff', textDecoration:'none', borderRadius:9, fontSize:13.5, fontWeight:600 }}>
                View employees →
              </a>
              <button onClick={() => { setStep('info'); setCsvContent(''); setValidation(null); setResult(null); }} style={{ padding:'9px 18px', background:'#fff', border:'1px solid #d2d2d6', borderRadius:9, fontSize:13.5, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
                Import more
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
