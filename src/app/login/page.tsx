import { login } from './actions'
import { Lock } from 'lucide-react'

export default async function LoginPage(props: { searchParams: Promise<{ message: string }> }) {
    const searchParams = await props.searchParams;
    return (
        <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 m-auto min-h-screen">
            <div className="mb-8 flex flex-col items-center justify-center">
                <div className="bg-slate-900 p-4 rounded-full mb-4">
                    <Lock className="text-white w-8 h-8" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">SDLC Central Hub</h1>
                <p className="text-sm text-slate-500 mt-2 text-center">
                    Enter your email and password to access the platform
                </p>
            </div>

            <form className="animate-in flex-1 flex flex-col w-full justify-center gap-2 text-foreground">
                <label className="text-sm font-medium text-slate-700" htmlFor="email">
                    Email
                </label>
                <input
                    className="rounded-md px-4 py-2 bg-inherit border text-slate-900 mb-6 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    name="email"
                    placeholder="you@example.com"
                    required
                />
                <label className="text-sm font-medium text-slate-700" htmlFor="password">
                    Password
                </label>
                <input
                    className="rounded-md px-4 py-2 bg-inherit border text-slate-900 mb-6 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    required
                />

                <button
                    formAction={login}
                    className="bg-slate-900 text-white rounded-md px-4 py-2 text-foreground mb-2 hover:bg-slate-800 transition-colors font-medium cursor-pointer"
                >
                    Sign In
                </button>

                {searchParams?.message && (
                    <p className="mt-4 p-4 bg-red-100 text-red-600 border border-red-200 text-center text-sm rounded-md">
                        {searchParams.message}
                    </p>
                )}
            </form>
        </div>
    )
}
