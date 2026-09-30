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
  let isCheckoutSubmitting = false;

  // Request timeout wrapper to protect against network drops and freezing
  const fetchWithTimeout = async (url, options = {}, timeoutMs = 12000) => {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timerId);
      return response;
    } catch (err) {
      clearTimeout(timerId);
      if (err.name === 'AbortError') {
        throw new Error('Connection timed out. Please check your network and try again.');
      }
      throw err;
    }
  };
  
  // Brand Configuration
  const PRIMARY_WHATSAPP = '919980114675';
  
  // Product Config Database (Price by size)
  const productDatabase = {
    'p1': {
      id: 'p1',
      name: 'Pure Raw Honey',
      category: 'raw',
      stockStatus: 'IN_STOCK',
      restockDays: 3,
      canPreorder: false,
      badgeText: 'Organic',
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
      stockStatus: 'IN_STOCK',
      restockDays: 3,
      canPreorder: false,
      badgeText: 'Deluxe',
      baseDesc: 'Premium raw honey rich in hand-sorted almonds, cashews, pistachios, and walnuts.',
      prices: {
        '250g': 399,
        '500g': 599,
        '1kg': 2 // TEST PRICE (real: 999)
      },
      image: 'assets/dry_fruits_honey_details.jpg',
      images: [
        'assets/dry_fruits_honey_details.jpg',
        'assets/dry_fruits_honey_back.jpg',
        'assets/dry_fruits_honey_landscape.jpg',
        'assets/dry_fruits_honey.jpg'
      ],
      placeholderIcon: `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
        </svg>
      `
    },
    'p3': {
      id: 'p3',
      name: 'Bee-Crafted Honey Comb Jar',
      subtitle: 'Built by Bees. Not by Machines.',
      category: 'honeycomb',
      stockStatus: 'RESTOCKING_SOON',
      restockDays: 7,
      canPreorder: true,
      badgeText: 'Restocking in 7 days',
      restockNote: 'Stock will be restocked within 7 days',
      baseDesc: 'A unique innovation where bees naturally build honeycomb directly inside a glass jar and fill it with pure raw honey. Harvested exactly as nature intended.',
      prices: {
        '500g': 599
      },
      image: 'assets/ChatGPT Image Jun 13, 2026, 07_29_45 PM.png',
      images: [
        'assets/ChatGPT Image Jun 13, 2026, 07_29_45 PM.png',
        'assets/ChatGPT Image Jun 13, 2026, 07_31_52 PM.png',
        'assets/ChatGPT Image Jun 13, 2026, 07_36_11 PM.png',
        'assets/ChatGPT Image Jun 13, 2026, 07_51_53 PM.png',
        'assets/ChatGPT Image Jun 13, 2026, 07_54_12 PM.png'
      ],
      placeholderIcon: `
        <svg viewBox="0 0 100 100" class="luxury-jar-svg">
          <path d="M35,25 Q35,20 40,20 L60,20 Q65,20 65,25 L65,30 L35,30 Z" fill="none" stroke="var(--primary-gold)" stroke-width="2" />
          <rect x="30" y="30" width="40" height="8" rx="2" fill="none" stroke="var(--primary-gold)" stroke-width="2" />
          <path d="M30,38 Q30,48 25,60 Q20,80 30,85 L70,85 Q80,80 75,60 Q70,48 70,38 Z" fill="none" stroke="var(--primary-gold)" stroke-width="2" />
        </svg>
      `
    },
    'p4': {
      id: 'p4',
      name: 'Raw Honey Comb Box',
      subtitle: 'Straight From The Hive.',
      category: 'honeycomb',
      stockStatus: 'IN_STOCK',
      restockDays: 0,
      canPreorder: false,
      baseDesc: 'Fresh honeycomb harvested directly from our hives and packed carefully to preserve its natural taste, aroma, and nutrients.',
      prices: {
        '500g': 899
      },
      image: 'assets/ChatGPT Image Jun 13, 2026, 07_39_22 PM.png',
      images: [
        'assets/ChatGPT Image Jun 13, 2026, 07_39_22 PM.png',
        'assets/ChatGPT Image Jun 13, 2026, 07_42_34 PM.png',
        'assets/ChatGPT Image Jun 13, 2026, 07_43_33 PM.png',
        'assets/ChatGPT Image Jun 13, 2026, 07_46_15 PM.png',
        'assets/ChatGPT Image Jun 13, 2026, 07_47_14 PM.png'
      ],
      placeholderIcon: `
        <svg viewBox="0 0 100 100" class="luxury-box-svg">
          <polygon points="50,15 80,30 80,65 50,80 20,65 20,30" fill="none" stroke="var(--primary-gold)" stroke-width="2" />
        </svg>
      `
    }
  };

  // Refresh cart items with active product prices in case user has previous local cache
  cart = cart.map(item => {
    const dbp = productDatabase[item.id];
    if (dbp && dbp.prices && dbp.prices[item.size]) {
      return { ...item, price: dbp.prices[item.size] };
    }
    return item;
  });

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
     Unified High-Performance Scroll Manager (Single rAF Tick, Hardware Composited)
     ========================================================================== */
  const backToTopBtn = document.getElementById('backToTopBtn');
  const heroMedia = document.querySelector('.hero-media');
  const heroContent = document.querySelector('.hero-content');

  let isScrollScheduled = false;
  const handleScrollThrottled = () => {
    if (!isScrollScheduled) {
      window.requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        // 1. Header scrolled state
        if (header) {
          if (scrollY > 50) {
            header.classList.add('scrolled');
          } else {
            header.classList.remove('scrolled');
          }
        }
        // 2. Back to top button visibility
        if (backToTopBtn) {
          if (scrollY > 600) {
            backToTopBtn.classList.add('visible');
          } else {
            backToTopBtn.classList.remove('visible');
          }
        }
        // 3. Hero parallax using translate3d for GPU compositor execution
        if (window.innerWidth >= 768 && scrollY < window.innerHeight) {
          if (heroMedia) {
            heroMedia.style.transform = `translate3d(0, ${scrollY * 0.15}px, 0)`;
          }
          if (heroContent) {
            heroContent.style.transform = `translate3d(0, ${scrollY * 0.05}px, 0)`;
            heroContent.style.opacity = Math.max(0, 1 - (scrollY / (window.innerHeight * 0.8)));
          }
        }
        isScrollScheduled = false;
      });
      isScrollScheduled = true;
    }
  };
  window.addEventListener('scroll', handleScrollThrottled, { passive: true });

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

    if (target === 'orders') {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      openOrders();
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
    renderCheckoutSummary();
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
      if (cartDiscountRow) cartDiscountRow.style.display = 'none';
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
              <button class="qty-btn dec-qty-cart" data-index="${index}" title="Decrease quantity">-</button>
              <input type="text" class="qty-input" value="${item.qty}" readonly>
              <button class="qty-btn inc-qty-cart" data-index="${index}" title="Increase quantity">+</button>
            </div>
          </div>
        </div>
        <button class="cart-item-remove remove-cart-item" data-index="${index}" title="Remove item">
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
    if (currentCoupon && validCoupons[currentCoupon]) {
      const codeData = validCoupons[currentCoupon];
      if (codeData.type === 'percent') {
        discount = Math.round(subtotal * (codeData.value / 100));
      } else if (codeData.type === 'fixed') {
        discount = Math.min(subtotal, codeData.value);
      }
      cartDiscountRow.style.display = 'flex';
      cartDiscountEl.textContent = `-₹${discount}`;
    } else {
      if (cartDiscountRow) cartDiscountRow.style.display = 'none';
      if (currentCoupon && !validCoupons[currentCoupon]) {
        currentCoupon = null;
      }
    }

    // Cart shows subtotal only — delivery calculated at checkout after pincode entry
    const subtotalAfterDiscount = Math.max(0, subtotal - discount);
    cartTotalEl.textContent = `₹${subtotalAfterDiscount}`;
    // Add a small note under total if not already present
    let shippingNote = cartTotalEl.parentElement?.querySelector('.cart-shipping-note');
    if (!shippingNote) {
      shippingNote = document.createElement('small');
      shippingNote.className = 'cart-shipping-note';
      shippingNote.style.cssText = 'display:block; color:#888; font-size:0.72rem; margin-top:2px;';
      cartTotalEl.parentElement?.appendChild(shippingNote);
    }
    shippingNote.textContent = '+ Delivery charges calculated at checkout';

    // Wire up events safely with closest() selector
    cartItemsContainer.querySelectorAll('.dec-qty-cart').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const button = e.target.closest('.dec-qty-cart');
        const idx = parseInt(button.dataset.index, 10);
        if (!isNaN(idx) && cart[idx]) {
          if (cart[idx].qty > 1) {
            cart[idx].qty--;
          } else {
            cart.splice(idx, 1);
          }
          saveCart();
        }
      };
    });

    cartItemsContainer.querySelectorAll('.inc-qty-cart').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const button = e.target.closest('.inc-qty-cart');
        const idx = parseInt(button.dataset.index, 10);
        if (!isNaN(idx) && cart[idx]) {
          cart[idx].qty++;
          saveCart();
        }
      };
    });

    cartItemsContainer.querySelectorAll('.remove-cart-item').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const button = e.target.closest('.remove-cart-item');
        const idx = parseInt(button.dataset.index, 10);
        if (!isNaN(idx) && cart[idx]) {
          cart.splice(idx, 1);
          saveCart();
        }
      };
    });
  };

  // Re-sync cart on pageshow to handle browser back button and mobile BFCache
  window.addEventListener('pageshow', () => {
    try {
      const saved = localStorage.getItem('kamadhenu_cart');
      cart = saved ? JSON.parse(saved) : [];
    } catch (e) {
      cart = [];
    }
    renderCart();
    updateBadges();
  });

  // Coupon & Referral Engine
  if (applyCouponBtn) {
    applyCouponBtn.addEventListener('click', async () => {
      const code = (couponInput.value || '').trim().toUpperCase();
      couponFeedback.className = 'coupon-feedback';
      
      if (!code) {
        couponFeedback.textContent = 'Please enter a coupon or referral code.';
        couponFeedback.classList.add('error');
        return;
      }

      // 1. Instant check for local static coupons
      if (validCoupons[code]) {
        currentCoupon = code;
        couponFeedback.textContent = `Coupon "${code}" applied successfully! You got ${validCoupons[code].value}${validCoupons[code].type === 'percent' ? '% off' : ' Rs off'}.`;
        couponFeedback.classList.add('success');
        renderCart();
        renderCheckoutSummary();
        return;
      }

      // 2. Dynamic check for live admin-created referral offers & reward codes
      try {
        applyCouponBtn.disabled = true;
        couponFeedback.textContent = 'Verifying referral code...';
        couponFeedback.className = 'coupon-feedback';

        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const res = await fetchWithTimeout('/api/referrals/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            subtotal,
            items: cart.map(i => ({ productId: i.id, weightVariant: i.size, quantity: i.qty })),
            customerMobile: document.getElementById('chkPhone')?.value || null
          })
        }, 8000);

        const data = await res.json();
        if (data.success && data.valid) {
          currentCoupon = code;
          validCoupons[code] = {
            type: data.discountType,
            value: data.discountValue
          };
          couponFeedback.textContent = data.message || `Referral code "${code}" applied! You got ${data.discountValue}% off.`;
          couponFeedback.classList.add('success');
          renderCart();
          renderCheckoutSummary();
        } else {
          couponFeedback.textContent = data.message || 'Invalid coupon or referral code. Try "KAMADHENU10".';
          couponFeedback.classList.add('error');
        }
      } catch (err) {
        couponFeedback.textContent = 'Unable to verify code right now. Please try again.';
        couponFeedback.classList.add('error');
      } finally {
        applyCouponBtn.disabled = false;
      }
    });
  }

  // Add Item to local cart helper
  const addItemToCart = (productId, size, qty = 1, openDrawer = false) => {
    const dbProduct = productDatabase[productId];
    if (!dbProduct) return;

    if (dbProduct.stockStatus === 'OUT_OF_STOCK') {
      alert(`Sorry, "${dbProduct.name}" is currently out of stock.`);
      return;
    }

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
  function openCart(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (cartOverlay) cartOverlay.classList.add('active');
    if (cartDrawer) cartDrawer.classList.add('active');
    document.body.classList.add('overflow-hidden');
  }

  function closeCart(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (cartOverlay) cartOverlay.classList.remove('active');
    if (cartDrawer) cartDrawer.classList.remove('active');
    // Only remove overflow-hidden if mobile-nav isn't active
    if (mobileNav && !mobileNav.classList.contains('active')) {
      document.body.classList.remove('overflow-hidden');
    }
  }

  // Expose globally for inline buttons and mobile handlers
  window.openCart = openCart;
  window.closeCart = closeCart;

  openCartBtns.forEach(btn => {
    btn.addEventListener('click', openCart);
  });
  if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

  /* ==========================================================================
     Customer Memory & Order History Architecture
     ========================================================================== */
  const openOrdersBtns = document.querySelectorAll('.open-orders-btn');
  const ordersOverlay = document.getElementById('ordersOverlay');
  const ordersDrawer = document.getElementById('ordersDrawer');
  const closeOrdersBtn = document.getElementById('closeOrdersBtn');
  const customerOrdersContainer = document.getElementById('customerOrdersContainer');
  const customerWelcomeSub = document.getElementById('customerWelcomeSub');
  const customerLogoutBtn = document.getElementById('customerLogoutBtn');
  const openOrdersNavBtn = document.getElementById('openOrdersBtn');
  const mobileOrdersLink = document.getElementById('mobileOrdersLink');
  const mobileOrdersLabel = document.getElementById('mobileOrdersLabel');
  const savedAddressesSection = document.getElementById('savedAddressesSection');
  const savedAddressesList = document.getElementById('savedAddressesList');
  const btnNewAddress = document.getElementById('btnNewAddress');
  let currentCustomer = null;

  function openOrders() {
    closeCart();
    if (ordersOverlay) ordersOverlay.classList.add('active');
    if (ordersDrawer) ordersDrawer.classList.add('active');
    document.body.classList.add('overflow-hidden');
    loadCustomerOrders();
  }

  function closeOrders() {
    if (ordersOverlay) ordersOverlay.classList.remove('active');
    if (ordersDrawer) ordersDrawer.classList.remove('active');
    if (!mobileNav || !mobileNav.classList.contains('active')) {
      document.body.classList.remove('overflow-hidden');
    }
  }

  if (closeOrdersBtn) closeOrdersBtn.addEventListener('click', closeOrders);
  if (ordersOverlay) ordersOverlay.addEventListener('click', closeOrders);
  openOrdersBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openOrders();
    });
  });

  if (customerLogoutBtn) {
    customerLogoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/customer/logout', { method: 'POST' });
      } catch (e) {}
      currentCustomer = null;
      if (openOrdersNavBtn) openOrdersNavBtn.style.display = 'none';
      if (mobileOrdersLink) mobileOrdersLink.style.display = 'none';
      if (savedAddressesSection) savedAddressesSection.style.display = 'none';
      closeOrders();
      showToast('Signed out of customer memory');
    });
  }

  async function checkCustomerSession() {
    try {
      const savedMobile = localStorage.getItem('kamadhenu_customer_mobile') || '';
      const query = savedMobile ? `?mobile=${encodeURIComponent(savedMobile)}` : '';
      const res = await fetch(`/api/customer/me${query}`, { credentials: 'same-origin' });
      const data = await res.json();
      if (data && data.authenticated && data.customer) {
        currentCustomer = data;
        const firstName = data.customer.name.trim().split(' ')[0] || 'Customer';

        if (openOrdersNavBtn) {
          openOrdersNavBtn.style.display = 'inline-flex';
          openOrdersNavBtn.title = `My Orders (${firstName})`;
        }
        if (mobileOrdersLink) {
          mobileOrdersLink.style.display = 'flex';
          if (mobileOrdersLabel) {
            mobileOrdersLabel.textContent = `My Orders (${data.ordersCount || 0})`;
          }
        }
        if (customerWelcomeSub) {
          customerWelcomeSub.textContent = `Welcome back, ${firstName}! • ${data.customer.mobile}`;
        }

        // Pre-fill checkout contact info if empty
        const chkName = document.getElementById('chkName');
        const chkPhone = document.getElementById('chkPhone');
        const chkEmail = document.getElementById('chkEmail');
        if (chkName && !chkName.value) chkName.value = data.customer.name;
        if (chkPhone && !chkPhone.value) chkPhone.value = data.customer.mobile;
        if (chkEmail && !chkEmail.value) chkEmail.value = data.customer.email;

        // Render saved addresses if available
        if (data.savedAddresses && data.savedAddresses.length > 0) {
          renderSavedAddresses(data.savedAddresses);
        }
      } else {
        // If customer has saved mobile from previous purchase, make My Orders link visible in mobile menu
        if (savedMobile && mobileOrdersLink) {
          mobileOrdersLink.style.display = 'flex';
        }
      }
    } catch (err) {
      console.debug('No returning customer session:', err);
    }
  }

  function renderSavedAddresses(addresses) {
    if (!savedAddressesSection || !savedAddressesList) return;
    savedAddressesList.innerHTML = '';

    if (!addresses || addresses.length === 0) {
      savedAddressesSection.style.display = 'none';
      return;
    }

    savedAddressesSection.style.display = 'block';

    addresses.forEach((addr, idx) => {
      const card = document.createElement('div');
      card.className = `saved-addr-card ${idx === 0 ? 'selected' : ''}`;
      card.innerHTML = `
        <input type="radio" name="selectedSavedAddress" class="saved-addr-radio" id="savedAddr_${addr.id}" ${idx === 0 ? 'checked' : ''}>
        <div class="saved-addr-details">
          <div class="saved-addr-recipient">
            <span>${addr.recipientName || currentCustomer?.customer?.name} (${addr.mobileNumber || currentCustomer?.customer?.mobile})</span>
            <span style="font-family:monospace; color:#8c7851;">${addr.pincode}</span>
          </div>
          <div>${addr.addressLine1}${addr.addressLine2 ? ', ' + addr.addressLine2 : ''}${addr.area ? ', ' + addr.area : ''}</div>
          <div style="color:#718096; font-size:0.75rem;">${addr.city}, ${addr.state}${addr.landmark ? ' • ' + addr.landmark : ''}</div>
        </div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.saved-addr-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const radio = card.querySelector('.saved-addr-radio');
        if (radio) radio.checked = true;

        // Populate form inputs
        const chkName = document.getElementById('chkName');
        const chkPhone = document.getElementById('chkPhone');
        const chkAddress = document.getElementById('chkAddress');
        const chkArea = document.getElementById('chkArea');
        const chkCity = document.getElementById('chkCity');
        const chkState = document.getElementById('chkState');
        const chkPincode = document.getElementById('chkPincode');
        const chkLandmark = document.getElementById('chkLandmark');

        if (chkName && addr.recipientName) chkName.value = addr.recipientName;
        if (chkPhone && addr.mobileNumber) chkPhone.value = addr.mobileNumber;
        if (chkAddress) chkAddress.value = addr.addressLine1;
        if (chkArea) chkArea.value = addr.area || '';
        if (chkCity) chkCity.value = addr.city || 'Bengaluru';
        if (chkState) chkState.value = addr.state || 'Karnataka';
        if (chkPincode) chkPincode.value = addr.pincode;
        if (chkLandmark) chkLandmark.value = addr.landmark || '';

        // Trigger shipping calculation and Bangalore COD check
        if (chkPincode && chkPincode.value.trim().length === 6) {
          calculateShippingRate(chkPincode.value.trim());
        }
        if (typeof updateCodBangaloreAvailability === 'function') {
          updateCodBangaloreAvailability(addr.pincode);
        }
      });

      savedAddressesList.appendChild(card);
    });

    // Auto-populate first address if address input is currently blank
    const firstAddr = addresses[0];
    const chkAddress = document.getElementById('chkAddress');
    if (firstAddr && chkAddress && !chkAddress.value) {
      const chkName = document.getElementById('chkName');
      const chkPhone = document.getElementById('chkPhone');
      const chkArea = document.getElementById('chkArea');
      const chkCity = document.getElementById('chkCity');
      const chkState = document.getElementById('chkState');
      const chkPincode = document.getElementById('chkPincode');
      const chkLandmark = document.getElementById('chkLandmark');

      if (chkName && firstAddr.recipientName) chkName.value = firstAddr.recipientName;
      if (chkPhone && firstAddr.mobileNumber) chkPhone.value = firstAddr.mobileNumber;
      chkAddress.value = firstAddr.addressLine1;
      if (chkArea) chkArea.value = firstAddr.area || '';
      if (chkCity) chkCity.value = firstAddr.city || 'Bengaluru';
      if (chkState) chkState.value = firstAddr.state || 'Karnataka';
      if (chkPincode) chkPincode.value = firstAddr.pincode;
      if (chkLandmark) chkLandmark.value = firstAddr.landmark || '';

      if (chkPincode && chkPincode.value.trim().length === 6) {
        calculateShippingRate(chkPincode.value.trim());
      }
      if (typeof updateCodBangaloreAvailability === 'function') {
        updateCodBangaloreAvailability(firstAddr.pincode);
      }
    }
  }

  if (btnNewAddress) {
    btnNewAddress.addEventListener('click', () => {
      document.querySelectorAll('.saved-addr-card').forEach(c => c.classList.remove('selected'));
      document.querySelectorAll('.saved-addr-radio').forEach(r => r.checked = false);
      const chkAddress = document.getElementById('chkAddress');
      const chkArea = document.getElementById('chkArea');
      const chkPincode = document.getElementById('chkPincode');
      const chkLandmark = document.getElementById('chkLandmark');
      if (chkAddress) chkAddress.value = '';
      if (chkArea) chkArea.value = '';
      if (chkPincode) chkPincode.value = '';
      if (chkLandmark) chkLandmark.value = '';
      if (chkAddress) chkAddress.focus();
    });
  }

  async function loadCustomerOrders() {
    if (!customerOrdersContainer) return;
    customerOrdersContainer.innerHTML = `
      <div style="text-align:center; padding: 40px 20px; color:#8c7851;">
        <p style="font-weight:600; font-size:0.9rem;">Fetching your order history...</p>
      </div>
    `;

    try {
      const savedMobile = localStorage.getItem('kamadhenu_customer_mobile') || '';
      const savedOrder = localStorage.getItem('kamadhenu_last_order') || '';
      const query = savedMobile ? `?mobile=${encodeURIComponent(savedMobile)}` : (savedOrder ? `?orderNumber=${encodeURIComponent(savedOrder)}` : '');
      const res = await fetch(`/api/customer/orders${query}`, { credentials: 'same-origin' });
      const data = await res.json();

      if (!data.success || !data.orders || data.orders.length === 0) {
        customerOrdersContainer.innerHTML = `
          <div style="text-align:center; padding: 40px 20px; color:#718096;">
            <div style="font-size: 2.8rem; margin-bottom: 12px;">🍯</div>
            <h4 style="font-size: 1.1rem; color: #2d3748; margin-bottom: 6px;">Find Your Order History</h4>
            <p style="font-size: 0.85rem; max-width: 290px; margin: 0 auto 16px; color:#718096;">
              Enter your mobile number to view your ordered products, invoices & tracking status.
            </p>
            <div style="display:flex; gap:8px; max-width:280px; margin:0 auto 16px;">
              <input type="tel" id="inputOrdersPhone" class="form-control" placeholder="10-digit mobile number" maxlength="10" style="padding:9px 12px; font-size:0.85rem;" value="${savedMobile}">
              <button class="btn btn-gold" id="btnLookupOrders" style="padding:9px 16px; font-size:0.85rem; white-space:nowrap;">Search</button>
            </div>
            <button class="btn btn-charcoal" id="btnShopFromOrders" style="padding: 9px 22px; font-size:0.85rem;">Explore Honey Collection</button>
          </div>
        `;
        const btnLookup = document.getElementById('btnLookupOrders');
        const inputPhone = document.getElementById('inputOrdersPhone');
        if (btnLookup && inputPhone) {
          btnLookup.addEventListener('click', () => {
            const p = inputPhone.value.trim().replace(/\D/g, '');
            if (p.length === 10) {
              try { localStorage.setItem('kamadhenu_customer_mobile', p); } catch (e) {}
              loadCustomerOrders();
            } else {
              alert('Please enter your 10-digit WhatsApp mobile number');
            }
          });
        }
        const btnShop = document.getElementById('btnShopFromOrders');
        if (btnShop) {
          btnShop.addEventListener('click', () => {
            closeOrders();
            const prodSection = document.getElementById('products');
            if (prodSection) prodSection.scrollIntoView({ behavior: 'smooth' });
          });
        }
        return;
      }

      customerOrdersContainer.innerHTML = '';

      data.orders.forEach(order => {
        const card = document.createElement('div');
        card.className = 'customer-order-card';

        const dateStr = new Date(order.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });

        let statusClass = 'status-new';
        if (order.orderStatus === 'CONFIRMED') statusClass = 'status-confirmed';
        else if (order.orderStatus === 'SHIPPED') statusClass = 'status-shipped';
        else if (order.orderStatus === 'DELIVERED') statusClass = 'status-delivered';
        else if (order.orderStatus === 'CANCELLED') statusClass = 'status-cancelled';

        // Products HTML
        const productsHtml = (order.items || []).map(it => `
          <div class="order-product-row">
            <div>
              <span class="order-product-name">${it.productNameSnapshot || 'Honey'}</span>
              <span class="order-product-meta">(${it.weightVariant}) × ${it.quantity}</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-weight:700; color:#2d3748;">₹${it.totalPrice}</span>
              <button class="btn-buy-again btn-item-reorder" 
                data-product-id="${it.productId}" 
                data-size="${it.weightVariant}" 
                data-qty="${it.quantity}" 
                title="Reorder ${it.productNameSnapshot}">
                Buy Again
              </button>
            </div>
          </div>
        `).join('');

        // Address HTML
        const addr = order.shippingAddress;
        const addrStr = addr ? `${addr.addressLine1}, ${addr.city} (${addr.pincode})` : 'Delivery address recorded';

        // Tracking HTML
        let trackingHtml = '';
        if (order.shipment && order.shipment.trackingNumber) {
          trackingHtml = `
            <div style="margin-top: 8px; padding: 8px 12px; background: #ebf8ff; border-radius: 8px; font-size: 0.78rem; color: #2b6cb0; display:flex; justify-content:space-between; align-items:center;">
              <span>Courier: <b>${order.shipment.courierProvider}</b> (${order.shipment.trackingNumber})</span>
              ${order.shipment.trackingUrl ? `<a href="${order.shipment.trackingUrl}" target="_blank" rel="noopener" style="color:#2b6cb0; font-weight:700; text-decoration:underline;">Track Package</a>` : ''}
            </div>
          `;
        }

        card.innerHTML = `
          <div class="order-card-header">
            <div>
              <span class="order-number-pill">${order.orderNumber}</span>
              <span style="font-size:0.75rem; color:#a0aec0; margin-left:8px;">${dateStr}</span>
            </div>
            <span class="order-status-badge ${statusClass}">${order.orderStatus}</span>
          </div>

          <div class="order-card-products">
            ${productsHtml}
          </div>

          <div style="font-size:0.75rem; color:#718096; background:#f7fafc; padding:8px 12px; border-radius:8px;">
            📍 <b>Delivered to:</b> ${addrStr}
          </div>

          ${trackingHtml}

          <div class="order-card-footer">
            <span style="font-size:0.8rem; color:#718096;">
              Payment: <b style="color:#2d3748;">${order.paymentMethod}</b> (${order.paymentStatus})
            </span>
            <div style="display:flex; align-items:center; gap:10px;">
              <span class="order-total-amount">₹${order.total}</span>
            </div>
          </div>
        `;

        // Wire Reorder buttons
        card.querySelectorAll('.btn-item-reorder').forEach(b => {
          b.addEventListener('click', () => {
            const pId = b.getAttribute('data-product-id');
            const pSize = b.getAttribute('data-size');
            const pQty = parseInt(b.getAttribute('data-qty') || '1', 10);
            
            // Add with current live prices
            addItemToCart(pId, pSize, pQty, true);
            closeOrders();
            showToast(`Added ${pSize} to cart at current live price!`);
          });
        });

        customerOrdersContainer.appendChild(card);
      });
    } catch (err) {
      customerOrdersContainer.innerHTML = `
        <div style="text-align:center; padding: 40px 20px; color:#e53e3e;">
          <p style="font-weight:600; font-size:0.9rem;">Unable to load orders right now.</p>
          <button class="btn btn-charcoal" id="btnRetryOrders" style="margin-top:12px; padding:6px 16px;">Try Again</button>
        </div>
      `;
      const retryBtn = document.getElementById('btnRetryOrders');
      if (retryBtn) retryBtn.addEventListener('click', loadCustomerOrders);
    }
  }

  /* ==========================================================================
     Real-Time Product Stock & Availability Synchronization
     ========================================================================== */
  const updateHoneycombStockDisplay = () => {
    ['p3', 'p4'].forEach(id => {
      const p = productDatabase[id];
      if (!p) return;
      const card = document.querySelector(`.upcoming-card[data-product-id="${id}"]`);
      if (!card) return;

      const stockPill = card.querySelector('.stock-pill');
      const addBtn = card.querySelector('.upcoming-add-cart-btn');
      const buyBtn = card.querySelector('.upcoming-buy-now-btn');

      if (stockPill) {
        if (p.stockStatus === 'OUT_OF_STOCK') {
          stockPill.innerHTML = `
            <span class="stock-dot" style="width:8px; height:8px; border-radius:50%; background:#e53e3e; box-shadow:0 0 8px #e53e3e; display:inline-block;"></span>
            <span class="stock-text" style="color:#e53e3e !important; font-size:0.78rem; font-weight:700; text-transform:uppercase;">Sold Out</span>
          `;
          stockPill.style.background = 'rgba(229, 62, 62, 0.15)';
          stockPill.style.borderColor = 'rgba(229, 62, 62, 0.4)';
        } else if (p.stockStatus === 'RESTOCKING_SOON') {
          stockPill.innerHTML = `
            <span class="stock-dot" style="width:8px; height:8px; border-radius:50%; background:#dd6b20; box-shadow:0 0 8px #dd6b20; display:inline-block;"></span>
            <span class="stock-text" style="color:#dd6b20 !important; font-size:0.78rem; font-weight:700; text-transform:uppercase;">Restocking in ${p.restockDays || 3} Days</span>
          `;
          stockPill.style.background = 'rgba(221, 107, 32, 0.15)';
          stockPill.style.borderColor = 'rgba(221, 107, 32, 0.4)';
        } else {
          stockPill.innerHTML = `
            <span class="stock-dot" style="width:8px; height:8px; border-radius:50%; background:#2ecc71; box-shadow:0 0 8px #2ecc71; display:inline-block;"></span>
            <span class="stock-text" style="color:#2ecc71 !important; font-size:0.78rem; font-weight:700; text-transform:uppercase;">Fresh Apiary Stock</span>
          `;
          stockPill.style.background = 'rgba(39, 174, 96, 0.18)';
          stockPill.style.borderColor = 'rgba(46, 204, 113, 0.45)';
        }
      }

      if (p.stockStatus === 'OUT_OF_STOCK') {
        if (addBtn) { addBtn.disabled = true; addBtn.classList.add('btn-disabled'); addBtn.innerHTML = '<span>Sold Out</span>'; }
        if (buyBtn) { buyBtn.disabled = true; buyBtn.classList.add('btn-disabled'); buyBtn.innerHTML = '<span>Out of Stock</span>'; }
      } else if (p.stockStatus === 'RESTOCKING_SOON' && !p.canPreorder) {
        if (addBtn) { addBtn.disabled = true; addBtn.classList.add('btn-disabled'); addBtn.innerHTML = `<span>Restocking Soon</span>`; }
        if (buyBtn) { buyBtn.disabled = true; buyBtn.classList.add('btn-disabled'); buyBtn.innerHTML = `<span>Restocking in ${p.restockDays || 3}d</span>`; }
      } else {
        if (addBtn) { addBtn.disabled = false; addBtn.classList.remove('btn-disabled'); addBtn.innerHTML = '<span>Add to Cart</span>'; }
        if (buyBtn) { buyBtn.disabled = false; buyBtn.classList.remove('btn-disabled'); buyBtn.innerHTML = '<span>Buy Now</span>'; }
      }
    });
  };

  const updateCardStockBadgeInPlace = (productId) => {
    const p = productDatabase[productId];
    if (!p) return;
    const card = document.getElementById(`product-${productId}`);
    if (!card) return;
    const badge = card.querySelector('.product-badge');
    if (badge) {
      if (p.stockStatus === 'OUT_OF_STOCK') {
        badge.className = 'product-badge out-of-stock';
        badge.textContent = 'Sold Out';
      } else if (p.stockStatus === 'RESTOCKING_SOON') {
        badge.className = 'product-badge restocking';
        badge.textContent = `⏳ ${p.badgeText || `Restocking in ${p.restockDays || 3} days`}`;
      } else {
        badge.className = 'product-badge';
        badge.textContent = p.badgeText || (p.category === 'raw' ? 'Organic' : 'Deluxe');
      }
    }
  };

  const syncRealtimeStock = async () => {
    try {
      const res = await fetch('/api/products/inventory', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.inventory) {
        Object.keys(data.inventory).forEach(id => {
          if (productDatabase[id]) {
            const remote = data.inventory[id];
            productDatabase[id].stockStatus = remote.stockStatus;
            productDatabase[id].restockDays = remote.restockDays;
            productDatabase[id].restockNote = remote.restockNote;
            productDatabase[id].badgeText = remote.badgeText;
            productDatabase[id].canPreorder = remote.canPreorder;
            updateCardStockBadgeInPlace(id);
          }
        });
        updateHoneycombStockDisplay();
      }
    } catch (err) {
      console.warn('Realtime stock sync error:', err);
    }
  };

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
      // Honeycomb products are showcased in their dedicated luxury section below
      if (product.category === 'honeycomb') return;

      // Filter out search matches
      const matchesSearch = product.name.toLowerCase().includes(searchQuery) || product.baseDesc.toLowerCase().includes(searchQuery);
      // Filter out category tabs
      const matchesCategory = activeCategory === 'all' || product.category === activeCategory;

      if (!matchesSearch || !matchesCategory) return;

      const productCard = document.createElement('div');
      productCard.className = 'product-card reveal reveal-fade-up';
      productCard.id = `product-${product.id}`;
      productCard.dataset.productId = product.id;

      // Select ₹399 variant as default active size if available (Pure Honey 500g, Dry Fruits 250g)
      const defaultSize = Object.entries(product.prices).find(([_, pr]) => pr === 399)?.[0] || Object.keys(product.prices)[0] || '500g';
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

      // Stock status styling & logic
      const isOutOfStock = product.stockStatus === 'OUT_OF_STOCK';
      const isRestocking = product.stockStatus === 'RESTOCKING_SOON';

      let badgeHtml = '';
      if (isOutOfStock) {
        badgeHtml = '<div class="product-badge out-of-stock">Sold Out</div>';
      } else if (isRestocking) {
        badgeHtml = `<div class="product-badge restocking">⏳ ${product.badgeText || `Restocking in ${product.restockDays || 3} days`}</div>`;
      } else {
        badgeHtml = `<div class="product-badge">${product.badgeText || (product.category === 'raw' ? 'Organic' : 'Deluxe')}</div>`;
      }

      let restockAlertHtml = '';
      if (isRestocking) {
        restockAlertHtml = `
          <div class="product-restock-alert">
            <span>🍯 ${product.restockNote || `Stock will be restocked within ${product.restockDays || 3} days`}</span>
          </div>
        `;
      }

      let actionsHtml = '';
      if (isOutOfStock) {
        actionsHtml = `
          <button class="btn btn-add-cart btn-disabled" disabled style="opacity:0.55; cursor:not-allowed;">
            Out of Stock
          </button>
          <div class="product-actions-row">
            <button class="btn btn-gold btn-disabled" disabled style="opacity:0.55; cursor:not-allowed;">
              Sold Out
            </button>
            <button class="btn btn-charcoal wa-bulk-order-trigger" title="Inquire for Bulk / Wholesale Orders">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.244 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.501-5.734-1.453L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.623-1.023-5.09-2.885-6.956C16.63 2.029 14.162.999 11.536.999c-5.438 0-9.863 4.372-9.867 9.802-.001 1.767.487 3.491 1.415 5.011L2.091 22.09l6.556-1.714z" />
              </svg>
              Bulk Inquiry
            </button>
          </div>
        `;
      } else if (isRestocking && !product.canPreorder) {
        actionsHtml = `
          <button class="btn btn-add-cart btn-disabled" disabled style="opacity:0.6; cursor:not-allowed;">
            ⏳ Restocking Soon
          </button>
          <div class="product-actions-row">
            <button class="btn btn-gold btn-disabled" disabled style="opacity:0.6; cursor:not-allowed;">
              Restocking in ${product.restockDays || 3}d
            </button>
            <button class="btn btn-charcoal wa-bulk-order-trigger" title="Inquire for Bulk / Wholesale Orders">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.244 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.501-5.734-1.453L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.623-1.023-5.09-2.885-6.956C16.63 2.029 14.162.999 11.536.999c-5.438 0-9.863 4.372-9.867 9.802-.001 1.767.487 3.491 1.415 5.011L2.091 22.09l6.556-1.714z" />
              </svg>
              Bulk Inquiry
            </button>
          </div>
        `;
      } else {
        actionsHtml = `
          <button class="btn btn-add-cart add-to-cart-trigger">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            ${isRestocking ? 'Pre-Order Now' : 'Add to Cart'}
          </button>
          <div class="product-actions-row">
            <button class="btn btn-gold buy-now-trigger" title="Buy Now & Proceed to Checkout">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
              ${isRestocking ? 'Pre-Order' : 'Buy Now'}
            </button>
            <button class="btn btn-charcoal wa-bulk-order-trigger" title="Inquire for Bulk / Wholesale Orders">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.244 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.501-5.734-1.453L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.623-1.023-5.09-2.885-6.956C16.63 2.029 14.162.999 11.536.999c-5.438 0-9.863 4.372-9.867 9.802-.001 1.767.487 3.491 1.415 5.011L2.091 22.09l6.556-1.714z" />
              </svg>
              Bulk Inquiry
            </button>
          </div>
        `;
      }

      productCard.innerHTML = `
        ${badgeHtml}
        <button class="wishlist-btn" data-product-id="${product.id}" title="Add to Wishlist">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>
        <button class="share-product-btn" data-product-id="${product.id}" data-product-name="${product.name}" title="Share this product">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185z" />
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
          ${restockAlertHtml}
          
          <div class="weight-selector">
            ${Object.keys(product.prices).map(size => `
              <button class="weight-pill ${size === defaultSize ? 'active' : ''}" data-size="${size}">${size}</button>
            `).join('')}
          </div>

          <div class="price-qty-row">
            <div class="price-display">
              <span>Price</span>
              <h4 class="card-price-text">₹${sizePrice}</h4>
              <span class="delivery-notice">(Delivery charges calculated at checkout)</span>
            </div>
          </div>
          <div class="product-actions">
            ${actionsHtml}
          </div>
        </div>
      `;

      productGrid.appendChild(productCard);

      // Wire up card thumbnail gallery clicks & automatic slideshow
      if (hasGallery && product.images.length > 1) {
        const thumbBtns = productCard.querySelectorAll('.thumb-nav-btn');
        const mainImg = productCard.querySelector('.product-media img');
        let currentImgIdx = 0;
        
        const switchImage = (index) => {
          currentImgIdx = (index + product.images.length) % product.images.length;
          thumbBtns.forEach(b => b.classList.remove('active'));
          const btn = thumbBtns[currentImgIdx];
          if (btn && mainImg) {
            btn.classList.add('active');
            mainImg.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            mainImg.style.opacity = '0.7';
            setTimeout(() => {
              mainImg.src = btn.dataset.imgSrc;
              mainImg.style.opacity = '1';
            }, 150);
          }
        };

        // Automatically change image when card is visible on screen
        let autoSlideTimer = null;
        const startAutoSlide = () => {
          if (autoSlideTimer || document.hidden) return;
          autoSlideTimer = setInterval(() => {
            if (!document.hidden) switchImage(currentImgIdx + 1);
          }, 4500);
        };
        const stopAutoSlide = () => {
          if (autoSlideTimer) {
            clearInterval(autoSlideTimer);
            autoSlideTimer = null;
          }
        };

        // Pause on user hover to inspect, resume when mouse leaves
        productCard.addEventListener('mouseenter', stopAutoSlide);
        productCard.addEventListener('mouseleave', () => {
          if (cardIsVisible) startAutoSlide();
        });

        let cardIsVisible = false;
        const cardObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            cardIsVisible = entry.isIntersecting;
            if (cardIsVisible) {
              startAutoSlide();
            } else {
              stopAutoSlide();
            }
          });
        }, { threshold: 0.15 });
        cardObserver.observe(productCard);

        thumbBtns.forEach((btn, idx) => {
          btn.addEventListener('click', (e) => {
            if (e) e.stopPropagation();
            stopAutoSlide();
            switchImage(idx);
            if (cardIsVisible) startAutoSlide();
          });
        });
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
          
          // 1. Add item to cart immediately and automatically open cart page/drawer
          addItemToCart(product.id, selectedSize, 1, true);
          openCart();
          
          // 2. Trigger silky smooth celebration if available
          if (window.CartCelebration) {
            window.CartCelebration.trigger(addToCartBtn, product, e, isFirstItem);
          }
          
          setTimeout(() => {
            addToCartBtn.innerHTML = originalContent;
            addToCartBtn.classList.remove('btn-added-state');
          }, 1200);
        });
      }

      // Buy Now button
      const buyNowBtn = productCard.querySelector('.buy-now-trigger');
      if (buyNowBtn) {
        buyNowBtn.addEventListener('click', () => {
          addItemToCart(product.id, selectedSize, 1, false);
          openCheckout();
        });
      }

      // Bulk Orders WhatsApp inquiry trigger
      const bulkOrderBtn = productCard.querySelector('.wa-bulk-order-trigger');
      if (bulkOrderBtn) {
        bulkOrderBtn.addEventListener('click', () => {
          const bulkMsg = `Hello Kamadhenu Honey Farms, I am interested in placing a bulk/wholesale honey order. Please share your bulk pricing and details.`;
          const waUrl = `https://wa.me/${PRIMARY_WHATSAPP}?text=${encodeURIComponent(bulkMsg)}`;
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

  // Universal Share Product click listener (handles regular products and upcoming honeycomb cards)
  document.addEventListener('click', async (e) => {
    const shareBtn = e.target.closest('.share-product-btn');
    if (!shareBtn) return;

    e.stopPropagation();
    e.preventDefault();

    const productId = shareBtn.dataset.productId;
    const product = productDatabase[productId];
    const productName = shareBtn.dataset.productName || (product ? product.name : 'Pure Honey');
    const shareUrl = `https://kamadhenuhoneyfarms.in/#product-${productId}`;

    // Luxury professional message tailored per product
    let headerTitle = 'PURE RAW HONEY';
    let productDesc = 'Harvested fresh, unheated and unfiltered — retaining natural pollen, active enzymes, and rich wildflower aroma directly from the comb.';
    let points = '✓ 100% Pure, Raw & Unadulterated (Zero Added Sugar or Jaggery)\n✓ Rich in Natural Immunity Boosters, Live Enzymes & Antioxidants\n✓ Certified Food Safety & Lab Tested Purity\n✓ Sustainably Harvested by Local Beekeepers';

    if (productId === 'p2') {
      headerTitle = 'DRY FRUITS RAW HONEY';
      productDesc = 'A rich nutritional blend of 100% pure raw apiary honey loaded with premium Californian almonds, cashews, crunchy pistachios & walnuts.';
      points = '✓ 100% Pure Raw Honey Infused with Premium Dry Fruits\n✓ Rich in Plant Protein, Healthy Omega Fats, Iron & Daily Energy\n✓ Ideal Natural Health Tonic for Kids, Adults & Elders\n✓ Zero Preservatives, Syrups or Artificial Additives';
    } else if (productId === 'p3') {
      headerTitle = 'BEE-CRAFTED HONEY COMB JAR';
      productDesc = 'A breakthrough in natural beekeeping! Bees naturally build delicate honeycomb cells directly inside the glass jar and fill it with pure raw honey.';
      points = '✓ Built by Bees Inside the Jar — Zero Human Interference\n✓ 100% Raw Comb Honey + Liquid Honey Dual Delight\n✓ Unheated, Unprocessed & Straight from Nature\'s Hive\n✓ Edible Honeycomb Wax Rich in Natural Propolis';
    } else if (productId === 'p4') {
      headerTitle = 'RAW HONEY COMB BOX';
      productDesc = 'Fresh raw honeycomb cut straight from active hives. Experience honey exactly as bees eat it — sealed inside virgin wax cells.';
      points = '✓ 100% Pure Raw Honeycomb Straight from the Hive\n✓ 100% Edible Natural Beeswax Rich in Vitamin A & Propolis\n✓ Unfiltered, Unpasteurized & 100% Intact Hive Freshness\n✓ Bursting with Fragrant Wildflower Nectar';
    }

    const professionalMessage = 
`🍯 *Kamadhenu Honey Farms* | 100% Pure & Raw Apiary Harvest
Direct from our bee colonies in Taverekere, Magadi Road, Bangalore

━━━━━━━━━━━━━━━━━━━━━━
🐝 *${headerTitle}*
━━━━━━━━━━━━━━━━━━━━━━
${productDesc}

✨ *Pure Apiary Highlights:*
${points}

🚚 Safe Doorstep Delivery Across India (Special Bangalore COD Available)
🛡️ 100% Purity & Authenticity Guarantee

👉 *Order Directly from Apiary:*
${shareUrl}

📞 WhatsApp / Call Support: +91 9980114675`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${productName} — Kamadhenu Honey Farms`,
          text: professionalMessage
        });
      } catch (err) {
        if (err.name !== 'AbortError') console.warn('Share failed:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(professionalMessage);
        shareBtn.title = 'Link copied!';
        const origInner = shareBtn.innerHTML;
        shareBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>`;
        if (typeof showToast === 'function') {
          showToast(`📋 Professional product details & link copied to clipboard!`);
        }
        setTimeout(() => {
          shareBtn.innerHTML = origInner;
          shareBtn.title = 'Share this product';
        }, 1800);
      } catch {
        window.open(`https://wa.me/?text=${encodeURIComponent(professionalMessage)}`, '_blank');
      }
    }
  });

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
     Checkout Modal UI & Razorpay / COD Integration
     ========================================================================== */
  let currentShippingCharge = 0;
  let isShippingCalculated = false;
  let currentShippingDetails = null;
  let pincodeCalculationTimer = null;

  const chkPincodeInput = document.getElementById('chkPincode');
  const checkoutShippingEl = document.getElementById('checkoutShipping');
  const checkoutShippingNoticeEl = document.getElementById('checkoutShippingNotice');
  const checkoutSubmitBtnText = document.getElementById('checkoutSubmitBtnText');
  const checkoutErrorMsg = document.getElementById('checkoutErrorMsg');

  const showCheckoutError = (msg) => {
    if (!checkoutErrorMsg) return;
    if (msg) {
      checkoutErrorMsg.textContent = msg;
      checkoutErrorMsg.style.display = 'block';
    } else {
      checkoutErrorMsg.style.display = 'none';
    }
  };

  const calculateShippingRate = async (pincodeVal) => {
    const cleanPin = (pincodeVal || '').replace(/\D/g, '');

    // Special test pincode 000000 — bypass to free delivery
    if (cleanPin === '000000') {
      isShippingCalculated = true;
      currentShippingCharge = 0;
      currentShippingDetails = { courierName: '🧪 Test Mode', estimatedDays: 'Immediate (Test)' };
      if (checkoutShippingEl) {
        checkoutShippingEl.textContent = 'FREE (Test Mode)';
        checkoutShippingEl.style.color = '#27ae60';
      }
      if (checkoutShippingNoticeEl) checkoutShippingNoticeEl.innerHTML = '🧪 <strong>Test Mode</strong> &bull; Free delivery bypassed';
      renderCheckoutSummary();
      return;
    }

    if (cleanPin.length !== 6) {
      isShippingCalculated = false;
      currentShippingCharge = 0;
      currentShippingDetails = null;
      if (checkoutShippingEl) {
        checkoutShippingEl.textContent = 'Enter 6-digit pincode';
        checkoutShippingEl.style.color = 'var(--dark-gold)';
      }
      if (checkoutShippingNoticeEl) checkoutShippingNoticeEl.textContent = '';
      renderCheckoutSummary();
      return;
    }

    if (checkoutShippingEl) {
      checkoutShippingEl.innerHTML = '<span style="font-size:0.8rem; color:#888;">Calculating...</span>';
    }

    // Don't call API if cart is empty - nothing to calculate
    if (!cart || cart.length === 0) {
      isShippingCalculated = false;
      currentShippingCharge = 0;
      if (checkoutShippingEl) {
        checkoutShippingEl.textContent = 'Add items to cart first';
        checkoutShippingEl.style.color = '#888';
      }
      renderCheckoutSummary();
      return;
    }

    try {
      const response = await fetchWithTimeout('/api/shipping/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pincode: cleanPin,
          items: cart.map(i => ({
            productId: i.id,
            variant: i.size,
            weightVariant: i.size,
            quantity: i.qty
          }))
        })
      }, 10000);

      const data = await response.json();
      if (data.success) {
        currentShippingCharge = Number(data.shippingFee) || 0;
        isShippingCalculated = true;
        currentShippingDetails = data;
        showCheckoutError(null);
        if (checkoutShippingEl) {
          checkoutShippingEl.textContent = currentShippingCharge === 0 ? 'FREE' : `₹${currentShippingCharge}`;
          checkoutShippingEl.style.color = currentShippingCharge === 0 ? '#27ae60' : 'var(--dark-gold)';
        }
        if (checkoutShippingNoticeEl) {
          checkoutShippingNoticeEl.innerHTML = `🚚 <strong>${data.courierName || 'Courier Delivery'}</strong> &bull; Est. arrival: ${data.estimatedDays || '2-4 business days'}`;
        }
      } else {
        isShippingCalculated = false;
        currentShippingCharge = 0;
        currentShippingDetails = null;
        if (checkoutShippingEl) {
          checkoutShippingEl.textContent = 'Not serviceable';
          checkoutShippingEl.style.color = '#c0392b';
        }
        if (checkoutShippingNoticeEl) {
          checkoutShippingNoticeEl.innerHTML = `<span style="color:#c0392b;">${data.message || 'Delivery is currently unavailable for this pincode.'}</span>`;
        }
      }
    } catch (err) {
      console.error('Shipping calculation error:', err);
      if (checkoutShippingEl) checkoutShippingEl.textContent = 'Error calculating';
    } finally {
      renderCheckoutSummary();
    }
  };

  const isBangalorePin = (pin, cityVal) => {
    const clean = (pin || '').replace(/\D/g, '').trim();
    if (clean.length !== 6) return false;
    if (clean.startsWith('560')) return true;
    const rural = ['562106', '562107', '562114', '562120', '562122', '562123', '562125', '562129', '562130', '562135', '562143', '562149', '562157', '562162'];
    if (rural.includes(clean)) return true;
    if (clean.startsWith('562') && cityVal && /bangalore|bengaluru/i.test(cityVal)) return true;
    return false;
  };

  const updateCodBangaloreAvailability = (pinVal) => {
    const city = document.getElementById('chkCity')?.value || '';
    const isBangalore = isBangalorePin(pinVal, city);
    const codCard = document.getElementById('codPaymentCard') || document.querySelector('.payment-option-card[data-method="cod"]');
    const codNotice = document.getElementById('codBangaloreNotice');

    if (codCard) {
      if (isBangalore) {
        codCard.style.opacity = '1';
        codCard.style.pointerEvents = 'auto';
        if (codNotice) codNotice.style.display = 'none';
      } else {
        if (codCard.classList.contains('active')) {
          paymentCards.forEach(c => c.classList.remove('active'));
          const rzpCard = document.querySelector('.payment-option-card[data-method="razorpay"]');
          if (rzpCard) rzpCard.classList.add('active');
        }
        codCard.style.opacity = '0.55';
        codCard.style.pointerEvents = 'none';
        if (codNotice) codNotice.style.display = 'block';
      }
    }
  };

  if (chkPincodeInput) {
    chkPincodeInput.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
      e.target.value = val;
      updateCodBangaloreAvailability(val);
      clearTimeout(pincodeCalculationTimer);
      if (val.length === 6) {
        pincodeCalculationTimer = setTimeout(() => calculateShippingRate(val), 350);
      } else {
        isShippingCalculated = false;
        renderCheckoutSummary();
      }
    });

    chkPincodeInput.addEventListener('blur', (e) => {
      const val = e.target.value.replace(/\D/g, '');
      updateCodBangaloreAvailability(val);
      if (val.length === 6) {
        calculateShippingRate(val);
      }
    });
  }

  const chkCityInput = document.getElementById('chkCity');
  if (chkCityInput) {
    chkCityInput.addEventListener('input', () => {
      if (chkPincodeInput) updateCodBangaloreAvailability(chkPincodeInput.value);
    });
  }

  // Pre-warmed Cashfree SDK singleton to eliminate initialization lag on click
  let cachedCashfree = null;
  const getCashfreeSDK = (mode = 'production') => {
    if (typeof window.Cashfree === 'undefined') return null;
    if (!cachedCashfree || cachedCashfree._mode !== mode) {
      try {
        cachedCashfree = window.Cashfree({ mode });
        cachedCashfree._mode = mode;
      } catch (e) {
        console.warn('Cashfree pre-init warning:', e);
      }
    }
    return cachedCashfree;
  };

  const openCheckout = () => {
    closeCart(); // Close drawer
    checkoutModalOverlay.classList.add('active');
    document.body.classList.add('overflow-hidden');
    showCheckoutError(null);
    getCashfreeSDK('production'); // Warm up Cashfree SDK in advance
    if (currentCustomer && currentCustomer.savedAddresses) {
      renderSavedAddresses(currentCustomer.savedAddresses);
    }
    if (chkPincodeInput) updateCodBangaloreAvailability(chkPincodeInput.value);
    renderCheckoutSummary();
    if (chkPincodeInput && chkPincodeInput.value.trim().length === 6) {
      calculateShippingRate(chkPincodeInput.value.trim());
    }
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
      if (checkoutSubmitBtn) checkoutSubmitBtn.disabled = true;
      return;
    }

    if (checkoutSubmitBtn) checkoutSubmitBtn.disabled = false;

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
    if (currentCoupon && validCoupons[currentCoupon]) {
      const codeData = validCoupons[currentCoupon];
      if (codeData.type === 'percent') {
        discount = Math.round(subtotal * (codeData.value / 100));
      } else if (codeData.type === 'fixed') {
        discount = Math.min(subtotal, codeData.value);
      }
      if (checkoutDiscountRow) {
        checkoutDiscountRow.style.display = 'flex';
        checkoutDiscountEl.textContent = `-₹${discount}`;
      }
    } else {
      if (checkoutDiscountRow) checkoutDiscountRow.style.display = 'none';
    }

    const shippingCharge = isShippingCalculated ? currentShippingCharge : 0;
    const finalTotal = Math.max(0, subtotal - discount + shippingCharge);
    checkoutTotalEl.textContent = `₹${finalTotal}`;

    // Update submit button text and COD breakdown
    const activePaymentCard = document.querySelector('.payment-option-card.active');
    const paymentMethod = activePaymentCard ? activePaymentCard.dataset.method : 'cashfree';
    const codBreakdownEl = document.getElementById('checkoutCodBreakdown');
    const codAdvanceEl = document.getElementById('checkoutCodAdvance');
    const codRemainingEl = document.getElementById('checkoutCodRemaining');

    if (paymentMethod === 'cod') {
      const advanceAmount = Math.ceil(finalTotal * 0.50);
      const remainingAmount = Math.max(0, finalTotal - advanceAmount);
      if (codBreakdownEl) codBreakdownEl.style.display = 'block';
      if (codAdvanceEl) codAdvanceEl.textContent = `₹${advanceAmount}`;
      if (codRemainingEl) codRemainingEl.textContent = `₹${remainingAmount}`;
      if (checkoutSubmitBtnText) {
        checkoutSubmitBtnText.textContent = `Pay 50% Advance via Cashfree ₹${advanceAmount} (₹${remainingAmount} on Delivery)`;
      }
    } else {
      if (codBreakdownEl) codBreakdownEl.style.display = 'none';
      if (checkoutSubmitBtnText) {
        checkoutSubmitBtnText.textContent = `Pay Securely via Cashfree ₹${finalTotal}`;
      }
    }
  };

  // Wire Payment Option Toggles
  const paymentCards = document.querySelectorAll('.payment-option-card');
  paymentCards.forEach(card => {
    card.addEventListener('click', () => {
      paymentCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      renderCheckoutSummary();
    });
  });

  // Handle Checkout submission and Cashfree payment / COD (50% Advance Online)
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isCheckoutSubmitting) return;
      isCheckoutSubmitting = true;
      showCheckoutError(null);

      // Gather checkout data
      const name = (document.getElementById('chkName')?.value || '').trim();
      const phone = (document.getElementById('chkPhone')?.value || '').trim();
      const email = (document.getElementById('chkEmail')?.value || '').trim();
      const address = (document.getElementById('chkAddress')?.value || '').trim();
      const area = (document.getElementById('chkArea')?.value || '').trim();
      const city = (document.getElementById('chkCity')?.value || '').trim();
      const state = (document.getElementById('chkState')?.value || '').trim();
      const pincode = (document.getElementById('chkPincode')?.value || '').trim();
      const landmark = (document.getElementById('chkLandmark')?.value || '').trim();
      const activePaymentCard = document.querySelector('.payment-option-card.active');
      const paymentMethod = activePaymentCard ? activePaymentCard.dataset.method : 'cashfree';

      if (!name || !phone || !email || !address || !city || !state || !pincode) {
        isCheckoutSubmitting = false;
        showCheckoutError('Please fill in all the required delivery fields (Name, Mobile, Email, Address, City, State, Pincode).');
        return;
      }

      const cleanMobile = phone.replace(/\D/g, '');
      if (cleanMobile.length < 10) {
        isCheckoutSubmitting = false;
        showCheckoutError('Please enter a valid 10-digit mobile number.');
        return;
      }

      const cleanPin = pincode.replace(/\D/g, '');
      if (cleanPin.length !== 6) {
        isCheckoutSubmitting = false;
        showCheckoutError('Please enter a valid 6-digit delivery pincode.');
        return;
      }

      if (cart.length === 0) {
        isCheckoutSubmitting = false;
        showCheckoutError('Your cart is empty. Please add products to cart.');
        return;
      }

      // Strict Bangalore verification for Cash on Delivery
      if (paymentMethod === 'cod' && !isBangalorePin(cleanPin, city)) {
        isCheckoutSubmitting = false;
        showCheckoutError('Cash on Delivery is currently available only within Bangalore. Please select Pay Online or enter a Bangalore delivery address.');
        return;
      }

      // Verify Cashfree SDK is loaded or accessible
      const cashfreeSdkInstance = getCashfreeSDK('production') || (typeof window.Cashfree !== 'undefined' ? window.Cashfree({ mode: 'production' }) : null);
      if (!cashfreeSdkInstance && typeof window.Cashfree === 'undefined') {
        isCheckoutSubmitting = false;
        showCheckoutError('Cashfree payment SDK could not be loaded. Please check your internet connection and refresh.');
        return;
      }

      checkoutSubmitBtn.disabled = true;
      if (checkoutSubmitBtnText) {
        checkoutSubmitBtnText.textContent = paymentMethod === 'cod' ? 'Securing 50% advance...' : 'Opening Cashfree...';
      }

      try {
        const createRes = await fetchWithTimeout('/api/checkout/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            mobile: cleanMobile,
            email,
            addressLine1: address,
            area,
            city,
            state,
            pincode: cleanPin,
            landmark,
            items: cart.map(i => ({
              productId: i.id,
              weightVariant: i.size,
              quantity: i.qty
            })),
            couponCode: currentCoupon || undefined,
            paymentMethod: paymentMethod // 'cashfree' or 'cod'
          })
        }, 15000);

        const createData = await createRes.json();
        if (!createData.success) {
          throw new Error(createData.message || 'Failed to create payment session');
        }

        // Store customer mobile and order number in localStorage for seamless "My Orders" access
        try {
          localStorage.setItem('kamadhenu_customer_mobile', cleanMobile);
          localStorage.setItem('kamadhenu_last_order', createData.orderNumber);
        } catch (e) {}

        const mode = createData.environment === 'production' ? 'production' : 'sandbox';
        const cashfree = getCashfreeSDK(mode) || window.Cashfree({ mode });

        const isMobile = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent);
        const checkoutOptions = {
          paymentSessionId: createData.paymentSessionId,
          redirectTarget: isMobile ? '_self' : '_modal'
        };

        cashfree.checkout(checkoutOptions).then(async (result) => {
          if (result.error) {
            console.error('Cashfree checkout modal error:', result.error);
            showCheckoutError(result.error.message || 'Payment was cancelled or encountered an error.');
            isCheckoutSubmitting = false;
            checkoutSubmitBtn.disabled = false;
            renderCheckoutSummary();
            return;
          }

          if (result.redirect) {
            console.log('Cashfree SDK is handling redirection to payment gateway...');
            // Cashfree handles navigation directly to the payment page. Do NOT manually navigate!
            return;
          }

          // Payment completed in modal: Verify with backend
          checkoutSubmitBtn.disabled = true;
          if (checkoutSubmitBtnText) checkoutSubmitBtnText.textContent = 'Verifying payment with bank...';

          try {
            let verifyData = null;
            let verifySuccess = false;

            // Retry verification up to 3 times to handle network/replication latency
            for (let attempt = 1; attempt <= 3; attempt++) {
              try {
                if (checkoutSubmitBtnText) {
                  checkoutSubmitBtnText.textContent = attempt === 1
                    ? 'Verifying payment with bank...'
                    : `Confirming payment (attempt ${attempt}/3)...`;
                }

                const verifyRes = await fetchWithTimeout('/api/checkout/verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    orderNumber: createData.orderNumber,
                    orderId: createData.orderId,
                    cashfreeOrderId: createData.cashfreeOrderId
                  })
                }, 15000);

                const data = await verifyRes.json();
                if (data.success || data.pending) {
                  verifyData = data;
                  verifySuccess = true;
                  break;
                } else if (attempt < 3 && (verifyRes.status === 404 || verifyRes.status === 202)) {
                  await new Promise(r => setTimeout(r, 1000));
                } else {
                  verifyData = data;
                  break;
                }
              } catch (retryErr) {
                if (attempt < 3) {
                  await new Promise(r => setTimeout(r, 1000));
                } else {
                  throw retryErr;
                }
              }
            }

            if (verifySuccess && verifyData && verifyData.success) {
              cart = [];
              saveCart();
              currentCoupon = null;
              closeCheckout();
              const targetOrder = verifyData.orderNumber || createData.orderNumber;
              window.location.href = `/order-confirmation?orderNumber=${encodeURIComponent(targetOrder)}`;
              return;
            }

            // If verify reported explicit failure (e.g. card declined / cancelled)
            if (verifyData && verifyData.failed) {
              throw new Error(verifyData.message || 'Payment was declined or cancelled. Please try again.');
            }

            if (verifyData && verifyData.pending) {
              closeCheckout();
              window.location.href = `/order-confirmation?orderNumber=${encodeURIComponent(createData.orderNumber)}&status=pending`;
              return;
            }

            throw new Error((verifyData && verifyData.message) || 'Payment verification could not be completed. Please check your bank.');
          } catch (vErr) {
            console.error('Payment verification error:', vErr);
            showCheckoutError(vErr.message || `Payment completed on Cashfree but verification timed out. If money was deducted, your order will be confirmed shortly.`);
            isCheckoutSubmitting = false;
            checkoutSubmitBtn.disabled = false;
            renderCheckoutSummary();
          }
        }).catch((cfErr) => {
          console.error('Cashfree checkout exception:', cfErr);
          showCheckoutError(cfErr.message || 'Payment window closed or encountered an error.');
          isCheckoutSubmitting = false;
          checkoutSubmitBtn.disabled = false;
          renderCheckoutSummary();
        });

      } catch (err) {
        console.error('Cashfree initialization error:', err);
        showCheckoutError(err.message || 'Error communicating with payment gateway');
        isCheckoutSubmitting = false;
        checkoutSubmitBtn.disabled = false;
        renderCheckoutSummary();
      }
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
    trackerSubmitBtn.addEventListener('click', async () => {
      const orderId = trackerInput.value.trim().toUpperCase();
      trackerResults.classList.remove('active');

      if (!orderId) {
        alert('Please enter your Order ID to track.');
        return;
      }

      trackerSubmitBtn.disabled = true;
      trackerSubmitBtn.textContent = 'Searching...';

      try {
        let orderData = trackingDatabase[orderId];
        let foundDate = orderData ? orderData.date : 'Today';
        let foundStatus = orderData ? orderData.status : 'received';
        let foundSteps = orderData ? orderData.steps : ['received'];

        if (!orderData) {
          // Query live API for database orders
          try {
            const res = await fetch(`/api/orders/track?orderNumber=${encodeURIComponent(orderId)}`);
            const json = await res.json();
            if (json.success && json.order) {
              const o = json.order;
              foundDate = new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
              const shipmentStatus = o.shipments && o.shipments[0] ? o.shipments[0].status : o.orderStatus;
              
              if (shipmentStatus === 'DELIVERED') {
                foundStatus = 'out-for-delivery';
                foundSteps = ['received', 'packed', 'shipped', 'out-for-delivery'];
              } else if (shipmentStatus === 'SHIPPED') {
                foundStatus = 'shipped';
                foundSteps = ['received', 'packed', 'shipped'];
              } else if (shipmentStatus === 'PROCESSING' || shipmentStatus === 'CONFIRMED') {
                foundStatus = 'packed';
                foundSteps = ['received', 'packed'];
              } else {
                foundStatus = 'received';
                foundSteps = ['received'];
              }
              orderData = { steps: foundSteps, status: foundStatus, date: foundDate, items: o.items, total: o.total };
            }
          } catch (e) {
            console.warn('Live tracking API check error:', e);
          }
        }

        if (!orderData) {
          alert(`Order ID "${orderId}" not found in our database. Please double-check your Order Number or connect with WhatsApp support at +91 9980114675.`);
          return;
        }

        // Populate Visual tracker
        document.getElementById('trackIdDisplay').textContent = orderId;
        document.getElementById('trackDateDisplay').textContent = foundDate;
        
        const steps = ['received', 'packed', 'shipped', 'out-for-delivery'];
        steps.forEach(step => {
          const stepEl = document.getElementById(`track-step-${step}`);
          if (!stepEl) return;
          
          stepEl.className = 'tracker-status-step';
          if (foundSteps.includes(step)) {
            stepEl.classList.add('completed');
          }
          if (foundStatus === step) {
            stepEl.classList.add('active');
          }
        });

        const itemsContainer = document.getElementById('trackerItemsContainer');
        if (itemsContainer) {
          if (orderData.items && orderData.items.length > 0) {
            itemsContainer.innerHTML = `
              <div style="margin-top:14px; padding-top:12px; border-top:1px dashed rgba(216,166,79,0.4);">
                <h5 style="font-size:0.85rem; font-weight:700; color:#3A2A18; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px;">Ordered Products</h5>
                ${orderData.items.map(it => `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid #f0eae1; font-size:0.82rem;">
                    <div>
                      <span style="font-weight:700; color:#2d3748;">${it.productNameSnapshot || 'Honey'}</span>
                      <span style="color:#718096; margin-left:4px;">(${it.weightVariant})</span>
                    </div>
                    <span style="font-weight:700; color:#8C6219;">Qty: ${it.quantity}</span>
                  </div>
                `).join('')}
                ${orderData.total ? `
                  <div style="display:flex; justify-content:space-between; margin-top:8px; font-weight:700; font-size:0.88rem; color:#2d3748;">
                    <span>Total Paid</span>
                    <span style="color:#8C6219;">₹${orderData.total}</span>
                  </div>
                ` : ''}
              </div>
            `;
          } else {
            itemsContainer.innerHTML = '';
          }
        }

        trackerResults.classList.add('active');
      } finally {
        trackerSubmitBtn.disabled = false;
        trackerSubmitBtn.textContent = 'Track';
      }
    });
  }

  /* ==========================================================================
     FAQ Accordion Logic (Native HTML5 Details + Smooth Accordion Behavior)
     ========================================================================== */
  const faqDetailsList = document.querySelectorAll('details.faq-item');
  faqDetailsList.forEach(detail => {
    detail.addEventListener('toggle', () => {
      if (detail.open) {
        detail.classList.add('active');
        // Close other FAQ items for accordion behavior
        faqDetailsList.forEach(other => {
          if (other !== detail && other.open) {
            other.removeAttribute('open');
            other.classList.remove('active');
          }
        });
      } else {
        detail.classList.remove('active');
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
     Honeycomb Active Product Actions & Live Price Synchronization
     ========================================================================== */
  // Sync live configured price from productDatabase to cards
  document.querySelectorAll('.upcoming-price-display').forEach(el => {
    const pid = el.dataset.productId;
    if (productDatabase[pid] && productDatabase[pid].prices['500g']) {
      el.textContent = `₹${productDatabase[pid].prices['500g']}`;
    }
  });

  // Add to Cart for Honeycomb Products
  const upcomingAddBtns = document.querySelectorAll('.upcoming-add-cart-btn');
  upcomingAddBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const pid = btn.dataset.productId;
      const size = btn.dataset.size || '500g';
      const orig = btn.innerHTML;
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:4px;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg> Added!
      `;
      btn.classList.add('btn-added-state');

      const isFirstItem = cart.length === 0;
      addItemToCart(pid, size, 1, true);
      openCart();

      if (window.CartCelebration && productDatabase[pid]) {
        window.CartCelebration.trigger(btn, productDatabase[pid], e, isFirstItem);
      }

      setTimeout(() => {
        btn.innerHTML = orig;
        btn.classList.remove('btn-added-state');
      }, 1200);
    });
  });

  // Buy Now for Honeycomb Products
  const upcomingBuyNowBtns = document.querySelectorAll('.upcoming-buy-now-btn');
  upcomingBuyNowBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const pid = btn.dataset.productId;
      const size = btn.dataset.size || '500g';
      addItemToCart(pid, size, 1, false);
      openCheckout();
    });
  });

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

  if (backToTopBtn) {
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

  /* ==========================================================================
     High-Performance Unified Tilt & Dynamic Lighting (Cached Rect, Zero Layout Thrash)
     ========================================================================== */
  const addTiltAndLightingEffect = () => {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 992 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cards = document.querySelectorAll('.product-card, .glass-card, .benefit-card');
    cards.forEach(card => {
      let ticking = false;
      let cachedRect = null;
      const isTiltable = card.classList.contains('product-card') || card.classList.contains('glass-card');

      card.addEventListener('mouseenter', () => {
        cachedRect = card.getBoundingClientRect();
      }, { passive: true });

      card.addEventListener('mousemove', (e) => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            if (!cachedRect) cachedRect = card.getBoundingClientRect();
            const x = e.clientX - cachedRect.left;
            const y = e.clientY - cachedRect.top;
            const w = cachedRect.width || 1;
            const h = cachedRect.height || 1;

            card.style.setProperty('--mouse-x', `${((x / w) * 100).toFixed(1)}%`);
            card.style.setProperty('--mouse-y', `${((y / h) * 100).toFixed(1)}%`);

            if (isTiltable) {
              const centerX = w / 2;
              const centerY = h / 2;
              const rotateX = (((y - centerY) / centerY) * -3).toFixed(2);
              const rotateY = (((x - centerX) / centerX) * 3).toFixed(2);
              card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
            }
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });

      card.addEventListener('mouseleave', () => {
        cachedRect = null;
        if (isTiltable) card.style.transform = '';
      }, { passive: true });
    });
  };

  const addTiltEffect = addTiltAndLightingEffect;
  const addDynamicLighting = () => {};

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

      // Auto-play gallery on non-touch desktop only
      if (thumbBtns.length > 1 && window.innerWidth > 992 && !('ontouchstart' in window) && navigator.maxTouchPoints === 0) {
        let currentIndex = 0;
        setInterval(() => {
          if (!navigator.onLine) return; // Skip image switch when offline or disconnected
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
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 992 || window.matchMedia('(max-width: 992px)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const MAX_TILT  = 8;
    const MAX_SHIFT = 4;

    cards.forEach(card => {
      const content = card.querySelector('.upcoming-content');
      const media   = card.querySelector('.upcoming-media-placeholder');
      let raf       = null;
      let cachedRect = null;

      const applyTilt = (rx, ry, progress) => {
        card.style.transform = `perspective(1200px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(${(progress * 6).toFixed(1)}px)`;
        if (content) content.style.transform = `translate3d(${(-ry * MAX_SHIFT / MAX_TILT).toFixed(1)}px, ${(rx * MAX_SHIFT / MAX_TILT).toFixed(1)}px, 0)`;
        if (media)   media.style.transform   = `translate3d(${(ry * 2 / MAX_TILT).toFixed(1)}px, ${(-rx * 2 / MAX_TILT).toFixed(1)}px, 0)`;
      };

      const resetTilt = () => {
        card.style.transform  = '';
        if (content) content.style.transform = '';
        if (media)   media.style.transform   = '';
      };

      card.addEventListener('mouseenter', () => {
        card.style.transition = 'none';
        cachedRect = card.getBoundingClientRect();
      }, { passive: true });

      card.addEventListener('mousemove', (e) => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          if (!cachedRect) cachedRect = card.getBoundingClientRect();
          const w = cachedRect.width || 1;
          const h = cachedRect.height || 1;
          const dx       = e.clientX - (cachedRect.left + w / 2);
          const dy       = e.clientY - (cachedRect.top  + h / 2);
          const rx       = -(dy / (h / 2)) * MAX_TILT;
          const ry       =  (dx / (w / 2)) * MAX_TILT;
          const progress =  Math.min(1, Math.hypot(dx / w, dy / h));
          applyTilt(rx, ry, progress);
        });
      }, { passive: true });

      card.addEventListener('mouseleave', () => {
        if (raf) cancelAnimationFrame(raf);
        cachedRect = null;
        card.style.transition = 'transform 0.5s cubic-bezier(0.16,1,0.3,1)';
        resetTilt();
        setTimeout(() => { card.style.transition = ''; }, 500);
      }, { passive: true });
    });
  };

  /* ---- Floating Gold Particle Canvas ---- */
  const initUpcomingParticles = () => {
    if (window.innerWidth < 768 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; // Skip heavy canvas loop on mobile or low power
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

    const particles = Array.from({ length: 18 }, () => new Particle());
    let rafId = null;

    const loop = () => {
      if (document.hidden) {
        rafId = null;
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      rafId = requestAnimationFrame(loop);
    };

    // Only animate when visible, avoiding duplicate loops
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        if (!rafId) loop();
      } else {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }
    }, { threshold: 0.05 });
    io.observe(section);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    });
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
    checkCustomerSession();
    syncRealtimeStock();

    // Deep-link scroll handling for shared products (e.g. #product-p1, #products, #our-honey)
    const handleDeepLinkHash = () => {
      const hash = window.location.hash;
      if (!hash) return;

      let targetEl = null;
      if (hash === '#our-honey' || hash === '#products') {
        targetEl = document.getElementById('products');
      } else {
        try {
          targetEl = document.querySelector(hash);
        } catch {
          targetEl = null;
        }
      }

      if (targetEl) {
        setTimeout(() => {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (targetEl.classList.contains('product-card') || targetEl.classList.contains('upcoming-card')) {
            targetEl.style.transition = 'box-shadow 0.6s ease, border-color 0.6s ease';
            targetEl.style.boxShadow = '0 0 0 3px var(--primary-gold), 0 20px 40px rgba(216,166,79,0.35)';
            targetEl.style.borderColor = 'var(--primary-gold)';
            setTimeout(() => {
              targetEl.style.boxShadow = '';
              targetEl.style.borderColor = '';
            }, 3500);
          }
        }, 350);
      }
    };

    handleDeepLinkHash();
    window.addEventListener('hashchange', handleDeepLinkHash);

    // Live inventory polling every 30 seconds
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncRealtimeStock();
      }
    }, 30000);

    // Sync immediately when customer refocuses the browser
    window.addEventListener('focus', () => {
      syncRealtimeStock();
    });

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
