import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Bell, ChevronDown, Globe, KeyRound, LogOut, Menu, PanelLeftClose, PanelLeftOpen, UserRound, X, BellRing } from 'lucide-react';
import logoHorizontal from '../assets/logo-horizontal.png';
import logoMark from '../assets/logo-mark.png';
import { NAV } from './navigation';
import { useAuth } from '../context/AuthContext';
import { useGet, useSend } from '../hooks/useApi';
import { Avatar } from '../components/common/Display';
import { Drawer } from '../components/common/Overlay';
import { ago, empName } from '../utils/format';

function SidebarItem({ item, collapsed, can, counts, onNavigate }) {
  const { t } = useTranslation();
  const location = useLocation();
  const children = (item.children || []).filter((c) => !c.perm || can(c.perm));
  const activeGroup = children.some((c) => (c.end ? location.pathname === c.to : location.pathname.startsWith(c.to)));
  const [open, setOpen] = useState(activeGroup);
  useEffect(() => { if (activeGroup) setOpen(true); }, [activeGroup]);
  const Icon = item.icon;
  const base = 'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors';
  if (!item.children) {
    return (
      <NavLink to={item.to} end={item.end} onClick={onNavigate} title={collapsed ? t(`nav.${item.key}`) : undefined}
        className={({ isActive }) => clsx(base, isActive ? 'bg-white/15 font-medium text-white shadow-inner' : 'text-white/70 hover:bg-white/10 hover:text-white')}>
        <Icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span className="flex-1 truncate">{t(`nav.${item.key}`)}</span>}
        {!collapsed && item.badge && counts[item.badge] > 0 && <span className="rounded-full bg-white px-1.5 text-xs font-semibold text-brand-700">{counts[item.badge]}</span>}
      </NavLink>
    );
  }
  if (!children.length) return null;
  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} title={collapsed ? t(`nav.${item.key}`) : undefined}
        className={clsx(base, 'w-full', activeGroup ? 'text-white' : 'text-white/70 hover:bg-white/10 hover:text-white')}>
        <Icon className="h-5 w-5 shrink-0" />
        {!collapsed && <><span className="flex-1 truncate text-start">{t(`nav.${item.key}`)}</span><ChevronDown className={clsx('h-4 w-4 transition-transform', open && 'rotate-180')} /></>}
      </button>
      {open && !collapsed && (
        <div className="mt-0.5 space-y-0.5 border-s border-white/15 ms-5 ps-3">
          {children.map((c) => (
            <NavLink key={c.to} to={c.to} end={c.end} onClick={onNavigate}
              className={({ isActive }) => clsx('block rounded-lg px-3 py-1.5 text-[13px] transition-colors', isActive ? 'bg-white/15 font-medium text-white' : 'text-white/60 hover:text-white')}>
              {t(`nav.${c.key}`)}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationsDrawer({ open, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const q = useGet(['notifications', 'drawer'], open ? '/notifications' : null, { pageSize: 30 });
  const read = useSend('post', '/notifications/read', { invalidate: ['notifications', 'notif-count'], silent: true });
  return (
    <Drawer open={open} onClose={onClose} title={t('notifications.title')}>
      <div className="flex items-center justify-between border-b border-line px-5 py-2">
        <button type="button" className="text-xs text-brand-600 hover:underline" onClick={() => read.mutate({})}>{t('common.readAll')}</button>
        <button type="button" className="text-xs text-ink-muted hover:underline" onClick={() => { onClose(); navigate('/notifications'); }}>{t('notifications.preferences')}</button>
      </div>
      {!q.data?.items?.length && <p className="p-8 text-center text-sm text-ink-muted">{t('notifications.empty')}</p>}
      <ul className="divide-y divide-line">
        {q.data?.items?.map((n) => (
          <li key={n.id}>
            <button type="button" className={clsx('flex w-full gap-3 px-5 py-3 text-start hover:bg-canvas', !n.readAt && 'bg-brand-50/50')}
              onClick={() => { read.mutate({ ids: [n.id] }); if (n.link) { onClose(); navigate(n.link); } }}>
              <span className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.readAt ? 'bg-line' : 'bg-brand-600')} />
              <span className="min-w-0">
                <span className="block text-sm text-ink">{t(`notifications.types.${n.type}`, n.params || {})}</span>
                <span className="text-xs text-ink-muted">{ago(n.createdAt)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Drawer>
  );
}

export default function AppLayout() {
  const { t, i18n } = useTranslation();
  const { user, can, logout, changeLanguage } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('seeda.sidebar') === '1'; } catch { return false; } });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();
  const location = useLocation();
  const notif = useGet(['notif-count'], '/notifications', { pageSize: 1, unread: 'true' }, { refetchInterval: 60000 });
  const approvals = useGet(['approvals-count'], '/approvals/count', undefined, { refetchInterval: 60000 });
  const counts = { approvals: approvals.data?.pending || 0 };
  const items = useMemo(() => NAV.filter((n) => !n.perm || can(n.perm)), [can]);

  useEffect(() => setMobileOpen(false), [location.pathname]);
  useEffect(() => { try { localStorage.setItem('seeda.sidebar', collapsed ? '1' : '0'); } catch { /* ignore */ } }, [collapsed]);
  useEffect(() => {
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const sidebar = (mobile) => (
    <div className="flex h-full flex-col bg-gradient-to-b from-navy-700 via-navy-800 to-brand-900">
      <div className={clsx('flex h-16 shrink-0 items-center gap-2 px-4', collapsed && !mobile && 'justify-center px-2')}>
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/95 p-1"><img src={logoMark} alt="SEEDA" className="h-7 w-7 object-contain" /></div>
        {(!collapsed || mobile) && (
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-wide text-white">SEEDA HRMS</p>
            <p className="text-[11px] text-white/60">{i18n.language === 'ar' ? user?.company?.nameAr : user?.company?.nameEn}</p>
          </div>
        )}
        {mobile && <button type="button" className="ms-auto text-white/70" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>}
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {items.map((item) => <SidebarItem key={item.key} item={item} collapsed={collapsed && !mobile} can={can} counts={counts} onNavigate={() => mobile && setMobileOpen(false)} />)}
      </nav>
      {(!collapsed || mobile) && user?.company?.isDemo && <div className="mx-3 mb-3 rounded-xl bg-white/10 px-3 py-2 text-[11px] text-white/80">{t('app.demo')}</div>}
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className={clsx('no-print sticky top-0 hidden h-screen shrink-0 transition-[width] duration-200 lg:block', collapsed ? 'w-[76px]' : 'w-64')}>{sidebar(false)}</aside>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-navy-900/40 lg:hidden" onClick={() => setMobileOpen(false)}><aside className="h-full w-72" onClick={(e) => e.stopPropagation()}>{sidebar(true)}</aside></div>}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6">
          <button type="button" className="btn-ghost h-9 w-9 p-0 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="menu"><Menu className="h-5 w-5" /></button>
          <button type="button" className="btn-ghost hidden h-9 w-9 p-0 lg:inline-flex" onClick={() => setCollapsed((c) => !c)} aria-label="collapse">
            {collapsed ? <PanelLeftOpen className="h-5 w-5 rtl:-scale-x-100" /> : <PanelLeftClose className="h-5 w-5 rtl:-scale-x-100" />}
          </button>
          <img src={logoHorizontal} alt="SEEDA" className="h-7 lg:hidden" />
          <div className="flex-1" />
          <button type="button" className="btn-ghost h-9 gap-1.5 px-2.5 text-xs" onClick={() => changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')}>
            <Globe className="h-4 w-4" /><span className="hidden sm:inline">{t('common.switchLang')}</span>
          </button>
          <button type="button" className="btn-ghost relative h-9 w-9 p-0" onClick={() => setNotifOpen(true)} aria-label={t('nav.notifications')}>
            {notif.data?.unread ? <BellRing className="h-5 w-5 text-brand-600" /> : <Bell className="h-5 w-5" />}
            {notif.data?.unread > 0 && <span className="absolute -end-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">{notif.data.unread > 99 ? '99+' : notif.data.unread}</span>}
          </button>
          <div className="relative" ref={menuRef}>
            <button type="button" className="flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-canvas" onClick={() => setMenuOpen((o) => !o)}>
              <Avatar person={user?.employee || { fullNameEn: user?.displayName }} size={32} />
              <span className="hidden text-start leading-tight md:block">
                <span className="block text-sm font-medium text-ink">{user?.employee ? empName(user.employee) : user?.displayName}</span>
                <span className="block text-[11px] text-ink-muted">{user?.roles?.filter((r) => r !== 'EMPLOYEE')[0]?.replace(/_/g, ' ').toLowerCase() || user?.email}</span>
              </span>
              <ChevronDown className="hidden h-4 w-4 text-ink-muted md:block" />
            </button>
            {menuOpen && (
              <div className="absolute end-0 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-pop">
                <div className="border-b border-line px-4 py-2.5 text-xs text-ink-muted">{t('common.signedInAs')}<br /><span className="text-sm text-ink">{user?.email}</span></div>
                {user?.employee && <button type="button" className="flex w-full items-center gap-2 px-4 py-2 text-sm text-ink-soft hover:bg-canvas" onClick={() => { setMenuOpen(false); navigate(`/employees/${user.employee.id}`); }}><UserRound className="h-4 w-4" />{t('nav.profile')}</button>}
                <button type="button" className="flex w-full items-center gap-2 px-4 py-2 text-sm text-ink-soft hover:bg-canvas" onClick={() => { setMenuOpen(false); navigate('/account'); }}><KeyRound className="h-4 w-4" />{t('auth.changePassword')}</button>
                <button type="button" className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-canvas" onClick={async () => { await logout(); navigate('/login'); }}><LogOut className="h-4 w-4" />{t('nav.logout')}</button>
              </div>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
      <NotificationsDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
}
