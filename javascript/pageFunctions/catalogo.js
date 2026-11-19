import { supabase } from '../database/supaBase.js';
import { getVisitorId } from '../database/visitor.js';

lucide.createIcons();

const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
const navbar = document.getElementById('navbar');

if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });
}

window.addEventListener('scroll', () => {
    if (!navbar) return;
    if (window.scrollY > 50) {
        navbar.classList.add('shadow-md');
    } else {
        navbar.classList.remove('shadow-md');
    }
});

// Cart modal elements
const cartModal = document.getElementById('cart-modal');
const closeCartModal = document.getElementById('close-cart-modal');
const continueShopping = document.getElementById('continue-shopping');
const modalProductName = document.getElementById('modal-product-name');

function openCartModal(productName) {
    if (!cartModal) return;
    if (modalProductName) modalProductName.textContent = productName;

    cartModal.classList.remove('hidden');
    cartModal.classList.add('flex');

    document.body.classList.add('overflow-hidden');
    lucide.createIcons();
}

function closeModal() {
    if (!cartModal) return;
    cartModal.classList.add('hidden');
    cartModal.classList.remove('flex');

    document.body.classList.remove('overflow-hidden');
}

if (closeCartModal) closeCartModal.addEventListener('click', closeModal);
if (continueShopping) continueShopping.addEventListener('click', closeModal);

if (cartModal) {
    cartModal.addEventListener('click', (e) => {
        if (e.target === cartModal) {
            closeModal();
        }
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cartModal && !cartModal.classList.contains('hidden')) {
        closeModal();
    }
});

// Cart persistence in Supabase
async function getOrCreateCart() {
    const visitorId = getVisitorId();

    const { data: existingCart, error: selectError } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', visitorId)
        .maybeSingle();

    if (selectError) {
        console.error('Erro ao buscar carrinho:', selectError);
        return null;
    }

    if (existingCart) {
        return existingCart.id;
    }

    const now = new Date().toISOString();

    const { data: newCart, error: insertError } = await supabase
        .from('carts')
        .insert({
            user_id: visitorId,
            created_at: now,
            updated_at: now
        })
        .select('id')
        .single();

    if (insertError) {
        console.error('Erro ao criar carrinho:', insertError);
        return null;
    }

    return newCart.id;
}

async function addProductToCart(productId) {
    const cartId = await getOrCreateCart();
    if (!cartId) return false;

    const { data: existingItem, error: selectError } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', cartId)
        .eq('product_id', productId)
        .maybeSingle();

    if (selectError) {
        console.error('Erro ao verificar produto no carrinho:', selectError);
        return false;
    }

    if (existingItem) {
        const { error: updateError } = await supabase
            .from('cart_items')
            .update({
                quantity: existingItem.quantity + 1
            })
            .eq('id', existingItem.id);

        if (updateError) {
            console.error('Erro ao atualizar quantidade:', updateError);
            return false;
        }

        return true;
    }

    const { error: insertError } = await supabase
        .from('cart_items')
        .insert({
            cart_id: cartId,
            product_id: productId,
            quantity: 1
        });

    if (insertError) {
        console.error('Erro ao inserir produto no carrinho:', insertError);
        return false;
    }

    return true;
}

async function updateCartCount() {
    const cartId = await getOrCreateCart();
    if (!cartId) return;

    const { data, error } = await supabase
        .from('cart_items')
        .select('quantity')
        .eq('cart_id', cartId);

    if (error) {
        console.error('Erro ao buscar contagem:', error);
        return;
    }

    const totalItems = (data || []).reduce((total, item) => total + item.quantity, 0);

    const cartCount = document.getElementById('cart-count');
    const cartCountMobile = document.getElementById('cart-count-mobile');

    if (cartCount) cartCount.textContent = totalItems;
    if (cartCountMobile) cartCountMobile.textContent = totalItems;
}

// Add to cart button click handler
document.addEventListener('click', async (e) => {
    const button = e.target.closest('.add-cart');
    if (!button) return;

    const id = button.dataset.id;
    const name = button.dataset.name;

    button.disabled = true;
    button.textContent = 'Adicionando...';

    const success = await addProductToCart(id);

    button.disabled = false;
    button.textContent = 'Adicionar';

    if (!success) {
        alert('Não foi possível adicionar o produto ao carrinho.');
        return;
    }

    await updateCartCount();
    openCartModal(name);
});

// Catalog products & category filtering
let allProducts = [];
let selectedCategory = 'all';

const categoryFiltersContainer = document.getElementById('category-filters');

