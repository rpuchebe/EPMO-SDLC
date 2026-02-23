import {
    Rocket,
    Calendar,
    Users,
    MessageSquare,
    BookOpen,
    FileText,
    Link as LinkIcon
} from 'lucide-react'

// Icon matching utility
const getIcon = (iconName: string) => {
    const icons: Record<string, any> = {
        Rocket, Calendar, Users, MessageSquare, BookOpen, FileText
    }
    const Icon = icons[iconName] || FileText
    return <Icon className="w-6 h-6" />
}

export function ResourceHub({ resources }: { resources: any[] }) {
    if (!resources || resources.length === 0) return null

    // Group by resource_card_id manually or just map if passed already grouped
    // Assuming the query passes `resources` where each item = `resource_card` + `links` array

    return (
        <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">SDLC Resource Hub</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {resources.map((card: any) => (
                    <div key={card.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow group">
                        <div className="flex items-start gap-4">
                            <div className="bg-blue-50 text-blue-600 p-3 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                {getIcon(card.icon_key)}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-slate-800 tracking-tight mb-2">
                                    {card.title}
                                </h3>
                                <ul className="space-y-2 mt-3">
                                    {card.links && card.links.map((link: any) => (
                                        <li key={link.id}>
                                            <a href={link.url} className="text-sm font-medium text-slate-500 hover:text-blue-600 flex items-center gap-1.5 transition-colors">
                                                <LinkIcon className="w-3 h-3 text-slate-400 group-hover:text-blue-400" />
                                                {link.label}
                                            </a>
                                        </li>
                                    ))}
                                    {(!card.links || card.links.length === 0) && (
                                        <li className="text-sm text-slate-400 italic">No links available</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
