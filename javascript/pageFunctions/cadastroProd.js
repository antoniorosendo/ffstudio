import { supabase } from '../database/supaBase.js';

lucide.createIcons();

const productForm = document.getElementById('product-form');
const submitButton = productForm.querySelector('button[type="submit"]');

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const originalButtonContent = submitButton.innerHTML;
    submitButton.innerHTML = '<i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Salvando...';
    submitButton.disabled = true;
    lucide.createIcons();

    const name = document.getElementById('name').value;
    const description = document.getElementById('description').value;
    const base_price = parseFloat(document.getElementById('base_price').value);
    const stock_quantity = parseInt(document.getElementById('stock_quantity').value, 10);
    
    const fileInput = document.getElementById('image_file');
    const file = fileInput.files[0];

    try {
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

        // 3. Salvar o produto no banco com o estoque
        const { error: insertError } = await supabase
            .from('products')
            .insert([{
                name: name,
                description: description,
                base_price: base_price,
                stock_quantity: stock_quantity,
                image_url: imageUrl,
                is_active: true
            }]);

        if (insertError) throw insertError;

        alert("Produto e imagem cadastrados com sucesso!");
        productForm.reset();

    } catch (error) {
        console.error("Erro durante o processo:", error);
        alert("Ops! Ocorreu um erro ao salvar o produto ou a imagem.");
    } finally {
        submitButton.innerHTML = originalButtonContent;
        submitButton.disabled = false;
        lucide.createIcons();
    }
});