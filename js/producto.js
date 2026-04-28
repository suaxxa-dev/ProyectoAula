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

    var currentProductId = '';
    var currentData = null;
    var selectedColorIdx = 0;
    var selectedTalla = '';
    var mainImageIdx = 0;

    var CAT_FROM_CRUMB = {
        Tecnología: 'tecnologia',
        Hogar: 'hogar',
        Moda: 'moda',
        Herramientas: 'herramientas',
    };

    var SEARCH_DB = [];
    function buildSearchDb() {
        SEARCH_DB = [];
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
                    '">−</button>' +
                    '<span class="cart-qty-num">' +
                    q +
                    '</span>' +
                    '<button type="button" class="cart-qty-btn" data-cart-plus="' +
                    id +
                    '">+</button>' +
                    '</div>' +
                    '<button type="button" class="cart-remove" data-cart-remove="' +
                    id +
                    '"><i class="fa-solid fa-trash"></i></button>' +
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
            '<div class="profile-dropdown-avatar">' +
            initials +
            '</div>' +
            '<div class="profile-dropdown-identity">' +
            '<p class="profile-dropdown-greeting">Hola, <strong>' +
            esc(session.nombre) +
            '</strong></p>' +
            '<p class="profile-dropdown-email">' +
            esc(session.email) +
            '</p></div></div>' +
            '<a href="cuenta.html" class="profile-dropdown-account" role="menuitem">Mi cuenta</a>' +
            '<p class="profile-dropdown-hint profile-dropdown-hint--logged">Tu sesión está activa.</p>' +
            '<a href="ayuda.html" class="profile-dropdown-help" role="menuitem">Centro de información y ayuda</a>' +
            '<button type="button" class="profile-dropdown-logout" id="profile-logout">Cerrar sesión</button>';
        document.getElementById('profile-logout').addEventListener('click', function () {
            mercaClearSession();
            mercaRenderProfileMenu();
            profileMenu.classList.remove('is-open');
            profileWrap.classList.remove('menu-open');
            profileTrigger.setAttribute('aria-expanded', 'false');
        });
        mercaRefreshCartUI();
    }

    function starsHtmlRating(r) {
        var full = Math.floor(r);
        var half = r - full >= 0.5 ? 1 : 0;
        var o = '';
        var i;
        for (i = 0; i < full; i++) o += '★';
        if (half) o += '★';
        for (i = full + half; i < 5; i++) o += '☆';
        return o;
    }

    function getProductIdFromUrl() {
        var p = new URLSearchParams(window.location.search);
        return (p.get('id') || '').trim();
    }

    function buildNombreCarrito() {
        var base = currentData.titulo;
        var parts = [base];
        if (currentData.colores && currentData.colores[selectedColorIdx]) {
            parts.push('Color: ' + currentData.colores[selectedColorIdx].nombre);
        }
        if (currentData.tallas && currentData.tallas.length && selectedTalla) {
            parts.push('Talla: ' + selectedTalla);
        }
        return parts.join(' · ');
    }

    function renderProduct() {
        var id = getProductIdFromUrl();
        currentProductId = id;
        currentData = PRODUCTOS_FICHA[id];

        if (!currentData) {
            document.querySelector('.producto-wrap').innerHTML =
                '<p class="catalog-empty-filters" style="margin:40px auto;">Producto no encontrado. <a href="catalogo.html">Ir al catálogo</a></p>';
            return;
        }

        var d = currentData;
        document.title = 'MERCA TO-DO | ' + mercaEsc(d.titulo);

        var bc = d.breadcrumb
            .map(function (seg, i) {
                return i < d.breadcrumb.length - 1 ? '<span>' + mercaEsc(seg) + '</span>' : '<strong>' + mercaEsc(seg) + '</strong>';
            })
            .join(' <span>/</span> ');
        document.getElementById('p-breadcrumb').innerHTML =
            '<a href="Mainpage.html">Inicio</a> <span>/</span> ' +
            bc;

        var catLink = CAT_FROM_CRUMB[d.breadcrumb[0]] || 'tecnologia';
        var backCat = document.querySelector('.producto-back a[href*="catalogo"]');
        if (backCat) backCat.setAttribute('href', 'catalogo.html?cat=' + catLink);

        mainImageIdx = 0;
        selectedColorIdx = 0;
        selectedTalla = d.tallas && d.tallas.length ? d.tallas[0] : '';

        var mains = d.imagenes
            .map(function (src, idx) {
                return (
                    '<div class="producto-main-img" data-main-idx="' +
                    idx +
                    '" style="display:' +
                    (idx === 0 ? 'flex' : 'none') +
                    '"><img src="' +
                    mercaEsc(src) +
                    '" alt=""></div>'
                );
            })
            .join('');
        document.getElementById('p-main-images').innerHTML = mains;

        var thumbs = d.miniaturas
            .map(function (src, idx) {
                return (
                    '<button type="button" class="producto-thumb' +
                    (idx === 0 ? ' is-active' : '') +
                    '" data-idx="' +
                    idx +
                    '"><img src="' +
                    mercaEsc(src) +
                    '" alt=""></button>'
                );
            })
            .join('');
        document.getElementById('p-thumbs').innerHTML = thumbs;

        document.getElementById('p-titulo').textContent = d.titulo;
        document.getElementById('p-rating').innerHTML =
            '<span class="producto-stars">' +
            starsHtmlRating(d.rating) +
            '</span>' +
            '<span class="producto-rating-meta">' +
            d.rating +
            ' (' +
            d.opiniones +
            ' opiniones)</span>';

        var priceHtml =
            '<div class="producto-price-current">' +
            mercaEsc(d.precioLabel) +
            '</div>';
        if (d.precioAnterior) {
            var ahorro = d.precioAnterior - d.precioNum;
            priceHtml +=
                '<span class="producto-price-old">PRECIO ANTERIOR <strong>' +
                mercaMoney(d.precioAnterior) +
                '</strong> (Ahorras ' +
                mercaMoney(ahorro) +
                ')</span>';
        }
        document.getElementById('p-price-block').innerHTML = priceHtml;
        document.getElementById('p-desc').textContent = d.descripcion;

        var colWrap = document.getElementById('p-colores-wrap');
        if (d.colores && d.colores.length) {
            colWrap.classList.remove('producto-options--hidden');
            document.getElementById('p-colores').innerHTML = d.colores
                .map(function (c, idx) {
                    return (
                        '<button type="button" class="producto-swatch' +
                        (idx === 0 ? ' is-active' : '') +
                        '" data-idx="' +
                        idx +
                        '" style="background:' +
                        c.hex +
                        '" title="' +
                        mercaEsc(c.nombre) +
                        '" aria-label="' +
                        mercaEsc(c.nombre) +
                        '"></button>'
                    );
                })
                .join('');
        } else {
            colWrap.classList.add('producto-options--hidden');
        }

        var tallaWrap = document.getElementById('p-tallas-wrap');
        if (d.tallas && d.tallas.length) {
            tallaWrap.classList.remove('producto-options--hidden');
            document.getElementById('p-tallas-label').textContent =
                d.tallas[0].match(/^\d+$/) ? 'TALLA US' : 'TALLA';
            document.getElementById('p-tallas').innerHTML = d.tallas
                .map(function (t, idx) {
                    return (
                        '<button type="button" class="producto-talla-btn' +
                        (idx === 0 ? ' is-active' : '') +
                        '" data-talla="' +
                        mercaEsc(t) +
                        '">' +
                        mercaEsc(t) +
                        '</button>'
                    );
                })
                .join('');
        } else {
            tallaWrap.classList.add('producto-options--hidden');
        }

        var v = d.vendedor;
        document.getElementById('p-vendedor').innerHTML =
            '<div class="producto-vendedor-top">' +
            '<span>Vendido por: <span class="producto-vendedor-nombre">' +
            mercaEsc(v.nombre) +
            '</span></span>' +
            (v.estrella ? '<span class="badge-estrella">vendedor estrella</span>' : '') +
            (v.badge ? '<span class="badge-ventas">' + mercaEsc(v.badge) + '</span>' : '') +
            '</div>' +
            '<div class="producto-vendedor-stars">★★★★★</div>';

        document.getElementById('p-caracteristicas').innerHTML = d.caracteristicas
            .map(function (c) {
                return '<li>' + mercaEsc(c) + '</li>';
            })
            .join('');

        document.getElementById('p-especificaciones').innerHTML =
            '<tbody>' +
            d.especificaciones
                .map(function (row) {
                    return (
                        '<tr><td>' +
                        mercaEsc(row.k) +
                        '</td><td>' +
                        mercaEsc(row.v) +
                        '</td></tr>'
                    );
                })
                .join('') +
            '</tbody>';

        document.getElementById('p-opiniones').innerHTML = d.opinionesHtml || '<p>Sin opiniones aún.</p>';

        document.getElementById('p-relacionados').innerHTML = d.relacionados
            .filter(function (rid) {
                return PRODUCTOS_FICHA[rid];
            })
            .map(function (rid) {
                var r = PRODUCTOS_FICHA[rid];
                return (
                    '<a class="producto-rel-card" href="producto.html?id=' +
                    encodeURIComponent(rid) +
                    '">' +
                    '<button type="button" class="rel-wish" onclick="event.preventDefault();event.stopPropagation();" aria-label="Favoritos"><i class="fa-regular fa-heart"></i></button>' +
                    '<div class="producto-rel-img"><img src="' +
                    mercaEsc(r.imagenes[0]) +
                    '" alt=""></div>' +
                    '<div class="producto-rel-info">' +
                    mercaEsc(r.titulo.substring(0, 40)) +
                    (r.titulo.length > 40 ? '…' : '') +
                    '</div></a>'
                );
            })
            .join('');

        bindProductInteractions();
    }

    function bindProductInteractions() {
        document.querySelectorAll('.producto-thumb').forEach(function (btn) {
            btn.onclick = function () {
                var idx = parseInt(btn.getAttribute('data-idx'), 10);
                mainImageIdx = idx;
                document.querySelectorAll('.producto-thumb').forEach(function (b) {
                    b.classList.toggle('is-active', b === btn);
                });
                document.querySelectorAll('.producto-main-img').forEach(function (box, i) {
                    box.style.display = i === idx ? 'flex' : 'none';
                });
            };
        });

        document.querySelectorAll('.producto-swatch').forEach(function (btn) {
            btn.onclick = function () {
                selectedColorIdx = parseInt(btn.getAttribute('data-idx'), 10);
                document.querySelectorAll('.producto-swatch').forEach(function (b) {
                    b.classList.toggle('is-active', b === btn);
                });
            };
        });

        document.querySelectorAll('.producto-talla-btn').forEach(function (btn) {
            btn.onclick = function () {
                selectedTalla = btn.getAttribute('data-talla');
                document.querySelectorAll('.producto-talla-btn').forEach(function (b) {
                    b.classList.toggle('is-active', b === btn);
                });
            };
        });

        var addBtn = document.getElementById('p-add-cart');
        addBtn.onclick = async function () {
            if (!mercaGetSession()) {
                window.alert('Inicia sesión para añadir al carrito.');
                return;
            }
            if (currentData.tallas && currentData.tallas.length && !selectedTalla) {
                window.alert('Selecciona una talla.');
                return;
            }
            var nombre = buildNombreCarrito();
            var lineId =
                currentProductId +
                '::c' +
                selectedColorIdx +
                '::t' +
                String(selectedTalla || '').replace(/:/g, '');
            var res = await mercaAddToCart({
                id: lineId,
                nombre: nombre,
                precioNum: currentData.precioNum,
                precioLabel: currentData.precioLabel,
                img: currentData.imagenes[0],
            });
            if (res.ok) {
                mercaRefreshCartUI();
                addBtn.textContent = 'AÑADIDO ✓';
                window.setTimeout(function () {
                    addBtn.textContent = 'AÑADIR AL CARRITO';
                }, 1200);
            }
        };

        document.querySelectorAll('.producto-tab').forEach(function (tab) {
            tab.onclick = function () {
                var name = tab.getAttribute('data-tab');
                document.querySelectorAll('.producto-tab').forEach(function (t) {
                    var on = t.getAttribute('data-tab') === name;
                    t.classList.toggle('is-active', on);
                    t.setAttribute('aria-selected', on ? 'true' : 'false');
                });
                ['caracteristicas', 'especificaciones', 'opiniones'].forEach(function (pane) {
                    var el = document.getElementById('panel-' + pane);
                    var show = pane === name;
                    el.hidden = !show;
                    el.classList.toggle('is-visible', show);
                });
            };
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
            var cid = minus ? minus.getAttribute('data-cart-minus') : plus ? plus.getAttribute('data-cart-plus') : null;
            if (!cid) return;
            e.stopPropagation();
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

    function init() {
        buildSearchDb();
        initNav();
        renderProduct();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
