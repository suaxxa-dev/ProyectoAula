/**
 * db.js — Inicialización de SQLite (sql.js) y funciones de consulta para MERCA TO-DO
 * sql.js usa WebAssembly, no requiere compilación nativa en Windows.
 */
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../data/mercatodo.db');

let db = null;

let isSaving = false;
let needsSave = false;

/** Guardar la base de datos al disco (Asíncrono) */
async function saveDb() {
  if (!db) return;
  if (isSaving) {
    needsSave = true;
    return;
  }
  isSaving = true;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    await fs.promises.writeFile(DB_PATH, buffer);
  } catch (err) {
    console.error('❌ Error guardando base de datos:', err);
  } finally {
    isSaving = false;
    if (needsSave) {
      needsSave = false;
      saveDb();
    }
  }
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
      rol        TEXT    NOT NULL DEFAULT 'user',
      telefono   TEXT    DEFAULT '',
      nacimiento TEXT    DEFAULT '',
      created_at TEXT    DEFAULT (datetime('now'))
    )
  `);

  // Migración: Asegurar que la columna 'rol' exista en la tabla 'usuarios'
  try {
    db.run("ALTER TABLE usuarios ADD COLUMN rol TEXT NOT NULL DEFAULT 'user'");
  } catch (e) {
    // Si ya existe, fallará silenciosamente
  }

  // Migración: Añadir estado
  try {
    db.run("ALTER TABLE usuarios ADD COLUMN estado TEXT NOT NULL DEFAULT 'activo'");
  } catch (e) {}

  // Migración: Renombrar admin a admin_pro
  db.run("UPDATE usuarios SET rol = 'admin_pro' WHERE rol = 'admin'");

  db.run(`
    CREATE TABLE IF NOT EXISTS productos (
      id           TEXT    PRIMARY KEY,
      nombre       TEXT    NOT NULL,
      precio_num   REAL    NOT NULL,
      precio_label TEXT    NOT NULL,
      img          TEXT    NOT NULL,
      stars        INTEGER DEFAULT 5,
      desc_pct     INTEGER DEFAULT 0,
      promo_badge  TEXT    DEFAULT '',
      marca        TEXT    DEFAULT '',
      tipo         TEXT    DEFAULT 'nuevo',
      cat          TEXT    NOT NULL,
      sku          TEXT    NOT NULL UNIQUE,
      stock        INTEGER DEFAULT 0,
      temas        TEXT    DEFAULT ''
    )
  `);

  // Migración: Asegurar que la columna 'stock' exista en la tabla 'productos'
  try {
    db.run("ALTER TABLE productos ADD COLUMN stock INTEGER DEFAULT 0");
  } catch (e) {
    // Si ya existe, fallará silenciosamente
  }

  // Migración: Asegurar que la columna 'temas' exista
  try {
    db.run("ALTER TABLE productos ADD COLUMN temas TEXT DEFAULT ''");
  } catch (e) {}

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
    CREATE TABLE IF NOT EXISTS configuracion (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      iva REAL NOT NULL DEFAULT 19.0,
      moneda TEXT NOT NULL DEFAULT 'COP'
    )
  `);
  db.run("INSERT OR IGNORE INTO configuracion (id, iva, moneda) VALUES (1, 19.0, 'COP')");

  db.run(`
    CREATE TABLE IF NOT EXISTS logs_auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      accion TEXT NOT NULL,
      detalles TEXT NOT NULL,
      fecha TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE CASCADE
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
    const o1Check = db.exec("SELECT id FROM pedidos WHERE codigo = 'MT-89432'");
    if (o1Check.length === 0 || o1Check[0].values.length === 0) {
      db.run('INSERT INTO pedidos (usuario_id, codigo, fecha, total, estado) VALUES (?, ?, ?, ?, ?)',
        [uid, 'MT-89432', '2023-10-15', 739.96, 'enviado']);
      const o1Id = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
      db.run('INSERT INTO pedido_items (pedido_id, nombre, img, precio, qty) VALUES (?, ?, ?, ?, ?)',
        [o1Id, 'Sony Headphones WH-CH720N', 'img/cat-tecnologia-audifonos-bt.jpg', 79.99, 1]);
      db.run('INSERT INTO pedido_items (pedido_id, nombre, img, precio, qty) VALUES (?, ?, ?, ?, ?)',
        [o1Id, "Nike Air Force 1 '07", 'img/cat-moda-tenis-urbanos.jpg', 119.00, 1]);
    }

    // Pedido 2 — entregado
    const o2Check = db.exec("SELECT id FROM pedidos WHERE codigo = 'MT-87201'");
    if (o2Check.length === 0 || o2Check[0].values.length === 0) {
      db.run('INSERT INTO pedidos (usuario_id, codigo, fecha, total, estado) VALUES (?, ?, ?, ?, ?)',
        [uid, 'MT-87201', '2023-09-03', 159.99, 'entregado']);
      const o2Id = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
      db.run('INSERT INTO pedido_items (pedido_id, nombre, img, precio, qty) VALUES (?, ?, ?, ?, ?)',
        [o2Id, 'Monitor LG UltraWide', 'img/cat-tecnologia-monitor-lg.jpg', 329.50, 1]);
    }

    await saveDb();
    console.log('✔ Seed: usuario demo + pedidos insertados');
  }

  // Seed — admin demo
  const hashAdmin = bcrypt.hashSync('admin123', 10);
  // Usamos una lógica de "upsert" manual para asegurar que el admin tenga el rol correcto
  const adminRes = db.exec("SELECT id FROM usuarios WHERE email = 'admin@mercatodo.com'");
  if (adminRes.length === 0 || adminRes[0].values.length === 0) {
    db.run('INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)', ['Administrador', 'admin@mercatodo.com', hashAdmin, 'admin']);
    console.log('✔ Seed: usuario administrador creado');
  } else {
    // Si existe, nos aseguramos que el rol sea admin
    db.run("UPDATE usuarios SET rol = 'admin' WHERE email = 'admin@mercatodo.com'");
  }

  // Seed — Migrar productos desde JSON si la tabla está vacía
  const prodCount = db.exec("SELECT COUNT(*) FROM productos")[0].values[0][0];
  if (prodCount === 0) {
    const catalogPath = path.join(__dirname, '../data/catalogo_data.json');
    if (fs.existsSync(catalogPath)) {
      try {
        const catalogJson = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
        const products = catalogJson.productos || [];
        for (const p of products) {
          // Obtener datos extras si existen en una versión más completa o defaults
          let pNum = p.precio_num;
          if (!pNum && p.precioLabel) {
            // Extraer números de "$ 3.596.000" -> 3596000
            pNum = p.precioLabel.replace(/[^\d]/g, '');
            pNum = pNum ? parseInt(pNum, 10) : 0;
          }
          const dPct = p.descPct !== undefined ? p.descPct : (p.desc_pct || 0);
          const marca = p.marca || '';
          const tipo = p.tipo || 'nuevo';
          const badge = p.promoBadge || p.promo_badge || '';
          const stars = p.stars || 5;

          const stock = p.stock !== undefined ? p.stock : 15;

          const normalizedCat = (p.cat || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

          db.run(`
            INSERT OR IGNORE INTO productos (id, nombre, precio_num, precio_label, img, cat, sku, desc_pct, marca, tipo, promo_badge, stars, stock)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [p.id, p.nombre, pNum || 0, p.precioLabel, p.img, normalizedCat, p.sku, dPct, marca, tipo, badge, stars, stock]);
        }
        console.log(`✔ Seed: ${products.length} productos migrados desde JSON`);
      } catch (e) {
        console.error('❌ Error migrando productos:', e);
      }
    }
  }

  // Seed — Inyección de persistencia para el producto "iPhone 15 Pro Max" del Main Page
  const iphoneCheck = db.exec("SELECT id FROM productos WHERE id = 'iphone-15-pro-max'");
  if (iphoneCheck.length === 0 || iphoneCheck[0].values.length === 0) {
    db.run(`
      INSERT INTO productos (id, nombre, precio_num, precio_label, img, cat, sku, desc_pct, marca, tipo, promo_badge, stars, stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, ['iphone-15-pro-max', 'IPHONE 15 PRO MAX', 4796000, '$ 4.796.000', 'img/iphone.png', 'TECNOLOGÍA', 'SKU-IPHONE15', 0, 'Apple', 'nuevo', '', 5, 10]);
    console.log('✔ Seed: Producto iPhone 15 Pro Max reinyectado con 10 unidades de stock');
    await saveDb();
  }

  // Iniciar guardado si hubo cambios
  if (!fs.existsSync(DB_PATH) || prodCount === 0 || (iphoneCheck.length === 0 || iphoneCheck[0].values.length === 0)) {
    await saveDb();
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
  saveDb(); // Disparamos el guardado asíncrono en segundo plano
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
  return { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, estado: user.estado };
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

  const qty = item.qty !== undefined ? parseInt(item.qty, 10) : 1;

  if (existing) {
    runSql('UPDATE carrito SET qty = qty + ? WHERE id = ?', [qty, existing.id]);
  } else {
    runSql(
      'INSERT INTO carrito (usuario_id, producto_id, nombre, precio_num, precio_label, img, qty) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, item.id, item.nombre, item.precioNum, item.precioLabel, item.img, qty]
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

  const subtotal = cart.reduce((sum, item) => sum + item.precioNum * item.qty, 0);
  const config = getConfig();
  const iva = Math.round(subtotal * (config.iva / 100));
  const total = subtotal + iva;
  const codigo = generateOrderCode();
  const roundedTotal = Math.round(total * 100) / 100;

  runSql('INSERT INTO pedidos (usuario_id, codigo, total, estado) VALUES (?, ?, ?, ?)',
    [userId, codigo, roundedTotal, 'confirmado']);
  const pedidoId = lastId();

  for (const item of cart) {
    runSql('INSERT INTO pedido_items (pedido_id, nombre, img, precio, qty) VALUES (?, ?, ?, ?, ?)',
      [pedidoId, item.nombre, item.img, item.precioNum, item.qty]);
    
    // Reducir stock del producto usando su ID base (sin variantes)
    const baseId = item.id.split('::')[0];
    runSql('UPDATE productos SET stock = MAX(0, stock - ?) WHERE id = ?', [item.qty, baseId]);
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

function updateOrderStatus(id, status, userId = null) {
  let sql = 'SELECT id FROM pedidos WHERE id = ?';
  let params = [id];
  if (userId) {
    sql += ' AND usuario_id = ?';
    params.push(userId);
  }
  const existing = queryOne(sql, params);
  if (!existing) return { ok: false, error: 'Pedido no encontrado.' };
  runSql('UPDATE pedidos SET estado = ? WHERE id = ?', [status, id]);
  return { ok: true };
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
   FUNCIONES — Productos (Admin)
   ══════════════════════════════════════ */
function getAllProducts() {
  return queryAll('SELECT * FROM productos ORDER BY cat, nombre');
}

function createProduct(p) {
  const pNum = p.precioNum !== undefined ? p.precioNum : p.precio_num;
  const pLabel = p.precioLabel !== undefined ? p.precioLabel : p.precio_label;
  const dPct = p.descPct !== undefined ? p.descPct : (p.desc_pct || 0);
  const pBadge = p.promoBadge !== undefined ? p.promoBadge : (p.promo_badge || '');
  const pTemas = p.temas !== undefined ? p.temas : '';

  try {
    runSql(`
      INSERT INTO productos (id, nombre, precio_num, precio_label, img, stars, desc_pct, promo_badge, marca, tipo, cat, sku, stock, temas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [p.id, p.nombre, pNum, pLabel, p.img, p.stars || 5, dPct, pBadge, p.marca || '', p.tipo || 'nuevo', p.cat, p.sku, p.stock || 0, pTemas]);
    return { ok: true };
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return { ok: false, error: 'Ya existe un producto con ese ID o SKU' };
    }
    return { ok: false, error: err.message || 'Error al crear producto' };
  }
}

