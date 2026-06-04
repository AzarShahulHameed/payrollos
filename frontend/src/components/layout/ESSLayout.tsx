'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, FileText, Calendar, Wallet,
  CreditCard, Receipt, FolderOpen, User,
  LogOut, ChevronDown, Bell, ChevronRight,
  Sun, Moon, Building2, Clock, Shield, Menu, X,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';
 
const NAV = [
  { href:'/ess/dashboard',       label:'Dashboard',       icon:LayoutDashboard },
  { href:'/ess/payslips',        label:'Payslips',        icon:FileText        },
  { href:'/ess/leaves',          label:'Leaves',          icon:Calendar        },
  { href:'/ess/loans',           label:'Loans',           icon:Wallet          },
  { href:'/ess/advances',        label:'Advances',        icon:CreditCard      },
  { href:'/ess/reimbursements',  label:'Expenses',        icon:Receipt         },
  { href:'/ess/attendance',      label:'Attendance',      icon:Clock           },
  { href:'/ess/documents',       label:'Documents',       icon:FolderOpen      },
  { href:'/ess/profile',         label:'Profile',         icon:User            },
  { href:'/ess/security',        label:'Security',        icon:Shield          },
];
 
// Bottom tab nav items (most used — 5 max)
const BOTTOM_NAV = [
  { href:'/ess/dashboard',  label:'Home',       icon:LayoutDashboard },
  { href:'/ess/payslips',   label:'Payslips',   icon:FileText        },
  { href:'/ess/leaves',     label:'Leaves',     icon:Calendar        },
  { href:'/ess/attendance', label:'Attendance', icon:Clock           },
  { href:'/ess/profile',    label:'Profile',    icon:User            },
];
 
