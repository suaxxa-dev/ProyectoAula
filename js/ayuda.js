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

    function mercaEsc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

    function mercaMoney(n) {
        return '$' + (Math.round(Number(n) * 100) / 100).toFixed(2);
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
    }

    function mercaRenderProfileMenu() {
        var body = document.getElementById('profile-menu-body');
        var session = mercaGetSession();
        if (!session) {
            body.innerHTML =
                '<p class="profile-dropdown-hint">Accede para comprar y ver tus pedidos</p>' +
                '<a href="Login.html" class="profile-dropdown-login" role="menuitem">Iniciar sesión</a>' +
                '<a href="ayuda.html" class="profile-dropdown-help profile-dropdown-help--guest" role="menuitem">Centro de información y ayuda</a>';
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
            window.location.href = 'Mainpage.html';
        });
        mercaRefreshCartUI();
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

    function bindAyudaPanels() {
        var buttons = document.querySelectorAll('.ayuda-nav-btn');
        var panels = document.querySelectorAll('.ayuda-panel');
        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = btn.getAttribute('data-panel');
                buttons.forEach(function (b) {
                    b.classList.toggle('is-active', b === btn);
                    if (b === btn) b.setAttribute('aria-current', 'page');
                    else b.removeAttribute('aria-current');
                });
                panels.forEach(function (p) {
                    var show = p.id === 'panel-' + id;
                    p.classList.toggle('is-visible', show);
                });
            });
        });
    }

    function bindFaqAccordion() {
        document.querySelectorAll('.ayuda-faq-q').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var item = btn.closest('.ayuda-faq-item');
                var list = item.parentElement;
                var opening = !item.classList.contains('is-open');
                if (list && list.classList.contains('ayuda-faq-list')) {
                    list.querySelectorAll('.ayuda-faq-item').forEach(function (sib) {
                        if (sib !== item) {
                            sib.classList.remove('is-open');
                            var qb = sib.querySelector('.ayuda-faq-q');
                            if (qb) {
                                qb.setAttribute('aria-expanded', 'false');
                                var ic = qb.querySelector('.faq-icon');
                                if (ic) ic.textContent = '+';
                            }
                        }
                    });
                }
                item.classList.toggle('is-open', opening);
                btn.setAttribute('aria-expanded', opening ? 'true' : 'false');
                var icon = btn.querySelector('.faq-icon');
                if (icon) icon.textContent = opening ? '−' : '+';
            });
        });
    }

    function bindAyudaCta() {
        var b = document.getElementById('ayuda-btn-mensaje');
        if (b) {
            b.addEventListener('click', function () {
                window.location.href = 'mailto:soporte@mercatodo.demo?subject=Consulta%20MERCA%20TO-DO';
            });
        }
    }

    function init() {
        buildSearchDb();
        initNav();
        bindAyudaPanels();
        bindFaqAccordion();
        bindAyudaCta();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
