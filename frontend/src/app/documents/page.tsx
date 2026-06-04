'use client';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { api } from '@/lib/api';
import { useRegionStore } from '@/store/auth.store';
import { initials } from '@/lib/utils';
import { uploadToCloudinary, validateImage } from '@/lib/cloudinary';

const CATEGORIES = ['PASSPORT','VISA','EMIRATES_ID','NATIONAL_ID','PAN','AADHAR','OFFER_LETTER','CONTRACT','CERTIFICATE','EDUCATION','PAYSLIP','OTHER'];
const CAT_ICON: Record<string,string> = { PASSPORT:'🛂', VISA:'✈️', EMIRATES_ID:'🪪', NATIONAL_ID:'🪪', PAN:'📄', AADHAR:'📋', OFFER_LETTER:'📝', CONTRACT:'📑', CERTIFICATE:'🏆', EDUCATION:'🎓', PAYSLIP:'💰', OTHER:'📁' };
const CAT_COLOR: Record<string,string> = { PASSPORT:'#0a84ff', VISA:'#af52de', EMIRATES_ID:'#28a745', NATIONAL_ID:'#28a745', PAN:'#ff9500', AADHAR:'#ff9500', OFFER_LETTER:'#30b0c7', CONTRACT:'#30b0c7', CERTIFICATE:'#ff375f', EDUCATION:'#ff375f', PAYSLIP:'#28a745', OTHER:'#6e6e73' };

function ThreeDotMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position:'relative' }}>
      <button onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        style={{ width:28, height:28, border:'none', background:'transparent', borderRadius:6, cursor:'pointer', fontSize:18, color:'var(--ink-3)', display:'flex', alignItems:'center', justifyContent:'center' }}
        onMouseEnter={e => (e.currentTarget.style.background='var(--bg)')}
        onMouseLeave={e => (e.currentTarget.style.background='transparent')}>⋯</button>
      {open && (
        <>
          <div style={{ position:'fixed', inset:0, zIndex:90 }} onClick={() => setOpen(false)} />
          <div style={{ position:'absolute', right:0, top:'100%', background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, boxShadow:'0 4px 16px rgba(0,0,0,.12)', zIndex:100, minWidth:140, overflow:'hidden' }}>
            <button onClick={() => { setOpen(false); onEdit(); }}
              style={{ display:'block', width:'100%', padding:'10px 14px', border:'none', background:'transparent', textAlign:'left', fontSize:13.5, cursor:'pointer', color:'var(--ink)', fontFamily:'inherit' }}
              onMouseEnter={e => (e.currentTarget.style.background='var(--bg)')}
              onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
              ✎ Edit
            </button>
            <button onClick={() => { setOpen(false); onDelete(); }}
              style={{ display:'block', width:'100%', padding:'10px 14px', border:'none', background:'transparent', textAlign:'left', fontSize:13.5, cursor:'pointer', color:'#d83933', fontFamily:'inherit' }}
              onMouseEnter={e => (e.currentTarget.style.background='#fdecea')}
              onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
              🗑 Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function DocModal({ empId, doc, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    name:       doc?.name       || '',
    category:   doc?.category   || 'OTHER',
    fileUrl:    doc?.fileUrl    || '',
    expiryDate: doc?.expiryDate ? new Date(doc.expiryDate).toISOString().split('T')[0] : '',
    notes:      doc?.notes      || '',
  });
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const s = (k:string, v:string) => setForm(p => ({...p,[k]:v}));

  const handleFile = async (file: File) => {
    const imgErr = validateImage(file, 10);
    // Allow non-images (PDFs etc) too
    if (file.size > 10 * 1024 * 1024) { setError('File must be under 10MB'); return; }
    setUploading(true); setUploadPct(0); setError('');
    try {
      const result = await uploadToCloudinary(file, 'payrollos/documents', pct => setUploadPct(pct));
      setForm(p => ({...p, fileUrl: result.url, name: p.name || file.name.replace(/\.[^.]+$/,'')}));
    } catch (e: any) { setError('Upload failed: ' + e.message); }
    finally { setUploading(false); }
  };

  const handleSubmit = () => {
    setError('');
    if (!form.name.trim()) { setError('Document name is required'); return; }
    if (!form.fileUrl.trim()) { setError('Please upload a file first before saving'); return; }
    onSaved({ ...form });
  };

  const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', border:'1px solid var(--line-2)', borderRadius:9, fontSize:13.5, fontFamily:'inherit', outline:'none', background:'var(--surface)', color:'var(--ink)' };
  const selStyle: React.CSSProperties = { ...inp, backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236e6e73' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat:'no-repeat', backgroundPosition:'right 10px center', WebkitAppearance:'none' as any, appearance:'none' as any, paddingRight:30 };
  const F = ({label, children}: any) => <div style={{marginBottom:14}}><label style={{display:'block',fontSize:12.5,fontWeight:600,color:'var(--ink-3)',marginBottom:6}}>{label}</label>{children}</div>;

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(8px)', background:'rgba(0,0,0,.35)' }} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'var(--surface)', borderRadius:18, width:480, boxShadow:'0 18px 50px rgba(0,0,0,.2)', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid var(--line)', position:'sticky', top:0, background:'var(--surface)', zIndex:1 }}>
          <div style={{ fontSize:17, fontWeight:700, color:'var(--ink)' }}>{doc ? 'Edit document' : 'Upload document'}</div>
          <button onClick={onClose} style={{ width:26,height:26,borderRadius:'50%',border:'none',background:'var(--bg)',cursor:'pointer',fontSize:16,color:'var(--ink-2)' }}>×</button>
        </div>

        <div style={{ padding:22 }}>
          <F label="Document name *">
            <input style={inp} placeholder="e.g. Emirates ID — Azar" value={form.name} onChange={e=>s('name',e.target.value)} />
          </F>
          <F label="Category">
            <select style={selStyle} value={form.category} onChange={e=>s('category',e.target.value)}>
              {CATEGORIES.map(c=><option key={c} value={c}>{CAT_ICON[c]} {c.replace(/_/g,' ')}</option>)}
            </select>
          </F>

          {/* File upload */}
          <F label="File *">
            <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" style={{ display:'none' }} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);e.target.value='';}} />
            {form.fileUrl ? (
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--bg)', border:'1px solid var(--line)', borderRadius:9 }}>
                <span style={{ fontSize:20 }}>📎</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>File uploaded</div>
                  <a href={form.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize:12, color:'#0a84ff' }}>View file ↗</a>
                </div>
                <button onClick={()=>fileRef.current?.click()} style={{ padding:'5px 12px', background:'var(--surface)', border:'1px solid var(--line-2)', borderRadius:7, fontSize:12, cursor:'pointer', fontFamily:'inherit', color:'var(--ink)' }}>Change</button>
              </div>
            ) : (
              <div onClick={()=>fileRef.current?.click()} style={{ border:'2px dashed var(--line-2)', borderRadius:10, padding:'24px 20px', textAlign:'center', cursor:'pointer', transition:'border-color .15s' }}
                onMouseEnter={e=>(e.currentTarget.style.borderColor='#0a84ff')} onMouseLeave={e=>(e.currentTarget.style.borderColor='var(--line-2)')}>
                {uploading ? (
                  <div>
                    <div style={{ fontSize:13, color:'var(--ink-3)', marginBottom:8 }}>Uploading {uploadPct}%…</div>
                    <div style={{ height:4, background:'var(--line)', borderRadius:2 }}>
                      <div style={{ width:`${uploadPct}%`, height:'100%', background:'#0a84ff', borderRadius:2, transition:'width .2s' }} />
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize:28, marginBottom:8 }}>📁</div>
                    <div style={{ fontSize:13.5, fontWeight:600, color:'var(--ink)' }}>Click to upload file</div>
                    <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:4 }}>PDF, images, Word, Excel — max 10MB</div>
                  </>
                )}
              </div>
            )}
          </F>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <F label="Expiry date (optional)">
              <input style={inp} type="date" value={form.expiryDate} onChange={e=>s('expiryDate',e.target.value)} />
            </F>
            <F label="Notes (optional)">
              <input style={inp} placeholder="Any notes…" value={form.notes} onChange={e=>s('notes',e.target.value)} />
            </F>
          </div>

          {error && <div style={{ padding:'10px 14px', background:'#fdecea', border:'1px solid #fcc', borderRadius:9, fontSize:13, color:'#d83933', marginTop:4 }}>⚠ {error}</div>}
        </div>

        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'16px 22px', borderTop:'1px solid var(--line)', background:'var(--bg)', borderRadius:'0 0 18px 18px' }}>
          <button onClick={onClose} style={{ padding:'8px 16px', background:'var(--surface)', border:'1px solid var(--line-2)', borderRadius:8, fontSize:13.5, fontWeight:500, cursor:'pointer', fontFamily:'inherit', color:'var(--ink)' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={uploading} style={{ padding:'8px 20px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:8, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity:uploading?0.5:1 }}>
            {uploading ? `Uploading ${uploadPct}%…` : doc ? 'Save changes' : 'Add document'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const { region } = useRegionStore();
  const qc = useQueryClient();
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [modal, setModal] = useState<{open:boolean; doc?:any}>({open:false});
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string|null>(null);

  const { data: employees = [], isLoading: empsLoading } = useQuery({
    queryKey: ['doc-employees', region],
    queryFn: () => api.get('/documents/employees').then(r => r.data),
  });

  const { data: empDocs, isLoading: docsLoading } = useQuery({
    queryKey: ['emp-docs', selectedEmp?.id],
    queryFn: () => api.get(`/documents/employee/${selectedEmp?.id}`).then(r => r.data),
    enabled: !!selectedEmp?.id,
  });

  const createMut = useMutation({
    mutationFn: (dto:any) => api.post(`/documents/employee/${selectedEmp?.id}`, dto).then(r=>r.data),
    onSuccess: () => { qc.invalidateQueries({queryKey:['emp-docs',selectedEmp?.id]}); qc.invalidateQueries({queryKey:['doc-employees']}); setModal({open:false}); },
    onError: (e:any) => alert('Failed to save document: '+(e?.response?.data?.message||e?.message||'Check server logs')),
  });
  const updateMut = useMutation({
    mutationFn: ({id,dto}:any) => api.put(`/documents/${id}`, dto).then(r=>r.data),
    onSuccess: () => { qc.invalidateQueries({queryKey:['emp-docs',selectedEmp?.id]}); setModal({open:false}); },
    onError: (e:any) => alert('Failed to update document: '+(e?.response?.data?.message||e?.message)),
  });
  const deleteMut = useMutation({
    mutationFn: (id:string) => api.delete(`/documents/${id}`).then(r=>r.data),
    onSuccess: () => { qc.invalidateQueries({queryKey:['emp-docs',selectedEmp?.id]}); qc.invalidateQueries({queryKey:['doc-employees']}); setDeleting(null); },
  });

  const filtered = (employees as any[]).filter((e:any) =>
    !search || `${e.firstName} ${e.lastName} ${e.employeeCode}`.toLowerCase().includes(search.toLowerCase())
  );

  const docs = (empDocs as any)?.documents || [];
  const emp = (empDocs as any)?.employee;

  const isExpiringSoon = (d: any) => {
    if (!d.expiryDate) return false;
    return new Date(d.expiryDate).getTime() - Date.now() < 30 * 86400000;
  };

  return (
    <AppLayout>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:26, fontWeight:700, letterSpacing:'-.02em', color:'var(--ink)' }}>Employee documents</h1>
        <p style={{ fontSize:14, color:'var(--ink-3)', marginTop:4 }}>Securely store passports, visas, contracts and other sensitive documents</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:20, alignItems:'start' }}>
        {/* Employee list */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
          <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--line)' }}>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--ink-3)', fontSize:13, pointerEvents:'none' }}>⌕</span>
              <input style={{ width:'100%', height:33, padding:'0 10px 0 28px', border:'1px solid var(--line-2)', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', background:'var(--bg)', color:'var(--ink)' }}
                placeholder="Search employees…" value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
          </div>
          <div style={{ maxHeight:'calc(100vh - 260px)', overflowY:'auto' }}>
            {empsLoading ? <div style={{ padding:24, textAlign:'center', color:'var(--ink-3)', fontSize:13 }}>Loading…</div>
            : filtered.length===0 ? <div style={{ padding:24, textAlign:'center', color:'var(--ink-3)', fontSize:13 }}>No employees found</div>
            : filtered.map((e:any) => {
              const active = selectedEmp?.id === e.id;
              const docCount = e._count?.documents || 0;
              return (
                <div key={e.id} onClick={() => setSelectedEmp(e)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', cursor:'pointer', borderBottom:'1px solid var(--line)', background:active?'#e8f1fe':'transparent', transition:'background .1s' }}
                  onMouseEnter={el=>!active&&(el.currentTarget.style.background='var(--bg)')}
                  onMouseLeave={el=>!active&&(el.currentTarget.style.background='transparent')}>
                  <div style={{ width:34, height:34, borderRadius:'50%', background:active?'#0a84ff':'var(--ink-3)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:12, fontWeight:700, flexShrink:0, overflow:'hidden' }}>
                    {e.photoUrl ? <img src={e.photoUrl} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : initials(`${e.firstName} ${e.lastName}`)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13.5, fontWeight:600, color:active?'#0a84ff':'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.firstName} {e.lastName}</div>
                    <div style={{ fontSize:11.5, color:'var(--ink-3)' }}>{e.employeeCode} · {e.designation}</div>
                  </div>
                  <div style={{ flexShrink:0 }}>
                    {docCount>0
                      ? <span style={{ background:active?'#0a84ff':'var(--bg)', color:active?'#fff':'var(--ink-3)', fontSize:11, fontWeight:700, padding:'2px 7px', borderRadius:999, border:`1px solid ${active?'#0a84ff':'var(--line)'}` }}>{docCount}</span>
                      : <span style={{ fontSize:11, color:'var(--ink-4)' }}>—</span>
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Documents panel */}
        <div>
          {!selectedEmp ? (
            <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:14, padding:'64px 24px', textAlign:'center', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
              <div style={{ fontSize:44, opacity:.25, marginBottom:16 }}>👈</div>
              <div style={{ fontSize:16, fontWeight:600, color:'var(--ink)' }}>Select an employee</div>
              <div style={{ fontSize:14, color:'var(--ink-3)', marginTop:6 }}>Choose an employee from the list to view and manage their documents</div>
            </div>
          ) : (
            <div>
              {/* Employee header */}
              <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:14, padding:'18px 22px', marginBottom:16, display:'flex', alignItems:'center', gap:14, boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
                <div style={{ width:48, height:48, borderRadius:'50%', background:'#0a84ff', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:16, fontWeight:700, flexShrink:0, overflow:'hidden' }}>
                  {emp?.photoUrl ? <img src={emp.photoUrl} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : initials(`${selectedEmp.firstName} ${selectedEmp.lastName}`)}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:18, fontWeight:700, color:'var(--ink)' }}>{selectedEmp.firstName} {selectedEmp.lastName}</div>
                  <div style={{ fontSize:13, color:'var(--ink-3)', marginTop:2 }}>{selectedEmp.employeeCode} · {selectedEmp.designation} · {selectedEmp.department?.name}</div>
                </div>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <span style={{ fontSize:13, color:'var(--ink-3)' }}>{docs.length} document{docs.length!==1?'s':''}</span>
                  <button onClick={() => setModal({open:true})}
                    style={{ padding:'9px 18px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:9, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                    + Add document
                  </button>
                </div>
              </div>

              {/* Expiry alerts */}
              {docs.filter(isExpiringSoon).length>0 && (
                <div style={{ background:'#fdf3e0', border:'1px solid #c7770033', borderRadius:12, padding:'12px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:18 }}>⚠️</span>
                  <div style={{ fontSize:13.5, color:'#c77700' }}>
                    <strong>{docs.filter(isExpiringSoon).length} document{docs.filter(isExpiringSoon).length>1?'s':''}</strong> expiring within 30 days: {docs.filter(isExpiringSoon).map((d:any)=>d.name).join(', ')}
                  </div>
                </div>
              )}

              {/* Documents grid */}
              {docsLoading ? (
                <div style={{ padding:40, textAlign:'center', color:'var(--ink-3)' }}>Loading documents…</div>
              ) : docs.length===0 ? (
                <div style={{ background:'var(--surface)', border:'2px dashed var(--line-2)', borderRadius:14, padding:'48px 24px', textAlign:'center' }}>
                  <div style={{ fontSize:40, opacity:.3, marginBottom:14 }}>📂</div>
                  <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)' }}>No documents yet</div>
                  <div style={{ fontSize:13.5, color:'var(--ink-3)', marginTop:6, marginBottom:18 }}>Upload passports, visas, contracts and more</div>
                  <button onClick={() => setModal({open:true})} style={{ padding:'9px 20px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:9, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                    + Upload first document
                  </button>
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:12 }}>
                  {docs.map((doc:any) => {
                    const catColor = CAT_COLOR[doc.category] || '#6e6e73';
                    const expiring = isExpiringSoon(doc);
                    const expired  = doc.expiryDate && new Date(doc.expiryDate) < new Date();
                    return (
                      <div key={doc.id} style={{ background:'var(--surface)', border:`1px solid ${expiring||expired?'#ff9500':'var(--line)'}`, borderRadius:12, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.06)', transition:'box-shadow .15s' }}
                        onMouseEnter={e=>(e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,.1)')}
                        onMouseLeave={e=>(e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,.06)')}>
                        {/* Colour bar */}
                        <div style={{ height:3, background:catColor }} />
                        <div style={{ padding:'14px 14px 12px' }}>
                          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <span style={{ fontSize:22 }}>{CAT_ICON[doc.category]||'📁'}</span>
                              <span style={{ background:`${catColor}18`, color:catColor, fontSize:10.5, fontWeight:700, padding:'2px 7px', borderRadius:999 }}>{doc.category.replace(/_/g,' ')}</span>
                            </div>
                            {deleting===doc.id ? (
                              <div style={{ display:'flex', gap:4 }}>
                                <button onClick={()=>deleteMut.mutate(doc.id)} style={{ padding:'3px 9px', background:'#d83933', color:'#fff', border:'none', borderRadius:6, fontSize:11.5, cursor:'pointer', fontFamily:'inherit' }}>Delete</button>
                                <button onClick={()=>setDeleting(null)} style={{ padding:'3px 9px', background:'var(--bg)', border:'1px solid var(--line)', borderRadius:6, fontSize:11.5, cursor:'pointer', fontFamily:'inherit', color:'var(--ink-2)' }}>No</button>
                              </div>
                            ) : (
                              <ThreeDotMenu
                                onEdit={() => setModal({open:true, doc})}
                                onDelete={() => setDeleting(doc.id)}
                              />
                            )}
                          </div>
                          <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.name}</div>
                          {doc.notes && <div style={{ fontSize:12, color:'var(--ink-3)', marginBottom:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.notes}</div>}
                          {doc.expiryDate && (
                            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:expired?'#d83933':expiring?'#c77700':'var(--ink-3)', fontWeight: expiring||expired ? 600 : 400 }}>
                              {expired?'❌':expiring?'⚠️':'📅'} Expires {new Date(doc.expiryDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
                            </div>
                          )}
                          <div style={{ marginTop:12, display:'flex', gap:8 }}>
                            <a href={doc.fileUrl} target="_blank" rel="noreferrer" style={{ flex:1, padding:'7px 0', background:'var(--bg)', border:'1px solid var(--line)', borderRadius:8, fontSize:12.5, fontWeight:600, color:'#0a84ff', textDecoration:'none', textAlign:'center', display:'block' }}>
                              ↗ View file
                            </a>
                            <a href={doc.fileUrl} download style={{ flex:1, padding:'7px 0', background:'var(--bg)', border:'1px solid var(--line)', borderRadius:8, fontSize:12.5, fontWeight:600, color:'var(--ink-2)', textDecoration:'none', textAlign:'center', display:'block' }}>
                              ↓ Download
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {modal.open && (
        <DocModal
          empId={selectedEmp?.id}
          doc={modal.doc}
          onClose={() => setModal({open:false})}
          onSaved={(dto:any) => {
            if (modal.doc) updateMut.mutate({id:modal.doc.id, dto});
            else createMut.mutate(dto);
          }}
        />
      )}
    </AppLayout>
  );
}
