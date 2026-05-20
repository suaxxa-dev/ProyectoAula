/**
 * auth.js — Autenticación y carrito vía API REST (MERCA TO-DO)
 * Reemplaza localStorage/sessionStorage por llamadas fetch() al backend.
 *
 * NOTA: Se usa una caché en sessionStorage para evitar llamadas
 * repetidas a /api/auth/session en la misma pestaña.
 */

// Inyectar el Apple Loader de inmediato
(function() {
    if (document.getElementById('apple-global-loader')) return;
    var loader = document.createElement('div');
    loader.id = 'apple-global-loader';
    loader.innerHTML = '<div class="apple-spinner"></div><div class="apple-loader-logo">MERCA <span>TO-DO</span></div>';
    document.documentElement.appendChild(loader);
    
    window.addEventListener('load', function() {
        var l = document.getElementById('apple-global-loader');
        if (l) {
            setTimeout(function() { l.classList.add('hide'); }, 300);
            setTimeout(function() { if(l.parentNode) l.parentNode.removeChild(l); }, 900);
        }
    });
})();

// Interceptor global de fetch para manejar "Cuenta Suspendida"
(function() {
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const res = await originalFetch.apply(this, args);
        if (res.status === 403) {
            const clone = res.clone();
            try {
                const data = await clone.json();
                if (data.code === 'ACCOUNT_SUSPENDED') {
                    // Limpiar sesión
                    sessionStorage.removeItem('mercaTodoSessionCache');
                    localStorage.removeItem('mercaTodoSessionCache');
                    
                    // Mostrar modal de error
                    const overlay = document.createElement('div');
                    overlay.className = 'modal-overlay active';
                    overlay.style.zIndex = '999999';
                    overlay.innerHTML = `
                        <div class="modal-content admin-modal" style="text-align: center; max-width: 400px; animation: slideDown 0.3s ease;">
                            <div style="font-size: 48px; color: #ef4444; margin-bottom: 15px;">
                                <i class="fa-solid fa-user-lock"></i>
                            </div>
                            <h2 style="color: #1e293b; margin-bottom: 10px;">Cuenta Suspendida</h2>
                            <p style="color: #64748b; margin-bottom: 25px; line-height: 1.5;">${data.error}</p>
                            <button id="btn-suspend-ok" class="btn-primary" style="width: 100%; background: #ef4444;">Entendido</button>
                        </div>
                    `;
                    document.body.appendChild(overlay);
                    document.getElementById('btn-suspend-ok').onclick = () => {
                        window.location.href = 'Login.html';
                    };
                    
                    // Bloquear navegación normal
                    return new Promise(() => {}); // Promesa que nunca resuelve para detener ejecución local
                }
            } catch (e) {
                // Ignore parse errors
            }
        }
        return res;
    };
})();

const MERCA_SESSION_CACHE_KEY = 'mercaTodoSessionCache';

/* ══════════════════════════════════════
   SESIÓN
   ══════════════════════════════════════ */

/** Guarda la sesión en caché local (solo para lectura rápida en la misma pestaña) */
function mercaSetSessionCache(user) {
    if (user) {
        sessionStorage.setItem(MERCA_SESSION_CACHE_KEY, JSON.stringify(user));
    } else {
        sessionStorage.removeItem(MERCA_SESSION_CACHE_KEY);
    }
}

/** Lectura rápida de la caché (síncrona, para UI inmediata) */
function mercaGetSession() {
    try {
        const raw = sessionStorage.getItem(MERCA_SESSION_CACHE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || !data.nombre || !data.email) return null;
        return data;
    } catch {
        return null;
    }
}

/** Verifica sesión contra el servidor y actualiza caché */
async function mercaCheckSession() {
    try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.authenticated && data.user) {
            mercaSetSessionCache(data.user);
            return data.user;
        }
        mercaSetSessionCache(null);
        return null;
    } catch {
        return mercaGetSession(); // fallback a caché si falla la red
    }
}

/** Login vía API */
async function mercaAuthenticate(email, password) {
    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error };
    mercaSetSessionCache(data.user);
    return { ok: true, user: data.user };
}

/** Registro vía API */
async function mercaRegister(nombre, email, password) {
    const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error };
    return { ok: true };
}

/** Cerrar sesión */
async function mercaClearSession() {
    mercaSetSessionCache(null);
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
}

function mercaSetSession(user) {
    mercaSetSessionCache(user);
}

/* ══════════════════════════════════════
   CARRITO — API REST
   ══════════════════════════════════════ */

/** Caché local del carrito para renders sincrónicos */
let _cartCache = null;

function _saveCartCache(cart) {
    _cartCache = cart;
    try { sessionStorage.setItem('mercaTodoCartCache', JSON.stringify(cart)); } catch {}
}

