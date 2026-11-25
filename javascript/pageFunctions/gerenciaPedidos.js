import { supabase } from '../database/supaBase.js';
import { renderFooter } from '../components/footer.js';

renderFooter({ isAdmin: true });

lucide.createIcons();

const tabelaPedidos = document.getElementById('tabela-pedidos');
const contadorPedidos = document.getElementById('contador-pedidos');
const buscaPedidoInput = document.getElementById('busca-pedido');
const statusFiltersContainer = document.getElementById('status-filters');

let allOrders = [];
let selectedStatus = 'all';
let searchQuery = '';

function formatCurrency(value) {
    return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getStatusBadge(status) {
    if (status === 'confirmed') {
        return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
            <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> Confirmado
        </span>`;
    }

    if (status === 'cancelled') {
        return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span> Cancelado
        </span>`;
    }

    return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
        <span class="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Pendente
    </span>`;
}

function updateFilterButtons() {
    if (!statusFiltersContainer) return;

    statusFiltersContainer.querySelectorAll('.status-btn').forEach(btn => {
        const isActive = btn.dataset.status === selectedStatus;
        btn.className = isActive
            ? 'status-btn bg-coral text-white px-4 py-2 rounded-full text-sm font-medium transition'
            : 'status-btn bg-white text-gray-700 border border-orange-200 px-4 py-2 rounded-full text-sm font-medium hover:border-coral hover:text-coral transition';
    });
}

function getFilteredOrders() {
    return allOrders.filter(order => {
        const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
        if (!matchesStatus) return false;

        const q = searchQuery.trim().toLowerCase();
        if (!q) return true;

        const customerName = (order.customer_name || '').toLowerCase();
        const customerPhone = (order.customer_phone || '').toLowerCase();
        const orderIdStr = String(order.id).toLowerCase();
        const itemsText = (order.order_items || [])
            .map(i => (i.products?.name || '').toLowerCase())
            .join(' ');

        return (
            customerName.includes(q) ||
            customerPhone.includes(q) ||
            orderIdStr.includes(q) ||
            itemsText.includes(q)
        );
    });
}

function renderOrders() {
    if (!tabelaPedidos) return;

    const filtered = getFilteredOrders();
    tabelaPedidos.innerHTML = '';

    if (contadorPedidos) {
        const plural = filtered.length === 1 ? 'pedido' : 'pedidos';
        contadorPedidos.textContent = `Mostrando ${filtered.length} ${plural}`;
    }

    if (filtered.length === 0) {
        tabelaPedidos.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">Nenhum pedido encontrado.</td></tr>';
        return;
    }

    filtered.forEach(order => {
        const items = order.order_items || [];
        const calculatedTotal = items.length > 0
            ? items.reduce((sum, item) => sum + (Number(item.unit_price) * Number(item.quantity)), 0)
            : Number(order.total_amount || 0);

        const itemsSummary = items.length > 0
            ? items.map(item => `${item.quantity}x ${item.products?.name || 'Peça'}`).join(', ')
            : 'Sem itens';

        const shortId = String(order.id).slice(0, 8);

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-orange-50/30 transition-colors';

        tr.innerHTML = `
            <td class="px-6 py-4">
                <p class="font-bold text-gray-800">#${shortId}</p>
                <p class="text-xs text-gray-500">${formatDate(order.created_at)}</p>
            </td>
            <td class="px-6 py-4 text-sm">
                <p class="font-semibold text-gray-800">${order.customer_name || 'Prévia via WhatsApp'}</p>
                <p class="text-xs text-gray-500">${order.customer_phone || 'Sem telefone informado'}</p>
            </td>
            <td class="px-6 py-4 text-sm text-gray-700 max-w-xs">
                <p class="line-clamp-2">${itemsSummary}</p>
                ${order.notes ? `<p class="text-xs text-coral mt-1 truncate" title="${order.notes}">Obs: ${order.notes}</p>` : ''}
            </td>
            <td class="px-6 py-4 font-bold text-coral whitespace-nowrap">
                ${formatCurrency(calculatedTotal)}
            </td>
            <td class="px-6 py-4 text-center whitespace-nowrap">
                ${getStatusBadge(order.status)}
            </td>
            <td class="px-6 py-4 text-right whitespace-nowrap">
                <div class="flex justify-end gap-2">
                    <button onclick="openOrderEditor('${order.id}')"
                        class="px-3 py-1.5 rounded-lg bg-orange-50 text-coral hover:bg-coral hover:text-white transition text-xs font-semibold flex items-center gap-1"
                        title="Revisar e editar pedido">
                        <i data-lucide="square-pen" class="w-4 h-4"></i>
                        Revisar
                    </button>
                    ${order.status !== 'confirmed' ? `
                        <button onclick="quickUpdateStatus('${order.id}', 'confirmed')"
                            class="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="Confirmar pedido">
                            <i data-lucide="check" class="w-4 h-4"></i>
                        </button>
                    ` : ''}
                    ${order.status !== 'cancelled' ? `
                        <button onclick="quickUpdateStatus('${order.id}', 'cancelled')"
                            class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Cancelar pedido">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        `;

        tabelaPedidos.appendChild(tr);
    });

    lucide.createIcons();
}

