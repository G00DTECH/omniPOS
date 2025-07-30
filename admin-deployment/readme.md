# Universal POS Payment Integration System

A comprehensive, production-ready payment processing system that seamlessly integrates with the Universal POS to provide secure, multi-processor payment capabilities.

## 🚀 Features

### Payment Processors
- **Stripe** - Credit/debit cards, digital wallets
- **PayPal** - PayPal accounts, Pay in 4
- **Apple Pay** - Touch ID and Face ID payments
- **Google Pay** - Android device payments
- **Square** - In-person and online payments
- **Authorize.Net** - Enterprise payment processing

### Security & Compliance
- ✅ **PCI DSS Level 1 Compliant** design
- 🔒 **End-to-end encryption** for sensitive data
- 🛡️ **Secure tokenization** - no card data storage
- 🔐 **Input validation** and sanitization
- 📊 **Comprehensive audit logging**
- 🚨 **Real-time fraud detection** hooks

### Production Features
- 🔄 **Webhook processing** with retry logic
- 💾 **Transaction logging** and reconciliation
- 💰 **Refund management** system
- 📈 **Analytics and reporting** views
- 🌍 **Multi-currency support**
- 📱 **Mobile-optimized** payment forms
- ♿ **Accessibility compliant** UI

## 📁 File Structure

```
universal-pos-payments/
├── pos-payments.js                 # Main payment integration layer
├── pos-payment-ui.css             # Payment form styling
├── payment-integration-guide.md   # Comprehensive documentation
├── examples/
│   ├── node-server.js             # Node.js backend example
│   ├── php-server.php             # PHP backend example
│   ├── webhook-handlers.js        # Webhook processing
│   ├── database-schema.sql        # Database structure
│   ├── package.json               # Node.js dependencies
│   ├── composer.json              # PHP dependencies
│   └── .env.example               # Environment configuration
└── README.md                      # This file
```

## 🎯 Quick Start

### 1. Frontend Integration

Include the payment system in your HTML:

```html
<!DOCTYPE html>
<html>
<head>
    <!-- Universal POS Core -->
    <script src="pos-system.js"></script>
    
    <!-- Payment Integration -->
    <script src="pos-payments.js"></script>
    <link rel="stylesheet" href="pos-payment-ui.css">
</head>
<body>
    <!-- Your products -->
    <div data-pos-product="coffee-mug" 
         data-pos-name="Coffee Mug" 
         data-pos-price="15.99">
        Coffee Mug - $15.99
    </div>
    
    <script>
        // Initialize after POS loads
        document.addEventListener('pos:initialized', async () => {
            // Initialize Stripe
            await universalPOS.paymentManager.initializeProcessor('stripe', {
                publishableKey: 'pk_test_your_stripe_key',
                apiEndpoint: '/api/payments'
            });
            
            // Add PayPal
            await universalPOS.paymentManager.initializeProcessor('paypal', {
                clientId: 'your_paypal_client_id'
            });
            
            // Add Apple Pay (if supported)
            if (window.ApplePaySession?.canMakePayments()) {
                await universalPOS.paymentManager.initializeProcessor('apple_pay', {
                    merchantName: 'Your Store',
                    countryCode: 'US'
                });
            }
        });
    </script>
</body>
</html>
```

### 2. Backend Setup

#### Node.js Backend

```bash
cd examples/
npm install
cp .env.example .env
# Edit .env with your API keys
npm start
```

#### PHP Backend

```bash
cd examples/
composer install
cp .env.example .env
# Edit .env with your API keys
php -S localhost:3000 php-server.php
```

### 3. Database Setup

```bash
mysql -u root -p < database-schema.sql
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure your settings:

```bash
# Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret

# Database
DB_HOST=localhost
DB_USER=pos_user
DB_PASSWORD=your_password
DB_NAME=pos_payments
```

### Payment Configuration

```javascript
const paymentConfig = {
    currency: 'usd',
    theme: 'modern',
    enableSaveCard: false,  // PCI compliance
    requireCVV: true,
    timeout: 30000,
    logLevel: 'INFO'
};

