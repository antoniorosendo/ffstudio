import { supabase } from '../database/supaBase.js';

lucide.createIcons();

// const phone = "5511939288314";
const phone = "5514988082038";

const message =
    "Olá! Gostaria de conhecer melhor os produtos e possibilidades de encomendas personalizadas.";

const whatsappUrl =
    `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

console.log(whatsappUrl);

const whatsappButton =
    document.getElementById('whatsapp-btn');

if (whatsappButton) {
    whatsappButton.href = whatsappUrl;
}

const mobileMenuBtn =
    document.getElementById('mobile-menu-btn');

const mobileMenu =
    document.getElementById('mobile-menu');

const navbar =
    document.getElementById('navbar');


mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
});


window.addEventListener('scroll', () => {

    if (window.scrollY > 50) {
        navbar.classList.add('shadow-md');
    } else {
        navbar.classList.remove('shadow-md');
    }

});


document.querySelectorAll('a[href^="#"]').forEach(anchor => {

    anchor.addEventListener('click', function (e) {

        e.preventDefault();

        const target =
            document.querySelector(this.getAttribute('href'));

        if (target) {

            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

            mobileMenu.classList.add('hidden');
        }
    });
});


const contactForm =
    document.querySelector('form');

if (contactForm) {

    contactForm.addEventListener('submit', (e) => {

        e.preventDefault();

        alert(
            'Obrigada pelo interesse! Em um site real, esta mensagem será enviada para nossa equipe.'
        );

    });
}


const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px"
};


const observer =
    new IntersectionObserver((entries) => {

        entries.forEach(entry => {

            if (entry.isIntersecting) {

                entry.target.classList.add('fade-in');

                observer.unobserve(entry.target);
            }
        });

    }, observerOptions);


document
    .querySelectorAll('.card-hover, .group')
    .forEach((el) => {

        observer.observe(el);

    });


function getCart() {

    return JSON.parse(
        localStorage.getItem('cart')
    ) || [];

}


function saveCart(cart) {

    localStorage.setItem(
        'cart',
        JSON.stringify(cart)
    );

}


function updateCartCount() {

    const cart = getCart();

    document.getElementById('cart-count').textContent =
        cart.reduce(
            (total, item) =>
                total + item.quantity,
            0
        );

}


/* =========================================
   PRODUTOS EM DESTAQUE
========================================= */

async function loadFeaturedProducts() {

    const container =
        document.getElementById(
            'featured-products-container'
        );

    if (!container) return;


    const { data: products, error } =
        await supabase
            .from('products')
            .select('*');


    if (error) {

        console.error(
            'Erro ao buscar produtos:',
            error
        );

        container.innerHTML = `
            <p class="col-span-full text-center text-red-500">
                Não foi possível carregar os produtos.
            </p>
        `;

        return;
    }


    if (!products || products.length === 0) {

        container.innerHTML = `
            <p class="col-span-full text-center text-gray-500">
                Nenhum produto disponível.
            </p>
        `;

        return;
    }


    // Embaralha os produtos
    const shuffledProducts =
        [...products].sort(
            () => Math.random() - 0.5
        );


    // Seleciona no máximo 4
    const featuredProducts =
        shuffledProducts.slice(0, 4);


    container.innerHTML = '';


    featuredProducts.forEach(product => {

        const productCard =
            document.createElement('div');


        productCard.className =
            'bg-white rounded-3xl overflow-hidden shadow-lg card-hover p-4';


        productCard.innerHTML = `
            
            <img
                src="${product.image_url}"
                alt="${product.name}"
                class="w-full h-48 object-cover rounded-2xl mb-4">

            <h3 class="text-xl font-bold text-gray-800 mb-2">
                ${product.name}
            </h3>

            <p class="text-gray-600 mb-4 text-sm">
                ${product.description || ''}
            </p>

            <div class="flex justify-between items-center">

                <span class="text-xl font-bold text-coral">
                    R$ ${Number(product.base_price)
                        .toFixed(2)
                        .replace('.', ',')}
                </span>

                <button
                    class="add-cart bg-coral text-white px-4 py-2 rounded-full hover:opacity-90 transition text-sm"
                    data-id="${product.id}"
                    data-name="${product.name}"
                    data-price="${product.base_price}">

                    Adicionar

                </button>

            </div>
        `;


        container.appendChild(productCard);

    });


    // Recria os ícones
    lucide.createIcons();


    // Adiciona os novos cards ao IntersectionObserver
    container
        .querySelectorAll('.card-hover')
        .forEach(el => {

            observer.observe(el);

        });

}


/* =========================================
   ADICIONAR AO CARRINHO
========================================= */

document.addEventListener('click', (e) => {

    const button =
        e.target.closest('.add-cart');

    if (!button) return;


    const id =
        button.dataset.id;

    const name =
        button.dataset.name;

    const price =
        parseFloat(button.dataset.price);


    const cart =
        getCart();


    const existingProduct =
        cart.find(
            item => item.id === id
        );


    if (existingProduct) {

        existingProduct.quantity += 1;

    } else {

        cart.push({

            id: id,
            name: name,
            price: price,
            quantity: 1

        });

    }


    saveCart(cart);

    updateCartCount();

});


loadFeaturedProducts();

updateCartCount();

// Verifica o status de autenticação e renderiza o menu administrativo no Footer
async function renderAdminMenu() {
    const adminSection = document.getElementById('admin-section');
    if (!adminSection) return;

    // Busca a sessão atual no Supabase
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        // Se estiver logado, mostra os links de gerenciamento e o botão de sair
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
                <li class="pt-2">
                    <button onclick="logoutAdmin()" class="text-red-400 hover:text-red-600 transition-colors flex items-center gap-2 w-full text-left font-medium">
                        <i data-lucide="log-out" class="w-4 h-4"></i> Sair do Painel
                    </button>
                </li>
            </ul>
        `;
    } else {
        // Se não estiver logado, mostra apenas o link discreto de login
        adminSection.innerHTML = `
            <a href="login.html" class="text-sm font-medium text-gray-400 hover:text-coral transition-colors flex items-center gap-2">
                <i data-lucide="lock" class="w-4 h-4"></i> Acesso Administrativo
            </a>
        `;
    }
    
    // Recria os ícones inseridos pelo innerHTML
    lucide.createIcons();
}

// Função global atrelada ao botão de Sair
window.logoutAdmin = async function() {
    await supabase.auth.signOut();
    window.location.reload(); // Recarrega a página para atualizar o rodapé
};

// Executa a função ao carregar a página
renderAdminMenu();