#!/usr/bin/env python3
"""
search.py — Motor de búsqueda avanzada para MERCA TO-DO
========================================================
Recibe parámetros por la línea de comandos (sys.argv) y devuelve
un JSON con los resultados ordenados por relevancia a stdout.

Uso (llamado desde Node.js via child_process):
    python search.py '{"q": "samsung", "sku": "", "limit": 8}'

Respuesta:
    {"ok": true, "results": [...], "sku_exact": null}
"""

import sys
import json
import os
import unicodedata
import re

# ─── Constantes ──────────────────────────────────────────────────────────────

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
CATALOG_FILE = os.path.join(SCRIPT_DIR, 'catalogo_data.json')
DEFAULT_LIMIT = 8


# ─── Utilidades de texto ─────────────────────────────────────────────────────

def normalize(text: str) -> str:
    """
    Convierte a minúsculas y elimina acentos/diacríticos.
    'Lámpara' → 'lampara',  'SAMSUNG' → 'samsung'
    """
    nfkd = unicodedata.normalize('NFKD', text.lower())
    return ''.join(c for c in nfkd if not unicodedata.combining(c))


def tokenize(text: str) -> list[str]:
    """Divide texto normalizado en tokens de al menos 1 carácter."""
    return [t for t in re.split(r'\s+', normalize(text).strip()) if t]


# ─── Puntuación de relevancia ────────────────────────────────────────────────

def score_product(product: dict, query_tokens: list[str], raw_query: str) -> int:
    """
    Devuelve una puntuación de relevancia (mayor = más relevante).

    Criterios (acumulativos):
      +100  SKU exacto (ignorando mayúsculas)
      +50   Nombre normalizado empieza exactamente por la query
      +30   Nombre normalizado contiene la query completa como subcadena
      +10   Por cada token de la query que aparece en el nombre
      +5    Por cada token de la query que aparece en la categoría
      +2    Por cada token de la query que aparece en el SKU normalizado
    """
    score = 0
    norm_nombre = normalize(product.get('nombre', ''))
    norm_cat    = normalize(product.get('cat', ''))
    norm_sku    = normalize(product.get('sku', ''))
    norm_q      = normalize(raw_query)

    # SKU exacto
    if norm_sku == norm_q:
        score += 100

    # Nombre empieza por la query
    if norm_nombre.startswith(norm_q):
        score += 50

    # Nombre contiene la query completa
    if norm_q in norm_nombre:
        score += 30

    # Por cada token presente en nombre/cat/sku
    for token in query_tokens:
        if token in norm_nombre:
            score += 10
        if token in norm_cat:
            score += 5
        if token in norm_sku:
            score += 2

    return score


# ─── Búsqueda principal ───────────────────────────────────────────────────────

def search(catalog: list[dict], q: str, sku: str, limit: int) -> dict:
    """
    Busca en el catálogo y devuelve resultados ordenados por relevancia.

    Parámetros
    ----------
    catalog : lista de productos cargados desde catalogo_data.json
    q       : texto libre del usuario (puede estar vacío si viene SKU)
    sku     : código SKU exacto (opcional)
    limit   : cantidad máxima de resultados

    Retorna
    -------
    dict con claves:
        ok        : True
        results   : lista de productos { id, nombre, precioLabel, img, cat, sku }
        sku_exact : producto encontrado por SKU exacto (o null)
    """
    results = []
    sku_exact = None

    # ── Búsqueda por SKU exacto ──
    if sku:
        norm_sku_query = normalize(sku.strip())
        for p in catalog:
            if normalize(p.get('sku', '')) == norm_sku_query:
                sku_exact = p
                break

    # ── Búsqueda por texto libre ──
    if q and q.strip():
        raw_q  = q.strip()
        tokens = tokenize(raw_q)

        if not tokens:
            return {'ok': True, 'results': [], 'sku_exact': sku_exact}

        # Filtrar: al menos UN token debe aparecer en nombre o categoría
        candidates = []
        for p in catalog:
            norm_nombre = normalize(p.get('nombre', ''))
            norm_cat    = normalize(p.get('cat', ''))
            norm_sku_p  = normalize(p.get('sku', ''))

            hit = any(
                t in norm_nombre or t in norm_cat or t in norm_sku_p
                for t in tokens
            )
            if hit:
                candidates.append(p)

        # Calcular puntuación y ordenar descendentemente
        scored = [(score_product(p, tokens, raw_q), p) for p in candidates]
        scored.sort(key=lambda x: x[0], reverse=True)

        results = [p for (_, p) in scored[:limit]]

    # Si hay SKU exacto y no está en los resultados de texto, prependerlo
    if sku_exact and all(p['id'] != sku_exact['id'] for p in results):
        results.insert(0, sku_exact)
        results = results[:limit]

    return {
        'ok': True,
        'results': results,
        'sku_exact': sku_exact,
    }


# ─── Entry point ─────────────────────────────────────────────────────────────

def main():
    # Leer parámetros desde argv[1] (JSON string enviado por Node.js)
    if len(sys.argv) < 2:
        print(json.dumps({'ok': False, 'error': 'Sin parámetros', 'results': [], 'sku_exact': None}))
        sys.exit(0)

    try:
        params = json.loads(sys.argv[1])
    except json.JSONDecodeError as e:
        print(json.dumps({'ok': False, 'error': f'JSON inválido: {e}', 'results': [], 'sku_exact': None}))
        sys.exit(0)

    q     = params.get('q', '').strip()
    sku   = params.get('sku', '').strip()
    limit = int(params.get('limit', DEFAULT_LIMIT))

    # Cargar catálogo
    try:
        with open(CATALOG_FILE, 'r', encoding='utf-8') as f:
            catalog = json.load(f)['productos']
    except (FileNotFoundError, KeyError) as e:
        print(json.dumps({'ok': False, 'error': f'No se pudo cargar el catálogo: {e}', 'results': [], 'sku_exact': None}))
        sys.exit(0)

    # Ejecutar búsqueda
    result = search(catalog, q, sku, limit)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
