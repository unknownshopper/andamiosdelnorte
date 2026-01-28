# andamios.com — Sistema de órdenes de renta (MVP)

## Descripción
MVP para captura de órdenes de renta de andamios, con cálculo de importes por periodos, estimación de transporte, validación de stock, mapa interactivo, persistencia local (localStorage) y dashboard con métricas básicas. Diseñado para correr 100% en el navegador y desplegarse en GitHub Pages.

Deploy: https://unknownshopper.github.io/andamiosdelnorte/

## Características principales
- **Formulario de orden (orden.html)**
  - Selección de piezas y conjuntos con validación de existencia.
  - Columna de **Días** sincronizada con **Inicio** y **Fin**.
  - **Tarifas** con formato de moneda y cálculo automático de importes.
  - **Transporte (carga y descarga)** con estimador automático basado en distancia, cantidad y mano de obra; editable y con formato de moneda.
  - **Depósito** con validación de mínimo 50% del total.
  - **Mapa (Leaflet)** con click para seleccionar ubicación y autocompletar dirección/lat/lon (Nominatim).
  - Guardado local de órdenes en `localStorage` y limpieza del formulario tras guardar.

- **Lista de órdenes (rentlist.html)**
  - Lee las órdenes desde `localStorage` (clave `orden_<ISO>`).
  - Acciones: Ver, Descargar (JSON), Eliminar, y "Exportar todo".

- **Dashboard (index.html)**
  - **Equipos en renta**: suma de items (`sets * unidades`) en órdenes activas.
  - **Clientes activos**: clientes únicos con órdenes activas.
  - **Flujo**: muestra **Ingresos** (suma de totales de órdenes activas) y **Egresos** (de `localStorage.gastos_operativos`).
  - Navegación unificada: Dashboard, Orden, Ordenes, Recepción; activa resaltada.

- **Recepción (recepcion.html)**
  - Estructura base estandarizada y navegación consistente (contenido futuro).

- **UI/Estilo**
  - CSS centralizado en `style.css`.
  - JS centralizado en `script.js` (incluye lógica de orden, lista y dashboard).

## Persistencia de datos
- Todo se guarda en el navegador (localStorage) bajo el origen del sitio (GitHub Pages).
- Claves relevantes:
  - `orden_<ISO>`: payload de una orden guardada.
  - `orden_folio_seq`: correlativo de folios.
  - `inv_catalog`: inventario/catálogo (si aplica para stock).
  - `gastos_operativos`: número para egresos en dashboard.

## Checklist de demo
1. **Crear una orden** en `orden.html`:
   - Seleccionar tipo (pieza/conjunto), elemento, cantidad, tarifas.
   - Elegir **Inicio** y opcionalmente **Fin**; confirmar que la columna **Días** coincide.
   - Tocar el **Mapa** para autocompletar dirección/lat/lon.
   - Revisar **Transporte** estimado y editar si es necesario.
   - Ver **Depósito** (mín. 50%) y guardar.
2. **Mostrar la lista** en `rentlist.html`:
   - Ver columnas Folio, Cliente, Obra, Inicio/Fin, Total y Estado.
   - Probar Descargar/Eliminar y "Exportar todo".
3. **Dashboard** `index.html`:
   - Ver **Equipos en renta**, **Clientes activos**, **Ingresos** y **Egresos**.
   - (Opcional demo) Definir egresos desde consola: `localStorage.setItem('gastos_operativos', '45000')`.

## Cómo correr
- Abrir los archivos estáticos en un servidor o usar GitHub Pages (ya configurado).
- Requiere internet para Leaflet y Nominatim.

## Próximos objetivos (mañana)
- **Egresos mensuales automáticos**: generar gastos por rubros y periodo.
  - Rubros: **Nómina**, **Gasolina**, **Luz**, **Renta** (y extensible).
  - Persistencia por mes (ej. `egresos_YYYY-MM`), sumatoria al dashboard por periodo.
  - UI simple para configurar montos mensuales por rubro (crear/editar/eliminar).
- **Dashboard con periodo**: selector de mes para recalcular Ingresos/Egresos y métricas.
- **Recepción**: definir flujo base de devolución/inspección (pendiente de alcance).
- **Resguardo**: exportar/importar órdenes (si se aprueba) para mover datos entre navegadores.

## Notas técnicas
- Estimación de transporte: almacén `{ lat: 18.00302, lon: -92.95144 }`, parámetros por defecto en `script.js`.
- Cálculo de días: diferencia entre fechas (Inicio obligatorio, Fin opcional; si no hay Fin, 1 día mínimo).
- Formato MXN: `Intl.NumberFormat('es-MX', {currency: 'MXN'})`.

