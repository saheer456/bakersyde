// admin.js
// Exports initAdmin({ supabase })
// Requires admin.html IDs to match. Defensive & robust.

export function initAdmin({ supabase }) {
  if (!supabase) {
    console.error('Supabase client not provided to initAdmin');
    return;
  }

  // DOM container (populated after DOM is ready)
  let DOM = {};

  function initDOM() {
    DOM = {
      // Auth
      adminEmail: document.getElementById('adminEmail'),
      signInBtn: document.getElementById('signInBtn'),
      signedIn: document.getElementById('signedIn'),
      signedOut: document.getElementById('signedOut'),
      adminUser: document.getElementById('adminUser'),
      signOutBtn: document.getElementById('signOutBtn'),

      // Content (hero & story)
      heroTitle: document.getElementById('heroTitle'),
      heroSubtitle: document.getElementById('heroSubtitle'),
      heroImageFile: document.getElementById('heroImageFile'),
      uploadHeroImageBtn: document.getElementById('uploadHeroImageBtn'),
      storyTextArea: document.getElementById('storyTextArea'),
      storyImageFile: document.getElementById('storyImageFile'),
      uploadStoryImageBtn: document.getElementById('uploadStoryImageBtn'),
      saveContentBtn: document.getElementById('saveContentBtn'),
      previewBtn: document.getElementById('previewBtn'),

      // Products
      p_name: document.getElementById('p_name'),
      p_price: document.getElementById('p_price'),
      p_stock: document.getElementById('p_stock'),
      p_category: document.getElementById('p_category'),
      p_desc: document.getElementById('p_desc'),
      p_image_file: document.getElementById('p_image_file'),
      createProductBtn: document.getElementById('createProductBtn'),
      refreshProductsBtn: document.getElementById('refreshProductsBtn'),
      productsList: document.getElementById('productsList'),

      // Gallery
      galleryFile: document.getElementById('galleryFile'),
      uploadGalleryBtn: document.getElementById('uploadGalleryBtn'),
      galleryList: document.getElementById('galleryList'),
      refreshGalleryBtn: document.getElementById('refreshGalleryBtn'),

      // Analytics
      analyticsView: document.getElementById('analyticsView'),
      refreshAnalyticsBtn: document.getElementById('refreshAnalyticsBtn'),
      exportAnalyticsBtn: document.getElementById('exportAnalyticsBtn')
    };
  }

  // -------------------------
  // Helpers
  // -------------------------
  function safeEl(el, name) {
    if (!el) console.warn(`Missing element: ${name}`);
    return !!el;
  }

  function toCSV(arr) {
    if (!arr || !arr.length) return '';
    const keys = Object.keys(arr[0]);
    const rows = [keys.join(',')];
    for (const r of arr) {
      rows.push(keys.map(k => {
        const v = r[k] === null || r[k] === undefined ? '' : r[k];
        // escape quotes
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(','));
    }
    return rows.join('\n');
  }

  // upload file to storage and return public URL
  async function uploadFileToStorage(file, folder = 'images') {
    if (!file) throw new Error('No file provided');
    // create unique path
    const timestamp = Date.now();
    const cleanName = file.name.replace(/\s+/g, '_');
    const path = `${folder}/${timestamp}_${cleanName}`;
    // upload
    const { data, error: uploadError } = await supabase.storage.from('images').upload(path, file);
    if (uploadError) {
      // if file exists, you may want to overwrite - but default behavior throws
      console.error('Upload error', uploadError);
      throw uploadError;
    }
    // get public url
    const { data: urlData } = supabase.storage.from('images').getPublicUrl(data.path);
    return urlData.publicUrl;
  }

  // -------------------------
  // Content: hero & story
  // -------------------------
  async function saveContent() {
    try {
      const hero = {
        section: 'hero',
        title: DOM.heroTitle?.value || null,
        subtitle: DOM.heroSubtitle?.value || null
      };
      const story = {
        section: 'story',
        text: DOM.storyTextArea?.value || null
      };

      // upsert hero and story
      await supabase.from('content').upsert([hero], { onConflict: 'section' });
      await supabase.from('content').upsert([story], { onConflict: 'section' });

      alert('Content saved');
      // Notify public page to reload if open
      window.bakersydePublic?.reload?.();
    } catch (err) {
      console.error('saveContent error', err);
      alert('Failed to save content: ' + (err.message || err));
    }
  }

  async function uploadHeroImage() {
    const f = DOM.heroImageFile?.files?.[0];
    if (!f) return alert('Choose hero image file');
    try {
      const url = await uploadFileToStorage(f, 'hero');
      await supabase.from('content').upsert([{ section: 'hero', image_url: url }], { onConflict: 'section' });
      alert('Hero image uploaded');
      window.bakersydePublic?.reload?.();
    } catch (err) {
      console.error('uploadHeroImage error', err);
      alert('Upload failed: ' + (err.message || err));
    }
  }

  async function uploadStoryImage() {
    const f = DOM.storyImageFile?.files?.[0];
    if (!f) return alert('Choose story image file');
    try {
      const url = await uploadFileToStorage(f, 'story');
      await supabase.from('content').upsert([{ section: 'story', image_url: url }], { onConflict: 'section' });
      alert('Story image uploaded');
      window.bakersydePublic?.reload?.();
    } catch (err) {
      console.error('uploadStoryImage error', err);
      alert('Upload failed: ' + (err.message || err));
    }
  }

  // -------------------------
  // Products CRUD
  // -------------------------
  // Track editing state
  let editingProductId = null;

  function clearProductForm() {
    if (!DOM.p_name) return;
    DOM.p_name.value = '';
    DOM.p_price.value = '';
    DOM.p_stock.value = '';
    DOM.p_category.value = '';
    DOM.p_desc.value = '';
    DOM.p_image_file.value = '';
    editingProductId = null;
    DOM.createProductBtn.textContent = 'Create Product';
  }

  async function createOrUpdateProduct() {
    try {
      const name = DOM.p_name?.value?.trim();
      const price = Number(DOM.p_price?.value || 0);
      const stock = Number(DOM.p_stock?.value || 0);
      const category = DOM.p_category?.value?.trim() || null;
      const description = DOM.p_desc?.value?.trim() || null;
      const file = DOM.p_image_file?.files?.[0];

      if (!name) return alert('Product name required');
      if (isNaN(price)) return alert('Price must be a number');

      let image_url = null;
      if (file) {
        image_url = await uploadFileToStorage(file, 'products');
      }

      if (editingProductId) {
        // update
        const updateFields = { name, price, stock, category, description };
        if (image_url) updateFields.image_url = image_url;
        const { error } = await supabase.from('products').update(updateFields).eq('id', editingProductId);
        if (error) throw error;
        alert('Product updated');
      } else {
        // insert
        const record = { name, price, stock, category, description };
        if (image_url) record.image_url = image_url;
        const { error } = await supabase.from('products').insert([record]);
        if (error) throw error;
        alert('Product created');
      }

      clearProductForm();
      await loadProductsList();
      window.bakersydePublic?.reload?.();
    } catch (err) {
      console.error('createOrUpdateProduct error', err);
      alert('Failed to create/update product: ' + (err.message || err));
    }
  }

  async function loadProductsList() {
    try {
      DOM.productsList.innerHTML = '<p>Loading products…</p>';
      const { data, error } = await supabase.from('products').select('*').order('id', { ascending: true });
      if (error) throw error;
      DOM.productsList.innerHTML = '';
      (data || []).forEach(p => {
        const div = document.createElement('div');
        div.className = 'list-row';
        div.innerHTML = `
          <div style="flex:1">
            <strong>${escapeHtml(p.name)}</strong>
            <div class="small">₹${p.price} • ${escapeHtml(p.category||'')} • stock: ${p.stock}</div>
          </div>
          <div>
            <button data-id="${p.id}" class="edit btn btn-secondary">Edit</button>
            <button data-id="${p.id}" class="delete btn" style="background:#ff6b6b;color:white">Delete</button>
          </div>
        `;
        DOM.productsList.appendChild(div);
      });

      // attach handlers
      DOM.productsList.querySelectorAll('.delete').forEach(b => b.addEventListener('click', async (e) => {
        const id = Number(e.currentTarget.dataset.id);
        if (!confirm('Delete product?')) return;
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) { console.error(error); alert('Delete failed: ' + error.message); return; }
        await loadProductsList();
        window.bakersydePublic?.reload?.();
      }));

      DOM.productsList.querySelectorAll('.edit').forEach(b => b.addEventListener('click', async (e) => {
        const id = Number(e.currentTarget.dataset.id);
        const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
        if (error) { console.error(error); alert('Load for edit failed: ' + error.message); return; }
        // populate form
        editingProductId = id;
        DOM.p_name.value = data.name;
        DOM.p_price.value = data.price;
        DOM.p_stock.value = data.stock;
        DOM.p_category.value = data.category || '';
        DOM.p_desc.value = data.description || '';
        DOM.createProductBtn.textContent = 'Update Product';
        // scroll into view
        DOM.p_name.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }));
    } catch (err) {
      console.error('loadProductsList error', err);
      DOM.productsList.innerHTML = '<p>Failed to load products</p>';
    }
  }

  // -------------------------
  // Gallery
  // -------------------------
  async function uploadGalleryFiles() {
    try {
      const files = DOM.galleryFile?.files;
      if (!files || !files.length) return alert('Choose gallery files first');
      DOM.uploadGalleryBtn.disabled = true;
      for (const f of Array.from(files)) {
        const url = await uploadFileToStorage(f, 'gallery');
        // set order_index to max+1
        const { data: maxdata, error: maxerr } = await supabase.from('gallery').select('order_index').order('order_index', { ascending: false }).limit(1).single();
        const nextIndex = (maxdata?.order_index || 0) + 1;
        const { error: insertErr } = await supabase.from('gallery').insert([{ image_url: url, order_index: nextIndex }]);
        if (insertErr) throw insertErr;
      }
      alert('Gallery upload complete');
      await loadGalleryList();
      window.bakersydePublic?.reload?.();
    } catch (err) {
      console.error('uploadGalleryFiles error', err);
      alert('Gallery upload failed: ' + (err.message || err));
    } finally {
      DOM.uploadGalleryBtn.disabled = false;
      DOM.galleryFile.value = '';
    }
  }

  async function loadGalleryList() {
    try {
      const { data, error } = await supabase.from('gallery').select('*').order('order_index', { ascending: true });
      if (error) throw error;
      DOM.galleryList.innerHTML = '';
      (data || []).forEach(g => {
        const div = document.createElement('div');
        div.className = 'list-row';
        div.innerHTML = `<img src="${g.image_url}" style="width:80px;height:60px;object-fit:cover;border-radius:6px;margin-right:8px"><div style="flex:1">#${g.id}</div><div><button data-id="${g.id}" class="delg btn" style="background:#ff6b6b;color:white">Delete</button></div>`;
        DOM.galleryList.appendChild(div);
      });
      DOM.galleryList.querySelectorAll('.delg').forEach(b => b.addEventListener('click', async (e) => {
        const id = Number(e.currentTarget.dataset.id);
        if (!confirm('Delete image?')) return;
        const { error } = await supabase.from('gallery').delete().eq('id', id);
        if (error) { console.error(error); alert('Delete failed: ' + error.message); return; }
        await loadGalleryList();
        window.bakersydePublic?.reload?.();
      }));
    } catch (err) {
      console.error('loadGalleryList error', err);
      DOM.galleryList.innerHTML = '<p>Failed to load gallery</p>';
    }
  }

  // -------------------------
  // Analytics
  // -------------------------
  async function refreshAnalytics() {
    try {
      DOM.analyticsView.innerHTML = '<p>Loading analytics...</p>';
      const { data, error } = await supabase.from('analytics').select('*').order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      DOM.analyticsView.innerHTML = '<pre style="max-height:300px;overflow:auto;background:#fafafa;padding:8px;border-radius:6px">' + JSON.stringify(data, null, 2) + '</pre>';
      // store for export
      DOM._analyticsCache = data || [];
    } catch (err) {
      console.error('refreshAnalytics error', err);
      DOM.analyticsView.innerHTML = '<p>Failed to load analytics</p>';
    }
  }

  function exportAnalyticsCSV() {
    const arr = DOM._analyticsCache || [];
    if (!arr.length) return alert('No analytics to export');
    const csv = toCSV(arr.map(a => {
      // flatten payload for convenience
      return { id: a.id, event: a.event, payload: JSON.stringify(a.payload || {}), created_at: a.created_at };
    }));
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'analytics.csv';
    a.click();
  }

  // -------------------------
  // Utilities
  // -------------------------
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, function (m) {
      return ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[m];
    });
  }

  // -------------------------
  // Init everything & attach event listeners safely
  // -------------------------
  async function attachEventListeners() {
    // Auth buttons
    if (DOM.signInBtn && DOM.adminEmail) {
      DOM.signInBtn.addEventListener('click', async () => {
        const email = DOM.adminEmail.value.trim();
        if (!email) return alert('Enter admin email');
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) return alert('Sign-in error: ' + error.message);
        alert('Magic link sent to ' + email + '. Open it to sign in.');
      });
    }

    if (DOM.signOutBtn) {
      DOM.signOutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        alert('Signed out');
        location.reload();
      });
    }

    // content
    if (DOM.saveContentBtn) DOM.saveContentBtn.addEventListener('click', saveContent);
    if (DOM.uploadHeroImageBtn) DOM.uploadHeroImageBtn.addEventListener('click', uploadHeroImage);
    if (DOM.uploadStoryImageBtn) DOM.uploadStoryImageBtn.addEventListener('click', uploadStoryImage);
    if (DOM.previewBtn) DOM.previewBtn.addEventListener('click', () => window.open('/', '_blank'));

    // products
    if (DOM.createProductBtn) DOM.createProductBtn.addEventListener('click', createOrUpdateProduct);
    if (DOM.refreshProductsBtn) DOM.refreshProductsBtn.addEventListener('click', loadProductsList);

    // gallery
    if (DOM.uploadGalleryBtn) DOM.uploadGalleryBtn.addEventListener('click', uploadGalleryFiles);
    if (DOM.refreshGalleryBtn) DOM.refreshGalleryBtn.addEventListener('click', loadGalleryList);

    // analytics
    if (DOM.refreshAnalyticsBtn) DOM.refreshAnalyticsBtn.addEventListener('click', refreshAnalytics);
    if (DOM.exportAnalyticsBtn) DOM.exportAnalyticsBtn.addEventListener('click', exportAnalyticsCSV);

    // auth change listener
    supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user;
      if (user) {
        DOM.signedIn.style.display = 'block';
        DOM.signedOut.style.display = 'none';
        DOM.adminUser.textContent = user.email;
        // load admin data
        loadProductsList();
        loadGalleryList();
        refreshAnalytics();
      } else {
        DOM.signedIn.style.display = 'none';
        DOM.signedOut.style.display = 'block';
        DOM.adminUser.textContent = '';
      }
    });
  }

  // -------------------------
  // Entry
  // -------------------------
  async function init() {
    initDOM();
    console.log('Admin init: DOM initialized');
    await attachEventListeners();

    // try to restore session and load data if authenticated
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        DOM.signedIn.style.display = 'block';
        DOM.signedOut.style.display = 'none';
        DOM.adminUser.textContent = session.user.email;
        await loadProductsList();
        await loadGalleryList();
        await refreshAnalytics();
      } else {
        DOM.signedIn.style.display = 'none';
        DOM.signedOut.style.display = 'block';
      }
    } catch (err) {
      console.warn('Could not get session', err);
    }
  }

  // Run init on DOMContentLoaded to be absolutely safe
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    // DOM already ready
    init();
  }

  // Expose small API for debugging
  window.bakersydeAdmin = {
    reload: async () => {
      await loadProductsList();
      await loadGalleryList();
      await refreshAnalytics();
    }
  };
}
