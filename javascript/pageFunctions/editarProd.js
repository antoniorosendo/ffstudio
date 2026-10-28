import { supabase } from '../database/supaBase.js';

lucide.createIcons();

const productForm = document.getElementById('product-form');
const submitButton = productForm.querySelector('button[type="submit"]');

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

//Carrega os dados atuais do produto para preencher o formulário
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

    document.getElementById('name').value = data.name;
    document.getElementById('description').value = data.description;
    document.getElementById('base_price').value = data.base_price;
    document.getElementById('stock_quantity').value = data.stock_quantity ?? 1;
}

carregarProduto();

//Atualiza o produto no banco
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const originalButtonContent = submitButton.innerHTML;
    submitButton.innerHTML = '<i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Atualizando...';
    submitButton.disabled = true;
    lucide.createIcons();

    const name = document.getElementById('name').value;
    const description = document.getElementById('description').value;
    const base_price = parseFloat(document.getElementById('base_price').value);
    const stock_quantity = parseInt(document.getElementById('stock_quantity').value, 10);
    const fileInput = document.getElementById('image_file');

    let updateData = {
        name: name,
        description: description,
        base_price: base_price,
        stock_quantity: stock_quantity
    };

    try {
        //Faz o upload apenas se uma nova foto foi selecionada
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