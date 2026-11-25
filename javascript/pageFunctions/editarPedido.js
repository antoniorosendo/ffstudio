import { supabase } from '../database/supaBase.js';
import { renderFooter } from '../components/footer.js';

renderFooter({ isAdmin: true });

lucide.createIcons();

const params = new URLSearchParams(window.location.search);
const orderId = params.get('id');

const orderForm = document.getElementById('order-form');
const submitButton = orderForm.querySelector('button[type="submit"]');
const orderSubtitle = document.getElementById('order-subtitle');

const customerNameInput = document.getElementById('customer_name');
const customerPhoneInput = document.getElementById('customer_phone');
const statusSelect = document.getElementById('status');
const paymentMethodInput = document.getElementById('payment_method');
const notesInput = document.getElementById('notes');

const addProductSelect = document.getElementById('add-product-select');
const addProductBtn = document.getElementById('add-product-btn');
const orderItemsList = document.getElementById('order-items-list');
const orderTotalDisplay = document.getElementById('order-total-display');

let catalogProducts = [];
let orderItemsState = []; // [{ tempId, id (se já existe no banco), product_id, name, image_url, unit_price, quantity }]
let currentOrderMeta = null;

function formatCurrency(value) {
    return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
}

function calculateTotal() {
    return orderItemsState.reduce(
        (sum, item) => sum + (Number(item.unit_price) * Number(item.quantity)),
        0
    );
}

function renderOrderItems() {
    if (!orderItemsList) return;
    orderItemsList.innerHTML = '';

    if (orderItemsState.length === 0) {
        orderItemsList.innerHTML = '<p class="text-center text-gray-500 py-6">Nenhum item neste pedido.</p>';
        if (orderTotalDisplay) orderTotalDisplay.textContent = formatCurrency(0);
        return;
    }

    orderItemsState.forEach((item, index) => {
        const subtotal = Number(item.unit_price) * Number(item.quantity);
        const imgSrc = item.image_url || '/images/Logo_FFStudio_2.png';

        const row = document.createElement('div');
        row.className = 'flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50/50';

        row.innerHTML = `
            <div class="flex items-center gap-4">
                <img src="${imgSrc}" alt="${item.name}" class="w-16 h-16 rounded-xl object-cover shrink-0">
                <div>
                    <p class="font-bold text-gray-800">${item.name}</p>
                    <p class="text-sm text-gray-500">Unitário: ${formatCurrency(item.unit_price)}</p>
                </div>
            </div>

            <div class="flex items-center justify-between sm:justify-end gap-4">
                <div class="flex items-center gap-2">
                    <button type="button" onclick="changeItemQty(${index}, -1)"
                        class="w-8 h-8 rounded-full bg-orange-100 text-coral font-bold hover:bg-orange-200 transition">-</button>
                    <span class="w-8 text-center font-semibold text-gray-800">${item.quantity}</span>
                    <button type="button" onclick="changeItemQty(${index}, 1)"
                        class="w-8 h-8 rounded-full bg-orange-100 text-coral font-bold hover:bg-orange-200 transition">+</button>
                </div>

                <span class="font-bold text-coral min-w-[95px] text-right">${formatCurrency(subtotal)}</span>

                <button type="button" onclick="removeOrderItem(${index})"
                    class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Remover item">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        `;

        orderItemsList.appendChild(row);
    });

    if (orderTotalDisplay) {
        orderTotalDisplay.textContent = formatCurrency(calculateTotal());
    }

    lucide.createIcons();
}

window.changeItemQty = function (index, delta) {
    const item = orderItemsState[index];
    if (!item) return;

    const nextQty = item.quantity + delta;
    if (nextQty <= 0) {
        orderItemsState.splice(index, 1);
    } else {
        item.quantity = nextQty;
    }

    renderOrderItems();
};

window.removeOrderItem = function (index) {
    orderItemsState.splice(index, 1);
    renderOrderItems();
};

addProductBtn?.addEventListener('click', () => {
    const selectedProductId = addProductSelect?.value;
    if (!selectedProductId) return;

    const product = catalogProducts.find(p => String(p.id) === String(selectedProductId));
    if (!product) return;

    const existingIndex = orderItemsState.findIndex(i => String(i.product_id) === String(product.id));
    if (existingIndex >= 0) {
        orderItemsState[existingIndex].quantity += 1;
    } else {
        orderItemsState.push({
            id: null,
            product_id: product.id,
            name: product.name,
            image_url: product.image_url,
            unit_price: Number(product.base_price),
            quantity: 1
        });
    }

    addProductSelect.value = '';
    renderOrderItems();
});

async function loadCatalogProducts() {
    const { data, error } = await supabase
        .from('products')
        .select('id, name, base_price, image_url')
        .order('name', { ascending: true });

    if (error) {
        console.error('Erro ao carregar produtos do catálogo:', error);
        return;
    }

    catalogProducts = data || [];
    if (!addProductSelect) return;

    addProductSelect.innerHTML = '<option value="">Adicionar peça do catálogo...</option>';
    catalogProducts.forEach(prod => {
        const opt = document.createElement('option');
        opt.value = prod.id;
        opt.textContent = `${prod.name} (${formatCurrency(prod.base_price)})`;
        addProductSelect.appendChild(opt);
    });
}

