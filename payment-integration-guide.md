# Universal POS Payment Integration Guide

A comprehensive guide to integrating secure payment processing with the Universal POS system.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Payment Processors](#payment-processors)
3. [Backend Setup](#backend-setup)
4. [Security & Compliance](#security--compliance)
5. [Production Deployment](#production-deployment)
6. [API Reference](#api-reference)
7. [Troubleshooting](#troubleshooting)

## Quick Start

### 1. Include Payment Files

Add the payment system files to your HTML:

```html
<!DOCTYPE html>
<html>
<head>
    <!-- Universal POS Core (required) -->
    <script src="pos-system.js"></script>
    
    <!-- Payment Integration -->
    <script src="pos-payments.js"></script>
    <link rel="stylesheet" href="pos-payment-ui.css">
</head>
<body>
    <!-- Your products with data attributes -->
    <div data-pos-product="item1" data-pos-name="Coffee Mug" data-pos-price="15.99">
        Coffee Mug - $15.99
    </div>
    
    <script>
        // Initialize payment system after POS loads
        document.addEventListener('pos:initialized', () => {
            // Initialize with Stripe (recommended)
            universalPOS.paymentManager.initializeProcessor('stripe', {
                publishableKey: 'pk_test_your_stripe_publishable_key',
                apiEndpoint: '/api/payments'
            });
        });
    </script>
</body>
</html>
```

### 2. Basic Configuration

```javascript
// Initialize payment system with multiple processors
const paymentConfig = {
    currency: 'usd',
    theme: 'modern',
    enableSaveCard: false, // PCI compliance consideration
    requireCVV: true
};

const paymentManager = initializePOSPayments(paymentConfig);

// Add Stripe
await paymentManager.initializeProcessor('stripe', {
    publishableKey: 'pk_test_your_stripe_key',
    apiEndpoint: '/api/payments',
    theme: 'stripe'
});

// Add PayPal
await paymentManager.initializeProcessor('paypal', {
    clientId: 'your_paypal_client_id',
    currency: 'USD'
});

// Add Apple Pay (if supported)
if (window.ApplePaySession && ApplePaySession.canMakePayments()) {
    await paymentManager.initializeProcessor('apple_pay', {
        merchantName: 'Your Store',
        countryCode: 'US',
        apiEndpoint: '/api/payments'
    });
}
```

## Payment Processors

### Stripe Integration

#### Frontend Setup

```javascript
// Initialize Stripe processor
await paymentManager.initializeProcessor('stripe', {
    publishableKey: 'pk_test_your_publishable_key',
    apiEndpoint: '/api/payments',
    theme: 'stripe',
    primaryColor: '#0570de',
    hidePostalCode: false
});
```

#### Backend Requirements

Your backend must provide these endpoints:

**POST `/api/payments/create-payment-intent`**
```json
{
    "amount": 1599,
    "currency": "usd",
    "metadata": {
        "orderId": "order_123",
        "items": [...]
    }
}
```

Response:
```json
{
    "client_secret": "pi_xxx_secret_xxx",
    "id": "pi_xxx"
}
```

**POST `/api/payments/refund`**
```json
{
    "payment_intent_id": "pi_xxx",
    "amount": 1599
}
```

#### Complete Stripe Backend Example (Node.js)

```javascript
const express = require('express');
const stripe = require('stripe')('sk_test_your_secret_key');
const app = express();

app.use(express.json());

// Create payment intent
app.post('/api/payments/create-payment-intent', async (req, res) => {
    try {
        const { amount, currency, metadata } = req.body;
        
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            metadata,
            automatic_payment_methods: {
                enabled: true,
            },
        });
        
        res.json({
            client_secret: paymentIntent.client_secret,
            id: paymentIntent.id
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Process refund
app.post('/api/payments/refund', async (req, res) => {
    try {
        const { payment_intent_id, amount } = req.body;
        
        const refund = await stripe.refunds.create({
            payment_intent: payment_intent_id,
            amount: amount || undefined
        });
        
        res.json(refund);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Webhook handling
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = 'whsec_your_webhook_secret';
    
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
    }
    
    switch (event.type) {
        case 'payment_intent.succeeded':
            console.log('Payment succeeded:', event.data.object);
            // Update order status in database
            break;
        case 'payment_intent.payment_failed':
            console.log('Payment failed:', event.data.object);
            // Handle failed payment
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }
    
    res.json({ received: true });
});

app.listen(3000);
```

### PayPal Integration

#### Setup

```javascript
await paymentManager.initializeProcessor('paypal', {
    clientId: 'your_paypal_client_id',
    currency: 'USD',
    environment: 'sandbox' // or 'production'
});
```

PayPal handles most of the processing client-side, but you should verify payments on your backend:

```javascript
// Verify PayPal payment
app.post('/api/payments/verify-paypal', async (req, res) => {
    const { orderID } = req.body;
    
    // Verify with PayPal API
    const response = await fetch(`https://api.paypal.com/v2/checkout/orders/${orderID}`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });
    
    const order = await response.json();
    
    if (order.status === 'COMPLETED') {
        // Payment verified, update order
        res.json({ verified: true, order });
    } else {
        res.status(400).json({ error: 'Payment not completed' });
    }
});
```

### Apple Pay Integration

#### Setup

```javascript
// Apple Pay requires HTTPS and proper merchant validation
await paymentManager.initializeProcessor('apple_pay', {
    merchantName: 'Your Store Name',
    countryCode: 'US',
    apiEndpoint: '/api/payments'
});
```

#### Backend Requirements

**POST `/api/payments/validate-merchant`**
```javascript
app.post('/api/payments/validate-merchant', async (req, res) => {
    const { validationURL } = req.body;
    
    // Create merchant validation request
    const validationRequest = {
        merchantIdentifier: 'merchant.com.yourstore',
        merchantSession: validationURL,
        initiative: 'web',
        initiativeContext: 'yourstore.com'
    };
    
    // Submit to Apple Pay
    const response = await fetch(validationURL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(validationRequest),
        // Include merchant certificate
    });
    
    const merchantSession = await response.json();
    res.json(merchantSession);
});
```

**POST `/api/payments/process-apple-pay`**
```javascript
app.post('/api/payments/process-apple-pay', async (req, res) => {
    const { paymentData } = req.body;
    
    try {
        // Process with your payment processor
        // Example: decrypt and process with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: paymentData.amount,
            currency: 'usd',
            payment_method_data: {
                type: 'card',
                // Process Apple Pay token
            }
        });
        
        res.json({ 
            success: true, 
            paymentIntent: paymentIntent.id 
        });
    } catch (error) {
        res.json({ 
            success: false, 
            error: error.message 
        });
    }
});
```

## Security & Compliance

### PCI DSS Compliance

The Universal POS Payment system is designed with PCI DSS compliance in mind:

#### Level 1: Never Store Card Data
```javascript
// ✅ Good - Use tokenization
const paymentManager = initializePOSPayments({
    enableSaveCard: false, // Prevents card storage
    requireCVV: true,      // Always require CVV
    tokenization: true     // Use processor tokens
});

// ❌ Bad - Never do this
localStorage.setItem('cardNumber', '4111111111111111');
```

#### Level 2: Secure Data Transmission
- All payment forms use HTTPS only
- Implement Content Security Policy (CSP)
- Use secure headers

```html
<!-- Add to your HTML head -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' https://js.stripe.com https://www.paypal.com; 
               frame-src https://js.stripe.com https://www.paypal.com;">
```

#### Level 3: Input Validation
```javascript
// All payment data is validated
const validation = processor.validatePaymentData({
    billingDetails: {
        name: 'John Doe',
        email: 'john@example.com'
    }
});

if (!validation.isValid) {
    console.error('Validation errors:', validation.errors);
}
```

#### Level 4: Secure Backend
Your backend must implement:

```javascript
// Rate limiting
const rateLimit = require('express-rate-limit');
const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 payment attempts per windowMs
    message: 'Too many payment attempts, try again later'
});

