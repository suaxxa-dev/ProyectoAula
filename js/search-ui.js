/**
 * search-ui.js — Módulo compartido de búsqueda para MERCA TO-DO
 * ================================================================
 * Conecta el input de búsqueda con el endpoint /api/search (Python).
 * Incluye debounce, detección de SKU y renderizado de sugerencias.
 *
 * Dependencias (deben cargarse antes):
 *   — auth.js  (para mercaEsc global, si existe)
 *
 * Uso en cada página:
 *   MercaSearch.init({
 *     inputId:       'main-search',
 *     containerId:   'results-container',
 *     skuDisplayId:  'sku-display',
 *     catsDisplayId: 'cats-display',
 *     sectionsClass: '.search-section',
 *   });
 */
var MercaSearch = (function () {
    'use strict';

    // ── Utilidades ────────────────────────────────────────────────────────────

    function esc(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /** Debounce: aplaza fn hasta que paren las llamadas por `delay` ms */
    function debounce(fn, delay) {
        var timer;
        return function () {
            var args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function () { fn.apply(null, args); }, delay);
        };
    }

    /** Detecta si el texto parece un código SKU */
    function looksLikeSku(text) {
        return /^SKU[-\w]{2,}/i.test(text.trim());
    }

    // ── Renderizado de resultados ─────────────────────────────────────────────

    function renderResults(results, container, skuEl, catsEl, sections) {
        if (!container) return;

        if (results.length === 0) {
            container.innerHTML = '<p style="padding:10px;color:#888;">Sin resultados...</p>';
            if (sections && sections[0]) sections[0].classList.add('show');
            if (sections && sections[1]) sections[1].classList.remove('show');
            if (sections && sections[2]) sections[2].classList.remove('show');
            return;
        }

        // Sugerencias clicables
        container.innerHTML = results.map(function (p) {
            return (
                '<a class="sug-item" href="producto.html?id=' + esc(p.id || '') + '">' +
                '<div class="s-img-box"><img src="' + esc(p.img) + '" alt="' + esc(p.nombre) + '"></div>' +
                '<div class="s-info">' +
                '<p class="s-name"><b>' + esc(p.nombre) + '</b></p>' +
                '<p class="s-price">' + esc(p.precioLabel) + '</p>' +
                '<p class="s-cat">' + esc(p.cat) + '</p>' +
                '</div></a>'
            );
        }).join('');

        // Mostrar SKU del primer resultado
        if (skuEl) {
            skuEl.innerHTML = '<b>' + esc(results[0].nombre) + '</b> — ' + esc(results[0].sku || '');
        }

        // Categoría relacionada del primer resultado
        if (catsEl) {
            catsEl.innerHTML = '<li><i class="fa-solid fa-check"></i> ' + esc(results[0].cat) + '</li>';
        }

        // Mostrar todas las secciones del panel
        if (sections) {
            sections.forEach(function (s) { s.classList.add('show'); });
        }
    }

    function hideSections(sections) {
        if (sections) sections.forEach(function (s) { s.classList.remove('show'); });
    }

    // ── Fetch al endpoint Python ─────────────────────────────────────────────

    function fetchSearch(query, callback) {
        var params = new URLSearchParams();
        if (looksLikeSku(query)) {
            params.set('sku', query.trim());
            params.set('q', query.trim()); // también busca por texto
        } else {
            params.set('q', query.trim());
        }
        params.set('limit', '8');

        fetch('/api/search?' + params.toString())
            .then(function (r) { return r.json(); })
            .then(function (data) {
                // Si hay SKU exacto, redirigir automáticamente
                if (data.sku_exact && looksLikeSku(query)) {
                    window.location.href = 'producto.html?id=' + encodeURIComponent(data.sku_exact.id);
                    return;
                }
                callback(data.results || []);
            })
            .catch(function () {
                callback([]);
            });
    }

    // ── API pública ───────────────────────────────────────────────────────────

    /**
     * Inicializa el motor de búsqueda en una página.
     *
     * @param {Object} opts
     * @param {string}  opts.inputId       - ID del input de búsqueda
     * @param {string}  opts.containerId   - ID del contenedor de resultados
     * @param {string}  opts.skuDisplayId  - ID del elemento de SKU (opcional)
     * @param {string}  opts.catsDisplayId - ID del elemento de categorías (opcional)
     * @param {string}  opts.sectionsClass - Selector CSS de las secciones del panel
     */
    function init(opts) {
        var input     = document.getElementById(opts.inputId);
        var container = document.getElementById(opts.containerId);
        var skuEl     = opts.skuDisplayId  ? document.getElementById(opts.skuDisplayId)  : null;
        var catsEl    = opts.catsDisplayId ? document.getElementById(opts.catsDisplayId) : null;

        if (!input || !container) return;

        var sections = opts.sectionsClass
            ? Array.prototype.slice.call(document.querySelectorAll(opts.sectionsClass))
            : [];

        var doSearch = debounce(function (query) {
            if (!query || query.length < 2) {
                hideSections(sections);
                container.innerHTML = '';
                return;
            }
            fetchSearch(query, function (results) {
                renderResults(results, container, skuEl, catsEl, sections);
            });
        }, 250);

        input.addEventListener('input', function () {
            doSearch(input.value.trim());
        });
    }

    return { init: init };

})();
