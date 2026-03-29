/**
 * Content Script - Runs on every page
 * Handles product detection, user learning mode, and API interception
 */

(function() {
    'use strict';

    const POSExtension = {
        products: [],
        learnMode: false,
        siteConfig: null,

        async init() {
            // Load saved configuration for this site
            this.siteConfig = await this.loadSiteConfig();

            // Load the detection scripts
            await this.injectDetectors();

            // Wait for page to settle
            await this.waitForPage();

            // Run detection
            this.detectProducts();

            // Setup API interception listener
            this.setupApiListener();

            console.log('[POS Extension] Initialized');
        },

        async injectDetectors() {
            // The ProductDetector and PlatformAdapters are bundled with extension
            // They're already loaded via content_scripts in manifest
        },

        async waitForPage(timeout = 3000) {
            return new Promise(resolve => {
                if (document.readyState === 'complete') {
                    setTimeout(resolve, 500); // Extra wait for JS rendering
                    return;
                }
                window.addEventListener('load', () => setTimeout(resolve, 500));
                setTimeout(resolve, timeout);
            });
        },

        async loadSiteConfig() {
            return new Promise(resolve => {
                chrome.runtime.sendMessage(
                    { type: 'GET_SITE_CONFIG', hostname: location.hostname },
                    response => resolve(response?.config || null)
                );
            });
        },

        detectProducts() {
            // Use saved selectors if available
            if (this.siteConfig?.selectors) {
                this.products = this.extractWithConfig(this.siteConfig);
            } else if (window.ProductDetector) {
                this.products = window.ProductDetector.scan();
            } else {
                this.products = this.basicDetection();
            }

            // Report to background
            chrome.runtime.sendMessage({
                type: 'STORE_PRODUCTS',
                products: this.products
            });

            console.log(`[POS Extension] Detected ${this.products.length} products`);
        },

        extractWithConfig(config) {
            const products = [];

            document.querySelectorAll(config.selectors.container).forEach(el => {
                const name = el.querySelector(config.selectors.name)?.textContent?.trim();
                const priceText = el.querySelector(config.selectors.price)?.textContent;
                const price = parseFloat(priceText?.replace(/[^\d.]/g, '') || 0);
                const image = el.querySelector(config.selectors.image)?.src;
                const id = el.dataset.productId || this.generateId(name);

                if (name) {
                    products.push({
                        id, name, price, image,
                        sku: id,
                        confidence: 0.95,
                        source: 'user-config'
                    });
                }
            });

            return products;
        },

        basicDetection() {
            // Fallback basic detection
            const products = [];
            const selectors = [
                '[data-product-id]', '.product', '.product-card',
                '[itemtype*="Product"]', '[data-sku]'
            ];

            selectors.forEach(sel => {
                document.querySelectorAll(sel).forEach(el => {
                    const name = el.querySelector('h1,h2,h3,h4,.name,.title')?.textContent?.trim();
                    const price = parseFloat(el.textContent.match(/[\$\€\£][\d,.]+/)?.[0]?.replace(/[^\d.]/g, '') || 0);
                    const image = el.querySelector('img')?.src;

                    if (name && !products.some(p => p.name === name)) {
                        products.push({
                            id: this.generateId(name),
                            name, price, image,
                            confidence: 0.5,
                            source: 'basic'
                        });
                    }
                });
            });

            return products;
        },

        generateId(name) {
            return name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50) : Date.now().toString();
        },

        setupApiListener() {
            chrome.runtime.onMessage.addListener((message) => {
                if (message.type === 'PRODUCT_API_DETECTED') {
                    this.fetchProductApi(message.url);
                }
            });
        },

        async fetchProductApi(url) {
            try {
                const response = await new Promise(resolve => {
                    chrome.runtime.sendMessage(
                        { type: 'FETCH_URL', url },
                        resolve
                    );
                });

                if (response?.success && response.data) {
                    const apiProducts = this.parseApiResponse(response.data);
                    if (apiProducts.length > 0) {
                        this.products = this.mergeProducts(this.products, apiProducts);
                        chrome.runtime.sendMessage({
                            type: 'STORE_PRODUCTS',
                            products: this.products
                        });
                    }
                }
            } catch (e) {
                console.log('[POS Extension] API fetch failed:', e);
            }
        },

        parseApiResponse(data) {
            const products = [];

            // Handle various API response formats
            const items = data.products || data.items || data.data?.products ||
                          data.collection?.products || (Array.isArray(data) ? data : []);

            items.forEach(item => {
                if (item.title || item.name) {
                    products.push({
                        id: String(item.id || item.product_id || item.sku),
                        name: item.title || item.name,
                        price: parseFloat(item.price || item.variants?.[0]?.price || 0) / 100,
                        image: item.image || item.featured_image || item.images?.[0],
                        sku: item.sku || item.variants?.[0]?.sku || '',
                        confidence: 0.95,
                        source: 'api'
                    });
                }
            });

            return products;
        },

        mergeProducts(existing, newProducts) {
            const merged = new Map(existing.map(p => [p.id, p]));
            newProducts.forEach(p => {
                if (!merged.has(p.id) || merged.get(p.id).confidence < p.confidence) {
                    merged.set(p.id, p);
                }
            });
            return Array.from(merged.values());
        },

        // ========== LEARN MODE ==========
        // Allows users to click on elements to teach the detector

        startLearnMode() {
            if (this.learnMode) return;
            this.learnMode = true;
            this.learnState = { container: null, name: null, price: null, image: null };

            this.showLearnUI();
            this.addLearnListeners();
        },

        stopLearnMode() {
            this.learnMode = false;
            this.removeLearnUI();
            this.removeLearnListeners();
        },

        showLearnUI() {
            const ui = document.createElement('div');
            ui.id = 'pos-learn-ui';
            ui.innerHTML = `
                <div class="pos-learn-panel">
                    <h3>Product Learning Mode</h3>
                    <p>Click on elements to identify them:</p>
                    <div class="pos-learn-steps">
                        <button class="pos-learn-btn" data-step="container">
                            1. Product Container <span class="status"></span>
                        </button>
                        <button class="pos-learn-btn" data-step="name">
                            2. Product Name <span class="status"></span>
                        </button>
                        <button class="pos-learn-btn" data-step="price">
                            3. Price <span class="status"></span>
                        </button>
                        <button class="pos-learn-btn" data-step="image">
                            4. Image (optional) <span class="status"></span>
                        </button>
                    </div>
                    <div class="pos-learn-actions">
                        <button id="pos-save-config">Save Configuration</button>
                        <button id="pos-cancel-learn">Cancel</button>
                    </div>
                    <div class="pos-learn-preview"></div>
                </div>
            `;
            document.body.appendChild(ui);

            // Bind events
            ui.querySelectorAll('.pos-learn-btn').forEach(btn => {
                btn.addEventListener('click', () => this.setActiveStep(btn.dataset.step));
            });
            ui.querySelector('#pos-save-config').addEventListener('click', () => this.saveConfig());
            ui.querySelector('#pos-cancel-learn').addEventListener('click', () => this.stopLearnMode());

            this.setActiveStep('container');
        },

        removeLearnUI() {
            document.getElementById('pos-learn-ui')?.remove();
            document.querySelectorAll('.pos-highlight').forEach(el => el.classList.remove('pos-highlight'));
        },

        setActiveStep(step) {
            this.currentStep = step;
            document.querySelectorAll('.pos-learn-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.step === step);
            });
        },

        addLearnListeners() {
            this.clickHandler = (e) => {
                if (!this.learnMode || e.target.closest('#pos-learn-ui')) return;

                e.preventDefault();
                e.stopPropagation();

                const el = e.target;
                this.learnState[this.currentStep] = this.generateSelector(el);

                // Update UI
                const btn = document.querySelector(`[data-step="${this.currentStep}"]`);
                btn.querySelector('.status').textContent = '✓';
                btn.classList.add('completed');

                // Highlight element
                document.querySelectorAll(`.pos-highlight-${this.currentStep}`).forEach(e => e.classList.remove(`pos-highlight-${this.currentStep}`, 'pos-highlight'));
                el.classList.add('pos-highlight', `pos-highlight-${this.currentStep}`);

                // Auto-advance to next step
                const steps = ['container', 'name', 'price', 'image'];
                const nextIndex = steps.indexOf(this.currentStep) + 1;
                if (nextIndex < steps.length) {
                    this.setActiveStep(steps[nextIndex]);
                }

                this.updatePreview();
            };

            this.hoverHandler = (e) => {
                if (!this.learnMode || e.target.closest('#pos-learn-ui')) return;
                document.querySelectorAll('.pos-hover').forEach(el => el.classList.remove('pos-hover'));
                e.target.classList.add('pos-hover');
            };

            document.addEventListener('click', this.clickHandler, true);
            document.addEventListener('mouseover', this.hoverHandler, true);
        },

        removeLearnListeners() {
            document.removeEventListener('click', this.clickHandler, true);
            document.removeEventListener('mouseover', this.hoverHandler, true);
            document.querySelectorAll('.pos-hover').forEach(el => el.classList.remove('pos-hover'));
        },

        generateSelector(el) {
            // Generate a CSS selector for the element
            if (el.id) return `#${el.id}`;

            const classes = Array.from(el.classList)
                .filter(c => !c.startsWith('pos-'))
                .filter(c => !/^[a-z]{1,2}\d+|^\d/.test(c)) // Filter obfuscated classes
                .slice(0, 2)
                .join('.');

            if (classes) return `${el.tagName.toLowerCase()}.${classes}`;

            // Use data attributes
            for (const attr of el.attributes) {
                if (attr.name.startsWith('data-') && !attr.name.includes('pos')) {
                    return `[${attr.name}="${attr.value}"]`;
                }
            }

            // Fallback to tag + nth-child
            const parent = el.parentElement;
            const index = Array.from(parent.children).indexOf(el) + 1;
            return `${el.tagName.toLowerCase()}:nth-child(${index})`;
        },

        updatePreview() {
            const preview = document.querySelector('.pos-learn-preview');
            if (!this.learnState.container) {
                preview.innerHTML = '<p>Select a product container to preview</p>';
                return;
            }

            const containers = document.querySelectorAll(this.learnState.container);
            const sample = containers[0];

            if (sample) {
                const name = this.learnState.name ? sample.querySelector(this.learnState.name)?.textContent?.trim() : '—';
                const price = this.learnState.price ? sample.querySelector(this.learnState.price)?.textContent?.trim() : '—';
                const image = this.learnState.image ? sample.querySelector(this.learnState.image)?.src : null;

                preview.innerHTML = `
                    <h4>Preview (${containers.length} products found)</h4>
                    ${image ? `<img src="${image}" style="max-width:50px;max-height:50px;">` : ''}
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Price:</strong> ${price}</p>
                `;
            }
        },

        async saveConfig() {
            if (!this.learnState.container || !this.learnState.name) {
                alert('Please select at least the product container and name');
                return;
            }

            const config = {
                selectors: {
                    container: this.learnState.container,
                    name: this.learnState.name,
                    price: this.learnState.price,
                    image: this.learnState.image
                },
                createdAt: new Date().toISOString()
            };

            await new Promise(resolve => {
                chrome.runtime.sendMessage({
                    type: 'SAVE_SITE_CONFIG',
                    hostname: location.hostname,
                    config: config
                }, resolve);
            });

            this.siteConfig = config;
            this.stopLearnMode();
            this.detectProducts();

            alert(`Configuration saved! Found ${this.products.length} products.`);
        }
    };

    // Listen for commands from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        switch (message.type) {
            case 'START_LEARN_MODE':
                POSExtension.startLearnMode();
                sendResponse({ success: true });
                break;
            case 'STOP_LEARN_MODE':
                POSExtension.stopLearnMode();
                sendResponse({ success: true });
                break;
            case 'RESCAN':
                POSExtension.detectProducts();
                sendResponse({ products: POSExtension.products });
                break;
            case 'GET_PRODUCTS':
                sendResponse({ products: POSExtension.products });
                break;
        }
    });

    // Initialize
    POSExtension.init();

})();
