document.addEventListener('DOMContentLoaded', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Update site name
    document.getElementById('site-name').textContent = new URL(tab.url).hostname;

    // Get products from content script
    loadProducts();

    // Button handlers
    document.getElementById('rescan-btn').addEventListener('click', async () => {
        chrome.tabs.sendMessage(tab.id, { type: 'RESCAN' }, loadProducts);
    });

    document.getElementById('learn-btn').addEventListener('click', async () => {
        chrome.tabs.sendMessage(tab.id, { type: 'START_LEARN_MODE' });
        window.close();
    });

    document.getElementById('export-btn').addEventListener('click', async () => {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PRODUCTS' });
        const json = JSON.stringify(response.products, null, 2);
        await navigator.clipboard.writeText(json);

        const btn = document.getElementById('export-btn');
        btn.innerHTML = '<span>✓</span> Copied!';
        setTimeout(() => btn.innerHTML = '<span>📋</span> Copy Products JSON', 2000);
    });

    async function loadProducts() {
        try {
            const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PRODUCTS' });
            displayProducts(response.products || []);
        } catch (e) {
            displayProducts([]);
        }
    }

    function displayProducts(products) {
        // Update stats
        document.getElementById('total-count').textContent = products.length;
        document.getElementById('high-count').textContent = products.filter(p => p.confidence >= 0.7).length;
        document.getElementById('price-count').textContent = products.filter(p => p.price > 0).length;

        // Update list
        const list = document.getElementById('products-list');

        if (products.length === 0) {
            list.innerHTML = `
                <div class="empty">
                    <div class="empty-icon">📦</div>
                    <p>No products detected</p>
                    <p style="font-size:11px;margin-top:8px;">Try Learn Mode for custom sites</p>
                </div>
            `;
            return;
        }

        list.innerHTML = products.slice(0, 20).map(p => `
            <div class="product-item">
                ${p.image ? `<img class="product-img" src="${p.image}" onerror="this.style.display='none'">` : '<div class="product-img"></div>'}
                <div class="product-info">
                    <div class="product-name" title="${p.name}">${p.name}</div>
                    <div class="product-price">${p.price > 0 ? '$' + p.price.toFixed(2) : 'No price'}</div>
                </div>
                <span class="product-confidence ${getConfidenceClass(p.confidence)}">
                    ${Math.round(p.confidence * 100)}%
                </span>
            </div>
        `).join('');

        if (products.length > 20) {
            list.innerHTML += `<div class="product-item" style="justify-content:center;color:#666;">
                +${products.length - 20} more products
            </div>`;
        }
    }

    function getConfidenceClass(confidence) {
        if (confidence >= 0.7) return 'high';
        if (confidence >= 0.4) return 'medium';
        return 'low';
    }
});
