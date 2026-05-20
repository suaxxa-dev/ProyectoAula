/**
 * server.js — Servidor Express para MERCA TO-DO
 * Sirve archivos estáticos + API REST con SQLite
 * Integración con Python (search.py) para búsqueda avanzada
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
app.use(express.static(path.join(__dirname, '../public'), {
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
  const user = db.getUserById(req.session.userId);
  if (!user || user.estado === 'suspendido') {
    req.session.destroy();
    return res.status(403).json({ error: 'Tu cuenta ha sido suspendida. Contacta al administrador', code: 'ACCOUNT_SUSPENDED' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.userId || !['admin', 'admin_junior', 'admin_pro'].includes(req.session.userRol)) {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere ser administrador.' });
  }
  const user = db.getUserById(req.session.userId);
  if (!user || user.estado === 'suspendido') {
    req.session.destroy();
    return res.status(403).json({ error: 'Tu cuenta ha sido suspendida. Contacta al administrador', code: 'ACCOUNT_SUSPENDED' });
  }
  next();
}

function requireAdminPro(req, res, next) {
  if (!req.session.userId || !['admin', 'admin_pro'].includes(req.session.userRol)) {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere ser Administrador Pro.' });
  }
  const user = db.getUserById(req.session.userId);
  if (!user || user.estado === 'suspendido') {
    req.session.destroy();
    return res.status(403).json({ error: 'Tu cuenta ha sido suspendida. Contacta al administrador', code: 'ACCOUNT_SUSPENDED' });
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
  if (user.estado === 'suspendido') {
    return res.status(403).json({ error: 'Tu cuenta ha sido suspendida. Contacta a un administrador Pro.' });
  }

  req.session.userId = user.id;
  req.session.userName = user.nombre;
  req.session.userEmail = user.email;
  req.session.userRol = user.rol;

  res.json({ ok: true, user: { nombre: user.nombre, email: user.email, rol: user.rol } });
});

// GET /api/auth/session
app.get('/api/auth/session', (req, res) => {
  if (!req.session.userId) {
    return res.json({ authenticated: false });
  }
  
  const user = db.getUserById(req.session.userId);
  if (!user || user.estado === 'suspendido') {
    req.session.destroy();
    return res.json({ authenticated: false });
  }

  res.json({
    authenticated: true,
    user: {
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
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

/* ── Middleware: Validar inventario en el carrito ── */
function validateStock(req, res, next) {
  let baseId;
  let requestedQty = 1;
  let lineId;
  
  if (req.method === 'POST') {
    lineId = req.body.id;
    if (!lineId) return next();
    baseId = lineId.split('::')[0];
    requestedQty = parseInt(req.body.qty, 10) || 1;
  } else if (req.method === 'PUT') {
    lineId = req.params.productoId;
    if (!lineId) return next();
    baseId = lineId.split('::')[0];
    requestedQty = parseInt(req.body.qty, 10);
    if (isNaN(requestedQty) || requestedQty < 1) return next();
  } else {
    return next();
  }

  const stock = db.getProductStock(baseId);
  
  if (stock <= 0 && requestedQty > 0) {
    return res.status(400).json({ error: 'Producto sin stock disponible.' });
  }

  if (req.method === 'POST') {
    const currentCart = db.getCart(req.session.userId);
    const existingLine = currentCart.find(l => l.id === lineId);
    const currentQty = existingLine ? existingLine.qty : 0;
    
    if (currentQty + requestedQty > stock) {
      return res.status(400).json({ error: `No hay suficiente stock. Solo puedes tener hasta ${stock} unidades en el carrito.` });
    }
  } else if (req.method === 'PUT') {
    if (requestedQty > stock) {
      return res.status(400).json({ error: `No puedes actualizar a ${requestedQty} unidades, solo hay ${stock} en stock.` });
    }
  }

  next();
}

// POST /api/cart
app.post('/api/cart', requireAuth, validateStock, (req, res) => {
  const { id, nombre, precioNum, precioLabel, img, qty } = req.body;
  if (!id || !nombre || precioNum == null || !precioLabel || !img) {
    return res.status(400).json({ error: 'Datos del producto incompletos.' });
  }

  const nQty = parseInt(qty, 10) || 1;

  db.addToCart(req.session.userId, { id, nombre, precioNum, precioLabel, img, qty: nQty });
  const cart = db.getCart(req.session.userId);
  res.json({ ok: true, cart });
});

