import { supabase } from '../database/supaBase.js';
import { getVisitorId } from '../database/visitor.js';
const userId = getVisitorId();

lucide.createIcons();

const cartItemsContainer =
    document.getElementById('cart-items');

const emptyCart =
    document.getElementById('empty-cart');

const cartTotal =
    document.getElementById('cart-total');

function renderCart(cart) {
    cartItemsContainer.innerHTML = '';

    if (cart.length === 0) {
        emptyCart.classList.remove('hidden');
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

    cartTotal.textContent =
        `R$ ${total.toFixed(2).replace('.', ',')}`;

    updateWhatsappButton(cart);
}

async function updateCartItemQuantity(cartItemId, quantity) {

    if (quantity <= 0) {

        const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('id', cartItemId);

        if (error) {
            console.error('Erro ao remover item:', error);
            return false;
        }

    } else {

        const { error } = await supabase
            .from('cart_items')
            .update({
                quantity: quantity
            })
            .eq('id', cartItemId);

        if (error) {
            console.error(
                'Erro ao atualizar quantidade:',
                error
            );

            return false;
        }
    }

    return true;
}

async function increaseQuantity(cartItemId) {

    const cart = await getUserCart();

    if (!cart) return;

    const items = await getCartItems(cart.id);

    const item = items.find(
        item => item.id === cartItemId
    );

    if (!item) return;

    const product = item.products;
    if (product.availability === 'in_stock' && item.quantity + 1 > product.stock_quantity) {
        alert(`Só temos ${product.stock_quantity} unidade(s) em pronta entrega.`);
        return;
    }

    const success = await updateCartItemQuantity(
        cartItemId,
        item.quantity + 1
    );

    if (success) {
        await loadCart();
    }
}

async function decreaseQuantity(cartItemId) {

    const cart = await getUserCart();

    if (!cart) return;

    const items = await getCartItems(cart.id);

    const item = items.find(
        item => item.id === cartItemId
    );

    if (!item) return;

    const success = await updateCartItemQuantity(
        cartItemId,
        item.quantity - 1
    );

    if (success) {
        await loadCart();
    }
}

async function removeItem(cartItemId) {

    const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);

    if (error) {

        console.error(
            'Erro ao remover produto:',
            error
        );

        return;
    }

    await loadCart();
}

function updateWhatsappButton(cart) {
    // const phone = "5511939288314";
    const phone = "5514988082038";

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

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;

    const whatsappButton = document.getElementById('whatsapp-btn');
    if (whatsappButton) {
        whatsappButton.href = whatsappUrl;
    }
}

async function getUserCart() {
    const userId = getVisitorId();

    const { data, error } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {

        console.error(
            'Erro ao buscar carrinho:',
            error
        );

        return null;
    }

    return data;
}

async function getCartItems(cartId) {

    const { data, error } = await supabase
        .from('cart_items')
        .select(`
            id,
            quantity,
            product_id,
            products (
                id,
                name,
                description,
                base_price,
                image_url,
                availability, 
                stock_quantity
            )
        `)
        .eq('cart_id', cartId);

    if (error) {

        console.error(
            'Erro ao buscar itens do carrinho:',
            error
        );

        return [];
    }

    return data;
}

async function loadCart() {

    const cart = await getUserCart();

    // Usuário não possui carrinho
    if (!cart) {
        renderCart([]);
        return;
    }

    console.log('Carrinho encontrado:', cart.id);

    const cartItems = await getCartItems(cart.id);

    console.log('Itens encontrados:', cartItems);

    const items = cartItems.map(item => ({
        cartItemId: item.id,
        productId: item.product_id,
        name: item.products.name,
        price: Number(item.products.base_price),
        quantity: item.quantity,
        image_url: item.products.image_url
    }));

    renderCart(items);
}

window.removeItem = removeItem;
window.increaseQuantity = increaseQuantity;
window.decreaseQuantity = decreaseQuantity;

loadCart();