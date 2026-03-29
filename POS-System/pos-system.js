/**
 * Universal Point of Sale System
 * A website-agnostic POS system that works with HTML data attributes
 * Version: 1.0.0
 */

class UniversalPOS {
    constructor(options = {}) {
        this.options = {
            cartStorageKey: 'universal-pos-cart',
            inventoryStorageKey: 'universal-pos-inventory',
            apiEndpoint: null,
            currency: '$',
            taxRate: 0,
            shippingCost: 0,
            autoInit: true,
            notifications: true,
            ...options
        };

        this.cart = [];
        this.inventory = {};
        this.products = [];
        this.isInitialized = false;

        if (this.options.autoInit) {
            this.init();
        }
    }

    /**
     * Initialize the POS system
     */
    init() {
        if (this.isInitialized) return;

        this.loadStoredData();
        this.scanProducts();
        this.createCartUI();
        this.bindEvents();
        this.updateCartDisplay();
        this.isInitialized = true;

        this.emit('pos:initialized');
    }

    /**
     * Load cart and inventory data from localStorage
     */
    loadStoredData() {
        try {
            const storedCart = localStorage.getItem(this.options.cartStorageKey);
            const storedInventory = localStorage.getItem(this.options.inventoryStorageKey);

            if (storedCart) {
                this.cart = JSON.parse(storedCart);
            }
            if (storedInventory) {
                this.inventory = JSON.parse(storedInventory);
            }
        } catch (error) {
            console.warn('Universal POS: Error loading stored data', error);
        }
    }

    /**
     * Save data to localStorage
     */
    saveData() {
        try {
            localStorage.setItem(this.options.cartStorageKey, JSON.stringify(this.cart));
            localStorage.setItem(this.options.inventoryStorageKey, JSON.stringify(this.inventory));
        } catch (error) {
            console.warn('Universal POS: Error saving data', error);
        }
    }

    /**
     * Scan the DOM for products with POS attributes
     */
    scanProducts() {
        const productElements = document.querySelectorAll('[data-pos-product]');
        this.products = [];

        productElements.forEach(element => {
            const product = this.parseProductElement(element);
            if (product) {
                this.products.push(product);
                this.initializeInventory(product);
                this.enhanceProductElement(element, product);
            }
        });

        this.emit('pos:products-scanned', { products: this.products });
    }

    /**
     * Parse product data from HTML element
     */
    parseProductElement(element) {
        try {
            const id = element.getAttribute('data-pos-product');
            const name = element.getAttribute('data-pos-name') || element.textContent.trim() || `Product ${id}`;
            const price = parseFloat(element.getAttribute('data-pos-price') || '0');
            const inventory = parseInt(element.getAttribute('data-pos-inventory') || '999');
            const category = element.getAttribute('data-pos-category') || 'general';
            const description = element.getAttribute('data-pos-description') || '';
            const image = element.getAttribute('data-pos-image') || '';
            const sku = element.getAttribute('data-pos-sku') || id;

            if (!id || isNaN(price)) {
                console.warn('Universal POS: Invalid product data', element);
                return null;
            }

            return {
                id,
                name,
                price,
                inventory,
                category,
                description,
                image,
                sku,
                element
            };
        } catch (error) {
            console.warn('Universal POS: Error parsing product element', error);
            return null;
        }
    }

    /**
     * Initialize inventory for a product
     */
    initializeInventory(product) {
        if (!(product.id in this.inventory)) {
            this.inventory[product.id] = product.inventory;
        }
    }

