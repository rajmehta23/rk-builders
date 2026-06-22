/* ==========================================================================
   RK BUILDERS Premium UI Engine & Scripts
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Global elements
  const body = document.body;
  
  // Initialize state
  body.classList.add('loading');

  /* ==========================================================================
     1. IMAGE PRELOADING SYSTEM
     ========================================================================== */
  const totalFrames = 300; // Hero frames count
  const aboutTotalFrames = 270; // About lightroom sequence frames count
  const heroImages = [];
  const lightRoomImages = [];
  let loadedCount = 0;
  const totalAssets = totalFrames + aboutTotalFrames; // 300 hero + 270 about images
  
  const preloader = document.getElementById('preloader');
  const progressBar = document.getElementById('preloader-progress-bar');
  const percentageText = document.getElementById('preloader-percentage');
  
  // Asset path format helpers
  function padZero(num, size = 3) {
    let s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
  }
  
  // Preload all assets in parallel
  function preloadAssets() {
    return new Promise((resolve) => {
      let isCompleted = false;
      
      const onAssetLoaded = () => {
        if (isCompleted) return;
        loadedCount++;
        
        // Update progress bar
        const percent = Math.min(Math.floor((loadedCount / totalAssets) * 100), 100);
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (percentageText) percentageText.textContent = `${percent}%`;
        
        if (loadedCount >= totalAssets) {
          isCompleted = true;
          resolve();
        }
      };
      
      const onAssetFailed = (url) => {
        console.warn(`Failed to preload asset: ${url}. Continuing loader.`);
        onAssetLoaded(); // Continue loader even if individual asset fails to prevent locking
      };

      // 1. Preload Hero Frames (720x1280)
      for (let i = 1; i <= totalFrames; i++) {
        const img = new Image();
        const frameStr = padZero(i);
        const url = `hero_section/ezgif-frame-${frameStr}.jpg`;
        img.src = url;
        img.onload = onAssetLoaded;
        img.onerror = () => onAssetFailed(url);
        heroImages.push(img);
      }

      // 2. Preload Light room Frames (1280x720)
      for (let i = 1; i <= aboutTotalFrames; i++) {
        const img = new Image();
        const frameStr = padZero(i);
        const url = `Light room/ezgif-frame-${frameStr}.jpg`;
        img.src = url;
        img.onload = onAssetLoaded;
        img.onerror = () => onAssetFailed(url);
        lightRoomImages.push(img);
      }
    });
  }

  // Run preloader
  preloadAssets().then(() => {
    // Fade out preloader
    setTimeout(() => {
      if (preloader) {
        preloader.classList.add('fade-out');
      }
      body.classList.remove('loading');
      
      // Initialize Canvas Draw engines once loaded
      initHeroCanvas();
      initAboutCanvas();
    }, 600);
  });

  /* ==========================================================================
     2. STICKY HEADER SCROLL STYLING & ACTIVE LINKS
     ========================================================================== */
  const header = document.getElementById('main-header');
  const scrollIndicator = document.getElementById('scroll-indicator');
  
  const handleScrollEffects = () => {
    const scrollY = window.scrollY;
    
    // Header transparent -> frosted glass
    if (scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    
    // Scroll down indicator fade out
    if (scrollY > 150) {
      if (scrollIndicator) scrollIndicator.classList.add('fade-out');
    } else {
      if (scrollIndicator) scrollIndicator.classList.remove('fade-out');
    }
  };
  
  window.addEventListener('scroll', handleScrollEffects, { passive: true });

  // Menu Active Link Highlighting using Intersection Observer
  const sections = document.querySelectorAll('main > section, header');
  const navLinks = document.querySelectorAll('.nav-link');
  
  const observerOptions = {
    root: null,
    rootMargin: '-30% 0px -40% 0px', // Trigger activation near viewport center
    threshold: 0
  };
  
  const observerCallback = (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          const href = link.getAttribute('href');
          if (href === `#${id}` || (id === 'hero' && href === '#hero')) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  };
  
  const sectionObserver = new IntersectionObserver(observerCallback, observerOptions);
  sections.forEach(section => {
    if (section.getAttribute('id')) {
      sectionObserver.observe(section);
    }
  });

  // Mobile Hamburger toggle
  const menuToggle = document.getElementById('menu-toggle');
  const navMenu = document.getElementById('nav-menu');
  
  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', !expanded);
      navMenu.classList.toggle('open');
    });
    
    // Close mobile menu when clicking a link
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.setAttribute('aria-expanded', 'false');
        navMenu.classList.remove('open');
      });
    });
  }

  /* ==========================================================================
     3. HERO CANVAS ENGINE (SCROLLYTELLING & HOTSPOTS)
     ========================================================================== */
  let heroCanvas, heroCtx;
  let heroCurrentFrame = 1;
  let heroTargetFrame = 1;
  let isHeroCanvasDrawing = false;
  
  const heroScrollContainer = document.getElementById('hero-scroll-container');
  
  function initHeroCanvas() {
    heroCanvas = document.getElementById('hero-canvas');
    if (!heroCanvas) return;
    
    heroCtx = heroCanvas.getContext('2d');
    
    // Initial size configuration
    resizeHeroCanvas();
    
    // Start drawing loop
    requestAnimationFrame(renderHeroFrameLoop);
    
    // Attach resize events (debounced)
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resizeHeroCanvas, 100);
    });
    
    // Attach scroll tracking
    window.addEventListener('scroll', trackHeroScrollProgress, { passive: true });
    trackHeroScrollProgress(); // Call initially
  }
  
  function resizeHeroCanvas() {
    if (!heroCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = heroCanvas.getBoundingClientRect();
    
    heroCanvas.width = rect.width * dpr;
    heroCanvas.height = rect.height * dpr;
    
    // Force redraw on resize
    isHeroCanvasDrawing = true;
  }
  
  function trackHeroScrollProgress() {
    if (!heroScrollContainer) return;
    
    const rect = heroScrollContainer.getBoundingClientRect();
    const scrollTop = window.scrollY;
    const offsetTop = rect.top + scrollTop;
    const scrollHeight = rect.height;
    const clientHeight = window.innerHeight;
    
    // Fraction of progress through scroll container
    let scrollFraction = (scrollTop - offsetTop) / (scrollHeight - clientHeight);
    scrollFraction = Math.max(0, Math.min(1, scrollFraction));
    
    // Map scroll percentage to frame index
    heroTargetFrame = Math.round(scrollFraction * (totalFrames - 1)) + 1;
    isHeroCanvasDrawing = true;
  }
  
  function renderHeroFrameLoop() {
    // LERP Interpolation (smoothing factor: 0.08)
    const delta = heroTargetFrame - heroCurrentFrame;
    if (Math.abs(delta) > 0.01) {
      heroCurrentFrame += delta * 0.08;
      isHeroCanvasDrawing = true;
    } else {
      heroCurrentFrame = heroTargetFrame;
    }
    
    if (isHeroCanvasDrawing) {
      const currentIdx = Math.max(1, Math.min(totalFrames, Math.round(heroCurrentFrame)));
      drawHeroImage(currentIdx);
      
      // Update panels and hotspots based on interpolated frame index
      updateStoryPanels(currentIdx);
      updateHotspotsBoundingBox(currentIdx);
      
      // If we caught up with the target frame, stop rendering loop until next event
      if (Math.abs(delta) <= 0.01) {
        isHeroCanvasDrawing = false;
      }
    }
    
    requestAnimationFrame(renderHeroFrameLoop);
  }
  
  function drawHeroImage(index) {
    const img = heroImages[index - 1];
    if (!img || !img.complete) return;
    
    heroCtx.clearRect(0, 0, heroCanvas.width, heroCanvas.height);
    
    const canvasWidth = heroCanvas.width;
    const canvasHeight = heroCanvas.height;
    
    // Original image specifications: 720x1280 (portrait)
    const imageWidth = 720;
    const imageHeight = 1280;
    
    // Cropped dimensions: skip 15% from top
    const cropY = imageHeight * 0.15;
    const cropHeight = imageHeight * 0.85;
    
    const canvasRatio = canvasWidth / canvasHeight;
    const imageRatio = imageWidth / cropHeight;
    
    let renderW, renderH, offsetX, offsetY;
    
    // Aspect-fit rendering box calculation with centering
    if (canvasRatio > imageRatio) {
      // Canvas is wider than image aspect ratio
      renderH = canvasHeight;
      renderW = renderH * imageRatio;
      offsetX = (canvasWidth - renderW) / 2;
      offsetY = 0;
    } else {
      // Canvas is taller than image aspect ratio
      renderW = canvasWidth;
      renderH = renderW / imageRatio;
      offsetX = 0;
      offsetY = (canvasHeight - renderH) / 2;
    }
    
    // Draw only the bottom 85% of the image
    heroCtx.drawImage(
      img,
      0,           // sx
      cropY,       // sy
      imageWidth,  // sWidth
      cropHeight,  // sHeight
      offsetX,     // dx
      offsetY,     // dy
      renderW,     // dWidth
      renderH      // dHeight
    );
    
    // Store current rendering bounds globally for overlay positioning
    heroCanvas.dataset.renderOffsetX = offsetX;
    heroCanvas.dataset.renderOffsetY = offsetY;
    heroCanvas.dataset.renderWidth = renderW;
    heroCanvas.dataset.renderHeight = renderH;
  }
  
  function updateStoryPanels(frameIndex) {
    const panels = document.querySelectorAll('.story-panel');
    panels.forEach(panel => {
      const start = parseInt(panel.dataset.frameStart);
      const end = parseInt(panel.dataset.frameEnd);
      if (frameIndex >= start && frameIndex < end) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });
  }
  
  function updateHotspotsBoundingBox(frameIndex) {
    const offsetX = parseFloat(heroCanvas.dataset.renderOffsetX || 0);
    const offsetY = parseFloat(heroCanvas.dataset.renderOffsetY || 0);
    const renderW = parseFloat(heroCanvas.dataset.renderWidth || 0);
    const renderH = parseFloat(heroCanvas.dataset.renderHeight || 0);
    const dpr = window.devicePixelRatio || 1;
    
    const hotspots = document.querySelectorAll('.hotspot');
    hotspots.forEach(hotspot => {
      const origX = parseFloat(hotspot.dataset.origX);
      const origY = parseFloat(hotspot.dataset.origY);
      
      const activeStart = parseInt(hotspot.dataset.activeStart);
      const activeEnd = parseInt(hotspot.dataset.activeEnd);
      
      // Calculate hotspots position in CSS pixels based on rendered canvas viewport
      // Maps original (720x1280) coordinate space into responsive layout box
      // Taking into account the 15% top crop
      const targetCSSX = (offsetX + (origX / 720) * renderW) / dpr;
      const targetCSSY = (offsetY + ((origY - 1280 * 0.15) / (1280 * 0.85)) * renderH) / dpr;
      
      hotspot.style.left = `${targetCSSX}px`;
      hotspot.style.top = `${targetCSSY}px`;
      
      if (frameIndex >= activeStart && frameIndex <= activeEnd) {
        hotspot.classList.add('visible');
      } else {
        hotspot.classList.remove('visible');
      }
    });
  }

  /* ==========================================================================
     4. ABOUT INTERACTIVE LIGHT CANVAS & SVG MASK OVERLAYS
     ========================================================================== */
  let aboutCanvas, aboutCtx;
  let aboutCurrentFrame = 1;
  let aboutTargetFrame = 1;
  let aboutLerpLoopId = null;
  
  const aboutInteractiveContainer = document.getElementById('about-interactive-container');
  const aboutLoader = document.getElementById('about-canvas-loader');
  
  function initAboutCanvas() {
    aboutCanvas = document.getElementById('about-canvas');
    if (!aboutCanvas) return;
    
    aboutCtx = aboutCanvas.getContext('2d');
    
    // Hide loading spinner
    if (aboutLoader) aboutLoader.classList.add('loaded');
    
    // Configure default drawing
    resizeAboutCanvas();
    drawAboutFrame(1);
    
    // Listen to resize
    window.addEventListener('resize', resizeAboutCanvas);
    
    // Hook up double lighting interaction
    setupGlowOverlays();
    setupMasterSwitch();
  }
  
  function resizeAboutCanvas() {
    if (!aboutCanvas) return;
    const rect = aboutCanvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return; // Do not resize to 0 to prevent canvas blanking
    
    const dpr = window.devicePixelRatio || 1;
    aboutCanvas.width = rect.width * dpr;
    aboutCanvas.height = rect.height * dpr;
    
    drawAboutFrame(Math.round(aboutCurrentFrame));
  }
  
  function drawAboutFrame(index) {
    const clampedIndex = Math.max(1, Math.min(aboutTotalFrames, Math.round(index)));
    let img = lightRoomImages[clampedIndex - 1];
    
    // Fallback to frame 1 (default dark frame) if the targeted image is not loaded or broken
    if (!img || !img.complete || img.naturalWidth === 0) {
      img = lightRoomImages[0];
      if (!img || !img.complete || img.naturalWidth === 0) return;
    }
    
    aboutCtx.clearRect(0, 0, aboutCanvas.width, aboutCanvas.height);
    
    const canvasWidth = aboutCanvas.width;
    const canvasHeight = aboutCanvas.height;
    
    // Light room source frames are 1280x720 (landscape)
    const imageWidth = 1280;
    const imageHeight = 720;
    
    const canvasRatio = canvasWidth / canvasHeight;
    const imageRatio = imageWidth / imageHeight;
    
    let renderW, renderH, offsetX, offsetY;
    
    if (canvasRatio > imageRatio) {
      renderH = canvasHeight;
      renderW = renderH * imageRatio;
      offsetX = (canvasWidth - renderW) / 2;
      offsetY = 0;
    } else {
      renderW = canvasWidth;
      renderH = renderW / imageRatio;
      offsetX = 0;
      offsetY = (canvasHeight - renderH) / 2;
    }
    
    aboutCtx.drawImage(img, offsetX, offsetY, renderW, renderH);
  }
  
  // 1. Master Light Switch LERP loop (bound to container for entire image hover)
  function setupMasterSwitch() {
    const container = document.getElementById('about-interactive-container');
    if (!container) return;
    
    function runAboutLerp() {
      try {
        const delta = aboutTargetFrame - aboutCurrentFrame;
        if (Math.abs(delta) > 0.05) {
          aboutCurrentFrame += delta * 0.1;
          drawAboutFrame(Math.round(aboutCurrentFrame));
          aboutLerpLoopId = requestAnimationFrame(runAboutLerp);
        } else {
          aboutCurrentFrame = aboutTargetFrame;
          drawAboutFrame(aboutTargetFrame);
          aboutLerpLoopId = null;
        }
      } catch (e) {
        console.error("Lightroom animation loop error:", e);
        aboutLerpLoopId = null; // Reset loop id to prevent lock-up on errors
      }
    }
    
    container.addEventListener('mouseenter', () => {
      aboutTargetFrame = aboutTotalFrames; // illuminate fully
      if (!aboutLerpLoopId) aboutLerpLoopId = requestAnimationFrame(runAboutLerp);
    });
    
    container.addEventListener('mouseleave', () => {
      aboutTargetFrame = 1; // back to dark
      if (!aboutLerpLoopId) aboutLerpLoopId = requestAnimationFrame(runAboutLerp);
    });
  }
  
  // 2. Individual Window Hover Glows (CSS overlays using Clip Path)
  function setupGlowOverlays() {
    const zones = document.querySelectorAll('.window-glow-zone');
    if (!zones.length || !aboutInteractiveContainer) return;
    
    zones.forEach(zone => {
      // Dynamic overlay image with frame 270 (full glow)
      const overlayImg = document.createElement('div');
      overlayImg.className = 'window-glow-overlay-img';
      overlayImg.style.clipPath = zone.style.clipPath;
      overlayImg.style.backgroundImage = `url('Light room/ezgif-frame-${padZero(aboutTotalFrames)}.jpg')`;
      
      aboutInteractiveContainer.appendChild(overlayImg);
      
      zone.addEventListener('mouseenter', () => {
        overlayImg.classList.add('active');
        zone.style.cursor = 'pointer';
      });
      
      zone.addEventListener('mouseleave', () => {
        overlayImg.classList.remove('active');
      });
    });
  }

  /* ==========================================================================
     5. BENTO GRID TILT & SPOTLIGHT GLOW
     ========================================================================== */
  const bentoCards = document.querySelectorAll('.bento-card');
  
  bentoCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Update variables for spotlight hover element
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
      
      // Calculate tilt percentages
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((centerY - y) / centerY) * 8; // max 8 degrees
      const rotateY = ((x - centerX) / centerX) * 8; // max 8 degrees
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  /* ==========================================================================
     6. PROCESS TIMELINE (Horizontal Scroll Mapping)
     ========================================================================== */
  const processHeightContainer = document.getElementById('process-scroll-container-height');
  const processTrack = document.getElementById('process-track');
  const processIndicator = document.getElementById('process-scroll-bar');
  
  const handleProcessHorizontalScroll = () => {
    if (!processHeightContainer || !processTrack) return;
    
    const rect = processHeightContainer.getBoundingClientRect();
    const scrollTop = window.scrollY;
    const offsetTop = rect.top + scrollTop;
    const scrollHeight = rect.height;
    const clientHeight = window.innerHeight;
    
    // Map container scroll percentage (0 to 1)
    let progress = (scrollTop - offsetTop) / (scrollHeight - clientHeight);
    progress = Math.max(0, Math.min(1, progress));
    
    // Calculate slider limits based on track and screen sizes
    const maxTranslate = processTrack.scrollWidth - window.innerWidth + (window.innerWidth * 0.2); // padding offset
    const translateX = progress * maxTranslate;
    
    processTrack.style.transform = `translate3d(-${translateX}px, 0, 0)`;
    
    // Update footer indicator bar
    if (processIndicator) {
      processIndicator.style.width = `${progress * 100}%`;
    }
  };
  
  window.addEventListener('scroll', handleProcessHorizontalScroll, { passive: true });

  /* ==========================================================================
     7. PROJECT GALLERY MASONRY FILTERS & LIGHTBOX
     ========================================================================== */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const galleryItems = document.querySelectorAll('.gallery-item');
  
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Toggle button states
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const filter = btn.dataset.filter;
      
      galleryItems.forEach(item => {
        // Simple layout updates for masonry items
        if (filter === 'all' || item.dataset.category === filter) {
          item.style.display = 'block';
          setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'scale(1)';
          }, 50);
        } else {
          item.style.opacity = '0';
          item.style.transform = 'scale(0.9)';
          setTimeout(() => {
            item.style.display = 'none';
          }, 300);
        }
      });
    });
  });

  // Lightbox mechanics
  const lightbox = document.getElementById('gallery-lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCategory = document.getElementById('lightbox-category');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxMeta = document.getElementById('lightbox-meta');
  
  const closeBtn = document.getElementById('lightbox-close-btn');
  const prevBtn = document.getElementById('lightbox-prev-btn');
  const nextBtn = document.getElementById('lightbox-next-btn');
  
  let activeGalleryItems = [];
  let currentLightboxIndex = 0;
  
  const openLightbox = (index) => {
    currentLightboxIndex = index;
    const item = activeGalleryItems[currentLightboxIndex];
    if (!item) return;
    
    const imgEl = item.querySelector('img');
    const categoryEl = item.querySelector('.gallery-item-category');
    const titleEl = item.querySelector('.gallery-item-title');
    const metaEl = item.querySelector('.gallery-item-meta');
    
    lightboxImg.src = imgEl.src;
    lightboxImg.alt = imgEl.alt;
    lightboxCategory.textContent = categoryEl.textContent;
    lightboxTitle.textContent = titleEl.textContent;
    lightboxMeta.textContent = metaEl.textContent;
    
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden', 'false');
    body.style.overflow = 'hidden';
  };
  
  const closeLightbox = () => {
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    body.style.overflow = '';
  };
  
  const navigateLightbox = (dir) => {
    let nextIdx = currentLightboxIndex + dir;
    if (nextIdx < 0) nextIdx = activeGalleryItems.length - 1;
    if (nextIdx >= activeGalleryItems.length) nextIdx = 0;
    openLightbox(nextIdx);
  };
  
  // Attach triggers
  galleryItems.forEach(item => {
    const zoomTrigger = item.querySelector('.gallery-zoom-trigger') || item;
    zoomTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Map active filtered items
      activeGalleryItems = Array.from(galleryItems).filter(el => el.style.display !== 'none');
      const itemIndex = activeGalleryItems.indexOf(item);
      
      openLightbox(itemIndex !== -1 ? itemIndex : 0);
    });
  });
  
  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (prevBtn) prevBtn.addEventListener('click', () => navigateLightbox(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => navigateLightbox(1));
  
  if (lightbox) {
    // Click outside image to close
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }
  
  // Keyboard Support
  document.addEventListener('keydown', (e) => {
    if (!lightbox || !lightbox.classList.contains('active')) return;
    
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
  });

  /* ==========================================================================
     8. CONTACT FORM VALIDATION & SUCCESS HANDLERS
     ========================================================================== */
  const contactForm = document.getElementById('rk-contact-form');
  const successOverlay = document.getElementById('form-success-overlay');
  const successResetBtn = document.getElementById('success-reset-btn');
  
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      let isFormValid = true;
      
      // Fields to validate
      const fields = [
        { id: 'contact-name', errorId: 'name-error', check: val => val.trim().length > 0 },
        { id: 'contact-email', errorId: 'email-error', check: val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) },
        { id: 'contact-project-type', errorId: 'type-error', check: val => val !== "" },
        { id: 'contact-message', errorId: 'message-error', check: val => val.trim().length > 0 },
        { id: 'contact-privacy', errorId: 'privacy-error', check: (val, el) => el.checked }
      ];
      
      fields.forEach(field => {
        const inputEl = document.getElementById(field.id);
        if (!inputEl) return;
        
        const errorEl = document.getElementById(field.errorId);
        const groupEl = inputEl.closest('.form-group') || inputEl.closest('.form-privacy-consent');
        if (!groupEl) return;
        
        const isValid = field.check(inputEl.value, inputEl);
        
        if (!isValid) {
          isFormValid = false;
          groupEl.classList.add('invalid');
        } else {
          groupEl.classList.remove('invalid');
        }
      });
      
      if (isFormValid) {
        // Trigger Success overlay
        if (successOverlay) {
          successOverlay.classList.add('active');
          successOverlay.setAttribute('aria-hidden', 'false');
        }
      }
    });
    
    // Clear validation borders as user types
    const inputs = contactForm.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        const groupEl = input.closest('.form-group') || input.closest('.form-privacy-consent');
        if (groupEl) groupEl.classList.remove('invalid');
      });
    });
  }
  
  if (successResetBtn && successOverlay && contactForm) {
    successResetBtn.addEventListener('click', () => {
      contactForm.reset();
      successOverlay.classList.remove('active');
      successOverlay.setAttribute('aria-hidden', 'true');
    });
  }
});
