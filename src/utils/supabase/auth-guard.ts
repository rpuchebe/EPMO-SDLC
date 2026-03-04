import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * Verify the caller is an authenticated user.
 * Returns the user object on success, or a 401 NextResponse on failure.
 *
 * Usage in API routes:
 *   const auth = await requireAuth()
 *   if (auth instanceof NextResponse) return auth
 *   // auth is the authenticated user
 */
export async function requireAuth() {
    const supabase = await createClient()
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser()

    if (error || !user) {
        return NextResponse.json(
            { error: 'Unauthorized. Please log in.' },
            { status: 401 },
        )
    }

    return user
}