async function loadOrder() {
    if (!orderId) {
        alert('Pedido não especificado!');
        window.location.href = 'gerenciaPedidos.html';
        return;
    }

    await loadCatalogProducts();

    const { data: order, error } = await supabase
        .from('orders')
        .select(`
            *,
            order_items (
                id,
                product_id,
                quantity,
                unit_price,
                products (
                    id,
                    name,
                    image_url
                )
            )
        `)
        .eq('id', orderId)
        .single();

    if (error || !order) {
        console.error('Erro ao buscar pedido:', error);
        alert('Não foi possível carregar o pedido.');
        window.location.href = 'gerenciaPedidos.html';
        return;
    }

    currentOrderMeta = order;
    if (orderSubtitle) {
        orderSubtitle.textContent = `Pedido #${String(order.id).slice(0, 8)}`;
    }

    customerNameInput.value = order.customer_name || '';
    customerPhoneInput.value = order.customer_phone || '';
    statusSelect.value = order.status || 'pending';
    paymentMethodInput.value = order.payment_method || '';
    notesInput.value = order.notes || '';

    orderItemsState = (order.order_items || []).map(item => ({
        id: item.id,
        product_id: item.product_id,
        name: item.products?.name || 'Peça',
        image_url: item.products?.image_url || '',
        unit_price: Number(item.unit_price),
        quantity: Number(item.quantity)
    }));

    renderOrderItems();
}

async function syncStockOnSave(nextStatus) {
    const wasDeducted = Boolean(currentOrderMeta?.stock_deducted);
    const previousItems = currentOrderMeta?.order_items || [];

    // Busca os dados atuais dos produtos envolvidos para ajustar com segurança
    const productIds = Array.from(new Set([
        ...previousItems.map(i => i.product_id),
        ...orderItemsState.map(i => i.product_id)
    ]));

    if (productIds.length === 0) return wasDeducted;

    const { data: latestProducts, error } = await supabase
        .from('products')
        .select('id, availability, stock_quantity')
        .in('id', productIds);

    if (error) throw error;

    const productMap = new Map((latestProducts || []).map(p => [String(p.id), p]));

    // Caso 1: Pedido confirmado agora e ainda não teve estoque descontado
    if (nextStatus === 'confirmed' && !wasDeducted) {
        for (const item of orderItemsState) {
            const prod = productMap.get(String(item.product_id));
            if (!prod || prod.availability !== 'in_stock') continue;

            const currentStock = Number(prod.stock_quantity ?? 0);
            const updatedStock = Math.max(0, currentStock - Number(item.quantity));

            const { error: updErr } = await supabase
                .from('products')
                .update({ stock_quantity: updatedStock })
                .eq('id', item.product_id);

            if (updErr) throw updErr;
        }
        return true;
    }

    // Caso 2: Pedido estava confirmado (com estoque descontado) e agora foi cancelado -> estorna
    if (nextStatus === 'cancelled' && wasDeducted) {
        for (const item of previousItems) {
            const prod = productMap.get(String(item.product_id));
            if (!prod || prod.availability !== 'in_stock') continue;

            const currentStock = Number(prod.stock_quantity ?? 0);
            const restoredStock = currentStock + Number(item.quantity);

            const { error: updErr } = await supabase
                .from('products')
                .update({ stock_quantity: restoredStock })
                .eq('id', item.product_id);

            if (updErr) throw updErr;
        }
        return false;
    }

    return wasDeducted;
}

orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const originalButtonContent = submitButton.innerHTML;
    submitButton.innerHTML = '<i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Salvando...';
    submitButton.disabled = true;
    lucide.createIcons();

    const nextStatus = statusSelect.value;
    const totalAmount = Number(calculateTotal().toFixed(2));

    try {
        const nextStockDeducted = await syncStockOnSave(nextStatus);

        // Atualiza itens do pedido: substitui pelos itens atuais da revisão
        const { error: deleteItemsError } = await supabase
            .from('order_items')
            .delete()
            .eq('order_id', orderId);

        if (deleteItemsError) throw deleteItemsError;

        if (orderItemsState.length > 0) {
            const payloadItems = orderItemsState.map(item => ({
                order_id: orderId,
                product_id: item.product_id,
                quantity: Number(item.quantity),
                unit_price: Number(item.unit_price)
            }));

            const { error: insertItemsError } = await supabase
                .from('order_items')
                .insert(payloadItems);

            if (insertItemsError) throw insertItemsError;
        }

        const { error: updateOrderError } = await supabase
            .from('orders')
            .update({
                customer_name: customerNameInput.value.trim() || null,
                customer_phone: customerPhoneInput.value.trim() || null,
                status: nextStatus,
                payment_method: paymentMethodInput.value || null,
                notes: notesInput.value.trim() || null,
                total_amount: totalAmount,
                stock_deducted: nextStockDeducted,
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

        if (updateOrderError) throw updateOrderError;

        alert('Pedido atualizado com sucesso!');
        window.location.href = 'gerenciaPedidos.html';
    } catch (err) {
        console.error('Erro ao salvar alterações do pedido:', err);
        alert('Ocorreu um erro ao salvar o pedido. Confira o console.');
    } finally {
        submitButton.innerHTML = originalButtonContent;
        submitButton.disabled = false;
        lucide.createIcons();
    }
});

loadOrder();