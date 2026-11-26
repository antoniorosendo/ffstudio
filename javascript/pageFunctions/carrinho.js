import { supabase } from '../database/supaBase.js';
import { getVisitorId } from '../database/visitor.js';
import { renderFooter } from '../components/footer.js';

renderFooter({ isAdmin: false });

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

const cartItemsContainer = document.getElementById('cart-items');
const emptyCart = document.getElementById('empty-cart');
const cartTotal = document.getElementById('cart-total');
const whatsappButton = document.getElementById('whatsapp-btn');

let currentCartItems = [];
let isCreatingOrder = false;

const orderModal = document.getElementById('order-modal');
const closeOrderModalBtn = document.getElementById('close-order-modal');
const closeOrderModalActionBtn = document.getElementById('close-order-modal-btn');
const orderModalTitle = document.getElementById('order-modal-title');
const orderModalMessage = document.getElementById('order-modal-message');
const orderModalWhatsappLink = document.getElementById('order-modal-whatsapp-link');
const orderModalIconBox = document.getElementById('order-modal-icon-box');
const orderModalIconSlot = document.getElementById('order-modal-icon-slot');

function openOrderModal({ title, message, whatsappUrl, isError = false }) {
    if (!orderModal) return;

    if (orderModalTitle) orderModalTitle.textContent = title;
    if (orderModalMessage) orderModalMessage.textContent = message;

    if (orderModalWhatsappLink) {
        if (whatsappUrl) {
            orderModalWhatsappLink.href = whatsappUrl;
            orderModalWhatsappLink.classList.remove('hidden');
        } else {
            orderModalWhatsappLink.classList.add('hidden');
        }
    }

    if (orderModalIconBox && orderModalIconSlot) {
        if (isError) {
            orderModalIconBox.className = 'w-16 h-16 mx-auto mb-5 rounded-full bg-red-50 flex items-center justify-center';
            orderModalIconSlot.innerHTML = '<i data-lucide="alert-circle" class="w-8 h-8 text-red-500"></i>';
        } else {
            orderModalIconBox.className = 'w-16 h-16 mx-auto mb-5 rounded-full bg-green-50 flex items-center justify-center';
            orderModalIconSlot.innerHTML = '<i data-lucide="check-circle-2" class="w-8 h-8 text-green"></i>';
        }
    }

    orderModal.classList.remove('hidden');
    orderModal.classList.add('flex');
    document.body.classList.add('overflow-hidden');
    lucide.createIcons();
}

function closeOrderModal() {
    if (!orderModal) return;
    orderModal.classList.add('hidden');
    orderModal.classList.remove('flex');
    document.body.classList.remove('overflow-hidden');
}

if (closeOrderModalBtn) closeOrderModalBtn.addEventListener('click', closeOrderModal);
if (closeOrderModalActionBtn) closeOrderModalActionBtn.addEventListener('click', closeOrderModal);

if (orderModal) {
    orderModal.addEventListener('click', (e) => {
        if (e.target === orderModal) {
            closeOrderModal();
        }
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && orderModal && !orderModal.classList.contains('hidden')) {
        closeOrderModal();
    }
});

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

async function getCartItems(cartId) {
    const { data, error } = await supabase
        .from('cart_items')
        .select(`
            id,
            product_id,
            quantity,
            products (
                id,
                name,
                base_price,
                image_url,
                availability
            )
        `)
        .eq('cart_id', cartId)
        .order('id', { ascending: true });

    if (error) {
        console.error('Erro ao buscar itens do carrinho:', error);
        return [];
    }

    return data || [];
}

