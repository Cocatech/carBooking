import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
// This key is from the previous command output (partial visible, but standard local key is usually the same. 
// I will use the one captured from the output "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwi..."
// Wait, the output was truncated/interleaved. I should use the one from .env if I saved it, but .env has ANON key.
// I will try to use the ANON key but wait, anon key cannot create users without signup enabled (which it is) but to set ROLE or bypass confirmation, I need service key.
// Let's TRY to just use signUp with the anon key from .env, that's easier.
// If email confirmation is off (default local), it works.

import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function createAdmin() {
    const email = 'admin@carbooking.com';
    const password = 'P@ssw0rd';

    console.log(`Creating user ${email}...`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        console.error('Error creating user:', error.message);
        if (error.message.includes('already registered')) {
            console.log("User already exists, trying to sign in...");
        } else {
            return;
        }
    }

    // If signUp worked, we have a user. Now let's try to update the profile to admin.
    // We need to sign in to get the session if we aren't automatically logged in (signUp usually logs in if autoConfirm is on).

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (signInError) {
        console.error("Sign in failed:", signInError);
        return;
    }

    const userId = signInData.user.id;
    console.log(`User ID: ${userId}`);

    // Update profile
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            email: email,
            full_name: 'System Admin',
            role: 'admin',
            department: 'IT'
        });

    if (profileError) console.error('Error updating profile:', profileError);
    else console.log('Successfully configured admin profile!');
}

createAdmin();
