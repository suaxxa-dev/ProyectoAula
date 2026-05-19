(function () {
    'use strict';

    function mercaEsc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function mercaMoney(n) {
        var copValue = Math.round(Number(n));
        return '$ ' + copValue.toLocaleString('es-CO');
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

        var adminLink = ['admin', 'admin_pro', 'admin_junior'].includes(session.rol) ? 
            '<a href="Admin.html" class="profile-dropdown-admin" role="menuitem"><i class="fa-solid fa-lock"></i> Panel Admin</a>' : '';

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
            adminLink +
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


    var trigger;
    var panel;
    var input;
    var profileWrap;
    var profileTrigger;
    var profileMenu;
    var cartWrap;
    var cartTrigger;
    var cartPanel;

    async function init() {
        trigger = document.getElementById('search-trigger');
        panel = document.getElementById('search-panel');
        input = document.getElementById('main-search');

        profileWrap = document.querySelector('.profile-dropdown-wrap');
        profileTrigger = document.getElementById('profile-trigger');
        profileMenu = document.getElementById('profile-menu');

        cartWrap = document.querySelector('.cart-dropdown-wrap');
        cartTrigger = document.getElementById('cart-trigger');
        cartPanel = document.getElementById('cart-panel');

        // Sincronizar sesión y carrito con el servidor
        const session = await mercaCheckSession();
        if (session) {
            await mercaFetchCart();
        }
        
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
            var resQty = await mercaSetCartLineQty(id, q);
            if (!resQty.ok) {
                window.mercaAlert(resQty.message || 'No se pudo actualizar la cantidad.');
            }
            mercaRefreshCartUI();
        });

        // Listener global para todos los botones "Añadir al carrito" (carrusel y grids)
        document.addEventListener('click', async function (e) {
            var btn = e.target.closest('.btn-add-cart');
            if (!btn) return;
            e.preventDefault();
            if (!mercaGetSession()) {
                window.mercaAlert('Inicia sesión para añadir productos al carrito.');
                return;
            }
            var precioNum = parseFloat(btn.dataset.precio);
            if (window.isNaN(precioNum) || precioNum <= 0) {
                window.mercaAlert('Este producto no tiene un precio válido y no puede ser comprado.');
                return;
            }
            var res = await mercaAddToCart({
                id:          btn.dataset.id,
                nombre:      btn.dataset.nombre,
                precioNum:   precioNum,
                precioLabel: btn.dataset.precioLabel,
                img:         btn.dataset.img,
            });
            if (res.ok) {
                mercaRefreshCartUI();
                btn.classList.add('btn-add-cart--added');
                window.setTimeout(function () {
                    btn.classList.remove('btn-add-cart--added');
                }, 650);
            } else if (res.reason === 'auth') {
                window.mercaAlert('Inicia sesión para añadir productos al carrito.');
            } else {
                window.mercaAlert(res.message || 'Error al añadir el producto al carrito.');
            }
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

        // ── Lógica del Carrusel (Comprados Recientemente) ──
        var track = document.getElementById('recent-purchases-track');
        if (track) {
            var prevBtn = document.querySelector('.carousel-control.prev');
            var nextBtn = document.querySelector('.carousel-control.next');
            var slides = Array.from(track.children);
            
            if (slides.length > 0) {
                var currentIndex = 0;
                
                function updateCarousel() {
                    var slideWidth = slides[0].getBoundingClientRect().width;
                    var style = window.getComputedStyle(track);
                    var gap = parseFloat(style.gap) || 0;
                    var offset = currentIndex * (slideWidth + gap);
                    track.style.transform = 'translateX(-' + offset + 'px)';
                }
                
                window.addEventListener('resize', function() {
                    currentIndex = 0;
                    updateCarousel();
                });
                
                nextBtn.addEventListener('click', function() {
                    var slideWidth = slides[0].getBoundingClientRect().width;
                    var style = window.getComputedStyle(track);
                    var gap = parseFloat(style.gap) || 0;
                    var visibleWidth = track.parentElement.clientWidth;
                    var itemsVisible = Math.max(1, Math.floor((visibleWidth + gap) / (slideWidth + gap)));
                    
                    var maxIndex = slides.length - itemsVisible;
                    if (currentIndex < maxIndex) {
                        currentIndex++;
                        updateCarousel();
                    } else {
                        // Loop back to start
                        currentIndex = 0;
                        updateCarousel();
                    }
                });
                
                prevBtn.addEventListener('click', function() {
                    if (currentIndex > 0) {
                        currentIndex--;
                        updateCarousel();
                    } else {
                        var slideWidth = slides[0].getBoundingClientRect().width;
                        var style = window.getComputedStyle(track);
                        var gap = parseFloat(style.gap) || 0;
                        var visibleWidth = track.parentElement.clientWidth;
                        var itemsVisible = Math.max(1, Math.floor((visibleWidth + gap) / (slideWidth + gap)));
                        
                        // Loop back to end
                        currentIndex = Math.max(0, slides.length - itemsVisible);
                        updateCarousel();
                    }
                });
            }
        }

        var hamburgerBtn = document.getElementById('hamburger-trigger');
        var navLinks = document.getElementById('nav-links');
        if (hamburgerBtn && navLinks) {
            hamburgerBtn.onclick = function(e) {
                e.stopPropagation();
                navLinks.classList.toggle('active');
                var icon = hamburgerBtn.querySelector('i');
                if (navLinks.classList.contains('active')) {
                    icon.classList.replace('fa-bars', 'fa-xmark');
                } else {
                    icon.classList.replace('fa-xmark', 'fa-bars');
                }
            };
        }

        document.onclick = function (e) {
            if (panel && !panel.contains(e.target) && e.target !== trigger) panel.classList.remove('active');
            if (profileWrap && !profileWrap.contains(e.target)) {
                profileMenu.classList.remove('is-open');
                profileWrap.classList.remove('menu-open');
                profileTrigger.setAttribute('aria-expanded', 'false');
            }
            if (cartWrap && !cartWrap.contains(e.target)) {
                cartPanel.classList.remove('is-open');
                cartWrap.classList.remove('menu-open');
                cartTrigger.setAttribute('aria-expanded', 'false');
            }
            if (navLinks && navLinks.classList.contains('active') && !navLinks.contains(e.target) && e.target !== hamburgerBtn) {
                navLinks.classList.remove('active');
                var icon = hamburgerBtn.querySelector('i');
                if (icon) icon.classList.replace('fa-xmark', 'fa-bars');
            }
        };
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
