'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SettingsLayout, Card, Field, fieldStyle, SectionTitle, SaveBar } from '../_components';
import { settingsApi } from '@/lib/api';

const BUILT_IN = [
  { id:'b1', name:'Basic salary',        type:'EARNING',   taxable:true,  fixed:true },
  { id:'b2', name:'Housing allowance',   type:'EARNING',   taxable:false, fixed:true },
  { id:'b3', name:'Transport allowance', type:'EARNING',   taxable:false, fixed:true },
  { id:'b4', name:'Medical allowance',   type:'EARNING',   taxable:false, fixed:true },
  { id:'b5', name:'PF (Employee 12%)',   type:'DEDUCTION', taxable:false, fixed:true },
  { id:'b6', name:'TDS',                 type:'DEDUCTION', taxable:false, fixed:true },
  { id:'b7', name:'Loan EMI',            type:'DEDUCTION', taxable:false, fixed:true },
];

export default function SalaryComponentsSettings() {
  const qc = useQueryClient();
  const [custom, setCustom] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ name:'', type:'EARNING', taxable:false });
  const inp = fieldStyle;
  const btn = (bg='#0a84ff',fg='#fff'):React.CSSProperties => ({ padding:'7px 14px',background:bg,color:fg,border:'none',borderRadius:7,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit' });

  const { data: settings } = useQuery({ queryKey:['settings'], queryFn:settingsApi.get });
  useEffect(() => {
    if (settings && (settings as any).salaryComponents) {
      try { setCustom(JSON.parse((settings as any).salaryComponents)); } catch {}
    }
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: (components: any[]) => settingsApi.update({ salaryComponents: JSON.stringify(components) }),
    onSuccess: () => { qc.invalidateQueries({queryKey:['settings']}); setSaved(true); setTimeout(()=>setSaved(false),3000); },
  });

  const add = () => {
    if (!form.name.trim()) return;
    let updated;
    if (editing) {
      updated = custom.map(c => c.id===editing.id ? { ...c, ...form } : c);
      setEditing(null);
    } else {
      updated = [...custom, { id: Date.now().toString(), ...form, fixed:false }];
    }
    setCustom(updated);
    saveMut.mutate(updated);
    setForm({ name:'', type:'EARNING', taxable:false });
    setAdding(false);
  };

  const remove = (id: string) => {
    const updated = custom.filter(c => c.id !== id);
    setCustom(updated);
    saveMut.mutate(updated);
  };

  const startEdit = (c:any) => { setEditing(c); setForm({ name:c.name, type:c.type, taxable:c.taxable }); setAdding(true); };

  return (
    <SettingsLayout title="Salary components" subtitle="Define earnings and deductions that appear on payslips">
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
        {!adding && <button style={btn()} onClick={()=>{ setAdding(true); setEditing(null); setForm({name:'',type:'EARNING',taxable:false}); }}>Add component</button>}
      </div>

      {adding && (
        <Card>
          <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)', marginBottom:18 }}>{editing?'Edit component':'New salary component'}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:16 }}>
            <Field label="Component name"><input style={inp} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Meal allowance" autoFocus /></Field>
            <Field label="Type">
              <select style={inp} value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
                <option value="EARNING">Earning</option>
                <option value="DEDUCTION">Deduction</option>
              </select>
            </Field>
            <Field label="Taxable">
              <select style={inp} value={form.taxable?'yes':'no'} onChange={e=>setForm(p=>({...p,taxable:e.target.value==='yes'}))}>
                <option value="no">Non-taxable</option>
                <option value="yes">Taxable</option>
              </select>
            </Field>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button style={btn()} onClick={add} disabled={!form.name}>{editing?'Save changes':'Add component'}</button>
            <button style={btn('var(--bg)','var(--ink-2)')} onClick={()=>{ setAdding(false); setEditing(null); }}>Cancel</button>
          </div>
        </Card>
      )}

      <Card>
        <SectionTitle>Built-in components</SectionTitle>
        <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:24 }}>
          <thead><tr style={{ borderBottom:'1px solid var(--line)' }}>
            {['Component','Type','Taxable',''].map((h,i)=>(
              <th key={h} style={{ padding:'8px 14px', textAlign:i===3?'right':'left', fontSize:11, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {BUILT_IN.map(c=>(
              <tr key={c.id} style={{ borderBottom:'1px solid var(--line)' }}>
                <td style={{ padding:'11px 14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:c.type==='EARNING'?'#28a745':'#d83933' }} />
                    <span style={{ fontWeight:500, color:'var(--ink)', fontSize:13.5 }}>{c.name}</span>
                    <span style={{ fontSize:11, color:'var(--ink-4)', background:'var(--bg)', padding:'1px 8px', borderRadius:999, border:'1px solid var(--line)' }}>system</span>
                  </div>
                </td>
                <td style={{ padding:'11px 14px' }}><span style={{ fontSize:12.5, fontWeight:600, color:c.type==='EARNING'?'#28a745':'#d83933', background:c.type==='EARNING'?'#e7f6ea':'#fdecea', padding:'3px 10px', borderRadius:999 }}>{c.type}</span></td>
                <td style={{ padding:'11px 14px', fontSize:13, color:'var(--ink-2)' }}>{c.taxable?'Yes':'No'}</td>
                <td style={{ padding:'11px 14px', textAlign:'right', fontSize:12, color:'var(--ink-4)' }}>Built-in</td>
              </tr>
            ))}
          </tbody>
        </table>

        {saved && <div style={{ fontSize:13, color:'#28a745', fontWeight:500, marginBottom:12 }}>Changes saved</div>}

        {custom.length > 0 && (
          <>
            <SectionTitle>Custom components</SectionTitle>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr style={{ borderBottom:'1px solid var(--line)' }}>
                {['Component','Type','Taxable','Actions'].map((h,i)=>(
                  <th key={h} style={{ padding:'8px 14px', textAlign:i===3?'right':'left', fontSize:11, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {custom.map(c=>(
                  <tr key={c.id} style={{ borderBottom:'1px solid var(--line)' }}
                    onMouseEnter={e=>(e.currentTarget.style.background='var(--bg)')}
                    onMouseLeave={e=>(e.currentTarget.style.background='')}>
                    <td style={{ padding:'11px 14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', background:c.type==='EARNING'?'#28a745':'#d83933' }} />
                        <span style={{ fontWeight:500, color:'var(--ink)', fontSize:13.5 }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ padding:'11px 14px' }}><span style={{ fontSize:12.5, fontWeight:600, color:c.type==='EARNING'?'#28a745':'#d83933', background:c.type==='EARNING'?'#e7f6ea':'#fdecea', padding:'3px 10px', borderRadius:999 }}>{c.type}</span></td>
                    <td style={{ padding:'11px 14px', fontSize:13, color:'var(--ink-2)' }}>{c.taxable?'Yes':'No'}</td>
                    <td style={{ padding:'11px 14px', textAlign:'right' }}>
                      <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                        <button style={btn('var(--bg)','var(--ink)')} onClick={()=>startEdit(c)}>Edit</button>
                        <button style={btn('#fdecea','#d83933')} onClick={()=>remove(c.id)}>Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        {custom.length===0 && !adding && (
          <div style={{ padding:'20px 0', textAlign:'center', color:'var(--ink-3)', fontSize:13.5 }}>No custom components. Click "Add component" to create one.</div>
        )}
      </Card>
    </SettingsLayout>
  );
}
