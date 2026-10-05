'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import Cookies from 'js-cookie';
import api from '@/lib/axios';
import BrandLoader from '@/components/BrandLoader';
import {
    LogOut, LayoutDashboard, Building2, Zap,
    ChevronLeft, ChevronRight, Settings,
    Menu, ChevronDown, Activity,
    ShieldCheck, Layers, Globe, BarChart3, ShieldAlert, X
} from 'lucide-react';

export default function DashboardLayout({ children }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, token, login, logout } = useAuthStore();

    const [isMounted, setIsMounted] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [openSubmenu, setOpenSubmenu] = useState(null);

    const profileRef = useRef(null);
    const dashboardHref = user?.role === 'SUPER_ADMIN' ? '/super-admin/dashboard' : '/company/dashboard';

    // Normalizes trailing slashes on both sides before comparing, since the static
    // export (trailingSlash: true) can produce pathnames like "/locations/". Declared
    // this early (before the effects/early-return below) because the menu-highlight
    // effect closes over it on every mount, including the first render where isMounted
    // is still false - if it were declared after that early return, this render's
    // closure would capture an uninitialized binding and throw a TDZ error the moment
    // the effect actually calls it.
    const isPathActive = (href) => {
        const normalize = (p) => (p.length > 1 ? p.replace(/\/$/, '') : p);
        const cleanHref = normalize(href);
        const cleanPathname = normalize(pathname);
        return cleanPathname === cleanHref || cleanPathname.startsWith(cleanHref + '/');
    };

    // ----------------------------------------------------------------------
    // 1. NAVIGATION DECLARATION DECK
    // ----------------------------------------------------------------------
    const MENU_ITEMS = [
        {
            label: 'Dashboard',
            icon: LayoutDashboard,
            href: dashboardHref,
            roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'STAFF']
        },
        {
            label: 'Platform Admin',
            icon: Building2,
            roles: ['SUPER_ADMIN'],
            submenu: [
                { label: 'Operators Index', href: '/super-admin/companies' },
                { label: 'Platform Users', href: '/super-admin/users' },
                { label: 'Approvals Queue', href: '/super-admin/approvals' },
                { label: 'System Alerts', href: '/maintenance' }
            ]
        },
        {
            label: 'Infrastructure',
            icon: Zap,
            roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'STAFF'],
            submenu: [
                { label: 'Locations', href: '/locations' },
                { label: 'Charge Points', href: '/charge-points' },
                { label: 'Connectors', href: '/connectors' }
            ]
        },
        {
            label: 'Operations',
            icon: Activity,
            roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'STAFF'],
            submenu: [
                { label: 'Live Sessions', href: '/sessions/live' }
            ]
        },
        {
            label: 'Commercials',
            icon: Layers,
            roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'],
            submenu: [
                { label: 'Tariff Plans', href: '/tariffs' },
                { label: 'Transactions', href: '/transactions' }
            ]
        },
        {
            label: 'Open Data API',
            icon: Globe,
            roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'],
            submenu: [
                { label: 'Data Preview', href: '/open-data/preview' },
                { label: 'API Keys', href: '/open-data/keys' },
                { label: 'Traffic Analytics', href: '/super-admin/traffic-analytics' },
                { label: 'Request Audit Logs', href: '/super-admin/request-logs' }
            ]
        },
        {
            label: 'Analytics',
            icon: BarChart3,
            href: '/analytics',
            roles: ['SUPER_ADMIN', 'COMPANY_ADMIN']
        },
        {
            label: 'Audit Logs',
            icon: ShieldAlert,
            href: '/audit',
            roles: ['SUPER_ADMIN']
        },
        {
            label: 'Company Settings',
            icon: Building2,
            href: '/company/settings',
            roles: ['COMPANY_ADMIN']
        },
        {
            label: 'Profile Settings',
            icon: Settings,
            href: '/settings',
            roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'STAFF']
        },
    ];

    const authorizedMenu = MENU_ITEMS.filter(item => item.roles.includes(user?.role));

    // ----------------------------------------------------------------------
    // 2. STATE LIFECYCLE & MUTATION HOOKS
    // ----------------------------------------------------------------------
    useEffect(() => {
        setIsMobileOpen(false);

        authorizedMenu.forEach(item => {
            if (item.submenu) {
                const hasActiveChild = item.submenu.some(sub => isPathActive(sub.href));
                if (hasActiveChild) {
                    setOpenSubmenu(item.label);
                }
            }
        });
    }, [pathname, user]);

    useEffect(() => {
        const syncUserProfile = async () => {
            if (!token) return;
            try {
                const response = await api.get('/users/profile');
                if (response.data.success) {
                    const currentToken = Cookies.get('token') || token;
                    login(response.data.data, currentToken);
                }
            } catch (error) {
                console.error("Layout context failed to sync database attributes:", error);
            }
        };

        setIsMounted(true);
        if (!token) {
            router.push('/login');
        } else {
            syncUserProfile();
        }
    }, [token, router, login]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getSeoMetadata = () => {
        const routeTitles = {
            'dashboard': 'Dashboard',
            'companies': 'Operators',
            'users': 'Users',
            'locations': 'Locations',
            'enrich': 'Edit location',
            'charge-points': 'Charge points',
            'connectors': 'Connectors',
            'live': 'Live sessions',
            'tariffs': 'Tariffs',
            'transactions': 'Transactions',
            'keys': 'API keys',
            'preview': 'Data preview',
            'traffic-analytics': 'Traffic',
            'request-logs': 'Request logs',
            'settings': 'Settings',
            'approvals': 'Approvals',
            'maintenance': 'System alerts',
            'audit': 'Audit log',
            'analytics': 'Analytics'
        };

        const activeSlug = pathname.split('/').filter(Boolean).pop() || 'dashboard';
        const rawTitle = routeTitles[activeSlug] || activeSlug.replace(/-/g, ' ');

        if (typeof window !== 'undefined') {
            document.title = `${rawTitle} · EV Data Hub`;
        }

        return rawTitle;
    };

    if (!isMounted || !token) {
        return <BrandLoader fullscreen size="lg" label="Opening your workspace" sublabel="Checking your session and operator access." />;
    }

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    const handleSubmenuToggle = (label) => {
        if (isCollapsed) setIsCollapsed(false);
        setOpenSubmenu(openSubmenu === label ? null : label);
    };

    const getUserInitials = () => {
        if (user?.name) {
            return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        }
        return user?.email ? user.email.charAt(0).toUpperCase() : 'U';
    };

    const pageDisplayTitle = getSeoMetadata();

    return (
        <div className="workspace flex h-screen bg-[#F4F6F8] overflow-hidden font-sans text-slate-900 relative">

            {isMobileOpen && (
                <div
                    onClick={() => setIsMobileOpen(false)}
                    className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
                />
            )}

            <aside className={`
                bg-[#0c1222] text-slate-300 flex flex-col fixed inset-y-0 left-0 lg:static z-50 transition-all duration-300 ease-in-out border-r border-white/5
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                ${isCollapsed ? 'lg:w-[4.75rem]' : 'lg:w-64'} w-64
            `}>
                <button
                    onClick={() => setIsMobileOpen(false)}
                    className="absolute right-4 top-5 p-2 bg-slate-800 text-slate-400 rounded-xl hover:text-white lg:hidden cursor-pointer"
                >
                    <X size={16} />
                </button>

                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3.5 top-6 bg-slate-900 text-white rounded-full p-1.5 shadow-lg border border-slate-800 hover:bg-slate-800 transition-all z-50 hidden lg:block cursor-pointer"
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                <Link prefetch={false}
                    href={dashboardHref}
                    className="h-16 flex items-center border-b border-white/5 shrink-0 px-4 justify-between transition-colors cursor-pointer group"
                >
                    <div className="flex items-center gap-3 w-full">
                        <div className="h-9 w-9 bg-[#F5A524] rounded-xl text-slate-950 flex items-center justify-center shrink-0">
                            <Zap size={16} strokeWidth={2.5} />
                        </div>
                        {(!isCollapsed || isMobileOpen) && (
                            <span className="text-sm font-semibold tracking-tight text-white">
                                EV Data Hub
                            </span>
                        )}
                    </div>
                </Link>

                <div className="flex-1 overflow-y-auto py-4 px-2.5">
                    <nav className="space-y-1">
                        {authorizedMenu.map((item) => {
                            const Icon = item.icon;

                            const isActiveLink = !item.submenu && item.href && isPathActive(item.href);

                            const isSubmenuActive = item.submenu && item.submenu.some(sub => isPathActive(sub.href));

                            const isExpanded = openSubmenu === item.label;

                            return (
                                <div key={item.label} className="relative group flex flex-col">
                                    {item.submenu ? (
                                        <>
                                            <button
                                                onClick={() => handleSubmenuToggle(item.label)}
                                                title={(isCollapsed && !isMobileOpen) ? item.label : undefined}
                                                className={`flex cursor-pointer items-center justify-between w-full rounded-xl px-3 py-2.5 transition-all text-left ${isSubmenuActive
                                                        ? 'bg-white/8 text-white'
                                                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                                    }`}
                                            >
                                                <div className={`flex items-center ${(isCollapsed && !isMobileOpen) ? 'justify-center w-full' : 'gap-3'}`}>
                                                    <Icon size={16} className={isSubmenuActive ? 'text-[#F5A524]' : 'text-slate-400'} />
                                                    {(!isCollapsed || isMobileOpen) && <span className="text-[13px] font-medium">{item.label}</span>}
                                                </div>
                                                {(!isCollapsed || isMobileOpen) && (
                                                    <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                                )}
                                            </button>

                                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-72 mt-1 opacity-100' : 'max-h-0 opacity-0'}`}>
                                                <div className="pl-3 pr-1 py-1 space-y-0.5 border-l border-white/10 ml-5">
                                                    {item.submenu.map((sub) => {
                                                        const isSubActive = isPathActive(sub.href);

                                                        return (
                                                            <Link prefetch={false}
                                                                key={sub.label}
                                                                href={sub.href}
                                                                className={`block py-2 px-3 rounded-lg text-[13px] transition-all ${isSubActive
                                                                        ? 'bg-[#F5A524] text-slate-950 font-semibold'
                                                                        : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center">
                                                                    <span className={`w-1.5 h-1.5 rounded-full mr-2.5 shrink-0 ${isSubActive ? 'bg-slate-950' : 'bg-slate-600'}`}></span>
                                                                    {sub.label}
                                                                </div>
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <Link prefetch={false}
                                            href={item.href}
                                            title={(isCollapsed && !isMobileOpen) ? item.label : undefined}
                                            className={`flex items-center rounded-xl px-3 py-2.5 transition-all ${isActiveLink
                                                    ? 'bg-[#F5A524] text-slate-950 font-semibold'
                                                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                                } ${(isCollapsed && !isMobileOpen) ? 'justify-center' : 'gap-3'}`}
                                        >
                                            <Icon size={16} className={isActiveLink ? 'text-slate-950' : 'text-slate-400'} />
                                            {(!isCollapsed || isMobileOpen) && <span className="text-[13px] font-medium">{item.label}</span>}
                                        </Link>
                                    )}
                                </div>
                            );
                        })}
                    </nav>
                </div>

                {(!isCollapsed || isMobileOpen) && (
                    <div className="p-3 mx-2.5 mb-4 rounded-2xl bg-white/5 border border-white/8 flex items-center gap-3">
                        <div className="h-8 w-8 bg-[#F5A524]/15 text-[#F5A524] rounded-lg flex items-center justify-center">
                            <ShieldCheck size={15} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] text-slate-500">Signed in as</p>
                            <p className="text-xs font-medium text-white truncate">{user?.role?.replaceAll('_', ' ')}</p>
                        </div>
                    </div>
                )}
            </aside>

            <div className="flex-1 flex flex-col min-w-0 bg-[#F4F6F8]">
                <header className="h-16 bg-white/90 border-b border-slate-200/80 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 z-20">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={() => setIsMobileOpen(true)}
                            className="lg:hidden text-slate-500 hover:text-slate-800 transition-colors cursor-pointer p-2 hover:bg-slate-100 rounded-xl"
                            aria-label="Open menu"
                        >
                            <Menu size={18} />
                        </button>
                        <p className="text-sm font-medium text-slate-500 truncate">{pageDisplayTitle}</p>
                    </div>

                    <div className="flex items-center">

                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center space-x-3 hover:bg-slate-50 p-1.5 rounded-full transition-all border border-transparent hover:border-slate-200 cursor-pointer"
                            >
                                {user?.avatarUrl ? (
                                    <div className="h-8 w-8 rounded-full overflow-hidden border border-slate-200 shadow-xs shrink-0">
                                        <img src={user.avatarUrl} alt="User Avatar" className="h-full w-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black tracking-wider shadow-xs shrink-0">
                                        {getUserInitials()}
                                    </div>
                                )}
                                <div className="flex-col items-start hidden sm:flex">
                                    <span className="text-sm font-medium text-slate-800 leading-none truncate max-w-[140px]">{user?.name || user?.email?.split('@')[0]}</span>
                                    <span className="text-[11px] text-slate-400 mt-1">{user?.role?.replaceAll('_', ' ')}</span>
                                </div>
                                <ChevronDown size={12} className="text-slate-400 ml-0.5 hidden sm:block" />
                            </button>

                            {isProfileOpen && (
                                <div className="absolute right-0 mt-3 w-60 bg-white rounded-2xl shadow-2xl border border-slate-200 py-1.5 origin-top-right animate-in fade-in zoom-in-95 duration-100">
                                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 rounded-t-xl mb-1">
                                        <p className="text-xs font-black text-slate-900 truncate">{user?.name || 'Network Operator'}</p>
                                        <p className="text-[11px] font-semibold text-slate-400 truncate mt-0.5">{user?.email}</p>
                                    </div>
                                    <Link prefetch={false} href="/settings" onClick={() => setIsProfileOpen(false)} className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition-colors">
                                        <Settings size={14} className="text-slate-400" />
                                        <span>Account settings</span>
                                    </Link>
                                    <div className="h-px bg-slate-100 my-1"></div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                                    >
                                        <LogOut size={14} />
                                        <span>Sign out</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                    <div className={pathname.replace(/\/$/, '').endsWith('/tariffs') ? 'w-full' : 'max-w-7xl mx-auto'}>
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}