import { supabase } from '../database/supaBase.js';

lucide.createIcons();

const productForm = document.getElementById('product-form');
const submitButton = productForm.querySelector('button[type="submit"]');

const categorySelect = document.getElementById('category_id');
const availabilitySelect = document.getElementById('availability');
const stockInput = document.getElementById('stock_quantity');
const stockField = document.getElementById('stock-field') || stockInput.parentElement;

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

function toggleAvailabilityFields() {
    const isInStock = availabilitySelect.value === 'in_stock';
    stockField.classList.toggle('hidden', !isInStock);
}

availabilitySelect.addEventListener('change', toggleAvailabilityFields);

async function loadCategories(selectedCategoryId = '') {
    if (!categorySelect) return;

    const { data: categories, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name', { ascending: true });

    if (error) {
        console.error('Erro ao carregar categorias:', error);
        categorySelect.innerHTML = '<option value="">Erro ao carregar categorias</option>';
        return;
    }

    categorySelect.innerHTML = '<option value="">Selecione uma categoria</option>';

    (categories || []).forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        if (String(cat.id) === String(selectedCategoryId)) {
            option.selected = true;
        }
        categorySelect.appendChild(option);
    });
}

// Carrega os dados atuais do produto para preencher o formulário
async function carregarProduto() {
    if (!productId) {
        alert('Produto não especificado!');
        window.location.href = 'gerenciaProd.html';
        return;
    }

    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

    if (error || !data) {
        console.error('Erro ao buscar produto:', error);
        alert('Erro ao carregar os dados do produto.');
        window.location.href = 'gerenciaProd.html';
        return;
    }

    document.getElementById('name').value = data.name ?? '';
    document.getElementById('description').value = data.description ?? '';
    document.getElementById('base_price').value = data.base_price ?? '';

    availabilitySelect.value = data.availability || 'made_to_order';
    stockInput.value = data.stock_quantity ?? 0;

    await loadCategories(data.category_id);
    toggleAvailabilityFields();
}

carregarProduto();

// Atualiza o produto no banco
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const originalButtonContent = submitButton.innerHTML;
    submitButton.innerHTML = '<i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Atualizando...';
    submitButton.disabled = true;
    lucide.createIcons();

    const name = document.getElementById('name').value.trim();
    const description = document.getElementById('description').value.trim();
    const base_price = parseFloat(document.getElementById('base_price').value);
    const category_id = categorySelect.value ? Number(categorySelect.value) : null;
    const availability = availabilitySelect.value;
    const stock_quantity = availability === 'in_stock'
        ? Math.max(0, parseInt(stockInput.value, 10) || 0)
        : 0;

    const fileInput = document.getElementById('image_file');

    const updateData = {
        name: name,
        description: description,
        base_price: base_price,
        category_id: category_id,
        availability: availability,
        stock_quantity: stock_quantity
    };

    try {
        // Faz o upload apenas se uma nova foto foi selecionada
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `produtos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('imagens')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from('imagens')
                .getPublicUrl(filePath);

            updateData.image_url = publicUrlData.publicUrl;
        }

        const { error: updateError } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', productId);

        if (updateError) throw updateError;

        alert("Produto atualizado com sucesso!");
        window.location.href = 'gerenciaProd.html';

    } catch (error) {
        console.error("Erro na atualização:", error);
        alert("Ops! Ocorreu um erro ao atualizar o produto.");
    } finally {
        submitButton.innerHTML = originalButtonContent;
        submitButton.disabled = false;
        lucide.createIcons();
    }
});