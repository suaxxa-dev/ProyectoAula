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

    var currentCatKey = 'tecnologia';
    /** 'cat' | 'seccion' */
    var currentViewMode = 'cat';
    var currentSeccionKey = '';

    var CAT_LABEL = {
        tecnologia: 'TECNOLOGÍA',
        hogar: 'HOGAR',
        moda: 'MODA',
        herramientas: 'HERRAMIENTAS',
    };

    /** Claves URL: catalogo.html?seccion=hombre|mujer|accesorios|deportes */
    var NAV_SECCION_LABEL = {
        hombre: 'HOMBRE',
        mujer: 'MUJER',
        accesorios: 'ACCESORIOS',
        deportes: 'DEPORTES',
    };

    var NAV_SECCION_KEYS = Object.keys(NAV_SECCION_LABEL);

    /** Sub-filtros por categoría (ids en product.temas) */
    var SUBCAT_OPTIONS = {
        tecnologia: [
            { id: 'entretenimiento', label: 'Entretenimiento' },
            { id: 'futbol', label: 'Fútbol' },
            { id: 'electro', label: 'Electrodomésticos' },
        ],
        hogar: [
            { id: 'cocina', label: 'Cocina' },
            { id: 'dormitorio', label: 'Dormitorio' },
            { id: 'decoracion', label: 'Decoración' },
            { id: 'sala', label: 'Sala' },
        ],
        moda: [
            { id: 'ropa', label: 'Ropa' },
            { id: 'calzado', label: 'Calzado' },
            { id: 'accesorios', label: 'Accesorios' },
        ],
        herramientas: [
            { id: 'electricas', label: 'Eléctricas' },
            { id: 'manuales', label: 'Manuales' },
            { id: 'medicion', label: 'Medición' },
        ],
    };

    /** Marcas disponibles en el panel por categoría */
    var BRANDS_BY_CATEGORY = {
        tecnologia: ['Samsung', 'Apple', 'Xiaomi', 'Dell', 'LG', 'Lenovo', 'Otros'],
        hogar: ['IKEA', 'Philips', 'Black+Decker', 'Nitori', 'Otros'],
        moda: ['Nike', 'Adidas', 'Zara', 'Reebok', 'Otros'],
        herramientas: ['Bosch', 'DeWalt', 'Stanley', 'Makita', 'Otros'],
    };

    /**
     * marca, tipo: nuevo|usado|reacondicionado, temas: ids de SUBCAT_OPTIONS
     */
    var CATALOG = {
        tecnologia: [
            { id: 'cat-tecnologia-dell-laptop', nombre: 'Dell Laptop', precioNum: 156.09, precioLabel: '$156.09', img: 'img/cat-tecnologia-dell-laptop.jpg', stars: 5, descPct: 22, promoBadge: '-20% hoy', marca: 'Dell', tipo: 'usado', temas: ['entretenimiento', 'electro'], secciones: ['hombre', 'mujer'] },
            { id: 'cat-tecnologia-samsung-phone', nombre: 'Samsung Smartphone', precioNum: 899.0, precioLabel: '$899.00', img: 'img/cat-tecnologia-samsung-phone.jpg', stars: 5, descPct: 15, promoBadge: '-30% hoy', marca: 'Samsung', tipo: 'nuevo', temas: ['entretenimiento', 'futbol'], secciones: ['hombre', 'mujer', 'accesorios', 'deportes'] },
            { id: 'cat-tecnologia-apple-tablet', nombre: 'Apple Tablet', precioNum: 549.99, precioLabel: '$549.99', img: 'img/cat-tecnologia-apple-tablet.jpg', stars: 5, descPct: 18, marca: 'Apple', tipo: 'reacondicionado', temas: ['entretenimiento'], secciones: ['hombre', 'mujer', 'accesorios'] },
            { id: 'cat-tecnologia-monitor-lg', nombre: 'Monitor LG UltraWide', precioNum: 329.5, precioLabel: '$329.50', img: 'img/cat-tecnologia-monitor-lg.jpg', stars: 4, marca: 'LG', tipo: 'nuevo', temas: ['entretenimiento', 'electro'], secciones: ['hombre', 'mujer'] },
            { id: 'cat-tecnologia-audifonos-bt', nombre: 'Auriculares Bluetooth', precioNum: 79.99, precioLabel: '$79.99', img: 'img/cat-tecnologia-audifonos-bt.jpg', stars: 4, promoBadge: '-15% hoy', marca: 'Xiaomi', tipo: 'nuevo', temas: ['entretenimiento', 'futbol'], secciones: ['hombre', 'mujer', 'accesorios', 'deportes'] },
            { id: 'cat-tecnologia-teclado-mecanico', nombre: 'Teclado mecánico RGB', precioNum: 124.0, precioLabel: '$124.00', img: 'img/cat-tecnologia-teclado-mecanico.jpg', stars: 5, marca: 'Lenovo', tipo: 'nuevo', temas: ['entretenimiento', 'futbol'], secciones: ['hombre', 'mujer', 'accesorios', 'deportes'] },
        ],
        hogar: [
            { id: 'cat-hogar-sofa-modular', nombre: 'Sofá modular 3 puestos', precioNum: 689.0, precioLabel: '$689.00', img: 'img/cat-hogar-sofa-modular.jpg', stars: 5, descPct: 12, marca: 'IKEA', tipo: 'nuevo', temas: ['sala', 'decoracion'], secciones: ['hombre', 'mujer'] },
            { id: 'cat-hogar-lampara-pie', nombre: 'Lámpara de pie LED', precioNum: 89.99, precioLabel: '$89.99', img: 'img/cat-hogar-lampara-pie.jpg', stars: 4, promoBadge: '-10% hoy', marca: 'Philips', tipo: 'nuevo', temas: ['decoracion', 'sala'], secciones: ['hombre', 'mujer', 'accesorios'] },
            { id: 'cat-hogar-cafetera-espresso', nombre: 'Cafetera espresso', precioNum: 215.0, precioLabel: '$215.00', img: 'img/cat-hogar-cafetera-espresso.jpg', stars: 5, marca: 'Black+Decker', tipo: 'nuevo', temas: ['cocina'], secciones: ['hombre', 'mujer'] },
            { id: 'cat-hogar-sabanas', nombre: 'Juego de sábanas king', precioNum: 48.5, precioLabel: '$48.50', img: 'img/cat-hogar-sabanas.jpg', stars: 4, marca: 'Nitori', tipo: 'nuevo', temas: ['dormitorio'], secciones: ['hombre', 'mujer'] },
            { id: 'cat-hogar-organizador', nombre: 'Organizador de cocina', precioNum: 34.99, precioLabel: '$34.99', img: 'img/cat-hogar-organizador.jpg', stars: 4, marca: 'IKEA', tipo: 'usado', temas: ['cocina'], secciones: ['hombre', 'mujer'] },
            { id: 'cat-hogar-alfombra', nombre: 'Alfombra sala 160×230', precioNum: 129.0, precioLabel: '$129.00', img: 'img/cat-hogar-alfombra.jpg', stars: 3, descPct: 20, marca: 'Otros', tipo: 'nuevo', temas: ['decoracion', 'sala'], secciones: ['hombre', 'mujer'] },
        ],
        moda: [
            { id: 'cat-moda-camiseta-basica', nombre: 'Camiseta básica algodón', precioNum: 24.99, precioLabel: '$24.99', img: 'img/cat-moda-camiseta-basica.jpg', stars: 4, marca: 'Zara', tipo: 'nuevo', temas: ['ropa'], secciones: ['hombre', 'mujer', 'deportes'] },
            { id: 'cat-moda-tenis-urbanos', nombre: 'Tenis urbanos unisex', precioNum: 119.0, precioLabel: '$119.00', img: 'img/cat-moda-tenis-urbanos.jpg', stars: 5, promoBadge: '-25% hoy', marca: 'Nike', tipo: 'nuevo', temas: ['calzado'], secciones: ['hombre', 'mujer', 'deportes'] },
            { id: 'cat-moda-chaqueta-denim', nombre: 'Chaqueta denim', precioNum: 79.5, precioLabel: '$79.50', img: 'img/cat-moda-chaqueta-denim.jpg', stars: 4, descPct: 14, marca: 'Adidas', tipo: 'usado', temas: ['ropa'], secciones: ['hombre', 'mujer'] },
            { id: 'cat-moda-bolso-tote', nombre: 'Bolso tote ecocuero', precioNum: 45.0, precioLabel: '$45.00', img: 'img/cat-moda-bolso-tote.jpg', stars: 5, marca: 'Zara', tipo: 'nuevo', temas: ['accesorios'], secciones: ['mujer', 'accesorios'] },
            { id: 'cat-moda-reloj-casual', nombre: 'Reloj casual', precioNum: 59.99, precioLabel: '$59.99', img: 'img/cat-moda-reloj-casual.jpg', stars: 4, marca: 'Otros', tipo: 'reacondicionado', temas: ['accesorios'], secciones: ['hombre', 'mujer', 'accesorios'] },
            { id: 'cat-moda-gorra', nombre: 'Gorra deportiva', precioNum: 22.0, precioLabel: '$22.00', img: 'img/cat-moda-gorra.jpg', stars: 5, marca: 'Reebok', tipo: 'nuevo', temas: ['ropa', 'accesorios'], secciones: ['hombre', 'mujer', 'accesorios', 'deportes'] },
        ],
        herramientas: [
            { id: 'cat-herr-taladro-inalambrico', nombre: 'Taladro inalámbrico 18V', precioNum: 149.99, precioLabel: '$149.99', img: 'img/cat-herr-taladro-inalambrico.jpg', stars: 5, descPct: 18, marca: 'Bosch', tipo: 'nuevo', temas: ['electricas'], secciones: ['hombre', 'mujer'] },
            { id: 'cat-herr-set-llaves', nombre: 'Set llaves combinadas', precioNum: 64.5, precioLabel: '$64.50', img: 'img/cat-herr-set-llaves.jpg', stars: 4, promoBadge: '-12% hoy', marca: 'Stanley', tipo: 'usado', temas: ['manuales'], secciones: ['hombre', 'mujer'] },
            { id: 'cat-herr-sierra-caladora', nombre: 'Sierra caladora 750W', precioNum: 98.0, precioLabel: '$98.00', img: 'img/cat-herr-sierra-caladora.jpg', stars: 4, marca: 'DeWalt', tipo: 'nuevo', temas: ['electricas'], secciones: ['hombre', 'mujer'] },
            { id: 'cat-herr-caja-herramientas', nombre: 'Caja de herramientas nivel', precioNum: 42.99, precioLabel: '$42.99', img: 'img/cat-herr-caja-herramientas.jpg', stars: 5, marca: 'Stanley', tipo: 'nuevo', temas: ['manuales'], secciones: ['hombre', 'mujer'] },
            { id: 'cat-herr-nivel-laser', nombre: 'Nivel láser cruz', precioNum: 54.0, precioLabel: '$54.00', img: 'img/cat-herr-nivel-laser.jpg', stars: 5, marca: 'Bosch', tipo: 'nuevo', temas: ['medicion', 'electricas'], secciones: ['hombre', 'mujer', 'accesorios'] },
            { id: 'cat-herr-multimetro', nombre: 'Multímetro digital', precioNum: 31.5, precioLabel: '$31.50', img: 'img/cat-herr-multimetro.jpg', stars: 4, descPct: 8, marca: 'Makita', tipo: 'reacondicionado', temas: ['medicion'], secciones: ['hombre', 'mujer', 'accesorios'] },
        ],
    };

    var SEARCH_DB = [];
    Object.keys(CATALOG).forEach(function (k) {
        CATALOG[k].forEach(function (p) {
            SEARCH_DB.push({
                nombre: p.nombre,
                precio: p.precioLabel,
                sku: 'SKU-' + p.id.replace(/-/g, '').slice(0, 10).toUpperCase(),
                img: p.img,
                cat: CAT_LABEL[k],
            });
        });
    });

    function mercaEsc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function escAttr(s) {
        return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
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
            '</p>' +
            '</div></div>' +
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

    function getCatKey() {
        var p = new URLSearchParams(window.location.search);
        var c = (p.get('cat') || 'tecnologia').toLowerCase().replace(/\s+/g, '');
        if (CATALOG[c]) return c;
        return 'tecnologia';
    }

    function getSeccionKey() {
        var p = new URLSearchParams(window.location.search);
        var s = (p.get('seccion') || '').toLowerCase().replace(/\s+/g, '');
        if (NAV_SECCION_KEYS.indexOf(s) !== -1) return s;
        return '';
    }

    /** ?ofertas=1|true|si — ordena el catálogo por mayor descuento al cargar */
    function applyOfertasQuery() {
        var p = new URLSearchParams(window.location.search);
        var o = (p.get('ofertas') || '').toLowerCase();
        if (o !== '1' && o !== 'true' && o !== 'si' && o !== 'yes') return false;
        var sr = document.getElementById('sort-relevance');
        var sp = document.getElementById('sort-price');
        if (!sr || !sp) return false;
        sr.value = 'discount';
        sp.value = 'none';
        var t = document.getElementById('catalog-page-title');
        if (t) t.textContent = t.textContent + ' · Mayor descuento';
        document.title = document.title + ' · Ofertas';
        return true;
    }

    function enrichWithCatKey(catKey, p) {
        return Object.assign({}, p, { _catKey: catKey });
    }

    function gatherBySeccion(seccion) {
        var out = [];
        Object.keys(CATALOG).forEach(function (catKey) {
            CATALOG[catKey].forEach(function (p) {
                var sec = p.secciones || [];
                if (sec.indexOf(seccion) !== -1) out.push(enrichWithCatKey(catKey, p));
            });
        });
        return out;
    }

    function getBaseList() {
        if (currentViewMode === 'seccion') return gatherBySeccion(currentSeccionKey);
        return CATALOG[currentCatKey].map(function (p) {
            return enrichWithCatKey(currentCatKey, p);
        });
    }

    function starsHtml(n) {
        var filled = Math.round(Math.max(1, Math.min(5, n)));
        var o = '';
        for (var i = 0; i < 5; i++) o += i < filled ? '★' : '☆';
        return o;
    }

    function cardHtml(p) {
        var promo = p.promoBadge ? '<span class="c-card-promo">' + mercaEsc(p.promoBadge) + '</span>' : '';
        var pct = p.descPct ? '<span class="c-card-pct">-' + p.descPct + '%</span>' : '';
        var detailUrl = 'producto.html?id=' + encodeURIComponent(p.id);
        return (
            '<article class="c-card">' +
            promo +
            '<button type="button" class="c-card-wish" aria-label="Favoritos"><i class="fa-regular fa-heart"></i></button>' +
            '<a href="' +
            detailUrl +
            '" class="c-card-img-link">' +
            '<div class="c-card-img"><img src="' +
            mercaEsc(p.img) +
            '" alt="' +
            mercaEsc(p.nombre) +
            '"></div></a>' +
            '<div class="c-card-body">' +
            '<h2 class="c-card-title"><a href="' +
            detailUrl +
            '" class="c-card-title-link">' +
            mercaEsc(p.nombre) +
            '</a></h2>' +
            '<div class="c-card-stars" aria-hidden="true">' +
            starsHtml(p.stars || 5) +
            '</div>' +
            '<div class="c-card-price-row">' +
            '<span class="c-card-price">' +
            mercaEsc(p.precioLabel) +
            '</span>' +
            pct +
            '</div>' +
            '<button type="button" class="btn-add-cart btn-add-cart--catalog" data-id="' +
            mercaEsc(p.id) +
            '" data-nombre="' +
            mercaEsc(p.nombre) +
            '" data-precio="' +
            p.precioNum +
            '" data-precio-label="' +
            mercaEsc(p.precioLabel) +
            '" data-img="' +
            mercaEsc(p.img) +
            '">' +
            '<i class="fa-solid fa-cart-plus" aria-hidden="true"></i> Añadir al carrito</button>' +
            '</div></article>'
        );
    }

    function sortProducts(list, relevanceVal, priceVal) {
        var out = list.slice();
        if (priceVal === 'asc') {
            out.sort(function (a, b) {
                return a.precioNum - b.precioNum;
            });
        } else if (priceVal === 'desc') {
            out.sort(function (a, b) {
                return b.precioNum - a.precioNum;
            });
        } else if (relevanceVal === 'discount') {
            out.sort(function (a, b) {
                return (b.descPct || 0) - (a.descPct || 0);
            });
        }
        return out;
    }

    function getSelectedSubcats() {
        var boxes = document.querySelectorAll('.filter-subcat:checked');
        var ids = [];
        boxes.forEach(function (b) {
            ids.push(b.getAttribute('data-subcat'));
        });
        return ids;
    }

    function getSelectedMarcas() {
        var boxes = document.querySelectorAll('.filter-marca:checked');
        var m = [];
        boxes.forEach(function (b) {
            m.push(b.getAttribute('data-marca'));
        });
        return m;
    }

    function getSelectedTipos() {
        var boxes = document.querySelectorAll('.filter-tipo:checked');
        var t = [];
        boxes.forEach(function (b) {
            t.push(b.getAttribute('data-tipo'));
        });
        return t;
    }

    function getPriceBoundsFromUI() {
        var minEl = document.getElementById('price-range-min');
        var maxEl = document.getElementById('price-range-max');
        if (!minEl || !maxEl) return { min: 0, max: 1e9 };
        var a = parseFloat(minEl.value);
        var b = parseFloat(maxEl.value);
        return { min: Math.min(a, b), max: Math.max(a, b) };
    }

    function filterProducts(list) {
        var selectedSubs = getSelectedSubcats();
        var totalSubBoxes = document.querySelectorAll('.filter-subcat').length;
        var hasSubFilter = totalSubBoxes > 0 && selectedSubs.length > 0 && selectedSubs.length < totalSubBoxes;
        /** Si todos los temas están marcados, no restringir por tema */
        if (totalSubBoxes > 0 && selectedSubs.length === totalSubBoxes) hasSubFilter = false;

        var selectedMarcas = getSelectedMarcas();
        var totalMarcaBoxes = document.querySelectorAll('.filter-marca').length;
        var hasMarcaFilter = selectedMarcas.length > 0 && selectedMarcas.length < totalMarcaBoxes;

        var selectedTipos = getSelectedTipos();
        var priceB = getPriceBoundsFromUI();

        return list.filter(function (p) {
            if (p.precioNum < priceB.min || p.precioNum > priceB.max) return false;

            if (selectedTipos.length === 0) return false;
            if (selectedTipos.indexOf(p.tipo) === -1) return false;

            if (hasMarcaFilter && selectedMarcas.indexOf(p.marca) === -1) return false;

            var deptoBoxes = document.querySelectorAll('.filter-depto');
            if (deptoBoxes.length > 0) {
                var selectedDeptos = [];
                document.querySelectorAll('.filter-depto:checked').forEach(function (b) {
                    selectedDeptos.push(b.getAttribute('data-depto'));
                });
                var totalD = deptoBoxes.length;
                var hasDeptoFilter = selectedDeptos.length > 0 && selectedDeptos.length < totalD;
                if (hasDeptoFilter && selectedDeptos.indexOf(p._catKey) === -1) return false;
            }

            if (hasSubFilter) {
                var temas = p.temas || [];
                var hit = false;
                for (var i = 0; i < temas.length; i++) {
                    if (selectedSubs.indexOf(temas[i]) !== -1) {
                        hit = true;
                        break;
                    }
                }
                if (!hit) return false;
            }
            return true;
        });
    }

    function renderCatalogGrid() {
        var base = getBaseList();
        var filtered = filterProducts(base);
        var rel = document.getElementById('sort-relevance').value;
        var pri = document.getElementById('sort-price').value;
        var sorted = sortProducts(filtered, rel, pri);
        var grid = document.getElementById('catalog-grid');
        if (sorted.length === 0) {
            grid.innerHTML = '<p class="catalog-empty-filters" role="status">No hay productos que coincidan con los filtros seleccionados.</p>';
            return;
        }
        grid.innerHTML = sorted.map(cardHtml).join('');
    }

    function updatePriceLabel() {
        var out = document.getElementById('price-range-label');
        var b = getPriceBoundsFromUI();
        if (out) out.textContent = mercaMoney(b.min) + ' – ' + mercaMoney(b.max);
    }

    function setupPriceSliders(catKey) {
        var products = CATALOG[catKey];
        var prices = products.map(function (x) {
            return x.precioNum;
        });
        var lo = Math.floor(Math.min.apply(null, prices));
        var hi = Math.ceil(Math.max.apply(null, prices));
        var minEl = document.getElementById('price-range-min');
        var maxEl = document.getElementById('price-range-max');
        minEl.min = String(lo);
        minEl.max = String(hi);
        maxEl.min = String(lo);
        maxEl.max = String(hi);
        minEl.value = String(lo);
        maxEl.value = String(hi);
        minEl.step = '1';
        maxEl.step = '1';
        updatePriceLabel();
    }

    function syncPriceSliders(changedEl) {
        var minEl = document.getElementById('price-range-min');
        var maxEl = document.getElementById('price-range-max');
        var vMin = parseInt(minEl.value, 10);
        var vMax = parseInt(maxEl.value, 10);
        if (vMin > vMax) {
            if (changedEl === minEl) maxEl.value = String(vMin);
            else minEl.value = String(vMax);
        }
        updatePriceLabel();
        renderCatalogGrid();
    }

    function buildDepartamentoFilters() {
        var container = document.getElementById('filter-subcats-container');
        if (!container) return;
        var hint = document.querySelector('.filters-sidebar .filter-section .filter-hint');
        if (hint) hint.textContent = 'Departamentos (desmarca para acotar):';
        container.innerHTML = Object.keys(CAT_LABEL)
            .map(function (k) {
                return (
                    '<label class="filter-row"><input type="checkbox" class="filter-depto" data-depto="' +
                    escAttr(k) +
                    '" checked> <span>' +
                    mercaEsc(CAT_LABEL[k]) +
                    '</span></label>'
                );
            })
            .join('');
    }

    function buildMarcaFiltersFromList(list) {
        var container = document.getElementById('filter-marcas-container');
        if (!container) return;
        var seen = {};
        var brands = [];
        list.forEach(function (p) {
            if (!seen[p.marca]) {
                seen[p.marca] = true;
                brands.push(p.marca);
            }
        });
        brands.sort();
        if (brands.length === 0) {
            container.innerHTML = '<p class="filter-hint">Sin marcas en esta sección.</p>';
            return;
        }
        container.innerHTML = brands
            .map(function (m) {
                return (
                    '<label class="filter-row"><input type="checkbox" class="filter-marca" data-marca="' +
                    escAttr(m) +
                    '" checked> <span>' +
                    mercaEsc(m) +
                    '</span></label>'
                );
            })
            .join('');
    }

    function setupPriceSlidersForList(list) {
        var minEl = document.getElementById('price-range-min');
        var maxEl = document.getElementById('price-range-max');
        if (!minEl || !maxEl) return;
        if (!list.length) {
            minEl.min = maxEl.min = '0';
            minEl.max = maxEl.max = '1';
            minEl.value = '0';
            maxEl.value = '1';
            updatePriceLabel();
            return;
        }
        var prices = list.map(function (x) {
            return x.precioNum;
        });
        var lo = Math.floor(Math.min.apply(null, prices));
        var hi = Math.ceil(Math.max.apply(null, prices));
        minEl.min = String(lo);
        minEl.max = String(hi);
        maxEl.min = String(lo);
        maxEl.max = String(hi);
        minEl.value = String(lo);
        maxEl.value = String(hi);
        minEl.step = '1';
        maxEl.step = '1';
        updatePriceLabel();
    }

    function buildSubcatFilters(catKey) {
        var container = document.getElementById('filter-subcats-container');
        var hint = document.querySelector('.filters-sidebar .filter-section .filter-hint');
        if (hint) hint.textContent = 'Temas (desmarca para acotar):';
        var opts = SUBCAT_OPTIONS[catKey];
        if (!container) return;
        if (!opts || !opts.length) {
            container.innerHTML = '<p class="filter-hint">Sin filtros temáticos para esta categoría.</p>';
            return;
        }
        container.innerHTML = opts
            .map(function (o) {
                return (
                    '<label class="filter-row"><input type="checkbox" class="filter-subcat" data-subcat="' +
                    escAttr(o.id) +
                    '" checked> <span>' +
                    mercaEsc(o.label) +
                    '</span></label>'
                );
            })
            .join('');
    }

    function buildMarcaFilters(catKey) {
        var container = document.getElementById('filter-marcas-container');
        var brands = BRANDS_BY_CATEGORY[catKey] || [];
        if (!container) return;
        container.innerHTML = brands
            .map(function (m) {
                return (
                    '<label class="filter-row"><input type="checkbox" class="filter-marca" data-marca="' +
                    escAttr(m) +
                    '" checked> <span>' +
                    mercaEsc(m) +
                    '</span></label>'
                );
            })
            .join('');
    }

    function bindSortHandlers() {
        var sr = document.getElementById('sort-relevance');
        var sp = document.getElementById('sort-price');
        function go() {
            if (sp.value !== 'none') sr.value = 'default';
            renderCatalogGrid();
        }
        sr.addEventListener('change', function () {
            if (sr.value !== 'default') sp.value = 'none';
            renderCatalogGrid();
        });
        sp.addEventListener('change', go);
    }

    function bindFiltersSidebar() {
        var aside = document.querySelector('.filters-sidebar');
        if (!aside || aside.dataset.bound === '1') return;
        aside.dataset.bound = '1';
        aside.addEventListener('change', function () {
            renderCatalogGrid();
        });
        aside.addEventListener('input', function (e) {
            if (e.target.id === 'price-range-min' || e.target.id === 'price-range-max') {
                syncPriceSliders(e.target);
            }
        });
    }

    function updateFilterLinksActive(catKey) {
        document.querySelectorAll('.filter-cat-link').forEach(function (a) {
            var isAct = Boolean(catKey) && a.getAttribute('data-cat') === catKey;
            a.classList.toggle('filter-cat-link--active', isAct);
        });
    }

    function updateNavSeccionActive(seccion) {
        document.querySelectorAll('.nav-links a[data-seccion]').forEach(function (a) {
            var isAct = Boolean(seccion) && a.getAttribute('data-seccion') === seccion;
            a.classList.toggle('nav-link--active', isAct);
        });
    }

    function buildAllFilters(catKey) {
        buildSubcatFilters(catKey);
        buildMarcaFilters(catKey);
        setupPriceSliders(catKey);
        document.querySelectorAll('.filter-tipo').forEach(function (cb) {
            cb.checked = true;
        });
    }

    function init() {
        var seccion = getSeccionKey();
        if (seccion) {
            currentViewMode = 'seccion';
            currentSeccionKey = seccion;
            currentCatKey = getCatKey();
        } else {
            currentViewMode = 'cat';
            currentSeccionKey = '';
            currentCatKey = getCatKey();
        }
        var catKey = currentCatKey;

        profileWrap = document.querySelector('.profile-dropdown-wrap');
        profileTrigger = document.getElementById('profile-trigger');
        profileMenu = document.getElementById('profile-menu');
        cartWrap = document.querySelector('.cart-dropdown-wrap');
        cartTrigger = document.getElementById('cart-trigger');
        cartPanel = document.getElementById('cart-panel');
        trigger = document.getElementById('search-trigger');
        panel = document.getElementById('search-panel');
        input = document.getElementById('main-search');

        if (currentViewMode === 'seccion') {
            var seccionList = gatherBySeccion(currentSeccionKey);
            document.getElementById('catalog-page-title').textContent = 'SECCIÓN · ' + NAV_SECCION_LABEL[currentSeccionKey];
            document.title = 'MERCA TO-DO | ' + NAV_SECCION_LABEL[currentSeccionKey];
            buildDepartamentoFilters();
            buildMarcaFiltersFromList(seccionList);
            setupPriceSlidersForList(seccionList);
            document.querySelectorAll('.filter-tipo').forEach(function (cb) {
                cb.checked = true;
            });
            updateFilterLinksActive(null);
            updateNavSeccionActive(currentSeccionKey);
        } else {
            document.getElementById('catalog-page-title').textContent = 'CÁTALOGO (' + CAT_LABEL[catKey] + ')';
            document.title = 'MERCA TO-DO | Catálogo · ' + CAT_LABEL[catKey];
            buildAllFilters(catKey);
            updateFilterLinksActive(catKey);
            updateNavSeccionActive('');
        }

        bindFiltersSidebar();
        bindSortHandlers();
        applyOfertasQuery();
        renderCatalogGrid();

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

        document.getElementById('catalog-grid').addEventListener('click', async function (e) {
            var wish = e.target.closest('.c-card-wish');
            if (wish) {
                e.preventDefault();
                e.stopPropagation();
                wish.classList.toggle('is-liked');
                var i = wish.querySelector('i');
                if (wish.classList.contains('is-liked')) {
                    i.classList.remove('fa-regular');
                    i.classList.add('fa-solid');
                } else {
                    i.classList.remove('fa-solid');
                    i.classList.add('fa-regular');
                }
                return;
            }
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
                                p.img +
                                '" alt=""></div>' +
                                '<p class="s-name"><b>' +
                                p.nombre +
                                '</b></p>' +
                                '<p class="s-price">' +
                                p.precio +
                                '</p></div>'
                            );
                        })
                        .join('');
                    document.getElementById('sku-display').innerHTML =
                        '<b>' + filtered[0].nombre + '</b> - ' + filtered[0].sku;
                    document.getElementById('cats-display').innerHTML =
                        '<li><i class="fa-solid fa-check"></i> Ver en "' + filtered[0].cat + '"</li>';
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
