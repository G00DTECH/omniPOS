/**
 * Platform-Specific Adapters for Product Detection
 * Handles Wix, Squarespace, WordPress, Shopify, and custom sites
 */

const PlatformAdapters = {
    // Detect which platform the site is running on
    detectPlatform() {
        const html = document.documentElement.outerHTML;
        const meta = document.querySelector('meta[name="generator"]')?.content || '';

        if (window.Shopify || html.includes('cdn.shopify.com')) return 'shopify';
        if (window.wixBiSession || html.includes('static.wixstatic.com')) return 'wix';
        if (html.includes('squarespace.com') || meta.includes('Squarespace')) return 'squarespace';
        if (window.wp || meta.includes('WordPress') || html.includes('wp-content')) return 'wordpress';
        if (window.Webflow || html.includes('webflow')) return 'webflow';
        if (html.includes('bigcommerce.com') || window.BCData) return 'bigcommerce';
        if (html.includes('magento') || window.require?.s?.contexts?._.config) return 'magento';

        return 'unknown';
    },

    // Platform-specific extraction strategies
    adapters: {
        shopify: {
            name: 'Shopify',
            confidence: 0.95,

            extract() {
                const products = [];

                // Method 1: Shopify's JSON in page
                const jsonScript = document.querySelector('script[data-product-json], #ProductJson, [id*="ProductJson"]');
                if (jsonScript) {
                    try {
                        const data = JSON.parse(jsonScript.textContent);
                        products.push(this.parseShopifyProduct(data));
                    } catch (e) {}
                }

                // Method 2: window.ShopifyAnalytics
                if (window.ShopifyAnalytics?.meta?.product) {
                    products.push(this.parseShopifyProduct(window.ShopifyAnalytics.meta.product));
                }

                // Method 3: Product cards
                document.querySelectorAll('[data-product-id], .product-card, .product-item').forEach(el => {
                    const id = el.dataset.productId || el.querySelector('[data-product-id]')?.dataset.productId;
                    const name = el.querySelector('.product-card__title, .product__title, h3, h2')?.textContent?.trim();
                    const priceEl = el.querySelector('.price, .product-price, [data-price]');
                    const price = parseFloat(priceEl?.dataset.price || priceEl?.textContent?.replace(/[^\d.]/g, '') || 0);
                    const image = el.querySelector('img')?.src;

                    if (id && name) {
                        products.push({ id, name, price, image, sku: id, source: 'shopify' });
                    }
                });

                return products;
            },

            parseShopifyProduct(data) {
                return {
                    id: String(data.id),
                    name: data.title,
                    price: parseFloat(data.price) / 100 || parseFloat(data.variants?.[0]?.price) / 100 || 0,
                    sku: data.variants?.[0]?.sku || String(data.id),
                    image: data.featured_image || data.images?.[0],
                    description: data.description?.replace(/<[^>]*>/g, '').substring(0, 500),
                    source: 'shopify'
                };
            }
        },

        wix: {
            name: 'Wix',
            confidence: 0.75,

            extract() {
                const products = [];

                // Method 1: Wix data hooks (most reliable)
                document.querySelectorAll('[data-hook="product-item"], [data-hook*="product"]').forEach(el => {
                    const name = el.querySelector('[data-hook="product-item-name"], [data-hook*="name"]')?.textContent?.trim();
                    const priceText = el.querySelector('[data-hook="product-item-price"], [data-hook*="price"]')?.textContent;
                    const price = this.parsePrice(priceText);
                    const image = el.querySelector('img')?.src;
                    const link = el.querySelector('a')?.href;
                    const id = link ? this.extractIdFromUrl(link) : this.generateId(name);

                    if (name) {
                        products.push({ id, name, price, image, sku: id, source: 'wix' });
                    }
                });

                // Method 2: Wix stores window data
                if (window.wixDevelopersAnalytics?.product) {
                    const p = window.wixDevelopersAnalytics.product;
                    products.push({
                        id: p.id, name: p.name, price: p.price,
                        image: p.imageUrl, sku: p.sku || p.id, source: 'wix'
                    });
                }

                // Method 3: Intercept from rendered content
                if (products.length === 0) {
                    products.push(...this.extractByVisualPattern());
                }

                return products;
            },

            extractByVisualPattern() {
                const products = [];
                // Look for repeated structures (likely product grid)
                const containers = document.querySelectorAll('[class*="grid"], [class*="gallery"], [class*="list"]');

                containers.forEach(container => {
                    const items = container.children;
                    if (items.length < 2) return;

                    // Check if children have similar structure (product cards)
                    Array.from(items).forEach(item => {
                        const hasImage = item.querySelector('img');
                        const hasPrice = /[\$\€\£]\s*\d/.test(item.textContent);
                        const textBlocks = item.querySelectorAll('span, p, div');

                        if (hasImage && hasPrice && textBlocks.length >= 2) {
                            const name = this.findProductName(item);
                            const price = this.parsePrice(item.textContent);
                            const image = item.querySelector('img')?.src;

                            if (name && price > 0) {
                                products.push({
                                    id: this.generateId(name),
                                    name, price, image,
                                    sku: this.generateId(name),
                                    source: 'wix-visual'
                                });
                            }
                        }
                    });
                });

                return products;
            },

            findProductName(el) {
                // Find the most likely product name (not price, not too long)
                const candidates = Array.from(el.querySelectorAll('span, p, div, h2, h3, h4'))
                    .map(e => e.textContent.trim())
                    .filter(t => t.length > 2 && t.length < 100)
                    .filter(t => !/^[\$\€\£\d,.\s]+$/.test(t)) // Not just price
                    .filter(t => !/add to cart|buy now|sold out/i.test(t));

                return candidates[0] || null;
            },

            parsePrice(text) {
                if (!text) return 0;
                const match = text.match(/[\$\€\£]\s*([\d,]+\.?\d*)/);
                return match ? parseFloat(match[1].replace(/,/g, '')) : 0;
            },

            extractIdFromUrl(url) {
                const match = url.match(/\/product-page\/([^\/\?]+)/);
                return match ? match[1] : url.split('/').pop()?.split('?')[0] || '';
            },

            generateId(name) {
                return name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50) : Date.now().toString();
            }
        },

        squarespace: {
            name: 'Squarespace',
            confidence: 0.80,

            extract() {
                const products = [];

                // Method 1: Squarespace JSON
                if (window.Static?.SQUARESPACE_CONTEXT?.product) {
                    const p = window.Static.SQUARESPACE_CONTEXT.product;
                    products.push({
                        id: p.id, name: p.title,
                        price: p.variants?.[0]?.priceMoney?.value / 100 || 0,
                        image: p.items?.[0]?.assetUrl,
                        sku: p.variants?.[0]?.sku || p.id,
                        source: 'squarespace'
                    });
                }

                // Method 2: Product items
                document.querySelectorAll('.ProductItem, .product-item, [data-item-id]').forEach(el => {
                    const id = el.dataset.itemId || el.querySelector('[data-item-id]')?.dataset.itemId;
                    const name = el.querySelector('.ProductItem-details-title, .product-title, h1')?.textContent?.trim();
                    const priceEl = el.querySelector('.product-price, .sqs-money-native');
                    const price = parseFloat(priceEl?.textContent?.replace(/[^\d.]/g, '') || 0);
                    const image = el.querySelector('img')?.src;

                    if (name) {
                        products.push({ id: id || name, name, price, image, sku: id || '', source: 'squarespace' });
                    }
                });

                return products;
            }
        },

        wordpress: {
            name: 'WordPress/WooCommerce',
            confidence: 0.90,

            extract() {
                const products = [];

                // WooCommerce products
                document.querySelectorAll('.product, .woocommerce-loop-product, [data-product_id]').forEach(el => {
                    const id = el.dataset.product_id || el.querySelector('[data-product_id]')?.dataset.product_id ||
                               el.classList.toString().match(/post-(\d+)/)?.[1];
                    const name = el.querySelector('.woocommerce-loop-product__title, .product-title, h2, h3')?.textContent?.trim();
                    const priceEl = el.querySelector('.price .amount, .woocommerce-Price-amount');
                    const price = parseFloat(priceEl?.textContent?.replace(/[^\d.]/g, '') || 0);
                    const image = el.querySelector('img')?.src;

                    if (name) {
                        products.push({ id: id || name, name, price, image, sku: id || '', source: 'woocommerce' });
                    }
                });

                // WooCommerce single product page
                if (document.querySelector('.single-product')) {
                    const form = document.querySelector('form.cart');
                    if (form) {
                        const id = form.querySelector('[name="add-to-cart"]')?.value;
                        const name = document.querySelector('.product_title, h1')?.textContent?.trim();
                        const price = parseFloat(document.querySelector('.price .amount')?.textContent?.replace(/[^\d.]/g, '') || 0);
                        const image = document.querySelector('.woocommerce-product-gallery img')?.src;

                        if (id && name) {
                            products.push({ id, name, price, image, sku: id, source: 'woocommerce' });
                        }
                    }
                }

                return products;
            }
        },

        webflow: {
            name: 'Webflow',
            confidence: 0.70,

            extract() {
                const products = [];

                // Webflow E-commerce
                document.querySelectorAll('[data-commerce-sku], .w-commerce-product, .product').forEach(el => {
                    const id = el.dataset.commerceSku || el.dataset.itemId;
                    const name = el.querySelector('.product-name, h2, h3')?.textContent?.trim();
                    const price = parseFloat(el.querySelector('.product-price, .price')?.textContent?.replace(/[^\d.]/g, '') || 0);
                    const image = el.querySelector('img')?.src;

                    if (name) {
                        products.push({ id: id || name, name, price, image, sku: id || '', source: 'webflow' });
                    }
                });

                return products;
            }
        },

        bigcommerce: {
            name: 'BigCommerce',
            confidence: 0.90,

            extract() {
                const products = [];

                // BigCommerce BCData
                if (window.BCData?.product_attributes) {
                    const p = window.BCData.product_attributes;
                    products.push({
                        id: String(p.product_id),
                        name: document.querySelector('.productView-title')?.textContent?.trim() || '',
                        price: parseFloat(p.price?.without_tax?.value || 0),
                        sku: p.sku,
                        image: document.querySelector('.productView-image img')?.src,
                        source: 'bigcommerce'
                    });
                }

                // Product cards
                document.querySelectorAll('[data-product-id], .card').forEach(el => {
                    const id = el.dataset.productId;
                    const name = el.querySelector('.card-title, h3, h4')?.textContent?.trim();
                    const price = parseFloat(el.querySelector('.price--withTax, .price')?.textContent?.replace(/[^\d.]/g, '') || 0);
                    const image = el.querySelector('img')?.src;

                    if (id && name) {
                        products.push({ id, name, price, image, sku: id, source: 'bigcommerce' });
                    }
                });

                return products;
            }
        },

        magento: {
            name: 'Magento',
            confidence: 0.85,

            extract() {
                const products = [];

                // Magento product data
                document.querySelectorAll('.product-item, .item.product').forEach(el => {
                    const id = el.dataset.productId || el.querySelector('[data-product-id]')?.dataset.productId;
                    const name = el.querySelector('.product-item-link, .product-name')?.textContent?.trim();
                    const price = parseFloat(el.querySelector('[data-price-amount]')?.dataset.priceAmount ||
                                  el.querySelector('.price')?.textContent?.replace(/[^\d.]/g, '') || 0);
                    const image = el.querySelector('img')?.src;

                    if (name) {
                        products.push({ id: id || name, name, price, image, sku: id || '', source: 'magento' });
                    }
                });

                return products;
            }
        },

        unknown: {
            name: 'Generic',
            confidence: 0.50,

            extract() {
                // Fall back to the main ProductDetector
                return [];
            }
        }
    },

    // Main extraction with platform detection
    extract() {
        const platform = this.detectPlatform();
        const adapter = this.adapters[platform];

        console.log(`[PlatformAdapters] Detected platform: ${adapter.name}`);

        const products = adapter.extract.call(adapter);

        // Add confidence based on platform
        return products.map(p => ({
            ...p,
            confidence: adapter.confidence,
            platform: platform
        }));
    },

    // Merge with generic detector results
    mergeWithGeneric(genericProducts, platformProducts) {
        const merged = new Map();

        // Platform products take priority (higher confidence)
        platformProducts.forEach(p => merged.set(p.id, p));

        // Add generic products that weren't found by platform adapter
        genericProducts.forEach(p => {
            if (!merged.has(p.id)) {
                // Check for name similarity
                const isDuplicate = Array.from(merged.values()).some(existing =>
                    this.isSimilar(existing.name, p.name)
                );
                if (!isDuplicate) {
                    merged.set(p.id, p);
                }
            }
        });

        return Array.from(merged.values());
    },

    isSimilar(name1, name2) {
        const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normalize(name1) === normalize(name2);
    }
};

// Integration with main ProductDetector
if (typeof window !== 'undefined') {
    window.PlatformAdapters = PlatformAdapters;

    // Enhance ProductDetector if available
    if (window.ProductDetector) {
        const originalScan = window.ProductDetector.scan.bind(window.ProductDetector);
        window.ProductDetector.scan = function() {
            const genericProducts = originalScan();
            const platformProducts = PlatformAdapters.extract();
            return PlatformAdapters.mergeWithGeneric(genericProducts, platformProducts);
        };
        console.log('[PlatformAdapters] Integrated with ProductDetector');
    }
}

if (typeof module !== 'undefined') module.exports = PlatformAdapters;