function buildWhatsappUrl(cart) {
    const phone = "5511939288314";

    let total = 0;
    let itemsText = "";

    cart.forEach(item => {
        const subtotal = item.price * item.quantity;
        total += subtotal;

        const priceFormatted = subtotal.toFixed(2).replace('.', ',');
        itemsText += `- ${item.name} - ${item.quantity}un. (R$ ${priceFormatted})\n`;
    });

    const totalFormatted = total.toFixed(2).replace('.', ',');

    const part1 = encodeURIComponent("Oi, *FF Studio*! Tudo bem? ");
    const part2 = encodeURIComponent("\n\nMontei meu carrinho no site e tenho interesse neste(s) item(ns):\n" + itemsText + "\n");
    const part3 = encodeURIComponent(` *Valor Total:* R$ ${totalFormatted}\nGostaria de mais informações sobre o pagamento, entrega e personalização! `);

    const encodedMessage =
        part1 + "%F0%9F%A7%B6" +
        part2 +
        "%E2%9C%A8" + part3 + "%F0%9F%A7%A1";

    return `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;
}

function updateWhatsappButton(cart) {
    if (!whatsappButton) return;

    if (!cart || cart.length === 0) {
        whatsappButton.href = "#";
        whatsappButton.removeAttribute('target');
        whatsappButton.removeAttribute('rel');
        whatsappButton.classList.add('opacity-50', 'pointer-events-none');
        return;
    }

    whatsappButton.classList.remove('opacity-50', 'pointer-events-none');
    whatsappButton.href = buildWhatsappUrl(cart);
    whatsappButton.target = "_blank";
    whatsappButton.rel = "noopener noreferrer";
}

async function createOrderPreview(cart) {
    if (!cart || cart.length === 0) return null;

    const userId = getVisitorId();
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: userId,
            status: 'pending',
            total_amount: Number(totalAmount.toFixed(2)),
            stock_deducted: false
        })
        .select('id')
        .single();

    if (orderError || !order) {
        console.error('Erro ao criar prévia do pedido:', orderError);
        throw orderError || new Error('Falha ao criar pedido');
    }

    const orderItemsPayload = cart.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price
    }));

    const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsPayload);

    if (itemsError) {
        console.error('Erro ao salvar itens da prévia do pedido:', itemsError);
        throw itemsError;
    }

    return order.id;
}

if (whatsappButton) {
    whatsappButton.addEventListener('click', async (e) => {
        if (!currentCartItems || currentCartItems.length === 0) {
            e.preventDefault();
            return;
        }

        if (isCreatingOrder) {
            e.preventDefault();
            return;
        }

        e.preventDefault();
        isCreatingOrder = true;

        const originalContent = whatsappButton.innerHTML;
        whatsappButton.innerHTML = 'Registrando pedido...';
        whatsappButton.classList.add('pointer-events-none', 'opacity-80');

        const whatsappUrl = buildWhatsappUrl(currentCartItems);
        const whatsappTab = window.open('about:blank', '_blank');

        try {
            const cartId = await getOrCreateCart();
            const orderId = await createOrderPreview(currentCartItems);

            if (whatsappTab) {
                whatsappTab.location.href = whatsappUrl;
            } else {
                window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
            }

            if (orderId) {
                await clearCart(cartId);
                currentCartItems = [];
                renderCart([]);

                openOrderModal({
                    title: 'Pedido enviado para o WhatsApp!',
                    message: 'A prévia do seu pedido foi salva como pendente e o WhatsApp foi aberto em uma nova aba. Agora basta confirmar os detalhes por lá!',
                    whatsappUrl,
                    isError: false
                });
            } else {
                openOrderModal({
                    title: 'WhatsApp aberto, mas houve um aviso',
                    message: 'O WhatsApp foi aberto, porém não foi possível registrar a prévia no sistema. Confira o console.',
                    whatsappUrl,
                    isError: true
                });
            }
        } catch (err) {
            console.error('Falha ao registrar prévia do pedido:', err);
            if (whatsappTab) {
                whatsappTab.location.href = whatsappUrl;
            } else {
                window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
            }
            openOrderModal({
                title: 'Erro ao salvar a prévia',
                message: 'O WhatsApp foi aberto, mas ocorreu um erro ao salvar a prévia no banco. Verifique as políticas e colunas no console.',
                whatsappUrl,
                isError: true
            });
        } finally {
            whatsappButton.innerHTML = originalContent;
            whatsappButton.classList.remove('pointer-events-none', 'opacity-80');
            isCreatingOrder = false;
            lucide.createIcons();
        }
    });
}

function renderCart(cart) {
    cartItemsContainer.innerHTML = '';

    if (cart.length === 0) {
        emptyCart.classList.remove('hidden');
        cartTotal.textContent = 'R$ 0,00';
        updateWhatsappButton([]);
        return;
    }

    emptyCart.classList.add('hidden');

    let total = 0;

    cart.forEach(item => {
        const subtotal = item.price * item.quantity;
        total += subtotal;

        const product = document.createElement('div');
        product.className =
            'bg-white rounded-3xl shadow-lg p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4';

        const imageSrc = item.image_url || '/images/Logo_FFStudio_2.png';

        product.innerHTML = `
            <div class="flex items-center gap-4 sm:gap-5">
                <img
                    src="${imageSrc}"
                    alt="${item.name}"
                    class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shadow-sm shrink-0">

                <div>
                    <h3 class="text-xl sm:text-2xl font-bold text-gray-800">
                        ${item.name}
                    </h3>

                    <div class="flex items-center gap-3 mt-3">
                        <button onclick="decreaseQuantity('${item.cartItemId}')"
                            class="w-8 h-8 rounded-full bg-orange-100 text-coral font-bold hover:bg-orange-200 transition">
                            -
                        </button>

                        <span class="text-gray-700 font-semibold">
                            ${item.quantity}
                        </span>

                        <button onclick="increaseQuantity('${item.cartItemId}')"
                            class="w-8 h-8 rounded-full bg-orange-100 text-coral font-bold hover:bg-orange-200 transition">
                            +
                        </button>
                    </div>

                    <p class="text-coral font-bold text-xl mt-2">
                        R$ ${subtotal.toFixed(2).replace('.', ',')}
                    </p>
                </div>
            </div>

            <button onclick="removeItem('${item.cartItemId}')"
                class="bg-red-100 text-red-500 px-4 py-2 rounded-full hover:bg-red-200 transition self-end sm:self-center shrink-0">
                Remover
            </button>
        `;

        cartItemsContainer.appendChild(product);
    });

    cartTotal.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;

    updateWhatsappButton(cart);
}

async function loadCart() {
    const cartId = await getOrCreateCart();
    if (!cartId) return;

    const cartItems = await getCartItems(cartId);

    const items = cartItems
        .filter(item => item.products)
        .map(item => ({
            cartItemId: item.id,
            productId: item.product_id,
            name: item.products.name,
            price: Number(item.products.base_price),
            quantity: item.quantity,
            image_url: item.products.image_url,
            availability: item.products.availability
        }));

    currentCartItems = items;
    renderCart(items);
}

async function clearCart(cartId) {
    if (!cartId) return;

    const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cartId);

    if (error) {
        console.error('Erro ao limpar itens do carrinho:', error);
        throw error;
    }
}

window.increaseQuantity = async function (cartItemId) {
    const { data: item, error: selectError } = await supabase
        .from('cart_items')
        .select('quantity')
        .eq('id', cartItemId)
        .single();

    if (selectError || !item) return;

    const { error: updateError } = await supabase
        .from('cart_items')
        .update({ quantity: item.quantity + 1 })
        .eq('id', cartItemId);

    if (updateError) {
        console.error('Erro ao aumentar quantidade:', updateError);
        return;
    }

    loadCart();
};

window.decreaseQuantity = async function (cartItemId) {
    const { data: item, error: selectError } = await supabase
        .from('cart_items')
        .select('quantity')
        .eq('id', cartItemId)
        .single();

    if (selectError || !item) return;

    if (item.quantity <= 1) {
        await window.removeItem(cartItemId);
        return;
    }

    const { error: updateError } = await supabase
        .from('cart_items')
        .update({ quantity: item.quantity - 1 })
        .eq('id', cartItemId);

    if (updateError) {
        console.error('Erro ao diminuir quantidade:', updateError);
        return;
    }

    loadCart();
};

window.removeItem = async function (cartItemId) {
    const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);

    if (error) {
        console.error('Erro ao remover item:', error);
        return;
    }

    loadCart();
};

loadCart();