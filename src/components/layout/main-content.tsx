'use client'

import { usePathname } from 'next/navigation'

// Routes that need zero margin/padding and full viewport width
const FULL_WIDTH_ROUTES = ['/phase-3']

export function MainContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isFullWidth = FULL_WIDTH_ROUTES.includes(pathname)

    return (
        <main
            className={`flex-1 overflow-y-auto ${
                isFullWidth ? 'p-2' : 'pt-1 px-6 pb-6 md:pt-1 md:px-8 md:pb-8'
            }`}
        >
            <div className={isFullWidth ? 'w-full' : 'max-w-7xl mx-auto'}>
                {children}
            </div>
        </main>
    )
}
