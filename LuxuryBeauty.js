/* =========================================================
   AURAÉ — Beauty Atelier Experience
   Vanilla JS interaction layer
   ========================================================= */

(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- 1. PRELOADER ---------- */
  const preloader = document.getElementById('preloader');
  const hidePreloader = () => {
    if (!preloader) return;
    // pointer-events: none в CSS ставится вместе с классом is-hidden, но некоторые
    // урезанные WebView (например, встроенные превью в редакторах кода) применяют
    // это свойство с задержкой — из-за чего первые клики по контенту под преloader'ом
    // проваливаются в него. Ставим pointer-events напрямую inline, чтобы блокировка
    // снималась гарантированно и мгновенно, а не зависела от пересчёта CSS-класса.
    preloader.style.pointerEvents = 'none';
    preloader.classList.add('is-hidden');
    document.body.style.overflow = '';
    setTimeout(() => preloader.remove(), 1500);
  };

  window.addEventListener('load', () => {
    document.body.style.overflow = 'hidden';
    // Wordmark reveal + gleam + frame lines + caption settle by ~2950ms —
    // wait for the full flourish to read before dismissing.
    setTimeout(hidePreloader, reducedMotion ? 200 : 3100);
  });
  // Safety net in case 'load' already fired or takes too long
  setTimeout(hidePreloader, 5300);

  /* ---------- 2. STICKY NAV ---------- */
  const nav = document.getElementById('siteNav');
  const onScrollNav = () => {
    if (window.scrollY > 40) nav.classList.add('is-scrolled');
    else nav.classList.remove('is-scrolled');
  };
  window.addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();

  /* ---------- 3. MOBILE MENU ---------- */
  const burger = document.getElementById('navBurger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(isOpen));
      mobileMenu.setAttribute('aria-hidden', String(!isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      });
    });
  }

  /* ---------- 4. SILK REVEAL — Intersection Observer ---------- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && revealEls.length) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const labGrid = el.closest('.lab__grid');
          let delay;

          if (labGrid) {
            // Карточки лаборатории проявляются по очереди — каскад, а не общий сброс
            const panels = Array.from(labGrid.querySelectorAll('.lab__panel'));
            delay = panels.indexOf(el) * 130;
          } else if (el.closest('.philosophy__grid, .exhibit__label')) {
            delay = 0;
          } else {
            delay = Math.min(i * 60, 180);
          }

          setTimeout(() => el.classList.add('is-visible'), delay);
          revealObserver.unobserve(el);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    revealEls.forEach(el => revealObserver.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  /* ---------- 5. AURORA GLOW — follows cursor (rAF) ---------- */
  const auroraLayer = document.getElementById('auroraLayer');
  if (auroraLayer && hasHover && !reducedMotion) {
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let rafId = null;

    auroraLayer.style.background =
      'radial-gradient(circle 340px at 50% 50%, rgba(200,169,106,0.22), rgba(231,201,182,0.10) 45%, transparent 70%)';

    const render = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      auroraLayer.style.transform = `translate3d(${currentX - window.innerWidth / 2}px, ${currentY - window.innerHeight / 2}px, 0)`;
      rafId = requestAnimationFrame(render);
    };

    window.addEventListener('pointermove', (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!auroraLayer.classList.contains('is-active')) {
        auroraLayer.classList.add('is-active');
      }
    }, { passive: true });

    window.addEventListener('pointerleave', () => auroraLayer.classList.remove('is-active'));

    rafId = requestAnimationFrame(render);
    window.addEventListener('blur', () => rafId && cancelAnimationFrame(rafId));
  }

  /* ---------- 6. MAGNETIC CTA ---------- */
  // matchMedia('hover') не всегда надёжен в нестандартных WebView (например,
  // встроенные превью в редакторах кода): он может вернуть true на тач-экране,
  // из-за чего magnetic-сдвиг (translate3d по pointermove) применяется и на touch.
  // На touch pointerleave часто не срабатывает вообще (палец не "покидает" элемент
  // плавно, он просто отрывается) — transform остаётся висеть, кнопка визуально
  // смещена от своей настоящей кликабельной области, и клик то попадает, то нет.
  // Поэтому дополнительно проверяем ontouchstart, и сбрасываем transform по
  // pointerup/pointercancel в любом случае, а не только по pointerleave.
  const isTouchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  if (hasHover && !reducedMotion && !isTouchCapable) {
    document.querySelectorAll('[data-magnetic]').forEach((btn) => {
      const strength = 0.35;
      let bounds;

      btn.addEventListener('pointerenter', () => { bounds = btn.getBoundingClientRect(); });

      btn.addEventListener('pointermove', (e) => {
        if (!bounds) bounds = btn.getBoundingClientRect();
        const relX = e.clientX - bounds.left - bounds.width / 2;
        const relY = e.clientY - bounds.top - bounds.height / 2;
        btn.style.transform = `translate3d(${relX * strength}px, ${relY * strength}px, 0)`;
      });

      const reset = () => { btn.style.transform = 'translate3d(0,0,0)'; };
      btn.addEventListener('pointerleave', reset);
      btn.addEventListener('pointerup', reset);
      btn.addEventListener('pointercancel', reset);
    });
  } else {
    // Гарантированно убираем любой унаследованный transform на touch-устройствах,
    // даже если предыдущая логика где-то успела его выставить.
    document.querySelectorAll('[data-magnetic]').forEach((btn) => {
      btn.style.transform = '';
    });
  }

  /* ---------- 7. GLASS ATELIER — subtle tilt on lab panels ---------- */
  if (hasHover && !reducedMotion) {
    document.querySelectorAll('.lab__panel').forEach((panel) => {
      panel.addEventListener('pointermove', (e) => {
        const bounds = panel.getBoundingClientRect();
        const px = (e.clientX - bounds.left) / bounds.width;
        const py = (e.clientY - bounds.top) / bounds.height;
        const glass = panel.querySelector('.lab__panel-glass');
        if (glass) {
          glass.style.background = `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(200,169,106,0.16), transparent 60%)`;
        }
      });
    });
  }

  /* ---------- 8. DEPTH PARALLAX — hero layers on scroll ---------- */
  const heroBgImg = document.querySelector('.hero__bg-img');
  const heroMistOne = document.querySelector('.hero__mist--one');
  const heroMistTwo = document.querySelector('.hero__mist--two');

  if (!reducedMotion && heroBgImg) {
    let ticking = false;
    const onScrollParallax = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const heroHeight = window.innerHeight;
        if (y < heroHeight * 1.2) {
          heroBgImg.style.transform = `translate3d(0, ${y * 0.15}px, 0)`;
          if (heroMistOne) heroMistOne.style.transform = `translate3d(0, ${y * 0.12}px, 0)`;
          if (heroMistTwo) heroMistTwo.style.transform = `translate3d(0, ${y * -0.1}px, 0)`;
        }
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScrollParallax, { passive: true });
  }

  /* ---------- 9. FAQ ACCORDION ---------- */
  document.querySelectorAll('.faq-item__trigger').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';

      // Close siblings for a clean single-open accordion
      document.querySelectorAll('.faq-item__trigger[aria-expanded="true"]').forEach((other) => {
        if (other !== trigger) other.setAttribute('aria-expanded', 'false');
      });

      trigger.setAttribute('aria-expanded', String(!isOpen));
    });
  });

  /* ---------- 10. PRODUCT FLOATING (Intersection-based restart) ---------- */
  // Floating handled purely in CSS via infinite keyframes on .hero__vial / .exhibit__product
  // No JS required — kept GPU-only via translate3d in CSS for performance.

  /* ---------- 11. FORMULA DRAWER — "Изучить формулу" ---------- */
  const formulaScrim = document.getElementById('formulaScrim');
  const formulaTriggers = document.querySelectorAll('[data-formula-trigger]');

  if (formulaScrim && formulaTriggers.length) {
    const formulaNo = document.getElementById('formulaNo');
    const formulaTitle = document.getElementById('formulaTitle');
    const formulaPhilosophy = document.getElementById('formulaPhilosophy');
    const formulaActives = document.getElementById('formulaActives');
    const formulaFeel = document.getElementById('formulaFeel');
    const formulaClose = document.getElementById('formulaClose');
    let lastFocused = null;

    const openFormula = (trigger) => {
      lastFocused = trigger;

      formulaNo.textContent = trigger.dataset.no || '';
      formulaTitle.textContent = trigger.dataset.title || '';
      formulaPhilosophy.textContent = trigger.dataset.philosophy || '';
      formulaFeel.textContent = trigger.dataset.feel || '';

      formulaActives.innerHTML = '';
      (trigger.dataset.actives || '').split('|').filter(Boolean).forEach((active) => {
        const li = document.createElement('li');
        li.textContent = active;
        formulaActives.appendChild(li);
      });

      formulaScrim.classList.add('is-open');
      formulaScrim.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      formulaClose.focus();
    };

    const closeFormula = () => {
      formulaScrim.classList.remove('is-open');
      formulaScrim.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lastFocused) lastFocused.focus();
    };

    formulaTriggers.forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        openFormula(trigger);
      });
    });

    formulaClose.addEventListener('click', closeFormula);

    // Клик по затемнённому фону (но не по самой панели) тоже закрывает
    formulaScrim.addEventListener('click', (e) => {
      if (e.target === formulaScrim) closeFormula();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && formulaScrim.classList.contains('is-open')) closeFormula();
    });

    // Клик по ссылкам "Получить консультацию" / "Связаться с атлье" внутри панели —
    // закрыть панель перед скроллом к якорю, иначе document.body.style.overflow
    // остаётся заблокированным (см. openFormula) и браузер не может проскроллить к цели.
    const formulaConsult = document.getElementById('formulaConsult');
    if (formulaConsult) {
      formulaConsult.addEventListener('click', closeFormula);
    }

    const formulaContact = document.getElementById('formulaContact');
    if (formulaContact) {
      formulaContact.addEventListener('click', closeFormula);
    }
  }

})();
