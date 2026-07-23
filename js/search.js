/* ==========================================================================
   أونلاين كشك - Real-Time Dynamic Search Engine Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q') || '';

    const queryLabel = document.getElementById('searchQueryLabel');
    if (queryLabel) queryLabel.innerText = query || 'الكل';

    if (!query.trim()) {
        showNoResults();
        return;
    }

    let client = window.supabaseClient;
    if (!client && window.supabase) {
        client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    if (client) {
        await executeSearchQuery(client, query.trim());
    }
});

async function executeSearchQuery(client, query) {
    const spinner = document.getElementById('searchSpinner');
    const grid = document.getElementById('searchResultsGrid');
    const countBadge = document.getElementById('resultsCountBadge');

    try {
        const { data: products, error } = await client
            .from('products')
            .select('*')
            .or(`title.ilike.%${query}%,store_name.ilike.%${query}%,category.ilike.%${query}%,description.ilike.%${query}%`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (spinner) spinner.classList.add('d-none');

        if (products && products.length > 0) {
            if (countBadge) countBadge.innerText = `${products.length} نتيجة متوفرة`;
            
            grid.innerHTML = products.map(prod => `
                <div class="col">
                    <div class="new-light-card p-3 rounded-4 text-center border-0 h-100 d-flex flex-column justify-content-between">
                        <span class="card-discount-badge">-${prod.discount_percentage || 10}%</span>
                        <div class="card-img-container mb-2 overflow-hidden rounded-3" style="height: 160px;">
                            <a href="product.html?id=${prod.id}">
                                <img src="${prod.image_url}" alt="${prod.title}" class="card-uniform-img w-100 h-100 object-fit-cover rounded-3" onerror="this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300'">
                            </a>
                        </div>
                        <div class="text-start">
                            <h6 class="fw-bold fs-8 text-dark mb-1 text-truncate">
                                <a href="product.html?id=${prod.id}" class="text-dark text-decoration-none">${prod.title}</a>
                            </h6>
                            <small class="text-muted fs-8 d-block mb-1">${prod.category || 'عرض'}</small>
                            <div class="d-flex align-items-center gap-2 mb-2">
                                <span class="fw-extrabold text-purple fs-7">${prod.discount_price} ج.م</span>
                                <span class="text-muted text-decoration-line-through fs-8">${prod.original_price} ج.م</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center border-top border-purple-subtle pt-2">
                                <span class="fw-bold fs-8 text-dark">${prod.store_name}</span>
                                <a href="product.html?id=${prod.id}" class="card-arrow-btn"><i class="bi bi-arrow-left-short fs-5"></i></a>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');

            grid.classList.remove('d-none');
        } else {
            showNoResults();
        }

    } catch (err) {
        console.error('Search Error:', err.message);
        showNoResults();
    }
}

function showNoResults() {
    const spinner = document.getElementById('searchSpinner');
    const noResults = document.getElementById('noResultsBox');
    const countBadge = document.getElementById('resultsCountBadge');

    if (spinner) spinner.classList.add('d-none');
    if (noResults) noResults.classList.remove('d-none');
    if (countBadge) countBadge.innerText = '0 نتائج';
}