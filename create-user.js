/* eslint-disable */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Note: We need the Service Role Key to create a user skipping email confirmation,
// but let's try with the anon key as a standard sign up first and see if email confirmations are disabled for this project
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTestUser() {
    console.log(`Creating user in: ${supabaseUrl}`);

    const { data, error } = await supabase.auth.signUp({
        email: 'test-admin-123@example.com',
        password: 'password123',
        options: {
            data: {
                full_name: 'Test Administrator',
                role: 'Admin'
            }
        }
    });

    if (error) {
        console.error('Error creating user:', error.message);
        process.exit(1);
    } else {
        console.log('Successfully created test user: test@example.com / password123');
        console.log('NOTE: If email confirmations are enabled on your Supabase project, you must confirm the email first, or you will not be able to log in.');
        process.exit(0);
    }
}

createTestUser();