const AV = ['#0a84ff','#28a745','#ff9500','#af52de','#ff375f'];
const avColor = (n='') => AV[(n.charCodeAt(0)||0) % AV.length];
const initials = (n='') => n.split(' ').map(w=>w[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
 
export default function ESSLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const { user, isAuthenticated, logout, updateUser } = useAuthStore();
 
  const [hydrated, setHydrated] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [dark, setDark] = useState(false);
 
  useEffect(() => {
    setHydrated(true);
    const saved = localStorage.getItem('payrollos-theme');
    setDark(saved === 'dark');
  }, []);
 
  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('payrollos-theme', dark ? 'dark' : 'light');
  }, [dark, hydrated]);
 
  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
    // SUPER_ADMIN has no employee record — redirect to admin
    // ADMIN and HR may have an employee record — allow ESS access
    if (user?.role === 'SUPER_ADMIN') router.replace('/dashboard');
  }, [hydrated, isAuthenticated, user?.role]);
 
  // Close mobile menu on route change
  useEffect(() => { setMobileMenu(false); }, [pathname]);
 
  if (!hydrated || !isAuthenticated) return null;
  if (user?.role === 'SUPER_ADMIN') return null;
 
  const name  = `${user?.firstName||''} ${user?.lastName||''}`.trim();
  const color = avColor(name);
 
  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    logout(); router.replace('/login');
  };
 
  const T = {
    sidebar:      dark ? '#111113' : '#1a1f2e',
    sidebarB:     dark ? '#1e1e20' : '#242938',
    border:       dark ? '#2a2a2c' : '#2e3447',
    headerBg:     dark ? 'rgba(10,10,12,.96)' : 'rgba(255,255,255,.95)',
    headerBorder: dark ? '#2a2a2c' : '#e5e5ea',
    bg:           dark ? '#0a0a0b' : '#f4f4f6',
    ink:          '#e8e8ed',
    ink2:         '#b0b0b8',
    ink3:         '#72727a',
    ink4:         '#44444c',
    hover:        'rgba(255,255,255,.06)',
    activeBg:     'rgba(10,132,255,.18)',
    activeText:   '#60aeff',
    contentInk:   dark ? '#f2f2f7' : '#1d1d1f',
    contentInk2:  dark ? '#aeaeb2' : '#48484a',
    contentBorder:dark ? '#3a3a3c' : '#e3e3e6',
  };
 
  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div style={{ padding:'14px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'center' }}>
        <div style={{ width:38,height:38,borderRadius:11,background:'linear-gradient(145deg,#0a84ff,#0055cc)',display:'grid',placeItems:'center',color:'#fff',fontWeight:800,fontSize:19 }}>P</div>
      </div>
 
      {/* Label */}
      <div style={{ padding:'10px 16px 6px' }}>
        <div style={{ fontSize:10, fontWeight:700, color:T.ink4, textTransform:'uppercase', letterSpacing:'.06em' }}>Employee Portal</div>
      </div>
 
      {/* Nav */}
      <nav style={{ flex:1, padding:'4px 8px', overflowY:'auto' }}>
        {NAV.map(({ href, label, icon:Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} style={{ textDecoration:'none' }}>
              <div style={{ display:'flex',alignItems:'center',gap:9,padding:'8px 10px',borderRadius:9,margin:'1px 0',cursor:'pointer',transition:'background .1s',background:active?T.activeBg:'transparent' }}
                onMouseEnter={e=>!active&&(e.currentTarget.style.background=T.hover)}
                onMouseLeave={e=>!active&&(e.currentTarget.style.background='transparent')}>
                <Icon size={16} strokeWidth={active?2.2:1.8} style={{ color:active?T.activeText:T.ink3,flexShrink:0 }} />
                <span style={{ fontSize:13.5,fontWeight:active?600:400,color:active?T.activeText:T.ink,flex:1 }}>{label}</span>
                {active && <div style={{ width:6,height:6,borderRadius:'50%',background:T.activeText,flexShrink:0 }} />}
              </div>
            </Link>
          );
        })}
 
        {user?.role !== 'EMPLOYEE' && (
          <Link href="/dashboard" style={{ textDecoration:'none' }}>
            <div style={{ display:'flex',alignItems:'center',gap:9,padding:'8px 10px',borderRadius:9,margin:'1px 0',cursor:'pointer' }}
              onMouseEnter={e=>(e.currentTarget.style.background=T.hover)}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <Building2 size={16} strokeWidth={1.8} style={{ color:T.ink3 }} />
              <span style={{ fontSize:13.5,color:T.ink2 }}>Admin panel</span>
              <ChevronRight size={13} style={{ color:T.ink4,marginLeft:'auto' }} />
            </div>
          </Link>
        )}
      </nav>
 
      {/* User profile */}
      <div style={{ borderTop:`1px solid ${T.border}`, padding:'8px 8px 12px' }}>
        <div style={{ position:'relative' }}>
          <button onClick={()=>setUserMenu(v=>!v)}
            style={{ display:'flex',alignItems:'center',gap:10,width:'100%',padding:'8px 10px',border:'none',background:'transparent',borderRadius:9,cursor:'pointer',fontFamily:'inherit',transition:'background .1s' }}
            onMouseEnter={e=>(e.currentTarget.style.background=T.hover)}
            onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
            <div style={{ width:38,height:38,borderRadius:'50%',background:color,display:'grid',placeItems:'center',color:'#fff',fontSize:13,fontWeight:700,flexShrink:0,overflow:'hidden',border:'2px solid rgba(255,255,255,.15)' }}>
              {user?.photoUrl ? <img src={user.photoUrl} alt="avatar" style={{ width:'100%',height:'100%',objectFit:'cover',display:'block' }} /> : initials(name)}
            </div>
            <div style={{ textAlign:'left',flex:1,minWidth:0 }}>
              <div style={{ fontSize:13,fontWeight:600,color:T.ink,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{name}</div>
              <div style={{ fontSize:11,color:T.ink3 }}>Employee</div>
            </div>
            <ChevronDown size={12} style={{ color:T.ink4 }} />
          </button>
 
          {userMenu && (
            <>
              <div style={{ position:'fixed',inset:0,zIndex:90 }} onClick={()=>setUserMenu(false)} />
              <div style={{ position:'absolute',bottom:'calc(100% + 6px)',left:0,right:0,background:dark?'#2c2c2e':'#fff',borderRadius:12,border:`1px solid ${T.border}`,boxShadow:'0 8px 24px rgba(0,0,0,.18)',padding:6,zIndex:100 }}>
                <Link href="/change-password" style={{ textDecoration:'none' }} onClick={()=>setUserMenu(false)}>
                  <div style={{ display:'flex',alignItems:'center',gap:9,padding:'9px 12px',fontSize:13.5,color:T.ink,borderRadius:8,cursor:'pointer' }}
                    onMouseEnter={e=>(e.currentTarget.style.background=T.hover)} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                    Change password
                  </div>
                </Link>
                <div style={{ height:1,background:T.border,margin:'4px 8px' }} />
                <button onClick={handleLogout}
                  style={{ display:'flex',alignItems:'center',gap:9,width:'100%',padding:'9px 12px',fontSize:13.5,color:'#d83933',background:'none',border:'none',borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontWeight:500 }}>
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
 
  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:T.bg, fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif' }}>
 
      {/* ── Desktop sidebar ─────────────────────────── */}
      <aside className="ess-sidebar" style={{ width:232, flexShrink:0, background:T.sidebar, borderRight:`1px solid ${T.border}`, display:'flex', flexDirection:'column', overflowY:'auto', overflowX:'hidden' }}>
        <SidebarContent />
      </aside>
 
      {/* ── Mobile sidebar overlay ──────────────────── */}
      {mobileMenu && (
        <>
          <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200 }} onClick={()=>setMobileMenu(false)} />
          <aside style={{ position:'fixed',top:0,left:0,bottom:0,width:260,background:T.sidebar,zIndex:201,display:'flex',flexDirection:'column',overflowY:'auto' }}>
            <div style={{ display:'flex',justifyContent:'flex-end',padding:'12px 12px 0' }}>
              <button onClick={()=>setMobileMenu(false)} style={{ background:'none',border:'none',cursor:'pointer',color:T.ink3,padding:6 }}>
                <X size={20} />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </>
      )}
 
      {/* ── Main area ──────────────────────────────── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
 
        {/* Header */}
        <header className="ess-header" style={{ height:52, background:T.headerBg, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderBottom:`1px solid ${T.headerBorder}`, display:'flex', alignItems:'center', padding:'0 20px', flexShrink:0, gap:12 }}>
          {/* Mobile menu button */}
          <button className="ess-sidebar" onClick={()=>setMobileMenu(true)}
            style={{ display:'none', background:'none', border:'none', cursor:'pointer', color:T.contentInk2, padding:4, marginRight:4 }}>
            <Menu size={20} />
          </button>
          {/* Show hamburger only on mobile via inline style override */}
          <button onClick={()=>setMobileMenu(true)}
            style={{ background:'none', border:'none', cursor:'pointer', color:T.contentInk2, padding:4 }}
            className="mobile-only">
            <Menu size={20} />
          </button>
 
          <span style={{ fontSize:14, fontWeight:500, color:T.contentInk2 }}>
            {NAV.find(n=>n.href===pathname)?.label || 'Employee Portal'}
          </span>
 
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
            <button onClick={()=>setDark(d=>!d)} title={dark?'Light mode':'Dark mode'}
              style={{ width:32,height:32,border:`1px solid ${T.headerBorder}`,background:dark?'rgba(255,255,255,.08)':'#fff',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:dark?'#f2f2f7':'#48484a',flexShrink:0 }}
              onMouseEnter={e=>(e.currentTarget.style.background=dark?'rgba(255,255,255,.15)':'#f0f0f3')}
              onMouseLeave={e=>(e.currentTarget.style.background=dark?'rgba(255,255,255,.08)':'#fff')}>
              {dark ? <Sun size={15} strokeWidth={2} /> : <Moon size={15} strokeWidth={2} />}
            </button>
            <button style={{ width:32,height:32,border:`1px solid ${T.headerBorder}`,background:dark?'rgba(255,255,255,.08)':'#fff',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:dark?'#f2f2f7':'#6e6e73' }}>
              <Bell size={15} strokeWidth={2} />
            </button>
          </div>
        </header>
 
        {/* Page content */}
        <div style={{ flex:1, overflowY:'auto' }}>
          <div className="ess-content" style={{ padding:'24px 28px 80px' }}>
            {children}
          </div>
        </div>
      </div>
 
      {/* ── Bottom tab nav (mobile only) ─────────────── */}
      <nav className="ess-bottom-nav" style={{
        position:'fixed', bottom:0, left:0, right:0,
        background:T.sidebar, borderTop:`1px solid ${T.border}`,
        display:'none', justifyContent:'space-around', alignItems:'center',
        height:60, zIndex:100, paddingBottom:'env(safe-area-inset-bottom)',
      }}>
        {BOTTOM_NAV.map(({ href, label, icon:Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} style={{ textDecoration:'none', flex:1 }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'8px 4px', cursor:'pointer' }}>
                <Icon size={22} strokeWidth={active?2.2:1.6} style={{ color:active?T.activeText:T.ink3 }} />
                <span style={{ fontSize:10, fontWeight:active?600:400, color:active?T.activeText:T.ink3 }}>{label}</span>
              </div>
            </Link>
          );
        })}
        {/* More button */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'8px 4px', cursor:'pointer' }}
          onClick={()=>setMobileMenu(true)}>
          <Menu size={22} strokeWidth={1.6} style={{ color:T.ink3 }} />
          <span style={{ fontSize:10, color:T.ink3 }}>More</span>
        </div>
      </nav>
    </div>
  );
}