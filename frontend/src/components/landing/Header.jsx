'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Zap, LogOut, LayoutDashboard, ChevronDown, Settings, User } from 'lucide-react';

export default function Header() {
    const router = useRouter();
    const { user, token, logout } = useAuthStore();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close profile menu dropdown when clicking outside of it
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        setIsProfileOpen(false);
        router.push('/');
    };

    // Calculate secure entry routing block depending on permissions level
    const dashboardHref = user?.role === 'SUPER_ADMIN' ? '/super-admin/dashboard' : '/company/dashboard';

    const getUserInitials = () => {
        if (user?.name) {
            return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        }
        return user?.email ? user.email.charAt(0).toUpperCase() : 'U';
    };

    return (
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 select-none">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

                {/* Brand Identity Vector Block - Clickable Landing Redirect */}
                <Link href="/" className="flex items-center space-x-3 cursor-pointer group">
                    <div className="p-2 bg-[#FFAF00] rounded-xl text-slate-950 shadow-md shadow-[#FFAF00]/10 transition-transform group-hover:scale-105">
                        <Zap size={22} fill="currentColor" className="text-slate-950" />
                    </div>
                    <span className="text-xl font-black text-slate-900 tracking-tight">
                        EV <span className="text-[#73CB44]">DATA</span> HUB
                    </span>
                </Link>

                {/* Semantic Navigation Paths */}
                <nav className="hidden md:flex items-center space-x-8 text-sm font-bold text-slate-600">
                    <Link href="/#hero" className="hover:text-[#FFAF00] transition-colors">Home</Link>
                    <Link href="/#features" className="hover:text-[#FFAF00] transition-colors">Features</Link>
                    <Link href="/#stats" className="hover:text-[#FFAF00] transition-colors">Impact Data</Link>
                    <Link href="/#compliance" className="hover:text-[#73CB44] transition-colors">OCPI Standard</Link>
                    <Link href="/open-data" className="hover:text-indigo-600 transition-colors">Public Map</Link>
                </nav>

                {/* Action Control Hooks - Dynamic Auth State Handler */}
                <div className="flex items-center space-x-4">
                    {token && user ? (
                        /* SECURED LOGGED IN USER PROFILE DROPDOWN */
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center space-x-3 hover:bg-slate-50 p-1.5 rounded-full transition-all border border-slate-200/60 shadow-2xs cursor-pointer"
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
                                <span className="text-xs font-black text-slate-800 hidden sm:block max-w-[100px] truncate">
                                    {user?.name || user?.email?.split('@')[0]}
                                </span>
                                <ChevronDown size={12} className="text-slate-400 hidden sm:block" />
                            </button>

                            {/* Dropdown Menu Card */}
                            {isProfileOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 py-1.5 origin-top-right animate-in fade-in zoom-in-95 duration-100">
                                    <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/60 rounded-t-xl mb-1">
                                        <p className="text-xs font-black text-slate-900 truncate">{user?.name || 'Workspace User'}</p>
                                        <p className="text-[10px] font-semibold text-slate-400 truncate mt-0.5">{user?.email}</p>
                                    </div>

                                    <Link href={dashboardHref} onClick={() => setIsProfileOpen(false)} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center space-x-2.5 transition-colors cursor-pointer">
                                        <LayoutDashboard size={14} className="text-slate-400" />
                                        <span>Go to Workspace</span>
                                    </Link>

                                    <Link href="/settings" onClick={() => setIsProfileOpen(false)} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center space-x-2.5 transition-colors cursor-pointer">
                                        <Settings size={14} className="text-slate-400" />
                                        <span>Account Settings</span>
                                    </Link>

                                    <div className="h-px bg-slate-100 my-1"></div>

                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-2 text-xs font-black text-rose-600 hover:bg-rose-50 flex items-center space-x-2.5 transition-colors cursor-pointer"
                                    >
                                        <LogOut size={14} />
                                        <span>Sign Out</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* UNSECURED PUBLIC AUTH LINK GATES */
                        <>
                            <Link href="/login" className="text-sm font-black text-slate-700 hover:text-[#FFAF00] px-4 py-2 transition-colors cursor-pointer">
                                Sign In
                            </Link>
                            <Link
                                href="/login"
                                className="bg-[#73CB44] text-white text-sm font-black px-5 py-2.5 rounded-xl hover:bg-[#62b537] transition-all shadow-sm active:scale-98 cursor-pointer"
                            >
                                Register Network
                            </Link>
                        </>
                    )}
                </div>

            </div>
        </header>
    );
}