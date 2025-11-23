// script.js — Full cleaned public script with category dropdown (Option A)
// Exports: initPublic({ supabase })
// Matches your index.html IDs and works with the admin panel fields.

export function initPublic({ supabase }) {
  if (!supabase) {
    console.error('Supabase client required for initPublic');
    return;
  }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  ready(() => main(supabase));
}

function main(supabase) {
  // DOM selectors
  const DOM = {
    heroTitle: document.getElementById('heroTitle'),
    heroSubtitle: document.getElementById('heroSubtitle'),
    heroBg: document.getElementById('heroBg'),
    storyText: document.getElementById('storyText'),
    storyImg: document.getElementById('storyImg'),
    productsGrid: document.getElementById('productsGrid'),
    galleryGrid: document.getElementById('galleryGrid'),
    categoryFilter: document.getElementById('categoryFilter'),
    contactForm: document.getElementById('contactForm'),
    contactName: document.getElementById('cf_name'),
    contactEmail: document.getElementById('cf_email'),
    contactMessage: document.getElementById('cf_message'),
    contactInfo: document.getElementById('contactInfo'),
    // cart UI
    cartButton: document.getElementById('cartButton'),
    cartDrawer: document.getElementById('cartDrawer'),
    cartList: document.getElementById('cartList'),
    cartSubtotal: document.getElementById('cartSubtotal'),
    closeCartDrawer: document.getElementById('closeCartDrawer'),
    checkoutModern: document.getElementById('checkoutModern'),
    cartModal: document.getElementById('cartModal'),
    cartItems: document.getElementById('cartItems'),
    cartTotal: document.getElementById('cartTotal'),
    closeCart: document.getElementById('closeCart'),
    checkoutBtn: document.getElementById('checkoutBtn'),
    cartCount: document.getElementById('cartCount'),
    toastContainer: document.getElementById('toastContainer') || createToastContainer()
  };

  // helper: create toast container if missing
  function createToastContainer() {
    const div = document.createElement('div');
    div.id = 'toastContainer';
    div.className = 'toast-container';
    document.body.appendChild(div);
    return div;
  }

  // State
  let cart = JSON.parse(localStorage.getItem('bakersyde_cart') || '{}');
  let productsCache = []; // latest fetched products
  const WA_NUMBER = '916235050397';

  // Toast
  function showToast(message, type = 'info', duration = 3000) {
    const c = document.createElement('div');
    c.className = `toast ${type}`;
    c.textContent = message;
    DOM.toastContainer.appendChild(c);
    setTimeout(() => {
      c.style.opacity = '0';
      setTimeout(() => c.remove(), 300);
    }, duration);
  }

  // Analytics (best-effort)
  async function recordEvent(event, payload = {}) {
    try {
      await supabase.from('analytics').insert([{ event, payload }]);
    } catch (err) {
      // non-fatal — log for debugging
      console.warn('Analytics insert failed', err);
    }
  }

  // Load content (hero, story, contact)
  async function loadContent() {
    try {
      const { data: hero } = await supabase.from('content').select('*').eq('section', 'hero').single();
      if (hero) {
        if (DOM.heroTitle) DOM.heroTitle.textContent = hero.title || '';
        if (DOM.heroSubtitle) DOM.heroSubtitle.textContent = hero.subtitle || '';
        if (hero.image_url && DOM.heroBg) DOM.heroBg.style.backgroundImage = `url('${hero.image_url}')`;
      }

      const { data: story } = await supabase.from('content').select('*').eq('section', 'story').single();
      if (story) {
        if (DOM.storyText) DOM.storyText.innerHTML = story.text || '';
        if (story.image_url && DOM.storyImg) DOM.storyImg.src = story.image_url;
      }

      const { data: contact } = await supabase.from('content').select('*').eq('section', 'contact').single();
      if (contact && DOM.contactInfo) {
        const text = contact.text || {};
        DOM.contactInfo.innerHTML = `
          <div class="info-item"><div class="info-icon"><i class="fas fa-map-marker-alt"></i></div>
            <div><h3>Our Location</h3><p>${text.address || ''}</p></div></div>
          <div class="info-item"><div class="info-icon"><i class="fas fa-phone"></i></div>
            <div><h3>Phone</h3><p>${text.phone || ''}</p></div></div>
          <div class="info-item"><div class="info-icon"><i class="fas fa-envelope"></i></div>
            <div><h3>Email</h3><p>${text.email || ''}</p></div></div>
        `;
      }
    } catch (err) {
      console.error('loadContent error', err);
      showToast('Failed to load site content', 'error');
    }
  }

  // Load products
  async function loadProducts() {
    try {
      if (DOM.productsGrid) DOM.productsGrid.innerHTML = '<p class="muted">Loading products…</p>';
      const { data, error } = await supabase.from('products').select('*').order('id', { ascending: true });
      if (error) throw error;
      productsCache = data || [];
      if (!productsCache.length) {
        if (DOM.productsGrid) DOM.productsGrid.innerHTML = '<p class="muted">No products available</p>';
      } else {
        // populate the category dropdown with actual categories (keeps order predictable)
        populateCategoryDropdown(productsCache);
        renderProducts(productsCache);
      }
    } catch (err) {
      console.error('loadProducts error', err);
      if (DOM.productsGrid) DOM.productsGrid.innerHTML = '<p class="muted">Failed to load products</p>';
    }
  }

  // Populate category dropdown (unique + sorted), keeps "All Products" at top
  function populateCategoryDropdown(products) {
    if (!DOM.categoryFilter) return;
    const cats = new Set();
    products.forEach(p => {
      const c = (p.category || 'Others').trim();
      if (c) cats.add(c);
    });
    const sorted = Array.from(cats).sort((a, b) => a.localeCompare(b));
    // store current selection
    const prev = DOM.categoryFilter.value || 'all';
    DOM.categoryFilter.innerHTML = `<option value="all">All Products</option>`;
    sorted.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      DOM.categoryFilter.appendChild(opt);
    });
    // restore selection if possible
    if ([...DOM.categoryFilter.options].some(o => o.value === prev)) DOM.categoryFilter.value = prev;
    else DOM.categoryFilter.value = 'all';
  }

  // --- CATEGORY FILTER HANDLER (Option A: headings + all items shown; dropdown filters categories)
  function setupCategoryFilter() {
    if (!DOM.categoryFilter) return;
    DOM.categoryFilter.addEventListener('change', () => {
      // Re-render according to dropdown selection; renderProducts will honor the filter
      renderProducts(productsCache);
    });
  }

  // --- RENDER PRODUCTS (grouped by category — Option A)
  function renderProducts(products) {
    if (!DOM.productsGrid) return;
    DOM.productsGrid.innerHTML = '';

    const selected = DOM.categoryFilter ? DOM.categoryFilter.value : 'all';

    // Group by category
    const categories = {};
    products.forEach(p => {
      const cat = (p.category || 'Others').trim();
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(p);
    });

    const sortedCats = Object.keys(categories).sort((a,b) => a.localeCompare(b));

    sortedCats.forEach(cat => {
      if (selected !== 'all' && selected !== cat) return;

      // Category title element (styled)
      const h = document.createElement('h2');
      h.className = 'category-title fade-in';
      h.textContent = cat;
      DOM.productsGrid.appendChild(h);

      // Items under this category
      categories[cat].forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card-modern single-col fade-in';
        card.dataset.id = p.id;

        const img = document.createElement('img');
        img.className = 'product-small-img';
        img.src = p.image_url || '';
        img.alt = p.name || '';
        img.loading = 'lazy';

        const info = document.createElement('div');
        info.className = 'product-info-wrap';

        const title = document.createElement('h3');
        title.textContent = p.name || '';

        const desc = document.createElement('p');
        desc.className = 'desc';
        desc.textContent = p.description || '';

        const bottom = document.createElement('div');
        bottom.className = 'price-row';

        const price = document.createElement('span');
        price.className = 'price';
        price.textContent = `₹${Number(p.price || 0).toFixed(2)}`;

        const stockEl = document.createElement('span');
        stockEl.className = 'stock';
        stockEl.textContent = (typeof p.stock === 'number' && p.stock > 0) ? `In stock: ${p.stock}` : 'Out of stock';

        const addBtn = document.createElement('button');
        addBtn.className = 'btn-add';
        addBtn.dataset.id = p.id;
        addBtn.title = 'Add to cart';
        addBtn.innerHTML = '<span class="plus">+</span>';
        if (typeof p.stock === 'number' && p.stock <= 0) {
          addBtn.disabled = true;
          addBtn.classList.add('disabled');
        }

        bottom.appendChild(price);
        bottom.appendChild(stockEl);
        bottom.appendChild(addBtn);

        info.appendChild(title);
        info.appendChild(desc);
        info.appendChild(bottom);

        card.appendChild(img);
        card.appendChild(info);

        DOM.productsGrid.appendChild(card);

        // click tracking on image/title
        card.querySelectorAll('img, h3').forEach(el => {
          el.addEventListener('click', () => recordEvent('product_click', { product_id: p.id }));
        });
      });
    });

    // Attach add-to-cart handlers
    DOM.productsGrid.querySelectorAll('.btn-add').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = Number(e.currentTarget.dataset.id);
        await handleAddToCart(id, 1);
      });
    });

    // Reapply fade-in observer
    setupObserver();
  }

  // --- Load gallery
  async function loadGallery() {
    if (!DOM.galleryGrid) return;
    try {
      DOM.galleryGrid.insertAdjacentHTML('beforeend', '<p id="loadingGal" class="muted">Loading…</p>');
      const { data, error } = await supabase.from('gallery').select('*').order('order_index', { ascending: true });
      if (error) throw error;
      const loading = document.getElementById('loadingGal');
      if (loading) loading.remove();
      (data || []).forEach(row => {
        const d = document.createElement('div');
        d.className = 'gallery-item fade-in';
        d.innerHTML = `<img src="${row.image_url}" alt="gallery" loading="lazy">`;
        DOM.galleryGrid.appendChild(d);
      });
      setupObserver();
    } catch (err) {
      console.error('loadGallery error', err);
    }
  }

  // --- CART FUNCTIONS
  function saveCart() {
    localStorage.setItem('bakersyde_cart', JSON.stringify(cart));
    updateCartUI();
  }

  function updateCartUI() {
    const items = Object.values(cart);
    const count = items.reduce((s, i) => s + i.qty, 0);
    if (DOM.cartCount) DOM.cartCount.textContent = String(count);

    // Drawer UI
    if (DOM.cartDrawer && DOM.cartList && DOM.cartSubtotal) {
      DOM.cartList.innerHTML = '';
      if (!items.length) DOM.cartList.innerHTML = '<p style="text-align:center;padding:18px">Cart is empty</p>';
      let total = 0;
      items.forEach(it => {
        total += it.price * it.qty;
        const wrapper = document.createElement('div');
        wrapper.className = 'cart-item-modern';
        wrapper.innerHTML = `
          <img src="${it.image}" alt="${it.name}">
          <div class="details">
            <div class="name">${escapeHtml(it.name)}</div>
            <div class="price">₹${it.price.toFixed(2)}</div>
          </div>
          <div class="qty-controls">
            <button class="dec" data-id="${it.id}">-</button>
            <span class="qty">${it.qty}</span>
            <button class="inc" data-id="${it.id}">+</button>
          </div>
        `;
        DOM.cartList.appendChild(wrapper);
      });
      DOM.cartSubtotal.textContent = `₹${total.toFixed(2)}`;
    }

    // Modal fallback
    if (DOM.cartModal && DOM.cartItems && DOM.cartTotal) {
      DOM.cartItems.innerHTML = '';
      if (!items.length) DOM.cartItems.innerHTML = '<p style="text-align:center;padding:18px">Cart is empty</p>';
      let total = 0;
      items.forEach(it => {
        total += it.price * it.qty;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
          <img src="${it.image}" alt="${it.name}" style="width:60px;height:60px;object-fit:cover">
          <div class="cart-item-info">
            <div class="cart-item-name">${escapeHtml(it.name)}</div>
            <div class="cart-item-price">₹${it.price.toFixed(2)}</div>
          </div>
          <div class="cart-controls">
            <button class="dec" data-id="${it.id}">-</button>
            <span class="qty">${it.qty}</span>
            <button class="inc" data-id="${it.id}">+</button>
          </div>
        `;
        DOM.cartItems.appendChild(div);
      });
      DOM.cartTotal.textContent = total.toFixed(2);
    }
  }

  async function handleAddToCart(productId, qty = 1) {
    const product = productsCache.find(p => p.id === productId);
    if (!product) { showToast('Product not found', 'error'); return; }
    const currentQty = cart[productId]?.qty || 0;
    const targetQty = currentQty + qty;

    if (product.stock !== null && product.stock !== undefined) {
      if (targetQty > product.stock) {
        showToast('Not enough stock available', 'error');
        return;
      }
    }

    if (cart[productId]) cart[productId].qty = targetQty;
    else cart[productId] = { id: product.id, name: product.name, price: Number(product.price), qty: qty, image: product.image_url || '' };

    saveCart();
    showToast(`${product.name} added to cart`, 'success');

    if (DOM.cartDrawer) DOM.cartDrawer.classList.add('active');
    if (DOM.cartModal) DOM.cartModal.classList.add('active');

    recordEvent('add_to_cart', { product_id: productId, qty });
  }

  // cart inc/dec (delegated)
  function attachCartControls() {
    if (DOM.cartList) {
      DOM.cartList.addEventListener('click', (e) => {
        if (e.target.matches('.inc, .dec')) {
          const id = Number(e.target.dataset.id);
          modifyCartQty(id, e.target.classList.contains('inc') ? 1 : -1);
        }
      });
    }
    if (DOM.cartItems) {
      DOM.cartItems.addEventListener('click', (e) => {
        if (e.target.matches('.inc, .dec')) {
          const id = Number(e.target.dataset.id);
          modifyCartQty(id, e.target.classList.contains('inc') ? 1 : -1);
        }
      });
    }
  }

  function modifyCartQty(productId, delta) {
    if (!cart[productId]) return;
    cart[productId].qty += delta;
    if (cart[productId].qty <= 0) delete cart[productId];
    saveCart();
  }
// Checkout via WhatsApp (Improved Professional Message)
async function checkoutViaWhatsApp() {
  const items = Object.values(cart);
  
  // Validate cart
  if (!items.length) {
    showToast('Cart is empty', 'info');
    return;
  }

  // Validate stock and products
  for (const item of items) {
    const product = productsCache.find(p => p.id === item.id);
    if (!product) {
      showToast(`Product not found: ${item.name}`, 'error');
      return;
    }
    if (product.stock !== null && product.stock !== undefined && item.qty > product.stock) {
      showToast(`Not enough stock for ${product.name}. Available: ${product.stock}`, 'error');
      return;
    }
  }

  try {
    // Generate order details
    const orderId = "BS-" + Math.floor(100000 + Math.random() * 900000);
    const now = new Date();
    const orderType = "Delivery";
    const paymentMethod = "Cash on Delivery";
    const device = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "Mobile" : "Desktop";
    
    const total = items.reduce((sum, item) => sum + (item.price * item.qty), 0);

    // Update stock in database
    for (const item of items) {
      await updateProductStock(item.id, item.qty);
    }

    // Record analytics
    await recordEvent('checkout', {
      orderId,
      method: 'whatsapp',
      total,
      itemCount: items.length,
      items: items.map(item => ({ id: item.id, name: item.name, qty: item.qty, price: item.price }))
    });

    // Generate WhatsApp message
    const message = generateOrderMessage({
      orderId,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      device,
      orderType,
      paymentMethod,
      items,
      total
    });

    // Send to WhatsApp
    const encodedMsg = encodeURIComponent(message);
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodedMsg}`, '_blank');

    // Clear cart and refresh
    cart = {};
    saveCart();
    await loadProducts();
    showToast('Order sent to WhatsApp!', 'success');

  } catch (error) {
    console.error('Checkout error:', error);
    showToast('Checkout failed. Please try again.', 'error');
  }
}

// Helper function to update product stock
async function updateProductStock(productId, quantity) {
  try {
    // Try RPC function first
    const { error: rpcError } = await supabase.rpc('decrement_stock', {
      p_id: productId,
      p_qty: quantity
    });
    
    if (rpcError) throw rpcError;
    
  } catch (rpcError) {
    console.warn('RPC stock update failed, using fallback:', rpcError);
    
    // Fallback: manual stock update
    try {
      const { data: product } = await supabase
        .from('products')
        .select('stock')
        .eq('id', productId)
        .single();

      if (product) {
        const newStock = Math.max(0, product.stock - quantity);
        await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', productId);
      }
    } catch (fallbackError) {
      console.error('Fallback stock update failed:', fallbackError);
      throw new Error(`Failed to update stock for product ${productId}`);
    }
  }
}

// Helper function to generate formatted WhatsApp message
function generateOrderMessage(orderData) {
  const { orderId, date, time, device, orderType, paymentMethod, items, total } = orderData;
  
  const orderLines = items
    .map(item => `• ${item.qty} × ${item.name} — ₹${(item.price * item.qty).toFixed(2)}`)
    .join('\n');

  return `🧁 *BAKERSYDE ORDER REQUEST*

📋 *ORDER ID:* ${orderId}
📅 ${date} | ⏰ ${time}
📱 ${device}

🛒 *ORDER SUMMARY* (${items.length} ${items.length === 1 ? 'item' : 'items'})
${orderLines}

💰 *TOTAL: ₹${total.toFixed(2)}*

🚚 *Order Type:* ${orderType}
💳 *Payment Method:* ${paymentMethod}

👤 *CUSTOMER INFORMATION*
• Name: 
• Phone: 
• Address: 

Thank you for your order! We'll confirm shortly. 💛`;
}

  // Contact form handling
  if (DOM.contactForm) {
    DOM.contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = DOM.contactName?.value || '';
      const email = DOM.contactEmail?.value || '';
      const message = DOM.contactMessage?.value || '';
      try {
        await supabase.from('analytics').insert([{ event: 'contact_form', payload: { name, email, message } }]);
        showToast('Message sent — thanks!', 'success');
        DOM.contactForm.reset();
      } catch (err) {
        console.error('contact form error', err);
        showToast('Failed to send message', 'error');
      }
    });
  }

  // Fade-in observer
  let observer = null;
  function setupObserver() {
    if (!observer) {
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
    }
    document.querySelectorAll('.fade-in').forEach(el => {
      try { observer.observe(el); } catch (e) { /* ignore */ }
    });
  }

  // Utilities
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, function (m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
    });
  }

  // Cart UI wiring
  function attachCartUI() {
    if (DOM.cartButton) {
      DOM.cartButton.addEventListener('click', () => {
        if (DOM.cartDrawer) DOM.cartDrawer.classList.add('active');
        if (DOM.cartModal) DOM.cartModal.classList.add('active');
      });
    }
    if (DOM.closeCartDrawer) DOM.closeCartDrawer.addEventListener('click', () => DOM.cartDrawer.classList.remove('active'));
    if (DOM.closeCart) DOM.closeCart.addEventListener('click', () => DOM.cartModal.classList.remove('active'));
    if (DOM.checkoutModern) DOM.checkoutModern.addEventListener('click', checkoutViaWhatsApp);
    if (DOM.checkoutBtn) DOM.checkoutBtn.addEventListener('click', checkoutViaWhatsApp);
    attachCartControls();
  }

  // Initialization
  (async function init() {
    try {
      if (DOM.cartDrawer) DOM.cartDrawer.classList.remove('active');
      if (DOM.cartModal) DOM.cartModal.classList.remove('active');

      await loadContent();
      await loadProducts();
      await loadGallery();
      updateCartUI();
      attachCartUI();
      setupCategoryFilter();
      setupObserver();
      await recordEvent('page_view', { path: window.location.pathname });
    } catch (err) {
      console.error('init error', err);
    }
  })();

  // Expose debug API
  window.bakersydePublic = {
    reloadAll: async () => {
      await loadContent();
      await loadProducts();
      await loadGallery();
      updateCartUI();
    },
    getCart: () => cart
  };
}