const paymentManager = initializePOSPayments(paymentConfig);
```

## 💳 Payment Flow

1. **Customer** adds items to cart using Universal POS
2. **Customer** clicks checkout → payment modal opens
3. **Customer** selects payment method and enters details
4. **Frontend** creates payment intent via your backend
5. **Backend** processes payment with chosen processor
6. **Webhook** confirms payment and updates order status
7. **Customer** receives confirmation

## 🔐 Security Features

### PCI DSS Compliance
- No card data touches your servers
- Tokenization for all sensitive data
- Secure HTTPS-only transmission
- Input validation and sanitization

### Fraud Prevention
- Real-time transaction monitoring
- Velocity checking
- Device fingerprinting hooks
- Risk scoring integration points

### Security Headers
```javascript
// Automatically applied
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://js.stripe.com"],
            frameSrc: ["https://js.stripe.com"],
        }
    }
}));
```

## 📊 Analytics & Reporting

### Built-in Analytics Views
- Daily/monthly revenue reports
- Payment method performance
- Success rate tracking
- Refund analysis
- Geographic distribution

### Custom Queries
```sql
-- Revenue by payment processor
SELECT 
    processor,
    SUM(amount) as total_revenue,
    COUNT(*) as transaction_count,
    AVG(amount) as avg_transaction
FROM transactions 
WHERE status = 'completed'
    AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY processor;
```

## 🔄 Webhook Handling

Webhooks are automatically processed for:
- Payment confirmations
- Failed payment notifications
- Refund processing
- Dispute alerts
- Subscription events

### Webhook Security
- Signature verification for all processors
- Automatic retry with exponential backoff
- Dead letter queue for failed events
- Idempotency protection

## 🧪 Testing

### Test Cards (Stripe)
```javascript
// Success
4242424242424242

// Declined
4000000000000002

// Insufficient funds
4000000000009995
```

### PayPal Sandbox
Use PayPal Developer sandbox accounts for testing.

### Testing Webhooks
```bash
# Use ngrok for local testing
ngrok http 3000
# Update webhook URLs in processor dashboards
```

## 🚀 Production Deployment

### Checklist
- [ ] SSL certificate installed
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Webhook endpoints configured
- [ ] Monitoring and alerting set up
- [ ] Backup strategy implemented
- [ ] PCI compliance validated

### Performance Optimization
- Connection pooling for databases
- Redis caching for sessions
- CDN for static assets
- Load balancing for high availability

## 📈 Monitoring

### Health Checks
```javascript
// Built-in health endpoint
GET /health
{
    "status": "healthy",
    "database": "connected",
    "stripe": "connected",
    "uptime": 3600
}
```

### Metrics
- Payment success rates
- Average processing time
- Error rates by processor
- Webhook processing delays

## 🆘 Troubleshooting

### Common Issues

**"Stripe not loaded" Error**
```javascript
// Ensure Stripe.js loads before initialization
await new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = resolve;
    document.head.appendChild(script);
});
```

**PayPal Button Not Showing**
- Check PayPal SDK loaded correctly
- Verify client ID is valid
- Ensure HTTPS for production

**Apple Pay Not Available**
- Requires HTTPS
- Needs valid merchant certificate
- Only works on supported devices/browsers

### Debug Mode
```javascript
// Enable detailed logging
const paymentManager = initializePOSPayments({
    logLevel: 'DEBUG'
});

// View logs
console.log(paymentManager.exportLogs());
```

## 📚 Documentation

- **[Integration Guide](payment-integration-guide.md)** - Complete setup instructions
- **[API Reference](payment-integration-guide.md#api-reference)** - Method documentation
- **[Security Guide](payment-integration-guide.md#security--compliance)** - PCI compliance
- **[Examples](examples/)** - Backend implementations

## 🤝 Support

### Resources
- [Stripe Documentation](https://stripe.com/docs)
- [PayPal Developer Portal](https://developer.paypal.com/)
- [Apple Pay Developer Guide](https://developer.apple.com/apple-pay/)

### Getting Help
Include in support requests:
- Browser/OS version
- Console error messages
- Network requests (without sensitive data)
- Configuration (without API keys)

## 📄 License

MIT License - see LICENSE file for details.

## 🔄 Updates

### Version 1.0.0
- Initial release with Stripe, PayPal, Apple Pay
- Complete webhook handling
- Production-ready security features
- Comprehensive documentation

### Roadmap
- Google Pay integration
- Cryptocurrency payments
- Buy now, pay later options
- Advanced fraud detection
- Mobile SDKs

---

**Universal POS Payment Integration** - Making payment processing simple, secure, and scalable for everyone.
