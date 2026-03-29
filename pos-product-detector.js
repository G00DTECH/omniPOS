/**
 * Universal Product Detector v2.0
 * Robust product detection with confidence scoring and dynamic support
 */

const ProductDetector = {
    config: {
        minConfidence: 0.4,      // Minimum score to consider a product valid
        observeDynamic: true,    // Watch for dynamically added products
        debug: false
    },

    // Detection signals with weights
    signals: {
        // Data attributes (highest confidence)
        dataAttrs: {
            weight: 0.3,
            attrs: ['data-product-id', 'data-product', 'data-item-id', 'data-sku',
                    'data-id', 'data-article', 'data-pid', 'data-variant-id']
        },
        // Schema.org markup
        schema: {
            weight: 0.35,
            selectors: ['[itemtype*="Product"]', '[itemscope][itemtype*="schema.org"]']
        },
        // Price presence
        price: {
            weight: 0.2,
            patterns: [
                /[\$\€\£\¥\₹\₽\₩]\s*[\d,.\s]+/,           // Symbol prefix: $19.99
                /[\d,.\s]+\s*[\$\€\£\¥\₹\₽\₩]/,           // Symbol suffix: 19.99$
                /[\d]{1,3}(?:[,.\s]?\d{3})*(?:[.,]\d{2})?(?:\s*(?:USD|EUR|GBP|CAD|AUD|INR|JPY|CNY|RUB|KRW))/i,
                /(?:price|cost|amount)[:\s]*[\d,.]+/i     // "Price: 19.99"
            ]
        },
        // Add to cart button nearby
        cartButton: {
            weight: 0.15,
            patterns: [/add.?to.?cart/i, /buy.?now/i, /purchase/i, /add.?to.?bag/i, /add.?to.?basket/i]
        }
    },

    // Price extraction with international support
    pricePatterns: [
        { regex: /[\$]\s*([\d,]+\.?\d*)/,          currency: 'USD' },  // $19.99
        { regex: /[\€]\s*([\d\s]+,?\d*)/,          currency: 'EUR' },  // €19,99
        { regex: /[\£]\s*([\d,]+\.?\d*)/,          currency: 'GBP' },  // £19.99
        { regex: /[\¥]\s*([\d,]+)/,                currency: 'JPY' },  // ¥1999
        { regex: /[\₹]\s*([\d,]+\.?\d*)/,          currency: 'INR' },  // ₹1,999
        { regex: /([\d,]+\.?\d*)\s*(?:USD|dollars?)/i, currency: 'USD' },
        { regex: /([\d\s]+,?\d*)\s*(?:EUR|euros?)/i,   currency: 'EUR' },
        { regex: /([\d,]+\.?\d*)\s*(?:GBP|pounds?)/i,  currency: 'GBP' },
    ],

    // Scan entire page
    scan() {
        const candidates = new Map();

        // 1. Schema.org JSON-LD (most reliable)
        this.extractSchemaProducts(candidates);

        // 2. Microdata
        this.extractMicrodataProducts(candidates);

        // 3. DOM elements with signals
        this.extractDOMProducts(candidates);

        // 4. Score and filter
        const products = Array.from(candidates.values())
            .map(p => this.scoreProduct(p))
            .filter(p => p.confidence >= this.config.minConfidence)
            .sort((a, b) => b.confidence - a.confidence);

        // 5. Deduplicate by name+price similarity
        return this.deduplicate(products);
    },

    // Extract from JSON-LD structured data
    extractSchemaProducts(candidates) {
        document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
            try {
                const data = JSON.parse(script.textContent);
                const items = this.findSchemaProducts(data);
                items.forEach(item => {
                    const id = item.sku || item.productID || item.gtin || this.generateId(item.name);
                    candidates.set(id, {
                        id,
                        name: item.name,
                        price: this.parseSchemaPrice(item.offers),
                        currency: item.offers?.priceCurrency || 'USD',
                        sku: item.sku || '',
                        image: this.normalizeImage(item.image),
                        description: item.description || '',
                        source: 'schema-jsonld',
                        signals: { schema: true }
                    });
                });
            } catch (e) { this.log('JSON-LD parse error', e); }
        });
    },

    findSchemaProducts(data, results = []) {
        if (!data) return results;
        if (Array.isArray(data)) {
            data.forEach(item => this.findSchemaProducts(item, results));
        } else if (typeof data === 'object') {
            if (data['@type'] === 'Product' || data['@type']?.includes?.('Product')) {
                results.push(data);
            }
            if (data['@graph']) this.findSchemaProducts(data['@graph'], results);
            if (data.mainEntity) this.findSchemaProducts(data.mainEntity, results);
        }
        return results;
    },

    parseSchemaPrice(offers) {
        if (!offers) return 0;
        const offer = Array.isArray(offers) ? offers[0] : offers;
        return parseFloat(offer.price || offer.lowPrice || 0);
    },

    // Extract from microdata
    extractMicrodataProducts(candidates) {
        document.querySelectorAll('[itemtype*="Product"], [itemtype*="schema.org/Product"]').forEach(el => {
            const name = el.querySelector('[itemprop="name"]')?.textContent?.trim();
            const priceEl = el.querySelector('[itemprop="price"]');
            const price = parseFloat(priceEl?.content || priceEl?.textContent?.replace(/[^\d.]/g, '') || 0);
            const sku = el.querySelector('[itemprop="sku"]')?.content || '';
            const image = el.querySelector('[itemprop="image"]')?.src || el.querySelector('img')?.src || '';

            if (name) {
                const id = sku || this.generateId(name);
                candidates.set(id, {
                    id, name, price, sku, image,
                    currency: 'USD',
                    description: el.querySelector('[itemprop="description"]')?.textContent?.trim() || '',
                    source: 'microdata',
                    element: el,
                    signals: { schema: true }
                });
            }
        });
    },

    // Extract from DOM using heuristics
    extractDOMProducts(candidates) {
        const selectors = [
            '[data-product-id]', '[data-product]', '[data-item-id]', '[data-sku]',
            '[data-pid]', '[data-variant-id]', '[data-article-id]',
            '.product', '.product-item', '.product-card', '.product-tile',
            '.item', '.goods-item', '.merchandise',
            'article[class*="product"]', 'div[class*="product-card"]',
            'li[class*="product"]', '[data-testid*="product"]'
        ];

        const seen = new Set();
        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                if (seen.has(el)) return;
                seen.add(el);

                const product = this.extractFromElement(el);
                if (product && product.id && !candidates.has(product.id)) {
                    candidates.set(product.id, product);
                }
            });
        });
    },

    extractFromElement(el) {
        const signals = { dataAttrs: false, price: false, cartButton: false };

        // Check for data attributes
        const id = el.dataset.productId || el.dataset.product || el.dataset.itemId ||
                   el.dataset.sku || el.dataset.pid || el.dataset.id || el.dataset.articleId;
        if (id) signals.dataAttrs = true;

        // Find name
        const nameEl = el.querySelector('h1, h2, h3, h4, .name, .title, .product-name, .product-title, [class*="name"], [class*="title"]');
        const name = el.dataset.name || el.dataset.productName || nameEl?.textContent?.trim();
        if (!name || name.length < 2) return null;

        // Find price
        const { price, currency } = this.extractPrice(el);
        if (price > 0) signals.price = true;

        // Check for cart button
        const buttonText = Array.from(el.querySelectorAll('button, a, [role="button"]'))
            .map(b => b.textContent).join(' ');
        if (this.signals.cartButton.patterns.some(p => p.test(buttonText))) {
            signals.cartButton = true;
        }

        // Find image
        const img = el.querySelector('img');
        const image = el.dataset.image || img?.src || img?.dataset.src || '';

        return {
            id: id || this.generateId(name),
            name: name.substring(0, 200),
            price,
            currency,
            sku: el.dataset.sku || id || '',
            image: this.normalizeImage(image),
            description: el.dataset.description || el.querySelector('.description, [class*="desc"]')?.textContent?.trim()?.substring(0, 500) || '',
            source: 'dom',
            element: el,
            signals
        };
    },

    extractPrice(el) {
        // Check data attributes first
        if (el.dataset.price) {
            return { price: parseFloat(el.dataset.price), currency: el.dataset.currency || 'USD' };
        }

        // Find price elements
        const priceSelectors = ['.price', '[class*="price"]', '.cost', '.amount',
                                '[data-price]', '.sale-price', '.regular-price'];
        let priceText = '';
        for (const sel of priceSelectors) {
            const priceEl = el.querySelector(sel);
            if (priceEl) {
                priceText = priceEl.textContent;
                break;
            }
        }

        // Fallback to scanning element text
        if (!priceText) priceText = el.textContent;

        // Try each price pattern
        for (const { regex, currency } of this.pricePatterns) {
            const match = priceText.match(regex);
            if (match) {
                const value = match[1].replace(/[,\s]/g, '').replace(',', '.');
                return { price: parseFloat(value) || 0, currency };
            }
        }

        return { price: 0, currency: 'USD' };
    },

    // Calculate confidence score
    scoreProduct(product) {
        let score = 0;
        const breakdown = {};

        // Schema source gets high base score
        if (product.source === 'schema-jsonld' || product.source === 'microdata') {
            score += this.signals.schema.weight;
            breakdown.schema = this.signals.schema.weight;
        }

        // Data attributes signal
        if (product.signals?.dataAttrs) {
            score += this.signals.dataAttrs.weight;
            breakdown.dataAttrs = this.signals.dataAttrs.weight;
        }

        // Price signal
        if (product.price > 0) {
            score += this.signals.price.weight;
            breakdown.price = this.signals.price.weight;
        }

        // Cart button signal
        if (product.signals?.cartButton) {
            score += this.signals.cartButton.weight;
            breakdown.cartButton = this.signals.cartButton.weight;
        }

        // Bonus for having image
        if (product.image) {
            score += 0.05;
            breakdown.image = 0.05;
        }

        // Bonus for reasonable name length
        if (product.name?.length > 3 && product.name?.length < 150) {
            score += 0.05;
            breakdown.nameQuality = 0.05;
        }

        // Penalty for suspicious patterns
        if (product.name && /^[\d\s-]+$/.test(product.name)) {
            score -= 0.2; // Name is just numbers
            breakdown.penalty = -0.2;
        }

        return { ...product, confidence: Math.min(1, Math.max(0, score)), scoreBreakdown: breakdown };
    },

    // Remove duplicates based on name similarity
    deduplicate(products) {
        const unique = [];
        const seenNames = new Map();

        for (const product of products) {
            const normalizedName = product.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const key = `${normalizedName}-${product.price}`;

            if (!seenNames.has(key)) {
                seenNames.set(key, true);
                unique.push(product);
            }
        }

        return unique;
    },

    // Helpers
    generateId(name) {
        return name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50) + '-' + Date.now().toString(36) : null;
    },

    normalizeImage(img) {
        if (!img) return '';
        if (Array.isArray(img)) img = img[0];
        if (typeof img === 'object') img = img.url || img.contentUrl || '';
        return img;
    },

    log(...args) {
        if (this.config.debug) console.log('[ProductDetector]', ...args);
    },

    // Dynamic content observer
    observer: null,

    startObserving() {
        if (this.observer || !this.config.observeDynamic) return;

        this.observer = new MutationObserver((mutations) => {
            let shouldRescan = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1 && (
                            node.matches?.('[data-product-id], [data-product], .product, [itemtype*="Product"]') ||
                            node.querySelector?.('[data-product-id], [data-product], .product, [itemtype*="Product"]')
                        )) {
                            shouldRescan = true;
                            break;
                        }
                    }
                }
                if (shouldRescan) break;
            }

            if (shouldRescan) {
                clearTimeout(this.rescanTimeout);
                this.rescanTimeout = setTimeout(() => {
                    const products = this.scan();
                    document.dispatchEvent(new CustomEvent('products:updated', { detail: products }));
                }, 300);
            }
        });

        this.observer.observe(document.body, { childList: true, subtree: true });
    },

    stopObserving() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    },

    // Enhance products with POS attributes
    enhance(products) {
        products.forEach(p => {
            if (p.element && !p.element.hasAttribute('data-pos-product')) {
                p.element.setAttribute('data-pos-product', p.id);
                p.element.setAttribute('data-pos-name', p.name);
                p.element.setAttribute('data-pos-price', p.price);
                p.element.setAttribute('data-pos-sku', p.sku);
                if (p.image) p.element.setAttribute('data-pos-image', p.image);
            }
        });
        return products;
    },

    // Main entry point
    init(options = {}) {
        Object.assign(this.config, options);
        const products = this.enhance(this.scan());
        this.startObserving();

        console.log(`[ProductDetector] Found ${products.length} products (min confidence: ${this.config.minConfidence})`);
        document.dispatchEvent(new CustomEvent('products:detected', { detail: products }));

        return products;
    },

    // Get detection stats
    getStats(products) {
        return {
            total: products.length,
            highConfidence: products.filter(p => p.confidence >= 0.7).length,
            mediumConfidence: products.filter(p => p.confidence >= 0.4 && p.confidence < 0.7).length,
            withPrice: products.filter(p => p.price > 0).length,
            withImage: products.filter(p => p.image).length,
            sources: {
                schemaJsonLd: products.filter(p => p.source === 'schema-jsonld').length,
                microdata: products.filter(p => p.source === 'microdata').length,
                dom: products.filter(p => p.source === 'dom').length
            }
        };
    }
};

// Auto-init
if (typeof window !== 'undefined') {
    window.ProductDetector = ProductDetector;
    document.addEventListener('DOMContentLoaded', () => ProductDetector.init());
}

if (typeof module !== 'undefined') module.exports = ProductDetector;