    /**
     * Enhance product element with POS functionality
     */
    enhanceProductElement(element, product) {
        // Add CSS class for styling
        element.classList.add('pos-product');

        // Create or find add to cart button
        let addButton = element.querySelector('.pos-add-to-cart');
        if (!addButton) {
            addButton = document.createElement('button');
            addButton.className = 'pos-add-to-cart';
            addButton.textContent = 'Add to Cart';
            element.appendChild(addButton);
        }

        // Create quantity input if it doesn't exist
        let quantityInput = element.querySelector('.pos-quantity');
        if (!quantityInput) {
            quantityInput = document.createElement('input');
            quantityInput.type = 'number';
            quantityInput.className = 'pos-quantity';
            quantityInput.min = '1';
            quantityInput.value = '1';
            element.insertBefore(quantityInput, addButton);
        }

        // Create stock display
        let stockDisplay = element.querySelector('.pos-stock');
        if (!stockDisplay) {
            stockDisplay = document.createElement('span');
            stockDisplay.className = 'pos-stock';
            element.appendChild(stockDisplay);
        }

        this.updateStockDisplay(product.id);
        this.updateAddButton(product.id);

        // Bind events
        addButton.addEventListener('click', (e) => {
            e.preventDefault();
            const quantity = parseInt(quantityInput.value) || 1;
            this.addToCart(product.id, quantity);
        });

        quantityInput.addEventListener('change', () => {
            this.updateAddButton(product.id);
        });
    }

    /**
     * Update stock display for a product
     */
    updateStockDisplay(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const stockDisplay = product.element.querySelector('.pos-stock');
        if (stockDisplay) {
            const stock = this.inventory[productId] || 0;
            stockDisplay.textContent = `Stock: ${stock}`;
            stockDisplay.className = `pos-stock ${stock === 0 ? 'pos-out-of-stock' : stock < 5 ? 'pos-low-stock' : ''}`;
        }
    }

    /**
     * Update add to cart button state
     */
    updateAddButton(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const addButton = product.element.querySelector('.pos-add-to-cart');
        const quantityInput = product.element.querySelector('.pos-quantity');
        
        if (addButton && quantityInput) {
            const requestedQuantity = parseInt(quantityInput.value) || 1;
            const availableStock = this.inventory[productId] || 0;
            const isAvailable = availableStock >= requestedQuantity;

            addButton.disabled = !isAvailable;
            addButton.textContent = isAvailable ? 'Add to Cart' : 'Out of Stock';
            
            // Update max quantity
            quantityInput.max = availableStock;
            if (requestedQuantity > availableStock) {
                quantityInput.value = availableStock;
            }
        }
    }

    /**
     * Add item to cart
     */
    addToCart(productId, quantity = 1) {
        const product = this.products.find(p => p.id === productId);
        if (!product) {
            this.showNotification('Product not found', 'error');
            return false;
        }

        const availableStock = this.inventory[productId] || 0;
        if (availableStock < quantity) {
            this.showNotification('Insufficient stock', 'error');
            return false;
        }

        // Check if item already in cart
        const existingItem = this.cart.find(item => item.id === productId);
        if (existingItem) {
            const totalQuantity = existingItem.quantity + quantity;
            if (availableStock < totalQuantity) {
                this.showNotification('Not enough stock for requested quantity', 'error');
                return false;
            }
            existingItem.quantity = totalQuantity;
        } else {
            this.cart.push({
                id: productId,
                name: product.name,
                price: product.price,
                quantity: quantity,
                sku: product.sku,
                image: product.image
            });
        }

        // Update inventory
        this.inventory[productId] -= quantity;
        this.saveData();
        this.updateCartDisplay();
        this.updateStockDisplay(productId);
        this.updateAddButton(productId);

        this.showNotification(`${product.name} added to cart`, 'success');
        this.emit('pos:item-added', { productId, quantity, cart: this.cart });

        return true;
    }

    /**
     * Remove item from cart
     */
    removeFromCart(productId, quantity = null) {
        const cartItemIndex = this.cart.findIndex(item => item.id === productId);
        if (cartItemIndex === -1) return false;

        const cartItem = this.cart[cartItemIndex];
        const removeQuantity = quantity || cartItem.quantity;

        // Return stock to inventory
        this.inventory[productId] = (this.inventory[productId] || 0) + removeQuantity;

        if (quantity && cartItem.quantity > quantity) {
            cartItem.quantity -= quantity;
        } else {
            this.cart.splice(cartItemIndex, 1);
        }

        this.saveData();
        this.updateCartDisplay();
        this.updateStockDisplays();
        this.updateAddButtons();

        this.emit('pos:item-removed', { productId, quantity: removeQuantity, cart: this.cart });
        return true;
    }