// PUT /api/cart/:productoId
app.put('/api/cart/:productoId', requireAuth, validateStock, (req, res) => {
  const { qty } = req.body;
  const lineId = req.params.productoId;
  const nQty = parseInt(qty, 10);

  db.updateCartQty(req.session.userId, lineId, nQty);
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

// PUT /api/orders/:id/status (Simulación)
app.put('/api/orders/:id/status', requireAuth, (req, res) => {
  const { estado } = req.body;
  if (!estado) return res.status(400).json({ error: 'Estado requerido' });
  const result = db.updateOrderStatus(req.session.userId, parseInt(req.params.id, 10), estado);
  if (!result.ok) return res.status(404).json(result);
  res.json({ ok: true });
});

/* ══════════════════════════════════════
   API — BÚSQUEDA (Python search.py)
   ══════════════════════════════════════ */

/**
 * GET /api/search?q=<texto>&sku=<codigo>&limit=<n>
 * Llama al motor Python search.py y devuelve los resultados ordenados.
 */
app.get('/api/search', (req, res) => {
  const q     = (req.query.q   || '').trim();
  const sku   = (req.query.sku || '').trim();
  const limit = Math.min(parseInt(req.query.limit, 10) || 8, 20);

  if (!q && !sku) {
    return res.json({ ok: true, results: [], sku_exact: null });
  }

  const result = db.searchProducts(q, sku, limit);
  res.json(result);
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
  if (nombre) req.session.userName = nombre.trim();
  const profile = db.getUserProfile(req.session.userId);
  res.json({ ok: true, profile });
});

/* ══════════════════════════════════════
   API — CONTRASEÑA
   ══════════════════════════════════════ */

// PUT /api/auth/password
app.put('/api/auth/password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ ok: false, error: 'Completa todos los campos.' });
  }
  // Validaciones de complejidad
  if (newPassword.length < 8) {
    return res.status(400).json({ ok: false, error: 'La nueva contraseña debe tener al menos 8 caracteres.' });
  }
  if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword)) {
    return res.status(400).json({ ok: false, error: 'La nueva contraseña debe incluir mayúscula y minúscula.' });
  }
  if (!/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
    return res.status(400).json({ ok: false, error: 'La nueva contraseña debe incluir un número y un símbolo especial.' });
  }
  const result = db.changePassword(req.session.userId, currentPassword, newPassword);
  if (!result.ok) return res.status(400).json(result);
  res.json({ ok: true, message: '¡Contraseña actualizada exitosamente!' });
});

/* ══════════════════════════════════════
   API — DIRECCIONES
   ══════════════════════════════════════ */

// GET /api/addresses
app.get('/api/addresses', requireAuth, (req, res) => {
  res.json(db.getAddresses(req.session.userId));
});

// POST /api/addresses
app.post('/api/addresses', requireAuth, (req, res) => {
  const { alias, nombre, calle, ciudad, estado, codigoPostal, predeterminada } = req.body;
  if (!nombre || !calle || !ciudad) {
    return res.status(400).json({ ok: false, error: 'Nombre, calle y ciudad son obligatorios.' });
  }
  const result = db.addAddress(req.session.userId, { alias, nombre, calle, ciudad, estado, codigoPostal, predeterminada });
  res.status(201).json({ ...result, addresses: db.getAddresses(req.session.userId) });
});

// PUT /api/addresses/:id
app.put('/api/addresses/:id', requireAuth, (req, res) => {
  const { alias, nombre, calle, ciudad, estado, codigoPostal, predeterminada } = req.body;
  if (!nombre || !calle || !ciudad) {
    return res.status(400).json({ ok: false, error: 'Nombre, calle y ciudad son obligatorios.' });
  }
  const result = db.updateAddress(req.session.userId, parseInt(req.params.id, 10), { alias, nombre, calle, ciudad, estado, codigoPostal, predeterminada });
  if (!result.ok) return res.status(404).json(result);
  res.json({ ...result, addresses: db.getAddresses(req.session.userId) });
});