app.use('/api/payments', paymentLimiter);

// Request validation
const { body, validationResult } = require('express-validator');

app.post('/api/payments/create-payment-intent',
    body('amount').isNumeric().custom(value => value > 0),
    body('currency').isLength({ min: 3, max: 3 }),
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        // Process payment...
    }
);

// CORS configuration
const cors = require('cors');
app.use(cors({
    origin: ['https://yourstore.com'], // Your domain only
    credentials: true
}));
```

### Environment Variables

Never hardcode secrets. Use environment variables:

```javascript
// .env file
STRIPE_SECRET_KEY=sk_live_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_secret

// In your app
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
```

### Logging and Monitoring

```javascript
// Security event logging
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'security.log' })
    ]
});

// Log payment events
app.post('/api/payments/*', (req, res, next) => {
    logger.info('Payment API call', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        timestamp: new Date().toISOString()
    });
    next();
});
```

## Production Deployment

### 1. SSL Certificate
Ensure HTTPS is enabled:
```bash
# Using Let's Encrypt with Certbot
certbot --nginx -d yourstore.com
```

### 2. Environment Configuration
```javascript
// Production config
const paymentConfig = {
    stripe: {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
    },
    paypal: {
        clientId: process.env.PAYPAL_CLIENT_ID,
        environment: 'production'
    }
};
```

### 3. Monitoring Setup
```javascript
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION
    });
});

