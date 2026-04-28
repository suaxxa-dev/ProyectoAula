(function () {
    'use strict';

    var profileWrap,
        profileTrigger,
        profileMenu,
        cartWrap,
        cartTrigger,
        cartPanel,
        trigger,
        panel,
        input;

    var SEARCH_DB = [];
    var couponApplied = false;
    var TAX_FIXED = 20;

    function mercaEsc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function escAttr(s) {
        return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    }

    function mercaMoney(n) {
        return '$' + (Math.round(Number(n) * 100) / 100).toFixed(2);
    }

    function buildSearchDb() {
        SEARCH_DB = [];
        if (typeof PRODUCTOS_FICHA === 'undefined') return;
        Object.keys(PRODUCTOS_FICHA).forEach(function (id) {
            var d = PRODUCTOS_FICHA[id];
            SEARCH_DB.push({
                nombre: d.titulo,
                precio: d.precioLabel,
                img: d.imagenes[0],
                sku: 'SKU-' + id.replace(/-/g, '').slice(0, 12).toUpperCase(),
                cat: d.breadcrumb[0],
                id: id,
            });
        });
    }

    function refreshCheckoutPage() {
        renderCheckoutLines();
        updateSummary();
    }

    function mercaRefreshCartUI() {
        var badge = document.getElementById('cart-badge-count');
        var body = document.getElementById('cart-panel-body');
        var session = mercaGetSession();
        var totalQty = session ? mercaCartTotalQty() : 0;
        if (badge) {
            badge.textContent = totalQty > 99 ? '99+' : String(totalQty);
            badge.classList.toggle('cart-badge--empty', totalQty === 0);
        }
        if (!body) return;
        if (!session) {
            body.innerHTML =
                '<p class="cart-msg">Inicia sesión para añadir productos y ver tu carrito por cuenta.</p>' +
                '<a href="Login.html" class="cart-login-link">Iniciar sesión</a>';
            return;
        }
        var cart = mercaGetCart();
        if (cart.length === 0) {
            body.innerHTML =
                '<p class="cart-empty">Tu carrito está vacío.</p>' +
                '<p class="cart-hint">Añade productos desde el catálogo.</p>';
            if (document.getElementById('checkout-lines')) refreshCheckoutPage();
            return;
        }
        var lines = cart
            .map(function (item) {
                var q = item.qty || 1;
                var lineTotal = item.precioNum * q;
                var id = mercaEsc(item.id);
                return (
                    '<div class="cart-line">' +
                    '<div class="cart-line-img"><img src="' +
                    mercaEsc(item.img) +
                    '" alt=""></div>' +
                    '<div class="cart-line-main">' +
                    '<p class="cart-line-name">' +
                    mercaEsc(item.nombre) +
                    '</p>' +
                    '<p class="cart-line-meta">' +
                    mercaEsc(item.precioLabel) +
                    ' c/u</p>' +
                    '<div class="cart-line-actions">' +
                    '<div class="cart-qty">' +
                    '<button type="button" class="cart-qty-btn" data-cart-minus="' +
                    id +
                    '" aria-label="Quitar una unidad">−</button>' +
                    '<span class="cart-qty-num">' +
                    q +
                    '</span>' +
                    '<button type="button" class="cart-qty-btn" data-cart-plus="' +
                    id +
                    '" aria-label="Añadir una unidad">+</button>' +
                    '</div>' +
                    '<button type="button" class="cart-remove" data-cart-remove="' +
                    id +
                    '" aria-label="Eliminar producto"><i class="fa-solid fa-trash"></i></button>' +
                    '</div></div>' +
                    '<div class="cart-line-total">' +
                    mercaMoney(lineTotal) +
                    '</div></div>'
                );
            })
            .join('');
        body.innerHTML =
            '<div class="cart-lines">' +
            lines +
            '</div>' +
            '<div class="cart-footer">' +
            '<span>Subtotal</span>' +
            '<strong>' +
            mercaMoney(mercaCartSubtotalNum()) +
            '</strong>' +
            '</div>' +
            mercaCartProceedHtml();
        if (document.getElementById('checkout-lines')) refreshCheckoutPage();
    }

    function mercaRenderProfileMenu() {
        var body = document.getElementById('profile-menu-body');
        var session = mercaGetSession();
        if (!session) {
            body.innerHTML =
                '<p class="profile-dropdown-hint">Accede para comprar y ver tus pedidos</p>' +
                '<a href="Login.html" class="profile-dropdown-login" role="menuitem">Iniciar sesión</a>';
            mercaRefreshCartUI();
            return;
        }
        var esc = mercaEsc;
        var safeName = esc(session.nombre);
        var safeEmail = esc(session.email);
        var initials = session.nombre
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(function (w) {
                return w[0];
            })
            .join('')
            .toUpperCase();
        body.innerHTML =
            '<div class="profile-dropdown-user">' +
            '<div class="profile-dropdown-avatar" aria-hidden="true">' +
            initials +
            '</div>' +
            '<div class="profile-dropdown-identity">' +
            '<p class="profile-dropdown-greeting">Hola, <strong>' +
            safeName +
            '</strong></p>' +
            '<p class="profile-dropdown-email">' +
            safeEmail +
            '</p></div></div>' +
            '<a href="cuenta.html" class="profile-dropdown-account" role="menuitem">Mi cuenta</a>' +
            '<p class="profile-dropdown-hint profile-dropdown-hint--logged">Tu sesión está activa en esta pestaña.</p>' +
            '<a href="ayuda.html" class="profile-dropdown-help" role="menuitem">Centro de información y ayuda</a>' +
            '<button type="button" class="profile-dropdown-logout" id="profile-logout" role="menuitem">Cerrar sesión</button>';
        document.getElementById('profile-logout').addEventListener('click', function () {
            mercaClearSession();
            couponApplied = false;
            window.location.href = 'Mainpage.html';
        });
        mercaRefreshCartUI();
    }

    function splitTitleMeta(nombre) {
        var sep = ' · ';
        var i = nombre.indexOf(sep);
        if (i === -1) return { title: nombre, meta: '' };
        return { title: nombre.slice(0, i), meta: nombre.slice(i + sep.length) };
    }

    function discountedSubtotal(raw) {
        return couponApplied ? Math.round(raw * 90) / 100 : raw;
    }

    function updateSummary() {
        var cart = mercaGetCart();
        var sub = mercaCartSubtotalNum();
        var dSub = discountedSubtotal(sub);
        var tax = cart.length ? TAX_FIXED : 0;
        var total = dSub + tax;

        var elSub = document.getElementById('sum-sub');
        var elDiscRow = document.getElementById('sum-discount-row');
        var elDisc = document.getElementById('sum-discount');
        var elTax = document.getElementById('sum-tax');
        var elTotal = document.getElementById('sum-total');
        var btnPay = document.getElementById('btn-pay');

        if (elSub) elSub.textContent = mercaMoney(sub);
        if (couponApplied && sub > 0) {
            elDiscRow.hidden = false;
            elDisc.textContent = '−' + mercaMoney(sub - dSub);
        } else if (elDiscRow) {
            elDiscRow.hidden = true;
        }
        if (elTax) elTax.textContent = mercaMoney(tax);
        if (elTotal) elTotal.textContent = mercaMoney(total);
        if (btnPay) btnPay.disabled = cart.length === 0;
    }

    function renderCheckoutLines() {
        var wrap = document.getElementById('checkout-lines');
        if (!wrap) return;

        var head = document.getElementById('checkout-list-head');
        var aside = document.getElementById('checkout-summary-aside');
        var title = document.getElementById('checkout-title');

        var cart = mercaGetCart();
        var n = cart.length;
        if (title) {
            title.textContent =
                'Tu carrito de compras (' + n + ' producto' + (n !== 1 ? 's' : '') + ')';
        }

        if (n === 0) {
            wrap.innerHTML =
                '<div class="checkout-empty"><p>Tu carrito está vacío.</p><a href="catalogo.html?cat=tecnologia">Ir al catálogo</a></div>';
            if (head) head.style.display = 'none';
            if (aside) aside.hidden = true;
            updateSummary();
            return;
        }

        if (head) head.style.display = '';
        if (aside) aside.hidden = false;

        var html = cart
            .map(function (item) {
                var q = item.qty || 1;
                var lineTotal = item.precioNum * q;
                var tm = splitTitleMeta(item.nombre);
                var idAttr = escAttr(item.id);
                var metaText = tm.meta
                    ? tm.meta + ' · ' + item.precioLabel + ' c/u'
                    : item.precioLabel + ' c/u';
                return (
                    '<div class="checkout-line">' +
                    '<div class="checkout-line-img"><img src="' +
                    mercaEsc(item.img) +
                    '" alt=""></div>' +
                    '<div class="checkout-line-body">' +
                    '<p class="checkout-line-title">' +
                    mercaEsc(tm.title) +
                    '</p>' +
                    '<p class="checkout-line-meta">' +
                    mercaEsc(metaText) +
                    '</p>' +
                    '<div class="checkout-line-actions">' +
                    '<div class="checkout-qty">' +
                    '<button type="button" data-chk-minus="' +
                    idAttr +
                    '" aria-label="Quitar una unidad">−</button>' +
                    '<span>' +
                    q +
                    '</span>' +
                    '<button type="button" data-chk-plus="' +
                    idAttr +
                    '" aria-label="Añadir una unidad">+</button>' +
                    '</div>' +
                    '<button type="button" class="checkout-remove" data-chk-remove="' +
                    idAttr +
                    '" aria-label="Eliminar producto"><i class="fa-solid fa-trash"></i></button>' +
                    '</div></div>' +
                    '<div class="checkout-line-price">' +
                    mercaMoney(lineTotal) +
                    '</div></div>'
                );
            })
            .join('');
        wrap.innerHTML = '<div class="checkout-lines">' + html + '</div>';
        updateSummary();
    }

    function bindCheckoutLines() {
        var wrap = document.getElementById('checkout-lines');
        if (!wrap) return;
        wrap.addEventListener('click', async function (e) {
            var rm = e.target.closest('[data-chk-remove]');
            if (rm) {
                await mercaRemoveCartLine(rm.getAttribute('data-chk-remove'));
                mercaRefreshCartUI();
                return;
            }
            var minus = e.target.closest('[data-chk-minus]');
            var plus = e.target.closest('[data-chk-plus]');
            var cid = minus ? minus.getAttribute('data-chk-minus') : plus ? plus.getAttribute('data-chk-plus') : null;
            if (!cid) return;
            var cart = mercaGetCart();
            var item = cart.find(function (x) {
                return x.id === cid;
            });
            if (!item) return;
            var q = item.qty || 1;
            if (minus) q -= 1;
            else q += 1;
            await mercaSetCartLineQty(cid, q);
            mercaRefreshCartUI();
        });
    }

    function bindCoupon() {
        var btn = document.getElementById('coupon-apply');
        var inp = document.getElementById('coupon-input');
        var msg = document.getElementById('coupon-msg');
        if (!btn || !inp) return;
        btn.addEventListener('click', function () {
            var code = inp.value.trim().toUpperCase();
            msg.textContent = '';
            msg.className = 'checkout-coupon-msg';
            if (!code) {
                msg.textContent = 'Escribe un código de cupón.';
                msg.classList.add('checkout-coupon-msg--err');
                return;
            }
            if (code === 'MERCA10' || code === 'MERCATODO') {
                couponApplied = true;
                msg.textContent = 'Cupón aplicado: 10% de descuento en el subtotal.';
                msg.classList.add('checkout-coupon-msg--ok');
                updateSummary();
            } else {
                msg.textContent = 'Cupón no válido. Prueba MERCA10.';
                msg.classList.add('checkout-coupon-msg--err');
            }
        });
    }

    function bindPay() {
        var btn = document.getElementById('btn-pay');
        if (!btn) return;
        btn.addEventListener('click', async function () {
            if (mercaGetCart().length === 0) return;
            btn.disabled = true;
            btn.textContent = 'Procesando...';
            try {
                var res = await fetch('/api/orders', { method: 'POST' });
                var data = await res.json();
                if (data.ok) {
                    // Limpiar caché del carrito
                    sessionStorage.removeItem('mercaTodoCartCache');
                    await mercaFetchCart();
                    mercaRefreshCartUI();
                    window.alert(
                        '¡Pedido creado exitosamente!\n\nCódigo: #' + data.order.codigo +
                        '\nTotal: $' + data.order.total.toFixed(2) +
                        '\n\nPuedes ver tu pedido en Mi Cuenta > Pedidos.'
                    );
                } else {
                    window.alert('Error: ' + (data.error || 'No se pudo crear el pedido.'));
                }
            } catch {
                window.alert('Error de red. Intenta de nuevo.');
            }
            btn.disabled = false;
            btn.textContent = 'Pagar';
        });
    }

    function initNav() {
        profileWrap = document.querySelector('.profile-dropdown-wrap');
        profileTrigger = document.getElementById('profile-trigger');
        profileMenu = document.getElementById('profile-menu');
        cartWrap = document.querySelector('.cart-dropdown-wrap');
        cartTrigger = document.getElementById('cart-trigger');
        cartPanel = document.getElementById('cart-panel');
        trigger = document.getElementById('search-trigger');
        panel = document.getElementById('search-panel');
        input = document.getElementById('main-search');

        mercaRenderProfileMenu();

        cartPanel.addEventListener('click', async function (e) {
            var rm = e.target.closest('[data-cart-remove]');
            if (rm) {
                e.stopPropagation();
                await mercaRemoveCartLine(rm.getAttribute('data-cart-remove'));
                mercaRefreshCartUI();
                return;
            }
            var minus = e.target.closest('[data-cart-minus]');
            var plus = e.target.closest('[data-cart-plus]');
            var id = minus ? minus.getAttribute('data-cart-minus') : plus ? plus.getAttribute('data-cart-plus') : null;
            if (!id) return;
            e.stopPropagation();
            var cart = mercaGetCart();
            var item = cart.find(function (x) {
                return x.id === id;
            });
            if (!item) return;
            var q = item.qty || 1;
            if (minus) q -= 1;
            else q += 1;
            await mercaSetCartLineQty(id, q);
            mercaRefreshCartUI();
        });

        cartTrigger.onclick = function (e) {
            e.stopPropagation();
            var open = cartPanel.classList.toggle('is-open');
            cartWrap.classList.toggle('menu-open', open);
            cartTrigger.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (open) {
                panel.classList.remove('active');
                profileMenu.classList.remove('is-open');
                profileWrap.classList.remove('menu-open');
                profileTrigger.setAttribute('aria-expanded', 'false');
                mercaRefreshCartUI();
            }
        };

        trigger.onclick = function (e) {
            e.stopPropagation();
            panel.classList.toggle('active');
            if (panel.classList.contains('active')) {
                input.focus();
                profileMenu.classList.remove('is-open');
                profileWrap.classList.remove('menu-open');
                profileTrigger.setAttribute('aria-expanded', 'false');
                cartPanel.classList.remove('is-open');
                cartWrap.classList.remove('menu-open');
                cartTrigger.setAttribute('aria-expanded', 'false');
            }
        };

        profileTrigger.onclick = function (e) {
            e.stopPropagation();
            var open = profileMenu.classList.toggle('is-open');
            profileWrap.classList.toggle('menu-open', open);
            profileTrigger.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (open) {
                panel.classList.remove('active');
                cartPanel.classList.remove('is-open');
                cartWrap.classList.remove('menu-open');
                cartTrigger.setAttribute('aria-expanded', 'false');
            }
        };

        // ── Motor de búsqueda Python (search-ui.js) ──
        MercaSearch.init({
            inputId:       'main-search',
            containerId:   'results-container',
            skuDisplayId:  'sku-display',
            catsDisplayId: 'cats-display',
            sectionsClass: '.search-section',
        });

        document.onclick = function (e) {
            if (!panel.contains(e.target) && e.target !== trigger) panel.classList.remove('active');
            if (!profileWrap.contains(e.target)) {
                profileMenu.classList.remove('is-open');
                profileWrap.classList.remove('menu-open');
                profileTrigger.setAttribute('aria-expanded', 'false');
            }
            if (!cartWrap.contains(e.target)) {
                cartPanel.classList.remove('is-open');
                cartWrap.classList.remove('menu-open');
                cartTrigger.setAttribute('aria-expanded', 'false');
            }
        };
    }

    async function init() {
        if (!mercaGetSession()) {
            window.location.href = 'Login.html';
            return;
        }
        await mercaFetchCart();
        buildSearchDb();
        initNav();
        bindCheckoutLines();
        bindCoupon();
        bindPay();
        renderCheckoutLines();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
