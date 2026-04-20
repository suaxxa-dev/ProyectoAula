/**
 * server.js — Servidor Express para MERCA TO-DO
 * Sirve archivos estáticos + API REST con SQLite
 */
const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

/* ── Middlewares ── */
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(session({
  secret: 'mercatodo-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 horas
    httpOnly: true,
    sameSite: 'lax',
  },
}));

/* ── Archivos estáticos (HTML, CSS, JS, imágenes) ── */
app.use(express.static(path.join(__dirname), {
  extensions: ['html'],
}));

/* ── Redirigir / a la página principal ── */
app.get('/', (req, res) => {
  res.redirect('/Mainpage.html');
});

/* ── Middleware: extraer usuario de sesión ── */
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  next();
}

/* ══════════════════════════════════════
   API — AUTH
   ══════════════════════════════════════ */

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  const user = db.createUser(nombre, email, password);
  if (!user) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese correo electrónico.' });
  }

  res.status(201).json({ ok: true, message: 'Cuenta creada exitosamente.' });
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Correo y contraseña son obligatorios.' });
  }

  const user = db.authenticateUser(email, password);
  if (!user) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }

  req.session.userId = user.id;
  req.session.userName = user.nombre;
  req.session.userEmail = user.email;

  res.json({ ok: true, user: { nombre: user.nombre, email: user.email } });
});

// GET /api/auth/session
app.get('/api/auth/session', (req, res) => {
  if (!req.session.userId) {
    return res.json({ authenticated: false });
  }
  res.json({
    authenticated: true,
    user: {
      nombre: req.session.userName,
      email: req.session.userEmail,
    },
  });
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

/* ══════════════════════════════════════
   API — CARRITO
   ══════════════════════════════════════ */

// GET /api/cart
app.get('/api/cart', requireAuth, (req, res) => {
  const cart = db.getCart(req.session.userId);
  res.json(cart);
});

// POST /api/cart
app.post('/api/cart', requireAuth, (req, res) => {
  const { id, nombre, precioNum, precioLabel, img } = req.body;
  if (!id || !nombre || precioNum == null || !precioLabel || !img) {
    return res.status(400).json({ error: 'Datos del producto incompletos.' });
  }
  db.addToCart(req.session.userId, { id, nombre, precioNum, precioLabel, img });
  const cart = db.getCart(req.session.userId);
  res.json({ ok: true, cart });
});

// PUT /api/cart/:productoId
app.put('/api/cart/:productoId', requireAuth, (req, res) => {
  const { qty } = req.body;
  db.updateCartQty(req.session.userId, req.params.productoId, parseInt(qty, 10));
  const cart = db.getCart(req.session.userId);
  res.json({ ok: true, cart });
});

// DELETE /api/cart/:productoId
app.delete('/api/cart/:productoId', requireAuth, (req, res) => {
  db.removeFromCart(req.session.userId, req.params.productoId);
  const cart = db.getCart(req.session.userId);
  res.json({ ok: true, cart });
});

/* ══════════════════════════════════════
   API — PEDIDOS
   ══════════════════════════════════════ */

// POST /api/orders  (checkout: carrito → pedido)
app.post('/api/orders', requireAuth, (req, res) => {
  const order = db.createOrder(req.session.userId);
  if (!order) {
    return res.status(400).json({ error: 'El carrito está vacío.' });
  }
  res.status(201).json({ ok: true, order });
});

// GET /api/orders
app.get('/api/orders', requireAuth, (req, res) => {
  const orders = db.getOrders(req.session.userId);
  res.json(orders);
});

/* ══════════════════════════════════════
   API — PERFIL
   ══════════════════════════════════════ */

// GET /api/profile
app.get('/api/profile', requireAuth, (req, res) => {
  const profile = db.getUserProfile(req.session.userId);
  if (!profile) return res.status(404).json({ error: 'Usuario no encontrado.' });
  res.json(profile);
});

// PUT /api/profile
app.put('/api/profile', requireAuth, (req, res) => {
  const { nombre, telefono, nacimiento } = req.body;
  db.updateProfile(req.session.userId, { nombre, telefono, nacimiento });

  // Actualizar datos en sesión si cambió el nombre
  if (nombre) req.session.userName = nombre.trim();

  const profile = db.getUserProfile(req.session.userId);
  res.json({ ok: true, profile });
});

/* ══════════════════════════════════════
   INICIAR SERVIDOR
   ══════════════════════════════════════ */
(async () => {
  await db.initDb();
  app.listen(PORT, () => {
    console.log(`\n🟢 MERCA TO-DO servidor activo en http://localhost:${PORT}\n`);
  });
})();
