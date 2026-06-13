/* ==========================================================================
   Kamadhenu Honey Farms - Premium Luxury E-Commerce Script
   ========================================================================== */

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
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // Mobile Hamburger toggling
  const toggleMobileNav = () => {
    hamburger.classList.toggle('open');
    mobileNav.classList.toggle('active');
    document.body.classList.toggle('overflow-hidden');
  };

  if (hamburger) {
    hamburger.addEventListener('click', toggleMobileNav);
  }

  mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (mobileNav.classList.contains('active')) {
        toggleMobileNav();
      }
    });
  });

  /* ==========================================================================
     E-Commerce State Synchronization
     ========================================================================== */
  const updateBadges = () => {
    // Update Cart counters
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    
    // If flight is active, we sync the drawer count, but defer the header count update
    // to match the exact collision arrival of the product image
    if (window.CartCelebration && window.CartCelebration.isFlying) {
      window.CartCelebration.targetCartCount = totalQty;
      const drawerBadge = document.querySelector('.cart-drawer .cart-count');
      if (drawerBadge) drawerBadge.textContent = totalQty;
    } else {
      cartBadgeCounts.forEach(el => el.textContent = totalQty);
    }
    
    // Update Wishlist counters
    const totalWish = wishlist.length;
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
  const addItemToCart = (productId, size, qty, openDrawer = true) => {
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

        // Auto switch images every 5 seconds
        if (thumbBtns.length > 1) {
          let currentIndex = 0;
          setInterval(() => {
            currentIndex = (currentIndex + 1) % thumbBtns.length;
            switchImage(currentIndex);
          }, 5000);
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
          // 1. Instantly trigger visual feedback synchronously to satisfy INP immediately
          const originalContent = addToCartBtn.innerHTML;
          addToCartBtn.textContent = '✓ Added!';
          addToCartBtn.classList.add('btn-gold');
          addToCartBtn.style.boxShadow = '0 0 15px var(--primary-gold)';
          
          // 2. Defer all heavy updates and animation calls to the next paint cycle
          setTimeout(() => {
            const isCartEmpty = cart.length === 0;
            
            // Updates cart array, saves to local storage, rerenders drawer elements
            addItemToCart(product.id, selectedSize, 1, true);
            
            // Runs visual celebration, fly-to-cart, and audio chimes
            if (window.CartCelebration) {
              window.CartCelebration.trigger(addToCartBtn, product, e, isCartEmpty);
            }
          }, 20); // 20ms delay yields thread for immediate screen paint
          
          setTimeout(() => {
            addToCartBtn.innerHTML = originalContent;
            addToCartBtn.classList.remove('btn-gold');
            addToCartBtn.style.boxShadow = '';
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
  function triggerScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');
    const windowHeight = window.innerHeight;
    const revealPoint = 100;

    reveals.forEach(reveal => {
      const revealTop = reveal.getBoundingClientRect().top;

      if (revealTop < windowHeight - revealPoint) {
        reveal.classList.add('active');
      }
    });
  }

  window.addEventListener('scroll', triggerScrollReveal);

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
    window.addEventListener('load', () => {
      setTimeout(() => {
        preloader.classList.add('hidden');
        document.body.classList.add('loaded');
        setTimeout(() => preloader.remove(), 800);
      }, 1500);
    });
  }

  const backToTopBtn = document.getElementById('backToTopBtn');
  if (backToTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 600) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    });
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
    document.querySelectorAll('.product-card, .glass-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -4;
        const rotateY = ((x - centerX) / centerX) * 4;
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  };

  const heroMedia = document.querySelector('.hero-media');
  const heroContent = document.querySelector('.hero-content');
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (scrollY < window.innerHeight) {
      if (heroMedia) heroMedia.style.transform = `translateY(${scrollY * 0.15}px)`;
      if (heroContent) {
        heroContent.style.transform = `translateY(${scrollY * 0.05}px)`;
        heroContent.style.opacity = 1 - (scrollY / (window.innerHeight * 0.8));
      }
    }
  });

  /* ==========================================================================
     Dynamic Glare & 3D Lighting Effects
     ========================================================================== */
  const addDynamicLighting = () => {
    const cards = document.querySelectorAll('.product-card, .glass-card, .benefit-card');
    
    cards.forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        card.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
        card.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);
      });
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

      // Auto-play each gallery independently every 5 seconds
      if (thumbBtns.length > 1) {
        let currentIndex = 0;
        setInterval(() => {
          currentIndex = (currentIndex + 1) % thumbBtns.length;
          switchImage(currentIndex);
        }, 5000);
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
    if (window.matchMedia('(max-width: 992px)').matches) return;

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
      });

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
        ctx.fillStyle   = this.gold ? `rgba(216,166,79,${this.alpha})` : `rgba(255,220,120,${this.alpha * 0.6})`;
        ctx.shadowBlur  = 8;
        ctx.shadowColor = this.gold ? 'rgba(216,166,79,0.5)' : 'rgba(255,200,80,0.3)';
        ctx.fill();
        ctx.shadowBlur  = 0;
      }
    }

    const particles = Array.from({ length: 55 }, () => new Particle());
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
     Add to Cart Premium Celebration System
     ========================================================================== */
  window.CartCelebration = {
    isFlying: false,
    targetCartCount: null,
    canvas: null,
    ctx: null,
    particles: [],
    animationFrameId: null,
    audioCtx: null,

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
      window.addEventListener('resize', resize);
    },

    trigger: function(button, product, event, isFirstItem) {
      this.initCanvas();
      
      // Get click position (fallback to button center if no event coords)
      const btnRect = button.getBoundingClientRect();
      const clickX = event && event.clientX ? event.clientX : (btnRect.left + btnRect.width / 2);
      const clickY = event && event.clientY ? event.clientY : (btnRect.top + btnRect.height / 2);
      
      const isMobile = window.innerWidth < 768;
      
      // 1. Play success chime
      this.playChime(isFirstItem);
      
      // 2. Glow Ripple
      this.triggerGlowRipple(clickX, clickY, isFirstItem);
      
      // 3. Confetti particles + escort bees (inside canvas animation)
      this.spawnParticles(clickX, clickY, isFirstItem, isMobile);
      
      // 4. Flying image
      this.flyImage(button, product, isFirstItem, isMobile);
    },

    playChime: function(isFirstItem) {
      try {
        // Initialize Web Audio API on first user interaction
        if (!this.audioCtx) {
          this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }

        const now = this.audioCtx.currentTime;
        
        if (isFirstItem) {
          // Play a rich luxury major triad chord arpeggio (C5 -> E5 -> G5 -> C6)
          const notes = [523.25, 659.25, 783.99, 1046.50];
          notes.forEach((freq, index) => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            
            // Premium triangle/sine mix for warm sound
            osc.type = index % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, now + index * 0.08);
            
            // Envelope
            gain.gain.setValueAtTime(0, now + index * 0.08);
            gain.gain.linearRampToValueAtTime(0.12, now + index * 0.08 + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.65);
            
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            
            osc.start(now + index * 0.08);
            osc.stop(now + index * 0.08 + 0.7);
          });
        } else {
          // Lighter subsequent chime: high note arpeggietto (C6 -> E6)
          const notes = [1046.50, 1318.51];
          notes.forEach((freq, index) => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + index * 0.06);
            
            // Envelope
            gain.gain.setValueAtTime(0, now + index * 0.06);
            gain.gain.linearRampToValueAtTime(0.08, now + index * 0.06 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.06 + 0.4);
            
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            
            osc.start(now + index * 0.06);
            osc.stop(now + index * 0.06 + 0.45);
          });
        }
      } catch (e) {
        console.warn("Audio Context failure: ", e);
      }
    },

    triggerGlowRipple: function(x, y, isFirstItem) {
      const ripple = document.createElement('div');
      ripple.className = 'cart-glow-ripple';
      if (isFirstItem) ripple.classList.add('first-item');
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      document.body.appendChild(ripple);
      
      // Use double requestAnimationFrame to wait for the DOM insertion to register
      // and trigger the CSS transition naturally without blocking the UI thread
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          ripple.classList.add('active');
        });
      });
      
      setTimeout(() => {
        ripple.remove();
      }, 1600);
    },

    spawnParticles: function(startX, startY, isFirstItem, isMobile) {
      // Setup particles
      // Honey gold palette
      const colors = [
        '#FFD07F', // light gold
        '#D8A64F', // brand gold
        '#B6852F', // dark gold
        '#E5A93B', // amber gold
        '#FCE8B2'  // cream gold
      ];
      
      let count = isFirstItem ? 80 : 45;
      if (isMobile) count = Math.floor(count * 0.5);

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        // Launch upwards and outwards
        const speed = 4 + Math.random() * 8;
        const vx = Math.cos(angle) * speed;
        // biased upwards: negative Y
        const vy = Math.sin(angle) * speed - (2 + Math.random() * 4);
        
        this.particles.push({
          type: 'confetti',
          x: startX,
          y: startY,
          vx: vx,
          vy: vy,
          size: 4 + Math.random() * 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          opacity: 1,
          decay: 0.015 + Math.random() * 0.02,
          gravity: 0.2,
          drag: 0.96,
          shape: Math.random() > 0.5 ? 'hexagon' : 'circle',
          rotation: Math.random() * Math.PI,
          rotSpeed: -0.1 + Math.random() * 0.2
        });
      }

      this.startLoop();
    },

    startLoop: function() {
      if (this.animationFrameId) return;
      
      const loop = () => {
        if (!this.canvas) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update & Draw particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
          const p = this.particles[i];
          
          if (p.type === 'confetti') {
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
            
            if (p.shape === 'hexagon') {
              this.ctx.beginPath();
              for (let h = 0; h < 6; h++) {
                const angle = (h * Math.PI) / 3;
                this.ctx.lineTo(Math.cos(angle) * p.size, Math.sin(angle) * p.size);
              }
              this.ctx.closePath();
              this.ctx.fill();
            } else {
              this.ctx.beginPath();
              this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
              this.ctx.fill();
            }
            this.ctx.restore();
          } 
          else if (p.type === 'honey_drop') {
            // Honey droplets drift down and evaporate/fade
            p.vy += p.gravity;
            p.x += p.vx;
            p.y += p.vy;
            p.opacity -= p.decay;
            p.size *= 0.97; // shrink slightly as they fall
            
            if (p.opacity <= 0 || p.size < 0.5) {
              this.particles.splice(i, 1);
              continue;
            }
            
            this.ctx.save();
            this.ctx.globalAlpha = p.opacity;
            this.ctx.fillStyle = p.color;
            
            // Draw drop shape
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
          }
          else if (p.type === 'bee') {
            // Bees follow/orbit the flying image coords
            if (!this.isFlying && p.lifetime > 60) {
              // Fade out if image landed
              p.opacity -= 0.05;
              if (p.opacity <= 0) {
                this.particles.splice(i, 1);
                continue;
              }
            } else {
              p.lifetime++;
            }
            
            // Wing flap phase increment
            p.wingPhase += 0.45;
            
            // Update orbit around current image coordinates
            if (window.CartCelebrationFlightPos) {
              const targetX = window.CartCelebrationFlightPos.x;
              const targetY = window.CartCelebrationFlightPos.y;
              
              p.angle += p.orbitSpeed;
              // Add noise for realistic hover jitter
              const jitterX = Math.sin(p.lifetime * 0.15) * 3;
              const jitterY = Math.cos(p.lifetime * 0.2) * 3;
              
              const destX = targetX + Math.cos(p.angle) * p.orbitRadius + jitterX;
              const destY = targetY + Math.sin(p.angle) * p.orbitRadius + jitterY;
              
              // Easing towards the destination orbit
              p.x += (destX - p.x) * 0.12;
              p.y += (destY - p.y) * 0.12;
            } else {
              // Drift/fly towards the cart icon directly if positions cleared
              const cartBtn = document.querySelector('.open-cart-btn');
              if (cartBtn) {
                const rect = cartBtn.getBoundingClientRect();
                const cartX = rect.left + rect.width / 2;
                const cartY = rect.top + rect.height / 2;
                p.x += (cartX - p.x) * 0.08;
                p.y += (cartY - p.y) * 0.08;
                p.opacity -= 0.02;
                if (p.opacity <= 0 || Math.abs(p.x - cartX) < 10) {
                  this.particles.splice(i, 1);
                  continue;
                }
              } else {
                p.opacity -= 0.02;
              }
            }
            
            // Draw Bee
            this.ctx.save();
            this.ctx.globalAlpha = p.opacity;
            this.ctx.translate(p.x, p.y);
            
            // Face the direction of motion relative to center
            const faceLeft = Math.cos(p.angle) < 0;
            this.ctx.scale(faceLeft ? -1 : 1, 1);
            
            // 1. Draw wings (fluttering)
            const flapOffset = Math.sin(p.wingPhase) * 6;
            this.ctx.fillStyle = 'rgba(235, 245, 255, 0.72)';
            
            // Wing 1
            this.ctx.beginPath();
            this.ctx.ellipse(-2, -6 + flapOffset/2, 4, 8, -Math.PI / 4, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Wing 2
            this.ctx.beginPath();
            this.ctx.ellipse(3, -5 - flapOffset/2, 3, 7, Math.PI / 6, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 2. Draw Body (Golden honey color)
            this.ctx.fillStyle = '#D8A64F';
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 3. Draw stripes (Black charcoal)
            this.ctx.strokeStyle = '#1a1813';
            this.ctx.lineWidth = 2.5;
            
            // Stripe 1
            this.ctx.beginPath();
            this.ctx.moveTo(-2, -5.5);
            this.ctx.lineTo(-2, 5.5);
            this.ctx.stroke();
            
            // Stripe 2
            this.ctx.beginPath();
            this.ctx.moveTo(2, -5.5);
            this.ctx.lineTo(2, 5.5);
            this.ctx.stroke();
            
            // Head
            this.ctx.fillStyle = '#1a1813';
            this.ctx.beginPath();
            this.ctx.arc(6, -1, 3.5, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
          }
        }
        
        if (this.particles.length > 0) {
          this.animationFrameId = requestAnimationFrame(loop);
        } else {
          this.animationFrameId = null;
        }
      };
      
      this.animationFrameId = requestAnimationFrame(loop);
    },

    flyImage: function(button, product, isFirstItem, isMobile) {
      // Find the product card image
      const productCard = button.closest('.product-card');
      if (!productCard) return;
      
      const imgEl = productCard.querySelector('.product-media img');
      if (!imgEl) return;
      
      const cartBtn = document.querySelector('.open-cart-btn');
      if (!cartBtn) return;
      
      const imgRect = imgEl.getBoundingClientRect();
      const cartRect = cartBtn.getBoundingClientRect();
      
      // Create flying clone
      const flyImg = document.createElement('img');
      flyImg.src = imgEl.src;
      flyImg.className = 'cart-fly-img';
      
      // Position at original image spot
      flyImg.style.left = imgRect.left + 'px';
      flyImg.style.top = imgRect.top + 'px';
      flyImg.style.width = imgRect.width + 'px';
      flyImg.style.height = imgRect.height + 'px';
      
      document.body.appendChild(flyImg);
      
      // Initialize global coordinate reference for bees to orbit
      this.isFlying = true;
      window.CartCelebrationFlightPos = {
        x: imgRect.left + imgRect.width / 2,
        y: imgRect.top + imgRect.height / 2
      };
      
      // Spawn escort bees
      let beeCount = isFirstItem ? 3 : 2;
      if (isMobile) beeCount = Math.max(1, beeCount - 1);
      
      for (let i = 0; i < beeCount; i++) {
        this.particles.push({
          type: 'bee',
          x: window.CartCelebrationFlightPos.x,
          y: window.CartCelebrationFlightPos.y,
          opacity: 1,
          lifetime: 0,
          angle: (i * Math.PI * 2) / beeCount,
          orbitRadius: 28 + Math.random() * 12,
          orbitSpeed: 0.08 + Math.random() * 0.06,
          wingPhase: Math.random() * 10
        });
      }
      
      // Setup flight path variables for JS frame-by-frame updates (to match honey drips and bees)
      const startX = imgRect.left;
      const startY = imgRect.top;
      const startW = imgRect.width;
      const startH = imgRect.height;
      
      const destX = cartRect.left + cartRect.width / 2 - 20; // scale down towards center
      const destY = cartRect.top + cartRect.height / 2 - 20;
      const destW = 40;
      const destH = 40;
      
      const startTime = performance.now();
      const duration = 850; // 0.85 seconds
      
      const updateFlight = (timestamp) => {
        const elapsed = timestamp - startTime;
        const progress = Math.min(1, elapsed / duration);
        
        // Bezier Ease Out Cubic
        const ease = 1 - Math.pow(1 - progress, 3);
        
        const curX = startX + (destX - startX) * ease;
        const curY = startY + (destY - startY) * ease;
        const curW = startW + (destW - startW) * ease;
        const curH = startH + (destH - startH) * ease;
        const rotate = ease * 360; // complete rotation
        const scale = 1 - (0.75 * ease); // shrink to 25% size
        
        // Update DOM element positions
        flyImg.style.left = curX + 'px';
        flyImg.style.top = curY + 'px';
        flyImg.style.width = curW + 'px';
        flyImg.style.height = curH + 'px';
        flyImg.style.transform = `rotate(${rotate}deg) scale(${scale})`;
        flyImg.style.opacity = 1 - (ease * 0.6); // fade slightly on arrival
        
        // Update global flight pos for orbiting bees
        const imgCenterX = curX + curW / 2;
        const imgCenterY = curY + curH / 2;
        window.CartCelebrationFlightPos = { x: imgCenterX, y: imgCenterY };
        
        // Spawn Honey Drip Trail Droplets (physics-based)
        if (progress < 0.95 && Math.random() < 0.45) {
          const vx = (Math.random() - 0.5) * 1.5;
          const vy = 1 + Math.random() * 2;
          
          this.particles.push({
            type: 'honey_drop',
            x: imgCenterX + (Math.random() - 0.5) * 15,
            y: imgCenterY + (Math.random() - 0.5) * 15,
            vx: vx,
            vy: vy,
            size: 2.5 + Math.random() * 3.5,
            color: Math.random() > 0.4 ? 'rgba(216, 166, 79, 0.82)' : 'rgba(255, 208, 127, 0.88)',
            opacity: 0.95,
            decay: 0.035 + Math.random() * 0.02,
            gravity: 0.15
          });
        }
        
        if (progress < 1) {
          requestAnimationFrame(updateFlight);
        } else {
          // Landing/Collision reached!
          flyImg.remove();
          this.isFlying = false;
          window.CartCelebrationFlightPos = null;
          
          // Trigger impact details
          this.cartImpact(cartRect);
          
          // Trigger Toast Notification
          this.showToast(product.name);
        }
      };
      
      requestAnimationFrame(updateFlight);
      this.startLoop();
    },

    cartImpact: function(cartRect) {
      const cartBtn = document.querySelector('.open-cart-btn');
      if (!cartBtn) return;
      
      const cartCenterX = cartRect.left + cartRect.width / 2;
      const cartCenterY = cartRect.top + cartRect.height / 2;
      
      // 1. Spans Ring Burst around the cart
      const ring = document.createElement('div');
      ring.className = 'cart-ring-burst';
      ring.style.left = cartCenterX + 'px';
      ring.style.top = cartCenterY + 'px';
      document.body.appendChild(ring);
      
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          ring.classList.add('active');
        });
      });
      setTimeout(() => { ring.remove(); }, 600);
      
      // 2. Add glow & bounce classes
      cartBtn.classList.add('cart-glow-active', 'cart-icon-bounce');
      
      // 3. Animate cart count smoothly
      const badges = document.querySelectorAll('.cart-count');
      const targetCount = this.targetCartCount !== null ? this.targetCartCount : 0;
      
      badges.forEach(badge => {
        badge.classList.add('cart-badge-pulse');
        
        const currentCount = parseInt(badge.textContent) || 0;
        if (currentCount !== targetCount) {
          let start = currentCount;
          const end = targetCount;
          const duration = 300;
          const stepTime = Math.abs(Math.floor(duration / (end - start || 1)));
          
          const timer = setInterval(() => {
            if (start < end) {
              start++;
              badge.textContent = start;
            } else if (start > end) {
              start--;
              badge.textContent = start;
            }
            if (start === end) {
              clearInterval(timer);
            }
          }, Math.max(stepTime, 20));
        }
      });
      
      // Clean up classes after animations complete
      setTimeout(() => {
        cartBtn.classList.remove('cart-glow-active', 'cart-icon-bounce');
        badges.forEach(badge => badge.classList.remove('cart-badge-pulse'));
        this.targetCartCount = null;
      }, 1000);
    },

    showToast: function(productName) {
      const toast = document.getElementById('cart-celebration-toast');
      if (!toast) return;
      
      // List of dynamic luxury messages
      const titles = [
        "🍯 Sweet Choice!",
        "🐝 Fresh From The Hive!",
        "✨ Added To Your Collection!",
        "🍯 Pure Honey Added!",
        "🐝 Great Pick!",
        "🍯 Farm Fresh Goodness Added!"
      ];
      
      const subtitles = [
        "Added To Your Kamadhenu Collection",
        "Product Added Successfully",
        "Fresh Honey Added To Cart",
        "Ready For Checkout"
      ];
      
      const randomTitle = titles[Math.floor(Math.random() * titles.length)];
      const randomSub = subtitles[Math.floor(Math.random() * subtitles.length)];
      
      // Update contents
      const titleEl = toast.querySelector('.toast-title');
      const subEl = toast.querySelector('.toast-subtitle');
      const iconEl = toast.querySelector('.toast-icon-wrap');
      const progressBar = toast.querySelector('.toast-progress-bar');
      
      if (titleEl) titleEl.textContent = randomTitle.replace(/^[^\s]+\s+/, '');
      if (subEl) subEl.textContent = randomSub;
      
      // Extract emoji for the icon column
      const emojiMatch = randomTitle.match(/^([^\s]+)/);
      if (iconEl && emojiMatch) iconEl.textContent = emojiMatch[0];
      
      // Reset toast animation states
      toast.className = 'toast-hidden';
      progressBar.classList.remove('toast-progress-shrink');
      
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          toast.classList.remove('toast-hidden');
          toast.classList.add('toast-show');
          progressBar.classList.add('toast-progress-shrink');
        });
      });
      
      // Auto-hide toast after 3 seconds
      const hideTimeout = setTimeout(() => {
        toast.classList.remove('toast-show');
        toast.classList.add('toast-hidden');
      }, 3000);
      
      // Enable close on click
      toast.onclick = () => {
        clearTimeout(hideTimeout);
        toast.classList.remove('toast-show');
        toast.classList.add('toast-hidden');
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
    initUpcomingParticles();
    initUpcoming3DTilt();
    initUpcomingEntrance();

    // Initial triggers for animations
    setTimeout(triggerScrollReveal, 400);
    setTimeout(addTiltEffect, 800);
    setTimeout(addDynamicLighting, 850);
  };

  initApp();
});
