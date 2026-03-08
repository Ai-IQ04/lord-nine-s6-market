// ========================================
// DISCORD MARKETPLACE — Client-side App
// ========================================

const API_BASE = '';
let allListings = [];
let currentCategory = 'all';
let currentSort = 'newest';

// ===== DOM ELEMENTS =====
const searchInput = document.getElementById('searchInput');
const productsGrid = document.getElementById('productsGrid');
const emptyState = document.getElementById('emptyState');
const featuredCarousel = document.getElementById('featuredCarousel');
const featuredSection = document.getElementById('featuredSection');
const sortSelect = document.getElementById('sortSelect');
const filterCategories = document.getElementById('filterCategories');
const productModal = document.getElementById('productModal');
const modalClose = document.getElementById('modalClose');
const toastContainer = document.getElementById('toastContainer');
const languageSelector = document.getElementById('languageSelector');
const languageButtons = document.querySelectorAll('.language-btn');

// ===== LANGUAGE SYSTEM =====
let currentLanguage = 'th'; // Default: Thai
const translations = {
    th: {
        searchPlaceholder: 'ค้นหาสินค้า...',
        allItems: 'ทั้งหมด',
        featured: 'สินค้าแนะนำ',
        topPicks: 'สินค้าแนะนำยอดนิยม',
        items: 'สินค้า',
        sellers: 'ผู้ขาย',
        categories: 'หมวดหมู่',
        sortNewest: 'ใหม่ล่าสุด',
        sortPriceAsc: 'ราคา น้อย→มาก',
        sortPriceDesc: 'ราคา มาก→น้อย',
        buyNow: 'ซื้อทันที',
        contactSeller: 'ติดต่อผู้ขาย',
        description: 'รายละเอียด',
        price: 'ราคา',
        seller: 'ผู้ขาย',
        noItems: 'ไม่พบสินค้า',
        loading: 'กำลังโหลด...',
        categoryCharacter: 'ตัวละคร',
        categoryItem: 'Item',
        categoryDiamond: 'รับซื้อเพรช'
    },
    en: {
        searchPlaceholder: 'Search items...',
        allItems: 'All',
        featured: 'Featured',
        topPicks: 'Top Picks',
        items: 'Items',
        sellers: 'Sellers',
        categories: 'Categories',
        sortNewest: 'Newest',
        sortPriceAsc: 'Low→High',
        sortPriceDesc: 'High→Low',
        buyNow: 'Buy Now',
        contactSeller: 'Contact Seller',
        description: 'Description',
        price: 'Price',
        seller: 'Seller',
        noItems: 'No items found',
        loading: 'Loading...',
        categoryCharacter: 'Character',
        categoryItem: 'Item',
        categoryDiamond: 'Buy Diamonds'
    }
};

// Stats
const totalListingsEl = document.getElementById('totalListings');
const totalSellersEl = document.getElementById('totalSellers');
const totalCategoriesEl = document.getElementById('totalCategories');

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', () => {
    initLanguageSystem();
    fetchListings();
    setupEventListeners();
    connectSocket();
    createHeroParticles();
});

// ===== LANGUAGE FUNCTIONS =====
function initLanguageSystem() {
    // Load saved language from localStorage
    const savedLang = localStorage.getItem('marketplace_lang') || 'th';
    setLanguage(savedLang);

    // Add event listeners to language buttons
    if (languageButtons) {
        languageButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.getAttribute('data-lang');
                setLanguage(lang);
            });
        });
    }
}

