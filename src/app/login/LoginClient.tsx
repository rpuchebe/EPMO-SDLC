'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Eye, EyeOff, ArrowLeft, CheckCircle2, LayoutDashboard, GitMerge, ShieldCheck, Users, BarChart3, AlertTriangle } from 'lucide-react'
import { login, signup } from './actions'
import { createClient } from '@/utils/supabase/client'

type View = 'signin' | 'signup' | 'forgot'

const EPMO_PILLARS = [
    { icon: LayoutDashboard, label: 'Portfolio Management',    desc: 'Unified view of all initiatives' },
    { icon: GitMerge,        label: 'Project Delivery',       desc: 'End-to-end lifecycle tracking' },
    { icon: ShieldCheck,     label: 'Governance & Compliance',desc: 'Standards, audits & controls' },
    { icon: Users,           label: 'Resource Planning',      desc: 'Capacity & allocation insights' },
    { icon: AlertTriangle,   label: 'Risk Management',        desc: 'Identify, assess & mitigate' },
    { icon: BarChart3,       label: 'Analytics & Reporting',  desc: 'Real-time KPIs & dashboards' },
]

const INPUT = 'w-full rounded-xl px-4 py-2.5 border border-slate-200 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-[#1C3B2A] focus:border-transparent focus:outline-none transition-all placeholder:text-slate-400'
const LABEL = 'block text-sm font-medium text-slate-700 mb-1'
const PRIMARY_BTN = 'w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-sm text-white'

