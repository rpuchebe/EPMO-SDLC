/* eslint-disable */
const { Client } = require('pg');
const connectionString = 'postgresql://postgres:NatyRay2019%2A@db.ncngprmpiclcurykbzqj.supabase.co:5432/postgres';

const client = new Client({
  connectionString: connectionString,
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to Supabase.");

    const uuidId = 'd8f56ef0-261f-4bb2-b5e1-7440e2cdcb63';
    const hash = crypt('password123', gen_salt('bf', 10)); // We'll let Postgres do the hashing if extension is loaded

    const sqlScript = `
      DO $$
      DECLARE
        user_id uuid := '${uuidId}';
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test@sdlc-hub.com') THEN
            INSERT INTO auth.users (
              id,
              instance_id,
              aud,
              role,
              email,
              encrypted_password,
              email_confirmed_at,
              recovery_sent_at,
              last_sign_in_at,
              raw_app_meta_data,
              raw_user_meta_data,
              created_at,
              updated_at,
              confirmation_token,
              email_change,
              email_change_token_new,
              recovery_token
            ) VALUES (
              user_id,
              '00000000-0000-0000-0000-000000000000',
              'authenticated',
              'authenticated',
              'test@sdlc-hub.com',
              crypt('password123', gen_salt('bf')),
              now(),
              now(),
              now(),
              '{"provider":"email","providers":["email"]}',
              '{"full_name":"Test Administrator","role":"Admin"}',
              now(),
              now(),
              '',
              '',
              '',
              ''
            );
        END IF;
      END $$;
    `;

    console.log("Executing SQL...");
    await client.query(sqlScript);
    console.log("Test user created directly in DB: test@sdlc-hub.com / password123");

  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

run();