function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('marketplace_lang', lang);

    // Update active button
    if (languageButtons) {
        languageButtons.forEach(btn => {
            if (btn.getAttribute('data-lang') === lang) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // Update UI text
    updateUIText();
}

function updateUIText() {
    const t = translations[currentLanguage];

    // Update search placeholder
    if (searchInput) {
        searchInput.placeholder = t.searchPlaceholder;
    }

    // Update sort options
    if (sortSelect) {
        const options = sortSelect.options;
        if (options.length >= 3) {
            options[0].text = t.sortNewest;
            options[1].text = t.sortPriceAsc;
            options[2].text = t.sortPriceDesc;
        }
    }

    // Update page title and meta description
    const pageTitle = document.getElementById('pageTitle');
    const metaDescription = document.getElementById('metaDescription');

    if (pageTitle) {
        const titleText = currentLanguage === 'th' ? pageTitle.getAttribute('data-th') : pageTitle.getAttribute('data-en');
        document.title = titleText;
    }

    if (metaDescription) {
        const descText = currentLanguage === 'th' ? metaDescription.getAttribute('data-th') : metaDescription.getAttribute('data-en');
        metaDescription.setAttribute('content', descText);
    }

    // Update elements with data-th and data-en attributes (including category buttons)
    const elements = document.querySelectorAll('[data-th][data-en]');
    elements.forEach(element => {
        const text = currentLanguage === 'th' ? element.getAttribute('data-th') : element.getAttribute('data-en');

        // Handle innerHTML for elements that contain HTML
        if (element.tagName === 'P' && element.innerHTML.includes('<code>')) {
            // For paragraphs with code tags, preserve HTML structure
            const thText = element.getAttribute('data-th');
            const enText = element.getAttribute('data-en');
            element.innerHTML = currentLanguage === 'th' ? thText : enText;
        } else if (element.tagName === 'BUTTON' || element.tagName === 'OPTION') {
            // For buttons and options, update text content
            element.textContent = text;

            // Update data-category for category buttons if needed
            if (element.classList.contains('filter-btn') && !element.getAttribute('data-category').includes('all')) {
                const thCategory = element.getAttribute('data-th').replace(/^[^\s]+\s/, ''); // Remove emoji
                const enCategory = element.getAttribute('data-en').replace(/^[^\s]+\s/, ''); // Remove emoji
                element.setAttribute('data-category', currentLanguage === 'th' ? thCategory : enCategory);
            }
        } else if (element.tagName === 'SPAN' && element.parentElement.tagName === 'BUTTON') {
            // For span inside button (buy button)
            element.textContent = text;
        } else {
            // For other elements
            element.textContent = text;
        }
    });

    // Update sort label (special case)
    const sortLabel = document.querySelector('.sort-label');
    if (sortLabel) {
        sortLabel.textContent = currentLanguage === 'th' ? 'เรียง:' : 'Sort:';
    }
}

// ===== FETCH LISTINGS =====
async function fetchListings() {
    try {
        const params = new URLSearchParams();
        if (currentSort) params.set('sort', currentSort);
        if (currentCategory !== 'all') params.set('category', currentCategory);
        if (searchInput && searchInput.value.trim()) params.set('search', searchInput.value.trim());

        const res = await fetch(`${API_BASE}/api/listings?${params.toString()}`);
        const json = await res.json();

        if (json.success) {
            allListings = json.data;
            renderListings(allListings);
            updateStats(allListings);
            fetchFeatured();
        }
    } catch (err) {
        console.error('Error fetching listings:', err);
    }
}

async function fetchFeatured() {
    try {
        const res = await fetch(`${API_BASE}/api/listings/featured`);
        const json = await res.json();
        if (json.success && json.data.length > 0) {
            renderFeatured(json.data);
            featuredSection.style.display = 'block';
        } else {
            featuredSection.style.display = 'none';
        }
    } catch (err) {
        console.error('Error fetching featured:', err);
    }
}

// ===== RENDER LISTINGS =====
function renderListings(listings) {
    if (listings.length === 0) {
        productsGrid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    productsGrid.innerHTML = listings
        .map(
            (item, i) => `
    <div class="product-card" data-id="${item.id}" style="animation-delay: ${i * 0.05}s">
      <div class="card-image" onclick="openModal('${item.id}')">
        ${item.image_url
                    ? `<img src="${item.image_url}" alt="${escapeHtml(item.item_name)}" loading="lazy">`
                    : `<div class="card-image-placeholder">${getCategoryEmoji(item.category)}</div>`
                }
        <span class="card-category">${escapeHtml(item.category)}</span>
      </div>
      <div class="card-body">
        <h3 class="card-name" onclick="openModal('${item.id}')">${escapeHtml(item.item_name)}</h3>
        <p class="card-description">${escapeHtml(item.description || 'ไม่มีคำอธิบาย / No description')}</p>
        <div class="card-footer">
          <span class="card-price">฿${Number(item.price).toLocaleString()}</span>
          <span class="card-seller">
            <span class="card-seller-dot"></span>
            ${escapeHtml(item.seller_name)}
          </span>
        </div>
        <button class="btn-buy" onclick="buyItemDirect('${item.id}')">
          🛒 ซื้อ / Buy
        </button>
      </div>
    </div>
  `
        )
        .join('');
}

function renderFeatured(items) {
    featuredCarousel.innerHTML = items
        .map(
            (item) => `
    <div class="featured-card" onclick="openModal('${item.id}')">
      <img class="featured-card-image" src="${item.image_url || ''}" alt="${escapeHtml(item.item_name)}"
        onerror="this.style.display='none'">
      <div class="featured-card-body">
        <h3 class="featured-card-name">${escapeHtml(item.item_name)}</h3>
        <span class="featured-card-price">฿${Number(item.price).toLocaleString()}</span>
        <p class="featured-card-seller">👤 ${escapeHtml(item.seller_name)}</p>
      </div>
    </div>
  `
        )
        .join('');
}

// ===== UPDATE STATS =====
function updateStats(listings) {
    animateCounter(totalListingsEl, listings.length);
    const sellers = new Set(listings.map((l) => l.seller_id));
    animateCounter(totalSellersEl, sellers.size);
    const categories = new Set(listings.map((l) => l.category));
    animateCounter(totalCategoriesEl, categories.size);
}

function animateCounter(el, target) {
    const current = parseInt(el.textContent) || 0;
    if (current === target) return;

    const duration = 600;
    const start = performance.now();

    function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
        el.textContent = Math.round(current + (target - current) * eased);
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

// ===== MODAL =====
let currentModalItemId = null;

function openModal(id) {
    const item = allListings.find((l) => l.id === id);
    if (!item) return;

    currentModalItemId = id;

    document.getElementById('modalImage').src = item.image_url || '';
    document.getElementById('modalImage').onerror = function () {
        this.parentElement.innerHTML = `<div class="card-image-placeholder" style="height:100%;font-size:5rem">${getCategoryEmoji(item.category)}</div>`;
    };
    document.getElementById('modalCategory').textContent = item.category;
    document.getElementById('modalTitle').textContent = item.item_name;
    document.getElementById('modalPrice').textContent = `฿${Number(item.price).toLocaleString()}`;
    document.getElementById('modalDescription').textContent = item.description || 'ไม่มีคำอธิบาย';
    document.getElementById('modalSellerAvatar').textContent = (item.seller_name || '?')[0].toUpperCase();
    document.getElementById('modalSellerName').textContent = item.seller_name;
    document.getElementById('modalSellerName').href = `seller.html?id=${item.seller_id}`;
    document.getElementById('modalSellerRating').textContent = '⭐ ดูโปรไฟล์ผู้ขาย';
    document.getElementById('modalDate').textContent = `📅 ${new Date(item.timestamp).toLocaleDateString('th-TH')}`;
    document.getElementById('modalId').textContent = `🆔 ${item.id.substring(0, 8)}...`;

    productModal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    productModal.classList.remove('open');
    document.body.style.overflow = '';
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Search
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(fetchListings, 300);
    });

    // Sort
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        fetchListings();
    });

    // Category filter
    filterCategories.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        filterCategories.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.category;
        fetchListings();
    });

    // Modal
    modalClose.addEventListener('click', closeModal);
    productModal.addEventListener('click', (e) => {
        if (e.target === productModal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

// ===== SOCKET.IO — REALTIME =====
function connectSocket() {
    try {
        const socket = io();

        socket.on('connect', () => {
            console.log('🔌 Connected to marketplace');
            document.getElementById('liveBadge').style.display = 'inline-flex';
        });

        socket.on('disconnect', () => {
            console.log('🔌 Disconnected');
        });

        socket.on('new_listing', (listing) => {
            allListings.unshift(listing);
            renderListings(allListings);
            updateStats(allListings);
            fetchFeatured();
            showToast(`🆕 สินค้าใหม่ / New: ${listing.item_name}`, 'success');

            // Highlight animation
            setTimeout(() => {
                const card = document.querySelector(`[data-id="${listing.id}"]`);
                if (card) card.classList.add('new-listing');
            }, 100);
        });

        socket.on('delete_listing', (data) => {
            allListings = allListings.filter((l) => l.id !== data.id);
            renderListings(allListings);
            updateStats(allListings);
            fetchFeatured();
            showToast('🗑️ สินค้าถูกลบ / Item removed', 'warning');
        });

        socket.on('update_listing', (updated) => {
            const idx = allListings.findIndex((l) => l.id === updated.id);
            if (idx !== -1) allListings[idx] = { ...allListings[idx], ...updated };
            renderListings(allListings);
            fetchFeatured();
            showToast(`✏️ อัปเดต / Updated: ${updated.item_name}`, 'info');
        });

        socket.on('new_review', (review) => {
            showToast(`⭐ รีวิวใหม่สำหรับผู้ขาย`, 'info');
        });
    } catch (err) {
        console.error('Socket connection error:', err);
    }
}

// ===== TOAST NOTIFICATION =====
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.4s ease forwards';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// ===== HERO PARTICLES =====
function createHeroParticles() {
    const container = document.getElementById('heroParticles');
    if (!container) return;

    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
      position: absolute;
      width: ${Math.random() * 3 + 1}px;
      height: ${Math.random() * 3 + 1}px;
      background: rgba(99, 102, 241, ${Math.random() * 0.4 + 0.1});
      border-radius: 50%;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      animation: floatParticle ${Math.random() * 10 + 10}s linear infinite;
      animation-delay: ${Math.random() * -10}s;
    `;
        container.appendChild(particle);
    }

    // Add particle float animation
    if (!document.getElementById('particleStyle')) {
        const style = document.createElement('style');
        style.id = 'particleStyle';
        style.textContent = `
      @keyframes floatParticle {
        0% { transform: translate(0, 0) scale(1); opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translate(${Math.random() > 0.5 ? '' : '-'}${Math.random() * 200}px, -${Math.random() * 400 + 200}px) scale(0); opacity: 0; }
      }
    `;
        document.head.appendChild(style);
    }
}

// ===== UTILITIES =====
function getCategoryEmoji(category) {
    const map = {
        'ตัวละคร': '🧙',
        'Item': '⚔️',
        'รับซื้อเพรช': '💎',
    };
    return map[category] || '📦';
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ===== BUY ITEM — Create Discord Thread =====
function buyItemDirect(id) {
    currentModalItemId = id;
    buyItem();
}

async function buyItem() {
    const id = currentModalItemId;
    if (!id) return;

    const btn = document.getElementById('modalBuyBtn');
    const allBtns = document.querySelectorAll('.btn-buy');
    allBtns.forEach(b => { b.classList.add('loading'); b.innerHTML = '⏳ Loading...'; });
    if (btn) {
        btn.innerHTML = '⏳ กำลังเปิดแชท... / Opening chat...';
        btn.classList.add('loading');
    }

    try {
        const res = await fetch(`${API_BASE}/api/buy/${id}`, { method: 'POST' });
        const json = await res.json();

        if (json.success && json.data.thread_url) {
            showToast('✅ เปิดเธรดใน Discord แล้ว! / Thread opened!', 'success');
            window.open(json.data.thread_url, '_blank');
        } else {
            showToast(json.error || '❌ ไม่สามารถเปิดแชทได้', 'warning');
        }
    } catch (err) {
        showToast('❌ เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'warning');
        console.error('Buy error:', err);
    } finally {
        allBtns.forEach(b => {
            b.classList.remove('loading');
            b.innerHTML = '🛒 ซื้อ / Buy';
        });
        if (btn) {
            btn.classList.remove('loading');
            btn.innerHTML = '🛒 ซื้อสินค้านี้ / Buy — เปิดแชทกับผู้ขาย';
        }
    }
}
