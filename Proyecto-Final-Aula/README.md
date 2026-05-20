# MERCA TO-DO 🛒

Plataforma integral de E-commerce desarrollada con una arquitectura robusta orientada a componentes modulares utilizando **HTML, CSS, Vanilla JavaScript, Node.js y SQLite**. Incluye un potente sistema de roles (Admin Pro, Admin Junior, Usuario) y un módulo de búsqueda interconectado.

## 🚀 Requisitos Previos

Antes de levantar el proyecto, asegúrate de tener instalados los siguientes entornos en tu máquina local:

1. **[Node.js](https://nodejs.org/es/)** (v14.0 o superior) - Entorno de ejecución para el servidor.
2. **[Python](https://www.python.org/downloads/)** (v3.8 o superior) - Necesario para el algoritmo de búsqueda inteligente (`search.py`).

---

## 🛠️ Instalación y Puesta en Marcha

Si acabas de clonar o descargar este repositorio desde GitHub, sigue estos pasos para iniciar la aplicación:

### 1. Clonar el repositorio
Si aún no lo has hecho, clona el proyecto usando Git:
```bash
git clone https://github.com/TU_USUARIO/ProyectoAula.git
cd ProyectoAula
```
*(Si lo descargaste como `.zip`, simplemente descomprime el archivo y abre una terminal dentro de la carpeta extraída).*

### 2. Instalar Dependencias (Node Modules)
El proyecto utiliza librerías externas esenciales como `express`, `bcryptjs` (para encriptar contraseñas) y `sql.js` (para la base de datos). Para instalarlas, ejecuta en la consola:
```bash
npm install
```

### 3. Iniciar el Servidor
Una vez instaladas las dependencias, levanta el entorno de desarrollo y el servidor Node ejecutando:
```bash
npm start
```
*También puedes utilizar `node server.js`.*

### 4. Acceder a la plataforma
Abre tu navegador de preferencia y visita la siguiente dirección local:
```text
http://localhost:3000
```

---

## 🔐 Cuentas por Defecto (Seeders)

El sistema generará automáticamente la base de datos `mercatodo.db` al iniciarse por primera vez y precargará el catálogo. Además, crea una cuenta de administrador maestra para que puedas gestionar la tienda:

- **Rol:** Admin Pro (Acceso total)
- **Correo Electrónico:** `admin@mercatodo.com`
- **Contraseña:** `admin123`

Desde el panel de este administrador (`/Admin.html`), podrás crear otros usuarios, asignar roles de "Admin Junior", suspender cuentas, inventariar nuevos productos y revisar los pedidos de la plataforma.

---

## 📁 Estructura del Proyecto

* **`/css`** - Hojas de estilo estructuradas con metodología Mobile-First.
* **`/js`** - Lógica del cliente (Carritos, Autenticación, Frontend UI).
* **`/img`** - Recursos gráficos y multimedia del catálogo.
* **`server.js`** - Enrutador principal y configuración de Express.
* **`db.js`** - Motor de base de datos integrado con `sql.js` (SQLite en memoria/disco).
* **`search.py`** - Script de Python que procesa consultas de búsqueda mediante algoritmos de coincidencia avanzada.

---

Hecho con ❤️ para la gestión inteligente de E-commerce.