    /**
     * Clear entire cart
     */
    clearCart() {
        // Return all items to inventory
        this.cart.forEach(item => {
            this.inventory[item.id] = (this.inventory[item.id] || 0) + item.quantity;
        });

        this.cart = [];
        this.saveData();
        this.updateCartDisplay();
        this.updateStockDisplays();
        this.updateAddButtons();

        this.emit('pos:cart-cleared');
    }

    /**
     * Update all stock displays
     */
    updateStockDisplays() {
        this.products.forEach(product => {
            this.updateStockDisplay(product.id);
        });
    }

    /**
     * Update all add buttons
     */
    updateAddButtons() {
        this.products.forEach(product => {
            this.updateAddButton(product.id);
        });
    }

    /**
     * Calculate cart totals
     */
    calculateTotals() {
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * this.options.taxRate;
        const shipping = this.options.shippingCost;
        const total = subtotal + tax + shipping;

        return {
            subtotal: Math.round(subtotal * 100) / 100,
            tax: Math.round(tax * 100) / 100,
            shipping: Math.round(shipping * 100) / 100,
            total: Math.round(total * 100) / 100,
            itemCount: this.cart.reduce((sum, item) => sum + item.quantity, 0)
        };
    }

    /**
     * Create cart UI
     */
    createCartUI() {
        // Remove existing cart UI
        const existingCart = document.querySelector('.pos-cart-container');
        if (existingCart) {
            existingCart.remove();
        }

        const cartContainer = document.createElement('div');
        cartContainer.className = 'pos-cart-container';
        cartContainer.innerHTML = `
            <div class="pos-cart-toggle">
                <span class="pos-cart-icon">🛒</span>
                <span class="pos-cart-count">0</span>
            </div>
            <div class="pos-cart-dropdown">
                <div class="pos-cart-header">
                    <h3>Shopping Cart</h3>
                    <button class="pos-cart-close">&times;</button>
                </div>
                <div class="pos-cart-items"></div>
                <div class="pos-cart-totals"></div>
                <div class="pos-cart-actions">
                    <button class="pos-cart-clear">Clear Cart</button>
                    <button class="pos-cart-checkout">Checkout</button>
                </div>
            </div>
        `;

        document.body.appendChild(cartContainer);
        this.bindCartEvents(cartContainer);
    }

