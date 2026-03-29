/**
 * Universal POS Extension - Content Script Bundle
 * Includes: ProductDetector, PlatformAdapters, Learn Mode
 */

// ============ PRODUCT DETECTOR ============
const ProductDetector={config:{minConfidence:.4,observeDynamic:!0,debug:!1},signals:{dataAttrs:{weight:.3},schema:{weight:.35},price:{weight:.2},cartButton:{weight:.15,patterns:[/add.?to.?cart/i,/buy.?now/i,/purchase/i,/add.?to.?bag/i]}},pricePatterns:[{regex:/[\$]\s*([\d,]+\.?\d*)/,currency:"USD"},{regex:/[\€]\s*([\d\s]+,?\d*)/,currency:"EUR"},{regex:/[\£]\s*([\d,]+\.?\d*)/,currency:"GBP"},{regex:/[\¥]\s*([\d,]+)/,currency:"JPY"},{regex:/[\₹]\s*([\d,]+\.?\d*)/,currency:"INR"},{regex:/([\d,]+\.?\d*)\s*(?:USD|dollars?)/i,currency:"USD"}],scan(){const e=new Map;return this.extractSchemaProducts(e),this.extractMicrodataProducts(e),this.extractDOMProducts(e),this.deduplicate(Array.from(e.values()).map(e=>this.scoreProduct(e)).filter(e=>e.confidence>=this.config.minConfidence).sort((e,t)=>t.confidence-e.confidence))},extractSchemaProducts(e){document.querySelectorAll('script[type="application/ld+json"]').forEach(t=>{try{const s=JSON.parse(t.textContent);this.findSchemaProducts(s).forEach(t=>{const s=t.sku||t.productID||t.gtin||this.generateId(t.name);e.set(s,{id:s,name:t.name,price:this.parseSchemaPrice(t.offers),currency:t.offers?.priceCurrency||"USD",sku:t.sku||"",image:this.normalizeImage(t.image),description:t.description||"",source:"schema-jsonld",signals:{schema:!0}})})}catch(e){}})},findSchemaProducts(e,t=[]){return e?(Array.isArray(e)?e.forEach(e=>this.findSchemaProducts(e,t)):"object"==typeof e&&(("Product"===e["@type"]||e["@type"]?.includes?.("Product"))&&t.push(e),e["@graph"]&&this.findSchemaProducts(e["@graph"],t),e.mainEntity&&this.findSchemaProducts(e.mainEntity,t)),t):t},parseSchemaPrice(e){if(!e)return 0;const t=Array.isArray(e)?e[0]:e;return parseFloat(t.price||t.lowPrice||0)},extractMicrodataProducts(e){document.querySelectorAll('[itemtype*="Product"]').forEach(t=>{const s=t.querySelector('[itemprop="name"]')?.textContent?.trim(),r=t.querySelector('[itemprop="price"]'),i=parseFloat(r?.content||r?.textContent?.replace(/[^\d.]/g,"")||0),a=t.querySelector('[itemprop="sku"]')?.content||"",n=t.querySelector('[itemprop="image"]')?.src||t.querySelector("img")?.src||"";if(s){const r=a||this.generateId(s);e.set(r,{id:r,name:s,price:i,sku:a,image:n,currency:"USD",description:t.querySelector('[itemprop="description"]')?.textContent?.trim()||"",source:"microdata",element:t,signals:{schema:!0}})}})},extractDOMProducts(e){const t=new Set;["[data-product-id]","[data-product]","[data-item-id]","[data-sku]",".product",".product-item",".product-card",".product-tile",'[data-testid*="product"]'].forEach(s=>{document.querySelectorAll(s).forEach(s=>{if(!t.has(s)){t.add(s);const r=this.extractFromElement(s);r&&r.id&&!e.has(r.id)&&e.set(r.id,r)}})})},extractFromElement(e){const t={dataAttrs:!1,price:!1,cartButton:!1},s=e.dataset.productId||e.dataset.product||e.dataset.itemId||e.dataset.sku||e.dataset.id;s&&(t.dataAttrs=!0);const r=e.querySelector('h1,h2,h3,h4,.name,.title,.product-name,[class*="name"],[class*="title"]'),i=e.dataset.name||e.dataset.productName||r?.textContent?.trim();if(!i||i.length<2)return null;const{price:a,currency:n}=this.extractPrice(e);a>0&&(t.price=!0);const o=Array.from(e.querySelectorAll('button,a,[role="button"]')).map(e=>e.textContent).join(" ");this.signals.cartButton.patterns.some(e=>e.test(o))&&(t.cartButton=!0);const c=e.querySelector("img");return{id:s||this.generateId(i),name:i.substring(0,200),price:a,currency:n,sku:e.dataset.sku||s||"",image:this.normalizeImage(e.dataset.image||c?.src||c?.dataset.src||""),description:e.querySelector('.description,[class*="desc"]')?.textContent?.trim()?.substring(0,500)||"",source:"dom",element:e,signals:t}},extractPrice(e){if(e.dataset.price)return{price:parseFloat(e.dataset.price),currency:e.dataset.currency||"USD"};let t="";for(const s of[".price",'[class*="price"]',".cost","[data-price]"]){const r=e.querySelector(s);if(r){t=r.textContent;break}}t||(t=e.textContent);for(const{regex:e,currency:s}of this.pricePatterns){const r=t.match(e);if(r)return{price:parseFloat(r[1].replace(/[,\s]/g,""))||0,currency:s}}return{price:0,currency:"USD"}},scoreProduct(e){let t=0;return"schema-jsonld"!==e.source&&"microdata"!==e.source||(t+=.35),e.signals?.dataAttrs&&(t+=.3),e.price>0&&(t+=.2),e.signals?.cartButton&&(t+=.15),e.image&&(t+=.05),e.name?.length>3&&e.name?.length<150&&(t+=.05),e.name&&/^[\d\s-]+$/.test(e.name)&&(t-=.2),{...e,confidence:Math.min(1,Math.max(0,t))}},deduplicate(e){const t=[],s=new Map;for(const r of e){const e=`${r.name.toLowerCase().replace(/[^a-z0-9]/g,"")}-${r.price}`;s.has(e)||(s.set(e,!0),t.push(r))}return t},generateId:e=>e?e.toLowerCase().replace(/[^a-z0-9]+/g,"-").substring(0,50)+"-"+Date.now().toString(36):null,normalizeImage(e){return e?(Array.isArray(e)&&(e=e[0]),"object"==typeof e&&(e=e.url||e.contentUrl||""),e):""}};

