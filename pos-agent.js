/**
 * Universal POS AI Agent System
 * Intelligent assistant for POS setup, optimization, and management
 * Version: 1.0.0
 */

class POSAgent {
    constructor(posSystem = null) {
        this.posSystem = posSystem || window.universalPOS;
        this.isActive = false;
        this.analysisCache = new Map();
        this.conversationHistory = [];
        this.setupProgress = {};
        
        // AI capabilities configuration
        this.capabilities = {
            productDetection: true,
            inventoryAnalysis: true,
            pricingOptimization: true,
            setupAssistance: true,
            troubleshooting: true,
            recommendations: true
        };

        // Analysis patterns and rules
        this.analysisRules = {
            pricing: {
                minPrice: 0.01,
                maxVariance: 0.5, // 50% price variance threshold
                competitiveRange: 0.2 // 20% competitive range
            },
            inventory: {
                lowStockThreshold: 5,
                outOfStockAlert: 0,
                overStockThreshold: 100
            },
            quality: {
                minProductNameLength: 3,
                requiredAttributes: ['name', 'price'],
                imageRequired: false
            }
        };

        this.init();
    }

    /**
     * Initialize the AI agent system
     */
    async init() {
        try {
            await this.waitForPOSSystem();
            this.createAgentUI();
            this.bindEvents();
            this.startPeriodicAnalysis();
            this.isActive = true;
            
            this.log('POS Agent initialized successfully', 'info');
            this.addMessage('assistant', 'Hello! I\'m your POS AI Assistant. I can help you optimize your store, analyze products, and configure settings. How can I help you today?');
            
        } catch (error) {
            this.log('Failed to initialize POS Agent', 'error', error);
            throw error;
        }
    }

    /**
     * Wait for the main POS system to be ready
     */
    async waitForPOSSystem(maxAttempts = 10) {
        for (let i = 0; i < maxAttempts; i++) {
            if (this.posSystem && this.posSystem.isInitialized) {
                return;
            }
            if (window.universalPOS && window.universalPOS.isInitialized) {
                this.posSystem = window.universalPOS;
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        throw new Error('POS System not available');
    }

    /**
     * Create the agent UI interface
     */
    createAgentUI() {
        // Remove existing agent UI
        const existing = document.getElementById('pos-agent-container');
        if (existing) existing.remove();

        const agentContainer = document.createElement('div');
        agentContainer.id = 'pos-agent-container';
        agentContainer.innerHTML = `
            <div class="pos-agent-toggle" id="pos-agent-toggle">
                <div class="agent-icon">🤖</div>
                <div class="agent-status">AI Assistant</div>
            </div>
            
            <div class="pos-agent-panel" id="pos-agent-panel">
                <div class="agent-header">
                    <h3>POS AI Assistant</h3>
                    <div class="agent-controls">
                        <button class="agent-btn" id="analysis-btn" title="Run Analysis">📊</button>
                        <button class="agent-btn" id="setup-btn" title="Setup Wizard">⚙️</button>
                        <button class="agent-btn" id="close-agent">✕</button>
                    </div>
                </div>
                
                <div class="agent-content">
                    <div class="agent-tabs">
                        <button class="tab-btn active" data-tab="chat">Chat</button>
                        <button class="tab-btn" data-tab="analysis">Analysis</button>
                        <button class="tab-btn" data-tab="setup">Setup</button>
                        <button class="tab-btn" data-tab="recommendations">Tips</button>
                    </div>
                    
                    <div class="tab-content" id="chat-tab">
                        <div class="chat-messages" id="chat-messages"></div>
                        <div class="chat-input-container">
                            <input type="text" id="chat-input" placeholder="Ask me anything about your POS system..." />
                            <button id="send-message">Send</button>
                        </div>
                    </div>
                    
                    <div class="tab-content" id="analysis-tab" style="display: none;">
                        <div class="analysis-dashboard">
                            <div class="analysis-section">
                                <h4>Product Analysis</h4>
                                <div id="product-analysis-results">Click "Run Analysis" to scan your products</div>
                            </div>
                            <div class="analysis-section">
                                <h4>Inventory Status</h4>
                                <div id="inventory-analysis-results">No inventory data available</div>
                            </div>
                            <div class="analysis-section">
                                <h4>Pricing Analysis</h4>
                                <div id="pricing-analysis-results">No pricing data available</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="tab-content" id="setup-tab" style="display: none;">
                        <div class="setup-wizard">
                            <h4>POS Setup Wizard</h4>
                            <div id="setup-progress"></div>
                            <div id="setup-steps"></div>
                        </div>
                    </div>
                    
                    <div class="tab-content" id="recommendations-tab" style="display: none;">
                        <div class="recommendations-panel">
                            <h4>Smart Recommendations</h4>
                            <div id="recommendations-list">Loading recommendations...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(agentContainer);
        this.injectStyles();
        this.bindUIEvents();
    }

    /**
     * Inject CSS styles for the agent UI
     */
    injectStyles() {
        const styleId = 'pos-agent-styles';
        if (document.getElementById(styleId)) return;

        const styles = document.createElement('style');
        styles.id = styleId;
        styles.textContent = `
            #pos-agent-container {
                position: fixed;
                bottom: 20px;
                left: 20px;
                z-index: 10001;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .pos-agent-toggle {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 16px;
                border-radius: 25px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                transition: all 0.3s ease;
                min-width: 150px;
            }

            .pos-agent-toggle:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0,0,0,0.25);
            }

            .agent-icon {
                font-size: 20px;
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }

            .agent-status {
                font-size: 14px;
                font-weight: 500;
            }

            .pos-agent-panel {
                position: absolute;
                bottom: 70px;
                left: 0;
                width: 400px;
                max-height: 600px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.15);
                display: none;
                flex-direction: column;
                overflow: hidden;
                border: 1px solid #e1e5e9;
            }