function updateProduct(id, p, adminId) {
  if (adminId && p.stock !== undefined) {
    const oldStock = getProductStock(id);
    if (oldStock !== p.stock) {
      logAction(adminId, "CAMBIO_STOCK", `Producto ${id} stock cambiado de ${oldStock} a ${p.stock}`);
    }
  }

  const sets = [];
  const values = [];
  const fields = ['nombre', 'precioNum', 'precioLabel', 'img', 'stars', 'descPct', 'promoBadge', 'marca', 'tipo', 'cat', 'sku', 'stock', 'temas'];
  
  fields.forEach(f => {
    let dbField = f;
    let val = p[f];
    // Mapear camelCase a snake_case y aceptar ambos formatos
    if (f === 'precioNum') { dbField = 'precio_num'; if (val === undefined) val = p.precio_num; }
    if (f === 'precioLabel') { dbField = 'precio_label'; if (val === undefined) val = p.precio_label; }
    if (f === 'descPct') { dbField = 'desc_pct'; if (val === undefined) val = p.desc_pct; }
    if (f === 'promoBadge') { dbField = 'promo_badge'; if (val === undefined) val = p.promo_badge; }

    if (val !== undefined) {
      sets.push(`${dbField} = ?`);
      values.push(val);
    }
  });

  if (sets.length === 0) return { ok: false, error: 'Nada que actualizar' };
  values.push(id);
  
  try {
    runSql(`UPDATE productos SET ${sets.join(', ')} WHERE id = ?`, values);
    return { ok: true };
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return { ok: false, error: 'Ese SKU ya está en uso' };
    }
    return { ok: false, error: err.message || 'Error al actualizar' };
  }
}

