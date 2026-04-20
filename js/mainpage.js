(function () {
    'use strict';

    function mercaEsc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
                '<p class="cart-hint">Añade productos desde la sección de abajo.</p>';
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

        var esc = function (s) {
            return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        };
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
            mercaRenderProfileMenu();
            profileMenu.classList.remove('is-open');
            profileWrap.classList.remove('menu-open');
            profileTrigger.setAttribute('aria-expanded', 'false');
        });

        mercaRefreshCartUI();
    }

    var SEARCH_DB = [
        { nombre: 'Tenis Nike Air Max', precio: '$149.99', sku: 'SKU-1002345', img: 'img/nike-black.png', cat: 'Calzado Hombre' },
        { nombre: 'Tenis Nike Revolution', precio: '$59.99', sku: 'SKU-1002346', img: 'img/nike-white.png', cat: 'Calzado Mujer' },
        { nombre: 'iPhone 15 Pro Max', precio: '$1,199.00', sku: 'SKU-990011', img: 'img/iphone.png', cat: 'Tecnología' },
    ];

    var trigger;
    var panel;
    var input;
    var profileWrap;
    var profileTrigger;
    var profileMenu;
    var cartWrap;
    var cartTrigger;
    var cartPanel;

    function init() {
        trigger = document.getElementById('search-trigger');
        panel = document.getElementById('search-panel');
        input = document.getElementById('main-search');

        profileWrap = document.querySelector('.profile-dropdown-wrap');
        profileTrigger = document.getElementById('profile-trigger');
        profileMenu = document.getElementById('profile-menu');

        cartWrap = document.querySelector('.cart-dropdown-wrap');
        cartTrigger = document.getElementById('cart-trigger');
        cartPanel = document.getElementById('cart-panel');

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

        var prodGrid = document.querySelector('.prod-grid');
        if (prodGrid) {
            prodGrid.addEventListener('click', async function (e) {
                var btn = e.target.closest('.btn-add-cart');
                if (!btn) return;
                e.preventDefault();
                if (!mercaGetSession()) {
                    window.alert('Inicia sesión para añadir productos al carrito.');
                    return;
                }
                var precioNum = parseFloat(btn.dataset.precio);
                if (window.isNaN(precioNum)) return;
                var res = await mercaAddToCart({
                    id: btn.dataset.id,
                    nombre: btn.dataset.nombre,
                    precioNum: precioNum,
                    precioLabel: btn.dataset.precioLabel,
                    img: btn.dataset.img,
                });
                if (res.ok) {
                    mercaRefreshCartUI();
                    btn.classList.add('btn-add-cart--added');
                    window.setTimeout(function () {
                        btn.classList.remove('btn-add-cart--added');
                    }, 650);
                }
            });
        }

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

        input.oninput = function () {
            var query = input.value.toLowerCase().trim();
            var sections = document.querySelectorAll('.search-section');
            var resultsCont = document.getElementById('results-container');

            if (query.length > 0) {
                var filtered = SEARCH_DB.filter(function (p) {
                    return p.nombre.toLowerCase().includes(query);
                });
                if (filtered.length > 0) {
                    resultsCont.innerHTML = filtered
                        .map(function (p) {
                            return (
                                '<div class="sug-item">' +
                                '<div class="s-img-box"><img src="' +
                                mercaEsc(p.img) +
                                '" alt=""></div>' +
                                '<p class="s-name"><b>' +
                                mercaEsc(p.nombre) +
                                '</b></p>' +
                                '<p class="s-price">' +
                                mercaEsc(p.precio) +
                                '</p></div>'
                            );
                        })
                        .join('');
                    document.getElementById('sku-display').innerHTML =
                        '<b>' + mercaEsc(filtered[0].nombre) + '</b> — ' + mercaEsc(filtered[0].sku);
                    document.getElementById('cats-display').innerHTML =
                        '<li><i class="fa-solid fa-check"></i> Ver en "' + mercaEsc(filtered[0].cat) + '"</li>';
                    sections.forEach(function (s) {
                        s.classList.add('show');
                    });
                } else {
                    resultsCont.innerHTML = '<p style="padding:10px; color:#888;">Sin resultados...</p>';
                    sections[0].classList.add('show');
                    sections[1].classList.remove('show');
                    sections[2].classList.remove('show');
                }
            } else {
                sections.forEach(function (s) {
                    s.classList.remove('show');
                });
            }
        };

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

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
