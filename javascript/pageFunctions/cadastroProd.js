import { supabase } from '../database/supaBase.js';

lucide.createIcons();

const productForm = document.getElementById('product-form');
const submitButton = productForm.querySelector('button[type="submit"]');

// Campos de disponibilidade e estoque
const availabilitySelect = document.getElementById('availability');
const stockInput = document.getElementById('stock_quantity');
const stockField = document.getElementById('stock-field') || stockInput.parentElement;

// Mostra o campo de estoque só para "pronta entrega"
function toggleAvailabilityFields() {
    const inStock = availabilitySelect.value === 'in_stock';
    stockField.classList.toggle('hidden', !inStock);
}

const categorySelect = document.getElementById('category_id');

async function loadCategories() {
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

    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        categorySelect.appendChild(option);
    });
}

loadCategories();

availabilitySelect.addEventListener('change', toggleAvailabilityFields);
toggleAvailabilityFields();

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const originalButtonContent = submitButton.innerHTML;
    submitButton.innerHTML = '<i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Salvando...';
    submitButton.disabled = true;
    lucide.createIcons();

    const name = document.getElementById('name').value;
    const description = document.getElementById('description').value;
    const base_price = parseFloat(document.getElementById('base_price').value);
    const category_id = categorySelect.value || null;

    // Sob encomenda -> estoque 0. Pronta entrega -> quantidade informada (mínimo 1)
    const availability = availabilitySelect.value;
    const stock_quantity = availability === 'in_stock'
        ? Math.max(1, parseInt(stockInput.value, 10) || 1)
        : 0;

    const fileInput = document.getElementById('image_file');
    const file = fileInput.files[0];

    try {
        if (!file) {
            alert('Selecione uma imagem para o produto.');
            return;
        }

        // 1. Upload da imagem para o Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `produtos/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('imagens')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 2. Obter a URL pública
        const { data: publicUrlData } = supabase.storage
            .from('imagens')
            .getPublicUrl(filePath);

        const imageUrl = publicUrlData.publicUrl;

        // 3. Salvar o produto no banco
        const { error: insertError } = await supabase
            .from('products')
            .insert([{
                name: name,
                description: description,
                base_price: base_price,
                availability: availability,
                category_id: category_id,
                stock_quantity: stock_quantity,
                image_url: imageUrl,
                is_active: true
            }]);

        if (insertError) throw insertError;

        alert("Produto e imagem cadastrados com sucesso!");
        productForm.reset();
        toggleAvailabilityFields(); // o reset volta o select para "sob encomenda"

    } catch (error) {
        console.error("Erro durante o processo:", error);
        alert("Ops! Ocorreu um erro ao salvar o produto ou a imagem.");
    } finally {
        submitButton.innerHTML = originalButtonContent;
        submitButton.disabled = false;
        lucide.createIcons();
    }
});