function deleteProduct(id) {
  runSql('DELETE FROM productos WHERE id = ?', [id]);
  return { ok: true };
}

function getAllOrdersFull() {
  // Unimos con usuarios para saber de quién es cada pedido
  return queryAll(`
    SELECT p.*, u.nombre as usuario_nombre, u.email as usuario_email
    FROM pedidos p
    JOIN usuarios u ON p.usuario_id = u.id
    ORDER BY p.fecha DESC
  `);
}

function getUserById(id) {
  return queryOne('SELECT * FROM usuarios WHERE id = ?', [id]);
}

function getAllUsers() {
  return queryAll('SELECT id, nombre, email, rol, estado, created_at FROM usuarios ORDER BY created_at DESC');
}

function deleteUser(id) {
  runSql('DELETE FROM usuarios WHERE id = ?', [id]);
  return { ok: true };
}

/**
 * Búsqueda de productos nativa en SQLite
 */
function searchProducts(q, sku, limit = 8) {
  const products = getAllProducts();
  const results = [];
  let skuExact = null;

  const normQ = (q || '').toLowerCase().trim();
  const normSku = (sku || '').toLowerCase().trim();

  for (const p of products) {
    if ((p.stock || 0) <= 0) continue; // Solo disponibles

    let score = 0;
    const pName = (p.nombre || '').toLowerCase();
    const pSku = (p.sku || '').toLowerCase();
    const pCat = (p.cat || '').toLowerCase();

    // Búsqueda por SKU exacto
    if (normSku && pSku === normSku) {
      skuExact = p;
      score += 100;
    }
    if (normQ && pSku === normQ) {
      score += 80;
    }

    // Búsqueda por texto
    if (normQ) {
      if (pName === normQ) score += 100;
      else if (pName.startsWith(normQ)) score += 50;
      else if (pName.includes(normQ)) score += 30;

      if (pCat.includes(normQ)) score += 10;
    }

    if (score > 0) {
      results.push({ score, product: p });
    }
  }

  // Ordenar por score
  results.sort((a, b) => b.score - a.score);

  const finalResults = results.slice(0, limit).map(r => ({
    id: r.product.id,
    nombre: r.product.nombre,
    precioLabel: r.product.precio_label,
    img: r.product.img,
    cat: r.product.cat,
    sku: r.product.sku
  }));

  return {
    ok: true,
    results: finalResults,
    sku_exact: skuExact ? { id: skuExact.id } : null
  };
}

