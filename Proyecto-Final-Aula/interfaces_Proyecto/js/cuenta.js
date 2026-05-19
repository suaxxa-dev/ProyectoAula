(function () {
    'use strict';

    var MERCA_PROFILE_KEY = 'mercaTodoProfileDemo';

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

    var DEMO_ORDERS = [
        {
            codigo: 'MT-89432',
            fechaLabel: '15/10/2023',
            total: 739.96,
            estado: 'enviado',
            items: [
                { nombre: 'Sony Headphones WH-CH720N', img: 'img/cat-tecnologia-audifonos-bt.jpg' },
                { nombre: "Nike Air Force 1 '07", img: 'img/cat-moda-tenis-urbanos.jpg' },
            ],
        },
        {
            codigo: 'MT-87201',
            fechaLabel: '03/09/2023',
            total: 159.99,
            estado: 'entregado',
            items: [{ nombre: 'Monitor LG UltraWide', img: 'img/cat-tecnologia-monitor-lg.jpg' }],
        },
    ];

    function mercaEsc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
            });
        });
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

        cartPanel.addEventListener('click', function (e) {
            var rm = e.target.closest('[data-cart-remove]');
            if (rm) {
                e.stopPropagation();
                mercaRemoveCartLine(rm.getAttribute('data-cart-remove'));
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
            mercaSetCartLineQty(id, q);
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
                                '<a class="sug-item" href="catalogo.html?cat=tecnologia">' +
                                '<div class="s-img-box"><img src="' +
                                mercaEsc(p.img) +
                                '" alt=""></div>' +
                                '<p class="s-name"><b>' +
                                mercaEsc(p.nombre) +
                                '</b></p>' +
                                '<p class="s-price">' +
                                mercaEsc(p.precio) +
                                '</p></a>'
                            );
                        })
                        .join('');
                    document.getElementById('sku-display').innerHTML =
                        '<b>' + mercaEsc(filtered[0].nombre) + '</b> — ' + mercaEsc(filtered[0].sku);
                    document.getElementById('cats-display').innerHTML =
                        '<li><i class="fa-solid fa-check"></i> ' + mercaEsc(filtered[0].cat) + '</li>';
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

    function stepperHtml(estado) {
        var e = (estado || '').toLowerCase();
        var s1 = 'cuenta-step is-done';
        var s2 = 'cuenta-step';
        var s3 = 'cuenta-step';
        var s4 = 'cuenta-step';
        var i3 = 'fa-truck-fast';
        var i4 = 'fa-house-chimney';
        if (e === 'entregado') {
            s2 = 'cuenta-step is-done';
            s3 = 'cuenta-step is-done';
            s4 = 'cuenta-step is-done';
            i3 = 'fa-circle-check';
            i4 = 'fa-circle-check';
        } else if (e === 'enviado') {
            s2 = 'cuenta-step is-done';
            s3 = 'cuenta-step is-current';
        } else {
            s1 = 'cuenta-step is-done';
        }
        return (
            '<div class="cuenta-stepper">' +
            '<div class="' +
            s1 +
            '"><i class="fa-solid fa-circle-check" aria-hidden="true"></i>Confirmado</div>' +
            '<div class="' +
            s2 +
            '"><i class="fa-solid ' +
            (s2.indexOf('is-done') >= 0 ? 'fa-circle-check' : 'fa-circle') +
            '" aria-hidden="true"></i>Procesando</div>' +
            '<div class="' +
            s3 +
            '"><i class="fa-solid ' +
            i3 +
            '" aria-hidden="true"></i>Enviado</div>' +
            '<div class="' +
            s4 +
            '"><i class="fa-solid ' +
            i4 +
            '" aria-hidden="true"></i>Entregado</div>' +
            '</div>'
        );
    }

    function renderUltimoPedido() {
        var el = document.getElementById('cuenta-ultimo-pedido');
        if (!el) return;
        var o = DEMO_ORDERS[0];
        el.innerHTML =
            '<div class="cuenta-order-card-head">' +
            '<div>' +
            '<h3><i class="fa-solid fa-box" aria-hidden="true"></i> Último pedido</h3>' +
            '<p class="cuenta-order-meta">ID del pedido: <strong>#' +
            mercaEsc(o.codigo) +
            '</strong><br>Fecha: <strong>' +
            mercaEsc(o.fechaLabel) +
            '</strong><br>Total: <strong>' +
            mercaMoney(o.total) +
            '</strong></p></div>' +
            '<button type="button" class="btn-cuenta-orange" data-go-pedido>Ver detalle</button></div>' +
            stepperHtml(o.estado);
    }

    function badgeClass(estado) {
        return estado === 'entregado' ? 'cuenta-badge cuenta-badge--entregado' : 'cuenta-badge cuenta-badge--enviado';
    }

    function badgeLabel(estado) {
        return estado === 'entregado' ? 'Entregado' : 'Enviado';
    }

    function filterOrders() {
        var est = document.getElementById('filtro-estado').value;
        var fecha = document.getElementById('filtro-fecha').value;
        var cod = (document.getElementById('filtro-codigo').value || '').trim().toUpperCase();
        return DEMO_ORDERS.filter(function (o, idx) {
            if (est !== 'todos' && o.estado !== est) return false;
            if (fecha === 'mes' && idx > 0) return false;
            if (cod && o.codigo.toUpperCase().indexOf(cod) === -1) return false;
            return true;
        });
    }

    function renderPedidos() {
        var list = document.getElementById('pedidos-list');
        if (!list) return;
        var rows = filterOrders();
        if (rows.length === 0) {
            list.innerHTML = '<p style="color:#64748b;">No hay pedidos que coincidan con los filtros.</p>';
            return;
        }
        list.innerHTML = rows
            .map(function (o, i) {
                var itemsHtml = o.items
                    .map(function (it) {
                        return (
                            '<div class="cuenta-pedido-item">' +
                            '<img src="' +
                            mercaEsc(it.img) +
                            '" alt="">' +
                            '<span>' +
                            mercaEsc(it.nombre) +
                            '</span></div>'
                        );
                    })
                    .join('');
                return (
                    '<article class="cuenta-pedido-card">' +
                    '<div class="cuenta-pedido-top">' +
                    '<div><h3>Pedido ' +
                    (i + 1) +
                    ' #' +
                    mercaEsc(o.codigo) +
                    '</h3>' +
                    '<p>Fecha: <strong>' +
                    mercaEsc(o.fechaLabel) +
                    '</strong> · Total: <strong>' +
                    mercaMoney(o.total) +
                    '</strong></p></div>' +
                    '<span class="' +
                    badgeClass(o.estado) +
                    '">' +
                    badgeLabel(o.estado) +
                    '</span></div>' +
                    '<div class="cuenta-pedido-items">' +
                    itemsHtml +
                    '</div>' +
                    '<div class="cuenta-pedido-actions">' +
                    '<button type="button" class="btn-cuenta-outline" data-demo="rastreo">Rastrear pedido</button>' +
                    '<button type="button" class="btn-cuenta-outline" data-demo="factura">Ver factura</button>' +
                    '</div></article>'
                );
            })
            .join('');
    }

    function showPanel(panelId, pushHash) {
        document.querySelectorAll('.cuenta-nav-btn[data-panel]').forEach(function (b) {
            var on = b.getAttribute('data-panel') === panelId;
            b.classList.toggle('is-active', on);
            if (on) b.setAttribute('aria-current', 'page');
            else b.removeAttribute('aria-current');
        });
        document.querySelectorAll('.cuenta-panel').forEach(function (p) {
            p.classList.toggle('is-visible', p.id === 'panel-' + panelId);
        });
        if (pushHash !== false) {
            if (history.replaceState) history.replaceState(null, '', '#' + panelId);
            else window.location.hash = panelId;
        }
    }

    function loadProfileForm() {
        var s = mercaGetSession();
        if (!s) return;
        document.getElementById('dato-nombre').value = s.nombre || '';
        document.getElementById('dato-email').value = s.email || '';
        var extra = {};
        try {
            var raw = localStorage.getItem(MERCA_PROFILE_KEY);
            if (raw) extra = JSON.parse(raw) || {};
        } catch {
            extra = {};
        }
        document.getElementById('dato-tel').value = extra.telefono || '';
        document.getElementById('dato-nac').value = extra.nacimiento || '';
    }

    function saveProfileForm() {
        var tel = document.getElementById('dato-tel').value.trim();
        var nac = document.getElementById('dato-nac').value;
        var nom = document.getElementById('dato-nombre').value.trim();
        localStorage.setItem(
            MERCA_PROFILE_KEY,
            JSON.stringify({
                telefono: tel,
                nacimiento: nac,
            })
        );
        if (nom && mercaGetSession()) {
            var u = mercaGetSession();
            mercaSetSession({ nombre: nom, email: u.email });
        }
        var now = new Date();
        var d = String(now.getDate()).padStart(2, '0');
        var m = String(now.getMonth() + 1).padStart(2, '0');
        document.getElementById('dato-ultima-act').textContent = d + '/' + m + '/' + now.getFullYear();
        var ok = document.getElementById('dato-save-ok');
        ok.classList.add('is-visible');
        window.setTimeout(function () {
            ok.classList.remove('is-visible');
        }, 4000);
        mercaRenderProfileMenu();
    }

    function bindCuentaUi() {
        document.querySelectorAll('.cuenta-nav-btn[data-panel]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                showPanel(btn.getAttribute('data-panel'));
            });
        });

        document.querySelectorAll('.cuenta-quick-card[data-go]').forEach(function (a) {
            a.addEventListener('click', function (e) {
                e.preventDefault();
                showPanel(a.getAttribute('data-go'));
            });
        });

        var ultimo = document.getElementById('cuenta-ultimo-pedido');
        if (ultimo) {
            ultimo.addEventListener('click', function (e) {
                if (e.target.closest('[data-go-pedido]')) {
                    showPanel('pedidos');
                }
            });
        }

        document.getElementById('filtro-estado').addEventListener('change', renderPedidos);
        document.getElementById('filtro-fecha').addEventListener('change', renderPedidos);
        document.getElementById('filtro-codigo').addEventListener('input', renderPedidos);

        document.getElementById('cuenta-logout-side').addEventListener('click', function () {
            mercaClearSession();
            window.location.href = 'Mainpage.html';
        });

        document.getElementById('form-datos-personales').addEventListener('submit', function (e) {
            e.preventDefault();
            saveProfileForm();
        });

        document.getElementById('form-password').addEventListener('submit', function (e) {
            e.preventDefault();
            window.alert('Demo MERCA TO-DO: la contraseña no se cambia en este entorno. Usa los requisitos listados como guía.');
        });

        document.getElementById('btn-add-dir').addEventListener('click', function () {
            window.alert('Demo: aquí se abriría el formulario para una nueva dirección.');
        });

        document.querySelectorAll('.cuenta-dir-actions button').forEach(function (b) {
            b.addEventListener('click', function () {
                window.alert('Demo: acción de edición o eliminación de dirección.');
            });
        });

        document.getElementById('pedidos-list').addEventListener('click', function (e) {
            var t = e.target.closest('[data-demo]');
            if (!t) return;
            var k = t.getAttribute('data-demo');
            window.alert(
                k === 'rastreo'
                    ? 'Demo: seguimiento del envío con el transportista.'
                    : 'Demo: descarga o vista de factura en PDF.'
            );
        });
    }

    function applyHash() {
        var h = (window.location.hash || '').replace(/^#/, '').toLowerCase();
        var allowed = ['resumen', 'pedidos', 'direcciones', 'datos', 'seguridad'];
        if (allowed.indexOf(h) !== -1) showPanel(h, false);
        else showPanel('resumen', false);
    }

    function init() {
        if (!mercaGetSession()) {
            window.location.href = 'Login.html';
            return;
        }
        var s = mercaGetSession();
        document.getElementById('cuenta-greet').textContent = '¡Hola, ' + s.nombre + '!';

        buildSearchDb();
        initNav();
        renderUltimoPedido();
        renderPedidos();
        loadProfileForm();
        bindCuentaUi();
        applyHash();
        window.addEventListener('hashchange', applyHash);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
