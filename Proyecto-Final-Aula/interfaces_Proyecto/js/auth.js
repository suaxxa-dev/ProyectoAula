/**
 * Sesión demo (sessionStorage). Usuario quemado para pruebas sin backend.
 */
const MERCA_SESSION_KEY = 'mercaTodoUser';

const MERCA_DEMO_USERS = [
    {
        email: 'demo@mercatodo.com',
        password: 'merca123',
        nombre: 'Juan Suaza',
    },
];

function mercaNormalizeEmail(email) {
    return String(email).trim().toLowerCase();
}

function mercaFindUser(email, password) {
    const e = mercaNormalizeEmail(email);
    return MERCA_DEMO_USERS.find((u) => u.email === e && u.password === password) || null;
}

/** @returns {{ nombre: string, email: string } | null} */
function mercaAuthenticate(email, password) {
    const u = mercaFindUser(email, password);
    if (!u) return null;
    return { nombre: u.nombre, email: u.email };
}

function mercaSetSession(user) {
    sessionStorage.setItem(MERCA_SESSION_KEY, JSON.stringify(user));
}

/** @returns {{ nombre: string, email: string } | null} */
function mercaGetSession() {
    try {
        const raw = sessionStorage.getItem(MERCA_SESSION_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || !data.nombre || !data.email) return null;
        return data;
    } catch {
        return null;
    }
}

function mercaClearSession() {
    sessionStorage.removeItem(MERCA_SESSION_KEY);
}

/* --- Carrito por cuenta (localStorage) --- */
const MERCA_CARTS_KEY = 'mercaTodoCartsByUser';

function mercaGetCartsMap() {
    try {
        const raw = localStorage.getItem(MERCA_CARTS_KEY);
        const data = raw ? JSON.parse(raw) : {};
        return data && typeof data === 'object' ? data : {};
    } catch {
        return {};
    }
}

function mercaSetCartsMap(map) {
    localStorage.setItem(MERCA_CARTS_KEY, JSON.stringify(map));
}

/** @returns {Array<{ id: string, nombre: string, precioNum: number, precioLabel: string, img: string, qty: number }>} */
function mercaGetCart() {
    const s = mercaGetSession();
    if (!s) return [];
    const email = mercaNormalizeEmail(s.email);
    const map = mercaGetCartsMap();
    const list = map[email];
    return Array.isArray(list) ? list : [];
}

function mercaSaveCart(items) {
    const s = mercaGetSession();
    if (!s) return;
    const email = mercaNormalizeEmail(s.email);
    const map = mercaGetCartsMap();
    map[email] = items;
    mercaSetCartsMap(map);
}

/**
 * @param {{ id: string, nombre: string, precioNum: number, precioLabel: string, img: string }} line
 * @returns {{ ok: boolean, reason?: string }}
 */
function mercaAddToCart(line) {
    if (!mercaGetSession()) return { ok: false, reason: 'auth' };
    const cart = mercaGetCart();
    const i = cart.findIndex((x) => x.id === line.id);
    if (i >= 0) cart[i].qty = (cart[i].qty || 1) + 1;
    else cart.push({ ...line, qty: 1 });
    mercaSaveCart(cart);
    return { ok: true };
}

function mercaSetCartLineQty(id, qty) {
    const n = parseInt(String(qty), 10);
    let cart = mercaGetCart();
    const i = cart.findIndex((x) => x.id === id);
    if (i < 0) return;
    if (!n || n < 1) cart = cart.filter((x) => x.id !== id);
    else cart[i].qty = n;
    mercaSaveCart(cart);
}

function mercaRemoveCartLine(id) {
    const cart = mercaGetCart().filter((x) => x.id !== id);
    mercaSaveCart(cart);
}

function mercaCartTotalQty() {
    return mercaGetCart().reduce((a, x) => a + (x.qty || 1), 0);
}

function mercaCartSubtotalNum() {
    return mercaGetCart().reduce((a, x) => a + x.precioNum * (x.qty || 1), 0);
}

/** Número de líneas distintas en el carrito (para textos tipo “N productos”). */
function mercaCartLineCount() {
    return mercaGetCart().length;
}

/**
 * Bloque HTML del botón “Proceder al pago” bajo el subtotal del panel carrito.
 * @returns {string}
 */
function mercaCartProceedHtml() {
    return (
        '<div class="cart-proceed-wrap">' +
        '<a href="carrito.html" class="cart-proceed-btn">Proceder al pago</a>' +
        '</div>'
    );
}