async function loadCategoriesFilter() {
    if (!categoryFiltersContainer) return;

    const { data: categories, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name', { ascending: true });

    if (error) {
        console.error('Erro ao carregar categorias para filtro:', error);
        return;
    }

    (categories || []).forEach(cat => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.category = cat.id;
        btn.textContent = cat.name;
        btn.className =
            'category-btn bg-white text-gray-700 border border-orange-200 px-5 py-2 rounded-full text-sm font-medium hover:border-coral hover:text-coral transition';
        categoryFiltersContainer.appendChild(btn);
    });
}

function updateFilterButtonsState() {
    if (!categoryFiltersContainer) return;

    categoryFiltersContainer.querySelectorAll('.category-btn').forEach(btn => {
        const isActive = btn.dataset.category === selectedCategory;

        if (isActive) {
            btn.className =
                'category-btn bg-coral text-white px-5 py-2 rounded-full text-sm font-medium transition btn-hover';
        } else {
            btn.className =
                'category-btn bg-white text-gray-700 border border-orange-200 px-5 py-2 rounded-full text-sm font-medium hover:border-coral hover:text-coral transition';
        }
    });
}

function renderProducts(productsToRender) {
    const productsContainer = document.getElementById('products-container');
    if (!productsContainer) return;

    productsContainer.innerHTML = '';

    if (!productsToRender || productsToRender.length === 0) {
        productsContainer.innerHTML = `
            <p class="col-span-full text-center text-gray-500 py-8">
                Nenhum produto encontrado nessa categoria.
            </p>
        `;
        return;
    }

    productsToRender.forEach(product => {
        const isInStock = product.availability === 'in_stock' && product.stock_quantity > 0;
        const availabilityBadge = isInStock
            ? `<span class="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700">Pronta entrega</span>`
            : `<span class="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-orange-100 text-orange-700">Sob encomenda</span>`;

        const categoryBadge = product.categories?.name
            ? `<span class="inline-block text-xs font-medium px-3 py-1 rounded-full bg-rose text-gray-700 border border-orange-200">${product.categories.name}</span>`
            : '';

        const productCard = document.createElement('div');
        productCard.className =
            'bg-white rounded-3xl overflow-hidden shadow-lg card-hover p-4';

        productCard.innerHTML = `
            <img
                src="${product.image_url}"
                alt="${product.name}"
                class="w-full h-72 object-cover rounded-2xl mb-4">

            <div class="flex flex-wrap gap-2 mb-3">
                ${availabilityBadge}
                ${categoryBadge}
            </div>

            <h3 class="text-2xl font-bold text-gray-800 mb-2">
                ${product.name}
            </h3>

            <p class="text-gray-600 mb-4">
                ${product.description}
            </p>

            <div class="flex justify-between items-center">
                <span class="text-2xl font-bold text-coral">
                    R$ ${Number(product.base_price).toFixed(2).replace('.', ',')}
                </span>

                <button class="add-cart bg-coral text-white px-5 py-2 rounded-full hover:opacity-90 transition btn-hover"
                    data-id="${product.id}"
                    data-name="${product.name}"
                    data-price="${product.base_price}">
                    Adicionar
                </button>
            </div>
        `;

        productsContainer.appendChild(productCard);
    });

    lucide.createIcons();
}

async function loadProducts() {
    const productsContainer = document.getElementById('products-container');
    if (!productsContainer) return;

    const { data: products, error } = await supabase
        .from('products')
        .select(`
            *,
            categories (
                id,
                name
            )
        `);

    if (error) {
        console.error('Erro ao buscar produtos:', error);
        productsContainer.innerHTML = `
            <p class="col-span-full text-center text-red-500">
                Não foi possível carregar os produtos.
            </p>
        `;
        return;
    }

    allProducts = products || [];
    renderProducts(allProducts);
}

if (categoryFiltersContainer) {
    categoryFiltersContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.category-btn');
        if (!btn) return;

        selectedCategory = btn.dataset.category;
        updateFilterButtonsState();

        if (selectedCategory === 'all') {
            renderProducts(allProducts);
        } else {
            const filtered = allProducts.filter(
                product =>String(product.category_id) === String(selectedCategory)
            );
            renderProducts(filtered);
        }
    });
}

// Footer admin menu
async function renderAdminMenu() {
    const adminSection = document.getElementById('admin-section');
    if (!adminSection) return;

    const { data: { session } } = await supabase.auth.getSession();

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
                <li class="pt-2">
                    <button onclick="logoutAdmin()" class="text-red-400 hover:text-red-600 transition-colors flex items-center gap-2 w-full text-left font-medium">
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

    lucide.createIcons();
}

window.logoutAdmin = async function () {
    await supabase.auth.signOut();
    window.location.reload();
};

loadCategoriesFilter();
loadProducts();
updateCartCount();
renderAdminMenu();