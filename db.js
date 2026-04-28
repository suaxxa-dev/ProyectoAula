/**
 * db.js — Inicialización de SQLite (sql.js) y funciones de consulta para MERCA TO-DO
 * sql.js usa WebAssembly, no requiere compilación nativa en Windows.
 */
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'mercatodo.db');

let db = null;

/** Guardar la base de datos al disco */
function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/** Inicializar la base de datos (async — llamar antes de arrancar Express) */
async function initDb() {
  const SQL = await initSqlJs();

  // Si existe el archivo, cargarlo; sino crear nueva BD
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Pragmas
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  // Crear tablas
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre     TEXT    NOT NULL,
      email      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password   TEXT    NOT NULL,
      telefono   TEXT    DEFAULT '',
      nacimiento TEXT    DEFAULT '',
      created_at TEXT    DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS carrito (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id   INTEGER NOT NULL,
      producto_id  TEXT    NOT NULL,
      nombre       TEXT    NOT NULL,
      precio_num   REAL    NOT NULL,
      precio_label TEXT    NOT NULL,
      img          TEXT    NOT NULL,
      qty          INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      UNIQUE(usuario_id, producto_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      codigo     TEXT    NOT NULL UNIQUE,
      fecha      TEXT    DEFAULT (datetime('now')),
      total      REAL    NOT NULL,
      estado     TEXT    NOT NULL DEFAULT 'confirmado',
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pedido_items (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL,
      nombre    TEXT    NOT NULL,
      img       TEXT    NOT NULL,
      precio    REAL    NOT NULL,
      qty       INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS direcciones (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id   INTEGER NOT NULL,
      alias        TEXT    NOT NULL DEFAULT '',
      nombre       TEXT    NOT NULL DEFAULT '',
      calle        TEXT    NOT NULL DEFAULT '',
      ciudad       TEXT    NOT NULL DEFAULT '',
      estado       TEXT    NOT NULL DEFAULT '',
      codigo_postal TEXT   NOT NULL DEFAULT '',
      predeterminada INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
  `);

  // Seed — usuario demo
  const existing = db.exec("SELECT id FROM usuarios WHERE email = 'demo@mercatodo.com'");
  if (existing.length === 0 || existing[0].values.length === 0) {
    const hash = bcrypt.hashSync('merca123', 10);
    db.run('INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)', ['Juan Suaza', 'demo@mercatodo.com', hash]);

    // Obtener ID del usuario demo
    const uidResult = db.exec("SELECT id FROM usuarios WHERE email = 'demo@mercatodo.com'");
    const uid = uidResult[0].values[0][0];

    // Pedido 1 — enviado
    db.run('INSERT INTO pedidos (usuario_id, codigo, fecha, total, estado) VALUES (?, ?, ?, ?, ?)',
      [uid, 'MT-89432', '2023-10-15', 739.96, 'enviado']);
    const o1Result = db.exec("SELECT last_insert_rowid()");
    const o1Id = o1Result[0].values[0][0];
    db.run('INSERT INTO pedido_items (pedido_id, nombre, img, precio, qty) VALUES (?, ?, ?, ?, ?)',
      [o1Id, 'Sony Headphones WH-CH720N', 'img/cat-tecnologia-audifonos-bt.jpg', 79.99, 1]);
    db.run('INSERT INTO pedido_items (pedido_id, nombre, img, precio, qty) VALUES (?, ?, ?, ?, ?)',
      [o1Id, "Nike Air Force 1 '07", 'img/cat-moda-tenis-urbanos.jpg', 119.00, 1]);

    // Pedido 2 — entregado
    db.run('INSERT INTO pedidos (usuario_id, codigo, fecha, total, estado) VALUES (?, ?, ?, ?, ?)',
      [uid, 'MT-87201', '2023-09-03', 159.99, 'entregado']);
    const o2Result = db.exec("SELECT last_insert_rowid()");
    const o2Id = o2Result[0].values[0][0];
    db.run('INSERT INTO pedido_items (pedido_id, nombre, img, precio, qty) VALUES (?, ?, ?, ?, ?)',
      [o2Id, 'Monitor LG UltraWide', 'img/cat-tecnologia-monitor-lg.jpg', 329.50, 1]);

    saveDb();
    console.log('✔ Seed: usuario demo + pedidos insertados');
  }

  // Guardar periódicamente (cada 30 seg)
  setInterval(saveDb, 30000);

  return db;
}

/* ══════════════════════════════════════
   Helpers para sql.js
   ══════════════════════════════════════ */

/** Ejecutar SELECT y devolver array de objetos */
function queryAll(sql, params) {
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/** Ejecutar SELECT y devolver un solo objeto o null */
function queryOne(sql, params) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/** Ejecutar INSERT/UPDATE/DELETE */
function runSql(sql, params) {
  db.run(sql, params || []);
  saveDb();
}

/** Obtener last_insert_rowid */
function lastId() {
  const r = db.exec("SELECT last_insert_rowid()");
  return r[0].values[0][0];
}

/* ══════════════════════════════════════
   FUNCIONES — Usuarios
   ══════════════════════════════════════ */
function createUser(nombre, email, password) {
  const hash = bcrypt.hashSync(password, 10);
  try {
    runSql('INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)',
      [nombre.trim(), email.trim().toLowerCase(), hash]);
    const id = lastId();
    return { id, nombre: nombre.trim(), email: email.trim().toLowerCase() };
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) return null;
    throw err;
  }
}

function findUserByEmail(email) {
  return queryOne('SELECT * FROM usuarios WHERE email = ?', [email.trim().toLowerCase()]);
}

function authenticateUser(email, password) {
  const user = findUserByEmail(email);
  if (!user) return null;
  if (!bcrypt.compareSync(password, user.password)) return null;
  return { id: user.id, nombre: user.nombre, email: user.email };
}

function updateProfile(userId, data) {
  const sets = [];
  const values = [];
  if (data.nombre !== undefined)     { sets.push('nombre = ?');     values.push(data.nombre.trim()); }
  if (data.telefono !== undefined)   { sets.push('telefono = ?');   values.push(data.telefono.trim()); }
  if (data.nacimiento !== undefined) { sets.push('nacimiento = ?'); values.push(data.nacimiento); }
  if (sets.length === 0) return false;
  values.push(userId);
  runSql(`UPDATE usuarios SET ${sets.join(', ')} WHERE id = ?`, values);
  return true;
}

function getUserProfile(userId) {
  return queryOne('SELECT id, nombre, email, telefono, nacimiento, created_at FROM usuarios WHERE id = ?', [userId]);
}

/* ══════════════════════════════════════
   FUNCIONES — Carrito
   ══════════════════════════════════════ */
function getCart(userId) {
  return queryAll(
    'SELECT producto_id AS id, nombre, precio_num AS precioNum, precio_label AS precioLabel, img, qty FROM carrito WHERE usuario_id = ? ORDER BY id',
    [userId]
  );
}

function addToCart(userId, item) {
  const existing = queryOne(
    'SELECT id, qty FROM carrito WHERE usuario_id = ? AND producto_id = ?',
    [userId, item.id]
  );

  if (existing) {
    runSql('UPDATE carrito SET qty = qty + 1 WHERE id = ?', [existing.id]);
  } else {
    runSql(
      'INSERT INTO carrito (usuario_id, producto_id, nombre, precio_num, precio_label, img, qty) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [userId, item.id, item.nombre, item.precioNum, item.precioLabel, item.img]
    );
  }
  return true;
}

function updateCartQty(userId, productoId, qty) {
  if (qty < 1) {
    runSql('DELETE FROM carrito WHERE usuario_id = ? AND producto_id = ?', [userId, productoId]);
  } else {
    runSql('UPDATE carrito SET qty = ? WHERE usuario_id = ? AND producto_id = ?', [qty, userId, productoId]);
  }
}

function removeFromCart(userId, productoId) {
  runSql('DELETE FROM carrito WHERE usuario_id = ? AND producto_id = ?', [userId, productoId]);
}

function clearCart(userId) {
  runSql('DELETE FROM carrito WHERE usuario_id = ?', [userId]);
}

/* ══════════════════════════════════════
   FUNCIONES — Pedidos
   ══════════════════════════════════════ */
function generateOrderCode() {
  const n = Math.floor(10000 + Math.random() * 90000);
  return 'MT-' + n;
}

function createOrder(userId) {
  const cart = getCart(userId);
  if (cart.length === 0) return null;

  const total = cart.reduce((sum, item) => sum + item.precioNum * item.qty, 0);
  const codigo = generateOrderCode();
  const roundedTotal = Math.round(total * 100) / 100;

  runSql('INSERT INTO pedidos (usuario_id, codigo, total, estado) VALUES (?, ?, ?, ?)',
    [userId, codigo, roundedTotal, 'confirmado']);
  const pedidoId = lastId();

  for (const item of cart) {
    runSql('INSERT INTO pedido_items (pedido_id, nombre, img, precio, qty) VALUES (?, ?, ?, ?, ?)',
      [pedidoId, item.nombre, item.img, item.precioNum, item.qty]);
  }

  clearCart(userId);

  return { id: pedidoId, codigo, total: roundedTotal };
}

function getOrders(userId) {
  const orders = queryAll(
    'SELECT id, codigo, fecha, total, estado FROM pedidos WHERE usuario_id = ? ORDER BY id DESC',
    [userId]
  );

  return orders.map(o => {
    o.items = queryAll('SELECT nombre, img, precio, qty FROM pedido_items WHERE pedido_id = ?', [o.id]);
    try {
      const d = new Date(o.fecha);
      o.fechaLabel = String(d.getDate()).padStart(2, '0') + '/' +
                     String(d.getMonth() + 1).padStart(2, '0') + '/' +
                     d.getFullYear();
    } catch {
      o.fechaLabel = o.fecha;
    }
    return o;
  });
}

/* ══════════════════════════════════════
   FUNCIONES — Contraseña
   ══════════════════════════════════════ */
function changePassword(userId, currentPassword, newPassword) {
  const user = queryOne('SELECT * FROM usuarios WHERE id = ?', [userId]);
  if (!user) return { ok: false, error: 'Usuario no encontrado.' };
  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return { ok: false, error: 'La contraseña actual es incorrecta.' };
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  runSql('UPDATE usuarios SET password = ? WHERE id = ?', [hash, userId]);
  return { ok: true };
}

/* ══════════════════════════════════════
   FUNCIONES — Direcciones
   ══════════════════════════════════════ */
function getAddresses(userId) {
  return queryAll(
    'SELECT id, alias, nombre, calle, ciudad, estado, codigo_postal AS codigoPostal, predeterminada FROM direcciones WHERE usuario_id = ? ORDER BY predeterminada DESC, id ASC',
    [userId]
  );
}

function addAddress(userId, data) {
  const { alias, nombre, calle, ciudad, estado, codigoPostal, predeterminada } = data;
  // Si la nueva es predeterminada, desmarcar las demás
  if (predeterminada) {
    runSql('UPDATE direcciones SET predeterminada = 0 WHERE usuario_id = ?', [userId]);
  }
  runSql(
    'INSERT INTO direcciones (usuario_id, alias, nombre, calle, ciudad, estado, codigo_postal, predeterminada) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [userId, alias || '', nombre || '', calle || '', ciudad || '', estado || '', codigoPostal || '', predeterminada ? 1 : 0]
  );
  return { ok: true, id: lastId() };
}

function updateAddress(userId, addressId, data) {
  const existing = queryOne('SELECT id FROM direcciones WHERE id = ? AND usuario_id = ?', [addressId, userId]);
  if (!existing) return { ok: false, error: 'Dirección no encontrada.' };
  const { alias, nombre, calle, ciudad, estado, codigoPostal, predeterminada } = data;
  if (predeterminada) {
    runSql('UPDATE direcciones SET predeterminada = 0 WHERE usuario_id = ?', [userId]);
  }
  runSql(
    'UPDATE direcciones SET alias = ?, nombre = ?, calle = ?, ciudad = ?, estado = ?, codigo_postal = ?, predeterminada = ? WHERE id = ? AND usuario_id = ?',
    [alias || '', nombre || '', calle || '', ciudad || '', estado || '', codigoPostal || '', predeterminada ? 1 : 0, addressId, userId]
  );
  return { ok: true };
}

function deleteAddress(userId, addressId) {
  const existing = queryOne('SELECT id FROM direcciones WHERE id = ? AND usuario_id = ?', [addressId, userId]);
  if (!existing) return { ok: false, error: 'Dirección no encontrada.' };
  runSql('DELETE FROM direcciones WHERE id = ? AND usuario_id = ?', [addressId, userId]);
  return { ok: true };
}

/* ══════════════════════════════════════
   EXPORTS
   ══════════════════════════════════════ */
module.exports = {
  initDb,
  createUser,
  findUserByEmail,
  authenticateUser,
  changePassword,
  updateProfile,
  getUserProfile,
  getCart,
  addToCart,
  updateCartQty,
  removeFromCart,
  clearCart,
  createOrder,
  getOrders,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
};
