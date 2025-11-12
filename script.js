// script.js (public) - Final version for your schema
export function initPublic({ supabase }) {
  // DOM elements
  const DOM = {
    heroTitle: document.getElementById('heroTitle'),
    heroSubtitle: document.getElementById('heroSubtitle'),
    heroBg: document.getElementById('heroBg'),
    searchInput: document.getElementById('searchInput'),
    productsGrid: document.getElementById('productsGrid'),
    galleryGrid: document.getElementById('galleryGrid'),
    contactInfo: document.getElementById('contactInfo'),
    contactForm: document.getElementById('contactForm'),
    cartButton: document.getElementById('cartButton'),
    cartModal: document.getElementById('cartModal'),
    cartItems: document.getElementById('cartItems'),
    cartTotal: document.getElementById('cartTotal'),
    cartSubtotal: document.getElementById('cartSubtotal'),
    cartCount: document.getElementById('cartCount'),
    checkoutBtn: document.getElementById('checkoutBtn'),
    closeCart: document.getElementById('closeCart'),
    promoCode: document.getElementById('promoCode'),
    applyPromo: document.getElementById('applyPromo'),
    toastContainer: document.getElementById('toastContainer')
  };

  // Local cart storage
  let cart = JSON.parse(localStorage.getItem('crave_cart') || '{}');
  let allProducts = [];

  // --- LOAD CMS CONTENT ---
  async function loadContent() {
    try {
      // Load hero content
      const { data: hero, error: heroError } = await supabase
        .from('content')
        .select('*')
        .eq('section', 'hero')
        .single();

      if (heroError) throw heroError;
      
      if (hero) {
        DOM.heroTitle.textContent = hero.title || 'Crave Click Enjoy!';
        DOM.heroSubtitle.textContent = hero.subtitle || 'Order & Eat';
        if (hero.image_url) {
          DOM.heroBg.style.backgroundImage = `url('${hero.image_url}')`;
        }
      }

      // Load contact info
      const { data: contact, error: contactError } = await supabase
        .from('content')
        .select('*')
        .eq('section', 'contact')
        .single();

      if (contactError) throw contactError;

      if (contact) {
        DOM.contactInfo.innerHTML = `
          <div class="info-item">
            <div class="info-icon"><i class="fas fa-map-marker-alt"></i></div>
            <div>
              <h3>Our Location</h3>
              <p>${contact.address || '123 Bakery Street, Food City'}</p>
            </div>
          </div>
          <div class="info-item">
            <div class="info-icon"><i class="fas fa-phone"></i></div>
            <div>
              <h3>Phone</h3>
              <p>${contact.phone || '+1 234 567 8900'}</p>
            </div>
          </div>
          <div class="info-item">
            <div class="info-icon"><i class="fas fa-envelope"></i></div>
            <div>
              <h3>Email</h3>
              <p>${contact.email || 'hello@craveclickenjoy.com'}</p>
            </div>
          </div>
        `;
      }
    } catch (err) {
      console.error('Failed to load content', err);
      showToast('Failed to load site content', 'error');
    }
  }

  // --- LOAD PRODUCTS FROM SUPABASE ---
  async function loadProducts() {
    try {
      DOM.productsGrid.innerHTML = '<div class="loading-spinner active"><div class="spinner"></div></div>';
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      allProducts = data || [];
      renderProducts(allProducts);
      setupSearchAndFilter();

      // Hide loading spinner
      const spinner = DOM.productsGrid.querySelector('.loading-spinner');
      if (spinner) {
        spinner.classList.remove('active');
      }

    } catch (error) {
      console.error('Error loading products:', error);
      DOM.productsGrid.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--muted)">
          <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 15px;"></i>
          <p>Failed to load products. Please try again later.</p>
          <p style="font-size: 0.9rem; margin-top: 10px;">Error: ${error.message}</p>
        </div>
      `;
      showToast('Failed to load products', 'error');
    }
  }

  // --- RENDER PRODUCTS ---
  function renderProducts(products) {
    if (products.length === 0) {
      DOM.productsGrid.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--muted)">
          <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 15px;"></i>
          <p>No products found matching your criteria.</p>
        </div>
      `;
      return;
    }

    DOM.productsGrid.innerHTML = '';
    
    products.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card fade-in';
      card.dataset.productId = product.id;
      card.dataset.category = product.category?.toLowerCase() || 'all';
      
      const imageUrl = product.image_url || 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=300&fit=crop';
      const prepTime = '15-25'; // Default prep time
      
      card.innerHTML = `
        ${product.stock < 5 ? '<div class="product-badge">Limited</div>' : ''}
        <img src="${imageUrl}" alt="${product.name}" class="product-img" loading="lazy">
        <div class="product-info">
          <h3 class="product-name">${product.name}</h3>
          <p class="product-desc">${product.description || 'Freshly prepared with premium ingredients'}</p>
          <div class="product-meta">
            <div class="product-price">₹${product.price}</div>
            <div class="product-time">
              <i class="fas fa-clock"></i>
              <span>${prepTime}min</span>
            </div>
          </div>
          <div class="product-actions">
            <button class="btn-cart add-cart" data-id="${product.id}">
              <i class="fas fa-cart-plus"></i>
              Add to Cart
            </button>
          </div>
        </div>
      `;
      
      DOM.productsGrid.appendChild(card);
    });

    // Add intersection observer for fade-in animation
    setupObserver();
    
    // Attach event listeners to add-to-cart buttons
    document.querySelectorAll('.add-cart').forEach(button => {
      button.addEventListener('click', async (e) => {
        const productId = e.currentTarget.dataset.id;
        await addToCart(productId);
        recordAnalytics('add_to_cart', { product_id: productId });
      });
    });
  }

  // --- SEARCH AND FILTER FUNCTIONALITY ---
  function setupSearchAndFilter() {
    const categoryFilters = document.querySelectorAll('.category-filter');
    
    // Search functionality
    DOM.searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase().trim();
      filterProducts(searchTerm, getActiveCategory());
    });

    // Category filter functionality
    categoryFilters.forEach(filter => {
      filter.addEventListener('click', (e) => {
        categoryFilters.forEach(f => f.classList.remove('active'));
        e.target.classList.add('active');
        filterProducts(DOM.searchInput.value.toLowerCase().trim(), getActiveCategory());
      });
    });

    function getActiveCategory() {
      const activeFilter = document.querySelector('.category-filter.active');
      return activeFilter?.dataset.category || 'all';
    }

    function filterProducts(searchTerm, category) {
      const filtered = allProducts.filter(product => {
        const matchesSearch = !searchTerm || 
          product.name.toLowerCase().includes(searchTerm) || 
          (product.description && product.description.toLowerCase().includes(searchTerm));
        
        const matchesCategory = category === 'all' || 
          (product.category && product.category.toLowerCase() === category);
        
        return matchesSearch && matchesCategory;
      });
      
      renderProducts(filtered);
    }
  }

  // --- LOAD GALLERY ---
  async function loadGallery() {
    try {
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;

      DOM.galleryGrid.innerHTML = '';
      
      (data || []).forEach(item => {
        const div = document.createElement('div');
        div.className = 'gallery-item fade-in';
        div.innerHTML = `<img src="${item.image_url}" alt="Gallery image" loading="lazy">`;
        DOM.galleryGrid.appendChild(div);
      });

      setupObserver();
    } catch (error) {
      console.error('Error loading gallery:', error);
    }
  }

  // --- CART FUNCTIONALITY ---
  function saveCart() {
    localStorage.setItem('crave_cart', JSON.stringify(cart));
    updateCartUI();
  }

  function updateCartUI() {
    const items = Object.values(cart);
    DOM.cartItems.innerHTML = '';
    
    if (items.length === 0) {
      DOM.cartItems.innerHTML = `
        <div style="text-align:center; padding:40px 20px; color:var(--muted)">
          <i class="fas fa-shopping-cart" style="font-size:3rem; margin-bottom:15px;"></i>
          <p>Your cart is empty</p>
        </div>
      `;
      DOM.cartTotal.textContent = '0';
      DOM.cartSubtotal.textContent = '0';
    } else {
      let subtotal = 0;
      
      items.forEach(item => {
        const itemTotal = item.price * item.qty;
        subtotal += itemTotal;
        
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
          <img src="${item.image}" alt="${item.name}">
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-price">₹${item.price}</div>
            <div class="cart-controls">
              <button class="dec" data-id="${item.id}">-</button>
              <span>${item.qty}</span>
              <button class="inc" data-id="${item.id}">+</button>
            </div>
          </div>
        `;
        DOM.cartItems.appendChild(div);
      });
      
      DOM.cartTotal.textContent = subtotal.toFixed(2);
      DOM.cartSubtotal.textContent = subtotal.toFixed(2);
    }
    
    DOM.cartCount.textContent = items.reduce((total, item) => total + item.qty, 0);
  }

  async function addToCart(productId, quantity = 1) {
    try {
      // Get product details from Supabase
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error || !product) {
        showToast('Product not found', 'error');
        return;
      }

      if (cart[productId]) {
        cart[productId].qty += quantity;
      } else {
        cart[productId] = {
          id: productId,
          name: product.name,
          price: Number(product.price),
          qty: quantity,
          image: product.image_url || 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=300&fit=crop'
        };
      }

      saveCart();
      showToast(`${product.name} added to cart`, 'success');
    } catch (error) {
      console.error('Error adding to cart:', error);
      showToast('Failed to add item to cart', 'error');
    }
  }

  // --- CART EVENT HANDLERS ---
  DOM.cartButton.addEventListener('click', () => {
    DOM.cartModal.classList.add('active');
  });

  DOM.closeCart.addEventListener('click', () => {
    DOM.cartModal.classList.remove('active');
  });

  DOM.cartItems.addEventListener('click', (e) => {
    if (e.target.matches('.inc, .dec')) {
      const productId = Number(e.target.dataset.id);
      
      if (!cart[productId]) return;
      
      if (e.target.classList.contains('inc')) {
        cart[productId].qty += 1;
      } else {
        cart[productId].qty = Math.max(0, cart[productId].qty - 1);
      }
      
      if (cart[productId].qty === 0) {
        delete cart[productId];
      }
      
      saveCart();
    }
  });

  DOM.checkoutBtn.addEventListener('click', () => {
    const items = Object.values(cart);
    
    if (items.length === 0) {
      showToast('Your cart is empty', 'error');
      return;
    }

    // Create WhatsApp message
    const itemList = items.map(item => 
      `${item.qty} × ${item.name} - ₹${item.price * item.qty}`
    ).join('%0A');
    
    const total = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const message = `Order Details:%0A%0A${itemList}%0A%0ATotal: ₹${total}`;
    
    // Open WhatsApp
    window.open(`https://wa.me/919778550480?text=${message}`, '_blank');
    
    // Record analytics
    recordAnalytics('checkout', { 
      method: 'whatsapp', 
      total: total,
      item_count: items.length 
    });
    
    // Clear cart
    cart = {};
    saveCart();
    DOM.cartModal.classList.remove('active');
    
    showToast('Order placed successfully!', 'success');
  });

  DOM.applyPromo.addEventListener('click', () => {
    const promoCode = DOM.promoCode.value.trim();
    if (promoCode) {
      showToast('Promo code applied!', 'success');
      DOM.promoCode.value = '';
    } else {
      showToast('Please enter a promo code', 'error');
    }
  });

  // --- CONTACT FORM ---
  DOM.contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
      name: document.getElementById('cf_name').value,
      email: document.getElementById('cf_email').value,
      message: document.getElementById('cf_message').value
    };

    try {
      await recordAnalytics('contact_form_submission', formData);
      showToast('Message sent successfully! We\'ll get back to you soon.', 'success');
      DOM.contactForm.reset();
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Failed to send message. Please try again.', 'error');
    }
  });

  // --- ANALYTICS ---
  async function recordAnalytics(event, payload = {}) {
    try {
      const { error } = await supabase
        .from('analytics')
        .insert({
          event,
          payload,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.warn('Analytics error:', error);
    }
  }

  // --- INTERSECTION OBSERVER FOR ANIMATIONS ---
  function setupObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
  }

  // --- TOAST NOTIFICATIONS ---
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="fas fa-${getToastIcon(type)}"></i>
      <span>${message}</span>
    `;
    
    DOM.toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 4000);
  }

  function getToastIcon(type) {
    const icons = {
      success: 'check-circle',
      error: 'exclamation-circle',
      info: 'info-circle'
    };
    return icons[type] || 'info-circle';
  }

  // --- INITIALIZE APPLICATION ---
  async function init() {
    try {
      await loadContent();
      await loadProducts();
      await loadGallery();
      updateCartUI();
      setupObserver();
      
      // Record page view
      recordAnalytics('page_view', {
        path: window.location.pathname,
        referrer: document.referrer
      });
      
      showToast('Welcome to Crave Click Enjoy!', 'success');
    } catch (error) {
      console.error('Initialization error:', error);
      showToast('Failed to initialize application', 'error');
    }
  }

  // Start the application
  init();

  // Expose public API for admin preview
  window.cravePublic = {
    reload: async () => {
      await loadContent();
      await loadProducts();
      await loadGallery();
    },
    getCart: () => cart,
    clearCart: () => {
      cart = {};
      saveCart();
    }
  };
}