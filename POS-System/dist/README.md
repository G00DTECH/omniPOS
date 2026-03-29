# Universal POS System - Distribution Bundle

## Quick Start

### Option 1: Script Injection (Any Website)
Add this single script to any webpage:

```html
<script src="pos-bundle.min.js"></script>
```

Products are automatically detected and events are fired:

```javascript
document.addEventListener('products:detected', (e) => {
    console.log('Found products:', e.detail);
});
```

### Option 2: Browser Extension (Recommended)

1. Open Chrome/Edge and go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `extension` folder
5. Visit any e-commerce site - products are auto-detected!

## What's Included

```
dist/
├── scripts/
│   └── pos-bundle.min.js    # Standalone detector (12KB)
├── extension/
│   ├── manifest.json        # Extension config
│   ├── background.js        # API interception
│   ├── content-bundle.js    # Detector + Learn Mode
│   ├── popup.html           # Extension popup UI
│   └── popup.js             # Popup logic
└── README.md                # This file
```

## Features

| Feature | Script | Extension |
|---------|--------|-----------|
| Auto-detect products | ✓ | ✓ |
| Schema.org/JSON-LD | ✓ | ✓ |
| Platform adapters | ✓ | ✓ |
| Confidence scoring | ✓ | ✓ |
| Dynamic content (SPA) | ✓ | ✓ |
| Learn Mode (click to teach) | ✗ | ✓ |
| API interception | ✗ | ✓ |
| Save site configs | ✗ | ✓ |
| Export to JSON | ✗ | ✓ |

## Platform Support

| Platform | Expected Accuracy |
|----------|-------------------|
| Shopify | 95% |
| WooCommerce | 90% |
| BigCommerce | 90% |
| Squarespace | 85% |
| Wix | 80% (with Learn Mode: 95%) |
| Custom sites | 60% (with Learn Mode: 95%) |

## Using Learn Mode (Extension Only)

For sites where auto-detection fails:

1. Click extension icon
2. Click **Learn Mode**
3. Click on a **product container** (the card/tile)
4. Click on the **product name** text
5. Click on the **price** text
6. Click **Save**

The extension remembers your configuration for that site permanently.

## API Reference

### ProductDetector

```javascript
// Scan page for products
const products = ProductDetector.scan();

// Initialize with options
ProductDetector.init({
    minConfidence: 0.5,  // 0-1, default 0.4
    debug: true          // console logging
});

// Get stats
const stats = ProductDetector.getStats(products);
// { total: 24, highConfidence: 18, withPrice: 22, ... }
```

### Events

```javascript
// Initial detection complete
document.addEventListener('products:detected', (e) => {
    console.log(e.detail); // Array of products
});

// Dynamic content added (SPA/infinite scroll)
document.addEventListener('products:updated', (e) => {
    console.log('New products:', e.detail);
});
```

### Product Object

```javascript
{
    id: "product-123",
    name: "Widget Pro",
    price: 29.99,
    currency: "USD",
    sku: "WP-001",
    image: "https://...",
    description: "...",
    confidence: 0.85,      // 0-1 detection confidence
    source: "schema-jsonld" // schema-jsonld, microdata, dom, api, user-config
}
```

## Integrating with POS System

The detector automatically adds `data-pos-*` attributes to detected products:

```html
<!-- Before -->
<div class="product" data-id="123">...</div>

<!-- After detection -->
<div class="product" data-id="123"
     data-pos-product="123"
     data-pos-name="Widget Pro"
     data-pos-price="29.99"
     data-pos-sku="WP-001">...</div>
```

This makes products compatible with `pos-system.js` immediately.

## License

MIT - Use freely in commercial and personal projects.

---

*Universal POS System v2.0.0*
