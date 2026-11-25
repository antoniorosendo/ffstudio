import { supabase } from '../database/supaBase.js';

function updateHeaderAuthState(session) {
    const desktopLink = document.getElementById('header-cart-link');
    const mobileLink = document.getElementById('mobile-cart-link');

    if (session) {
        if (desktopLink) {
            desktopLink.outerHTML = `
                <button id="header-cart-link" type="button" onclick="logoutAdmin()"
                    title="Sair do Painel"
                    class="flex items-center gap-1.5 text-red-500 hover:text-red-700 font-medium text-sm transition-colors duration-300">
                    <i data-lucide="log-out" class="w-5 h-5"></i>
                    <span>Sair</span>
                </button>
            `;
        }

        if (mobileLink) {
            mobileLink.outerHTML = `
                <button id="mobile-cart-link" type="button" onclick="logoutAdmin()"
                    class="w-full text-left px-3 py-2 text-red-500 hover:bg-red-50 font-medium rounded-md flex items-center gap-2">
                    <i data-lucide="log-out" class="w-4 h-4"></i>
                    <span>Sair do Painel</span>
                </button>
            `;
        }
    }
}

async function renderAdminMenu() {
    const adminSection = document.getElementById('admin-section');
    const { data: { session } } = await supabase.auth.getSession();

    // Atualiza o botão do header (Carrinho <-> Sair)
    updateHeaderAuthState(session);

    if (!adminSection) return;

    if (session) {
        adminSection.innerHTML = `
            <h4 class="font-bold mb-3 text-gray-800">Painel de Controle</h4>
            <ul class="space-y-3 text-gray-500 text-sm">
                <li>
                    <a href="cadastroProd.html" class="hover:text-coral transition-colors flex items-center gap-2">
                        <i data-lucide="plus-circle" class="w-4 h-4"></i> Cadastrar Produto
                    </a>
                </li>
                <li>
                    <a href="gerenciaProd.html" class="hover:text-coral transition-colors flex items-center gap-2">
                        <i data-lucide="layout-list" class="w-4 h-4"></i> Gerenciar Produtos
                    </a>
                </li>
                <li>
                    <a href="gerenciaPedidos.html" class="hover:text-coral transition-colors flex items-center gap-2">
                        <i data-lucide="clipboard-list" class="w-4 h-4"></i> Gerenciar Pedidos
                    </a>
                </li>
                <li class="pt-2">
                    <button type="button" onclick="logoutAdmin()" class="text-red-400 hover:text-red-600 transition-colors flex items-center gap-2 w-full text-left font-medium">
                        <i data-lucide="log-out" class="w-4 h-4"></i> Sair do Painel
                    </button>
                </li>
            </ul>
        `;
    } else {
        adminSection.innerHTML = `
            <a href="login.html" class="text-sm font-medium text-gray-400 hover:text-coral transition-colors flex items-center gap-2">
                <i data-lucide="lock" class="w-4 h-4"></i> Acesso Administrativo
            </a>
        `;
    }

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

window.logoutAdmin = async function () {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
};

export function renderFooter({ isAdmin = false } = {}) {
    const container = document.getElementById('footer-container');
    if (document.getElementById('ff-footer')) return;

    const footerHTML = isAdmin
        ? `
            <footer id="ff-footer" class="bg-white border-t border-orange-100 mt-20 text-gray-600">
                <div class="max-w-7xl mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div class="flex items-center gap-3">
                        <img src="/images/Logo_FFStudio_2.png" alt="FF Studio" class="h-9 w-auto">
                        <div>
                            <p class="font-bold text-gray-800">FF Studio</p>
                            <p class="text-xs text-gray-500">Peças artesanais feitas à mão em crochê</p>
                        </div>
                    </div>

                    <nav class="flex flex-wrap items-center justify-center gap-6 text-sm font-medium">
                        <a href="gerenciaProd.html" class="hover:text-coral transition-colors">Gerenciar Produtos</a>
                        <a href="gerenciaPedidos.html" class="hover:text-coral transition-colors">Gerenciar Pedidos</a>
                        <a href="catalogo.html" class="hover:text-coral transition-colors">Ver Catálogo</a>
                    </nav>

                    <p class="text-xs text-gray-400 text-center md:text-right">
                        &copy; ${new Date().getFullYear()} FF Studio. Todos os direitos reservados.
                    </p>
                </div>
            </footer>
        `
        : `
            <footer id="ff-footer" class="bg-white text-gray-800 py-12 border-t border-orange-100">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                    <div class="grid md:grid-cols-4 gap-8 mb-8">

                        <!-- Sobre -->
                        <div class="col-span-1 md:col-span-2">
                            <h3 class="text-2xl font-bold mb-4">
                                <span class="text-coral">FF</span> Studio
                            </h3>

                            <p class="text-gray-600 mb-6 max-w-sm leading-relaxed">
                                Transformando fios em arte desde 2021. Peças exclusivas
                                feitas à mão com amor, dedicação e muito carinho.
                            </p>

                            <div class="flex gap-4">
                                <a href="https://www.instagram.com/creativitaff/" target="_blank" rel="noopener noreferrer"
                                    class="text-gray-500 hover:text-coral transition-colors duration-300">
                                    <i data-lucide="instagram" class="w-5 h-5"></i>
                                </a>
                            </div>

                            <!-- SEÇÃO DINÂMICA DE ADMINISTRAÇÃO -->
                            <div id="admin-section" class="pt-4 border-t border-gray-100 max-w-xs"></div>
                        </div>

                        <!-- Links rápidos -->
                        <div>
                            <h4 class="font-bold mb-4 text-coral">
                                Links Rápidos
                            </h4>

                            <ul class="space-y-2 text-gray-600">
                                <li><a href="#home" class="hover:text-coral transition-colors nav-link">Início</a></li>
                                <li><a href="#sobre" class="hover:text-coral transition-colors nav-link">Sobre</a></li>
                                <li><a href="#produtos" class="hover:text-coral transition-colors nav-link">Coleções</a></li>
                                <li><a href="#processo" class="hover:text-coral transition-colors nav-link">Processo</a></li>
                                <li><a href="#contato" class="hover:text-coral transition-colors nav-link">Encomendas</a></li>
                            </ul>
                        </div>

                        <!-- Atendimento -->
                        <div>
                            <h4 class="font-bold mb-4 text-coral">
                                Atendimento
                            </h4>

                            <ul class="space-y-2 text-gray-600">
                                <li>(11) 93928-8314</li>
                            </ul>
                        </div>
                    </div>

                    <!-- Linha inferior -->
                    <div class="border-t border-orange-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p class="text-gray-500 text-sm">© 2026 FF Studio. Todos os direitos reservados.</p>
                        <p class="text-gray-500 text-sm">Feito com amor e muito crochê!</p>
                    </div>

                </div>
            </footer>
        `;

    if (container) {
        container.innerHTML = footerHTML;
    } else {
        document.body.insertAdjacentHTML('beforeend', footerHTML);
    }

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }

    if (!isAdmin) {
        renderAdminMenu();
    }
}