    /**
     * Bind cart UI events
     */
    bindCartEvents(cartContainer) {
        const toggle = cartContainer.querySelector('.pos-cart-toggle');
        const dropdown = cartContainer.querySelector('.pos-cart-dropdown');
        const closeBtn = cartContainer.querySelector('.pos-cart-close');
        const clearBtn = cartContainer.querySelector('.pos-cart-clear');
        const checkoutBtn = cartContainer.querySelector('.pos-cart-checkout');

        toggle.addEventListener('click', () => {
            dropdown.classList.toggle('pos-cart-open');
        });

        closeBtn.addEventListener('click', () => {
            dropdown.classList.remove('pos-cart-open');
        });

        clearBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear your cart?')) {
                this.clearCart();
            }
        });

        checkoutBtn.addEventListener('click', () => {
            this.startCheckout();
        });

        // Close cart when clicking outside
        document.addEventListener('click', (e) => {
            if (!cartContainer.contains(e.target)) {
                dropdown.classList.remove('pos-cart-open');
            }
        });
    }

    /**
     * Update cart display
     */
    updateCartDisplay() {
        const cartContainer = document.querySelector('.pos-cart-container');
        if (!cartContainer) return;

        const cartCount = cartContainer.querySelector('.pos-cart-count');
        const cartItems = cartContainer.querySelector('.pos-cart-items');
        const cartTotals = cartContainer.querySelector('.pos-cart-totals');
        const checkoutBtn = cartContainer.querySelector('.pos-cart-checkout');

        const totals = this.calculateTotals();

        // Update cart count
        cartCount.textContent = totals.itemCount;
        cartCount.style.display = totals.itemCount > 0 ? 'inline' : 'none';

        // Update cart items
        if (this.cart.length === 0) {
            cartItems.innerHTML = '<div class="pos-cart-empty">Your cart is empty</div>';
            checkoutBtn.disabled = true;
        } else {
            cartItems.innerHTML = this.cart.map(item => `
                <div class="pos-cart-item" data-product-id="${item.id}">
                    ${item.image ? `<img src="${item.image}" alt="${item.name}" class="pos-cart-item-image">` : ''}
                    <div class="pos-cart-item-details">
                        <div class="pos-cart-item-name">${item.name}</div>
                        <div class="pos-cart-item-price">${this.options.currency}${item.price.toFixed(2)}</div>
                        <div class="pos-cart-item-sku">SKU: ${item.sku}</div>
                    </div>
                    <div class="pos-cart-item-quantity">
                        <button class="pos-quantity-btn pos-quantity-decrease" data-product-id="${item.id}">-</button>
                        <span class="pos-quantity-display">${item.quantity}</span>
                        <button class="pos-quantity-btn pos-quantity-increase" data-product-id="${item.id}">+</button>
                    </div>
                    <div class="pos-cart-item-total">${this.options.currency}${(item.price * item.quantity).toFixed(2)}</div>
                    <button class="pos-cart-item-remove" data-product-id="${item.id}">&times;</button>
                </div>
            `).join('');
            checkoutBtn.disabled = false;

            // Bind quantity and remove buttons
            cartItems.querySelectorAll('.pos-quantity-decrease').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const productId = e.target.getAttribute('data-product-id');
                    this.removeFromCart(productId, 1);
                });
            });

            cartItems.querySelectorAll('.pos-quantity-increase').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const productId = e.target.getAttribute('data-product-id');
                    this.addToCart(productId, 1);
                });
            });

            cartItems.querySelectorAll('.pos-cart-item-remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const productId = e.target.getAttribute('data-product-id');
                    this.removeFromCart(productId);
                });
            });
        }

        // Update totals
        cartTotals.innerHTML = `
            <div class="pos-totals-line">
                <span>Subtotal:</span>
                <span>${this.options.currency}${totals.subtotal.toFixed(2)}</span>
            </div>
            ${this.options.taxRate > 0 ? `
                <div class="pos-totals-line">
                    <span>Tax:</span>
                    <span>${this.options.currency}${totals.tax.toFixed(2)}</span>
                </div>
            ` : ''}
            ${this.options.shippingCost > 0 ? `
                <div class="pos-totals-line">
                    <span>Shipping:</span>
                    <span>${this.options.currency}${totals.shipping.toFixed(2)}</span>
                </div>
            ` : ''}
            <div class="pos-totals-line pos-totals-total">
                <span>Total:</span>
                <span>${this.options.currency}${totals.total.toFixed(2)}</span>
            </div>
        `;
    }

    /**
     * Start checkout process
     */
    startCheckout() {
        if (this.cart.length === 0) {
            this.showNotification('Cart is empty', 'error');
            return;
        }

        const totals = this.calculateTotals();
        const checkoutData = {
            cart: this.cart,
            totals: totals,
            timestamp: new Date().toISOString()
        };

        this.emit('pos:checkout-started', checkoutData);

        // If API endpoint is configured, send data there
        if (this.options.apiEndpoint) {
            this.submitToAPI(checkoutData);
        } else {
            // Default checkout behavior - show summary and clear cart
            this.showCheckoutSummary(checkoutData);
        }
    }

    /**
     * Show checkout summary
     */
    showCheckoutSummary(checkoutData) {
        const summary = `
            Order Summary:
            
            Items:
            ${checkoutData.cart.map(item => `- ${item.name} x${item.quantity} = ${this.options.currency}${(item.price * item.quantity).toFixed(2)}`).join('\n')}
            
            Subtotal: ${this.options.currency}${checkoutData.totals.subtotal.toFixed(2)}
            ${this.options.taxRate > 0 ? `Tax: ${this.options.currency}${checkoutData.totals.tax.toFixed(2)}` : ''}
            ${this.options.shippingCost > 0 ? `Shipping: ${this.options.currency}${checkoutData.totals.shipping.toFixed(2)}` : ''}
            Total: ${this.options.currency}${checkoutData.totals.total.toFixed(2)}
        `;

        if (confirm(summary + '\n\nProceed with order?')) {
            this.completeCheckout(checkoutData);
        }
    }

    /**
     * Complete checkout
     */
    completeCheckout(checkoutData) {
        // Store order in localStorage
        const orders = JSON.parse(localStorage.getItem('universal-pos-orders') || '[]');
        orders.push({
            ...checkoutData,
            id: Date.now().toString(),
            status: 'completed'
        });
        localStorage.setItem('universal-pos-orders', JSON.stringify(orders));

        this.clearCart();
        this.showNotification('Order completed successfully!', 'success');
        this.emit('pos:checkout-completed', checkoutData);
    }

    /**
     * Submit checkout data to API
     */
    async submitToAPI(checkoutData) {
        try {
            const response = await fetch(this.options.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(checkoutData)
            });

            if (response.ok) {
                const result = await response.json();
                this.emit('pos:api-success', result);
                this.completeCheckout(checkoutData);
            } else {
                throw new Error(`API request failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Universal POS: API submission failed', error);
            this.showNotification('Checkout failed. Please try again.', 'error');
            this.emit('pos:api-error', error);
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        if (!this.options.notifications) return;

        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.pos-notification');
        existingNotifications.forEach(notification => notification.remove());

        const notification = document.createElement('div');
        notification.className = `pos-notification pos-notification-${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    /**
     * Bind global events
     */
    bindEvents() {
        // Re-scan products when DOM changes
        const observer = new MutationObserver((mutations) => {
            let shouldRescan = false;
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.hasAttribute && node.hasAttribute('data-pos-product') ||
                                node.querySelector && node.querySelector('[data-pos-product]')) {
                                shouldRescan = true;
                            }
                        }
                    });
                }
            });
            if (shouldRescan) {
                setTimeout(() => this.scanProducts(), 100);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Emit custom events
     */
    emit(eventName, data = null) {
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
    }

    /**
     * Public API methods
     */
    getCart() {
        return [...this.cart];
    }

    getProducts() {
        return [...this.products];
    }

    getInventory() {
        return { ...this.inventory };
    }

    setInventory(productId, quantity) {
        this.inventory[productId] = quantity;
        this.saveData();
        this.updateStockDisplay(productId);
        this.updateAddButton(productId);
    }

    updateProduct(productId, updates) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            Object.assign(product, updates);
            this.emit('pos:product-updated', { productId, updates });
        }
    }

    destroy() {
        // Remove cart UI
        const cartContainer = document.querySelector('.pos-cart-container');
        if (cartContainer) {
            cartContainer.remove();
        }

        // Remove product enhancements
        this.products.forEach(product => {
            const element = product.element;
            element.classList.remove('pos-product');
            
            // Remove added elements
            const addButton = element.querySelector('.pos-add-to-cart');
            const quantityInput = element.querySelector('.pos-quantity');
            const stockDisplay = element.querySelector('.pos-stock');
            
            if (addButton) addButton.remove();
            if (quantityInput) quantityInput.remove();
            if (stockDisplay) stockDisplay.remove();
        });

        this.isInitialized = false;
        this.emit('pos:destroyed');
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (!window.universalPOS) {
        window.universalPOS = new UniversalPOS();
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UniversalPOS;
}