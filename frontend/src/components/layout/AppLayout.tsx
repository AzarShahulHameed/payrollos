'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, BarChart3, Users, CreditCard, FileText,
  Calendar, Banknote, Wallet, ClipboardList, Settings, HelpCircle,
  Bell, Search, LogOut, ChevronDown, ChevronRight, Clock, Receipt,
  Scale, Award, UserMinus, ClipboardCheck, TrendingUp, Sun, Moon,
  Building2, UserCog, LifeBuoy, FolderOpen, GitBranch, Landmark
} from 'lucide-react';
import { useAuthStore, useRegionStore } from '@/store/auth.store';
import { authApi, api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 
// ── Nav structure ──────────────────────────────────────────────
const NAV: {
  id: string;
  label: string;
  icon: any;
  href?: string;
  children?: { href: string; label: string; icon: any }[];
}[] = [
  { id:'dashboard', label:'Dashboard', icon: LayoutDashboard, href:'/dashboard' },
  { id:'analytics', label:'Analytics',  icon: BarChart3,       href:'/analytics'  },
  {
    id:'payroll', label:'Payroll', icon: CreditCard,
    children: [
      { href:'/employees', label:'Employees', icon: Users     },
      { href:'/payrun',    label:'Pay run',   icon: CreditCard },
      { href:'/bonus',     label:'Bonuses',   icon: Award      },
      { href:'/payslips',  label:'Payslips',  icon: FileText   },
    ],
  },
  {
    id:'hr', label:'HR & Leaves', icon: Calendar,
    children: [
      { href:'/attendance',     label:'Attendance',     icon: Clock    },
      { href:'/leaves',         label:'Leaves',         icon: Calendar },
      { href:'/org-chart',      label:'Organisation',   icon: Users    },
      { href:'/loans',          label:'Loans',          icon: Banknote },
      { href:'/advances',       label:'Advances',       icon: Wallet   },
      { href:'/reimbursements', label:'Reimbursements', icon: Receipt    },
      { href:'/documents',    label:'Documents',     icon: FolderOpen },
    ],
  },
  {
    id:'compliance', label:'Compliance', icon: Scale,
    children: [
      { href:'/statutory', label:'Statutory',  icon: Scale },
      { href:'/gratuity',  label:'Gratuity',   icon: Award },
    ],
  },
  {
    id:'reports', label:'Reports', icon: ClipboardList,
    children: [
      { href:'/reports',   label:'All reports', icon: ClipboardList  },
      { href:'/fnf',       label:'FnF',         icon: UserMinus      },
      { href:'/arrears',   label:'Arrears',     icon: TrendingUp     },
      { href:'/audit-log', label:'Audit log',   icon: ClipboardCheck },
    ],
  },
  { id:'settings', label:'Settings', icon: Settings, href:'/settings/organization' },
  { id:'support',  label:'Support',  icon: LifeBuoy, href:'/support' },
];
 
const AV = ['#0a84ff','#28a745','#ff9500','#af52de','#ff375f','#30b0c7'];
const avColor  = (n?: string) => AV[(n?.charCodeAt(0)||0) % AV.length];
const initials = (name?: string) => name?.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase() || 'U';
const MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 
// ── Global Cmd+K search ────────────────────────────────────────
function GlobalSearch() {
  const [open, setOpen]   = useState(false);
  const [q, setQ]         = useState('');
  const router            = useRouter();
  const inputRef          = useRef<HTMLInputElement>(null);
 
  const { data: results } = useQuery({
    queryKey: ['global-search', q],
    queryFn:  () => api.get('/search', { params: { q } }).then(r => r.data),
    enabled:  q.length >= 2,
    staleTime: 5000,
  });
 
  const openSearch  = useCallback(() => { setOpen(true);  setTimeout(() => inputRef.current?.focus(), 10); }, []);
  const closeSearch = useCallback(() => { setOpen(false); setQ(''); }, []);
 
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
      if (e.key === 'Escape' && open) closeSearch();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, openSearch, closeSearch]);
 
  const go = (href: string) => { closeSearch(); router.push(href); };
  const emps    = (results as any)?.employees || [];
  const slips   = (results as any)?.payslips  || [];
  const payruns = (results as any)?.payruns   || [];
 
  return (
    <>
      <div role="button" tabIndex={0} onClick={openSearch} onKeyDown={e => e.key==='Enter' && openSearch()}
        style={{ position:'relative', flex:1, maxWidth:340, cursor:'text', userSelect:'none' }}>
        <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#a1a1a6', pointerEvents:'none' }} />
        <div style={{ width:'100%', height:32, padding:'0 36px 0 32px', fontSize:13, fontFamily:'inherit', background:'rgba(0,0,0,.06)', borderRadius:8, color:'#a1a1a6', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span>Search employees, payslips…</span>
          <kbd style={{ fontSize:10, background:'rgba(0,0,0,.08)', padding:'2px 6px', borderRadius:4, fontFamily:'inherit' }}>⌘K</kbd>
        </div>
      </div>
 
      {open && (
        <div style={{ position:'fixed', inset:0, zIndex:9999 }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.45)', backdropFilter:'blur(4px)' }} onClick={closeSearch} />
          <div style={{ position:'absolute', top:72, left:'50%', transform:'translateX(-50%)', width:560, maxWidth:'calc(100vw - 32px)', maxHeight:'70vh', background:'#fff', borderRadius:16, boxShadow:'0 24px 64px rgba(0,0,0,.3)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px', borderBottom:'1px solid #f0f0f5' }}>
              <Search size={16} color="#a1a1a6" style={{ flexShrink:0 }} />
              <input ref={inputRef} autoFocus style={{ flex:1, fontSize:16, border:'none', outline:'none', fontFamily:'inherit', color:'#1d1d1f', background:'transparent' }}
                placeholder="Search employees, payslips, payruns…" value={q} onChange={e => setQ(e.target.value)} />
              <button onClick={closeSearch} style={{ background:'rgba(0,0,0,.07)', border:'none', borderRadius:6, padding:'3px 8px', fontSize:11.5, cursor:'pointer', fontFamily:'inherit', color:'#6e6e73' }}>Esc</button>
            </div>
            <div style={{ overflowY:'auto', flex:1 }}>
              {q.length < 2 && <div style={{ padding:'28px 20px', color:'#a1a1a6', fontSize:13.5, textAlign:'center' }}><div style={{ fontSize:28, marginBottom:10 }}>🔍</div>Type at least 2 characters</div>}
              {q.length >= 2 && emps.length===0 && slips.length===0 && payruns.length===0 && <div style={{ padding:'28px 20px', color:'#a1a1a6', fontSize:13.5, textAlign:'center' }}>No results for <strong>"{q}"</strong></div>}
              {[
                { title:'Employees', rows:emps,    render:(e:any) => <><div style={{ width:32,height:32,borderRadius:'50%',background:'#0a84ff',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:11,fontWeight:700,flexShrink:0 }}>{initials(`${e.firstName} ${e.lastName}`)}</div><div><div style={{ fontWeight:600,fontSize:14,color:'#1d1d1f' }}>{e.firstName} {e.lastName}</div><div style={{ fontSize:12,color:'#6e6e73' }}>{e.employeeCode} · {e.designation}</div></div></>, href:'/employees' },
                { title:'Payslips',  rows:slips,   render:(s:any) => <><div style={{ fontWeight:600,fontSize:14,color:'#1d1d1f' }}>{s.employee?.firstName} {s.employee?.lastName}<span style={{ fontSize:12,color:'#6e6e73',fontWeight:400,marginLeft:8 }}>{MONTHS_S[(s.payrun?.month||1)-1]} {s.payrun?.year}</span></div></>, href:'/payslips' },
                { title:'Payruns',   rows:payruns, render:(p:any) => <><div style={{ fontWeight:600,fontSize:14,color:'#1d1d1f' }}>{p.name}</div><span style={{ background:p.status==='PAID'?'#e7f6ea':'#f2f2f7',color:p.status==='PAID'?'#28a745':'#6e6e73',fontSize:11.5,fontWeight:600,padding:'2px 8px',borderRadius:999,marginLeft:8 }}>{p.status}</span></>, href:'/payrun' },
              ].map(({ title, rows, render, href }) => rows.length > 0 && (
                <div key={title}>
                  <div style={{ padding:'10px 16px 4px', fontSize:11, fontWeight:700, color:'#a1a1a6', textTransform:'uppercase', letterSpacing:'.05em' }}>{title}</div>
                  {rows.map((r:any) => (
                    <div key={r.id} onClick={() => go(href)} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', cursor:'pointer' }}
                      onMouseEnter={el=>(el.currentTarget.style.background='#f7f9fc')} onMouseLeave={el=>(el.currentTarget.style.background='')}>
                      {render(r)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
 
// ── Notification bell ──────────────────────────────────────────
function NotificationBell() {
  const [open, setOpen]   = useState(false);
  const [toasts, setToasts] = useState<any[]>([]);
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const socketRef = useRef<any>(null);
 
  const { data: notifs = [] } = useQuery({ queryKey:['notifications'], queryFn:()=>api.get('/notifications').then(r=>r.data), refetchInterval:30000 });
  const { data: unreadData }  = useQuery({ queryKey:['notif-count'],   queryFn:()=>api.get('/notifications/unread').then(r=>r.data), refetchInterval:15000 });
  const readAllMut = useMutation({ mutationFn:()=>api.patch('/notifications/read-all').then(r=>r.data), onSuccess:()=>{ qc.invalidateQueries({queryKey:['notifications']}); qc.invalidateQueries({queryKey:['notif-count']}); } });
  const unread = (unreadData as any)?.count || 0;
  const router = useRouter();
 
  const showToast = useCallback((notif: any) => {
    const id = Date.now();
    setToasts(p => [...p, { ...notif, toastId: id }]);
    setTimeout(() => setToasts(p => p.filter(t => t.toastId !== id)), 5000);
  }, []);
 
  // WebSocket connection
  useEffect(() => {
    if (!user) return;
    const token = JSON.parse(localStorage.getItem('payrollos-auth')||'{}')?.state?.accessToken;
    if (!token) return;
 
    import('socket.io-client').then(({ io }) => {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1').replace('/api/v1', '');
      const socket = io(apiUrl + '/notifications', {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 2000,
      });
 
      socket.on('connect', () => console.log('[WS] Connected'));
      socket.on('notification', (notif: any) => {
        // Show toast popup
        showToast(notif);
        // Refresh notification list and count
        qc.invalidateQueries({ queryKey: ['notifications'] });
        qc.invalidateQueries({ queryKey: ['notif-count'] });
      });
      socket.on('disconnect', () => console.log('[WS] Disconnected'));
 
      socketRef.current = socket;
    }).catch(() => {});
 
    return () => { socketRef.current?.disconnect(); };
  }, [user]);
 
  const TOAST_COLORS: Record<string,string> = { SUCCESS:'#28a745', INFO:'#0a84ff', ACTION:'#ff9500', WARNING:'#d83933' };
 
  return (
    <>
      {/* Toast popups — appear top-right */}
      <div style={{ position:'fixed', top:16, right:16, zIndex:9999, display:'flex', flexDirection:'column', gap:10, maxWidth:360, pointerEvents:'none' }}>
        {toasts.map((t:any) => (
          <div key={t.toastId}
            style={{ background:'#fff', border:'1px solid #e3e3e6', borderLeft:`4px solid ${TOAST_COLORS[t.type]||'#0a84ff'}`, borderRadius:12, padding:'14px 16px', boxShadow:'0 8px 32px rgba(0,0,0,.15)', pointerEvents:'all', cursor:t.link?'pointer':'default', animation:'slideIn .25s ease' }}
            onClick={()=>{ if(t.link) router.push(t.link); setToasts(p=>p.filter(x=>x.toastId!==t.toastId)); }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:TOAST_COLORS[t.type]||'#0a84ff', marginTop:5, flexShrink:0 }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13.5, fontWeight:700, color:'#1d1d1f', marginBottom:2 }}>{t.title}</div>
                {t.message && <div style={{ fontSize:12.5, color:'#6e6e73', lineHeight:1.4 }}>{t.message}</div>}
              </div>
              <button onClick={e=>{ e.stopPropagation(); setToasts(p=>p.filter(x=>x.toastId!==t.toastId)); }}
                style={{ background:'none', border:'none', cursor:'pointer', color:'#a1a1a6', fontSize:16, padding:0, flexShrink:0 }}>×</button>
            </div>
          </div>
        ))}
      </div>
 
    <div style={{ position:'relative' }}>
      <button onClick={() => setOpen(v=>!v)}
        style={{ width:34,height:34,border:'none',background:'transparent',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#6e6e73',position:'relative',transition:'background .1s' }}
        onMouseEnter={e=>(e.currentTarget.style.background='rgba(0,0,0,.06)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
        <Bell size={17} />
        {unread > 0 && <span style={{ position:'absolute',top:4,right:4,width:15,height:15,borderRadius:'50%',background:'#d83933',color:'#fff',fontSize:8,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid rgba(244,244,246,.9)' }}>{unread>9?'9+':unread}</span>}
      </button>
      {open && (
        <>
          <div style={{ position:'fixed',inset:0,zIndex:90 }} onClick={()=>setOpen(false)} />
          <div style={{ position:'absolute',right:0,top:'calc(100% + 8px)',width:340,background:'#fff',borderRadius:14,boxShadow:'0 8px 32px rgba(0,0,0,.15)',border:'1px solid #e3e3e6',zIndex:100,overflow:'hidden' }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',borderBottom:'1px solid #e3e3e6' }}>
              <span style={{ fontWeight:700,fontSize:15 }}>Notifications {unread>0&&<span style={{ background:'#d83933',color:'#fff',fontSize:11,fontWeight:700,padding:'1px 7px',borderRadius:999,marginLeft:6 }}>{unread}</span>}</span>
              {unread>0&&<button onClick={()=>readAllMut.mutate()} style={{ fontSize:12,color:'#0a84ff',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',fontWeight:500 }}>Mark all read</button>}
            </div>
            <div style={{ maxHeight:340,overflowY:'auto' }}>
              {(notifs as any[]).length===0
                ? <div style={{ padding:'32px 20px',textAlign:'center',color:'#a1a1a6',fontSize:13.5 }}><div style={{ fontSize:32,marginBottom:10 }}>🔔</div>All caught up!</div>
                : (notifs as any[]).map((n:any)=>(
                  <div key={n.id} onClick={()=>{ router.push(n.link||'#'); setOpen(false); }}
                    style={{ display:'flex',gap:12,padding:'12px 16px',borderBottom:'1px solid #f5f5f7',background:n.readAt?'transparent':'#f0f6ff',cursor:'pointer' }}
                    onMouseEnter={e=>(e.currentTarget.style.background='#f7f9fc')} onMouseLeave={e=>(e.currentTarget.style.background=n.readAt?'transparent':'#f0f6ff')}>
                    <span style={{ fontSize:20,flexShrink:0 }}>{n.icon}</span>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:13.5,fontWeight:n.readAt?400:600,color:'#1d1d1f' }}>{n.title}</div>
                      {n.body&&<div style={{ fontSize:12,color:'#6e6e73',marginTop:2 }}>{n.body}</div>}
                    </div>
                    {!n.readAt&&<div style={{ width:8,height:8,borderRadius:'50%',background:'#0a84ff',flexShrink:0,marginTop:4 }} />}
                  </div>
                ))
              }
            </div>
          </div>
        </>
      )}
    </div>
    </>
  );
}
 
// ── Main layout ────────────────────────────────────────────────
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { region, setRegion } = useRegionStore();
  const [hydrated,  setHydrated]  = useState(false);
  const [userMenu,  setUserMenu]  = useState(false);
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('payrollos-theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
 
  // Track which nav sections are expanded
  const defaultOpen = NAV.filter(n => n.children?.some(c => pathname.startsWith(c.href))).map(n => n.id);
  const [expanded, setExpanded] = useState<string[]>(defaultOpen.length ? defaultOpen : ['payroll']);
 
  const toggle = (id: string) => setExpanded(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
 
  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => { document.documentElement.setAttribute('data-theme', dark?'dark':'light'); localStorage.setItem('payrollos-theme', dark?'dark':'light'); }, [dark]);
  useEffect(() => { if (hydrated && !isAuthenticated) router.replace('/login'); }, [hydrated, isAuthenticated]);
 
  // Refresh user from DB on mount — ensures photoUrl and org changes persist across devices
  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;
    api.get('/auth/me').then(r => {
      const { updateUser } = useAuthStore.getState();
      updateUser(r.data);
    }).catch(() => {});
  }, [hydrated, isAuthenticated]);
  if (!hydrated || !isAuthenticated) return null;
 
  const userName = user?.name || `${user?.firstName||''} ${user?.lastName||''}`.trim();
  const color    = avColor(userName);
 
  // Theme tokens
  const T = {
    sidebar:     dark ? '#111113' : '#1a1f2e',
    sidebarB:    dark ? '#1e1e20' : '#242938',
    border:      dark ? '#2a2a2c' : '#2e3447',
    headerBg:    dark ? 'rgba(10,10,12,.96)' : 'rgba(255,255,255,.95)',
    headerBorder:dark ? '#2a2a2c' : '#e5e5ea',
    bg:          dark ? '#0a0a0b' : '#f4f4f6',
    // Sidebar always has dark background so text is always light
    ink:         '#e8e8ed',
    ink2:        '#b0b0b8',
    ink3:        '#72727a',
    ink4:        '#44444c',
    active:      '#0a84ff',
    activeBg:    'rgba(10,132,255,.25)',
    activeText:  '#5aadff',
    hover:       'rgba(255,255,255,.08)',
    // Page content colours (NOT sidebar) — switch with dark mode
    contentInk:  dark ? '#f2f2f7' : '#1d1d1f',
    contentInk2: dark ? '#aeaeb2' : '#48484a',
    contentBorder: dark ? '#3a3a3c' : '#e3e3e6',
  };
 
  const handleLogout = async () => { try { await authApi.logout(); } catch {} logout(); router.replace('/login'); };
 
  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:T.bg, fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif' }}>
 
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside style={{ width:232, flexShrink:0, background:T.sidebar, borderRight:`1px solid ${T.border}`, display:'flex', flexDirection:'column', overflowY:'auto', overflowX:'hidden' }}>
 
        {/* Brand header — logo only */}
        <div style={{ padding:'14px 14px 14px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'center' }}>
          <div style={{ width:38,height:38,borderRadius:11,background:'linear-gradient(145deg,#0a84ff,#0055cc)',display:'grid',placeItems:'center',color:'#fff',fontWeight:800,fontSize:19,boxShadow:'0 2px 8px rgba(10,132,255,.35)' }}>P</div>
        </div>
 
        {/* Nav */}
        <nav style={{ flex:1, padding:'4px 8px' }}>
          {NAV.map(item => {
            const isActive    = item.href ? pathname===item.href : item.children?.some(c=>pathname.startsWith(c.href));
            const isOpen      = expanded.includes(item.id);
            const hasChildren = !!item.children;
            const Icon        = item.icon;
 
            // ── Single link (no children) ─────────────────
            if (!hasChildren && item.href) {
              return (
                <Link key={item.id} href={item.href} style={{ textDecoration:'none' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:9,padding:'8px 10px',borderRadius:9,margin:'1px 0',cursor:'pointer',transition:'background .1s',background:isActive?T.activeBg:'transparent' }}
                    onMouseEnter={e=>!isActive&&(e.currentTarget.style.background=T.hover)}
                    onMouseLeave={e=>!isActive&&(e.currentTarget.style.background='transparent')}>
                    <Icon size={16} strokeWidth={isActive?2.2:1.8} style={{ color:isActive?T.activeText:T.ink3,flexShrink:0 }} />
                    <span style={{ fontSize:13.5,fontWeight:isActive?600:400,color:isActive?T.activeText:T.ink,flex:1 }}>{item.label}</span>
                    {isActive && <div style={{ width:6,height:6,borderRadius:'50%',background:T.activeText,flexShrink:0 }} />}
                  </div>
                </Link>
              );
            }
 
            // ── Section with children ──────────────────────
            return (
              <div key={item.id} style={{ marginBottom:2 }}>
                {/* Section header — clickable to expand */}
                <button onClick={()=>toggle(item.id)} style={{ display:'flex',alignItems:'center',gap:9,width:'100%',padding:'8px 10px',border:'none',background:'transparent',borderRadius:9,cursor:'pointer',fontFamily:'inherit',transition:'background .1s',margin:'1px 0' }}
                  onMouseEnter={e=>(e.currentTarget.style.background=T.hover)}
                  onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                  <Icon size={16} strokeWidth={isOpen||isActive?2.2:1.8} style={{ color:isActive?T.activeText:T.ink3,flexShrink:0 }} />
                  <span style={{ fontSize:13.5,fontWeight:isActive||isOpen?600:400,color:isActive?T.activeText:T.ink,flex:1,textAlign:'left' }}>{item.label}</span>
                  <span style={{ transition:'transform .2s', display:'flex', transform:isOpen?'rotate(90deg)':'rotate(0deg)' }}>
                    <ChevronRight size={13} style={{ color:T.ink4 }} />
                  </span>
                </button>
 
                {/* Children — animate open/close */}
                {isOpen && (
                  <div style={{ marginLeft:14, paddingLeft:12, borderLeft:`1.5px solid ${T.border}`, marginBottom:4 }}>
                    {item.children!.map(child => {
                      const childActive = pathname === child.href || (child.href !== '/dashboard' && pathname.startsWith(child.href));
                      const CIcon = child.icon;
                      return (
                        <Link key={child.href} href={child.href} style={{ textDecoration:'none' }}>
                          <div style={{ display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:8,margin:'1px 0',cursor:'pointer',transition:'background .1s',background:childActive?T.activeBg:'transparent' }}
                            onMouseEnter={e=>!childActive&&(e.currentTarget.style.background=T.hover)}
                            onMouseLeave={e=>!childActive&&(e.currentTarget.style.background='transparent')}>
                            <CIcon size={14} strokeWidth={childActive?2.2:1.8} style={{ color:childActive?T.activeText:T.ink3,flexShrink:0 }} />
                            <span style={{ fontSize:13,fontWeight:childActive?600:400,color:childActive?T.activeText:T.ink2,flex:1 }}>{child.label}</span>
                            {childActive && <div style={{ width:5,height:5,borderRadius:'50%',background:T.activeText }} />}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
 
        {/* Bottom actions */}
        <div style={{ borderTop:`1px solid ${T.border}`, padding:'8px 8px 12px' }}>
 
 
          {/* User profile */}
          <div style={{ position:'relative' }}>
            <button onClick={()=>setUserMenu(v=>!v)}
              style={{ display:'flex',alignItems:'center',gap:10,width:'100%',padding:'8px 10px',border:'none',background:'transparent',borderRadius:9,cursor:'pointer',fontFamily:'inherit',transition:'background .1s' }}
              onMouseEnter={e=>(e.currentTarget.style.background=T.hover)} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <div style={{ width:38,height:38,borderRadius:'50%',background:color,display:'grid',placeItems:'center',color:'#fff',fontSize:13,fontWeight:700,flexShrink:0,overflow:'hidden',border:'2px solid rgba(255,255,255,.15)' }}>
                {user?.photoUrl
                  ? <img src={user.photoUrl} alt="avatar" style={{ width:'100%',height:'100%',objectFit:'cover',display:'block' }} />
                  : initials(userName)
                }
              </div>
              <div style={{ textAlign:'left',flex:1,minWidth:0 }}>
                <div style={{ fontSize:13,fontWeight:600,color:T.ink,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{userName}</div>
                <div style={{ fontSize:11,color:T.ink3 }}>{user?.role?.replace(/_/g,' ')}</div>
              </div>
              <ChevronDown size={12} style={{ color:T.ink4 }} />
            </button>
 
            {userMenu && (
              <>
                <div style={{ position:'fixed',inset:0,zIndex:90 }} onClick={()=>setUserMenu(false)} />
                <div style={{ position:'absolute',bottom:'calc(100% + 6px)',left:0,right:0,background:dark?'#2c2c2e':'#fff',borderRadius:12,border:`1px solid ${T.border}`,boxShadow:'0 8px 24px rgba(0,0,0,.18)',padding:6,zIndex:100 }}>
                  {user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN' && (
                    <>
                      <Link href="/ess/dashboard" style={{ textDecoration:'none' }} onClick={()=>setUserMenu(false)}>
                        <div style={{ display:'flex',alignItems:'center',gap:9,padding:'9px 12px',fontSize:13.5,color:T.ink,borderRadius:8,cursor:'pointer' }}
                          onMouseEnter={e=>(e.currentTarget.style.background=T.hover)} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                          Employee portal
                        </div>
                      </Link>
                      <div style={{ height:1,background:T.border,margin:'4px 8px' }} />
                    </>
                  )}
                  {(user?.role === 'ADMIN' || user?.role === 'HR') && (
                    <Link href="/ess/dashboard" style={{ textDecoration:'none' }} onClick={()=>setUserMenu(false)}>
                      <div style={{ display:'flex',alignItems:'center',gap:9,padding:'9px 12px',fontSize:13.5,color:T.ink,borderRadius:8,cursor:'pointer' }}
                        onMouseEnter={e=>(e.currentTarget.style.background=T.hover)} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                        <span style={{ fontSize:12 }}>👤</span> My employee portal
                      </div>
                    </Link>
                  )}
                  <Link href="/change-password" style={{ textDecoration:'none' }} onClick={()=>setUserMenu(false)}>
                    <div style={{ display:'flex',alignItems:'center',gap:9,padding:'9px 12px',fontSize:13.5,color:T.ink,borderRadius:8,cursor:'pointer' }}
                      onMouseEnter={e=>(e.currentTarget.style.background=T.hover)} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                      Change password
                    </div>
                  </Link>
                  <div style={{ height:1,background:T.border,margin:'4px 8px' }} />
                  <button onClick={handleLogout} style={{ display:'flex',alignItems:'center',gap:9,width:'100%',padding:'9px 12px',fontSize:13.5,color:'#d83933',background:'none',border:'none',borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontWeight:500 }}>
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
 
      {/* ── Main area ──────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
 
        {/* Top header */}
        <header style={{ height:52,background:T.headerBg,backdropFilter:'saturate(180%) blur(20px)',borderBottom:`1px solid ${T.headerBorder}`,display:'flex',alignItems:'center',padding:'0 24px',gap:16,flexShrink:0,zIndex:10 }}>
          <GlobalSearch />
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
            <select value={region} onChange={e=>setRegion(e.target.value as 'UAE'|'INDIA')}
              style={{ height:32, padding:'0 10px', border:`1px solid ${T.headerBorder}`, borderRadius:8, fontSize:12.5, fontWeight:500, fontFamily:'inherit', background:dark?'rgba(255,255,255,.08)':'#fff', color:dark?'#f2f2f7':'#1d1d1f', cursor:'pointer', outline:'none' }}>
              <option value="UAE">UAE · AED</option>
              <option value="INDIA">India · INR</option>
            </select>
            <button onClick={()=>setDark(d=>!d)} title={dark?'Light mode':'Dark mode'}
              style={{ width:32,height:32,border:`1px solid ${T.headerBorder}`,background:dark?'rgba(255,255,255,.08)':'#fff',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:dark?'#f2f2f7':'#48484a',flexShrink:0 }}
              onMouseEnter={e=>(e.currentTarget.style.background=dark?'rgba(255,255,255,.15)':'#f0f0f3')}
              onMouseLeave={e=>(e.currentTarget.style.background=dark?'rgba(255,255,255,.08)':'#fff')}>
              {dark ? <Sun size={15} strokeWidth={2} /> : <Moon size={15} strokeWidth={2} />}
            </button>
            <NotificationBell />
          </div>
        </header>
 
        {/* Page content */}
        <main style={{ flex:1, overflowY:'auto', background:T.bg }}>
          <div style={{ padding:'28px 32px 64px', maxWidth:1200, color: dark ? '#f2f2f7' : '#1d1d1f' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
 