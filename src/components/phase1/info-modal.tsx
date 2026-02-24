import { X, ExternalLink, Presentation, MonitorPlay } from 'lucide-react'

interface InfoModalProps {
    open: boolean
    onClose: () => void
}

export function InfoModal({ open, onClose }: InfoModalProps) {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-lg font-semibold text-slate-800 tracking-tight">Phase 1 – Discovery</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-1 hover:bg-slate-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                        The Discovery phase focuses on defining the initial requirements, timelines, and scope for incoming initiatives. Below are the key resources for understanding this phase.
                    </p>

                    <div className="flex flex-col gap-3">
                        <a
                            href="https://drive.google.com/file/d/1_KG-S9LWQ0y_Eps6AyVsTpiAWfcAWtx1/view"
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group"
                        >
                            <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg group-hover:bg-indigo-200 transition-colors">
                                <Presentation className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-semibold text-slate-800 mb-0.5 group-hover:text-indigo-700">Presentation link</h3>
                                <p className="text-xs text-slate-500">Overview of the Discovery framework.</p>
                            </div>
                            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 mt-1" />
                        </a>

                        <a
                            href="https://drive.google.com/drive/folders/1fmQwmSAhf030qkRo3D6anOWo0_hupVXw"
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 transition-all group"
                        >
                            <div className="bg-violet-100 text-violet-600 p-2 rounded-lg group-hover:bg-violet-200 transition-colors">
                                <MonitorPlay className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-semibold text-slate-800 mb-0.5 group-hover:text-violet-700">Walkthrough link</h3>
                                <p className="text-xs text-slate-500">Video guides on executing the Discovery steps.</p>
                            </div>
                            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-violet-500 mt-1" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}