// ============ PLATFORM ADAPTERS ============
const PlatformAdapters={detectPlatform(){const e=document.documentElement.outerHTML,t=document.querySelector('meta[name="generator"]')?.content||"";return window.Shopify||e.includes("cdn.shopify.com")?"shopify":window.wixBiSession||e.includes("static.wixstatic.com")?"wix":e.includes("squarespace.com")||t.includes("Squarespace")?"squarespace":window.wp||t.includes("WordPress")||e.includes("wp-content")?"wordpress":"unknown"},adapters:{shopify:{confidence:.95,extract(){const e=[];if(window.ShopifyAnalytics?.meta?.product){const t=window.ShopifyAnalytics.meta.product;e.push({id:String(t.id),name:t.title,price:parseFloat(t.price)/100||0,sku:t.variants?.[0]?.sku||String(t.id),image:t.featured_image,source:"shopify"})}return document.querySelectorAll("[data-product-id],.product-card").forEach(t=>{const s=t.dataset.productId,r=t.querySelector(".product-card__title,h3,h2")?.textContent?.trim(),i=parseFloat(t.querySelector(".price,[data-price]")?.textContent?.replace(/[^\d.]/g,"")||0);s&&r&&e.push({id:s,name:r,price:i,image:t.querySelector("img")?.src,sku:s,source:"shopify"})}),e}},wix:{confidence:.75,extract(){const e=[];return document.querySelectorAll('[data-hook="product-item"],[data-hook*="product"]').forEach(t=>{const s=t.querySelector('[data-hook="product-item-name"],[data-hook*="name"]')?.textContent?.trim(),r=parseFloat(t.querySelector('[data-hook*="price"]')?.textContent?.match(/[\d,.]+/)?.[0]?.replace(/,/g,"")||0);s&&e.push({id:s.toLowerCase().replace(/[^a-z0-9]+/g,"-"),name:s,price:r,image:t.querySelector("img")?.src,source:"wix"})}),e}},wordpress:{confidence:.9,extract(){const e=[];return document.querySelectorAll(".product,.woocommerce-loop-product,[data-product_id]").forEach(t=>{const s=t.dataset.product_id||t.classList.toString().match(/post-(\d+)/)?.[1],r=t.querySelector(".woocommerce-loop-product__title,h2,h3")?.textContent?.trim(),i=parseFloat(t.querySelector(".price .amount")?.textContent?.replace(/[^\d.]/g,"")||0);r&&e.push({id:s||r,name:r,price:i,image:t.querySelector("img")?.src,sku:s||"",source:"woocommerce"})}),e}},squarespace:{confidence:.8,extract(){const e=[];if(window.Static?.SQUARESPACE_CONTEXT?.product){const t=window.Static.SQUARESPACE_CONTEXT.product;e.push({id:t.id,name:t.title,price:t.variants?.[0]?.priceMoney?.value/100||0,image:t.items?.[0]?.assetUrl,source:"squarespace"})}return e}},unknown:{confidence:.5,extract:()=>[]}},extract(){const e=this.detectPlatform(),t=this.adapters[e];return t.extract().map(s=>({...s,confidence:t.confidence,platform:e}))}};

