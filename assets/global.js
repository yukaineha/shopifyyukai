/* YUKAI theme — shared behaviour: cart drawer, wishlist, accordions, quantity
   steppers, box builder, pincode checker. Talks to Shopify's Ajax Cart API
   (/cart/add.js, /cart/change.js, /cart.js) — no external framework. */
(function () {
  'use strict';

  var CART_ENDPOINT = '/cart';

  /* ---------- tiny helpers ---------- */
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function money(cents) {
    return '₹' + Math.round(cents / 100).toLocaleString('en-IN');
  }

  /* ---------- cart drawer ---------- */
  var overlay = qs('#yk-cart-overlay');

  function openCart() { if (overlay) overlay.classList.add('is-open'); }
  function closeCart() { if (overlay) overlay.classList.remove('is-open'); }

  function renderCartDrawer(cart) {
    var linesEl = qs('#yk-cart-lines');
    var countEls = qsa('.yk-cartbtn__count');
    var totalEl = qs('#yk-cart-subtotal');
    countEls.forEach(function (el) { el.textContent = cart.item_count; });
    if (totalEl) totalEl.textContent = money(cart.total_price);
    if (!linesEl) return;
    if (!cart.items.length) {
      linesEl.innerHTML = '<div class="yk-cart-empty"><div class="yk-kicker" style="color:var(--o);margin-bottom:7px">Nothing in here yet</div><div style="font-size:14.5px;color:rgba(23,87,45,.6)">Add a jar and we\'ll keep it warm.</div></div>';
      return;
    }
    linesEl.innerHTML = cart.items.map(function (item, i) {
      return '' +
        '<div class="yk-cart-line" data-line="' + (i + 1) + '">' +
          '<img src="' + (item.image || '') + '" alt="" width="52" height="66">' +
          '<div style="flex:1;min-width:0">' +
            '<h4 style="font-size:19px;margin:0">' + item.product_title + '</h4>' +
            '<div style="font-size:12px;color:rgba(23,87,45,.6);margin:3px 0 7px">' + (item.variant_title || '') + '</div>' +
            '<div class="yk-cart-line__qty">' +
              '<button class="yk-qtybtn" data-cart-dec>−</button>' +
              '<span style="font-weight:700;font-size:13.5px">' + item.quantity + '</span>' +
              '<button class="yk-qtybtn" data-cart-inc>+</button>' +
            '</div>' +
          '</div>' +
          '<div style="font-weight:700;font-size:15px">' + money(item.final_line_price) + '</div>' +
        '</div>';
    }).join('');
  }

  function fetchCart() {
    return fetch(CART_ENDPOINT + '.js').then(function (r) { return r.json(); }).then(renderCartDrawer);
  }

  function addToCart(id, quantity) {
    return fetch(CART_ENDPOINT + '/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: id, quantity: quantity || 1 })
    }).then(function (r) {
      if (!r.ok) return r.json().then(function (e) { throw e; });
      return r.json();
    }).then(function () { return fetchCart(); }).then(function () { openCart(); });
  }

  function changeLine(line, quantity) {
    return fetch(CART_ENDPOINT + '/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ line: line, quantity: quantity })
    }).then(function (r) { return r.json(); }).then(renderCartDrawer);
  }

  document.addEventListener('click', function (e) {
    var addBtn = e.target.closest('[data-add-to-cart]');
    if (addBtn) {
      e.preventDefault();
      var id = addBtn.getAttribute('data-variant-id');
      var qtyInput = addBtn.closest('form, [data-product-form]');
      var qty = qtyInput ? parseInt((qs('[data-qty-value]', qtyInput) || {}).textContent || '1', 10) : 1;
      addBtn.disabled = true;
      addToCart(id, qty || 1).catch(function (err) {
        alert((err && err.description) || 'Could not add that to the cart.');
      }).then(function () { addBtn.disabled = false; });
      return;
    }
    if (e.target.closest('[data-cart-open]')) { e.preventDefault(); fetchCart().then(openCart); }
    if (e.target.closest('[data-cart-close], [data-cart-scrim]')) closeCart();

    var lineBtn = e.target.closest('[data-cart-inc], [data-cart-dec]');
    if (lineBtn) {
      var row = lineBtn.closest('[data-line]');
      var line = parseInt(row.getAttribute('data-line'), 10);
      var qtyEl = qs('span', row);
      var current = parseInt(qtyEl.textContent, 10);
      var next = lineBtn.hasAttribute('data-cart-inc') ? current + 1 : Math.max(0, current - 1);
      changeLine(line, next);
    }
  });

  if (overlay) fetchCart();

  /* ---------- mobile nav ---------- */
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-nav-toggle]')) {
      var nav = qs('#yk-mobile-nav');
      if (nav) nav.classList.toggle('is-open');
    }
  });

  /* ---------- accordions (FAQ, product details) ---------- */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-acc-toggle]');
    if (!btn) return;
    var item = btn.closest('.yk-acc-item');
    var panel = qs('.yk-acc-panel', item);
    var wasOpen = item.classList.contains('is-open');
    var group = item.closest('[data-acc-group]');
    if (group) {
      qsa('.yk-acc-item.is-open', group).forEach(function (openItem) {
        if (openItem !== item) {
          openItem.classList.remove('is-open');
          qs('.yk-acc-panel', openItem).style.maxHeight = '0px';
        }
      });
    }
    item.classList.toggle('is-open', !wasOpen);
    panel.style.maxHeight = wasOpen ? '0px' : panel.scrollHeight + 20 + 'px';
  });

  /* ---------- quantity steppers (product page) ---------- */
  document.addEventListener('click', function (e) {
    var stepper = e.target.closest('[data-qty-inc], [data-qty-dec]');
    if (!stepper) return;
    var wrap = stepper.closest('[data-qty-wrap]');
    var out = qs('[data-qty-value]', wrap);
    var val = parseInt(out.textContent, 10) || 1;
    val = stepper.hasAttribute('data-qty-inc') ? Math.min(12, val + 1) : Math.max(1, val - 1);
    out.textContent = val;
    wrap.dispatchEvent(new CustomEvent('yk:qtychange', { detail: val, bubbles: true }));
  });

  /* ---------- filter tabs (shelf / collection / shop-all) ---------- */
  document.addEventListener('click', function (e) {
    var chip = e.target.closest('[data-filter-chip]');
    if (!chip) return;
    var group = chip.closest('[data-filter-group]');
    var key = chip.getAttribute('data-filter-chip');
    var grid = qs('[data-filter-target="' + group.getAttribute('data-filter-group') + '"]');
    qsa('[data-filter-chip]', group).forEach(function (c) { c.classList.toggle('is-active', c === chip); });
    qsa('[data-filter-item]', grid).forEach(function (card) {
      var tags = (card.getAttribute('data-filter-item') || '').split(',');
      card.hidden = key !== 'all' && tags.indexOf(key) === -1;
    });
    var empty = qs('[data-filter-empty="' + group.getAttribute('data-filter-group') + '"]');
    if (empty) empty.hidden = qsa('[data-filter-item]:not([hidden])', grid).length > 0;
  });

  /* ---------- product gallery thumbnails ---------- */
  document.addEventListener('click', function (e) {
    var thumb = e.target.closest('[data-gallery-thumb]');
    if (!thumb) return;
    var gallery = thumb.closest('[data-gallery]');
    var main = qs('[data-gallery-main]', gallery);
    if (main) main.src = thumb.getAttribute('data-full');
    qsa('[data-gallery-thumb]', gallery).forEach(function (t) { t.classList.toggle('is-active', t === thumb); });
  });

  /* ---------- variant (pack size) picker ---------- */
  document.addEventListener('click', function (e) {
    var opt = e.target.closest('[data-variant-select]');
    if (!opt) return;
    var group = opt.closest('[data-variant-group]');
    qsa('[data-variant-select]', group).forEach(function (o) { o.classList.toggle('is-active', o === opt); });
    var id = opt.getAttribute('data-variant-id');
    var priceCents = parseInt(opt.getAttribute('data-variant-price'), 10);
    qsa('[data-add-to-cart]', group.closest('[data-product-form]')).forEach(function (btn) {
      btn.setAttribute('data-variant-id', id);
    });
    qsa('[data-price-target]', group.closest('[data-product-form]')).forEach(function (el) {
      el.textContent = money(priceCents);
    });
    group.closest('[data-product-form]').dispatchEvent(new CustomEvent('yk:variantchange', { detail: { id: id, price: priceCents }, bubbles: true }));
  });

  /* ---------- keep line total in sync with qty + variant ---------- */
  qsa('[data-product-form]').forEach(function (form) {
    var lineTotalEl = qs('[data-line-total]', form);
    if (!lineTotalEl) return;
    function recalc() {
      var qty = parseInt((qs('[data-qty-value]', form) || {}).textContent || '1', 10);
      var active = qs('[data-variant-select].is-active', form);
      var price = active ? parseInt(active.getAttribute('data-variant-price'), 10) : parseInt(form.getAttribute('data-base-price'), 10);
      lineTotalEl.textContent = money(price * qty);
    }
    form.addEventListener('yk:qtychange', recalc);
    form.addEventListener('yk:variantchange', recalc);
    recalc();
  });

  /* ---------- generic tab switcher (shop-by-moment, gifting segments, account) ---------- */
  qsa('[data-tabgroup]').forEach(function (group) {
    var name = group.getAttribute('data-tabgroup');
    var active = qs('[data-tab].is-active', group) || qs('[data-tab]', group);
    if (!active) return;
    var activeKey = active.getAttribute('data-tab');
    active.classList.add('is-active');
    qsa('[data-tabpanel="' + name + '"]').forEach(function (panel) {
      panel.hidden = panel.getAttribute('data-tabpanel-key') !== activeKey;
    });
  });
  document.addEventListener('click', function (e) {
    var tab = e.target.closest('[data-tab]');
    if (!tab) return;
    var group = tab.closest('[data-tabgroup]');
    if (!group) return;
    var name = group.getAttribute('data-tabgroup');
    var key = tab.getAttribute('data-tab');
    qsa('[data-tab]', group).forEach(function (t) { t.classList.toggle('is-active', t === tab); });
    qsa('[data-tabpanel="' + name + '"]').forEach(function (panel) {
      panel.hidden = panel.getAttribute('data-tabpanel-key') !== key;
    });
  });

  /* ---------- category story rotation (shop-by-moment) ---------- */
  qsa('[data-story-rotate]').forEach(function (root) {
    var tabs = qsa('[data-tab]', root);
    if (!tabs.length) return;
    var i = 0;
    setInterval(function () {
      i = (i + 1) % tabs.length;
      tabs[i].click();
    }, 6000);
  });

  /* ---------- discount code (redeems via Shopify's /discount/<code> route) ---------- */
  var discountForm = qs('[data-discount-form]');
  if (discountForm) {
    discountForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var code = qs('input[name="code"]', discountForm).value.trim();
      if (!code) return;
      window.location.href = '/discount/' + encodeURIComponent(code) + '?redirect=%2Fcart';
    });
  }

  /* ---------- wishlist (localStorage, per-browser) ---------- */
  var WISH_KEY = 'yukai_wishlist';
  function getWishlist() {
    try { return JSON.parse(localStorage.getItem(WISH_KEY) || '[]'); } catch (e) { return []; }
  }
  function setWishlist(list) {
    try { localStorage.setItem(WISH_KEY, JSON.stringify(list)); } catch (e) {}
  }
  function paintWishButtons() {
    var list = getWishlist();
    qsa('[data-wish-toggle]').forEach(function (btn) {
      var id = btn.getAttribute('data-wish-toggle');
      btn.classList.toggle('is-active', list.indexOf(id) > -1);
    });
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-wish-toggle]');
    if (!btn) return;
    e.preventDefault();
    var id = btn.getAttribute('data-wish-toggle');
    var list = getWishlist();
    var i = list.indexOf(id);
    if (i > -1) list.splice(i, 1); else list.push(id);
    setWishlist(list);
    paintWishButtons();
    document.dispatchEvent(new CustomEvent('yk:wishlistchange'));
  });
  paintWishButtons();
  window.YukaiWishlist = { get: getWishlist, set: setWishlist };

  /* ---------- pincode checker (indicative — not a live courier API) ---------- */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-pincode-check]');
    if (!btn) return;
    var wrap = btn.closest('[data-pincode-wrap]');
    var input = qs('input', wrap);
    var msg = qs('[data-pincode-msg]', wrap);
    var val = (input.value || '').replace(/\D/g, '').slice(0, 6);
    input.value = val;
    msg.textContent = val.length === 6 ? 'Reaches ' + val + ' in 2 to 3 days.' : 'Six digits, please.';
  });

  /* ---------- build-your-own-box ---------- */
  var boxRoot = qs('[data-box-builder]');
  if (boxRoot) {
    var boxState = { slots: parseInt(boxRoot.getAttribute('data-box-slots'), 10) || 6, picked: [] };

    function renderBox() {
      qsa('[data-box-slot]', boxRoot).forEach(function (slot, i) {
        var pid = boxState.picked[i];
        var tile = qsa('[data-box-tile]', boxRoot).find(function (t) { return t.getAttribute('data-box-tile') === pid; });
        slot.innerHTML = tile
          ? '<img src="' + tile.getAttribute('data-img') + '" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55">' +
            '<div style="position:absolute;inset:0;background:' + tile.getAttribute('data-color') + '"></div>' +
            '<div style="position:absolute;inset:auto 0 0 0;padding:8px;color:#fff;font:700 10.5px/1.25 var(--font-body)">' + tile.getAttribute('data-label') + '</div>'
          : '<div style="position:absolute;inset:auto 0 0 0;padding:8px;color:rgba(23,87,45,.42);font:700 10.5px/1.25 var(--font-body)">Pick a jar</div>';
      });
      var countEl = qs('[data-box-count]', boxRoot);
      if (countEl) countEl.textContent = boxState.picked.length + ' of ' + boxState.slots + ' chosen';
      var cta = qs('[data-box-cta]', boxRoot);
      if (cta) cta.disabled = boxState.picked.length === 0;
    }

    boxRoot.addEventListener('click', function (e) {
      var tile = e.target.closest('[data-box-tile]');
      if (tile) {
        var pid = tile.getAttribute('data-box-tile');
        var i = boxState.picked.indexOf(pid);
        if (i > -1) boxState.picked.splice(i, 1);
        else if (boxState.picked.length < boxState.slots) boxState.picked.push(pid);
        tile.classList.toggle('is-picked', boxState.picked.indexOf(pid) > -1);
        renderBox();
        return;
      }
      if (e.target.closest('[data-box-clear]')) { boxState.picked = []; renderBox(); qsa('[data-box-tile]', boxRoot).forEach(function (t) { t.classList.remove('is-picked'); }); return; }
      if (e.target.closest('[data-box-cta]')) {
        var ids = boxState.picked.map(function (pid2) {
          var t2 = qsa('[data-box-tile]', boxRoot).find(function (t3) { return t3.getAttribute('data-box-tile') === pid2; });
          return t2 ? t2.getAttribute('data-variant-id') : null;
        }).filter(Boolean);
        if (!ids.length) return;
        Promise.all(ids.map(function (id) {
          return fetch(CART_ENDPOINT + '/add.js', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id, quantity: 1 })
          });
        })).then(fetchCart).then(openCart).then(function () {
          boxState.picked = [];
          qsa('[data-box-tile].is-picked', boxRoot).forEach(function (t) { t.classList.remove('is-picked'); });
          renderBox();
        });
      }
    });
    renderBox();
  }

  window.Yukai = { openCart: openCart, closeCart: closeCart, addToCart: addToCart, fetchCart: fetchCart, money: money };
})();