// Error handling
app.use((error, req, res, next) => {
    logger.error('Payment error', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip
    });
    
    res.status(500).json({
        error: 'Internal server error',
        requestId: req.id
    });
});
```

### 4. Database Schema
Example order/transaction tables:

```sql
-- Orders table
CREATE TABLE orders (
    id VARCHAR(255) PRIMARY KEY,
    customer_email VARCHAR(255),
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customer_email (customer_email),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Order items table
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL,
    product_id VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Transactions table
CREATE TABLE transactions (
    id VARCHAR(255) PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL,
    processor VARCHAR(50) NOT NULL,
    processor_transaction_id VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_processor_transaction_id (processor_transaction_id),
    INDEX idx_status (status)
);
```

## API Reference

### POSPaymentManager

#### Constructor
```javascript
new POSPaymentManager(posInstance, config)
```

#### Methods

**initializeProcessor(type, config)**
```javascript
await paymentManager.initializeProcessor('stripe', {
    publishableKey: 'pk_test_...',
    apiEndpoint: '/api/payments'
});
```

**setActiveProcessor(type)**
```javascript
paymentManager.setActiveProcessor('stripe');
```

**getTransactions()**
```javascript
const transactions = paymentManager.getTransactions();
```

**refundTransaction(transactionId, amount)**
```javascript
await paymentManager.refundTransaction('txn_123', 50.00);
```

### Events

The payment system emits custom events:

```javascript
// Payment success
document.addEventListener('pos:payment-success', (event) => {
    const { result, transaction } = event.detail;
    console.log('Payment successful:', transaction);
});

// Payment error
document.addEventListener('pos:payment-error', (event) => {
    console.error('Payment failed:', event.detail.error);
});

// Payment method changed
document.addEventListener('pos:payment-method-changed', (event) => {
    console.log('Payment method:', event.detail.processor);
});
```

### Configuration Options

```javascript
const config = {
    // Currency settings
    currency: 'usd',
    
    // UI theming
    theme: 'modern', // 'modern', 'classic', 'minimal'
    primaryColor: '#007bff',
    
    // Security settings
    enableSaveCard: false,
    requireCVV: true,
    timeout: 30000,
    
    // Validation
    realTimeValidation: true,
    luhnCheck: true,
    
    // Logging
    logLevel: 'INFO' // 'DEBUG', 'INFO', 'WARN', 'ERROR'
};
```

## Multi-Currency Support

### Setup
```javascript
const paymentManager = initializePOSPayments({
    currency: 'usd', // Default currency
    supportedCurrencies: ['usd', 'eur', 'gbp', 'cad'],
    exchangeRateAPI: 'https://api.exchangerate.host/latest'
});

// Dynamic currency conversion
paymentManager.setCurrency('eur');
```

### Backend Implementation
```javascript
// Currency conversion endpoint
app.get('/api/exchange-rate/:from/:to', async (req, res) => {
    const { from, to } = req.params;
    
    try {
        const response = await fetch(`https://api.exchangerate.host/convert?from=${from}&to=${to}&amount=1`);
        const data = await response.json();
        
        res.json({
            rate: data.result,
            timestamp: data.date
        });
    } catch (error) {
        res.status(500).json({ error: 'Exchange rate unavailable' });
    }
});
```

## Testing

### Test Cards

**Stripe Test Cards:**
- Success: `4242424242424242`
- Declined: `4000000000000002`
- Insufficient Funds: `4000000000009995`

**PayPal Sandbox:**
- Use PayPal Developer accounts
- Test with sandbox.paypal.com

### Unit Testing
```javascript
// Example Jest tests
describe('Payment Manager', () => {
    test('should initialize Stripe processor', async () => {
        const manager = new POSPaymentManager(mockPOS, {});
        
        await manager.initializeProcessor('stripe', {
            publishableKey: 'pk_test_123'
        });
        
        expect(manager.processors.has('stripe')).toBe(true);
    });
    
    test('should validate payment data', () => {
        const processor = new StripeProcessor({});
        const result = processor.validatePaymentData({
            billingDetails: { name: 'John Doe' }
        });
        
        expect(result.isValid).toBe(true);
    });
});
```

## Troubleshooting

### Common Issues

#### 1. "Stripe not loaded" Error
```javascript
// Solution: Ensure Stripe.js loads before initialization
if (!window.Stripe) {
    await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}
```

#### 2. PayPal Button Not Showing
```javascript
// Check if PayPal SDK loaded correctly
if (!window.paypal) {
    console.error('PayPal SDK not loaded');
    // Reload or show error message
}
```

#### 3. Apple Pay Not Available
```javascript
// Check Apple Pay availability
if (!window.ApplePaySession) {
    console.log('Apple Pay not supported on this device/browser');
} else if (!ApplePaySession.canMakePayments()) {
    console.log('Apple Pay not set up on this device');
}
```

#### 4. CORS Errors
```javascript
// Backend CORS configuration
app.use(cors({
    origin: ['https://yourstore.com', 'https://checkout.stripe.com'],
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
```

#### 5. Webhook Verification Failed
```javascript
// Ensure raw body parsing for webhooks
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
```

### Debug Mode

Enable debug logging:

```javascript
const paymentManager = initializePOSPayments({
    logLevel: 'DEBUG'
});

// View logs in browser console
console.log(paymentManager.exportLogs());
```

### Support Resources

- **Stripe Documentation:** https://stripe.com/docs
- **PayPal Developer:** https://developer.paypal.com/
- **Apple Pay Documentation:** https://developer.apple.com/apple-pay/
- **PCI DSS Guidelines:** https://www.pcisecuritystandards.org/

### Getting Help

1. Check browser console for errors
2. Verify API endpoints are responding
3. Test with sandbox/test keys first
4. Check webhook endpoint logs
5. Validate SSL certificate is working

For additional support, include:
- Browser version and OS
- Console error messages
- Network tab showing failed requests
- Configuration (without sensitive keys)

## License

This payment integration system is provided as-is for use with the Universal POS system. Ensure compliance with payment processor terms of service and applicable financial regulations in your jurisdiction.