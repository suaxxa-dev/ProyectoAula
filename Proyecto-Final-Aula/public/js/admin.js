(function() {
    'use strict';

    let allProducts = [];
    let allOrders = [];
    let allUsers = [];
    let currentSection = 'products';

    const tableBody = document.getElementById('products-table-body');
    const ordersTableBody = document.getElementById('orders-table-body');
    const usersTableBody = document.getElementById('users-table-body');
    const searchInput = document.getElementById('admin-search');
    const modal = document.getElementById('product-modal');
    const productForm = document.getElementById('product-form');
    const modalTitle = document.getElementById('modal-title');
    const btnNew = document.getElementById('btn-new-product');
    const headerTitle = document.querySelector('.header-left h2');
    const headerDesc = document.querySelector('.header-left p');

    const ADMIN_BRANDS = {
        tecnologia: ['Samsung', 'Apple', 'Xiaomi', 'Dell', 'LG', 'Lenovo', 'Otros'],
        hogar: ['IKEA', 'Philips', 'Black+Decker', 'Nitori', 'Otros'],
        moda: ['Nike', 'Adidas', 'Zara', 'Reebok', 'Otros'],
        herramientas: ['Bosch', 'DeWalt', 'Stanley', 'Makita', 'Otros'],
        deportes: ['Nike', 'Adidas', 'Puma', 'Under Armour', 'Otros'],
        accesorios: ['Casio', 'Ray-Ban', 'Rolex', 'Oakley', 'Otros']
    };

    const ADMIN_SUBCATS = {
        tecnologia: ['entretenimiento', 'futbol', 'electrodomesticos'],
        hogar: ['cocina', 'dormitorio', 'decoracion', 'sala'],
        moda: ['ropa', 'calzado', 'accesorios'],
        herramientas: ['electricas', 'manuales', 'medicion'],
        deportes: ['ropa', 'calzado', 'equipamiento'],
        accesorios: ['relojes', 'gafas', 'joyeria']
    };

    function updateDynamicSelectors(catValue, selectedMarca = '', selectedTemasStr = '') {
        if (!catValue) return;
        const catKey = catValue.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        
        const marcaSelect = document.getElementById('p-marca');
        const temasContainer = document.getElementById('p-temas-container');
        if (!marcaSelect || !temasContainer) return;

        marcaSelect.innerHTML = '<option value="">Sin marca asignada...</option>';
        temasContainer.innerHTML = '';

        const brands = ADMIN_BRANDS[catKey] || [];
        brands.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b;
            opt.textContent = b;
            if (b === selectedMarca) opt.selected = true;
            marcaSelect.appendChild(opt);
        });
        if (selectedMarca && brands.indexOf(selectedMarca) === -1) {
            const opt = document.createElement('option');
            opt.value = selectedMarca;
            opt.textContent = selectedMarca + ' (Personalizada)';
            opt.selected = true;
            marcaSelect.appendChild(opt);
        }

        const subcats = ADMIN_SUBCATS[catKey] || [];
        const selectedTemasArr = selectedTemasStr.split(',').map(s => s.trim()).filter(Boolean);
        
        if (subcats.length === 0) {
            temasContainer.innerHTML = '<span style="color:#999; font-size:14px;">No hay subcategorías...</span>';
        } else {
            subcats.forEach(s => {
                const lbl = document.createElement('label');
                lbl.style.display = 'flex';
                lbl.style.alignItems = 'center';
                lbl.style.gap = '5px';
                lbl.style.fontSize = '14px';
                lbl.style.cursor = 'pointer';
                
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.value = s;
                cb.className = 'admin-tema-cb';
                if (selectedTemasArr.includes(s)) cb.checked = true;
                
                lbl.appendChild(cb);
                lbl.appendChild(document.createTextNode(s.charAt(0).toUpperCase() + s.slice(1)));
                temasContainer.appendChild(lbl);
            });
        }
    }

    // Inicializar
    async function init() {
        const session = await checkSession();
        if (!session.authenticated || !['admin', 'admin_junior', 'admin_pro'].includes(session.user.rol)) {
            window.location.href = 'Login.html';
            return;
        }

        const rol = session.user.rol === 'admin' ? 'admin_pro' : session.user.rol;
        window.userRol = rol;
        if (rol === 'admin_pro') {
            document.querySelectorAll('.admin-pro-only').forEach(el => el.style.display = '');
        }

        await loadSectionData('products');
        setupEventListeners();
    }

    async function checkSession() {
        try {
            const res = await fetch('/api/auth/session');
            const data = await res.json();
            return data;
        } catch (e) {
            return { authenticated: false };
        }
    }

    async function loadSectionData(section) {
        currentSection = section;
        
        // Actualizar UI activa
        document.querySelectorAll('.admin-nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.section === section);
        });
        document.querySelectorAll('.section-tab').forEach(tab => {
            tab.classList.toggle('active', tab.id === `${section}-section`);
        });

        // Actualizar Cabecera
        if (section === 'products') {
            headerTitle.textContent = 'Gestión de Productos';
            headerDesc.textContent = 'Añade, edita o elimina productos del catálogo.';
            btnNew.style.display = 'block';
            await loadProducts();
        } else if (section === 'orders') {
            headerTitle.textContent = 'Gestión de Pedidos';
            headerDesc.textContent = 'Monitoriza y actualiza el estado de las compras.';
            btnNew.style.display = 'none';
            await loadOrders();
        } else if (section === 'logs' && window.userRol === 'admin_pro') {
            headerTitle.textContent = 'Auditoría';
            headerDesc.textContent = 'Historial de acciones de los administradores.';
            btnNew.style.display = 'none';
            await loadLogs();
        } else if (section === 'admins' && window.userRol === 'admin_pro') {
            headerTitle.textContent = 'Gestión de Administradores';
            headerDesc.textContent = 'Añadir y administrar roles de administradores.';
            btnNew.style.display = 'none';
            await loadAdmins();
        } else if (section === 'config' && window.userRol === 'admin_pro') {
            headerTitle.textContent = 'Configuración del Sistema';
            headerDesc.textContent = 'Configurar impuestos, moneda y ajustes globales.';
            btnNew.style.display = 'none';
            await loadConfig();
        } else if (section === 'reports' && window.userRol === 'admin_pro') {
            headerTitle.textContent = 'Reportes Financieros';
            headerDesc.textContent = 'Estadísticas de ventas y resumen financiero.';
            btnNew.style.display = 'none';
            await loadReports();
        } else if (section === 'users') {
            headerTitle.textContent = 'Gestión de Usuarios';
            headerDesc.textContent = 'Ver la lista de clientes registrados en la plataforma.';
            btnNew.style.display = 'none';
            await loadUsers();
        }
    }

    async function loadProducts() {
        try {
            const res = await fetch('/api/admin/products');
            allProducts = await res.json();
            renderProductsTable(allProducts);
        } catch (e) {
            tableBody.innerHTML = '<tr><td colspan="6" style="color:red; text-align:center;">Error al cargar productos.</td></tr>';
        }
    }

    function renderProductsTable(products) {
        if (products.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">No se encontraron productos.</td></tr>';
            return;
        }
        tableBody.innerHTML = products.map(p => `
            <tr>
                <td><img src="${p.img}" alt="" class="img-preview" onerror="this.src='img/placeholder.png'"></td>
                <td><strong>${p.nombre}</strong></td>
                <td><code>${p.sku}</code></td>
                <td><span class="badge-cat">${p.cat}</span></td>
                <td>${p.precio_label}</td>
                <td>
                    <span class="badge-stock ${p.stock <= 5 ? 'stock-low' : ''}">${p.stock}</span>
                </td>
                <td>
                    <div class="admin-actions">
                        <button class="btn-icon edit" onclick="editProduct('${p.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon delete" onclick="deleteProduct('${p.id}')" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async function loadOrders() {
        try {
            const res = await fetch('/api/admin/orders');
            allOrders = await res.json();
            renderOrdersTable(allOrders);
        } catch (e) {
            ordersTableBody.innerHTML = '<tr><td colspan="6" style="color:red; text-align:center;">Error al cargar pedidos.</td></tr>';
        }
    }

    function renderOrdersTable(orders) {
        if (orders.length === 0) {
            ordersTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No hay pedidos registrados.</td></tr>';
            return;
        }
        ordersTableBody.innerHTML = orders.map(o => `
            <tr>
                <td><strong>#${o.codigo}</strong></td>
                <td>
                    <div class="user-cell">
                        <span>${o.usuario_nombre}</span>
                        <small>${o.usuario_email}</small>
                    </div>
                </td>
                <td>${new Date(o.fecha).toLocaleDateString()}</td>
                <td style="font-weight:bold; color:var(--orange);">$ ${Math.round(o.total).toLocaleString('es-CO')}</td>
                <td><span class="badge-status status-${o.estado}">${o.estado.toUpperCase()}</span></td>
                <td>
                    <select class="admin-select" onchange="updateOrderStatus(${o.id}, this.value)">
                        <option value="confirmado" ${o.estado === 'confirmado' ? 'selected' : ''}>Confirmado</option>
                        <option value="procesando" ${o.estado === 'procesando' ? 'selected' : ''}>Procesando</option>
                        <option value="enviado" ${o.estado === 'enviado' ? 'selected' : ''}>Enviado</option>
                        <option value="entregado" ${o.estado === 'entregado' ? 'selected' : ''}>Entregado</option>
                        <option value="cancelado" ${o.estado === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                    </select>
                </td>
            </tr>
        `).join('');
    }

    async function loadUsers() {
        try {
            const res = await fetch('/api/admin/users');
            allUsers = await res.json();
            renderUsersTable(allUsers);
        } catch (e) {
            usersTableBody.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center;">Error al cargar usuarios.</td></tr>';
        }
    }

    function renderUsersTable(users) {
        if (users.length === 0) {
            usersTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">No hay usuarios registrados.</td></tr>';
            return;
        }
        usersTableBody.innerHTML = users.map(u => `
            <tr>
                <td><strong>${u.nombre}</strong></td>
                <td>${u.email}</td>
                <td><span class="badge-role role-${u.rol}">${u.rol.toUpperCase()}</span></td>
                <td>${new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                    ${u.rol === 'user' ? `<button class="btn-icon delete" onclick="deleteUser(${u.id})" title="Eliminar"><i class="fa-solid fa-user-xmark"></i></button>` : ''}
                </td>
            </tr>
        `).join('');
    }

    
    async function loadLogs() {
        try {
            const res = await fetch('/api/admin/logs');
            const logs = await res.json();
            const tbody = document.getElementById('logs-table-body');
            if (logs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">No hay registros.</td></tr>';
                return;
            }
            tbody.innerHTML = logs.map(l => `
                <tr>
                    <td>${l.fecha}</td>
                    <td><strong>${l.admin_nombre}</strong> <small>(${l.admin_email})</small></td>
                    <td><span class="badge-cat">${l.accion}</span></td>
                    <td>${l.detalles}</td>
                </tr>
            `).join('');
        } catch (e) {
            document.getElementById('logs-table-body').innerHTML = '<tr><td colspan="4" style="color:red; text-align:center;">Error al cargar auditoría.</td></tr>';
        }
    }

    async function loadAdmins() {
        try {
            const res = await fetch('/api/admin/users');
            const users = await res.json();
            const admins = users.filter(u => ['admin_junior', 'admin_pro'].includes(u.rol));
            const tbody = document.getElementById('admins-table-body');
            tbody.innerHTML = admins.map(u => `
                <tr>
                    <td><strong>${u.nombre}</strong></td>
                    <td>${u.email}</td>
                    <td><span class="badge-role role-${u.rol}">${u.rol.toUpperCase()}</span> <br><small>${u.estado || 'activo'}</small></td>
                    <td>
                        ${u.rol !== 'admin_pro' ? `
                            ${u.estado === 'activo' ? 
                                `<button class="btn-primary" style="background:#dc2626; padding:4px 8px; font-size:12px;" onclick="changeAdminStatus(${u.id}, 'suspendido')">Suspender</button>` : 
                                `<button class="btn-primary" style="background:#16a34a; padding:4px 8px; font-size:12px;" onclick="changeAdminStatus(${u.id}, 'activo')">Activar</button>`
                            }
                            <button class="btn-primary" style="background:#000; padding:4px 8px; font-size:12px; margin-left:5px;" onclick="deleteUser(${u.id})"><i class="fa-solid fa-trash"></i></button>
                        ` : '<em>No modificable</em>'}
                    </td>
                </tr>
            `).join('');
        } catch (e) {}
    }

    async function loadConfig() {
        try {
            const res = await fetch('/api/admin/config');
            const config = await res.json();
            document.getElementById('c-iva').value = config.iva;
        } catch (e) {}
    }

    async function loadReports() {
        try {
            const res = await fetch('/api/admin/orders');
            const orders = await res.json();
            const totalVentas = orders.filter(o => o.estado !== 'cancelado').reduce((sum, o) => sum + o.total, 0);
            document.getElementById('reports-content').innerHTML = `
                <div style="padding:20px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; text-align:center;">
                    <h4 style="color:#64748b; font-size:14px; text-transform:uppercase; margin-bottom:10px;">Total Ventas (No canceladas)</h4>
                    <div style="font-size:36px; font-weight:bold; color:#0f172a;">$ ${Math.round(totalVentas).toLocaleString('es-CO')}</div>
                    <p style="margin-top:10px; font-size:14px; color:#64748b;">De ${orders.filter(o => o.estado !== 'cancelado').length} pedidos confirmados/entregados.</p>
                </div>
            `;
        } catch (e) {}
    }

    window.changeAdminStatus = async (id, status) => {
        if (!(await mercaConfirm('¿Seguro que deseas cambiar el estado a ' + status + '?'))) return;
        try {
            const res = await fetch(`/api/admin/users/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (res.ok) await loadAdmins();
            else mercaAlert('Error cambiando estado');
        } catch (e) {}
    };

    function setupEventListeners() {
        // Navegación Sidebar
        document.querySelectorAll('.admin-nav-link[data-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                loadSectionData(link.dataset.section);
            });
        });

        // Buscador Productos
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                if (currentSection !== 'products') return;
                const q = e.target.value.toLowerCase();
                const filtered = allProducts.filter(p => 
                    p.nombre.toLowerCase().includes(q) || 
                    p.sku.toLowerCase().includes(q) || 
                    p.cat.toLowerCase().includes(q)
                );
                renderProductsTable(filtered);
            });
        }

        
        const configForm = document.getElementById('config-form');
        if (configForm) {
            configForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const iva = parseFloat(document.getElementById('c-iva').value);
                try {
                    const res = await fetch('/api/admin/config', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ iva })
                    });
                    if (res.ok) mercaAlert('Configuración guardada exitosamente', true);
                    else mercaAlert('Error al guardar configuración');
                } catch(err) { mercaAlert('Error de conexión'); }
            });
        }

        const btnNewAdmin = document.getElementById('btn-new-admin');
        const adminModal = document.getElementById('admin-modal');
        const adminForm = document.getElementById('admin-form');
        
        if (btnNewAdmin) {
            btnNewAdmin.addEventListener('click', () => {
                adminForm.reset();
                adminModal.classList.add('active');
            });
        }
        
        if (adminForm) {
            adminForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const nombre = document.getElementById('a-nombre').value;
                const email = document.getElementById('a-email').value;
                const password = document.getElementById('a-pass').value;

                try {
                    const res = await fetch('/api/admin/create-admin', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nombre, email, password })
                    });
                    if (res.ok) {
                        adminModal.classList.remove('active');
                        mercaAlert('Administrador Junior creado.', true);
                        loadAdmins();
                    } else {
                        const err = await res.json();
                        mercaAlert(err.error || 'Error creando administrador');
                    }
                } catch(e) { mercaAlert('Error de red'); }
            });
        }
        
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', function() {
                const mod = this.closest('.modal-overlay');
                if (mod) mod.classList.remove('active');
            });
        });

        btnNew.addEventListener('click', () => {
            productForm.reset();
            document.getElementById('edit-id').value = '';
            modalTitle.textContent = 'Nuevo Producto';
            modal.classList.add('active');
            updateDynamicSelectors(document.getElementById('p-cat').value);
        });

        const catSelect = document.getElementById('p-cat');
        if (catSelect) {
            catSelect.addEventListener('change', (e) => updateDynamicSelectors(e.target.value));
        }

        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const checkedTemas = Array.from(document.querySelectorAll('.admin-tema-cb:checked')).map(cb => cb.value);
            document.getElementById('p-temas').value = checkedTemas.join(',');
            
            const formData = new FormData(productForm);
            const data = Object.fromEntries(formData.entries());
            data.precio_num = parseFloat(data.precio_num);
            data.desc_pct = parseFloat(data.desc_pct) || 0;
            data.stock = parseInt(data.stock) || 0;
            
            // Asegurar que la etiqueta tenga el signo peso
            if (!data.precio_label.includes('$')) {
                data.precio_label = '$ ' + data.precio_label.trim();
            }
            
            const editId = document.getElementById('edit-id').value;
            const method = editId ? 'PUT' : 'POST';
            const url = editId ? `/api/admin/products/${editId}` : '/api/admin/products';

            try {
                const res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    modal.classList.remove('active');
                    await loadProducts();
                } else {
                    const err = await res.json();
                    mercaAlert('Error: ' + (err.error || 'No se pudo guardar'));
                }
            } catch (e) {
                mercaAlert('Error de conexión');
            }
        });

        document.getElementById('admin-logout').addEventListener('click', async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = 'Login.html';
        });
    }

    // Exponer funciones globales
    window.editProduct = (id) => {
        const p = allProducts.find(x => x.id === id);
        if (!p) return;
        document.getElementById('edit-id').value = p.id;
        document.getElementById('p-id').value = p.id;
        document.getElementById('p-nombre').value = p.nombre;
        document.getElementById('p-sku').value = p.sku;
        document.getElementById('p-cat').value = p.cat;
        document.getElementById('p-precio-num').value = p.precio_num;
        document.getElementById('p-precio-label').value = p.precio_label;
        document.getElementById('p-img').value = p.img;
        document.getElementById('p-tipo').value = p.tipo;
        document.getElementById('p-promo').value = p.promo_badge;
        document.getElementById('p-desc-pct').value = p.desc_pct || 0;
        document.getElementById('p-stock').value = p.stock || 0;
        updateDynamicSelectors(p.cat, p.marca || '', p.temas || '');
        modalTitle.textContent = 'Editar Producto';
        modal.classList.add('active');
    };

    window.deleteProduct = async (id) => {
        if (!(await mercaConfirm('¿Eliminar producto?'))) return;
        try {
            const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
            if (res.ok) await loadProducts();
        } catch (e) { mercaAlert('Error'); }
    };

    window.updateOrderStatus = async (id, status) => {
        try {
            const res = await fetch(`/api/admin/orders/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (res.ok) await loadOrders();
            else mercaAlert('No se pudo actualizar el estado');
        } catch (e) { mercaAlert('Error de conexión'); }
    };

    window.deleteUser = async (id) => {
        if (!(await mercaConfirm('¿Seguro que deseas eliminar este usuario?'))) return;
        try {
            const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                await loadUsers();
                if (currentSection === 'admins') await loadAdmins();
            }
            else mercaAlert('No se pudo eliminar el usuario');
        } catch (e) { 
            mercaAlert('Error de conexión'); 
        }
    };

    init();
})();
