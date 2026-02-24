import { Home } from 'lucide-react'

export default function HomePage() {
    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-8 flex flex-col items-center justify-center min-h-[400px]">
                <div className="bg-blue-50 text-blue-600 p-4 rounded-full mb-4">
                    <Home className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome to EPMO Central Hub</h1>
                <p className="text-slate-500 text-center max-w-md">
                    Please use the sidebar to navigate through the SDLC phases, view project progress, and access support documentation.
                </p>
            </div>
        </div>
    )
}
