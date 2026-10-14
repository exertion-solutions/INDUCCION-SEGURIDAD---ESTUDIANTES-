# Formación HSE · Material para estudiantes

Herramientas de consulta para futuros profesionales HSE en servicios de pozo. HTML estático, publicado con GitHub Pages. **Funciona sin conexión** (PWA instalable).

| Sitio | Carpeta |
|---|---|
| Portada | `index.html` |
| Guía de Inspecciones SGI | `guia-inspecciones/` |
| Guía de Mediciones SRT | `guia-mediciones-srt/` |
| Herramientas en Equipos de Torre | `herramientas-torre/` |
| Estado mecánico de pozos terminados | `estado-mecanico-pozos/` |
| Libro DROPS | `libro-drops/` |

## Publicar
Settings → Pages → Deploy from a branch → `main` / root.

## Estructura compartida
- `nav.js`: menú "Sitios" en todas las páginas (progreso, anterior/siguiente, buscador `Ctrl+K` o `/`), accesibilidad (saltar al contenido, foco, movimiento reducido), impresión y registro del service worker.
- `assets/`: fuentes (`fonts/`), Three.js y jsPDF (`vendor/`), fuentes estándar de pdf.js, íconos, `search-index.json`, `pumpjack.js` (ilustración animada de la portada).
- `manifest.webmanifest` + `sw.js`: instalación como app y uso sin conexión. Precachea todo (~14 MB) la primera vez.

## Después de cambiar archivos
```sh
python3 -m http.server 8767 &                      # servir el repo
PLAYWRIGHT_PATH=<ruta a playwright> node tools/build_search_index.js http://localhost:8767/   # solo si cambió el contenido
python3 tools/build_sw.py                          # regenera sw.js (lista de precache + versión)
```
`python3 tools/build_sw.py --check` falla si `sw.js` quedó desactualizado.

## Notas
- Los datos del Libro DROPS se guardan en el navegador del alumno; el banner ofrece copia de seguridad y restauración en `.json`.
- Las ilustraciones y modelos son didácticos, no aptos para diseño.
