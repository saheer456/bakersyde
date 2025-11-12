// admin.js (No Authentication) - Final version for your schema
export function initAdmin({ supabase }) {
  // DOM Elements
  const DOM = {
    // Content elements
    heroTitle: document.getElementById('heroTitle'),
    heroSubtitle: document.getElementById('heroSubtitle'),
    heroImageFile: document.getElementById('heroImageFile'),
    uploadHeroImageBtn: document.getElementById('uploadHeroImageBtn'),
    storyTextArea: document.getElementById('storyTextArea'),
    storyImageFile: document.getElementById('storyImageFile'),
    uploadStoryImageBtn: document.getElementById('uploadStoryImageBtn'),
    saveContentBtn: document.getElementById('saveContentBtn'),
    previewBtn: document.getElementById('previewBtn'),

    // Product elements
    p_name: document.getElementById('p_name'),
    p_price: document.getElementById('p_price'),
    p_stock: document.getElementById('p_stock'),
    p_category: document.getElementById('p_category'),
    p_desc: document.getElementById('p_desc'),
    p_image_file: document.getElementById('p_image_file'),
    createProductBtn: document.getElementById('createProductBtn'),
    refreshProductsBtn: document.getElementById('refreshProductsBtn'),
    productsList: document.getElementById('productsList'),

    // Gallery elements
    galleryFile: document.getElementById('galleryFile'),
    uploadGalleryBtn: document.getElementById('uploadGalleryBtn'),
    galleryList: document.getElementById('galleryList'),
    refreshGalleryBtn: document.getElementById('refreshGalleryBtn'),

    // Analytics elements
    analyticsView: document.getElementById('analyticsView'),
    refreshAnalyticsBtn: document.getElementById('refreshAnalyticsBtn'),
    exportAnalyticsBtn: document.getElementById('exportAnalyticsBtn')
  };

  // State
  let currentProducts = [];

  // Initialize admin
  init();

  async function init() {
    console.log('Admin panel initialized - No authentication required');
    await loadAllContent();
  }

  // --- FILE UPLOAD HELPER ---
  async function uploadFileToStorage(file, pathPrefix = 'images') {
    if (!file) throw new Error('No file selected');
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `${pathPrefix}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('images')
      .upload(filePath, file);

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  }

  // --- CONTENT MANAGEMENT ---
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
        DOM.heroTitle.value = hero.title || '';
        DOM.heroSubtitle.value = hero.subtitle || '';
      }

      // Load story content
      const { data: story, error: storyError } = await supabase
        .from('content')
        .select('*')
        .eq('section', 'story')
        .single();

      if (storyError) throw storyError;

      if (story) {
        DOM.storyTextArea.value = story.text || '';
      }
    } catch (error) {
      console.error('Error loading content:', error);
      showMessage('Failed to load content: ' + error.message, 'error');
    }
  }

  async function saveContent() {
    try {
      DOM.saveContentBtn.classList.add('loading');
      DOM.saveContentBtn.textContent = 'Saving...';

      // Save hero content
      const { error: heroError } = await supabase
        .from('content')
        .upsert([
          { 
            section: 'hero', 
            title: DOM.heroTitle.value,
            subtitle: DOM.heroSubtitle.value
          }
        ], { onConflict: 'section' });

      if (heroError) throw heroError;

      // Save story content
      const { error: storyError } = await supabase
        .from('content')
        .upsert([
          { 
            section: 'story', 
            text: DOM.storyTextArea.value
          }
        ], { onConflict: 'section' });

      if (storyError) throw storyError;

      showMessage('Content saved successfully!', 'success');
      
      // Refresh public site if available
      if (window.cravePublic?.reload) {
        window.cravePublic.reload();
      }
    } catch (error) {
      console.error('Error saving content:', error);
      showMessage('Failed to save content: ' + error.message, 'error');
    } finally {
      DOM.saveContentBtn.classList.remove('loading');
      DOM.saveContentBtn.textContent = 'Save All Content';
    }
  }

  DOM.saveContentBtn.addEventListener('click', saveContent);

  DOM.previewBtn.addEventListener('click', () => {
    window.open('/', '_blank');
  });

  // --- IMAGE UPLOADS ---
  DOM.uploadHeroImageBtn.addEventListener('click', async () => {
    const file = DOM.heroImageFile.files[0];
    if (!file) {
      showMessage('Please select an image file', 'error');
      return;
    }

    try {
      DOM.uploadHeroImageBtn.classList.add('loading');
      DOM.uploadHeroImageBtn.textContent = 'Uploading...';

      const imageUrl = await uploadFileToStorage(file, 'hero');
      
      const { error } = await supabase
        .from('content')
        .upsert([
          { 
            section: 'hero', 
            image_url: imageUrl 
          }
        ], { onConflict: 'section' });

      if (error) throw error;

      showMessage('Hero image uploaded successfully!', 'success');
      DOM.heroImageFile.value = '';
      
      if (window.cravePublic?.reload) {
        window.cravePublic.reload();
      }
    } catch (error) {
      console.error('Error uploading hero image:', error);
      showMessage('Upload failed: ' + error.message, 'error');
    } finally {
      DOM.uploadHeroImageBtn.classList.remove('loading');
      DOM.uploadHeroImageBtn.textContent = 'Upload Hero Image';
    }
  });

  DOM.uploadStoryImageBtn.addEventListener('click', async () => {
    const file = DOM.storyImageFile.files[0];
    if (!file) {
      showMessage('Please select an image file', 'error');
      return;
    }

    try {
      DOM.uploadStoryImageBtn.classList.add('loading');
      DOM.uploadStoryImageBtn.textContent = 'Uploading...';

      const imageUrl = await uploadFileToStorage(file, 'story');
      
      const { error } = await supabase
        .from('content')
        .upsert([
          { 
            section: 'story', 
            image_url: imageUrl 
          }
        ], { onConflict: 'section' });

      if (error) throw error;

      showMessage('Story image uploaded successfully!', 'success');
      DOM.storyImageFile.value = '';
      
      if (window.cravePublic?.reload) {
        window.cravePublic.reload();
      }
    } catch (error) {
      console.error('Error uploading story image:', error);
      showMessage('Upload failed: ' + error.message, 'error');
    } finally {
      DOM.uploadStoryImageBtn.classList.remove('loading');
      DOM.uploadStoryImageBtn.textContent = 'Upload Story Image';
    }
  });

  // --- PRODUCT MANAGEMENT ---
  async function createProduct() {
    const name = DOM.p_name.value.trim();
    const price = DOM.p_price.value;
    const stock = DOM.p_stock.value;
    const category = DOM.p_category.value;
    const description = DOM.p_desc.value.trim();
    const imageFile = DOM.p_image_file.files[0];

    if (!name || !price || !category) {
      showMessage('Please fill in at least Name, Price, and Category', 'error');
      return;
    }

    try {
      DOM.createProductBtn.classList.add('loading');
      DOM.createProductBtn.textContent = 'Creating...';

      let imageUrl = '';
      if (imageFile) {
        imageUrl = await uploadFileToStorage(imageFile, 'products');
      }

      const productData = {
        name,
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        category,
        description,
        image_url: imageUrl
      };

      const { error } = await supabase
        .from('products')
        .insert([productData]);

      if (error) throw error;

      showMessage('Product created successfully!', 'success');
      clearProductForm();
      loadProductsList();
      
      if (window.cravePublic?.reload) {
        window.cravePublic.reload();
      }
    } catch (error) {
      console.error('Error creating product:', error);
      showMessage('Failed to create product: ' + error.message, 'error');
    } finally {
      DOM.createProductBtn.classList.remove('loading');
      DOM.createProductBtn.textContent = 'Create Product';
    }
  }

  DOM.createProductBtn.addEventListener('click', createProduct);
  DOM.refreshProductsBtn.addEventListener('click', loadProductsList);

  async function loadProductsList() {
    try {
      DOM.refreshProductsBtn.classList.add('loading');
      DOM.refreshProductsBtn.textContent = 'Loading...';

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      currentProducts = data || [];
      renderProductsList(currentProducts);
    } catch (error) {
      console.error('Error loading products:', error);
      showMessage('Failed to load products: ' + error.message, 'error');
    } finally {
      DOM.refreshProductsBtn.classList.remove('loading');
      DOM.refreshProductsBtn.textContent = 'Refresh Products';
    }
  }

  function renderProductsList(products) {
    if (products.length === 0) {
      DOM.productsList.innerHTML = `
        <h4>Existing Products</h4>
        <div style="background: var(--paper); padding: 20px; border-radius: 8px; text-align: center; color: var(--muted);">
          No products found. Create your first product above.
        </div>
      `;
      return;
    }

    DOM.productsList.innerHTML = `
      <h4>Existing Products (${products.length})</h4>
      <div style="max-height: 500px; overflow-y: auto;">
        ${products.map(product => `
          <div class="list-row" data-product-id="${product.id}">
            <img src="${product.image_url || 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=100&h=75&fit=crop'}" alt="${product.name}">
            <div class="list-row-content">
              <div class="list-row-title">${product.name}</div>
              <div class="list-row-meta">
                ₹${product.price} • ${product.category} • Stock: ${product.stock}
              </div>
            </div>
            <div class="list-row-actions">
              <button class="btn-admin btn-admin-secondary edit-product" data-id="${product.id}">
                Edit
              </button>
              <button class="btn-admin btn-admin-danger delete-product" data-id="${product.id}">
                Delete
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Attach event listeners
    DOM.productsList.querySelectorAll('.delete-product').forEach(button => {
      button.addEventListener('click', async (e) => {
        const productId = e.target.dataset.id;
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
          const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId);

          if (error) throw error;

          showMessage('Product deleted successfully!', 'success');
          loadProductsList();
          
          if (window.cravePublic?.reload) {
            window.cravePublic.reload();
          }
        } catch (error) {
          console.error('Error deleting product:', error);
          showMessage('Failed to delete product: ' + error.message, 'error');
        }
      });
    });

    DOM.productsList.querySelectorAll('.edit-product').forEach(button => {
      button.addEventListener('click', async (e) => {
        const productId = e.target.dataset.id;
        const product = currentProducts.find(p => p.id == productId);
        
        if (product) {
          // Fill form with product data
          DOM.p_name.value = product.name;
          DOM.p_price.value = product.price;
          DOM.p_stock.value = product.stock;
          DOM.p_category.value = product.category;
          DOM.p_desc.value = product.description || '';
          
          showMessage('Product loaded into form for editing. Click "Create Product" to update.', 'info');
          
          // Optional: Delete old product automatically
          if (confirm('Delete old product and create updated version?')) {
            await supabase.from('products').delete().eq('id', productId);
            loadProductsList();
          }
        }
      });
    });
  }

  function clearProductForm() {
    DOM.p_name.value = '';
    DOM.p_price.value = '';
    DOM.p_stock.value = '';
    DOM.p_category.value = '';
    DOM.p_desc.value = '';
    DOM.p_image_file.value = '';
  }

  // --- GALLERY MANAGEMENT ---
  DOM.uploadGalleryBtn.addEventListener('click', async () => {
    const files = DOM.galleryFile.files;
    if (files.length === 0) {
      showMessage('Please select at least one image file', 'error');
      return;
    }

    try {
      DOM.uploadGalleryBtn.classList.add('loading');
      DOM.uploadGalleryBtn.textContent = 'Uploading...';

      let uploadedCount = 0;
      
      for (let i = 0; i < files.length; i++) {
        try {
          const imageUrl = await uploadFileToStorage(files[i], 'gallery');
          
          // Get highest order index
          const { data: maxOrder } = await supabase
            .from('gallery')
            .select('order_index')
            .order('order_index', { ascending: false })
            .limit(1)
            .single();

          const nextIndex = (maxOrder?.order_index || 0) + 1;
          
          const { error } = await supabase
            .from('gallery')
            .insert([{ 
              image_url: imageUrl, 
              order_index: nextIndex 
            }]);

          if (error) throw error;

          uploadedCount++;
        } catch (error) {
          console.error(`Error uploading file ${i + 1}:`, error);
        }
      }

      showMessage(`Successfully uploaded ${uploadedCount} of ${files.length} images`, 'success');
      DOM.galleryFile.value = '';
      loadGalleryList();
      
      if (window.cravePublic?.reload) {
        window.cravePublic.reload();
      }
    } catch (error) {
      console.error('Error uploading gallery images:', error);
      showMessage('Upload failed: ' + error.message, 'error');
    } finally {
      DOM.uploadGalleryBtn.classList.remove('loading');
      DOM.uploadGalleryBtn.textContent = 'Upload Selected Images';
    }
  });

  DOM.refreshGalleryBtn.addEventListener('click', loadGalleryList);

  async function loadGalleryList() {
    try {
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;

      renderGalleryList(data || []);
    } catch (error) {
      console.error('Error loading gallery:', error);
      showMessage('Failed to load gallery: ' + error.message, 'error');
    }
  }

  function renderGalleryList(galleryItems) {
    if (galleryItems.length === 0) {
      DOM.galleryList.innerHTML = `
        <h4>Gallery Images</h4>
        <div style="background: var(--paper); padding: 20px; border-radius: 8px; text-align: center; color: var(--muted);">
          No gallery images found. Upload some images above.
        </div>
      `;
      return;
    }

    DOM.galleryList.innerHTML = `
      <h4>Gallery Images (${galleryItems.length})</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
        ${galleryItems.map(item => `
          <div class="gallery-admin-item" style="position: relative;">
            <img src="${item.image_url}" alt="Gallery image" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px;">
            <div style="position: absolute; top: 8px; right: 8px;">
              <button class="btn-admin btn-admin-danger delete-gallery" data-id="${item.id}" style="padding: 4px 8px; font-size: 0.8rem;">
                Delete
              </button>
            </div>
            <div style="padding: 8px; font-size: 0.8rem; color: var(--muted);">
              Order: ${item.order_index}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Attach delete listeners
    DOM.galleryList.querySelectorAll('.delete-gallery').forEach(button => {
      button.addEventListener('click', async (e) => {
        const galleryId = e.target.dataset.id;
        if (!confirm('Are you sure you want to delete this gallery image?')) return;

        try {
          const { error } = await supabase
            .from('gallery')
            .delete()
            .eq('id', galleryId);

          if (error) throw error;

          showMessage('Gallery image deleted successfully!', 'success');
          loadGalleryList();
          
          if (window.cravePublic?.reload) {
            window.cravePublic.reload();
          }
        } catch (error) {
          console.error('Error deleting gallery image:', error);
          showMessage('Failed to delete gallery image: ' + error.message, 'error');
        }
      });
    });
  }

  // --- ANALYTICS ---
  DOM.refreshAnalyticsBtn.addEventListener('click', loadAnalytics);
  DOM.exportAnalyticsBtn.addEventListener('click', exportAnalytics);

  async function loadAnalytics() {
    try {
      DOM.refreshAnalyticsBtn.classList.add('loading');
      DOM.refreshAnalyticsBtn.textContent = 'Loading...';

      const { data, error } = await supabase
        .from('analytics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      renderAnalytics(data || []);
    } catch (error) {
      console.error('Error loading analytics:', error);
      showMessage('Failed to load analytics: ' + error.message, 'error');
    } finally {
      DOM.refreshAnalyticsBtn.classList.remove('loading');
      DOM.refreshAnalyticsBtn.textContent = 'Refresh Analytics';
    }
  }

  function renderAnalytics(analyticsData) {
    if (analyticsData.length === 0) {
      DOM.analyticsView.innerHTML = `
        <div style="background: var(--paper); padding: 20px; border-radius: 8px; text-align: center; color: var(--muted);">
          No analytics data found.
        </div>
      `;
      return;
    }

    // Group by event type for summary
    const eventSummary = analyticsData.reduce((acc, item) => {
      acc[item.event] = (acc[item.event] || 0) + 1;
      return acc;
    }, {});

    const summaryHTML = `
      <div style="background: var(--paper); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h4>Event Summary</h4>
        ${Object.entries(eventSummary).map(([event, count]) => `
          <div style="display: flex; justify-content: space-between; padding: 5px 0;">
            <span>${event}:</span>
            <strong>${count}</strong>
          </div>
        `).join('')}
      </div>
    `;

    const detailsHTML = `
      <div style="max-height: 400px; overflow-y: auto;">
        <pre style="background: var(--paper); padding: 15px; border-radius: 8px; font-size: 0.9rem; white-space: pre-wrap;">${JSON.stringify(analyticsData, null, 2)}</pre>
      </div>
    `;

    DOM.analyticsView.innerHTML = summaryHTML + detailsHTML;
  }

  async function exportAnalytics() {
    try {
      const { data, error } = await supabase
        .from('analytics')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const csv = convertToCSV(data || []);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showMessage('Analytics exported successfully!', 'success');
    } catch (error) {
      console.error('Error exporting analytics:', error);
      showMessage('Failed to export analytics: ' + error.message, 'error');
    }
  }

  function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const rows = data.map(row => 
      headers.map(header => 
        JSON.stringify(row[header] || '')
      ).join(',')
    );
    
    return [headers.join(','), ...rows].join('\n');
  }

  // --- MESSAGE DISPLAY ---
  function showMessage(message, type = 'info') {
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      z-index: 10000;
      max-width: 400px;
      box-shadow: var(--shadow-hover);
      animation: slideInRight 0.3s ease-out;
    `;

    // Set background color based on type
    const colors = {
      success: '#2ed573',
      error: '#ff4757',
      info: '#3498db'
    };
    messageEl.style.background = colors[type] || colors.info;

    messageEl.textContent = message;
    document.body.appendChild(messageEl);

    // Remove after 4 seconds
    setTimeout(() => {
      messageEl.remove();
    }, 4000);
  }

  // --- INITIALIZATION ---
  async function loadAllContent() {
    await loadContent();
    await loadProductsList();
    await loadGalleryList();
    await loadAnalytics();
  }

  // Export admin API
  window.craveAdmin = { 
    reload: loadAllContent,
    loadProducts: loadProductsList,
    loadGallery: loadGalleryList,
    loadAnalytics: loadAnalytics
  };
}