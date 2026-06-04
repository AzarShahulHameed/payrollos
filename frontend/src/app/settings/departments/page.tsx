'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SettingsLayout, Card, fieldStyle } from '../_components';
import { settingsApi } from '@/lib/api';

export default function DepartmentsSettings() {
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [addError, setAddError] = useState('');

  const { data: depts = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: settingsApi.getDepartments,
  });

  const createMut = useMutation({
    mutationFn: (dto: any) => settingsApi.createDepartment(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] });
      // Also invalidate employees so dept dropdown updates
      qc.invalidateQueries({ queryKey: ['employees'] });
      setNewName('');
      setAddError('');
    },
    onError: (e: any) => setAddError(e?.response?.data?.message || 'Failed to add department'),
  });

  const updateMut = useMutation({
    mutationFn: (dto: any) => settingsApi.updateDepartment(dto.id, { name: dto.name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] });
      qc.invalidateQueries({ queryKey: ['employees'] });
      setEditing(null);
    },
    onError: (e: any) => alert(e?.response?.data?.message || 'Failed to update'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => settingsApi.deleteDepartment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] });
      qc.invalidateQueries({ queryKey: ['employees'] });
      setConfirming(null);
    },
    onError: (e: any) => {
      alert(e?.response?.data?.message || 'Cannot delete this department');
      setConfirming(null);
    },
  });

  const handleAdd = () => {
    if (!newName.trim()) { setAddError('Department name is required'); return; }
    setAddError('');
    createMut.mutate({ name: newName.trim() });
  };

  const inp = fieldStyle;
  const btn = (bg = '#0a84ff', fg = '#fff'): React.CSSProperties => ({
    padding: '7px 14px', background: bg, color: fg, border: 'none',
    borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  });

  return (
    <SettingsLayout title="Departments" subtitle="Departments appear on payslips, employee profiles, and analytics">

      {/* Add new department */}
      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>
          Add department
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <input
              style={{ ...inp, borderColor: addError ? '#d83933' : 'var(--line-2)' }}
              placeholder="e.g. Finance, Operations, Sales"
              value={newName}
              autoComplete="off"
              onChange={e => { setNewName(e.target.value); if (addError) setAddError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            {addError && (
              <div style={{ fontSize: 12.5, color: '#d83933', marginTop: 5 }}>{addError}</div>
            )}
          </div>
          <button
            style={{ ...btn(), opacity: createMut.isPending ? .6 : 1 }}
            onClick={handleAdd}
            disabled={createMut.isPending}>
            {createMut.isPending ? 'Adding…' : 'Add department'}
          </button>
        </div>
      </Card>

      {/* Departments list */}
      <Card>
        {isLoading ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--ink-3)' }}>Loading…</div>
        ) : (depts as any[]).length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>No departments yet</div>
            <div style={{ fontSize: 13.5, color: 'var(--ink-3)' }}>Add your first department above to get started</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Department name', 'Employees', 'Actions'].map((h, i) => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: i === 2 ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(depts as any[]).map((d: any) => (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--line)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>

                  {/* Name — inline edit on click */}
                  <td style={{ padding: '11px 14px' }}>
                    {editing?.id === d.id ? (
                      <input
                        style={{ ...inp, padding: '6px 10px', fontSize: 13, width: '100%', maxWidth: 280 }}
                        value={editing.name}
                        autoFocus
                        onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : p)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') updateMut.mutate({ id: d.id, name: editing!.name });
                          if (e.key === 'Escape') setEditing(null);
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>{d.name}</span>
                    )}
                  </td>

                  {/* Employee count */}
                  <td style={{ padding: '11px 14px', color: 'var(--ink-3)', fontSize: 13 }}>
                    {d._count?.employees || 0} {d._count?.employees === 1 ? 'employee' : 'employees'}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                    {confirming === d.id ? (
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Delete {d.name}?</span>
                        <button style={btn('#d83933')} onClick={() => deleteMut.mutate(d.id)} disabled={deleteMut.isPending}>
                          {deleteMut.isPending ? '…' : 'Delete'}
                        </button>
                        <button style={btn('var(--bg)', 'var(--ink-2)')} onClick={() => setConfirming(null)}>Cancel</button>
                      </div>
                    ) : editing?.id === d.id ? (
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button style={btn()} onClick={() => updateMut.mutate({ id: d.id, name: editing.name })} disabled={updateMut.isPending}>
                          {updateMut.isPending ? 'Saving…' : 'Save'}
                        </button>
                        <button style={btn('var(--bg)', 'var(--ink-2)')} onClick={() => setEditing(null)}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button style={btn('var(--bg)', 'var(--ink)')} onClick={() => setEditing({ id: d.id, name: d.name })}>Edit</button>
                        <button style={btn('#fdecea', '#d83933')} onClick={() => setConfirming(d.id)}>Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--ink-3)' }}>
        Departments with employees cannot be deleted. Reassign all employees to another department first.
        Changes reflect immediately in employee profiles, payslips, and analytics.
      </div>
    </SettingsLayout>
  );
}