/** Obtener stock de un producto */
function getProductStock(id) {
  const p = queryOne("SELECT stock FROM productos WHERE id = ?", [id]);
  return p ? p.stock : 0;
}

/* ══════════════════════════════════════
   NUEVAS FUNCIONES: AUDITORÍA Y CONFIGURACIÓN
   ══════════════════════════════════════ */

function logAction(adminId, accion, detalles) {
  try {
    db.run("INSERT INTO logs_auditoria (admin_id, accion, detalles) VALUES (?, ?, ?)", [adminId, accion, detalles]);
    saveDb();
  } catch(e) {
    console.error("Error logging action:", e);
  }
}

function getLogs() {
  return queryAll(`
    SELECT l.*, u.nombre as admin_nombre, u.email as admin_email
    FROM logs_auditoria l
    JOIN usuarios u ON l.admin_id = u.id
    ORDER BY l.id DESC LIMIT 100
  `);
}

function getConfig() {
  const c = queryOne("SELECT * FROM configuracion WHERE id = 1");
  return c || { iva: 19.0, moneda: 'COP' };
}

function updateConfig(iva) {
  db.run("UPDATE configuracion SET iva = ? WHERE id = 1", [iva]);
  saveDb();
  return { ok: true };
}

function changeUserStatus(adminId, targetUserId, newStatus) {
  const target = queryOne("SELECT rol FROM usuarios WHERE id = ?", [targetUserId]);
  if (!target) return { ok: false, error: 'Usuario no encontrado' };
  if (target.rol === 'admin_pro') return { ok: false, error: 'No puedes suspender a otro Admin Pro' };
  
  db.run("UPDATE usuarios SET estado = ? WHERE id = ?", [newStatus, targetUserId]);
  logAction(adminId, "CAMBIO_ESTADO", `Usuario ID ${targetUserId} cambiado a estado: ${newStatus}`);
  saveDb();
  return { ok: true };
}

function createAdminJunior(adminId, nombre, email, password) {
  const existing = queryOne("SELECT id FROM usuarios WHERE email = ?", [email]);
  if (existing) return { ok: false, error: 'Email ya registrado' };

  const hash = bcrypt.hashSync(password, 8);
  db.run(
    "INSERT INTO usuarios (nombre, email, password, rol, estado) VALUES (?, ?, ?, 'admin_junior', 'activo')",
    [nombre, email, hash]
  );
  
  const newAdmin = queryOne("SELECT id FROM usuarios WHERE email = ?", [email]);
  logAction(adminId, "CREAR_ADMIN", `Creado Admin Junior ID ${newAdmin.id} (${email})`);
  saveDb();
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
  updateOrderStatus,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllOrdersFull,
  getUserById,
  getAllUsers,
  deleteUser,
  searchProducts,
  getProductStock,
  logAction,
  getLogs,
  getConfig,
  updateConfig,
  changeUserStatus,
  createAdminJunior
};
