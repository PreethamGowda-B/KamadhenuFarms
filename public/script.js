/* Instant Preloader Removal and body scroll unlock to guarantee immediate scrolling */
(function removePreloaderFast() {
  if (typeof document !== 'undefined') {
    document.body.classList.remove('overflow-hidden');
    document.body.style.overflow = 'auto';
  }
  const p = document.getElementById('preloader') || document.querySelector('.preloader');
  if (p) {
    p.style.display = 'none';
    p.style.opacity = '0';
    p.style.visibility = 'hidden';
    p.style.pointerEvents = 'none';
    if (p.parentNode) p.parentNode.removeChild(p);
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  // Global App State
  let cart = JSON.parse(localStorage.getItem('kamadhenu_cart')) || [];
  let wishlist = JSON.parse(localStorage.getItem('kamadhenu_wishlist')) || [];
  let currentCoupon = null;
  const deliveryCharges = 0; // Free delivery for luxury brand
  
  // Brand Configuration
  const PRIMARY_WHATSAPP = '919980114675';
  
  // Product Config Database (Price by size)
  const productDatabase = {
    'p1': {
      id: 'p1',
      name: 'Pure Raw Honey',
      category: 'raw',
      baseDesc: 'Unprocessed, raw honey collected directly from pristine organic bee boxes.',
      prices: {
        '250g': 250,
        '500g': 399,
        '1kg': 749
      },
      image: 'assets/raw_honey.jpg',
      images: [
        'assets/raw_honey.jpg',
        'assets/raw_honey_banner.jpg',
        'assets/raw_honey_pour.jpg',
        'assets/raw_honey_details.jpg',
        'assets/raw_honey_overhead.jpg'
      ],
      meeshoLink: 'https://www.meesho.com/s/p/fhkgl3',
      placeholderIcon: `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" />
        </svg>
      `
    },
    'p2': {
      id: 'p2',
      name: 'Dry Fruits Honey',
      category: 'infused',
      baseDesc: 'Premium raw honey rich in hand-sorted almonds, cashews, pistachios, and walnuts.',
      prices: {
        '250g': 399,
        '500g': 599,
        '1kg': 999
      },
      image: 'assets/dry_fruits_honey.jpg',
      images: [
        'assets/dry_fruits_honey.jpg',
        'assets/dry_fruits_honey_back.jpg',
        'assets/dry_fruits_honey_landscape.jpg',
        'assets/dry_fruits_honey_details.jpg'
      ],
      meeshoLink: 'https://www.meesho.com/s/p/fr48vn',
      placeholderIcon: `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
        </svg>
      `
    }
  };

  // Coupons Database
  const validCoupons = {
    'KAMADHENU10': { type: 'percent', value: 10 },
    'HONEY50': { type: 'fixed', value: 50 },
    'FREEPURE': { type: 'percent', value: 15 },
    'PREETHUGOWDA01': { type: 'percent', value: 10 }
  };

  // Simulated Tracker Database
  const trackingDatabase = {
    'KM-1029': {
      status: 'out-for-delivery',
      name: 'Nikhil R.',
      date: 'May 29, 2026',
      steps: ['received', 'packed', 'shipped', 'out-for-delivery']
    },
    'KM-4829': {
      status: 'packed',
      name: 'Shreeya S.',
      date: 'May 28, 2026',
      steps: ['received', 'packed']
    },
    'KM-7301': {
      status: 'shipped',
      name: 'Aditya K.',
      date: 'May 29, 2026',
      steps: ['received', 'packed', 'shipped']
    }
  };

  /* ==========================================================================
     DOM Selection Elements
     ========================================================================== */
  const header = document.querySelector('header');
  const hamburger = document.querySelector('.hamburger');
  const mobileNav = document.querySelector('.mobile-nav');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav ul li a');
  
  // Overlays / Modals
  const cartOverlay = document.getElementById('cartOverlay');
  const cartDrawer = document.getElementById('cartDrawer');
  const checkoutModalOverlay = document.getElementById('checkoutModalOverlay');
  const trackerModalOverlay = document.getElementById('trackerModalOverlay');
  
  // Triggers
  const openCartBtns = document.querySelectorAll('.open-cart-btn');
  const closeCartBtn = document.getElementById('closeCartBtn');
  const openTrackerBtns = document.querySelectorAll('.open-tracker-btn');
  const closeTrackerBtn = document.getElementById('closeTrackerBtn');
  const closeCheckoutBtn = document.getElementById('closeCheckoutBtn');
  
  // Counters
  const cartBadgeCounts = document.querySelectorAll('.cart-count');
  const wishlistBadgeCounts = document.querySelectorAll('.wishlist-count');
  
  // Cart Content
  const cartItemsContainer = document.getElementById('cartItems');
  const cartSubtotalEl = document.getElementById('cartSubtotal');
  const cartDiscountRow = document.getElementById('cartDiscountRow');
  const cartDiscountEl = document.getElementById('cartDiscount');
  const cartTotalEl = document.getElementById('cartTotal');
  const couponInput = document.getElementById('couponInput');
  const applyCouponBtn = document.getElementById('applyCouponBtn');
  const couponFeedback = document.getElementById('couponFeedback');
  const checkoutBtn = document.getElementById('checkoutBtn');

  // Checkout Data Elements
  const checkoutSummaryItems = document.getElementById('checkoutSummaryItems');
  const checkoutSubtotalEl = document.getElementById('checkoutSubtotal');
  const checkoutDiscountRow = document.getElementById('checkoutDiscountRow');
  const checkoutDiscountEl = document.getElementById('checkoutDiscount');
  const checkoutTotalEl = document.getElementById('checkoutTotal');
  const checkoutForm = document.getElementById('checkoutForm');
  const checkoutSubmitBtn = document.getElementById('checkoutSubmitBtn');
  
  // Product Grid Controls
  const productGrid = document.getElementById('productGrid');
  const productSearch = document.getElementById('productSearch');
  const filterTabs = document.querySelectorAll('.filter-tab');

  // FAQ Accordion Items
  const faqItems = document.querySelectorAll('.faq-item');

  // Gallery Elements
  const galleryTabs = document.querySelectorAll('.gallery-tab');
  const galleryItems = document.querySelectorAll('.gallery-item');

  // Testimonials Carousel Elements
  const carouselTrack = document.querySelector('.carousel-track');
  const carouselDotsContainer = document.querySelector('.carousel-dots');
  let testimonialCards = document.querySelectorAll('.testimonial-card');
  let testimonialIndex = 0;
  let carouselInterval = null;

  /* ==========================================================================
     Navbar & Menu Logic
     ========================================================================== */
  // Sticky Navbar Blur Swap
  let isNavScrolling = false;
  window.addEventListener('scroll', () => {
    if (!isNavScrolling) {
      window.requestAnimationFrame(() => {
        if (window.scrollY > 50) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
        isNavScrolling = false;
      });
      isNavScrolling = true;
    }
  }, { passive: true });

  // Mobile Hamburger toggling (Global & Delegated)
  window.toggleMobileNav = function(e) {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    const hamburgerEl = document.querySelector('.hamburger, #navHamburger');
    const mobileNavEl = document.querySelector('.mobile-nav, #mobileNavMenu');
    if (mobileNavEl) {
      const isOpen = mobileNavEl.classList.contains('active');
      if (!isOpen) {
        if (hamburgerEl) hamburgerEl.classList.add('open');
        mobileNavEl.classList.add('active');
        document.body.classList.add('overflow-hidden');
      } else {
        if (hamburgerEl) hamburgerEl.classList.remove('open');
        mobileNavEl.classList.remove('active');
        document.body.classList.remove('overflow-hidden');
      }
    }
  };

  // Mobile Link Navigation & Smooth Scroll Handler
  window.handleMobileNavLink = function(e, target) {
    // Close mobile nav
    const mobileNavEl = document.querySelector('.mobile-nav, #mobileNavMenu');
    const allHamburgers = document.querySelectorAll('.hamburger, #navHamburger');
    if (mobileNavEl) {
      mobileNavEl.classList.remove('active');
      document.body.classList.remove('overflow-hidden');
    }
    if (allHamburgers) {
      allHamburgers.forEach(h => h.classList.remove('open'));
    }

    if (target === 'tracker') {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      const openTrackerBtn = document.querySelector('.open-tracker-btn:not(.mobile-nav-item)');
      if (openTrackerBtn) {
        openTrackerBtn.click();
      } else {
        const trackerModal = document.querySelector('#trackerModal, .tracker-modal');
        if (trackerModal) trackerModal.classList.add('active');
      }
      return;
    }

    if (target && target.startsWith('#')) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      const targetEl = document.querySelector(target);
      if (targetEl) {
        setTimeout(() => {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      } else {
        window.location.hash = target;
      }
      return;
    }

    if (target && !target.startsWith('#')) {
      window.location.href = target;
    }
  };

  // Universal delegated click listener for hamburger and mobile nav
  document.addEventListener('click', (e) => {
    const hamburgerBtn = e.target.closest('.hamburger, #navHamburger');
    if (hamburgerBtn) {
      window.toggleMobileNav(e);
      return;
    }

    const mobileLink = e.target.closest('.mobile-nav a, #mobileNavMenu a, .mobile-nav-close');
    if (mobileLink && !mobileLink.getAttribute('onclick')) {
      const href = mobileLink.getAttribute('href');
      if (href) {
        window.handleMobileNavLink(e, href);
      }
    }
  });

  // Touchstart listener strictly for hamburger button to guarantee instant mobile open
  document.addEventListener('touchstart', (e) => {
    const hamburgerBtn = e.target.closest('.hamburger, #navHamburger');
    if (hamburgerBtn) {
      window.toggleMobileNav(e);
    }
  }, { passive: false });

  /* ==========================================================================
     E-Commerce State Synchronization
     ========================================================================== */
  const updateBadges = () => {
    // Accurately calculate total quantity from state
    const totalQty = (cart || []).reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
    
    // Update all cart count badges in header and drawer title
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = totalQty;
    });

    // Update Wishlist counters
    const totalWish = (wishlist || []).length;
    wishlistBadgeCounts.forEach(el => el.textContent = totalWish);

    // Sync active states in product cards
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
      const pId = btn.dataset.productId;
      if (wishlist.includes(pId)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  };

  const saveCart = () => {
    localStorage.setItem('kamadhenu_cart', JSON.stringify(cart));
    updateBadges();
    renderCart();
  };

  const saveWishlist = () => {
    localStorage.setItem('kamadhenu_wishlist', JSON.stringify(wishlist));
    updateBadges();
  };

  /* ==========================================================================
     Shopping Cart Operations & Rendering
     ========================================================================== */
  const renderCart = () => {
    if (!cartItemsContainer) return;
    cartItemsContainer.innerHTML = '';

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `
        <div class="cart-empty-message">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          <p>Your luxury cart is empty.</p>
          <button class="btn btn-gold close-cart-drawer-trigger" style="padding: 10px 20px; font-size: 0.85rem;">Continue Shopping</button>
        </div>
      `;
      // Hook the CTA button
      cartItemsContainer.querySelector('.close-cart-drawer-trigger')?.addEventListener('click', closeCart);
      
      // Update totals
      cartSubtotalEl.textContent = '₹0';
      cartDiscountRow.style.display = 'none';
      cartTotalEl.textContent = '₹0';
      checkoutBtn.setAttribute('disabled', 'true');
      return;
    }

    checkoutBtn.removeAttribute('disabled');

    // Populate items
    cart.forEach((item, index) => {
      const itemRow = document.createElement('div');
      itemRow.className = 'cart-item';
      itemRow.innerHTML = `
        <div class="cart-item-img">
          <img src="${item.img}" alt="${item.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="media-placeholder" style="display:none; padding:5px;">
            <svg style="width:24px; height:24px; margin-bottom:4px;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3" />
            </svg>
            <span style="font-size:0.6rem;">Kamadhenu</span>
          </div>
        </div>
        <div class="cart-item-details">
          <div>
            <h4 class="cart-item-title">${item.name}</h4>
            <p class="cart-item-meta">Size: ${item.size}</p>
          </div>
          <div class="cart-item-bottom">
            <span class="cart-item-price">₹${item.price * item.qty}</span>
            <div class="cart-item-qty">
              <button class="qty-btn dec-qty-cart" data-index="${index}">-</button>
              <input type="text" class="qty-input" value="${item.qty}" readonly>
              <button class="qty-btn inc-qty-cart" data-index="${index}">+</button>
            </div>
          </div>
        </div>
        <button class="cart-item-remove remove-cart-item" data-index="${index}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      `;
      cartItemsContainer.appendChild(itemRow);
    });

    // Subtotal math
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    cartSubtotalEl.textContent = `₹${subtotal}`;

    // Coupon Calculations
    let discount = 0;
    if (currentCoupon) {
      const codeData = validCoupons[currentCoupon];
      if (codeData.type === 'percent') {
        discount = Math.round(subtotal * (codeData.value / 100));
      } else if (codeData.type === 'fixed') {
        discount = codeData.value;
      }
      cartDiscountRow.style.display = 'flex';
      cartDiscountEl.textContent = `-₹${discount}`;
    } else {
      cartDiscountRow.style.display = 'none';
    }

    const finalTotal = Math.max(0, subtotal - discount + deliveryCharges);
    cartTotalEl.textContent = `₹${finalTotal}`;

    // Wire up events
    document.querySelectorAll('.dec-qty-cart').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index);
        if (cart[idx].qty > 1) {
          cart[idx].qty--;
          saveCart();
        } else {
          // Remove if drops to zero
          cart.splice(idx, 1);
          saveCart();
        }
      });
    });

    document.querySelectorAll('.inc-qty-cart').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index);
        cart[idx].qty++;
        saveCart();
      });
    });

    document.querySelectorAll('.remove-cart-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.target.closest('.remove-cart-item');
        const idx = parseInt(button.dataset.index);
        cart.splice(idx, 1);
        saveCart();
      });
    });
  };

  // Coupon Engine Toggling
  if (applyCouponBtn) {
    applyCouponBtn.addEventListener('click', () => {
      const code = couponInput.value.trim().toUpperCase();
      couponFeedback.className = 'coupon-feedback';
      
      if (!code) {
        couponFeedback.textContent = 'Please enter a coupon code.';
        couponFeedback.classList.add('error');
        return;
      }

      if (validCoupons[code]) {
        currentCoupon = code;
        couponFeedback.textContent = `Coupon "${code}" applied successfully! You got ${validCoupons[code].value}${validCoupons[code].type === 'percent' ? '% off' : ' Rs off'}.`;
        couponFeedback.classList.add('success');
        renderCart();
      } else {
        couponFeedback.textContent = 'Invalid coupon code. Try "KAMADHENU10".';
        couponFeedback.classList.add('error');
      }
    });
  }

  // Add Item to local cart helper
  const addItemToCart = (productId, size, qty = 1, openDrawer = false) => {
    const dbProduct = productDatabase[productId];
    if (!dbProduct) return;

    const unitPrice = dbProduct.prices[size];
    
    // Check if this specific item + size is already in cart
    const existingIndex = cart.findIndex(item => item.id === productId && item.size === size);

    if (existingIndex > -1) {
      cart[existingIndex].qty += qty;
    } else {
      cart.push({
        id: productId,
        name: dbProduct.name,
        size: size,
        price: unitPrice,
        qty: qty,
        img: dbProduct.image
      });
    }

    saveCart();
    
    if (openDrawer) {
      openCart();
    }
  };

  /* ==========================================================================
     Cart Drawer Overlay UI Controls
     ========================================================================== */
  function openCart() {
    cartOverlay.classList.add('active');
    cartDrawer.classList.add('active');
    document.body.classList.add('overflow-hidden');
  }

  function closeCart() {
    cartOverlay.classList.remove('active');
    cartDrawer.classList.remove('active');
    // Only remove overflow-hidden if mobile-nav isn't active
    if (!mobileNav.classList.contains('active')) {
      document.body.classList.remove('overflow-hidden');
    }
  }

  openCartBtns.forEach(btn => btn.addEventListener('click', openCart));
  if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

  /* ==========================================================================
     Product Display Generation & Search-Filters
     ========================================================================== */
  const renderProductCards = () => {
    if (!productGrid) return;
    productGrid.innerHTML = '';

    const searchQuery = productSearch ? productSearch.value.toLowerCase() : '';
    const activeTab = document.querySelector('.filter-tab.active');
    const activeCategory = activeTab ? activeTab.dataset.filter : 'all';

    // Loop through our product configs
    Object.values(productDatabase).forEach(product => {
      // Filter out search matches
      const matchesSearch = product.name.toLowerCase().includes(searchQuery) || product.baseDesc.toLowerCase().includes(searchQuery);
      // Filter out category tabs
      const matchesCategory = activeCategory === 'all' || product.category === activeCategory;

      if (!matchesSearch || !matchesCategory) return;

      const productCard = document.createElement('div');
      productCard.className = 'product-card reveal reveal-fade-up';
      productCard.dataset.productId = product.id;

      // Default active size for card is 500g (or the first available size)
      const defaultSize = '500g';
      const sizePrice = product.prices[defaultSize];

      const hasGallery = product.images && product.images.length > 0;
      const galleryHtml = hasGallery ? `
        <div class="card-thumb-nav">
          ${product.images.map((img, idx) => `
            <button class="thumb-nav-btn ${idx === 0 ? 'active' : ''}" data-img-src="${img}" data-index="${idx}">
              <img src="${img}" alt="thumbnail ${idx}">
            </button>
          `).join('')}
        </div>
      ` : '';

      productCard.innerHTML = `
        <div class="product-badge">${product.category === 'raw' ? 'Organic' : 'Deluxe'}</div>
        <button class="wishlist-btn" data-product-id="${product.id}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>
        <div class="product-media">
          <img src="${product.image}" alt="${product.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="media-placeholder" style="display:none;">
            ${product.placeholderIcon}
            <span>${product.name}</span>
          </div>
          ${galleryHtml}
        </div>
        <div class="product-info">
          <h3>${product.name}</h3>
          <p class="product-desc">${product.baseDesc}</p>
          
          <div class="weight-selector">
            ${Object.keys(product.prices).map(size => `
              <button class="weight-pill ${size === defaultSize ? 'active' : ''}" data-size="${size}">${size}</button>
            `).join('')}
          </div>

          <div class="price-qty-row">
            <div class="price-display">
              <span>Price</span>
              <h4 class="card-price-text">₹${sizePrice}</h4>
            </div>
          </div>
          <div class="product-actions">
            <button class="btn btn-add-cart add-to-cart-trigger">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              Add to Cart
            </button>
            <div class="product-actions-row">
              <button class="btn btn-gold wa-order-single-trigger">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.244 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.501-5.734-1.453L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.623-1.023-5.09-2.885-6.956C16.63 2.029 14.162.999 11.536.999c-5.438 0-9.863 4.372-9.867 9.802-.001 1.767.487 3.491 1.415 5.011L2.091 22.09l6.556-1.714z" />
                </svg>
                WhatsApp
              </button>
              <a href="${product.meeshoLink}" target="_blank" class="btn btn-charcoal meesho-buy-trigger">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M17 18a2 2 0 110-4 2 2 0 010 4zM7 18a2 2 0 110-4 2 2 0 010 4zM18.3 15.3l1.5-7.5H6.2l-.4-2H2v2h2.2l2.6 11.5c-.7.6-1.1 1.5-1.1 2.5a3 3 0 003 3h12v-2H8.7c-.5 0-.9-.4-.9-.9l-.1-.6h10.6z"/>
                </svg>
                Meesho
              </a>
            </div>
          </div>
        </div>
      `;

      productGrid.appendChild(productCard);

      // Wire up card thumbnail gallery clicks and auto-play
      if (hasGallery) {
        const thumbBtns = productCard.querySelectorAll('.thumb-nav-btn');
        const mainImg = productCard.querySelector('.product-media img');
        
        const switchImage = (index) => {
          thumbBtns.forEach(b => b.classList.remove('active'));
          const btn = thumbBtns[index];
          if (btn) {
            btn.classList.add('active');
            mainImg.src = btn.dataset.imgSrc;
          }
        };

        thumbBtns.forEach((btn, idx) => {
          btn.addEventListener('click', (e) => {
            if (e) e.stopPropagation(); // prevent card overlay triggers
            switchImage(idx);
          });
        });

        // Auto switch images on desktop only
        if (thumbBtns.length > 1 && window.innerWidth > 768) {
          let currentIndex = 0;
          setInterval(() => {
            currentIndex = (currentIndex + 1) % thumbBtns.length;
            switchImage(currentIndex);
          }, 6000);
        }
      }

      // Setup micro-animations and logic triggers for this card
      const weightPills = productCard.querySelectorAll('.weight-pill');
      const priceText = productCard.querySelector('.card-price-text');
      const waOrder = productCard.querySelector('.wa-order-single-trigger');
      const addToCartBtn = productCard.querySelector('.add-to-cart-trigger');
      const wishlistBtn = productCard.querySelector('.wishlist-btn');

      let selectedSize = defaultSize;

      // Sizing tab clicks
      weightPills.forEach(pill => {
        pill.addEventListener('click', () => {
          weightPills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          selectedSize = pill.dataset.size;
          priceText.textContent = `₹${product.prices[selectedSize]}`;
        });
      });

      // Add to Cart button
      if (addToCartBtn) {
        addToCartBtn.addEventListener('click', (e) => {
          const originalContent = addToCartBtn.innerHTML;
          addToCartBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:4px;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg> Added!
          `;
          addToCartBtn.classList.add('btn-added-state');
          
          const isFirstItem = cart.length === 0;
          
          // 1. Add item to cart immediately & save state
          addItemToCart(product.id, selectedSize, 1, false);
          
          // 2. Trigger silky smooth GPU-accelerated celebration
          if (window.CartCelebration) {
            window.CartCelebration.trigger(addToCartBtn, product, e, isFirstItem);
          }
          
          setTimeout(() => {
            addToCartBtn.innerHTML = originalContent;
            addToCartBtn.classList.remove('btn-added-state');
          }, 1200);
        });
      }

      // WhatsApp single product quick order
      if (waOrder) {
        waOrder.addEventListener('click', () => {
          const qty = 1;
          const price = product.prices[selectedSize];
          const total = price * qty;
          
          const invoiceText = `🌾 *KAMADHENU HONEY FARMS* 🌾\n` +
            `-------------------------------\n` +
            `*QUICK WHATSAPP ORDER*\n` +
            `-------------------------------\n` +
            `• *Item:* ${product.name}\n` +
            `• *Size:* ${selectedSize}\n` +
            `• *Quantity:* ${qty}\n` +
            `• *Unit Price:* ₹${price}\n` +
            `-------------------------------\n` +
            `💰 *Total Price:* ₹${total}\n` +
            `-------------------------------\n` +
            `Hi Kamadhenu Honey Farms, I would like to order this item. Please share bank/UPI details or confirm Cash On Delivery.`;
          
          const waUrl = `https://wa.me/${PRIMARY_WHATSAPP}?text=${encodeURIComponent(invoiceText)}`;
          window.open(waUrl, '_blank');
        });
      }

      // Wishlist toggle click
      if (wishlistBtn) {
        wishlistBtn.addEventListener('click', () => {
          if (wishlist.includes(product.id)) {
            wishlist = wishlist.filter(id => id !== product.id);
            wishlistBtn.classList.remove('active');
          } else {
            wishlist.push(product.id);
            wishlistBtn.classList.add('active');
          }
          saveWishlist();
        });
      }
    });

    // Fire reveal checks
    triggerScrollReveal();
  };

  // Bind Search events
  if (productSearch) {
    productSearch.addEventListener('input', renderProductCards);
  }

  // Bind Filter tabs events
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderProductCards();
    });
  });

  /* ==========================================================================
     Checkout Modal UI & WhatsApp Invoice Compilation
     ========================================================================== */
  const openCheckout = () => {
    closeCart(); // Close drawer
    checkoutModalOverlay.classList.add('active');
    document.body.classList.add('overflow-hidden');
    renderCheckoutSummary();
  };

  const closeCheckout = () => {
    checkoutModalOverlay.classList.remove('active');
    if (!mobileNav.classList.contains('active')) {
      document.body.classList.remove('overflow-hidden');
    }
  };

  if (checkoutBtn) checkoutBtn.addEventListener('click', openCheckout);
  if (closeCheckoutBtn) closeCheckoutBtn.addEventListener('click', closeCheckout);

  // Render items inside the checkout modal sidebar
  const renderCheckoutSummary = () => {
    if (!checkoutSummaryItems) return;
    checkoutSummaryItems.innerHTML = '';

    if (cart.length === 0) {
      checkoutSummaryItems.innerHTML = '<p style="text-align:center; color:#888;">No items in cart.</p>';
      checkoutSubtotalEl.textContent = '₹0';
      checkoutDiscountRow.style.display = 'none';
      checkoutTotalEl.textContent = '₹0';
      return;
    }

    cart.forEach(item => {
      const summaryRow = document.createElement('div');
      summaryRow.className = 'checkout-summary-item';
      summaryRow.innerHTML = `
        <span class="item-name">${item.name}</span>
        <span class="item-qty-size">${item.qty} × ${item.size}</span>
        <span class="item-price">₹${item.price * item.qty}</span>
      `;
      checkoutSummaryItems.appendChild(summaryRow);
    });

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    checkoutSubtotalEl.textContent = `₹${subtotal}`;

    let discount = 0;
    if (currentCoupon) {
      const codeData = validCoupons[currentCoupon];
      if (codeData.type === 'percent') {
        discount = Math.round(subtotal * (codeData.value / 100));
      } else if (codeData.type === 'fixed') {
        discount = codeData.value;
      }
      checkoutDiscountRow.style.display = 'flex';
      checkoutDiscountEl.textContent = `-₹${discount}`;
    } else {
      checkoutDiscountRow.style.display = 'none';
    }

    const finalTotal = Math.max(0, subtotal - discount + deliveryCharges);
    checkoutTotalEl.textContent = `₹${finalTotal}`;
  };

  // Wire Cash On Delivery Toggles
  const paymentCards = document.querySelectorAll('.payment-option-card');
  paymentCards.forEach(card => {
    card.addEventListener('click', () => {
      paymentCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
  });

  // Handle Checkout submission and WhatsApp redirection
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Gather checkout data
      const name = document.getElementById('chkName').value.trim();
      const phone = document.getElementById('chkPhone').value.trim();
      const address = document.getElementById('chkAddress').value.trim();
      const landmark = document.getElementById('chkLandmark').value.trim();
      const activePaymentCard = document.querySelector('.payment-option-card.active');
      const paymentMethod = activePaymentCard ? activePaymentCard.dataset.method : 'cod';

      if (!name || !phone || !address) {
        alert('Please fill in all the required checkout details.');
        return;
      }

      // Generate random simulated order number
      const orderNum = `KM-${Math.floor(1000 + Math.random() * 9000)}`;

      // Calculate totals
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
      let discount = 0;
      if (currentCoupon) {
        const codeData = validCoupons[currentCoupon];
        if (codeData.type === 'percent') {
          discount = Math.round(subtotal * (codeData.value / 100));
        } else if (codeData.type === 'fixed') {
          discount = codeData.value;
        }
      }
      const finalTotal = Math.max(0, subtotal - discount + deliveryCharges);

      // Compile items formatted invoice
      let itemsListText = '';
      cart.forEach((item, index) => {
        itemsListText += `${index + 1}. *${item.name}* (${item.size})\n` +
                         `   Qty: ${item.qty} × Price: ₹${item.price} -> Subtotal: ₹${item.price * item.qty}\n`;
      });

      // Build structured elegant invoice text
      const invoiceText = `🌾 *KAMADHENU HONEY FARMS ORDER* 🌾\n` +
        `----------------------------------------\n` +
        `📋 *INVOICE DETAILS*\n` +
        `----------------------------------------\n` +
        `• *Order ID:* ${orderNum}\n` +
        `• *Customer:* ${name}\n` +
        `• *Phone:* ${phone}\n` +
        `• *Delivery Address:*\n` +
        `  ${address}\n` +
        (landmark ? `  *Landmark:* ${landmark}\n` : '') +
        `• *Payment Mode:* ${paymentMethod === 'cod' ? 'Cash On Delivery' : 'Online Bank Transfer'}\n` +
        `----------------------------------------\n` +
        `📦 *ORDERED PRODUCTS:*\n` +
        `----------------------------------------\n` +
        `${itemsListText}` +
        `----------------------------------------\n` +
        `• *Subtotal:* ₹${subtotal}\n` +
        (discount > 0 ? `• *Discount Applied (${currentCoupon}):* -₹${discount}\n` : '') +
        `• *Delivery Charges:* ₹${deliveryCharges} (FREE)\n` +
        `----------------------------------------\n` +
        `💰 *TOTAL PAYABLE:* *₹${finalTotal}*\n` +
        `----------------------------------------\n` +
        `Hi Kamadhenu Honey Farms, I have completed my checkout process. Please confirm this order!`;

      // Save this order into tracker database locally for simulation
      trackingDatabase[orderNum] = {
        status: 'received',
        name: name,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        steps: ['received']
      };

      // Redirect to WhatsApp
      const waUrl = `https://wa.me/${PRIMARY_WHATSAPP}?text=${encodeURIComponent(invoiceText)}`;
      window.open(waUrl, '_blank');

      // Clear checkout states
      cart = [];
      saveCart();
      currentCoupon = null;
      if (couponInput) couponInput.value = '';
      if (couponFeedback) couponFeedback.style.display = 'none';
      checkoutForm.reset();
      
      closeCheckout();

      // Show friendly confirmation alert
      alert(`Thank you, ${name}! Your invoice has been generated as Order ${orderNum}. We have opened WhatsApp to complete your checkout directly with our team.`);
    });
  }

  /* ==========================================================================
     Simulated Order Tracker Logic
     ========================================================================== */
  const openTracker = () => {
    trackerModalOverlay.classList.add('active');
    document.body.classList.add('overflow-hidden');
  };

  const closeTracker = () => {
    trackerModalOverlay.classList.remove('active');
    if (!mobileNav.classList.contains('active')) {
      document.body.classList.remove('overflow-hidden');
    }
  };

  openTrackerBtns.forEach(btn => btn.addEventListener('click', openTracker));
  if (closeTrackerBtn) closeTrackerBtn.addEventListener('click', closeTracker);

  const trackerInput = document.getElementById('trackerInput');
  const trackerSubmitBtn = document.getElementById('trackerSubmitBtn');
  const trackerResults = document.getElementById('trackerResults');

  if (trackerSubmitBtn) {
    trackerSubmitBtn.addEventListener('click', () => {
      const orderId = trackerInput.value.trim().toUpperCase();
      trackerResults.classList.remove('active');

      if (!orderId) {
        alert('Please enter an Order ID to search.');
        return;
      }

      const orderData = trackingDatabase[orderId];
      if (!orderData) {
        alert(`Order ID "${orderId}" not found. Try testing with order ID: "KM-1029" or "KM-4829".`);
        return;
      }

      // Populate Visual tracker
      document.getElementById('trackIdDisplay').textContent = orderId;
      document.getElementById('trackDateDisplay').textContent = orderData.date;
      
      const steps = ['received', 'packed', 'shipped', 'out-for-delivery'];
      steps.forEach(step => {
        const stepEl = document.getElementById(`track-step-${step}`);
        if (!stepEl) return;
        
        stepEl.className = 'tracker-status-step';
        if (orderData.steps.includes(step)) {
          stepEl.classList.add('completed');
        }
        if (orderData.status === step) {
          stepEl.classList.add('active');
        }
      });

      trackerResults.classList.add('active');
    });
  }

  /* ==========================================================================
     FAQ Accordion Logic
     ========================================================================== */
  faqItems.forEach(item => {
    const faqHeader = item.querySelector('.faq-header');
    const faqContent = item.querySelector('.faq-content');

    faqHeader.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      
      // Close all other FAQs
      faqItems.forEach(otherItem => {
        otherItem.classList.remove('active');
        otherItem.querySelector('.faq-content').style.maxHeight = null;
      });

      if (!isActive) {
        item.classList.add('active');
        faqContent.style.maxHeight = faqContent.scrollHeight + "px";
      }
    });
  });

  /* ==========================================================================
     Gallery Sorting Toggles
     ========================================================================== */
  galleryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      galleryTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const filterClass = tab.dataset.galleryFilter;

      galleryItems.forEach(item => {
        item.style.display = 'none';
        if (filterClass === 'all' || item.classList.contains(`cat-${filterClass}`)) {
          item.style.display = 'block';
        }
      });
    });
  });

  /* ==========================================================================
     Testimonials Slider Logic
     ========================================================================== */
  const initializeTestimonials = () => {
    if (!carouselTrack) return;
    carouselDotsContainer.innerHTML = '';
    testimonialCards = document.querySelectorAll('.testimonial-card');
    
    if (testimonialCards.length === 0) return;

    // Build Dots dynamically
    testimonialCards.forEach((_, idx) => {
      const dot = document.createElement('div');
      dot.className = `carousel-dot ${idx === 0 ? 'active' : ''}`;
      dot.dataset.index = idx;
      carouselDotsContainer.appendChild(dot);
      
      dot.addEventListener('click', () => {
        setTestimonial(idx);
        resetCarouselInterval();
      });
    });

    setTestimonial(0);
    resetCarouselInterval();
  };

  const setTestimonial = (index) => {
    testimonialIndex = index;
    const cards = document.querySelectorAll('.testimonial-card');
    const dots = document.querySelectorAll('.carousel-dot');

    if (cards.length === 0) return;

    // Math calculation for slide translate
    const gap = 30;
    const cardWidth = cards[0].offsetWidth;
    const offset = index * (cardWidth + gap);

    carouselTrack.style.transform = `translateX(-${offset}px)`;

    dots.forEach((dot, idx) => {
      if (idx === index) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  };

  const nextTestimonial = () => {
    const cards = document.querySelectorAll('.testimonial-card');
    if (cards.length === 0) return;
    let nextIndex = testimonialIndex + 1;
    if (nextIndex >= cards.length - 1) { // -1 so we don't display empty slots at margins
      nextIndex = 0;
    }
    setTestimonial(nextIndex);
  };

  const resetCarouselInterval = () => {
    if (carouselInterval) clearInterval(carouselInterval);
    carouselInterval = setInterval(nextTestimonial, 5000);
  };

  // Adjust Testimonial width dynamically on resize
  window.addEventListener('resize', () => {
    if (carouselTrack) {
      setTestimonial(testimonialIndex);
    }
  });

  /* ==========================================================================
     Intersection Observer (Scroll Animations reveal hooks)
     ========================================================================== */
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, { root: null, rootMargin: '0px 0px -50px 0px', threshold: 0 });

  function triggerScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');
    reveals.forEach(reveal => {
      if (!reveal.classList.contains('observed-reveal')) {
        reveal.classList.add('observed-reveal');
        revealObserver.observe(reveal);
      }
    });
  }

  /* ==========================================================================
     Inquiry Contact Form Submission Handler
     ========================================================================== */
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const name = document.getElementById('cntName').value.trim();
      const phone = document.getElementById('cntPhone').value.trim();
      const message = document.getElementById('cntMsg').value.trim();

      if (!name || !phone || !message) {
        alert('Please fill out all the fields in the inquiry form.');
        return;
      }

      // Compile details to send directly on WhatsApp
      const inquiryText = `🌾 *KAMADHENU HONEY FARMS INQUIRY* 🌾\n` +
        `----------------------------------------\n` +
        `• *Name:* ${name}\n` +
        `• *Phone:* ${phone}\n` +
        `----------------------------------------\n` +
        `💬 *Message:*\n` +
        `"${message}"\n` +
        `----------------------------------------\n` +
        `Hi Kamadhenu Honey Farms, I submitted this message on your website contact form. Please advise!`;

      const waUrl = `https://wa.me/${PRIMARY_WHATSAPP}?text=${encodeURIComponent(inquiryText)}`;
      window.open(waUrl, '_blank');

      contactForm.reset();
      alert(`Thank you, ${name}! Your inquiry has been compiled. We have opened WhatsApp to connect you directly with our customer care representative.`);
    });
  }

  /* ==========================================================================
     Meesho Mobile Product Selector Drawer Logic
     ========================================================================== */
  const mobileMeeshoBtn = document.getElementById('mobileMeeshoBtn');
  const meeshoOverlay = document.getElementById('meeshoOverlay');
  const meeshoSelectorDrawer = document.getElementById('meeshoSelectorDrawer');
  const closeMeeshoSelectorBtn = document.getElementById('closeMeeshoSelectorBtn');

  const openMeeshoSelector = () => {
    if (meeshoOverlay && meeshoSelectorDrawer) {
      meeshoOverlay.classList.add('active');
      meeshoSelectorDrawer.style.bottom = '0';
      document.body.classList.add('overflow-hidden');
    }
  };

  const closeMeeshoSelector = () => {
    if (meeshoOverlay && meeshoSelectorDrawer) {
      meeshoOverlay.classList.remove('active');
      meeshoSelectorDrawer.style.bottom = '-100%';
      // Only release overflow-hidden if other overlays are closed
      if (!mobileNav.classList.contains('active') && !cartDrawer.classList.contains('active')) {
        document.body.classList.remove('overflow-hidden');
      }
    }
  };

  if (mobileMeeshoBtn) mobileMeeshoBtn.addEventListener('click', openMeeshoSelector);
  if (closeMeeshoSelectorBtn) closeMeeshoSelectorBtn.addEventListener('click', closeMeeshoSelector);
  if (meeshoOverlay) meeshoOverlay.addEventListener('click', closeMeeshoSelector);

  // Close the selector drawer when any of its buttons is clicked
  if (meeshoSelectorDrawer) {
    const meeshoDrawerButtons = meeshoSelectorDrawer.querySelectorAll('.btn');
    meeshoDrawerButtons.forEach(btn => btn.addEventListener('click', closeMeeshoSelector));
  }

  /* ==========================================================================
     Premium Interactions (Preloader, Parallax, Tilt, Counters)
     ========================================================================== */
  const preloader = document.getElementById('preloader');
  if (preloader) {
    const hidePreloader = () => {
      if (!preloader.classList.contains('hidden')) {
        preloader.classList.add('hidden');
        document.body.classList.add('loaded');
        setTimeout(() => preloader.remove(), 800);
      }
    };
    
    // Fallback: hide preloader after 2.5s even if window hasn't loaded
    const fallbackTimer = setTimeout(hidePreloader, 2500);

    window.addEventListener('load', () => {
      clearTimeout(fallbackTimer);
      setTimeout(hidePreloader, 300);
    });
  }

  const backToTopBtn = document.getElementById('backToTopBtn');
  if (backToTopBtn) {
    let isBtnScrolling = false;
    window.addEventListener('scroll', () => {
      if (!isBtnScrolling) {
        window.requestAnimationFrame(() => {
          if (window.scrollY > 600) {
            backToTopBtn.classList.add('visible');
          } else {
            backToTopBtn.classList.remove('visible');
          }
          isBtnScrolling = false;
        });
        isBtnScrolling = true;
      }
    }, { passive: true });
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  const animateCounters = () => {
    const counters = document.querySelectorAll('.stat-number');
    counters.forEach(counter => {
      const target = parseInt(counter.dataset.target);
      const suffix = counter.dataset.suffix || '';
      const duration = 2000;
      const startTime = performance.now();
      
      const easeOutQuart = t => 1 - Math.pow(1 - t, 4);
      
      const updateCounter = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutQuart(progress);
        const current = Math.floor(easedProgress * target);
        counter.textContent = current + suffix;
        if (progress < 1) requestAnimationFrame(updateCounter);
      };
      requestAnimationFrame(updateCounter);
    });
  };

  const statsSection = document.querySelector('.stats-showcase');
  if (statsSection) {
    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounters();
          statsObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    statsObserver.observe(statsSection);
  }

  const addTiltEffect = () => {
    if (window.innerWidth < 768) return;
    document.querySelectorAll('.product-card, .glass-card').forEach(card => {
      let ticking = false;
      card.addEventListener('mousemove', (e) => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -4;
            const rotateY = ((x - centerX) / centerX) * 4;
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  };

  const heroMedia = document.querySelector('.hero-media');
  const heroContent = document.querySelector('.hero-content');
  let isHeroScrolling = false;
  window.addEventListener('scroll', () => {
    if (window.innerWidth < 768) return;
    if (!isHeroScrolling) {
      window.requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        if (scrollY < window.innerHeight) {
          if (heroMedia) heroMedia.style.transform = `translateY(${scrollY * 0.15}px)`;
          if (heroContent) {
            heroContent.style.transform = `translateY(${scrollY * 0.05}px)`;
            heroContent.style.opacity = Math.max(0, 1 - (scrollY / (window.innerHeight * 0.8)));
          }
        }
        isHeroScrolling = false;
      });
      isHeroScrolling = true;
    }
  }, { passive: true });

  /* ==========================================================================
     Dynamic Glare & 3D Lighting Effects
     ========================================================================== */
  const addDynamicLighting = () => {
    if (window.innerWidth < 768) return;
    const cards = document.querySelectorAll('.product-card, .glass-card, .benefit-card');
    
    cards.forEach(card => {
      let ticking = false;
      card.addEventListener('mousemove', e => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            card.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
            card.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });
    });
  };

  /* ==========================================================================
     Upcoming Products — 3D Gallery & Cinematic Interactions
     ========================================================================== */
  const initializeUpcomingGallery = () => {

    /* ---- Per-card gallery with crossfade ---- */
    const initCardGallery = (card) => {
      if (!card) return;

      const thumbBtns = card.querySelectorAll('.thumb-nav-btn');
      const mainImg   = card.querySelector('.upcoming-media-placeholder .upcoming-main-img');

      if (thumbBtns.length === 0 || !mainImg) return;

      const switchImage = (index) => {
        thumbBtns.forEach(b => b.classList.remove('active'));
        const btn = thumbBtns[index];
        if (btn) {
          btn.classList.add('active');
          mainImg.classList.remove('fade-switch');
          void mainImg.offsetWidth; // trigger reflow for re-animation
          mainImg.src = btn.dataset.imgSrc;
          mainImg.classList.add('fade-switch');
        }
      };

      thumbBtns.forEach((btn, idx) => {
        btn.addEventListener('click', (e) => {
          if (e) e.stopPropagation();
          switchImage(idx);
        });
      });

      // Auto-play gallery on desktop only
      if (thumbBtns.length > 1 && window.innerWidth > 768) {
        let currentIndex = 0;
        setInterval(() => {
          currentIndex = (currentIndex + 1) % thumbBtns.length;
          switchImage(currentIndex);
        }, 6000);
      }
    };

    const flagshipCard = document.querySelector('.upcoming-card.flagship-card');
    initCardGallery(flagshipCard);

    const upcomingCards = document.querySelectorAll('.upcoming-card');
    if (upcomingCards.length > 1) initCardGallery(upcomingCards[1]);
  };

  /* ---- 3D Mouse-Tracking Card Tilt ---- */
  const initUpcoming3DTilt = () => {
    const cards = document.querySelectorAll('.upcoming-card');
    if (!cards.length) return;
    if (window.innerWidth < 768 || window.matchMedia('(max-width: 992px)').matches) return;

    const MAX_TILT  = 10;
    const MAX_SHIFT = 6;

    cards.forEach(card => {
      const content = card.querySelector('.upcoming-content');
      const media   = card.querySelector('.upcoming-media-placeholder');
      let raf       = null;

      const applyTilt = (rx, ry, progress) => {
        card.style.transform  = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(${progress * 8}px)`;
        card.style.boxShadow  = `${-ry * 2}px ${rx * 2 + 20}px 60px rgba(0,0,0,0.6), 0 0 ${40 + progress * 40}px rgba(216,166,79,${0.06 + progress * 0.12})`;
        if (content) content.style.transform = `translateX(${-ry * MAX_SHIFT / MAX_TILT}px) translateY(${rx * MAX_SHIFT / MAX_TILT}px)`;
        if (media)   media.style.transform   = `translateX(${ry * 3 / MAX_TILT}px) translateY(${-rx * 3 / MAX_TILT}px)`;
      };

      const resetTilt = () => {
        card.style.transform  = '';
        card.style.boxShadow  = '';
        if (content) content.style.transform = '';
        if (media)   media.style.transform   = '';
      };

      card.addEventListener('mousemove', (e) => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const rect     = card.getBoundingClientRect();
          const dx       = e.clientX - (rect.left + rect.width  / 2);
          const dy       = e.clientY - (rect.top  + rect.height / 2);
          const rx       = -(dy / (rect.height / 2)) * MAX_TILT;
          const ry       =  (dx / (rect.width  / 2)) * MAX_TILT;
          const progress =  Math.hypot(dx / rect.width, dy / rect.height);
          applyTilt(rx, ry, progress);
        });
      }, { passive: true });

      card.addEventListener('mouseenter', () => { card.style.transition = 'none'; });

      card.addEventListener('mouseleave', () => {
        if (raf) cancelAnimationFrame(raf);
        card.style.transition = 'transform 0.7s cubic-bezier(0.16,1,0.3,1), box-shadow 0.7s cubic-bezier(0.16,1,0.3,1)';
        resetTilt();
        setTimeout(() => { card.style.transition = ''; }, 700);
      });
    });
  };

  /* ---- Floating Gold Particle Canvas ---- */
  const initUpcomingParticles = () => {
    if (window.innerWidth < 768) return; // Skip heavy canvas loop on mobile
    const section = document.querySelector('.upcoming-products');
    if (!section) return;

    const canvas = document.createElement('canvas');
    canvas.classList.add('upcoming-particle-canvas');
    canvas.setAttribute('aria-hidden', 'true');
    section.insertBefore(canvas, section.firstChild);

    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = section.offsetWidth;
      canvas.height = section.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    class Particle {
      constructor() { this.reset(true); }
      reset(initial = false) {
        this.x        = Math.random() * canvas.width;
        this.y        = initial ? Math.random() * canvas.height : canvas.height + 10;
        this.r        = 0.8 + Math.random() * 1.8;
        this.vx       = (Math.random() - 0.5) * 0.4;
        this.vy       = -(0.3 + Math.random() * 0.7);
        this.alpha    = 0;
        this.maxAlpha = 0.25 + Math.random() * 0.4;
        this.life     = 0;
        this.maxLife  = 120 + Math.random() * 160;
        this.gold     = Math.random() > 0.35;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life++;
        const t    = this.life / this.maxLife;
        this.alpha = t < 0.2 ? (t / 0.2) * this.maxAlpha
                   : t > 0.7 ? ((1 - t) / 0.3) * this.maxAlpha
                   : this.maxAlpha;
        if (this.life >= this.maxLife || this.y < -10) this.reset();
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = this.gold ? `rgba(216,166,79,${this.alpha})` : `rgba(255,220,120,${this.alpha * 0.6})`;
        ctx.fill();
      }
    }

    const particles = Array.from({ length: 25 }, () => new Particle());
    let rafId;

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      rafId = requestAnimationFrame(loop);
    };

    // Only animate when visible
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { loop(); }
      else { cancelAnimationFrame(rafId); }
    }, { threshold: 0.05 });
    io.observe(section);
  };

  /* ---- Cinematic Card Entrance (scroll-triggered) ---- */
  const initUpcomingEntrance = () => {
    const cards = document.querySelectorAll('.upcoming-grid .upcoming-card');
    if (!cards.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const card = entry.target;
        const idx  = Array.from(cards).indexOf(card);
        card.style.animation      = `${idx === 0 ? 'upcomingCardEntrance' : 'upcomingCard2Entrance'} 0.9s cubic-bezier(0.16,1,0.3,1) forwards`;
        card.style.animationDelay = `${idx * 0.15}s`;
        observer.unobserve(card);
      });
    }, { threshold: 0.12 });

    cards.forEach(card => {
      card.style.opacity = '0';
      observer.observe(card);
    });
  };

  /* ==========================================================================
     Add to Cart Premium Celebration System (GPU Accelerated & Synchronized)
     ========================================================================== */
  window.CartCelebration = {
    canvas: null,
    ctx: null,
    particles: [],
    animationFrameId: null,
    audioCtx: null,
    toastTimeout: null,

    initCanvas: function() {
      if (this.canvas) return;
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'cart-confetti-canvas';
      document.body.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');
      
      const resize = () => {
        if (this.canvas) {
          this.canvas.width = window.innerWidth;
          this.canvas.height = window.innerHeight;
        }
      };
      resize();
      window.addEventListener('resize', resize, { passive: true });
    },

    trigger: function(button, product, event, isFirstItem) {
      const isMobile = window.innerWidth < 768;
      
      // 1. Play subtle chime safely
      this.playChime(isFirstItem);
      
      // 2. Click ripple
      const btnRect = button.getBoundingClientRect();
      const clickX = event && event.clientX ? event.clientX : (btnRect.left + btnRect.width / 2);
      const clickY = event && event.clientY ? event.clientY : (btnRect.top + btnRect.height / 2);
      this.triggerGlowRipple(clickX, clickY, isFirstItem);
      
      // 3. Lightweight particle burst
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.initCanvas();
        this.spawnParticles(clickX, clickY, isFirstItem, isMobile);
      }
      
      // 4. GPU-accelerated flying image clone to header cart
      this.flyImage(button, product);
    },

    playChime: function(isFirstItem) {
      try {
        if (!this.audioCtx) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) this.audioCtx = new AudioContextClass();
        }
        if (!this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }

        const now = this.audioCtx.currentTime;
        const notes = isFirstItem ? [523.25, 659.25, 783.99, 1046.50] : [1046.50, 1318.51];
        notes.forEach((freq, index) => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + index * 0.06);
          gain.gain.setValueAtTime(0, now + index * 0.06);
          gain.gain.linearRampToValueAtTime(0.08, now + index * 0.06 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.06 + 0.35);
          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start(now + index * 0.06);
          osc.stop(now + index * 0.06 + 0.4);
        });
      } catch (e) {
        // Safe audio fallback
      }
    },

    triggerGlowRipple: function(x, y, isFirstItem) {
      const ripple = document.createElement('div');
      ripple.className = 'cart-glow-ripple' + (isFirstItem ? ' first-item' : '');
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      document.body.appendChild(ripple);
      
      requestAnimationFrame(() => {
        ripple.classList.add('active');
      });
      
      setTimeout(() => {
        ripple.remove();
      }, 800);
    },

    spawnParticles: function(startX, startY, isFirstItem, isMobile) {
      const colors = ['#FFD07F', '#D8A64F', '#B6852F', '#E5A93B', '#FCE8B2'];
      const count = isMobile ? 12 : 28;

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 6;
        this.particles.push({
          type: 'confetti',
          x: startX,
          y: startY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (2 + Math.random() * 3),
          size: 3 + Math.random() * 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          opacity: 1,
          decay: 0.025 + Math.random() * 0.02,
          gravity: 0.25,
          drag: 0.95,
          rotation: Math.random() * Math.PI,
          rotSpeed: -0.1 + Math.random() * 0.2
        });
      }

      this.startLoop();
    },

    startLoop: function() {
      if (this.animationFrameId) return;
      
      const loop = () => {
        if (!this.canvas || !this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
          const p = this.particles[i];
          p.vx *= p.drag;
          p.vy *= p.drag;
          p.vy += p.gravity;
          p.x += p.vx;
          p.y += p.vy;
          p.opacity -= p.decay;
          p.rotation += p.rotSpeed;
          
          if (p.opacity <= 0) {
            this.particles.splice(i, 1);
            continue;
          }
          
          this.ctx.save();
          this.ctx.globalAlpha = p.opacity;
          this.ctx.translate(p.x, p.y);
          this.ctx.rotate(p.rotation);
          this.ctx.fillStyle = p.color;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.restore();
        }
        
        if (this.particles.length > 0) {
          this.animationFrameId = requestAnimationFrame(loop);
        } else {
          this.animationFrameId = null;
        }
      };
      
      this.animationFrameId = requestAnimationFrame(loop);
    },

    flyImage: function(button, product) {
      const productCard = button.closest('.product-card');
      const imgEl = productCard ? productCard.querySelector('.product-media img') : null;
      const cartBtn = document.querySelector('.open-cart-btn');
      
      if (!cartBtn) {
        this.cartImpact(product.name);
        return;
      }
      
      const targetRect = cartBtn.getBoundingClientRect();
      const startRect = imgEl ? imgEl.getBoundingClientRect() : button.getBoundingClientRect();
      
      const flyImg = document.createElement('img');
      flyImg.src = (imgEl && imgEl.src) ? imgEl.src : (product.image || 'assets/raw_honey.jpg');
      flyImg.className = 'cart-fly-img';
      
      const startW = Math.min(startRect.width, 100);
      const startH = Math.min(startRect.height, 100);
      const startX = startRect.left + (startRect.width - startW) / 2;
      const startY = startRect.top + (startRect.height - startH) / 2;
      
      flyImg.style.width = startW + 'px';
      flyImg.style.height = startH + 'px';
      flyImg.style.left = startX + 'px';
      flyImg.style.top = startY + 'px';
      flyImg.style.transform = 'translate3d(0,0,0) scale(1) rotate(0deg)';
      flyImg.style.opacity = '1';
      
      document.body.appendChild(flyImg);
      
      const destX = targetRect.left + targetRect.width / 2 - (startW / 2);
      const destY = targetRect.top + targetRect.height / 2 - (startH / 2);
      const deltaX = destX - startX;
      const deltaY = destY - startY;
      
      // Pure GPU-accelerated CSS flight transition
      requestAnimationFrame(() => {
        flyImg.style.transition = 'transform 0.65s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.65s ease';
        flyImg.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.25) rotate(360deg)`;
        flyImg.style.opacity = '0.5';
      });
      
      setTimeout(() => {
        flyImg.remove();
        this.cartImpact(product.name);
      }, 650);
    },

    cartImpact: function(productName) {
      const cartBtns = document.querySelectorAll('.open-cart-btn');
      cartBtns.forEach(btn => {
        btn.classList.remove('cart-icon-bounce');
        void btn.offsetWidth; // Trigger reflow for clean re-animation
        btn.classList.add('cart-icon-bounce');
      });
      
      // Ensure badges are 100% updated with accurate state quantity
      updateBadges();
      
      // Pulse all cart count badges
      document.querySelectorAll('.cart-count').forEach(badge => {
        badge.classList.remove('cart-badge-pulse');
        void badge.offsetWidth;
        badge.classList.add('cart-badge-pulse');
      });
      
      // Trigger Toast notification
      this.showToast(productName);
      
      setTimeout(() => {
        cartBtns.forEach(btn => btn.classList.remove('cart-icon-bounce'));
        document.querySelectorAll('.cart-count').forEach(badge => badge.classList.remove('cart-badge-pulse'));
      }, 800);
    },

    showToast: function(productName) {
      const toast = document.getElementById('cart-celebration-toast');
      if (!toast) return;
      
      const titleEl = toast.querySelector('.toast-title');
      const subEl = toast.querySelector('.toast-subtitle');
      const progressBar = toast.querySelector('.toast-progress-bar');
      
      if (titleEl) titleEl.textContent = 'Sweet Choice!';
      if (subEl) subEl.textContent = (productName || 'Product') + ' added to cart';
      
      toast.className = 'toast-hidden';
      if (progressBar) progressBar.classList.remove('toast-progress-shrink');
      
      requestAnimationFrame(() => {
        toast.className = 'toast-show';
        if (progressBar) progressBar.classList.add('toast-progress-shrink');
      });
      
      if (this.toastTimeout) clearTimeout(this.toastTimeout);
      this.toastTimeout = setTimeout(() => {
        toast.className = 'toast-hidden';
      }, 2800);
      
      toast.onclick = () => {
        clearTimeout(this.toastTimeout);
        toast.className = 'toast-hidden';
        openCart(); // Open drawer if user taps the toast
      };
    }
  };

  /* ==========================================================================
     App Initialization
     ========================================================================== */
  const initApp = () => {
    updateBadges();
    renderProductCards();
    renderCart();
    initializeTestimonials();
    initializeUpcomingGallery();

    // Disable heavy 3D tilt and continuous particle loops on mobile for 60fps smooth scrolling
    if (window.innerWidth > 768) {
      if (typeof initUpcomingParticles === 'function') initUpcomingParticles();
      if (typeof initUpcoming3DTilt === 'function') initUpcoming3DTilt();
      if (typeof initUpcomingEntrance === 'function') initUpcomingEntrance();

      setTimeout(() => { if (typeof triggerScrollReveal === 'function') triggerScrollReveal(); }, 400);
      setTimeout(() => { if (typeof addTiltEffect === 'function') addTiltEffect(); }, 800);
      setTimeout(() => { if (typeof addDynamicLighting === 'function') addDynamicLighting(); }, 850);
    }
  };

  initApp();
});
