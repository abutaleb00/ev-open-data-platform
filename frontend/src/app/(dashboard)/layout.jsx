'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import Cookies from 'js-cookie';
import api from '@/lib/axios';
import {
    LogOut, LayoutDashboard, Building2, Zap,
    ChevronLeft, ChevronRight, Settings,
    Menu, Bell, ChevronDown, Activity,
    ShieldCheck, Layers, Globe, BarChart3, ShieldAlert
} from 'lucide-react';

export default function DashboardLayout({ children }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, token, login, logout } = useAuthStore();

    const [isMounted, setIsMounted] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [openSubmenu, setOpenSubmenu] = useState('Infrastructure');

    const profileRef = useRef(null);

    // Dynamic dashboard link depending on active permission scope
    const dashboardHref = user?.role === 'SUPER_ADMIN' ? '/super-admin/dashboard' : '/company/dashboard';

    // --- AUTOMATIC PROFILE HYDRATION: Syncs fresh database state to topbar ---
    useEffect(() => {
        const syncUserProfile = async () => {
            if (!token) return;
            try {
                const response = await api.get('/users/profile');
                if (response.data.success) {
                    const currentToken = Cookies.get('token') || token;
                    // Hydrate the store globally with the live API dataset response
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

    // Close profile dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- SEO MAPPING LAYER: AUTOMATIC DOCUMENT HEADER INJECTION ---
    const getSeoMetadata = () => {
        const routeTitles = {
            'dashboard': 'Control Center Panel',
            'companies': 'Operator Networks Hub',
            'users': 'Account Authorizations',
            'locations': 'Site Station Coordinates',
            'charge-points': 'EVSE Charging Units',
            'connectors': 'Hardware Connector Plugs',
            'live': 'Live Infrastructure Telemetry',
            'tariffs': 'Commercial Tariff Plans',
            'keys': 'API Integration Tokens',
            'preview': 'Dataset Matrix Explorer',
            'settings': 'Personal Account Settings',
            'company-settings': 'Corporate Tenancy Partition Configs',
            'audit': 'Security Ledger Audit Trails'
        };

        const activeSlug = pathname.split('/').pop() || 'dashboard';
        const rawTitle = routeTitles[activeSlug] || activeSlug.replace('-', ' ');
        
        if (typeof window !== 'undefined') {
            document.title = `${rawTitle.toUpperCase()} | EV Data Hub`;
        }

        return rawTitle;
    };

    if (!isMounted || !token) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Initializing Security Layers...</div>;
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
                { label: 'API Keys', href: '/open-data/keys' }
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
    const pageDisplayTitle = getSeoMetadata();

    return (
        <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans text-slate-900 selection:bg-slate-900 selection:text-white">

            {/* SIDEBAR NAVIGATION UNIT */}
            <aside className={`bg-[#0F172A] text-slate-300 transition-all duration-300 ease-in-out flex flex-col relative z-30 shadow-xl ${isCollapsed ? 'w-20' : 'w-72'}`}>
                {/* Floating Collapse Control Button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3.5 top-6 bg-slate-900 text-white rounded-full p-1.5 shadow-lg border border-slate-800 hover:bg-slate-800 transition-all z-50 hidden md:block cursor-pointer"
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                {/* --- FIXED LOGO CONTAINER AREA: Fully Interactive Action Gateway Link --- */}
                <Link 
                    href={dashboardHref}
                    className="h-20 flex items-center border-b border-slate-800/60 shrink-0 px-6 justify-between hover:bg-slate-800/20 transition-colors cursor-pointer group"
                >
                    <div className="flex items-center space-x-3 w-full">
                        <div className="p-2 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl text-slate-950 shadow-sm shrink-0 transition-transform group-hover:scale-105">
                            <Zap size={18} strokeWidth={2.5} />
                        </div>
                        {!isCollapsed && <span className="text-xs font-black tracking-widest text-white transition-colors group-hover:text-amber-400">EV DATA HUB</span>}
                    </div>
                </Link>

                {/* Navigation Router Links Viewport */}
                <div className="flex-1 overflow-y-auto scrollbar-none py-6 px-3">
                    <nav className="space-y-1">
                        {authorizedMenu.map((item) => {
                            const Icon = item.icon;
                            const isActiveLink = !item.submenu && pathname === item.href;
                            const isSubmenuActive = item.submenu && item.submenu.some(sub => pathname.startsWith(sub.href));
                            const isExpanded = openSubmenu === item.label;

                            return (
                                <div key={item.label} className="relative group flex flex-col">
                                    {item.submenu ? (
                                        <button
                                            onClick={() => handleSubmenuToggle(item.label)}
                                            className={`flex cursor-pointer items-center justify-between w-full rounded-xl px-3 py-2.5 transition-all text-left ${isSubmenuActive ? 'bg-slate-800/80 text-white font-bold' : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'}`}
                                        >
                                            <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'space-x-3'}`}>
                                                <Icon size={16} className={isSubmenuActive ? 'text-amber-400' : 'text-slate-400'} />
                                                {!isCollapsed && <span className="text-xs font-bold uppercase tracking-wider">{item.label}</span>}
                                            </div>
                                            {!isCollapsed && (
                                                <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                            )}
                                        </button>
                                    ) : (
                                        <Link
                                            href={item.href}
                                            className={`flex items-center rounded-xl px-3 py-2.5 transition-all ${isActiveLink ? 'bg-white text-slate-900 font-extrabold shadow-sm' : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'} ${isCollapsed ? 'justify-center' : 'space-x-3'}`}
                                        >
                                            <Icon size={16} className={isActiveLink ? 'text-slate-900' : 'text-slate-400'} />
                                            {!isCollapsed && <span className="text-xs font-bold uppercase tracking-wider">{item.label}</span>}
                                        </Link>
                                    )}

                                    {/* Nested Multi-level Routing Tree */}
                                    {item.submenu && !isCollapsed && (
                                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-48 mt-0.5 opacity-100' : 'max-h-0 opacity-0'}`}>
                                            <div className="pl-8 pr-2 py-1 space-y-0.5 border-l border-slate-800 ml-5">
                                                {item.submenu.map((sub) => {
                                                    const isSubActive = pathname === sub.href;
                                                    return (
                                                        <Link
                                                            key={sub.label} href={sub.href}
                                                            className={`block py-1.5 text-xs transition-colors font-medium ${isSubActive ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                                                        >
                                                            <div className="flex items-center">
                                                                <span className={`w-1 h-1 rounded-full mr-2 shrink-0 ${isSubActive ? 'bg-amber-400' : 'bg-slate-700'}`}></span>
                                                                {sub.label}
                                                            </div>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </nav>
                </div>

                {/* Access Level Badge Footer Context */}
                {!isCollapsed && (
                    <div className="p-3.5 mx-3 mb-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 flex items-center space-x-3">
                        <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                            <ShieldCheck size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Access Scope</p>
                            <p className="text-xs font-black text-white uppercase tracking-wider mt-0.5">{user?.role?.replace('_', ' ')}</p>
                        </div>
                    </div>
                )}
            </aside>

            {/* MAIN APP FLUID VIEWPORT CONTROLLER */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
                
                {/* GLOBAL DASHBOARD SYSTEM TOPBAR HEADER */}
                <header className="h-20 bg-white/80 border-b border-slate-200 flex items-center justify-between px-6 lg:px-10 shrink-0 z-20 sticky top-0 backdrop-blur-md">
                    <div className="flex items-center space-x-4">
                        <button className="lg:hidden text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">
                            <Menu size={20} />
                        </button>
                        <div className="hidden sm:block">
                            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1.5 w-max truncate max-w-sm">{pageDisplayTitle}</h2>
                        </div>
                    </div>

                    {/* Tools Deck and Interactive Avatar Button Trigger Panel */}
                    <div className="flex items-center space-x-4 sm:space-x-5">
                        <button className="relative text-slate-400 hover:text-slate-800 transition-colors p-1.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                            <Bell size={16} />
                            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white shadow-xs"></span>
                        </button>
                        <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>

                        {/* Interactive Menu Container */}
                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center space-x-3 hover:bg-slate-50 p-1.5 rounded-full transition-all border border-transparent hover:border-slate-200 cursor-pointer"
                            >
                                {/* DYNAMIC AVATAR BUFFER SYNC POINT */}
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
                                    <span className="text-xs font-black text-slate-800 leading-none truncate max-w-[120px]">{user?.name || user?.email?.split('@')[0]}</span>
                                    <span className="text-[9px] font-black uppercase text-blue-600 tracking-widest mt-1">Verified Session</span>
                                </div>
                                <ChevronDown size={12} className="text-slate-400 ml-0.5 hidden sm:block" />
                            </button>

                            {/* Dropdown Action Panels Overlay Card */}
                            {isProfileOpen && (
                                <div className="absolute right-0 mt-3 w-60 bg-white rounded-2xl shadow-2xl border border-slate-200 py-1.5 origin-top-right animate-in fade-in zoom-in-95 duration-100">
                                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 rounded-t-xl mb-1">
                                        <p className="text-xs font-black text-slate-900 truncate">{user?.name || 'Network Operator'}</p>
                                        <p className="text-[11px] font-semibold text-slate-400 truncate mt-0.5">{user?.email}</p>
                                    </div>
                                    <Link href="/settings" onClick={() => setIsProfileOpen(false)} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center space-x-2.5 transition-colors">
                                        <Settings size={14} className="text-slate-400" />
                                        <span>Personal Security Configs</span>
                                    </Link>
                                    <div className="h-px bg-slate-100 my-1"></div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-2 text-xs font-black text-rose-600 hover:bg-rose-50 flex items-center space-x-2.5 transition-colors cursor-pointer"
                                    >
                                        <LogOut size={14} />
                                        <span>Terminate Session</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* CHILD COMPONENT ROUTER CONTAINER VIEW */}
                <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 scrollbar-thin scrollbar-thumb-slate-200">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}