async function adjustStockForOrder(order, nextStatus) {
    const items = order.order_items || [];
    const wasDeducted = Boolean(order.stock_deducted);

    if (nextStatus === 'confirmed' && !wasDeducted) {
        for (const item of items) {
            const product = item.products;
            if (!product || product.availability !== 'in_stock') continue;

            const currentStock = Number(product.stock_quantity ?? 0);
            const newStock = Math.max(0, currentStock - Number(item.quantity || 0));

            const { error } = await supabase
                .from('products')
                .update({ stock_quantity: newStock })
                .eq('id', item.product_id);

            if (error) throw error;
        }
        return true;
    }

    if (nextStatus === 'cancelled' && wasDeducted) {
        for (const item of items) {
            const product = item.products;
            if (!product || product.availability !== 'in_stock') continue;

            const currentStock = Number(product.stock_quantity ?? 0);
            const restoredStock = currentStock + Number(item.quantity || 0);

            const { error } = await supabase
                .from('products')
                .update({ stock_quantity: restoredStock })
                .eq('id', item.product_id);

            if (error) throw error;
        }
        return false;
    }

    return wasDeducted;
}

window.quickUpdateStatus = async function (orderId, nextStatus) {
    const order = allOrders.find(o => String(o.id) === String(orderId));
    if (!order) return;

    const label = nextStatus === 'confirmed' ? 'confirmar' : 'cancelar';
    if (!confirm(`Deseja realmente ${label} este pedido?`)) return;

    try {
        const nextStockDeducted = await adjustStockForOrder(order, nextStatus);

        const { error } = await supabase
            .from('orders')
            .update({
                status: nextStatus,
                stock_deducted: nextStockDeducted,
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

        if (error) throw error;

        await loadOrders();
    } catch (err) {
        console.error('Erro ao atualizar status do pedido:', err);
        alert('Não foi possível atualizar o status do pedido.');
    }
};

window.openOrderEditor = function (orderId) {
    window.location.href = `editarPedido.html?id=${orderId}`;
};

async function loadOrders() {
    if (!tabelaPedidos) return;
    tabelaPedidos.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">Carregando pedidos...</td></tr>';

    const { data, error } = await supabase
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
                    availability,
                    stock_quantity
                )
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao buscar pedidos:', error);
        tabelaPedidos.innerHTML = '<tr><td colspan="6" class="text-center text-red-500 py-8">Erro ao carregar os pedidos.</td></tr>';
        return;
    }

    allOrders = data || [];
    renderOrders();
}

if (statusFiltersContainer) {
    statusFiltersContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.status-btn');
        if (!btn) return;
        selectedStatus = btn.dataset.status;
        updateFilterButtons();
        renderOrders();
    });
}

if (buscaPedidoInput) {
    buscaPedidoInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderOrders();
    });
}

loadOrders();