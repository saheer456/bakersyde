// script.js - Updated for Pastel Bakery with Detail Modal & Carousel
export function initPublic({ supabase }) {
  // DOM elements (added for new features)
  const DOM = {
    // ... existing ...
    popularCarousel: document.getElementById('popularCarousel'),
    productModal: document.getElementById('productModal'),
    closeDetail: document.getElementById('closeDetail'),
    detailImg: document.getElementById('detailImg'),
    detailName: document.getElementById('detailName'),
    detailDesc: document.getElementById('detailDesc'),
    detailPrice: document.getElementById('detailPrice'),
    detailStock: document.getElementById('detailStock'),
    detailQty: document.getElementById('detailQty'),
    addToCartDetail: document.getElementById('addToCartDetail'),
    whatsappDetail: document.getElementById('whatsappDetail'),
    qtyDec: document.querySelector('.qty-btn.dec'),
    qtyInc: document.querySelector('.qty-btn.inc')
  };

  let cart = JSON.parse(localStorage.getItem('bakery_cart') || '{}');
  let allProducts = [];
  let currentProduct = null;
  let detailQuantity = 1;

  // ... existing loadContent, loadProducts (updated render below) ...

  // Updated renderProducts
  function renderProducts(products, isPopular = false) {
    const container = isPopular ? DOM.popularCarousel : DOM.productsGrid;
    if (!container) return;
    container.innerHTML = '';

    if (products.length === 0) { /* empty state */ return; }

    products.slice(0, isPopular ? 5 : undefined).forEach(product => {
      const card = document.createElement('div');
      card.className = isPopular ? 'carousel-item' : 'product-card fade-in';
      card.innerHTML = `
        <img src="${product.image_url || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&h=200&fit=crop'}" alt="${product.name}" class="product-img">
        <div class="product-info">
          <h3 class="product-name">${product.name}</h3>
          <p class="product-desc">${product.description?.slice(0, 60)}...</p>
          <div class="product-price">₹${product.price}</div>
          ${product.stock === 0 ? '<div class="out-of-stock">Out of Stock</div>' : ''}
          ${product.stock < 5 ? '<div class="limited-stock">Limited!</div>' : ''}
          <button class="btn btn-primary add-cart ${product.stock === 0 ? 'disabled' : ''}" data-id="${product.id}">Add to Cart</button>
        </div>
      `;
      if (!isPopular) {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.add-cart')) return;
          openProductDetail(product.id);
        });
      }
      container.appendChild(card);
    });

    if (isPopular) setupCarousel();
  }

  // Load Popular (top 5)
  async function loadPopular() {
    const { data } = await supabase.from('products').select('*').order('views', { ascending: false }).limit(5);
    renderProducts(data || [], true);
  }

  // Product Detail Modal
  async function openProductDetail(id) {
    const { data: product } = await supabase.from('products').select('*').eq('id', id).single();
    if (!product) return;
    currentProduct = product;
    detailQuantity = 1;
    DOM.detailImg.src = product.image_url || '';
    DOM.detailName.textContent = product.name;
    DOM.detailDesc.textContent = product.description || '';
    DOM.detailPrice.textContent = `₹${product.price}`;
    DOM.detailStock.textContent = product.stock === 0 ? 'Out of Stock' : `Stock: ${product.stock}`;
    DOM.detailStock.className = product.stock === 0 ? 'detail-stock out' : 'detail-stock';
    DOM.detailQty.textContent = 1;
    DOM.addToCartDetail.disabled = product.stock === 0;
    DOM.whatsappDetail.href = `https://wa.me/919778550480?text=Hi! I'd like ${detailQuantity} x ${product.name} for ₹${product.price * detailQuantity}`;
    DOM.productModal.classList.add('active');
  }

  DOM.closeDetail.addEventListener('click', () => DOM.productModal.classList.remove('active'));
  document.querySelector('.modal-backdrop').addEventListener('click', () => DOM.productModal.classList.remove('active'));

  // Quantity Controls
  document.querySelector('.qty-btn.inc').addEventListener('click', () => {
    if (currentProduct.stock > detailQuantity) detailQuantity++; updateDetailQty();
  });
  document.querySelector('.qty-btn.dec').addEventListener('click', () => {
    if (detailQuantity > 1) detailQuantity--; updateDetailQty();
  });
  function updateDetailQty() {
    DOM.detailQty.textContent = detailQuantity;
    DOM.whatsappDetail.href = `https://wa.me/919778550480?text=Hi! I'd like ${detailQuantity} x ${currentProduct.name} for ₹${currentProduct.price * detailQuantity}`;
  }

  DOM.addToCartDetail.addEventListener('click', () => {
    if (currentProduct.stock === 0) return;
    addToCart(currentProduct.id, detailQuantity);
    DOM.productModal.classList.remove('active');
  });

  // Carousel Setup
  function setupCarousel() {
    // Simple scroll function
    window.scrollCarousel = (direction) => {
      DOM.popularCarousel.scrollBy({ left: direction * 320, behavior: 'smooth' });
    };
  }

  // Updated addToCart (existing, with localStorage key change to 'bakery_cart')

  // Init
  async function init() {
    // ... existing ...
    await loadPopular();
    // ... 
  }

  init();

  window.bakeryPublic = { /* expose */ };
}