import { supabase } from '../database/supaBase.js';

lucide.createIcons();

const loginForm = document.getElementById('login-form');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Autenticando...';
    lucide.createIcons();

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        alert('Falha na autenticação: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i data-lucide="lock" class="w-4 h-4"></i> Entrar no Painel';
        lucide.createIcons();
    } else {
        window.location.href = 'gerenciaProd.html';
    }
});