// ============ EXTENSION CONTENT SCRIPT ============
(function() {
    'use strict';

    const POSExtension = {
        products: [],
        learnMode: false,
        siteConfig: null,

        async init() {
            this.siteConfig = await this.loadSiteConfig();
            await this.waitForPage();
            this.detectProducts();
            this.setupApiListener();
            console.log('[POS Extension] Initialized');
        },

        async waitForPage(timeout = 3000) {
            return new Promise(resolve => {
                if (document.readyState === 'complete') { setTimeout(resolve, 500); return; }
                window.addEventListener('load', () => setTimeout(resolve, 500));
                setTimeout(resolve, timeout);
            });
        },

        async loadSiteConfig() {
            return new Promise(resolve => {
                chrome.runtime.sendMessage({ type: 'GET_SITE_CONFIG', hostname: location.hostname }, response => resolve(response?.config || null));
            });
        },

        detectProducts() {
            if (this.siteConfig?.selectors) {
                this.products = this.extractWithConfig(this.siteConfig);
            } else {
                const platformProducts = PlatformAdapters.extract();
                const genericProducts = ProductDetector.scan();
                const merged = new Map();
                platformProducts.forEach(p => merged.set(p.id, p));
                genericProducts.forEach(p => { if (!merged.has(p.id)) merged.set(p.id, p); });
                this.products = Array.from(merged.values());
            }
            chrome.runtime.sendMessage({ type: 'STORE_PRODUCTS', products: this.products });
            console.log(`[POS Extension] Detected ${this.products.length} products`);
        },

        extractWithConfig(config) {
            const products = [];
            document.querySelectorAll(config.selectors.container).forEach(el => {
                const name = el.querySelector(config.selectors.name)?.textContent?.trim();
                const priceText = el.querySelector(config.selectors.price)?.textContent;
                const price = parseFloat(priceText?.replace(/[^\d.]/g, '') || 0);
                const image = config.selectors.image ? el.querySelector(config.selectors.image)?.src : el.querySelector('img')?.src;
                const id = el.dataset.productId || (name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50) : Date.now().toString());
                if (name) products.push({ id, name, price, image, sku: id, confidence: 0.95, source: 'user-config' });
            });
            return products;
        },

        setupApiListener() {
            chrome.runtime.onMessage.addListener((message) => {
                if (message.type === 'PRODUCT_API_DETECTED') this.fetchProductApi(message.url);
            });
        },

        async fetchProductApi(url) {
            try {
                const response = await new Promise(resolve => { chrome.runtime.sendMessage({ type: 'FETCH_URL', url }, resolve); });
                if (response?.success && response.data) {
                    const items = response.data.products || response.data.items || (Array.isArray(response.data) ? response.data : []);
                    const apiProducts = items.filter(i => i.title || i.name).map(item => ({
                        id: String(item.id || item.sku), name: item.title || item.name,
                        price: parseFloat(item.price || item.variants?.[0]?.price || 0) / 100,
                        image: item.image || item.featured_image || item.images?.[0], confidence: 0.95, source: 'api'
                    }));
                    if (apiProducts.length > 0) {
                        const merged = new Map(this.products.map(p => [p.id, p]));
                        apiProducts.forEach(p => merged.set(p.id, p));
                        this.products = Array.from(merged.values());
                        chrome.runtime.sendMessage({ type: 'STORE_PRODUCTS', products: this.products });
                    }
                }
            } catch (e) {}
        },

        startLearnMode() {
            if (this.learnMode) return;
            this.learnMode = true;
            this.learnState = { container: null, name: null, price: null, image: null };
            this.showLearnUI();
            this.addLearnListeners();
        },

        stopLearnMode() {
            this.learnMode = false;
            document.getElementById('pos-learn-ui')?.remove();
            document.querySelectorAll('.pos-highlight,.pos-hover').forEach(el => { el.style.outline = ''; el.classList.remove('pos-highlight', 'pos-hover'); });
            if (this.clickHandler) document.removeEventListener('click', this.clickHandler, true);
            if (this.hoverHandler) document.removeEventListener('mouseover', this.hoverHandler, true);
        },

        showLearnUI() {
            const ui = document.createElement('div');
            ui.id = 'pos-learn-ui';
            ui.innerHTML = `<div style="position:fixed;top:20px;right:20px;z-index:2147483647;font-family:-apple-system,sans-serif;background:#fff;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.2);padding:20px;width:300px;"><h3 style="margin:0 0 8px;font-size:16px;">Product Learning Mode</h3><p style="margin:0 0 16px;font-size:13px;color:#666;">Click elements to identify:</p><div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;"><button class="pos-learn-btn" data-step="container" style="display:flex;justify-content:space-between;padding:10px 12px;background:#f5f5f5;border:2px solid transparent;border-radius:6px;cursor:pointer;font-size:13px;">1. Container <span class="status"></span></button><button class="pos-learn-btn" data-step="name" style="display:flex;justify-content:space-between;padding:10px 12px;background:#f5f5f5;border:2px solid transparent;border-radius:6px;cursor:pointer;font-size:13px;">2. Name <span class="status"></span></button><button class="pos-learn-btn" data-step="price" style="display:flex;justify-content:space-between;padding:10px 12px;background:#f5f5f5;border:2px solid transparent;border-radius:6px;cursor:pointer;font-size:13px;">3. Price <span class="status"></span></button><button class="pos-learn-btn" data-step="image" style="display:flex;justify-content:space-between;padding:10px 12px;background:#f5f5f5;border:2px solid transparent;border-radius:6px;cursor:pointer;font-size:13px;">4. Image <span class="status"></span></button></div><div style="display:flex;gap:8px;"><button id="pos-save-config" style="flex:1;padding:10px;border:none;border-radius:6px;background:#667eea;color:#fff;cursor:pointer;font-size:13px;">Save</button><button id="pos-cancel-learn" style="flex:1;padding:10px;border:none;border-radius:6px;background:#e9ecef;cursor:pointer;font-size:13px;">Cancel</button></div><div class="pos-learn-preview" style="margin-top:16px;padding:12px;background:#f8f9fa;border-radius:6px;font-size:12px;"></div></div>`;
            document.body.appendChild(ui);
            ui.querySelectorAll('.pos-learn-btn').forEach(btn => { btn.addEventListener('click', () => this.setActiveStep(btn.dataset.step)); });
            ui.querySelector('#pos-save-config').addEventListener('click', () => this.saveConfig());
            ui.querySelector('#pos-cancel-learn').addEventListener('click', () => this.stopLearnMode());
            this.setActiveStep('container');
        },

        setActiveStep(step) {
            this.currentStep = step;
            document.querySelectorAll('.pos-learn-btn').forEach(btn => {
                btn.style.borderColor = btn.dataset.step === step ? '#667eea' : 'transparent';
                btn.style.background = btn.querySelector('.status').textContent === '✓' ? '#d4edda' : (btn.dataset.step === step ? '#f0f2ff' : '#f5f5f5');
            });
        },

        addLearnListeners() {
            this.clickHandler = (e) => {
                if (!this.learnMode || e.target.closest('#pos-learn-ui')) return;
                e.preventDefault(); e.stopPropagation();
                const el = e.target;
                this.learnState[this.currentStep] = this.generateSelector(el);
                const btn = document.querySelector(`[data-step="${this.currentStep}"]`);
                btn.querySelector('.status').textContent = '✓';
                btn.style.background = '#d4edda';
                el.style.outline = '3px solid #28a745';
                const steps = ['container', 'name', 'price', 'image'];
                const next = steps.indexOf(this.currentStep) + 1;
                if (next < steps.length) this.setActiveStep(steps[next]);
                this.updatePreview();
            };
            this.hoverHandler = (e) => {
                if (!this.learnMode || e.target.closest('#pos-learn-ui')) return;
                document.querySelectorAll('.pos-hover').forEach(el => { el.style.outline = ''; el.classList.remove('pos-hover'); });
                e.target.classList.add('pos-hover');
                e.target.style.outline = '2px dashed #667eea';
            };
            document.addEventListener('click', this.clickHandler, true);
            document.addEventListener('mouseover', this.hoverHandler, true);
        },

        generateSelector(el) {
            if (el.id) return `#${el.id}`;
            const classes = Array.from(el.classList).filter(c => !c.startsWith('pos-') && !/^[a-z]{1,2}\d+|^\d/.test(c)).slice(0, 2).join('.');
            if (classes) return `${el.tagName.toLowerCase()}.${classes}`;
            for (const attr of el.attributes) { if (attr.name.startsWith('data-') && !attr.name.includes('pos')) return `[${attr.name}="${attr.value}"]`; }
            return `${el.tagName.toLowerCase()}:nth-child(${Array.from(el.parentElement.children).indexOf(el) + 1})`;
        },

        updatePreview() {
            const preview = document.querySelector('.pos-learn-preview');
            if (!this.learnState.container) { preview.innerHTML = '<p>Select container first</p>'; return; }
            const containers = document.querySelectorAll(this.learnState.container);
            if (containers[0]) {
                const name = this.learnState.name ? containers[0].querySelector(this.learnState.name)?.textContent?.trim() : '—';
                const price = this.learnState.price ? containers[0].querySelector(this.learnState.price)?.textContent?.trim() : '—';
                preview.innerHTML = `<strong>${containers.length} found</strong><br>Name: ${name}<br>Price: ${price}`;
            }
        },

        async saveConfig() {
            if (!this.learnState.container || !this.learnState.name) { alert('Select container and name'); return; }
            await new Promise(resolve => { chrome.runtime.sendMessage({ type: 'SAVE_SITE_CONFIG', hostname: location.hostname, config: { selectors: this.learnState, createdAt: new Date().toISOString() } }, resolve); });
            this.siteConfig = { selectors: this.learnState };
            this.stopLearnMode();
            this.detectProducts();
            alert(`Saved! Found ${this.products.length} products.`);
        }
    };

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.type === 'START_LEARN_MODE') { POSExtension.startLearnMode(); sendResponse({ success: true }); }
        else if (msg.type === 'STOP_LEARN_MODE') { POSExtension.stopLearnMode(); sendResponse({ success: true }); }
        else if (msg.type === 'RESCAN') { POSExtension.detectProducts(); sendResponse({ products: POSExtension.products }); }
        else if (msg.type === 'GET_PRODUCTS') { sendResponse({ products: POSExtension.products }); }
    });

    POSExtension.init();
})();