            .pos-agent-panel.active {
                display: flex;
            }

            .agent-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .agent-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
            }

            .agent-controls {
                display: flex;
                gap: 8px;
            }

            .agent-btn {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 6px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s ease;
            }

            .agent-btn:hover {
                background: rgba(255,255,255,0.3);
            }

            .agent-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                min-height: 0;
            }

            .agent-tabs {
                display: flex;
                border-bottom: 1px solid #e1e5e9;
                background: #f8f9fa;
            }

            .tab-btn {
                background: none;
                border: none;
                padding: 12px 16px;
                cursor: pointer;
                font-size: 13px;
                color: #666;
                transition: all 0.2s ease;
                flex: 1;
            }

            .tab-btn.active {
                color: #667eea;
                border-bottom: 2px solid #667eea;
                background: white;
            }

            .tab-content {
                flex: 1;
                min-height: 0;
                display: flex;
                flex-direction: column;
            }

            .chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                max-height: 400px;
                min-height: 300px;
            }

            .message {
                margin-bottom: 16px;
                display: flex;
                flex-direction: column;
            }

            .message.user {
                align-items: flex-end;
            }

            .message.assistant {
                align-items: flex-start;
            }

            .message-content {
                max-width: 80%;
                padding: 10px 14px;
                border-radius: 18px;
                font-size: 14px;
                line-height: 1.4;
            }

            .message.user .message-content {
                background: #667eea;
                color: white;
            }

            .message.assistant .message-content {
                background: #f1f3f4;
                color: #333;
            }

            .message-time {
                font-size: 11px;
                color: #999;
                margin-top: 4px;
                margin-bottom: 2px;
            }

            .chat-input-container {
                padding: 16px;
                border-top: 1px solid #e1e5e9;
                display: flex;
                gap: 8px;
                background: #f8f9fa;
            }

            #chat-input {
                flex: 1;
                padding: 10px 12px;
                border: 1px solid #ddd;
                border-radius: 20px;
                outline: none;
                font-size: 14px;
            }

            #chat-input:focus {
                border-color: #667eea;
            }

            #send-message {
                background: #667eea;
                color: white;
                border: none;
                padding: 10px 16px;
                border-radius: 20px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
            }

            #send-message:hover {
                background: #5a6fd8;
            }

            .analysis-dashboard, .setup-wizard, .recommendations-panel {
                padding: 16px;
                overflow-y: auto;
                max-height: 500px;
            }

            .analysis-section {
                margin-bottom: 20px;
                padding: 16px;
                background: #f8f9fa;
                border-radius: 8px;
                border: 1px solid #e1e5e9;
            }

            .analysis-section h4 {
                margin: 0 0 12px 0;
                color: #333;
                font-size: 14px;
                font-weight: 600;
            }

            .setup-step {
                padding: 12px;
                border: 1px solid #e1e5e9;
                border-radius: 6px;
                margin-bottom: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .setup-step:hover {
                background: #f8f9fa;
            }

            .setup-step.completed {
                background: #d4edda;
                border-color: #c3e6cb;
            }

            .setup-step.active {
                background: #e2e6ea;
                border-color: #adb5bd;
            }

            .recommendation-item {
                padding: 12px;
                border-left: 4px solid #667eea;
                background: #f8f9fa;
                margin-bottom: 12px;
                border-radius: 0 6px 6px 0;
            }

            .recommendation-title {
                font-weight: 600;
                color: #333;
                margin-bottom: 4px;
            }

            .recommendation-desc {
                font-size: 13px;
                color: #666;
                line-height: 1.4;
            }

            .analysis-metric {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid #eee;
            }

            .analysis-metric:last-child {
                border-bottom: none;
            }

            .metric-label {
                font-size: 13px;
                color: #666;
            }

            .metric-value {
                font-weight: 600;
                color: #333;
            }

            .metric-value.warning {
                color: #f39c12;
            }

            .metric-value.error {
                color: #e74c3c;
            }

            .metric-value.success {
                color: #27ae60;
            }

            .loading {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 40px;
                color: #666;
            }

            .progress-bar {
                background: #e1e5e9;
                border-radius: 10px;
                height: 8px;
                margin: 8px 0;
                overflow: hidden;
            }

            .progress-fill {
                background: linear-gradient(90deg, #667eea, #764ba2);
                height: 100%;
                transition: width 0.3s ease;
            }
        `;

        document.head.appendChild(styles);
    }

    /**
     * Bind UI event handlers
     */
    bindUIEvents() {
        const toggle = document.getElementById('pos-agent-toggle');
        const panel = document.getElementById('pos-agent-panel');
        const closeBtn = document.getElementById('close-agent');
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-message');
        const analysisBtn = document.getElementById('analysis-btn');
        const setupBtn = document.getElementById('setup-btn');

        // Toggle panel
        toggle.addEventListener('click', () => {
            panel.classList.toggle('active');
        });

        // Close panel
        closeBtn.addEventListener('click', () => {
            panel.classList.remove('active');
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Chat functionality
        const sendMessage = () => {
            const message = chatInput.value.trim();
            if (message) {
                this.handleUserMessage(message);
                chatInput.value = '';
            }
        };

        sendBtn.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        // Analysis button
        analysisBtn.addEventListener('click', () => {
            this.runFullAnalysis();
            this.switchTab('analysis');
        });

        // Setup button
        setupBtn.addEventListener('click', () => {
            this.startSetupWizard();
            this.switchTab('setup');
        });

        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (!document.getElementById('pos-agent-container').contains(e.target)) {
                panel.classList.remove('active');
            }
        });
    }

    /**
     * Switch between agent tabs
     */
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = content.id === `${tabName}-tab` ? 'flex' : 'none';
        });

        // Load tab-specific content
        if (tabName === 'recommendations') {
            this.loadRecommendations();
        }
    }

    /**
     * Handle user messages in chat
     */
    async handleUserMessage(message) {
        this.addMessage('user', message);
        
        // Add typing indicator
        const typingId = this.addMessage('assistant', 'Analyzing your request...', true);
        
        try {
            const response = await this.processUserQuery(message);
            this.removeMessage(typingId);
            this.addMessage('assistant', response);
        } catch (error) {
            this.removeMessage(typingId);
            this.addMessage('assistant', 'I apologize, but I encountered an error processing your request. Please try rephrasing your question.');
            this.log('Error processing user query', 'error', error);
        }
    }

    /**
     * Process user queries with natural language understanding
     */
    async processUserQuery(query) {
        const lowerQuery = query.toLowerCase();
        
        // Intent classification
        if (this.matchesIntent(lowerQuery, ['analyze', 'analysis', 'check', 'scan', 'review'])) {
            await this.runFullAnalysis();
            return this.generateAnalysisResponse();
        }
        
        if (this.matchesIntent(lowerQuery, ['setup', 'configure', 'install', 'initialize'])) {
            this.startSetupWizard();
            return "I've started the setup wizard for you. You can find it in the Setup tab. Let me walk you through configuring your POS system optimally.";
        }
        
        if (this.matchesIntent(lowerQuery, ['products', 'inventory', 'stock', 'items'])) {
            const productAnalysis = await this.analyzeProducts();
            return this.formatProductAnalysisResponse(productAnalysis);
        }
        
        if (this.matchesIntent(lowerQuery, ['price', 'pricing', 'cost', 'expensive', 'cheap'])) {
            const pricingAnalysis = await this.analyzePricing();
            return this.formatPricingAnalysisResponse(pricingAnalysis);
        }
        
        if (this.matchesIntent(lowerQuery, ['help', 'how', 'what', 'explain'])) {
            return this.generateHelpResponse(lowerQuery);
        }
        
        if (this.matchesIntent(lowerQuery, ['recommend', 'suggest', 'improve', 'optimize'])) {
            const recommendations = await this.generateRecommendations();
            return this.formatRecommendationsResponse(recommendations);
        }
        
        // Default response with general analysis
        const quickAnalysis = await this.getQuickSystemStatus();
        return `Based on your current setup: ${quickAnalysis}. Is there something specific you'd like me to help you with? I can analyze products, help with setup, provide recommendations, or answer questions about your POS system.`;
    }

    /**
     * Check if query matches intent keywords
     */
    matchesIntent(query, keywords) {
        return keywords.some(keyword => query.includes(keyword));
    }

    /**
     * Add message to chat
     */
    addMessage(sender, content, isTemporary = false) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        messageDiv.id = messageId;
        
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="message-time">${time}</div>
            <div class="message-content">${content}</div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Store in conversation history
        if (!isTemporary) {
            this.conversationHistory.push({
                id: messageId,
                sender,
                content,
                timestamp: new Date().toISOString()
            });
        }
        
        return messageId;
    }

    /**
     * Remove message from chat
     */
    removeMessage(messageId) {
        const messageElement = document.getElementById(messageId);
        if (messageElement) {
            messageElement.remove();
        }
    }

    /**
     * Run comprehensive system analysis
     */
    async runFullAnalysis() {
        const analysisResults = {
            products: await this.analyzeProducts(),
            inventory: await this.analyzeInventory(),
            pricing: await this.analyzePricing(),
            performance: await this.analyzePerformance(),
            configuration: await this.analyzeConfiguration()
        };

        this.updateAnalysisUI(analysisResults);
        return analysisResults;
    }

    /**
     * Analyze products in the system
     */
    async analyzeProducts() {
        const products = this.posSystem ? this.posSystem.getProducts() : [];
        const productElements = document.querySelectorAll('[data-pos-product], [data-product-id], .product, .item');
        
        const analysis = {
            totalProducts: products.length,
            enhancedProducts: products.length,
            potentialProducts: productElements.length,
            missingProducts: Math.max(0, productElements.length - products.length),
            qualityIssues: [],
            recommendations: []
        };

        // Analyze product quality
        products.forEach(product => {
            const issues = this.validateProduct(product);
            if (issues.length > 0) {
                analysis.qualityIssues.push({
                    productId: product.id,
                    productName: product.name,
                    issues: issues
                });
            }
        });

        // Check for unenhanced products
        if (analysis.missingProducts > 0) {
            analysis.recommendations.push({
                type: 'product_detection',
                priority: 'high',
                message: `Found ${analysis.missingProducts} potential products that aren't integrated with the POS system`,
                action: 'Run product scan to integrate missing products'
            });
        }

        // Check product quality
        if (analysis.qualityIssues.length > 0) {
            analysis.recommendations.push({
                type: 'product_quality',
                priority: 'medium',
                message: `${analysis.qualityIssues.length} products have quality issues`,
                action: 'Review and fix product attribute problems'
            });
        }

        this.analysisCache.set('products', analysis);
        return analysis;
    }

    /**
     * Validate individual product quality
     */
    validateProduct(product) {
        const issues = [];

        if (!product.name || product.name.length < this.analysisRules.quality.minProductNameLength) {
            issues.push('Product name is too short or missing');
        }

        if (!product.price || product.price <= 0) {
            issues.push('Invalid or missing price');
        }

        if (this.analysisRules.quality.imageRequired && !product.image) {
            issues.push('Product image is missing');
        }

        if (!product.description || product.description.length < 10) {
            issues.push('Product description is missing or too short');
        }

        return issues;
    }

    /**
     * Analyze inventory status
     */
    async analyzeInventory() {
        const inventory = this.posSystem ? this.posSystem.getInventory() : {};
        const products = this.posSystem ? this.posSystem.getProducts() : [];
        
        const analysis = {
            totalItems: Object.keys(inventory).length,
            lowStock: [],
            outOfStock: [],
            overStock: [],
            totalValue: 0,
            recommendations: []
        };

        Object.entries(inventory).forEach(([productId, quantity]) => {
            const product = products.find(p => p.id === productId);
            const stockValue = product ? quantity * product.price : 0;
            analysis.totalValue += stockValue;

            if (quantity <= this.analysisRules.inventory.outOfStockAlert) {
                analysis.outOfStock.push({ productId, product, quantity });
            } else if (quantity <= this.analysisRules.inventory.lowStockThreshold) {
                analysis.lowStock.push({ productId, product, quantity });
            } else if (quantity >= this.analysisRules.inventory.overStockThreshold) {
                analysis.overStock.push({ productId, product, quantity });
            }
        });

        // Generate recommendations
        if (analysis.outOfStock.length > 0) {
            analysis.recommendations.push({
                type: 'out_of_stock',
                priority: 'high',
                message: `${analysis.outOfStock.length} products are out of stock`,
                action: 'Restock these items immediately to avoid lost sales'
            });
        }

        if (analysis.lowStock.length > 0) {
            analysis.recommendations.push({
                type: 'low_stock',
                priority: 'medium',
                message: `${analysis.lowStock.length} products are running low`,
                action: 'Consider restocking these items soon'
            });
        }

        this.analysisCache.set('inventory', analysis);
        return analysis;
    }

    /**
     * Analyze pricing strategy
     */
    async analyzePricing() {
        const products = this.posSystem ? this.posSystem.getProducts() : [];
        
        const analysis = {
            totalProducts: products.length,
            priceRange: { min: Infinity, max: 0, average: 0 },
            pricingIssues: [],
            competitiveAnalysis: [],
            recommendations: []
        };

        if (products.length === 0) {
            analysis.recommendations.push({
                type: 'no_products',
                priority: 'high',
                message: 'No products found with pricing data',
                action: 'Add products with valid pricing information'
            });
            return analysis;
        }

        let totalPrice = 0;
        const prices = [];

        products.forEach(product => {
            const price = product.price || 0;
            prices.push(price);
            totalPrice += price;
            
            if (price < analysis.priceRange.min) analysis.priceRange.min = price;
            if (price > analysis.priceRange.max) analysis.priceRange.max = price;

            // Check for pricing issues
            if (price <= 0) {
                analysis.pricingIssues.push({
                    productId: product.id,
                    productName: product.name,
                    issue: 'Invalid price (zero or negative)',
                    currentPrice: price
                });
            }
        });

        analysis.priceRange.average = totalPrice / products.length;

        // Detect price variance issues
        const priceVariance = this.calculatePriceVariance(prices);
        if (priceVariance > this.analysisRules.pricing.maxVariance) {
            analysis.recommendations.push({
                type: 'price_variance',
                priority: 'medium',
                message: 'Large price variance detected across products',
                action: 'Review pricing strategy for consistency'
            });
        }

        // Check for unusually high or low prices
        const outliers = this.detectPriceOutliers(prices);
        if (outliers.length > 0) {
            analysis.recommendations.push({
                type: 'price_outliers',
                priority: 'low',
                message: `${outliers.length} products have unusual pricing`,
                action: 'Review outlier prices for accuracy'
            });
        }

        this.analysisCache.set('pricing', analysis);
        return analysis;
    }

    /**
     * Calculate price variance
     */
    calculatePriceVariance(prices) {
        if (prices.length < 2) return 0;
        
        const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
        return Math.sqrt(variance) / mean;
    }

    /**
     * Detect price outliers
     */
    detectPriceOutliers(prices) {
        if (prices.length < 4) return [];
        
        const sorted = [...prices].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        
        return prices.filter(price => price < lowerBound || price > upperBound);
    }

    /**
     * Analyze system performance
     */
    async analyzePerformance() {
        const analysis = {
            loadTime: 0,
            memoryUsage: 0,
            productScanTime: 0,
            cartOperations: 0,
            recommendations: []
        };

        // Get performance metrics if available
        if (this.posSystem && this.posSystem.getMetrics) {
            const metrics = this.posSystem.getMetrics();
            analysis.productScanTime = metrics.scan?.scanDuration || 0;
            analysis.cartOperations = metrics.cart?.totalItems || 0;
        }

        // Check memory usage
        if (performance.memory) {
            analysis.memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
            
            if (analysis.memoryUsage > 50) {
                analysis.recommendations.push({
                    type: 'memory_usage',
                    priority: 'medium',
                    message: 'High memory usage detected',
                    action: 'Consider optimizing product data or clearing cache'
                });
            }
        }

        this.analysisCache.set('performance', analysis);
        return analysis;
    }

    /**
     * Analyze system configuration
     */
    async analyzeConfiguration() {
        const config = this.posSystem ? this.posSystem.options : {};
        
        const analysis = {
            hasApiEndpoint: !!config.apiEndpoint,
            hasTaxRate: (config.taxRate || 0) > 0,
            hasShipping: (config.shippingCost || 0) > 0,
            currency: config.currency || '$',
            autoInit: config.autoInit !== false,
            notifications: config.notifications !== false,
            recommendations: []
        };

        // Configuration recommendations
        if (!analysis.hasApiEndpoint) {
            analysis.recommendations.push({
                type: 'api_endpoint',
                priority: 'medium',
                message: 'No API endpoint configured for order processing',
                action: 'Configure an API endpoint to handle orders'
            });
        }

        if (!analysis.hasTaxRate) {
            analysis.recommendations.push({
                type: 'tax_rate',
                priority: 'medium',
                message: 'No tax rate configured',
                action: 'Set up appropriate tax rates for your location'
            });
        }

        this.analysisCache.set('configuration', analysis);
        return analysis;
    }

    /**
     * Update analysis UI with results
     */
    updateAnalysisUI(results) {
        // Update product analysis
        const productResults = document.getElementById('product-analysis-results');
        if (productResults && results.products) {
            productResults.innerHTML = this.formatProductAnalysisUI(results.products);
        }

        // Update inventory analysis
        const inventoryResults = document.getElementById('inventory-analysis-results');
        if (inventoryResults && results.inventory) {
            inventoryResults.innerHTML = this.formatInventoryAnalysisUI(results.inventory);
        }

        // Update pricing analysis
        const pricingResults = document.getElementById('pricing-analysis-results');
        if (pricingResults && results.pricing) {
            pricingResults.innerHTML = this.formatPricingAnalysisUI(results.pricing);
        }
    }

    /**
     * Format product analysis for UI display
     */
    formatProductAnalysisUI(analysis) {
        const qualityScore = Math.max(0, 100 - (analysis.qualityIssues.length * 10));
        const completionScore = analysis.enhancedProducts / Math.max(1, analysis.potentialProducts) * 100;
        
        return `
            <div class="analysis-metric">
                <span class="metric-label">Products Found</span>
                <span class="metric-value">${analysis.totalProducts}</span>
            </div>
            <div class="analysis-metric">
                <span class="metric-label">Integration Rate</span>
                <span class="metric-value ${completionScore >= 90 ? 'success' : completionScore >= 70 ? 'warning' : 'error'}">
                    ${Math.round(completionScore)}%
                </span>
            </div>
            <div class="analysis-metric">
                <span class="metric-label">Quality Score</span>
                <span class="metric-value ${qualityScore >= 80 ? 'success' : qualityScore >= 60 ? 'warning' : 'error'}">
                    ${qualityScore}/100
                </span>
            </div>
            <div class="analysis-metric">
                <span class="metric-label">Issues Found</span>
                <span class="metric-value ${analysis.qualityIssues.length === 0 ? 'success' : 'warning'}">
                    ${analysis.qualityIssues.length}
                </span>
            </div>
        `;
    }

    /**
     * Format inventory analysis for UI display
     */
    formatInventoryAnalysisUI(analysis) {
        return `
            <div class="analysis-metric">
                <span class="metric-label">Total Items</span>
                <span class="metric-value">${analysis.totalItems}</span>
            </div>
            <div class="analysis-metric">
                <span class="metric-label">Out of Stock</span>
                <span class="metric-value ${analysis.outOfStock.length === 0 ? 'success' : 'error'}">
                    ${analysis.outOfStock.length}
                </span>
            </div>
            <div class="analysis-metric">
                <span class="metric-label">Low Stock</span>
                <span class="metric-value ${analysis.lowStock.length === 0 ? 'success' : 'warning'}">
                    ${analysis.lowStock.length}
                </span>
            </div>
            <div class="analysis-metric">
                <span class="metric-label">Inventory Value</span>
                <span class="metric-value">$${analysis.totalValue.toFixed(2)}</span>
            </div>
        `;
    }

    /**
     * Format pricing analysis for UI display
     */
    formatPricingAnalysisUI(analysis) {
        return `
            <div class="analysis-metric">
                <span class="metric-label">Price Range</span>
                <span class="metric-value">$${analysis.priceRange.min.toFixed(2)} - $${analysis.priceRange.max.toFixed(2)}</span>
            </div>
            <div class="analysis-metric">
                <span class="metric-label">Average Price</span>
                <span class="metric-value">$${analysis.priceRange.average.toFixed(2)}</span>
            </div>
            <div class="analysis-metric">
                <span class="metric-label">Pricing Issues</span>
                <span class="metric-value ${analysis.pricingIssues.length === 0 ? 'success' : 'error'}">
                    ${analysis.pricingIssues.length}
                </span>
            </div>
        `;
    }

    /**
     * Start the setup wizard
     */
    startSetupWizard() {
        const setupSteps = [
            {
                id: 'basic_config',
                title: 'Basic Configuration',
                description: 'Set up currency, tax rate, and shipping',
                completed: false,
                active: true
            },
            {
                id: 'product_scan',
                title: 'Product Detection',
                description: 'Scan and integrate products',
                completed: false,
                active: false
            },
            {
                id: 'api_setup',
                title: 'API Configuration',
                description: 'Configure order processing endpoint',
                completed: false,
                active: false
            },
            {
                id: 'optimization',
                title: 'Optimization',
                description: 'Apply recommended optimizations',
                completed: false,
                active: false
            }
        ];

        this.setupProgress = {
            steps: setupSteps,
            currentStep: 0,
            completed: false
        };

        this.updateSetupUI();
    }

    /**
     * Update setup wizard UI
     */
    updateSetupUI() {
        const progressContainer = document.getElementById('setup-progress');
        const stepsContainer = document.getElementById('setup-steps');
        
        if (!progressContainer || !stepsContainer) return;

        const completedSteps = this.setupProgress.steps.filter(step => step.completed).length;
        const totalSteps = this.setupProgress.steps.length;
        const progressPercent = (completedSteps / totalSteps) * 100;

        progressContainer.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
            <p>Setup Progress: ${completedSteps}/${totalSteps} steps completed</p>
        `;

        stepsContainer.innerHTML = this.setupProgress.steps.map((step, index) => `
            <div class="setup-step ${step.completed ? 'completed' : ''} ${step.active ? 'active' : ''}"
                 onclick="posAgent.handleSetupStep('${step.id}')">
                <strong>${step.title}</strong>
                <p>${step.description}</p>
                <div class="step-status">
                    ${step.completed ? '✅ Completed' : step.active ? '🔄 In Progress' : '⏳ Pending'}
                </div>
            </div>
        `).join('');
    }

    /**
     * Handle setup step interaction
     */
    handleSetupStep(stepId) {
        const step = this.setupProgress.steps.find(s => s.id === stepId);
        if (!step || step.completed) return;

        switch (stepId) {
            case 'basic_config':
                this.configureBasicSettings();
                break;
            case 'product_scan':
                this.runProductScan();
                break;
            case 'api_setup':
                this.configureAPI();
                break;
            case 'optimization':
                this.applyOptimizations();
                break;
        }
    }

    /**
     * Configure basic POS settings
     */
    configureBasicSettings() {
        const currentConfig = this.posSystem ? this.posSystem.options : {};
        
        const currency = prompt('Enter currency symbol (e.g., $, €, £):', currentConfig.currency || '$');
        const taxRate = prompt('Enter tax rate (as decimal, e.g., 0.08 for 8%):', currentConfig.taxRate || '0');
        const shippingCost = prompt('Enter default shipping cost:', currentConfig.shippingCost || '0');

        if (currency !== null && this.posSystem) {
            this.posSystem.options.currency = currency;
            this.posSystem.options.taxRate = parseFloat(taxRate) || 0;
            this.posSystem.options.shippingCost = parseFloat(shippingCost) || 0;
            
            this.completeSetupStep('basic_config');
            this.addMessage('assistant', `Basic configuration updated: Currency: ${currency}, Tax Rate: ${(parseFloat(taxRate) * 100).toFixed(1)}%, Shipping: ${currency}${shippingCost}`);
        }
    }

    /**
     * Run product scan and integration
     */
    async runProductScan() {
        if (this.posSystem && this.posSystem.scanProducts) {
            this.addMessage('assistant', 'Scanning for products...');
            await this.posSystem.scanProducts();
            
            const products = this.posSystem.getProducts();
            this.completeSetupStep('product_scan');
            this.addMessage('assistant', `Product scan completed! Found and integrated ${products.length} products.`);
        }
    }

    /**
     * Configure API settings
     */
    configureAPI() {
        const currentEndpoint = this.posSystem ? this.posSystem.options.apiEndpoint : '';
        const apiEndpoint = prompt('Enter API endpoint URL for order processing:', currentEndpoint || '');

        if (apiEndpoint && this.posSystem) {
            this.posSystem.options.apiEndpoint = apiEndpoint;
            this.completeSetupStep('api_setup');
            this.addMessage('assistant', `API endpoint configured: ${apiEndpoint}`);
        } else if (apiEndpoint === '') {
            this.completeSetupStep('api_setup');
            this.addMessage('assistant', 'API configuration skipped. Orders will be handled locally.');
        }
    }

    /**
     * Apply system optimizations
     */
    async applyOptimizations() {
        this.addMessage('assistant', 'Applying optimizations...');
        
        // Run analysis to get recommendations
        const analysis = await this.runFullAnalysis();
        let optimizationsApplied = 0;

        // Apply automatic optimizations
        Object.values(analysis).forEach(section => {
            if (section.recommendations) {
                section.recommendations.forEach(rec => {
                    if (rec.type === 'product_quality' && rec.priority === 'high') {
                        // Auto-fix some product quality issues
                        optimizationsApplied++;
                    }
                });
            }
        });

        this.completeSetupStep('optimization');
        this.addMessage('assistant', `Optimization completed! Applied ${optimizationsApplied} automatic improvements.`);
        
        // Check if setup is complete
        if (this.setupProgress.steps.every(step => step.completed)) {
            this.setupProgress.completed = true;
            this.addMessage('assistant', '🎉 Setup wizard completed! Your POS system is now optimally configured.');
        }
    }

    /**
     * Complete a setup step
     */
    completeSetupStep(stepId) {
        const step = this.setupProgress.steps.find(s => s.id === stepId);
        if (step) {
            step.completed = true;
            step.active = false;
            
            // Activate next step
            const nextStepIndex = this.setupProgress.steps.findIndex(s => s.id === stepId) + 1;
            if (nextStepIndex < this.setupProgress.steps.length) {
                this.setupProgress.steps[nextStepIndex].active = true;
            }
            
            this.updateSetupUI();
        }
    }

    /**
     * Generate smart recommendations
     */
    async generateRecommendations() {
        const analysis = await this.runFullAnalysis();
        const recommendations = [];

        // Collect recommendations from all analysis sections
        Object.values(analysis).forEach(section => {
            if (section.recommendations) {
                recommendations.push(...section.recommendations);
            }
        });

        // Add general recommendations
        recommendations.push(
            {
                type: 'general',
                priority: 'low',
                message: 'Enable notifications for better user feedback',
                action: 'Configure notification settings in your POS options'
            },
            {
                type: 'general',
                priority: 'low',
                message: 'Regular inventory audits help maintain accuracy',
                action: 'Schedule weekly inventory reviews'
            },
            {
                type: 'general',
                priority: 'medium',
                message: 'Monitor cart abandonment rates',
                action: 'Track when customers add items but don\'t complete purchases'
            }
        );

        // Sort by priority
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        return recommendations;
    }

    /**
     * Load and display recommendations
     */
    async loadRecommendations() {
        const recommendationsContainer = document.getElementById('recommendations-list');
        if (!recommendationsContainer) return;

        recommendationsContainer.innerHTML = '<div class="loading">Loading recommendations...</div>';

        try {
            const recommendations = await this.generateRecommendations();
            
            recommendationsContainer.innerHTML = recommendations.map(rec => `
                <div class="recommendation-item">
                    <div class="recommendation-title">
                        ${this.getPriorityIcon(rec.priority)} ${rec.message}
                    </div>
                    <div class="recommendation-desc">${rec.action}</div>
                </div>
            `).join('');
        } catch (error) {
            recommendationsContainer.innerHTML = '<div>Error loading recommendations</div>';
            this.log('Error loading recommendations', 'error', error);
        }
    }

    /**
     * Get priority icon for recommendations
     */
    getPriorityIcon(priority) {
        const icons = {
            high: '🔴',
            medium: '🟡',
            low: '🟢'
        };
        return icons[priority] || '⚪';
    }

    /**
     * Generate response for analysis queries
     */
    generateAnalysisResponse() {
        const productAnalysis = this.analysisCache.get('products');
        const inventoryAnalysis = this.analysisCache.get('inventory');
        const pricingAnalysis = this.analysisCache.get('pricing');

        let response = 'Here\'s what I found in my analysis:\n\n';

        if (productAnalysis) {
            response += `**Products**: Found ${productAnalysis.totalProducts} products with ${productAnalysis.qualityIssues.length} quality issues.\n`;
        }

        if (inventoryAnalysis) {
            response += `**Inventory**: ${inventoryAnalysis.outOfStock.length} out of stock, ${inventoryAnalysis.lowStock.length} low stock items.\n`;
        }

        if (pricingAnalysis) {
            response += `**Pricing**: Average price $${pricingAnalysis.priceRange.average.toFixed(2)}, ${pricingAnalysis.pricingIssues.length} pricing issues found.\n`;
        }

        response += '\nCheck the Analysis tab for detailed information and recommendations.';
        return response;
    }

    /**
     * Format product analysis response
     */
    formatProductAnalysisResponse(analysis) {
        return `I found ${analysis.totalProducts} products in your system. ${analysis.qualityIssues.length > 0 ? 
            `There are ${analysis.qualityIssues.length} products with quality issues that need attention.` : 
            'All products look good!'} ${analysis.missingProducts > 0 ? 
            `I also detected ${analysis.missingProducts} potential products that aren't integrated yet.` : ''}`;
    }

    /**
     * Format pricing analysis response
     */
    formatPricingAnalysisResponse(analysis) {
        return `Your products are priced between $${analysis.priceRange.min.toFixed(2)} and $${analysis.priceRange.max.toFixed(2)}, with an average of $${analysis.priceRange.average.toFixed(2)}. ${analysis.pricingIssues.length > 0 ? 
            `I found ${analysis.pricingIssues.length} pricing issues that need to be fixed.` : 
            'Your pricing looks consistent!'}`;
    }

    /**
     * Format recommendations response
     */
    formatRecommendationsResponse(recommendations) {
        const highPriority = recommendations.filter(r => r.priority === 'high').length;
        const mediumPriority = recommendations.filter(r => r.priority === 'medium').length;
        
        return `I have ${recommendations.length} recommendations for you: ${highPriority} high priority, ${mediumPriority} medium priority. Check the Tips tab to see all recommendations with detailed actions you can take.`;
    }

    /**
     * Generate help response based on query
     */
    generateHelpResponse(query) {
        if (query.includes('setup') || query.includes('configure')) {
            return 'I can help you set up your POS system! Use the Setup tab or click the gear icon to start the setup wizard. I\'ll guide you through configuring currency, tax rates, product detection, and API settings.';
        }
        
        if (query.includes('product') || query.includes('item')) {
            return 'I can analyze your products, detect quality issues, and help integrate new products. Try asking "analyze my products" or use the Analysis tab to see detailed product information.';
        }
        
        if (query.includes('price') || query.includes('cost')) {
            return 'I can help with pricing analysis, detect pricing issues, and suggest optimizations. Ask me about "pricing analysis" or check the Analysis tab for detailed pricing insights.';
        }
        
        return 'I\'m your POS AI assistant! I can help with:\n• Product analysis and optimization\n• Inventory management\n• Pricing strategy\n• System setup and configuration\n• Troubleshooting issues\n• Performance recommendations\n\nJust ask me what you need help with!';
    }

    /**
     * Get quick system status
     */
    async getQuickSystemStatus() {
        const products = this.posSystem ? this.posSystem.getProducts() : [];
        const cart = this.posSystem ? this.posSystem.getCart() : [];
        
        return `You have ${products.length} products configured and ${cart.length} items in cart.`;
    }

    /**
     * Start periodic analysis
     */
    startPeriodicAnalysis() {
        // Run analysis every 5 minutes
        setInterval(async () => {
            if (this.isActive) {
                await this.runFullAnalysis();
                this.checkForAlerts();
            }
        }, 5 * 60 * 1000);
    }

    /**
     * Check for critical alerts
     */
    checkForAlerts() {
        const inventoryAnalysis = this.analysisCache.get('inventory');
        
        if (inventoryAnalysis && inventoryAnalysis.outOfStock.length > 0) {
            this.showAlert(`${inventoryAnalysis.outOfStock.length} products are out of stock!`, 'warning');
        }
    }

    /**
     * Show alert notification
     */
    showAlert(message, type = 'info') {
        // Could integrate with the main POS notification system
        if (this.posSystem && this.posSystem.showNotification) {
            this.posSystem.showNotification(`AI Assistant: ${message}`, type);
        }
    }

    /**
     * Bind additional events
     */
    bindEvents() {
        // Listen for POS system events
        if (typeof document !== 'undefined') {
            document.addEventListener('pos:products-scanned', () => {
                this.analyzeProducts();
            });
            
            document.addEventListener('pos:item-added', () => {
                this.analyzeInventory();
            });
            
            document.addEventListener('pos:checkout-completed', () => {
                this.analyzeInventory();
            });
        }
    }

    /**
     * Logging utility
     */
    log(message, level = 'info', data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data,
            component: 'POSAgent'
        };
        
        console[level === 'error' ? 'error' : 'log'](`[${timestamp}] POS Agent ${level.toUpperCase()}: ${message}`, data);
        
        // Store logs for debugging
        if (typeof window !== 'undefined') {
            window.posAgentLogs = window.posAgentLogs || [];
            window.posAgentLogs.push(logEntry);
        }
    }

    /**
     * Public API methods
     */
    runAnalysis() {
        return this.runFullAnalysis();
    }

    getAnalysisResults() {
        return Object.fromEntries(this.analysisCache);
    }

    startSetup() {
        this.startSetupWizard();
        this.switchTab('setup');
    }

    getConversationHistory() {
        return this.conversationHistory;
    }

    clearConversation() {
        this.conversationHistory = [];
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
            this.addMessage('assistant', 'Conversation cleared. How can I help you?');
        }
    }

    /**
     * Destroy the agent
     */
    destroy() {
        this.isActive = false;
        
        // Remove UI
        const container = document.getElementById('pos-agent-container');
        if (container) container.remove();
        
        // Remove styles
        const styles = document.getElementById('pos-agent-styles');
        if (styles) styles.remove();
        
        this.log('POS Agent destroyed', 'info');
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for the main POS system to initialize
    setTimeout(() => {
        if (!window.posAgent) {
            window.posAgent = new POSAgent();
        }
    }, 1000);
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = POSAgent;
}