'use client';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ESSLayout from '@/components/layout/ESSLayout';
import { api } from '@/lib/api';
import { uploadToCloudinary } from '@/lib/cloudinary';
 
const DOC_TYPES = ['PASSPORT','VISA','EMIRATES_ID','LABOUR_CARD','CONTRACT','OTHER'];
const TYPE_COLOR: Record<string,string> = {
  PASSPORT:'#0a84ff', VISA:'#28a745', EMIRATES_ID:'#ff9500',
  LABOUR_CARD:'#af52de', CONTRACT:'#6e6e73', OTHER:'#a1a1a6',
};
 
export default function ESSDocuments() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
 
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [form, setForm] = useState({ name:'', category:'PASSPORT', expiryDate:'', fileUrl:'', fileName:'' });
  const [error, setError] = useState('');
  const s = (k:string, v:string) => setForm(p=>({...p,[k]:v}));
 
  // Fetch employee profile to get employee ID
  const { data: emp } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/employees/me').then(r=>r.data),
  });
 
  const docs: any[] = (emp as any)?.documents || [];
  const empId = (emp as any)?.id;
 
  const createMut = useMutation({
    mutationFn: (dto:any) => api.post(`/documents/employee/${empId}`, dto).then(r=>r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-profile'] });
      setShowForm(false);
      setForm({ name:'', category:'PASSPORT', expiryDate:'', fileUrl:'', fileName:'' });
      setError('');
    },
    onError: (e:any) => setError(e?.response?.data?.message || 'Failed to save document'),
  });
 
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    setUploadPct(0);
    try {
      const result = await uploadToCloudinary(file, 'payrollos/employee-docs', pct => setUploadPct(pct));
      const url = result.url;
      setForm(p => ({ ...p, fileUrl: url, fileName: file.name, name: p.name || file.name.replace(/\.[^.]+$/, '') }));
    } catch {
      setError('Upload failed — check Cloudinary config');
    } finally {
      setUploading(false);
    }
    e.target.value = '';
  };
 
  const handleSave = () => {
    setError('');
    if (!form.name.trim())   { setError('Document name is required'); return; }
    if (!form.fileUrl)       { setError('Please upload a file first'); return; }
    if (!empId)              { setError('Employee profile not linked — contact HR'); return; }
    createMut.mutate({
      name:       form.name,
      category:   form.category,
      type:       form.category,
      fileUrl:    form.fileUrl,
      expiryDate: form.expiryDate || undefined,
    });
  };
 
  const inp: React.CSSProperties = {
    width:'100%', padding:'9px 12px', border:'1px solid var(--line-2)',
    borderRadius:8, fontSize:13.5, fontFamily:'inherit', outline:'none',
    background:'var(--surface)', color:'var(--ink)',
  };
 
  return (
    <ESSLayout>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.01em', color:'var(--ink)' }}>My documents</h1>
          <p style={{ fontSize:13.5, color:'var(--ink-3)', marginTop:4 }}>
            Upload and manage your personal documents. HR can view these in the admin panel.
          </p>
        </div>
        {!showForm && empId && (
          <button onClick={()=>setShowForm(true)}
            style={{ padding:'9px 18px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:8, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            Upload document
          </button>
        )}
      </div>
 
      {/* Upload form */}
      {showForm && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:12, padding:24, marginBottom:20 }}>
          <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)', marginBottom:20 }}>Upload new document</div>
 
          {error && (
            <div style={{ background:'#fdecea', border:'1px solid #fcc', borderRadius:8, padding:'10px 14px', fontSize:13.5, color:'#d83933', marginBottom:16 }}>
              {error}
            </div>
          )}
 
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>Document name</label>
              <input style={inp} value={form.name} onChange={e=>s('name',e.target.value)} placeholder="e.g. UAE Passport" />
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>Document type</label>
              <select style={inp} value={form.category} onChange={e=>s('category',e.target.value)}>
                {DOC_TYPES.map(t=><option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>Expiry date (optional)</label>
              <input style={inp} type="date" value={form.expiryDate} onChange={e=>s('expiryDate',e.target.value)} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>File</label>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display:'none' }} onChange={handleFileChange} />
              <button onClick={()=>fileRef.current?.click()} disabled={uploading}
                style={{ width:'100%', padding:'9px 12px', border:'1px dashed var(--line-2)', borderRadius:8, fontSize:13.5, fontFamily:'inherit', cursor:'pointer', background:'var(--bg)', color:'var(--ink-2)', textAlign:'left' }}>
                {uploading ? `Uploading ${uploadPct}%…` : form.fileName || 'Click to choose file (PDF, JPG, PNG)'}
              </button>
              {form.fileUrl && !uploading && (
                <div style={{ fontSize:12, color:'#28a745', marginTop:4, fontWeight:500 }}>File uploaded successfully</div>
              )}
            </div>
          </div>
 
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={handleSave} disabled={uploading || createMut.isPending}
              style={{ padding:'9px 20px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:8, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity:(uploading||createMut.isPending)?.6:1 }}>
              {createMut.isPending ? 'Saving…' : 'Save document'}
            </button>
            <button onClick={()=>{ setShowForm(false); setError(''); setForm({name:'',category:'PASSPORT',expiryDate:'',fileUrl:'',fileName:''}); }}
              style={{ padding:'9px 20px', background:'var(--bg)', color:'var(--ink-2)', border:'1px solid var(--line)', borderRadius:8, fontSize:13.5, cursor:'pointer', fontFamily:'inherit' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
 
      {/* Documents grid */}
      {!emp ? (
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:12, padding:48, textAlign:'center' }}>
          <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)', marginBottom:6 }}>No employee profile linked</div>
          <div style={{ fontSize:13.5, color:'var(--ink-3)' }}>Contact your HR administrator to link your account</div>
        </div>
      ) : docs.length === 0 ? (
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:12, padding:48, textAlign:'center' }}>
          <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)', marginBottom:6 }}>No documents yet</div>
          <div style={{ fontSize:13.5, color:'var(--ink-3)', marginBottom:20 }}>Upload your passport, visa, Emirates ID and other documents</div>
          <button onClick={()=>setShowForm(true)}
            style={{ padding:'9px 18px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:8, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            Upload first document
          </button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:14 }}>
          {docs.map((doc:any) => {
            const color = TYPE_COLOR[doc.type] || TYPE_COLOR[doc.category] || '#6e6e73';
            const expired = doc.expiryDate && new Date(doc.expiryDate) < new Date();
            const expiringSoon = doc.expiryDate && !expired &&
              (new Date(doc.expiryDate).getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000;
            return (
              <div key={doc.id} style={{ background:'var(--surface)', border:`1px solid ${expired?'#fcc':expiringSoon?'#fde8b0':'var(--line)'}`, borderRadius:12, padding:18, boxShadow:'var(--sh-sm)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                  <span style={{ fontSize:11.5, fontWeight:700, color, background:color+'18', padding:'3px 10px', borderRadius:999 }}>
                    {(doc.type||doc.category||'OTHER').replace(/_/g,' ')}
                  </span>
                  {expired && <span style={{ fontSize:11, fontWeight:700, color:'#d83933', background:'#fdecea', padding:'2px 8px', borderRadius:999 }}>EXPIRED</span>}
                  {expiringSoon && <span style={{ fontSize:11, fontWeight:700, color:'#c77700', background:'#fdf3e0', padding:'2px 8px', borderRadius:999 }}>EXPIRING SOON</span>}
                </div>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)', marginBottom:4 }}>{doc.name}</div>
                {doc.expiryDate && (
                  <div style={{ fontSize:12, color:expired?'#d83933':expiringSoon?'#c77700':'var(--ink-3)', marginBottom:12 }}>
                    Expires: {new Date(doc.expiryDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
                  </div>
                )}
                {doc.fileUrl && (
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display:'inline-block', fontSize:13, color:'#0a84ff', fontWeight:500, textDecoration:'none', padding:'6px 14px', background:'#e8f1fe', borderRadius:7 }}>
                    View document
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ESSLayout>
  );
}