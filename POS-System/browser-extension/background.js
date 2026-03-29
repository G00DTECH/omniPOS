/**
 * Background Service Worker
 * Intercepts API calls to detect product data before rendering
 */

// Store intercepted product data per tab
const tabProductData = new Map();

// API patterns that typically return product data
const PRODUCT_API_PATTERNS = [
    /\/api\/.*product/i,
    /\/products\.json/i,
    /\/collections\/.*\.json/i,
    /graphql.*product/i,
    /\/cart\.json/i,
    /\/v\d+\/products/i,
    /_api\/wix-ecommerce/i,
    /\/store-api\//i,
    /\/wp-json\/wc\/v\d+\/products/i,
    /\/rest\/V\d+\/products/i
];

// Listen for web requests
chrome.webRequest.onCompleted.addListener(
    (details) => {
        const url = details.url;

        // Check if this looks like a product API call
        if (PRODUCT_API_PATTERNS.some(pattern => pattern.test(url))) {
            console.log('[POS Extension] Detected product API:', url);

            // Notify content script
            chrome.tabs.sendMessage(details.tabId, {
                type: 'PRODUCT_API_DETECTED',
                url: url
            }).catch(() => {}); // Ignore errors if tab closed
        }
    },
    { urls: ["<all_urls>"] }
);

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const tabId = sender.tab?.id;

    switch (message.type) {
        case 'STORE_PRODUCTS':
            // Store products detected by content script
            tabProductData.set(tabId, message.products);
            updateBadge(tabId, message.products.length);
            sendResponse({ success: true });
            break;

        case 'GET_PRODUCTS':
            // Return stored products
            sendResponse({ products: tabProductData.get(tabId) || [] });
            break;

        case 'FETCH_URL':
            // Fetch URL with extension permissions (bypasses CORS)
            fetch(message.url)
                .then(res => res.json())
                .then(data => sendResponse({ success: true, data }))
                .catch(err => sendResponse({ success: false, error: err.message }));
            return true; // Keep channel open for async response

        case 'SAVE_SITE_CONFIG':
            // Save user's custom configuration for a site
            chrome.storage.sync.get(['siteConfigs'], (result) => {
                const configs = result.siteConfigs || {};
                configs[message.hostname] = message.config;
                chrome.storage.sync.set({ siteConfigs: configs }, () => {
                    sendResponse({ success: true });
                });
            });
            return true;

        case 'GET_SITE_CONFIG':
            // Get saved configuration for current site
            chrome.storage.sync.get(['siteConfigs'], (result) => {
                const configs = result.siteConfigs || {};
                sendResponse({ config: configs[message.hostname] || null });
            });
            return true;
    }
});

// Update badge with product count
function updateBadge(tabId, count) {
    chrome.action.setBadgeText({
        tabId: tabId,
        text: count > 0 ? String(count) : ''
    });
    chrome.action.setBadgeBackgroundColor({
        tabId: tabId,
        color: count > 0 ? '#4CAF50' : '#999'
    });
}

// Clean up when tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
    tabProductData.delete(tabId);
});
