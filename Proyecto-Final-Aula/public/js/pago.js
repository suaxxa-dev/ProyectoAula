(function () {
    'use strict';

    /* ── Utilidades ── */
    function mercaEsc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function mercaMoney(n) {
        var copValue = Math.round(Number(n));
        return '$ ' + copValue.toLocaleString('es-CO');
    }

    /* ── Bancos PSE colombianos ── */
    var BANCOS_PSE = [
        'ALIANZA FIDUCIARIA S.A.',
        'AV Villas',
        'BANCO DE LAS MICROFINANZAS BANCAMÍA',
        'BBVA',
        'BOLD CF',
        'Ban100',
        'Banco Agrario de Colombia',
        'Banco Caja Social',
        'Banco Cooperativo Coopcentral',
        'Banco Falabella',
        'Banco Finandina',
        'Banco GNB Sudameris',
        'Banco Itaú',
        'Banco Mundo Mujer',
        'Banco Pichincha',
        'Banco Popular',
        'Banco Serfinanza',
        'Banco Union',
        'Banco W',
        'Banco de Bogotá',
        'Banco de Occidente',
        'Bancolombia',
        'Bancoomeva',
        'CFA Cooperativa Financiera',
        'COINK S.A.',
        'CREE BANCOS.A',
        'Citibank',
        'Cobropilavenue',
        'Confiar Cooperativa Financiera',
        'Coofinep',
        'DAVIPLATA S.A.',
        'DING TECNIPAGOS S.A.',
        'DaviPlata',
        'Davivienda',
        'FINANCIERA DANN REGIONAL - FDR',
        'FINANCIERA JURISCOOP C.F. COMPAÑÍA DE FINANCIAMIENTO',
        'J.P. Morgan',
        'JFK COOPERATIVA FINANCIERA',
        'Lulo Bank',
        'MOVO',
        'NU COLOMBIA COMPAÑÍA DE FINANCIAMIENTO S.A.',
        'Nequi',
        'PIBANK',
        'RappiPay',
        'Scotiabank Colpatria',
        'UALA',
        'dale!',
    ];

    /* ── Variables globales ── */
    var profileWrap, profileTrigger, profileMenu;
    var cartWrap, cartTrigger, cartPanel;
    var couponApplied = false;
    var selectedBank = null;
    var selectedMethod = null;

    /* ── Nav: perfil y carrito dropdown ── */
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
                '<p class="cart-msg">Inicia sesión para ver tu carrito.</p>' +
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
        var lines = cart.map(function (item) {
            var q = item.qty || 1;
            var lineTotal = item.precioNum * q;
            var id = mercaEsc(item.id);
            return (
                '<div class="cart-line">' +
                '<div class="cart-line-img"><img src="' + mercaEsc(item.img) + '" alt=""></div>' +
                '<div class="cart-line-main">' +
                '<p class="cart-line-name">' + mercaEsc(item.nombre) + '</p>' +
                '<p class="cart-line-meta">' + mercaEsc(item.precioLabel) + ' c/u</p>' +
                '</div>' +
                '<div class="cart-line-total">' + mercaMoney(lineTotal) + '</div></div>'
            );
        }).join('');
        body.innerHTML =
            '<div class="cart-lines">' + lines + '</div>' +
            '<div class="cart-footer"><span>Subtotal</span><strong>' +
            mercaMoney(mercaCartSubtotalNum()) + '</strong></div>' +
            mercaCartProceedHtml();
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
        var initials = session.nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
        body.innerHTML =
            '<div class="profile-dropdown-user">' +
            '<div class="profile-dropdown-avatar" aria-hidden="true">' + initials + '</div>' +
            '<div class="profile-dropdown-identity">' +
            '<p class="profile-dropdown-greeting">Hola, <strong>' + safeName + '</strong></p>' +
            '<p class="profile-dropdown-email">' + safeEmail + '</p></div></div>' +
            '<a href="cuenta.html" class="profile-dropdown-account" role="menuitem">Mi cuenta</a>' +
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

        mercaRenderProfileMenu();

        cartTrigger.onclick = function (e) {
            e.stopPropagation();
            var open = cartPanel.classList.toggle('is-open');
            cartWrap.classList.toggle('menu-open', open);
            cartTrigger.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (open) {
                profileMenu.classList.remove('is-open');
                profileWrap.classList.remove('menu-open');
                profileTrigger.setAttribute('aria-expanded', 'false');
                mercaRefreshCartUI();
            }
        };

        profileTrigger.onclick = function (e) {
            e.stopPropagation();
            var open = profileMenu.classList.toggle('is-open');
            profileWrap.classList.toggle('menu-open', open);
            profileTrigger.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (open) {
                cartPanel.classList.remove('is-open');
                cartWrap.classList.remove('menu-open');
                cartTrigger.setAttribute('aria-expanded', 'false');
            }
        };

        document.onclick = function (e) {
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

    /* ── Resumen de compra ── */
    function updateSummary() {
        var cart = mercaGetCart();
        var sub = mercaCartSubtotalNum();
        var dSub = couponApplied ? Math.round(sub * 90) / 100 : sub;
        var tax = cart.length ? Math.round(dSub * ((window.MERCA_CONFIG?.iva || 19) / 100)) : 0;
        var total = dSub + tax;

        var elProducto = document.getElementById('pago-sum-producto');
        var elTax = document.getElementById('pago-sum-tax');
        var elTotal = document.getElementById('pago-sum-total');
        var elOld = document.getElementById('pago-sum-old');
        var elSavings = document.getElementById('pago-sum-savings');

        if (elProducto) elProducto.textContent = mercaMoney(sub);
        if (elTax) elTax.textContent = mercaMoney(tax);
        if (elTotal) elTotal.textContent = mercaMoney(total);

        if (couponApplied && sub > 0) {
            elOld.textContent = mercaMoney(sub + Math.round(sub * ((window.MERCA_CONFIG?.iva || 19) / 100)));
            elOld.hidden = false;
            var ahorro = sub - dSub;
            elSavings.textContent = 'Ahorraste ' + mercaMoney(ahorro);
            elSavings.hidden = false;
        } else {
            if (elOld) elOld.hidden = true;
            if (elSavings) elSavings.hidden = true;
        }

        updateConfirmBtn();
    }

    /* ── Validación y botón confirmar ── */
    function updateConfirmBtn() {
        var btn = document.getElementById('btn-confirmar');
        if (!btn) return;
        var cart = mercaGetCart();
        if (cart.length === 0) { btn.disabled = true; return; }

        var metodo = document.querySelector('input[name="metodo_pago"]:checked');
        if (!metodo) { btn.disabled = true; return; }

        // Si PSE, necesitamos banco seleccionado
        if (metodo.value === 'pse' && !selectedBank) { btn.disabled = true; return; }

        // Si tarjeta, validar campos
        if (metodo.value === 'debito' || metodo.value === 'credito') {
            var cardNum = document.getElementById('card-number').value.replace(/\s/g, '');
            var cardExp = document.getElementById('card-exp').value;
            var cardCvv = document.getElementById('card-cvv').value;
            var cardHolder = document.getElementById('card-holder').value.trim();
            if (cardNum.length < 13 || !cardExp || !cardCvv || !cardHolder) {
                btn.disabled = true; return;
            }
        }

        // Datos personales
        var nombre = document.getElementById('pago-nombre').value.trim();
        var apellido = document.getElementById('pago-apellido').value.trim();
        var doc = document.getElementById('pago-documento').value.trim();
        if (!nombre || !apellido || !doc) { btn.disabled = true; return; }

        // Dirección
        var depto = document.getElementById('pago-depto').value;
        var ciudad = document.getElementById('pago-ciudad').value.trim();
        var calle = document.getElementById('pago-calle').value.trim();
        var sinNum = document.getElementById('pago-sin-numero').checked;
        var numero = document.getElementById('pago-numero').value.trim();
        if (!depto || !ciudad || !calle || (!sinNum && !numero)) {
            btn.disabled = true; return;
        }

        btn.disabled = false;
    }

    /* ── Métodos de pago: radio buttons ── */
    function bindPaymentMethods() {
        var radios = document.querySelectorAll('input[name="metodo_pago"]');
        var bankPanel = document.getElementById('pse-bank-panel');
        var cardPanel = document.getElementById('card-panel');

        radios.forEach(function (radio) {
            radio.addEventListener('change', function () {
                selectedMethod = this.value;
                selectedBank = null;

                // Toggle sub-panels
                bankPanel.hidden = this.value !== 'pse';
                cardPanel.hidden = this.value !== 'debito' && this.value !== 'credito';

                updateConfirmBtn();
            });
        });
    }

    /* ── Panel de bancos PSE ── */
    function renderBankList(filter) {
        var list = document.getElementById('pse-bank-list');
        var filtered = BANCOS_PSE.filter(function (b) {
            if (!filter) return true;
            return b.toLowerCase().indexOf(filter.toLowerCase()) >= 0;
        });

        list.innerHTML = filtered.map(function (name) {
            var isSelected = selectedBank === name;
            return (
                '<label class="pago-bank-item' + (isSelected ? ' is-selected' : '') + '">' +
                '<input type="radio" name="banco_pse" value="' + mercaEsc(name) + '"' +
                (isSelected ? ' checked' : '') + '>' +
                '<div class="pago-bank-icon"><i class="fa-solid fa-building-columns"></i></div>' +
                '<span>' + mercaEsc(name) + '</span></label>'
            );
        }).join('');

        if (filtered.length === 0) {
            list.innerHTML = '<p style="padding:14px; color:#999; text-align:center;">No se encontraron bancos.</p>';
        }
    }

    function bindBankPanel() {
        var searchInput = document.getElementById('pse-bank-search');
        var list = document.getElementById('pse-bank-list');

        renderBankList('');

        searchInput.addEventListener('input', function () {
            renderBankList(this.value.trim());
        });

        list.addEventListener('change', function (e) {
            if (e.target.name === 'banco_pse') {
                selectedBank = e.target.value;
                // Highlight selected
                list.querySelectorAll('.pago-bank-item').forEach(function (item) {
                    item.classList.toggle('is-selected', item.querySelector('input').checked);
                });
                updateConfirmBtn();
            }
        });
    }

    /* ── Formateo de tarjeta ── */
    function bindCardInputs() {
        var cardNum = document.getElementById('card-number');
        var cardExp = document.getElementById('card-exp');
        var cardCvv = document.getElementById('card-cvv');
        var cardHolder = document.getElementById('card-holder');

        cardNum.addEventListener('input', function () {
            var v = this.value.replace(/\D/g, '').slice(0, 16);
            this.value = v.replace(/(\d{4})(?=\d)/g, '$1 ');
            updateConfirmBtn();
        });

        cardExp.addEventListener('input', function () {
            var v = this.value.replace(/\D/g, '').slice(0, 4);
            if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
            this.value = v;
            updateConfirmBtn();
        });

        cardCvv.addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '').slice(0, 4);
            updateConfirmBtn();
        });

        cardHolder.addEventListener('input', updateConfirmBtn);
    }

    /* ── Formularios: eventos de input ── */
    function bindForms() {
        var fields = [
            'pago-nombre', 'pago-apellido', 'pago-documento',
            'pago-depto', 'pago-ciudad', 'pago-calle', 'pago-numero'
        ];
        fields.forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.addEventListener('input', updateConfirmBtn);
            if (el && el.tagName === 'SELECT') el.addEventListener('change', updateConfirmBtn);
        });

        document.getElementById('pago-sin-numero').addEventListener('change', function () {
            var numInput = document.getElementById('pago-numero');
            numInput.disabled = this.checked;
            if (this.checked) numInput.value = '';
            updateConfirmBtn();
        });
    }

    /* ── Cupón (desactivado — bloque eliminado del HTML) ── */
    function bindCoupon() {
        var toggle = document.getElementById('pago-coupon-toggle');
        if (!toggle) return; // el bloque fue eliminado del HTML
        var field = document.getElementById('pago-coupon-field');
        var btn = document.getElementById('pago-coupon-apply');
        var inp = document.getElementById('pago-coupon-input');
        var msg = document.getElementById('pago-coupon-msg');

        toggle.addEventListener('click', function (e) {
            e.preventDefault();
            field.hidden = !field.hidden;
            if (!field.hidden) inp.focus();
        });

        btn.addEventListener('click', function () {
            var code = inp.value.trim().toUpperCase();
            msg.textContent = '';
            msg.className = 'pago-coupon-msg';
            if (!code) {
                msg.textContent = 'Escribe un código.';
                msg.classList.add('pago-coupon-msg--err');
                return;
            }
            if (code === 'MERCA10' || code === 'MERCATODO') {
                couponApplied = true;
                msg.textContent = '¡Cupón aplicado! 10% de descuento.';
                msg.classList.add('pago-coupon-msg--ok');
                updateSummary();
            } else {
                msg.textContent = 'Cupón no válido. Prueba MERCA10.';
                msg.classList.add('pago-coupon-msg--err');
            }
        });
    }

    /* ── Confirmar pago ── */
    function bindConfirm() {
        var btn = document.getElementById('btn-confirmar');
        btn.addEventListener('click', async function () {
            if (btn.disabled) return;
            var cart = mercaGetCart();
            if (cart.length === 0) return;

            btn.disabled = true;
            btn.textContent = 'Procesando pago...';

            try {
                var res = await fetch('/api/orders', { method: 'POST' });
                var data = await res.json();
                if (data.ok) {
                    sessionStorage.removeItem('mercaTodoCartCache');
                    await mercaFetchCart();
                    localStorage.setItem('mercaSimularPedido', String(data.order.id));
                    console.log('[PAGO] Pedido creado:', data.order.codigo);
                    window.location.href = 'cuenta.html#pedidos';
                } else {
                    mercaAlert('Error: ' + (data.error || 'No se pudo procesar el pago.'));
                }
            } catch (err) {
                mercaAlert('Error de red. Intenta de nuevo.');
            }
            btn.disabled = false;
            btn.textContent = 'Continuar';
        });
    }

    /* ── Pre-rellenar datos del usuario ── */
    function prefillUserData() {
        var session = mercaGetSession();
        if (!session) return;
        var parts = session.nombre.split(/\s+/);
        var nombre = parts[0] || '';
        var apellido = parts.slice(1).join(' ') || '';
        document.getElementById('pago-nombre').value = nombre;
        document.getElementById('pago-apellido').value = apellido;
    }

    /* ── Init ── */
    async function init() {
        if (!mercaGetSession()) {
            window.location.href = 'Login.html';
            return;
        }

        var cart = mercaGetCart();
        if (!cart || cart.length === 0) {
            // Si no hay carrito en caché, intentar cargar del servidor primero
            await mercaFetchCart();
            cart = mercaGetCart();
            if (!cart || cart.length === 0) {
                window.location.href = 'carrito.html';
                return;
            }
        }

        await mercaFetchCart();
        initNav();
        updateSummary();
        bindPaymentMethods();
        bindBankPanel();
        bindCardInputs();
        bindForms();
        bindCoupon();
        bindConfirm();
        prefillUserData();
        updateConfirmBtn();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