export default function LoginClient({
    message,
    success,
}: {
    message?: string
    success?: string
}) {
    const [view, setView] = useState<View>('signin')
    const [showPass, setShowPass] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
    const [email, setEmail] = useState('')
    const [forgotEmail, setForgotEmail] = useState('')
    const [forgotSent, setForgotSent] = useState(false)
    const [forgotLoading, setForgotLoading] = useState(false)
    const [forgotError, setForgotError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const signinRef = useRef<HTMLFormElement>(null)
    const signupRef = useRef<HTMLFormElement>(null)

    useEffect(() => {
        const saved = localStorage.getItem('epmo_remembered_email')
        if (saved) {
            setEmail(saved)
            setRememberMe(true)
        }
    }, [])

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!signinRef.current) return
        setIsLoading(true)
        const formData = new FormData(signinRef.current)
        if (rememberMe) {
            localStorage.setItem('epmo_remembered_email', formData.get('email') as string)
        } else {
            localStorage.removeItem('epmo_remembered_email')
        }
        await login(formData)
        setIsLoading(false)
    }

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!signupRef.current) return
        setIsLoading(true)
        const formData = new FormData(signupRef.current)
        await signup(formData)
        setIsLoading(false)
    }

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setForgotLoading(true)
        setForgotError('')
        const supabase = createClient()
        const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
            redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        })
        if (error) {
            setForgotError(error.message)
        } else {
            setForgotSent(true)
        }
        setForgotLoading(false)
    }

    const goBack = () => {
        setView('signin')
        setForgotSent(false)
        setForgotError('')
    }

    return (
        /* h-screen + overflow-hidden = no scroll ever */
        <div className="h-screen overflow-hidden flex">

            {/* ── LEFT PANEL ── */}
            <div
                className="hidden lg:flex lg:w-[44%] xl:w-[42%] flex-col relative overflow-hidden"
                style={{ background: 'linear-gradient(145deg, #1C3B2A 0%, #112A1C 55%, #0A1C12 100%)' }}
            >
                {/* Decorative blobs */}
                <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(110,207,178,0.18), transparent 70%)' }} />
                <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(188,223,138,0.12), transparent 70%)' }} />
                <svg className="absolute right-0 bottom-1/4 opacity-5 w-48 h-48" viewBox="0 0 200 200" fill="none">
                    <polygon points="100,10 190,55 190,145 100,190 10,145 10,55" stroke="#6ECFB2" strokeWidth="1" fill="none" />
                    <polygon points="100,35 165,67 165,133 100,165 35,133 35,67" stroke="#6ECFB2" strokeWidth="1" fill="none" />
                    <polygon points="100,60 140,80 140,120 100,140 60,120 60,80" stroke="#6ECFB2" strokeWidth="1" fill="none" />
                </svg>

                <div className="relative z-10 flex flex-col h-full px-10 py-8 xl:px-12">
                    {/* Logo */}
                    <div className="mb-8">
                        <div className="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-2.5">
                            <Image src="/Priority-Logo.jpeg" alt="Priority" width={130} height={44}
                                className="h-7 w-auto object-contain" priority />
                        </div>
                    </div>

                    {/* Hero copy */}
                    <div className="flex-1 flex flex-col justify-center min-h-0">
                        <span className="text-xs font-bold tracking-[0.2em] uppercase mb-2.5"
                            style={{ color: '#6ECFB2' }}>
                            Enterprise PMO
                        </span>
                        <h1 className="text-3xl xl:text-4xl font-extrabold text-white mb-3 leading-[1.1]">
                            Project<br />Management<br />Hub
                        </h1>
                        <p className="text-[#8FBFB0] text-sm leading-relaxed mb-6 max-w-xs">
                            Your single source of truth for portfolio oversight, delivery governance, and enterprise-wide project intelligence.
                        </p>

                        {/* EPMO pillars grid */}
                        <div className="grid grid-cols-2 gap-2">
                            {EPMO_PILLARS.map(({ icon: Icon, label, desc }, i) => (
                                <div key={i} className="rounded-xl p-2.5 flex flex-col gap-1.5"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                    <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                                        style={{ background: 'linear-gradient(135deg, rgba(110,207,178,0.25), rgba(188,223,138,0.15))' }}>
                                        <Icon className="w-3 h-3" style={{ color: '#6ECFB2' }} />
                                    </div>
                                    <p className="text-white text-xs font-semibold leading-tight">{label}</p>
                                    <p className="text-[10px] leading-snug" style={{ color: '#4D7A6A' }}>{desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-5 border-t border-white/10">
                        <p className="text-xs text-[#3D6B59]">
                            © 2025 Priority Software · Enterprise Project Management Office
                        </p>
                    </div>
                </div>
            </div>

            {/* ── RIGHT PANEL ── */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 overflow-hidden">
                {/* Mobile logo */}
                <div className="lg:hidden mb-6">
                    <Image src="/Priority-Logo.jpeg" alt="Priority" width={150} height={50}
                        className="h-9 w-auto object-contain" priority />
                </div>

                <div className="w-full max-w-[400px]">
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 p-6 border border-slate-100">

                        {/* ── HEADER ── */}
                        {view === 'forgot' ? (
                            <div className="mb-5">
                                <button type="button" onClick={goBack}
                                    className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 mb-4 transition-colors">
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Sign In
                                </button>
                                <h2 className="text-xl font-bold text-slate-900 mb-0.5">Reset password</h2>
                                <p className="text-slate-500 text-sm">We&apos;ll send a reset link to your email</p>
                            </div>
                        ) : (
                            <>
                                <div className="mb-4">
                                    <h2 className="text-xl font-bold text-slate-900 mb-0.5">
                                        {view === 'signin' ? 'Welcome back' : 'Create account'}
                                    </h2>
                                    <p className="text-slate-500 text-sm">
                                        {view === 'signin'
                                            ? 'Sign in to access your EPMO dashboard'
                                            : 'Join the SDLC Central Hub platform'}
                                    </p>
                                </div>

                                {/* Tabs */}
                                <div className="flex rounded-xl bg-slate-100 p-1 mb-5">
                                    {(['signin', 'signup'] as View[]).map((tab) => (
                                        <button key={tab} type="button" onClick={() => setView(tab)}
                                            className={`flex-1 py-1.5 px-4 rounded-lg text-sm font-semibold transition-all ${view === tab
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : 'text-slate-400 hover:text-slate-600'}`}>
                                            {tab === 'signin' ? 'Sign In' : 'Sign Up'}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* ── STATUS BANNERS ── */}
                        {message && view === 'signin' && (
                            <div className="mb-3 p-3 bg-red-50 text-red-600 border border-red-100 text-sm rounded-xl">
                                {message}
                            </div>
                        )}
                        {success && view === 'signin' && (
                            <div className="mb-3 p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 text-sm rounded-xl flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                {success}
                            </div>
                        )}

                        {/* ── SIGN IN FORM ── */}
                        {view === 'signin' && (
                            <form ref={signinRef} onSubmit={handleSignIn} className="space-y-3">
                                <div>
                                    <label className={LABEL} htmlFor="signin-email">Email address</label>
                                    <input id="signin-email" className={INPUT} name="email" type="email"
                                        placeholder="you@company.com" value={email}
                                        onChange={(e) => setEmail(e.target.value)} required />
                                </div>
                                <div>
                                    <label className={LABEL} htmlFor="signin-password">Password</label>
                                    <div className="relative">
                                        <input id="signin-password" className={INPUT + ' pr-11'}
                                            type={showPass ? 'text' : 'password'} name="password"
                                            placeholder="••••••••" required />
                                        <button type="button" onClick={() => setShowPass((v) => !v)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-0.5">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input type="checkbox" checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-300"
                                            style={{ accentColor: '#1C3B2A' }} />
                                        <span className="text-sm text-slate-600">Remember me</span>
                                    </label>
                                    <button type="button" onClick={() => setView('forgot')}
                                        className="text-sm font-semibold transition-colors"
                                        style={{ color: '#1C3B2A' }}>
                                        Forgot password?
                                    </button>
                                </div>
                                <button type="submit" disabled={isLoading} className={PRIMARY_BTN}
                                    style={{ background: isLoading ? '#2d5c3e' : 'linear-gradient(135deg, #1C3B2A, #2a5c3e)' }}>
                                    {isLoading ? 'Signing in…' : 'Sign In'}
                                </button>
                            </form>
                        )}

                        {/* ── SIGN UP FORM ── */}
                        {view === 'signup' && (
                            <form ref={signupRef} onSubmit={handleSignUp} className="space-y-3">
                                <div>
                                    <label className={LABEL} htmlFor="signup-email">Email address</label>
                                    <input id="signup-email" className={INPUT} name="email" type="email"
                                        placeholder="you@company.com" required />
                                </div>
                                <div>
                                    <label className={LABEL} htmlFor="signup-password">Password</label>
                                    <div className="relative">
                                        <input id="signup-password" className={INPUT + ' pr-11'}
                                            type={showPass ? 'text' : 'password'} name="password"
                                            placeholder="Min. 8 characters" minLength={8} required />
                                        <button type="button" onClick={() => setShowPass((v) => !v)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className={LABEL} htmlFor="signup-confirm">Confirm password</label>
                                    <div className="relative">
                                        <input id="signup-confirm" className={INPUT + ' pr-11'}
                                            type={showConfirm ? 'text' : 'password'} name="confirmPassword"
                                            placeholder="Repeat your password" required />
                                        <button type="button" onClick={() => setShowConfirm((v) => !v)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <button type="submit" disabled={isLoading} className={PRIMARY_BTN}
                                    style={{ background: isLoading ? '#2d5c3e' : 'linear-gradient(135deg, #1C3B2A, #2a5c3e)' }}>
                                    {isLoading ? 'Creating account…' : 'Create Account'}
                                </button>
                                <p className="text-xs text-slate-400 text-center">
                                    By signing up you agree to our terms of service and privacy policy.
                                </p>
                            </form>
                        )}

                        {/* ── FORGOT PASSWORD ── */}
                        {view === 'forgot' && (
                            forgotSent ? (
                                <div className="text-center py-2">
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                                        style={{ background: 'rgba(110,207,178,0.15)' }}>
                                        <CheckCircle2 className="w-6 h-6" style={{ color: '#6ECFB2' }} />
                                    </div>
                                    <h3 className="font-bold text-slate-900 mb-1.5">Check your inbox</h3>
                                    <p className="text-sm text-slate-500 mb-5">
                                        We sent a reset link to{' '}
                                        <span className="font-semibold text-slate-700">{forgotEmail}</span>
                                    </p>
                                    <button type="button" onClick={goBack} className={PRIMARY_BTN}
                                        style={{ background: 'linear-gradient(135deg, #1C3B2A, #2a5c3e)' }}>
                                        Back to Sign In
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleForgotPassword} className="space-y-3">
                                    {forgotError && (
                                        <div className="p-3 bg-red-50 text-red-600 border border-red-100 text-sm rounded-xl">
                                            {forgotError}
                                        </div>
                                    )}
                                    <div>
                                        <label className={LABEL} htmlFor="forgot-email">Email address</label>
                                        <input id="forgot-email" className={INPUT} type="email"
                                            placeholder="you@company.com" value={forgotEmail}
                                            onChange={(e) => setForgotEmail(e.target.value)} required />
                                    </div>
                                    <button type="submit" disabled={forgotLoading} className={PRIMARY_BTN}
                                        style={{ background: forgotLoading ? '#2d5c3e' : 'linear-gradient(135deg, #1C3B2A, #2a5c3e)' }}>
                                        {forgotLoading ? 'Sending…' : 'Send Reset Link'}
                                    </button>
                                </form>
                            )
                        )}

                        {/* Footer inside card */}
                        <p className="text-center text-xs text-slate-300 mt-5">
                            EPMO · SDLC Central Hub · Priority Software
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