function _loadCartCache() {
    if (_cartCache) return _cartCache;
    try {
        const raw = sessionStorage.getItem('mercaTodoCartCache');
        _cartCache = raw ? JSON.parse(raw) : [];
    } catch { _cartCache = []; }
    return _cartCache;
}

/** Obtener carrito del servidor */
async function mercaFetchCart() {
    // Si no hay sesión en caché, no intentamos pedir el carrito (evita 401)
    if (!mercaGetSession()) {
        _saveCartCache([]);
        return [];
    }
    try {
        const res = await fetch('/api/cart');
        if (!res.ok) { _saveCartCache([]); return []; }
        const cart = await res.json();
        _saveCartCache(cart);
        return cart;
    } catch {
        return _loadCartCache();
    }
}

/** Lectura síncrona del carrito (caché) */
function mercaGetCart() {
    return _loadCartCache();
}

function mercaSaveCart() {
    // No-op: el carrito se guarda en el servidor
}

/**
 * Agregar al carrito (async)
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
async function mercaAddToCart(line) {
    if (!mercaGetSession()) return { ok: false, reason: 'auth' };
    try {
        const res = await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(line),
        });
        const data = await res.json();
        if (data.cart) _saveCartCache(data.cart);
        return { ok: res.ok, reason: res.ok ? null : 'server', message: data.error || data.message };
    } catch {
        return { ok: false, reason: 'network' };
    }
}

/** Cambiar cantidad de una línea del carrito */
async function mercaSetCartLineQty(id, qty) {
    const n = parseInt(String(qty), 10);
    if (!n || n < 1) {
        await mercaRemoveCartLine(id);
        return { ok: true };
    }
    try {
        const res = await fetch('/api/cart/' + encodeURIComponent(id), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qty: n }),
        });
        const data = await res.json();
        if (data.cart) _saveCartCache(data.cart);
        return { ok: res.ok, message: data.error || data.message };
    } catch {
        return { ok: false, message: 'Error de red' };
    }
}

/** Eliminar línea del carrito */
async function mercaRemoveCartLine(id) {
    try {
        const res = await fetch('/api/cart/' + encodeURIComponent(id), {
            method: 'DELETE',
        });
        const data = await res.json();
        if (data.cart) _saveCartCache(data.cart);
    } catch {}
}

/** Total de unidades en el carrito */
function mercaCartTotalQty() {
    return _loadCartCache().reduce(function (a, x) { return a + (x.qty || 1); }, 0);
}

/** Subtotal numérico del carrito */
function mercaCartSubtotalNum() {
    return _loadCartCache().reduce(function (a, x) { return a + x.precioNum * (x.qty || 1); }, 0);
}

/** Número de líneas distintas en el carrito */
function mercaCartLineCount() {
    return _loadCartCache().length;
}

/**
 * Bloque HTML del botón "Proceder al pago"
 */
function mercaCartProceedHtml() {
    return (
        '<div class="cart-proceed-wrap">' +
        '<a href="carrito.html" class="cart-proceed-btn">Proceder al pago</a>' +
        '</div>'
    );
}

/* ══════════════════════════════════════
   NOTIFICACIONES (Toast)
   ══════════════════════════════════════ */
window.mercaAlert = function(msg, isSuccess = false) {
    let container = document.querySelector('.merca-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'merca-toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'merca-toast';
    const icon = document.createElement('i');
    icon.className = isSuccess ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation';
    if (isSuccess) icon.style.color = '#10b981';
    const text = document.createElement('span');
    text.textContent = msg;
    toast.appendChild(icon);
    toast.appendChild(text);
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('is-hiding');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
};

/* ══════════════════════════════════════
   CONFIGURACIÓN DEL SISTEMA
   ══════════════════════════════════════ */

window.mercaConfirm = function(msg) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.style.zIndex = '9999';
        const content = document.createElement('div');
        content.className = 'modal-content admin-modal';
        content.style.maxWidth = '400px';
        content.style.textAlign = 'center';
        content.innerHTML = `<h3 style='margin-bottom:15px; color:#0f172a;'>Confirmación</h3><p style='margin-bottom:25px; color:#475569;'>${msg}</p><div style='display:flex; gap:10px; justify-content:center;'><button id='mc-cancel' class='btn-primary' style='background:#e2e8f0; color:#475569;'>Cancelar</button><button id='mc-ok' class='btn-primary'>Aceptar</button></div>`;
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        document.getElementById('mc-cancel').onclick = () => { overlay.remove(); resolve(false); };
        document.getElementById('mc-ok').onclick = () => { overlay.remove(); resolve(true); };
    });
};

window.MERCA_CONFIG = { iva: 19 };
async function loadSystemConfig() {
    try {
        const res = await fetch('/api/config');
        if (res.ok) window.MERCA_CONFIG = await res.json();
    } catch (e) {}
}
loadSystemConfig();