// DELETE /api/addresses/:id
app.delete('/api/addresses/:id', requireAuth, (req, res) => {
  const result = db.deleteAddress(req.session.userId, parseInt(req.params.id, 10));
  if (!result.ok) return res.status(404).json(result);
  res.json({ ...result, addresses: db.getAddresses(req.session.userId) });
});

/* ══════════════════════════════════════
   API — PRODUCTOS (ADMIN)
   ══════════════════════════════════════ */

// GET /api/admin/products
app.get('/api/admin/products', requireAdmin, (req, res) => {
  const products = db.getAllProducts();
  res.json(products);
});

// POST /api/admin/products
app.post('/api/admin/products', requireAdmin, (req, res) => {
  const result = db.createProduct(req.body);
  if (result.ok) db.logAction(req.session.userId, "CREAR_PRODUCTO", `Producto creado: ${req.body.nombre}`);
  res.status(201).json(result);
});

// PUT /api/admin/products/:id
app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  const result = db.updateProduct(req.params.id, req.body, req.session.userId);
  if (!result.ok) return res.status(400).json(result);
  res.json(result);
});

// DELETE /api/admin/products/:id
app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  const result = db.deleteProduct(req.params.id);
  db.logAction(req.session.userId, "ELIMINAR_PRODUCTO", `Producto eliminado ID: ${req.params.id}`);
  res.json(result);
});

/* ══════════════════════════════════════
   API — PEDIDOS & USUARIOS (ADMIN)
   ══════════════════════════════════════ */

// GET /api/admin/orders
app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const orders = db.getAllOrdersFull();
  res.json(orders);
});

// PUT /api/admin/orders/:id (Update status)
app.put('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const { status } = req.body;
  const result = db.updateOrderStatus(parseInt(req.params.id, 10), status);
  res.json(result);
});

// GET /api/admin/users
app.get('/api/admin/users', requireAdmin, (req, res) => {
  const users = db.getAllUsers();
  res.json(users);
});

// DELETE /api/admin/users/:id
app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  const targetUser = db.getUserById(targetId);
  
  if (!targetUser) return res.status(404).json({ error: 'Usuario no encontrado' });

  // Nadie puede eliminar a un Admin Pro (excepto directamente en DB)
  if (['admin', 'admin_pro'].includes(targetUser.rol)) {
    return res.status(403).json({ error: 'No se puede eliminar a un Administrador Pro.' });
  }

  // Si intentan eliminar a un Admin Junior, solo un Admin Pro puede hacerlo
  if (targetUser.rol === 'admin_junior') {
    if (!['admin', 'admin_pro'].includes(req.session.userRol)) {
       return res.status(403).json({ error: 'Solo un Admin Pro puede eliminar a un Admin Junior.' });
    }
  }

  const result = db.deleteUser(targetId);
  db.logAction(req.session.userId, "ELIMINAR_USUARIO", `Usuario ID eliminado: ${targetId}`);
  res.json(result);
});

/* ══════════════════════════════════════
   API — ADMIN PRO (Auditoría, Config, Reportes)
   ══════════════════════════════════════ */

app.get('/api/admin/logs', requireAdminPro, (req, res) => {
  res.json(db.getLogs());
});

app.get('/api/admin/config', requireAdminPro, (req, res) => {
  res.json(db.getConfig());
});

app.put('/api/admin/config', requireAdminPro, (req, res) => {
  const { iva } = req.body;
  const result = db.updateConfig(iva);
  db.logAction(req.session.userId, "CAMBIO_CONFIG", `IVA actualizado a ${iva}%`);
  res.json(result);
});

app.post('/api/admin/create-admin', requireAdminPro, (req, res) => {
  const { nombre, email, password } = req.body;
  const result = db.createAdminJunior(req.session.userId, nombre, email, password);
  if (!result.ok) return res.status(400).json(result);
  res.status(201).json(result);
});

app.put('/api/admin/users/:id/status', requireAdminPro, (req, res) => {
  const { status } = req.body;
  const result = db.changeUserStatus(req.session.userId, req.params.id, status);
  if (!result.ok) return res.status(400).json(result);
  res.json(result);
});

app.get('/api/config', (req, res) => {
  res.json(db.getConfig());
});

// GET /api/products (Public)
app.get('/api/products', (req, res) => {
  // Solo devolvemos productos con stock > 0 para el público
  const products = db.getAllProducts().filter(p => (p.stock || 0) > 0);
  res.json(products);
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
