import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client with the SERVICE ROLE key.
 * Use ONLY in server-side code (API routes, server actions, lib/server/*).
 * Never import this in client components or expose it to the browser.
 */
export function createServiceClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
        throw new Error(
            'Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
        )
    }

    return createClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
}
