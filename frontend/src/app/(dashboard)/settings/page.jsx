'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import Cookies from 'js-cookie';
import {
    Settings as SettingsIcon, User, Shield, Save,
    Building2, Mail, CheckCircle2, Lock, Eye, EyeOff,
    Phone, MapPin, Camera, RefreshCw, AlertCircle
} from 'lucide-react';

export default function SettingsPage() {
    const { login } = useAuthStore();
    const [activeTab, setActiveTab] = useState('profile');

    // UI States
    const [fetchingData, setFetchingData] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState('');

    // Form States
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phoneNumber: '',
        avatarUrl: '',
        locationStr: ''
    });
    const [parentCompany, setParentCompany] = useState(null);
    const [userRole, setUserRole] = useState('');

    // Password States
    const [changingPassword, setChangingPassword] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

    // Password Visibility
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // --- Live DB Profile Hydration Loop ---
    const loadFreshProfile = useCallback(async () => {
        setFetchingData(true);
        try {
            const response = await api.get('/users/profile');
            if (response.data.success) {
                const dbUser = response.data.data;
                setFormData({
                    name: dbUser.name || '',
                    email: dbUser.email || '',
                    phoneNumber: dbUser.phoneNumber || '',
                    avatarUrl: dbUser.avatarUrl || '',
                    locationStr: dbUser.locationStr || ''
                });
                setParentCompany(dbUser.company);
                setUserRole(dbUser.role);
            }
        } catch (error) {
            console.error("Failed to fetch fresh profile data:", error);
        } finally {
            setFetchingData(false);
        }
    }, []);

    useEffect(() => {
        loadFreshProfile();
    }, [loadFreshProfile]);

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSavingProfile(true);
        setProfileSuccess('');

        try {
            const response = await api.put('/users/profile', formData);
            if (response.data.success) {
                setProfileSuccess('Profile credentials synchronized successfully!');
                const currentToken = Cookies.get('token');
                // Sync updated user context with the state store globally
                login(response.data.data, currentToken);
                setTimeout(() => setProfileSuccess(''), 3000);
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Profile modification failed.');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (passwords.newPassword !== passwords.confirmPassword) {
            return setPasswordError('New passwords do not match.');
        }

        setChangingPassword(true);
        try {
            const response = await api.put('/users/password', {
                currentPassword: passwords.currentPassword,
                newPassword: passwords.newPassword
            });
            if (response.data.success) {
                setPasswordSuccess('Password successfully updated!');
                setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setTimeout(() => setPasswordSuccess(''), 3000);
            }
        } catch (error) {
            setPasswordError(error.response?.data?.message || 'Password update failed.');
        } finally {
            setChangingPassword(false);
        }
    };

    if (fetchingData) {
        return (
            <div className="flex flex-col items-center justify-center p-24 text-slate-400 space-y-4">
                <RefreshCw size={36} className="animate-spin text-indigo-600" />
                <p className="text-sm font-bold tracking-wide animate-pulse">Fetching verified account attributes...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 px-4 py-2 select-none">

            {/* Premium Immersive Header Banner */}
            <div className="relative bg-slate-900 p-8 rounded-3xl shadow-xl overflow-hidden border border-slate-800">
                {/* Subtle Modern Glow Accents */}
                <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[250px] h-[350px] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />

                <div className="relative flex items-center space-x-5 z-10">
                    <div className="p-3.5 bg-slate-800 border border-slate-700 rounded-2xl text-[#FFAF00] shadow-md">
                        <SettingsIcon size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">Identity Settings</h2>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">Verify system permissions, modify metadata records, and secure credentials</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-start">

                {/* Left Navigation Sidebar Hub */}
                <div className="w-full md:w-64 shrink-0 bg-white p-3 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`w-full flex cursor-pointer items-center space-x-3 px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all relative ${activeTab === 'profile'
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                    >
                        <User size={14} strokeWidth={2.5} />
                        <span>Workspace Account</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`w-full flex cursor-pointer items-center space-x-3 px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all relative ${activeTab === 'security'
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                    >
                        <Shield size={14} strokeWidth={2.5} />
                        <span>Security Access</span>
                    </button>
                </div>

                {/* Right Interactive Presentation Window */}
                <div className="flex-1 w-full">

                    {/* INTERACTIVE COMPONENT TAB 1: USER ACCOUNT DATA METADATA */}
                    {activeTab === 'profile' && (
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200">
                            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">Personal Information Matrix</h3>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">Configure system-wide profile variables mapped across operations logs.</p>
                            </div>

                            <form onSubmit={handleSaveProfile} className="p-6 sm:p-8 space-y-6">
                                {profileSuccess && (
                                    <div className="flex items-center p-4 text-xs font-semibold text-emerald-800 bg-emerald-50 rounded-2xl border border-emerald-200 animate-in fade-in duration-200">
                                        <CheckCircle2 size={16} className="mr-2 text-emerald-600 shrink-0" />
                                        <span>{profileSuccess}</span>
                                    </div>
                                )}

                                {/* PROFILE PICTURE BASE64 DATA CAPTURE UNIT */}
                                <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100">
                                    <div className="relative group shrink-0 cursor-pointer">
                                        <div className="h-20 w-24 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shadow-xs relative">
                                            {formData.avatarUrl ? (
                                                <img
                                                    src={formData.avatarUrl}
                                                    alt="Avatar Frame"
                                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                />
                                            ) : (
                                                <User size={28} className="text-slate-300" />
                                            )}
                                        </div>

                                        <label
                                            htmlFor="avatar-upload"
                                            className="absolute inset-0 bg-slate-950/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs cursor-pointer"
                                        >
                                            <Camera size={16} className="text-white" />
                                        </label>

                                        <input
                                            type="file"
                                            id="avatar-upload"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    if (file.size > 2 * 1024 * 1024) {
                                                        alert("Image file size bounds must measure below 2MB.");
                                                        return;
                                                    }
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        setFormData({ ...formData, avatarUrl: reader.result });
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="space-y-1 text-center sm:text-left">
                                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Profile Frame Identity</h4>
                                        <p className="text-xs text-slate-400 font-medium max-w-sm leading-relaxed">
                                            Select the vector viewport box to map local graphic profiles. Accepts JPEG, PNG, or WebP files bounded under 2MB.
                                        </p>
                                        {formData.avatarUrl && (
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, avatarUrl: '' })}
                                                className="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-200/60 px-2.5 py-1 rounded-lg transition-colors cursor-pointer mt-1"
                                            >
                                                Purge Image Cache
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* INPUT CONTROLS DISTRIBUTION STRUCTURAL GRID */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center">
                                            <User size={12} className="mr-1.5 text-slate-400" /> Administrative Full Name
                                        </label>
                                        <input
                                            type="text" required value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-slate-400 transition-all outline-hidden shadow-2xs"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center">
                                            <Mail size={12} className="mr-1.5 text-slate-400" /> Account Router Email Address
                                        </label>
                                        <input
                                            type="email" required value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-slate-400 transition-all outline-hidden shadow-2xs"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center">
                                            <Phone size={12} className="mr-1.5 text-slate-400" /> Help Registry Phone Number
                                        </label>
                                        <input
                                            type="text" placeholder="+44 7700 900077" value={formData.phoneNumber}
                                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-slate-400 transition-all outline-hidden shadow-2xs"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center">
                                            <MapPin size={12} className="mr-1.5 text-slate-400" /> Regional Branch Headquarters Location
                                        </label>
                                        <input
                                            type="text" placeholder="London Corporate Hub, UK" value={formData.locationStr}
                                            onChange={(e) => setFormData({ ...formData, locationStr: e.target.value })}
                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-slate-400 transition-all outline-hidden shadow-2xs"
                                        />
                                    </div>
                                </div>

                                {/* TENANCY CONTAINER DESCRIPTIVE ANCHOR WRAPPER */}
                                <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100/80 flex items-start space-x-3.5">
                                    <Building2 size={18} className="text-indigo-500 shrink-0 mt-0.5" />
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-black text-slate-900 uppercase tracking-wide">Workspace Parent Domain Group ({userRole})</p>
                                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                            Account variables link automatically under isolated network data constraints assigned to: <span className="font-extrabold text-indigo-700">{parentCompany?.name || 'Global Core Context'}</span>.
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex justify-end">
                                    <button
                                        type="submit" disabled={savingProfile}
                                        className="flex cursor-pointer items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-98 disabled:opacity-70"
                                    >
                                        {savingProfile ? (
                                            <>
                                                <RefreshCw size={12} className="animate-spin" />
                                                <span>Saving Metadata...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Save size={12} />
                                                <span>Save Profile Alignment</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* INTERACTIVE COMPONENT TAB 2: ACCESS KEY PASS ROTATION LOCK */}
                    {activeTab === 'security' && (
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200">
                            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center">
                                    Security Credentials Vault
                                </h3>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">Rotate account password verification properties safely.</p>
                            </div>

                            <form onSubmit={handleChangePassword} className="p-6 sm:p-8 space-y-5">
                                {passwordSuccess && (
                                    <div className="flex items-center p-4 text-xs font-semibold text-emerald-800 bg-emerald-50 rounded-2xl border border-emerald-200 animate-in fade-in duration-200">
                                        <CheckCircle2 size={16} className="mr-2 text-emerald-600 shrink-0" />
                                        <span>{passwordSuccess}</span>
                                    </div>
                                )}
                                {passwordError && (
                                    <div className="flex items-center p-4 text-xs font-semibold text-rose-800 bg-rose-50 rounded-2xl border border-rose-200 animate-in shake duration-300">
                                        <AlertCircle size={16} className="mr-2 text-rose-600 shrink-0" />
                                        <span>{passwordError}</span>
                                    </div>
                                )}

                                <div className="space-y-4 max-w-md">
                                    {/* Field Vector 1: Legacy Existing Key */}
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Current Access Password</label>
                                        <div className="relative group">
                                            <Lock size={12} className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-slate-700 transition-colors" />
                                            <input
                                                type={showCurrent ? "text" : "password"} required
                                                value={passwords.currentPassword}
                                                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                                                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-800 focus:bg-white focus:border-slate-400 transition-all outline-hidden shadow-2xs"
                                                placeholder="••••••••••••"
                                            />
                                            <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer">
                                                {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Field Vector 2: New Allocation Variable */}
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Target Fresh Password</label>
                                        <div className="relative group">
                                            <Lock size={12} className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-slate-700 transition-colors" />
                                            <input
                                                type={showNew ? "text" : "password"} required
                                                value={passwords.newPassword}
                                                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-800 focus:bg-white focus:border-slate-400 transition-all outline-hidden shadow-2xs"
                                                placeholder="••••••••••••"
                                            />
                                            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer">
                                                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Field Vector 3: Validation Comparison Double-Check */}
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Confirm Fresh Password Mutation</label>
                                        <div className="relative group">
                                            <Lock size={12} className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-slate-700 transition-colors" />
                                            <input
                                                type={showConfirm ? "text" : "password"} required
                                                value={passwords.confirmPassword}
                                                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-800 focus:bg-white focus:border-slate-400 transition-all outline-hidden shadow-2xs"
                                                placeholder="••••••••••••"
                                            />
                                            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer">
                                                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex justify-end mt-6">
                                    <button
                                        type="submit" disabled={changingPassword}
                                        className="flex cursor-pointer items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-98 disabled:opacity-70"
                                    >
                                        {changingPassword ? (
                                            <>
                                                <RefreshCw size={12} className="animate-spin" />
                                                <span>Rotating Hash...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Shield size={12} />
                                                <span>Commit Password Mutation</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                </div>
            </div>

        </div>
    );
}