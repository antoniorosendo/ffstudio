import { supabase } from '../database/supaBase.js';

async function checkAdminAuth() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        window.location.href = 'login.html';
    }
}

checkAdminAuth();