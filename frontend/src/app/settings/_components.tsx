'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import {
  Building2, Settings, Scale, Landmark,
  Calendar, Wallet, Users, Bell, GitBranch,
  User, Shield, LayoutGrid,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/settings/organization',        label: 'Organisation'       },
  { href: '/settings/branches',            label: 'Branches'           },
  { href: '/settings/payroll',             label: 'Payroll'            },
  { href: '/settings/statutory',           label: 'Statutory'          },
  { href: '/settings/leave',               label: 'Leave policies'     },
  { href: '/settings/loans',               label: 'Loans & advances'   },
  { href: '/settings/salary-components',   label: 'Salary components'  },
  { href: '/settings/departments',         label: 'Departments'        },
  { href: '/settings/users',               label: 'Users & roles'      },
  { href: '/settings/notifications',       label: 'Notifications'      },
  { href: '/settings/profile',             label: 'My profile photo'   },
  { href: '/settings/security',            label: 'Security'           },
];

export function SettingsLayout({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  const pathname = usePathname();

  return (
    <AppLayout>
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'start' }}>

        {/* White inner nav */}
        <nav style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', position: 'sticky', top: 20, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <div style={{ padding: '12px 8px' }}>
            {NAV_ITEMS.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: '9px 14px', borderRadius: 8, marginBottom: 2,
                    background: active ? '#0a84ff' : 'transparent',
                    color: active ? '#fff' : '#48484a',
                    fontSize: 13.5, fontWeight: active ? 600 : 400,
                    cursor: 'pointer', transition: 'background .1s',
                  }}
                    onMouseEnter={e => !active && (e.currentTarget.style.background = '#f5f5f7')}
                    onMouseLeave={e => !active && (e.currentTarget.style.background = 'transparent')}
                  >
                    {label}
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <div>
          <div style={{ marginBottom: 22 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--ink)' }}>{title}</h1>
            {subtitle && <p style={{ fontSize: 13.5, color: 'var(--ink-3)', marginTop: 4 }}>{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </AppLayout>
  );
}

// ── Shared UI primitives ───────────────────────────────────────

export const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  border: '1px solid var(--line-2)', borderRadius: 8,
  fontSize: 13.5, fontFamily: 'inherit', outline: 'none',
  background: 'var(--surface)', color: 'var(--ink)',
};

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 24, marginBottom: 16 }}>
      {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--line)' }}>
      {children}
    </div>
  );
}

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ position: 'relative', width: 40, height: 22, flexShrink: 0, cursor: 'pointer', display: 'inline-block' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
      <div style={{ position: 'absolute', inset: 0, background: checked ? '#0a84ff' : 'var(--line-2)', borderRadius: 11, transition: '.2s' }}>
        <div style={{ position: 'absolute', width: 18, height: 18, left: checked ? 20 : 2, top: 2, background: '#fff', borderRadius: '50%', transition: '.2s', boxShadow: '0 1px 3px rgba(0,0,0,.15)' }} />
      </div>
    </label>
  );
}

export function ToggleRow({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
      <div style={{ flex: 1, paddingRight: 24 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>{label}</div>
        {description && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3 }}>{description}</div>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

export function SaveBar({ onSave, saving, saved }: { onSave: () => void; saving: boolean; saved: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
      {saved && <span style={{ fontSize: 13, color: '#28a745', fontWeight: 500 }}>Changes saved</span>}
      <button onClick={onSave} disabled={saving}
        style={{ padding: '9px 22px', background: '#0a84ff', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? .6 : 1 }}>
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}

export function Grid2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>{children}</div>;
}
