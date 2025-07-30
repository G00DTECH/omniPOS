/**
 * POS Admin Dashboard
 * Complete management interface for the Universal POS System
 * Version: 1.0.0
 */

class AdminDashboard {
    constructor() {
        this.currentSection = 'dashboard';
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.filters = {};
        this.charts = {};
        this.settings = this.loadSettings();
        this.init();
    }

    /**
     * Initialize the admin dashboard
     */
    init() {
        this.bindEvents();
        this.loadData();
        this.updateStats();
        this.initializeDatePicker();
        this.initializeCharts();
        this.populateFilters();
        
        // Auto-refresh data every 30 seconds
        setInterval(() => {
            this.refreshData();
        }, 30000);

        console.log('Admin Dashboard initialized');
    }

    /**
     * Bind all event listeners
     */
    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.switchSection(section);
            });
        });

        // Sidebar toggle
        document.querySelector('.sidebar-toggle').addEventListener('click', () => {
            document.querySelector('.admin-sidebar').classList.toggle('collapsed');
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close, .modal').forEach(element => {
            element.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-close') || e.target.classList.contains('modal')) {
                    this.closeModal(e.target.closest('.modal').id);
                }
            });
        });

        // Select all checkbox
        document.getElementById('select-all-products').addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.inventory-table tbody input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
        });

        // Settings form changes
        document.querySelectorAll('#settings-section input, #settings-section select').forEach(input => {
            input.addEventListener('change', () => {
                this.settings[input.id] = input.type === 'checkbox' ? input.checked : input.value;
            });
        });

        // Real-time search
        document.getElementById('search-products').addEventListener('input', () => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.filterInventory();
            }, 300);
        });

        document.getElementById('search-orders').addEventListener('input', () => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.filterOrders();
            }, 300);
        });

        // Window resize handler for responsive charts
        window.addEventListener('resize', () => {
            Object.values(this.charts).forEach(chart => {
                if (chart) chart.resize();
            });
        });
    }

    /**
     * Switch between dashboard sections
     */
    switchSection(section) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`.nav-item[data-section="${section}"]`).classList.add('active');

        // Update content sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${section}-section`).classList.add('active');

        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            inventory: 'Inventory Management',
            analytics: 'Sales Analytics',
            orders: 'Order Management',
            settings: 'System Settings'
        };
        document.querySelector('.page-title').textContent = titles[section];

        this.currentSection = section;

        // Load section-specific data
        switch (section) {
            case 'inventory':
                this.loadInventory();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
            case 'orders':
                this.loadOrders();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    /**
     * Load all dashboard data
     */
    loadData() {
        this.loadInventory();
        this.loadOrders();
        this.loadRecentOrders();
        this.loadTopProducts();
        this.loadLowStockAlerts();
    }

    /**
     * Refresh all data
     */
    refreshData() {
        this.loadData();
        this.updateStats();
        if (this.currentSection === 'analytics') {
            this.updateCharts();
        }
        this.showNotification('Data refreshed', 'success');
    }

    /**
     * Update dashboard statistics
     */
    updateStats() {
        const orders = this.getOrders();
        const inventory = this.getInventory();
        const products = this.getProducts();

        // Calculate total revenue
        const totalRevenue = orders.reduce((sum, order) => sum + order.totals.total, 0);
        document.getElementById('total-revenue').textContent = this.formatCurrency(totalRevenue);

        // Total orders
        document.getElementById('total-orders').textContent = orders.length;

        // Total products
        document.getElementById('total-products').textContent = products.length;

        // Low stock count
        const lowStockCount = Object.values(inventory).filter(stock => stock <= this.settings.lowStockThreshold || 5).length;
        document.getElementById('low-stock-count').textContent = lowStockCount;

        // Update notification badge
        const notificationBadge = document.querySelector('.notification-badge');
        notificationBadge.textContent = lowStockCount;
        notificationBadge.style.display = lowStockCount > 0 ? 'inline' : 'none';
    }

    /**
     * Get orders from localStorage
     */
    getOrders() {
        try {
            return JSON.parse(localStorage.getItem('universal-pos-orders') || '[]');
        } catch (error) {
            console.error('Error loading orders:', error);
            return [];
        }
    }

    /**
     * Get inventory from localStorage or POS system
     */
    getInventory() {
        if (window.universalPOS) {
            return window.universalPOS.getInventory();
        }
        try {
            return JSON.parse(localStorage.getItem('universal-pos-inventory') || '{}');
        } catch (error) {
            console.error('Error loading inventory:', error);
            return {};
        }
    }

    /**
     * Get products from POS system
     */
    getProducts() {
        if (window.universalPOS) {
            return window.universalPOS.getProducts();
        }
        return [];
    }

    /**
     * Load inventory data
     */
    loadInventory() {
        const products = this.getProducts();
        const inventory = this.getInventory();
        const tbody = document.getElementById('inventory-table-body');

        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="no-data">No products found. Add products to your website with POS attributes.</td></tr>';
            return;
        }

        let html = '';
        products.forEach(product => {
            const stock = inventory[product.id] || 0;
            const status = this.getStockStatus(stock);
            
            html += `
                <tr data-product-id="${product.id}">
                    <td><input type="checkbox" value="${product.id}"></td>
                    <td>
                        <div class="product-info">
                            ${product.image ? `<img src="${product.image}" alt="${product.name}" class="product-thumb">` : ''}
                            <div>
                                <div class="product-name">${product.name}</div>
                                <div class="product-description">${product.description || ''}</div>
                            </div>
                        </div>
                    </td>
                    <td>${product.sku}</td>
                    <td><span class="category-badge">${product.category}</span></td>
                    <td>${this.formatCurrency(product.price)}</td>
                    <td>
                        <input type="number" class="stock-input" value="${stock}" 
                               data-product-id="${product.id}" onchange="adminDashboard.updateStock('${product.id}', this.value)">
                    </td>
                    <td><span class="status-badge ${status.class}">${status.text}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-sm btn-primary" onclick="adminDashboard.editProduct('${product.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-sm btn-danger" onclick="adminDashboard.deleteProduct('${product.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    /**
     * Get stock status
     */
    getStockStatus(stock) {
        const threshold = this.settings.lowStockThreshold || 5;
        if (stock <= 0) {
            return { class: 'out-of-stock', text: 'Out of Stock' };
        } else if (stock <= threshold) {
            return { class: 'low-stock', text: 'Low Stock' };
        } else {
            return { class: 'in-stock', text: 'In Stock' };
        }
    }

    /**
     * Update stock quantity
     */
    updateStock(productId, newStock) {
        const stock = parseInt(newStock) || 0;
        if (window.universalPOS) {
            window.universalPOS.setInventory(productId, stock);
        }
        this.updateStats();
        this.showNotification(`Stock updated for ${productId}`, 'success');
    }

    /**
     * Filter inventory
     */
    filterInventory() {
        const categoryFilter = document.getElementById('category-filter').value;
        const stockFilter = document.getElementById('stock-filter').value;
        const searchTerm = document.getElementById('search-products').value.toLowerCase();

        const rows = document.querySelectorAll('#inventory-table-body tr');
        
        rows.forEach(row => {
            if (row.querySelector('.no-data')) return;

            const productId = row.dataset.productId;
            const product = this.getProducts().find(p => p.id === productId);
            const stock = this.getInventory()[productId] || 0;
            
            let visible = true;

            // Category filter
            if (categoryFilter && product.category !== categoryFilter) {
                visible = false;
            }

            // Stock filter
            if (stockFilter) {
                const status = this.getStockStatus(stock);
                if ((stockFilter === 'in-stock' && status.class !== 'in-stock') ||
                    (stockFilter === 'low-stock' && status.class !== 'low-stock') ||
                    (stockFilter === 'out-of-stock' && status.class !== 'out-of-stock')) {
                    visible = false;
                }
            }

            // Search filter
            if (searchTerm && !product.name.toLowerCase().includes(searchTerm) && 
                !product.sku.toLowerCase().includes(searchTerm)) {
                visible = false;
            }

            row.style.display = visible ? '' : 'none';
        });
    }

    /**
     * Sort inventory
     */
    sortInventory(column) {
        const tbody = document.getElementById('inventory-table-body');
        const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => !row.querySelector('.no-data'));
        
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        rows.sort((a, b) => {
            const aId = a.dataset.productId;
            const bId = b.dataset.productId;
            const aProduct = this.getProducts().find(p => p.id === aId);
            const bProduct = this.getProducts().find(p => p.id === bId);
            
            let aValue, bValue;
            
            switch (column) {
                case 'name':
                    aValue = aProduct.name;
                    bValue = bProduct.name;
                    break;
                case 'sku':
                    aValue = aProduct.sku;
                    bValue = bProduct.sku;
                    break;
                case 'category':
                    aValue = aProduct.category;
                    bValue = bProduct.category;
                    break;
                case 'price':
                    aValue = aProduct.price;
                    bValue = bProduct.price;
                    break;
                case 'stock':
                    aValue = this.getInventory()[aId] || 0;
                    bValue = this.getInventory()[bId] || 0;
                    break;
                default:
                    return 0;
            }

            if (typeof aValue === 'number') {
                return this.sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
            } else {
                const comparison = aValue.localeCompare(bValue);
                return this.sortDirection === 'asc' ? comparison : -comparison;
            }
        });

        // Re-append sorted rows
        rows.forEach(row => tbody.appendChild(row));

        // Update sort indicators
        document.querySelectorAll('.inventory-table th i').forEach(icon => {
            icon.className = 'fas fa-sort';
        });
        const sortIcon = document.querySelector(`.inventory-table th[onclick="adminDashboard.sortInventory('${column}')"] i`);
        if (sortIcon) {
            sortIcon.className = `fas fa-sort-${this.sortDirection === 'asc' ? 'up' : 'down'}`;
        }
    }

    /**
     * Load orders
     */
    loadOrders() {
        const orders = this.getOrders();
        const tbody = document.getElementById('orders-table-body');

        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data">No orders found</td></tr>';
            return;
        }

        let html = '';
        orders.forEach(order => {
            const date = new Date(order.timestamp).toLocaleDateString();
            const itemCount = order.cart.reduce((sum, item) => sum + item.quantity, 0);
            
            html += `
                <tr data-order-id="${order.id}">
                    <td><span class="order-id">#${order.id}</span></td>
                    <td>${date}</td>
                    <td>${this.formatCurrency(order.totals.total)}</td>
                    <td>
                        <span class="item-count">${itemCount} items</span>
                        <div class="item-preview">
                            ${order.cart.slice(0, 2).map(item => item.name).join(', ')}
                            ${order.cart.length > 2 ? '...' : ''}
                        </div>
                    </td>
                    <td><span class="status-badge ${order.status}">${order.status}</span></td>
                    <td>
                        <div class="customer-info">
                            <div>Customer #${order.id.slice(-6)}</div>
                            <div class="customer-email">customer@example.com</div>
                        </div>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-sm btn-primary" onclick="adminDashboard.viewOrder('${order.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-sm btn-secondary" onclick="adminDashboard.updateOrderStatus('${order.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    /**
     * Filter orders
     */
    filterOrders() {
        const statusFilter = document.getElementById('order-status-filter').value;
        const dateFilter = document.getElementById('order-date-filter').value;
        const searchTerm = document.getElementById('search-orders').value.toLowerCase();

        const rows = document.querySelectorAll('#orders-table-body tr');
        
        rows.forEach(row => {
            if (row.querySelector('.no-data')) return;

            const orderId = row.dataset.orderId;
            const order = this.getOrders().find(o => o.id === orderId);
            
            let visible = true;

            // Status filter
            if (statusFilter && order.status !== statusFilter) {
                visible = false;
            }

            // Date filter
            if (dateFilter) {
                const orderDate = new Date(order.timestamp).toISOString().split('T')[0];
                if (orderDate !== dateFilter) {
                    visible = false;
                }
            }

            // Search filter
            if (searchTerm && !orderId.toLowerCase().includes(searchTerm)) {
                visible = false;
            }

            row.style.display = visible ? '' : 'none';
        });
    }

    /**
     * Sort orders
     */
    sortOrders(column) {
        const tbody = document.getElementById('orders-table-body');
        const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => !row.querySelector('.no-data'));
        
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        rows.sort((a, b) => {
            const aId = a.dataset.orderId;
            const bId = b.dataset.orderId;
            const aOrder = this.getOrders().find(o => o.id === aId);
            const bOrder = this.getOrders().find(o => o.id === bId);
            
            let aValue, bValue;
            
            switch (column) {
                case 'id':
                    aValue = aOrder.id;
                    bValue = bOrder.id;
                    break;
                case 'timestamp':
                    aValue = new Date(aOrder.timestamp);
                    bValue = new Date(bOrder.timestamp);
                    break;
                case 'total':
                    aValue = aOrder.totals.total;
                    bValue = bOrder.totals.total;
                    break;
                case 'status':
                    aValue = aOrder.status;
                    bValue = bOrder.status;
                    break;
                default:
                    return 0;
            }

            if (aValue instanceof Date) {
                return this.sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
            } else if (typeof aValue === 'number') {
                return this.sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
            } else {
                const comparison = aValue.localeCompare(bValue);
                return this.sortDirection === 'asc' ? comparison : -comparison;
            }
        });

        rows.forEach(row => tbody.appendChild(row));
    }

    /**
     * Load recent orders for dashboard
     */
    loadRecentOrders() {
        const orders = this.getOrders().slice(-5).reverse();
        const container = document.getElementById('recent-orders-list');

        if (orders.length === 0) {
            container.innerHTML = '<div class="no-data">No recent orders</div>';
            return;
        }

        let html = '';
        orders.forEach(order => {
            const date = new Date(order.timestamp).toLocaleDateString();
            html += `
                <div class="recent-order-item">
                    <div class="order-info">
                        <span class="order-id">#${order.id}</span>
                        <span class="order-date">${date}</span>
                    </div>
                    <div class="order-total">${this.formatCurrency(order.totals.total)}</div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    /**
     * Load top products for dashboard
     */
    loadTopProducts() {
        const orders = this.getOrders();
        const productSales = {};

        // Calculate product sales
        orders.forEach(order => {
            order.cart.forEach(item => {
                if (!productSales[item.id]) {
                    productSales[item.id] = {
                        name: item.name,
                        quantity: 0,
                        revenue: 0
                    };
                }
                productSales[item.id].quantity += item.quantity;
                productSales[item.id].revenue += item.price * item.quantity;
            });
        });

        // Sort by revenue and get top 5
        const topProducts = Object.values(productSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        const container = document.getElementById('top-products-list');

        if (topProducts.length === 0) {
            container.innerHTML = '<div class="no-data">No sales data available</div>';
            return;
        }

        let html = '';
        topProducts.forEach(product => {
            html += `
                <div class="top-product-item">
                    <div class="product-info">
                        <span class="product-name">${product.name}</span>
                        <span class="product-sales">${product.quantity} sold</span>
                    </div>
                    <div class="product-revenue">${this.formatCurrency(product.revenue)}</div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    /**
     * Load low stock alerts for dashboard
     */
    loadLowStockAlerts() {
        const products = this.getProducts();
        const inventory = this.getInventory();
        const threshold = this.settings.lowStockThreshold || 5;

        const lowStockProducts = products.filter(product => {
            const stock = inventory[product.id] || 0;
            return stock <= threshold;
        });

        const container = document.getElementById('low-stock-alerts');

        if (lowStockProducts.length === 0) {
            container.innerHTML = '<div class="no-data">All products in stock</div>';
            return;
        }

        let html = '';
        lowStockProducts.forEach(product => {
            const stock = inventory[product.id] || 0;
            html += `
                <div class="low-stock-item">
                    <div class="product-info">
                        <span class="product-name">${product.name}</span>
                        <span class="product-sku">SKU: ${product.sku}</span>
                    </div>
                    <div class="stock-level ${stock === 0 ? 'out-of-stock' : 'low-stock'}">
                        ${stock} remaining
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    /**
     * Initialize date picker
     */
    initializeDatePicker() {
        if (typeof flatpickr !== 'undefined') {
            flatpickr('#date-range', {
                mode: 'range',
                dateFormat: 'Y-m-d',
                defaultDate: [
                    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
                    new Date()
                ],
                onChange: (selectedDates) => {
                    this.updateAnalytics(selectedDates);
                }
            });
        }
    }

    /**
     * Initialize charts
     */
    initializeCharts() {
        if (typeof Chart === 'undefined') {
            console.error('Chart.js not loaded');
            return;
        }

        // Revenue chart
        this.initRevenueChart();
        this.initProductsChart();
        this.initCategoryChart();
    }

    /**
     * Initialize revenue chart
     */
    initRevenueChart() {
        const ctx = document.getElementById('revenue-chart');
        if (!ctx) return;

        const orders = this.getOrders();
        const last7Days = this.getLast7Days();
        const revenueData = last7Days.map(date => {
            const dayOrders = orders.filter(order => {
                const orderDate = new Date(order.timestamp).toDateString();
                return orderDate === date.toDateString();
            });
            return dayOrders.reduce((sum, order) => sum + order.totals.total, 0);
        });

        this.charts.revenue = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last7Days.map(date => date.toLocaleDateString()),
                datasets: [{
                    label: 'Revenue',
                    data: revenueData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Initialize products chart
     */
    initProductsChart() {
        const ctx = document.getElementById('products-chart');
        if (!ctx) return;

        const orders = this.getOrders();
        const productSales = {};

        orders.forEach(order => {
            order.cart.forEach(item => {
                productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
            });
        });

        const topProducts = Object.entries(productSales)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);

        this.charts.products = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topProducts.map(([name]) => name),
                datasets: [{
                    label: 'Quantity Sold',
                    data: topProducts.map(([,quantity]) => quantity),
                    backgroundColor: '#10b981',
                    borderColor: '#059669',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    /**
     * Initialize category chart
     */
    initCategoryChart() {
        const ctx = document.getElementById('category-chart');
        if (!ctx) return;

        const orders = this.getOrders();
        const products = this.getProducts();
        const categorySales = {};

        orders.forEach(order => {
            order.cart.forEach(item => {
                const product = products.find(p => p.id === item.id);
                const category = product ? product.category : 'Unknown';
                categorySales[category] = (categorySales[category] || 0) + (item.price * item.quantity);
            });
        });

        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
        const categoryData = Object.entries(categorySales);

        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categoryData.map(([category]) => category),
                datasets: [{
                    data: categoryData.map(([,revenue]) => revenue),
                    backgroundColor: colors.slice(0, categoryData.length),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    /**
     * Update charts
     */
    updateCharts() {
        this.initRevenueChart();
        this.initProductsChart();
        this.initCategoryChart();
    }

    /**
     * Get last 7 days
     */
    getLast7Days() {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date);
        }
        return days;
    }

    /**
     * Populate filter options
     */
    populateFilters() {
        const products = this.getProducts();
        const categories = [...new Set(products.map(p => p.category))];

        // Category filters
        const categoryFilters = [
            document.getElementById('category-filter'),
            document.getElementById('bulk-category')
        ];

        categoryFilters.forEach(select => {
            if (select) {
                const currentValue = select.value;
                select.innerHTML = '<option value="">All Categories</option>';
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = category;
                    select.appendChild(option);
                });
                select.value = currentValue;
            }
        });
    }

    /**
     * Show add product dialog
     */
    showAddProductDialog() {
        document.getElementById('product-modal-title').textContent = 'Add Product';
        document.getElementById('product-form').reset();
        document.getElementById('product-id').readOnly = false;
        this.showModal('product-modal');
    }

    /**
     * Edit product
     */
    editProduct(productId) {
        const products = this.getProducts();
        const product = products.find(p => p.id === productId);
        
        if (!product) {
            this.showNotification('Product not found', 'error');
            return;
        }

        document.getElementById('product-modal-title').textContent = 'Edit Product';
        document.getElementById('product-id').value = product.id;
        document.getElementById('product-id').readOnly = true;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-sku').value = product.sku;
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-stock').value = this.getInventory()[product.id] || 0;
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-image').value = product.image || '';
        
        this.showModal('product-modal');
    }

    /**
     * Save product
     */
    saveProduct() {
        const form = document.getElementById('product-form');
        const formData = new FormData(form);
        
        const productData = {
            id: document.getElementById('product-id').value,
            name: document.getElementById('product-name').value,
            sku: document.getElementById('product-sku').value,
            category: document.getElementById('product-category').value,
            price: parseFloat(document.getElementById('product-price').value),
            description: document.getElementById('product-description').value,
            image: document.getElementById('product-image').value
        };

        const stock = parseInt(document.getElementById('product-stock').value) || 0;

        // Validate required fields
        if (!productData.id || !productData.name || !productData.sku || !productData.category || isNaN(productData.price)) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        // For demonstration, we'll show success message
        // In a real application, you would create/update the product in your system
        this.showNotification(`Product ${productData.name} saved successfully`, 'success');
        
        if (window.universalPOS) {
            window.universalPOS.setInventory(productData.id, stock);
        }

        this.closeModal('product-modal');
        this.loadInventory();
        this.updateStats();
    }

    /**
     * Delete product
     */
    deleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product?')) {
            return;
        }

        // In a real application, you would delete the product from your system
        this.showNotification('Product deleted successfully', 'success');
        this.loadInventory();
        this.updateStats();
    }

    /**
     * Show bulk update dialog
     */
    bulkUpdateInventory() {
        this.populateFilters();
        this.showModal('bulk-update-modal');
    }

    /**
     * Apply bulk update
     */
    applyBulkUpdate() {
        const action = document.getElementById('bulk-action').value;
        const quantity = parseInt(document.getElementById('bulk-quantity').value) || 0;
        const category = document.getElementById('bulk-category').value;

        if (!action || quantity < 0) {
            this.showNotification('Please enter valid update parameters', 'error');
            return;
        }

        const products = this.getProducts();
        const inventory = this.getInventory();
        let updatedCount = 0;

        products.forEach(product => {
            if (category && product.category !== category) {
                return;
            }

            const currentStock = inventory[product.id] || 0;
            let newStock;

            switch (action) {
                case 'add':
                    newStock = currentStock + quantity;
                    break;
                case 'subtract':
                    newStock = Math.max(0, currentStock - quantity);
                    break;
                case 'set':
                    newStock = quantity;
                    break;
                default:
                    return;
            }

            if (window.universalPOS) {
                window.universalPOS.setInventory(product.id, newStock);
            }
            updatedCount++;
        });

        this.closeModal('bulk-update-modal');
        this.loadInventory();
        this.updateStats();
        this.showNotification(`Updated ${updatedCount} products`, 'success');
    }

    /**
     * View order details
     */
    viewOrder(orderId) {
        const orders = this.getOrders();
        const order = orders.find(o => o.id === orderId);
        
        if (!order) {
            this.showNotification('Order not found', 'error');
            return;
        }

        const content = document.getElementById('order-details-content');
        const date = new Date(order.timestamp);
        
        content.innerHTML = `
            <div class="order-details">
                <div class="order-header">
                    <h4>Order #${order.id}</h4>
                    <span class="status-badge ${order.status}">${order.status}</span>
                </div>
                
                <div class="order-info-grid">
                    <div class="info-item">
                        <label>Date:</label>
                        <span>${date.toLocaleDateString()} ${date.toLocaleTimeString()}</span>
                    </div>
                    <div class="info-item">
                        <label>Customer:</label>
                        <span>Customer #${order.id.slice(-6)}</span>
                    </div>
                    <div class="info-item">
                        <label>Items:</label>
                        <span>${order.cart.reduce((sum, item) => sum + item.quantity, 0)} items</span>
                    </div>
                    <div class="info-item">
                        <label>Status:</label>
                        <select id="order-status-select">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="refunded" ${order.status === 'refunded' ? 'selected' : ''}>Refunded</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </div>
                </div>

                <div class="order-items">
                    <h5>Items Ordered</h5>
                    <table class="order-items-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>SKU</th>
                                <th>Price</th>
                                <th>Quantity</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.cart.map(item => `
                                <tr>
                                    <td>
                                        <div class="item-info">
                                            ${item.image ? `<img src="${item.image}" alt="${item.name}" class="item-thumb">` : ''}
                                            <span>${item.name}</span>
                                        </div>
                                    </td>
                                    <td>${item.sku}</td>
                                    <td>${this.formatCurrency(item.price)}</td>
                                    <td>${item.quantity}</td>
                                    <td>${this.formatCurrency(item.price * item.quantity)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="order-totals">
                    <div class="totals-row">
                        <span>Subtotal:</span>
                        <span>${this.formatCurrency(order.totals.subtotal)}</span>
                    </div>
                    ${order.totals.tax > 0 ? `
                        <div class="totals-row">
                            <span>Tax:</span>
                            <span>${this.formatCurrency(order.totals.tax)}</span>
                        </div>
                    ` : ''}
                    ${order.totals.shipping > 0 ? `
                        <div class="totals-row">
                            <span>Shipping:</span>
                            <span>${this.formatCurrency(order.totals.shipping)}</span>
                        </div>
                    ` : ''}
                    <div class="totals-row total-row">
                        <span>Total:</span>
                        <span>${this.formatCurrency(order.totals.total)}</span>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('update-order-status').onclick = () => {
            this.updateOrderStatusFromModal(orderId);
        };

        this.showModal('order-modal');
    }

    /**
     * Update order status from modal
     */
    updateOrderStatusFromModal(orderId) {
        const newStatus = document.getElementById('order-status-select').value;
        const orders = this.getOrders();
        const order = orders.find(o => o.id === orderId);
        
        if (order) {
            order.status = newStatus;
            localStorage.setItem('universal-pos-orders', JSON.stringify(orders));
            this.loadOrders();
            this.closeModal('order-modal');
            this.showNotification(`Order status updated to ${newStatus}`, 'success');
        }
    }

    /**
     * Export inventory to CSV
     */
    exportInventory() {
        const products = this.getProducts();
        const inventory = this.getInventory();
        
        const csvData = [
            ['Product ID', 'Name', 'SKU', 'Category', 'Price', 'Stock', 'Description'],
            ...products.map(product => [
                product.id,
                product.name,
                product.sku,
                product.category,
                product.price,
                inventory[product.id] || 0,
                product.description || ''
            ])
        ];

        this.downloadCSV(csvData, 'inventory-export.csv');
        this.showNotification('Inventory exported successfully', 'success');
    }

    /**
     * Export orders to CSV
     */
    exportOrders() {
        const orders = this.getOrders();
        
        const csvData = [
            ['Order ID', 'Date', 'Status', 'Items', 'Subtotal', 'Tax', 'Shipping', 'Total'],
            ...orders.map(order => [
                order.id,
                new Date(order.timestamp).toLocaleDateString(),
                order.status,
                order.cart.reduce((sum, item) => sum + item.quantity, 0),
                order.totals.subtotal,
                order.totals.tax,
                order.totals.shipping,
                order.totals.total
            ])
        ];

        this.downloadCSV(csvData, 'orders-export.csv');
        this.showNotification('Orders exported successfully', 'success');
    }

    /**
     * Download CSV file
     */
    downloadCSV(data, filename) {
        const csv = data.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    /**
     * Load settings
     */
    loadSettings() {
        const defaultSettings = {
            'store-name': 'Universal POS Store',
            'store-currency': '$',
            'tax-rate': 8,
            'shipping-cost': 9.99,
            'api-endpoint': '',
            'api-key': '',
            'api-sync-enabled': false,
            'low-stock-threshold': 5,
            'notifications-enabled': true,
            'auto-reorder-enabled': false,
            'reorder-quantity': 10,
            'date-format': 'MM/DD/YYYY',
            'items-per-page': 50,
            'dark-mode-enabled': false
        };

        try {
            const stored = localStorage.getItem('pos-admin-settings');
            const settings = stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
            
            // Apply settings to form
            Object.entries(settings).forEach(([key, value]) => {
                const element = document.getElementById(key);
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = value;
                    } else {
                        element.value = value;
                    }
                }
            });

            this.settings = settings;
            return settings;
        } catch (error) {
            console.error('Error loading settings:', error);
            return defaultSettings;
        }
    }

    /**
     * Save settings
     */
    saveSettings() {
        const settings = {};
        
        document.querySelectorAll('#settings-section input, #settings-section select').forEach(input => {
            settings[input.id] = input.type === 'checkbox' ? input.checked : input.value;
        });

        try {
            localStorage.setItem('pos-admin-settings', JSON.stringify(settings));
            this.settings = settings;
            
            // Apply settings to POS system if available
            if (window.universalPOS) {
                window.universalPOS.options.currency = settings['store-currency'];
                window.universalPOS.options.taxRate = parseFloat(settings['tax-rate']) / 100;
                window.universalPOS.options.shippingCost = parseFloat(settings['shipping-cost']);
                window.universalPOS.options.notifications = settings['notifications-enabled'];
            }

            this.showNotification('Settings saved successfully', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showNotification('Error saving settings', 'error');
        }
    }

    /**
     * Reset settings to default
     */
    resetSettings() {
        if (!confirm('Are you sure you want to reset all settings to default?')) {
            return;
        }

        localStorage.removeItem('pos-admin-settings');
        this.loadSettings();
        this.showNotification('Settings reset to default', 'success');
    }

    /**
     * Test API connection
     */
    async testAPIConnection() {
        const endpoint = document.getElementById('api-endpoint').value;
        const apiKey = document.getElementById('api-key').value;

        if (!endpoint) {
            this.showNotification('Please enter an API endpoint', 'error');
            return;
        }

        try {
            const response = await fetch(endpoint, {
                method: 'HEAD',
                headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}
            });

            if (response.ok) {
                this.showNotification('API connection successful', 'success');
            } else {
                this.showNotification(`API connection failed: ${response.status}`, 'error');
            }
        } catch (error) {
            this.showNotification('API connection failed: Network error', 'error');
        }
    }

    /**
     * Backup data
     */
    backupData() {
        const data = {
            orders: this.getOrders(),
            inventory: this.getInventory(),
            settings: this.settings,
            timestamp: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `pos-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.showNotification('Data backup created successfully', 'success');
    }

    /**
     * Restore data
     */
    restoreData() {
        const fileInput = document.getElementById('restore-file');
        const file = fileInput.files[0];

        if (!file) {
            this.showNotification('Please select a backup file', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.orders) {
                    localStorage.setItem('universal-pos-orders', JSON.stringify(data.orders));
                }
                if (data.inventory && window.universalPOS) {
                    Object.entries(data.inventory).forEach(([productId, stock]) => {
                        window.universalPOS.setInventory(productId, stock);
                    });
                }
                if (data.settings) {
                    localStorage.setItem('pos-admin-settings', JSON.stringify(data.settings));
                    this.loadSettings();
                }

                this.refreshData();
                this.showNotification('Data restored successfully', 'success');
            } catch (error) {
                console.error('Error restoring data:', error);
                this.showNotification('Error restoring data: Invalid file format', 'error');
            }
        };

        reader.readAsText(file);
    }

    /**
     * Clear all data
     */
    clearAllData() {
        if (!confirm('Are you sure you want to clear ALL data? This action cannot be undone.')) {
            return;
        }

        localStorage.removeItem('universal-pos-orders');
        localStorage.removeItem('universal-pos-inventory');
        localStorage.removeItem('universal-pos-cart');
        localStorage.removeItem('pos-admin-settings');

        if (window.universalPOS) {
            window.universalPOS.clearCart();
        }

        this.refreshData();
        this.loadSettings();
        this.showNotification('All data cleared successfully', 'success');
    }

    /**
     * Show modal
     */
    showModal(modalId) {
        document.getElementById(modalId).style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close modal
     */
    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
        document.body.style.overflow = '';
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;

        container.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);

        // Manual close
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }

    /**
     * Format currency
     */
    formatCurrency(amount) {
        const currency = this.settings['store-currency'] || '$';
        return `${currency}${parseFloat(amount).toFixed(2)}`;
    }
}

// Initialize admin dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
});