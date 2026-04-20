/**
 * auth.js — Autenticación y carrito vía API REST (MERCA TO-DO)
 * Reemplaza localStorage/sessionStorage por llamadas fetch() al backend.
 *
 * NOTA: Se usa una caché en sessionStorage para evitar llamadas
 * repetidas a /api/auth/session en la misma pestaña.
 */

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
        return { ok: res.ok };
    } catch {
        return { ok: false, reason: 'network' };
    }
}

/** Cambiar cantidad de una línea del carrito */
async function mercaSetCartLineQty(id, qty) {
    const n = parseInt(String(qty), 10);
    if (!n || n < 1) {
        await mercaRemoveCartLine(id);
        return;
    }
    try {
        const res = await fetch('/api/cart/' + encodeURIComponent(id), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qty: n }),
        });
        const data = await res.json();
        if (data.cart) _saveCartCache(data.cart);
    } catch {}
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
