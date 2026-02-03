// Utilidades comunes
function setYear() {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

document.addEventListener('DOMContentLoaded', () => {
  setYear();

  function storageAvailable(){
    try {
      const x = '__storage_test__';
      localStorage.setItem(x, '1');
      localStorage.removeItem(x);
      return true;
    } catch (e) {
      return false;
    }
  }

  function trySetLocal(key, value){
    try {
      localStorage.setItem(key, value);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e };
    }
  }

  // =====================
  // index.html (login + dashboard)
  // =====================
  const loginForm = document.getElementById('loginForm');
  const loginView = document.getElementById('loginView');
  const dashboardView = document.getElementById('dashboardView');
  const topbar = document.getElementById('topbar');
  const userLabel = document.getElementById('userLabel');
  const logoutBtn = document.getElementById('logoutBtn');

  function showDashboard(email){
    if (!loginView || !dashboardView) return;
    loginView.style.display = 'none';
    dashboardView.style.display = '';
    if (topbar) topbar.style.display = 'block';
    if (userLabel) userLabel.textContent = email;

    // Helpers
    const today = new Date();
    const parseCur = (s) => {
      if (!s) return 0;
      if (typeof s === 'number') return s;
      const n = parseFloat(String(s).replace(/[^0-9,.-]/g,'').replace(/,/g,''));
      return isNaN(n) ? 0 : n;
    };
    const moneyFmt = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n||0);
    const readOrders = () => {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('orden_'));
      return keys.map(k => { try { return JSON.parse(localStorage.getItem(k)||'null'); } catch (e) { return null; } }).filter(Boolean);
    };
    const isActive = (o) => {
      if (!o) return false;
      const i = o.inicio ? new Date(o.inicio) : null;
      const f = o.fin ? new Date(o.fin) : null;
      if (i && i > today) return false; // aún no inicia
      if (!f) return true; // abierta
      return f >= today; // dentro del periodo
    };

    const orders = readOrders();
    const active = orders.filter(isActive);

    // Métrica: Equipos en renta (piezas/conjuntos totales en órdenes activas)
    const totalItems = active.reduce((acc, o) => acc + (Array.isArray(o.partidas) ? o.partidas.reduce((s,p)=> s + ((p.sets||0)*(p.unidades||0)), 0) : 0), 0);

    // Clientes activos (únicos en órdenes activas)
    const clienteSet = new Set(active.map(o => o.cliente).filter(Boolean));

    // Ingresos: suma de totales de órdenes activas
    const ingresos = active.reduce((acc,o)=> acc + parseCur((o && o.totales && (o.totales.total || o.totales.subtotal)) || 0), 0);

    // Egresos: configurable por localStorage (gastos_operativos); si no existe, 0
    const egresos = parseCur(localStorage.getItem('gastos_operativos') || 0);

    // Mantenimiento: sin fuente real aún -> 0 por defecto
    const mantoOpen = 0;

    const rentaEl = document.getElementById('metricRenta');
    const clientesEl = document.getElementById('metricClientes');
    const mantoEl = document.getElementById('metricManto');
    const ingEl = document.getElementById('metricIngresos');
    const egrEl = document.getElementById('metricEgresos');
    if (rentaEl) rentaEl.textContent = String(totalItems);
    if (clientesEl) clientesEl.textContent = String(clienteSet.size);
    if (mantoEl) mantoEl.textContent = String(mantoOpen);
    if (ingEl) ingEl.textContent = moneyFmt(ingresos);
    if (egrEl) egrEl.textContent = moneyFmt(egresos);
  }

  // =====================
  // rentlist.html (lista de órdenes locales)
  // =====================
  const ordersBody = document.getElementById('ordersBody');
  if (ordersBody) {
    function rl_money(n){
      try { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n)||0); } catch(e){ return '$ 0.00'; }
    }
    function rl_safeParse(s){ try { return JSON.parse(s); } catch (e) { return null; } }
    function rl_readAll(){
      const keys = Object.keys(localStorage).filter(k => k.startsWith('orden_')).sort();
      return keys.map(k => ({ key: k, data: rl_safeParse(localStorage.getItem(k)) })).filter(x => !!x.data);
    }
    function rl_state(o){ return (o && o.fin) ? 'Cerrada' : 'Abierta'; }
    function rl_escape(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }

    function rl_render(){
      ordersBody.innerHTML = '';
      const rows = rl_readAll();
      if (!rows.length){
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="8" class="muted">No hay órdenes guardadas en este dispositivo.</td>';
        ordersBody.appendChild(tr);
        return;
      }
      rows.forEach(({key, data}) => {
        const tr = document.createElement('tr');
        const total = (data && data.totales && (data.totales.total || data.totales.subtotal)) || '';
        tr.innerHTML = `
          <td>${(data && data.orderId) || '—'}</td>
          <td>${rl_escape((data && data.cliente) || '—')}</td>
          <td>${rl_escape((data && data.obra) || '—')}</td>
          <td>${(data && data.inicio) || '—'}</td>
          <td>${(data && data.fin) || '—'}</td>
          <td>${rl_escape(total)}</td>
          <td>${rl_state(data)}</td>
          <td style="white-space:nowrap;">
            <button class="btn" data-action="view" data-key="${key}">Ver</button>
            <button class="btn" data-action="download" data-key="${key}">Descargar</button>
            <button class="btn" data-action="delete" data-key="${key}">Eliminar</button>
          </td>
        `;
        ordersBody.appendChild(tr);
      });
    }

    function rl_handle(e){
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const key = btn.getAttribute('data-key');
      const action = btn.getAttribute('data-action');
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const data = rl_safeParse(raw);
      if (action === 'view'){
        const w = window.open('about:blank', '_blank');
        if (w) {
          const baseHref = String(location.href).replace(/[^/]*$/, '');
          const partidas = Array.isArray(data && data.partidas) ? data.partidas : [];
          const partidasRows = partidas.map((p) => {
            const sets = (p && (p.sets !== undefined && p.sets !== null)) ? p.sets : '';
            const unidades = (p && (p.unidades !== undefined && p.unidades !== null)) ? p.unidades : '';
            const dias = (p && (p.dias !== undefined && p.dias !== null)) ? p.dias : '';
            const tarifa = (p && (p.tarifa !== undefined && p.tarifa !== null)) ? p.tarifa : '';
            const cantidad = (p && (p.cantidad !== undefined && p.cantidad !== null)) ? p.cantidad : '';
            const desc = rl_escape((p && p.descripcion) ? p.descripcion : '—');
            const tipo = rl_escape((p && p.tipo) ? p.tipo : '—');
            return (
              '<tr>'+
                '<td>'+rl_escape(String(sets))+'</td>'+
                '<td>'+tipo+'</td>'+
                '<td>'+desc+'</td>'+
                '<td>'+rl_escape(String(unidades))+'</td>'+
                '<td>'+rl_escape(String(dias))+'</td>'+
                '<td>'+rl_escape(String(tarifa))+'</td>'+
                '<td>'+rl_escape(String(cantidad))+'</td>'+
              '</tr>'
            );
          }).join('');

          const orderId = rl_escape((data && data.orderId) ? data.orderId : '—');
          const cliente = rl_escape((data && data.cliente) ? data.cliente : '—');
          const obra = rl_escape((data && data.obra) ? data.obra : '—');
          const inicio = rl_escape((data && data.inicio) ? data.inicio : '—');
          const fin = rl_escape((data && data.fin) ? data.fin : '—');
          const ubicacion = rl_escape((data && data.ubicacion) ? data.ubicacion : '—');
          const deposito = rl_escape(String((data && data.deposito !== undefined && data.deposito !== null) ? data.deposito : '—'));
          const tipoPagoDeposito = rl_escape((data && data.tipoPagoDeposito) ? data.tipoPagoDeposito : '—');
          const subtotal = rl_escape((data && data.totales && data.totales.subtotal) ? data.totales.subtotal : '—');
          const transporte = rl_escape((data && data.totales && data.totales.transporte) ? data.totales.transporte : '—');
          const iva = rl_escape((data && data.totales && data.totales.iva) ? data.totales.iva : '—');
          const total = rl_escape((data && data.totales && data.totales.total) ? data.totales.total : '—');

          w.document.write(
            '<!doctype html>'+
            '<html lang="es">'+
            '<head>'+
              '<meta charset="utf-8" />'+
              '<meta name="viewport" content="width=device-width, initial-scale=1" />'+
              '<title>Orden '+orderId+' | andamios.com</title>'+
              '<base href="'+rl_escape(baseHref)+'" />'+
              '<link rel="icon" href="img/icon.png" />'+
              '<link rel="stylesheet" href="style.css" />'+
            '</head>'+
            '<body>'+
              '<header class="hero">'+
                '<div class="container hero-inner">'+
                  '<a class="brand" href="rentlist.html">'+
                    '<img class="brand-logo" src="img/logo.png" alt="andamios.com" />'+
                    '<span class="brand-name">andamios.com</span>'+
                  '</a>'+
                  '<nav>'+
                    '<button class="btn" type="button" onclick="window.close()">Cerrar</button>'+
                  '</nav>'+
                '</div>'+
              '</header>'+

              '<main class="container">'+
                '<h1>Orden '+orderId+'</h1>'+
                '<p class="muted">Vista de detalle</p>'+

                '<section class="grid" style="margin-top:12px;">'+
                  '<div class="card span-6">'+
                    '<h2>Cliente y obra</h2>'+
                    '<div class="muted"><strong>Cliente:</strong> '+cliente+'</div>'+
                    '<div class="muted"><strong>Obra:</strong> '+obra+'</div>'+
                    '<div class="muted"><strong>Inicio:</strong> '+inicio+'</div>'+
                    '<div class="muted"><strong>Fin:</strong> '+fin+'</div>'+
                  '</div>'+
                  '<div class="card span-6">'+
                    '<h2>Ubicación y depósito</h2>'+
                    '<div class="muted"><strong>Ubicación:</strong> '+ubicacion+'</div>'+
                    '<div class="muted"><strong>Depósito:</strong> '+deposito+'</div>'+
                    '<div class="muted"><strong>Tipo de pago:</strong> '+tipoPagoDeposito+'</div>'+
                  '</div>'+

                  '<div class="card span-12">'+
                    '<h2>Partidas</h2>'+
                    '<div style="overflow:auto;">'+
                      '<table>'+
                        '<thead>'+
                          '<tr>'+
                            '<th>Cantidad</th>'+
                            '<th>Tipo</th>'+
                            '<th>Descripción</th>'+
                            '<th>Unidades</th>'+
                            '<th>Días</th>'+
                            '<th>Tarifa</th>'+
                            '<th>Total piezas</th>'+
                          '</tr>'+
                        '</thead>'+
                        '<tbody>'+
                          (partidasRows || '<tr><td colspan="7" class="muted">Sin partidas</td></tr>')+
                        '</tbody>'+
                      '</table>'+
                    '</div>'+
                  '</div>'+

                  '<div class="card span-12">'+
                    '<h2>Totales</h2>'+
                    '<div style="overflow:auto;">'+
                      '<table>'+
                        '<tbody>'+
                          '<tr><td class="muted">Subtotal</td><td style="text-align:right;"><strong>'+subtotal+'</strong></td></tr>'+
                          '<tr><td class="muted">Transporte</td><td style="text-align:right;">'+transporte+'</td></tr>'+
                          '<tr><td class="muted">IVA</td><td style="text-align:right;">'+iva+'</td></tr>'+
                          '<tr><td><strong>Total</strong></td><td style="text-align:right;"><strong>'+total+'</strong></td></tr>'+
                        '</tbody>'+
                      '</table>'+
                    '</div>'+
                  '</div>'+
                '</section>'+
              '</main>'+
            '</body>'+
            '</html>'
          );
          w.document.close();
        }
      } else if (action === 'download'){
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = ((data && data.orderId) || key)+'.json';
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
      } else if (action === 'delete'){
        if (confirm('¿Eliminar esta orden?')){
          try { localStorage.removeItem(key); } catch (e) {}
          rl_render();
        }
      }
    }

    document.addEventListener('click', rl_handle);
    const exportAllBtn = document.getElementById('exportAll');
    if (exportAllBtn) exportAllBtn.addEventListener('click', () => {
      const rows = rl_readAll();
      const payload = rows.map(r => Object.assign({ key: r.key }, (r && r.data) ? r.data : {}));
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'ordenes.json';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    });

    rl_render();
  }

  // =====================
  // inv.html (inventario)
  // =====================
  const invBody = document.getElementById('invBody');
  if (invBody) {
    const invSearch = document.getElementById('invSearch');
    const invCategoria = document.getElementById('invCategoria');

    function moneyInv(n){ return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n||0); }

    function seedCatalog(){
      const seed = [
        { codigo: 'MF-200', pieza: 'Marco', medida: '2.0 m', unidad: 'pz', peso: 12.5, tarifa: 45, stock: 120, categoria: 'marcos', img: '' },
        { codigo: 'MF-150', pieza: 'Marco', medida: '1.5 m', unidad: 'pz', peso: 10.8, tarifa: 42, stock: 90, categoria: 'marcos', img: '' },
        { codigo: 'CR-STD', pieza: 'Cruceta', medida: 'Estándar', unidad: 'pz', peso: 3.2, tarifa: 15, stock: 240, categoria: 'crucetas', img: '' },
        { codigo: 'PL-MADERA', pieza: 'Plataforma', medida: 'Madera 2.0 m', unidad: 'pz', peso: 8.0, tarifa: 35, stock: 60, categoria: 'plataformas', img: '' },
        { codigo: 'PL-AL-2', pieza: 'Plataforma', medida: 'Aluminio 2.0 m', unidad: 'pz', peso: 6.2, tarifa: 55, stock: 40, categoria: 'plataformas', img: '' },
        { codigo: 'BF-BASE', pieza: 'Base fija', medida: 'Acero', unidad: 'pz', peso: 2.1, tarifa: 8, stock: 300, categoria: 'bases', img: '' },
        { codigo: 'BR-RD-8', pieza: 'Rueda', medida: '8" con freno', unidad: 'pz', peso: 2.8, tarifa: 20, stock: 50, categoria: 'ruedas', img: '' },
        { codigo: 'AB-90', pieza: 'Abrazadera', medida: 'Fija 90°', unidad: 'pz', peso: 1.1, tarifa: 6, stock: 400, categoria: 'abrazaderas', img: '' },
        { codigo: 'TB-300', pieza: 'Tubo', medida: '3.0 m', unidad: 'pz', peso: 7.5, tarifa: 18, stock: 140, categoria: 'tubos', img: '' }
      ];
      try { localStorage.setItem('inv_catalog', JSON.stringify(seed)); } catch (e) {}
      return seed;
    }

    function loadCatalog(){
      try {
        const raw = localStorage.getItem('inv_catalog');
        if (!raw) return seedCatalog();
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return seedCatalog();
        return parsed;
      } catch (e) { return seedCatalog(); }
    }

    function render(rows){
      invBody.innerHTML = '';
      rows.forEach(item => {
        const tr = document.createElement('tr');
        const imgSrc = item.img && item.img.length ? item.img : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2256%22 height=%2242%22%3E%3Crect width=%2256%22 height=%2242%22 fill=%22%23eef2f7%22/%3E%3C/svg%3E';
        tr.innerHTML = `
          <td><img class="thumb" alt="${item.pieza}" src="${imgSrc}"></td>
          <td>${item.codigo||''}</td>
          <td>${item.pieza||''}</td>
          <td class="hide-sm">${item.medida||''}</td>
          <td>${item.unidad||''}</td>
          <td class="hide-sm">${((item.peso !== undefined && item.peso !== null) ? item.peso : '')}${item.peso? ' kg':''}</td>
          <td>${moneyInv(item.tarifa)}</td>
          <td>${((item.stock !== undefined && item.stock !== null) ? item.stock : 0)}</td>
        `;
        invBody.appendChild(tr);
      });
    }

    const catalog = loadCatalog();

    function applyFilters(){
      const q = ((invSearch && invSearch.value) ? invSearch.value : '').toLowerCase();
      const cat = (invCategoria && invCategoria.value) ? invCategoria.value : '';
      const filtered = catalog.filter(it => {
        const matchText = !q || `${it.codigo} ${it.pieza} ${it.medida}`.toLowerCase().includes(q);
        const matchCat = !cat || it.categoria === cat;
        return matchText && matchCat;
      });
      render(filtered);
    }

    if (invSearch) invSearch.addEventListener('input', applyFilters);
    if (invCategoria) invCategoria.addEventListener('change', applyFilters);
    applyFilters();
  }

  function logout(){
    localStorage.removeItem('sessionEmail');
    if (topbar) topbar.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'none';
    if (loginView) loginView.style.display = '';
  }

  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  if (loginForm) {
    const saved = localStorage.getItem('sessionEmail');
    if (saved) { showDashboard(saved); }

    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailEl = document.getElementById('email');
      const emailRaw = emailEl ? emailEl.value : '';
      const email = emailRaw ? String(emailRaw).trim() : '';
      const pass = (document.getElementById('password') || {}).value;
      if (!email || !pass) { alert('Completa correo y contraseña'); return; }
      localStorage.setItem('sessionEmail', email);
      showDashboard(email);
    });
  }

  // =====================
  // orden.html (formulario de orden)
  // =====================
  const ordenForm = document.getElementById('ordenForm');
  if (ordenForm) {
    const partidasBody = document.getElementById('partidasBody');
    const btnAgregar = document.getElementById('agregarPartida');
    const agregarItemBtn = document.getElementById('agregarItem');
    const tipoPartida = document.getElementById('tipoPartida');
    const itemSelect = document.getElementById('itemSelect');
    const itemSelectWrap = document.getElementById('itemSelectWrap');
    const piezaGrid = document.getElementById('piezaGrid');
    const existenciaHint = document.getElementById('existenciaHint');
    const conjuntoQty = document.getElementById('conjuntoQty');
    const subtotalEl = document.getElementById('subtotal');
    const transporteInput = document.getElementById('transporteInput');
    const ivaEl = document.getElementById('iva');
    const totalEl = document.getElementById('total');
    const depositoEl = document.getElementById('deposito');
    const orderIdInput = document.getElementById('orderId');
    const latInput = document.getElementById('latitud');
    const lonInput = document.getElementById('longitud');
    const mapContainer = document.getElementById('map');
    const inicioInput = document.getElementById('inicio');
    const finInput = document.getElementById('fin');
    const periodoAviso = document.getElementById('periodoAviso');

    function money(n){
      // Moneda fija para totales: MXN (el selector se usa para tipo de pago del depósito)
      const currency = 'MXN';
      return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(n||0);
    }

    function parseMoney(val){
      if (typeof val !== 'string') return Number(val)||0;
      const s = val.replace(/[^0-9,.-]/g, '').replace(/,/g, '');
      const n = parseFloat(s);
      return isNaN(n) ? 0 : n;
    }

    function formatRateInput(input){
      if (!input) return;
      const n = parseMoney(input.value);
      input.value = money(n);
    }

    function formatTransport(){
      if (!transporteInput) return;
      const n = parseMoney(transporteInput.value || '0');
      transporteInput.value = money(n);
    }

    function recalc(){
      if (!partidasBody) return;
      let subtotal = 0;
      partidasBody.querySelectorAll('tr').forEach(tr => {
        const setsEl = tr.querySelector('.sets');
        let sets = parseFloat(setsEl ? setsEl.value : '');
        if (!Number.isFinite(sets) || sets === 0) {
          const gid = tr.dataset.groupId;
          if (gid) {
            const headerSets = partidasBody.querySelector(`tr[data-group-id="${gid}"] .sets`);
            sets = parseFloat(headerSets ? headerSets.value : '0');
          } else {
            sets = 0;
          }
        }
        const unitsEl = tr.querySelector('.units');
        const rateEl = tr.querySelector('.rate');
        const daysEl = tr.querySelector('.days');
        const units = parseFloat(unitsEl ? unitsEl.value : '') || 0;
        const rate = parseMoney(rateEl ? rateEl.value : '0') || 0;
        const days = parseFloat(daysEl ? daysEl.value : '') || 1;
        const imp = sets * units * rate * days;
        const impCell = tr.querySelector('.importe');
        if (impCell) impCell.textContent = money(imp);
        subtotal += imp;
      });
      const transporte = parseMoney((transporteInput && transporteInput.value) ? transporteInput.value : '0') || 0;
      const base = subtotal + transporte;
      const iva = base * 0.16;
      const total = base + iva;
      if (subtotalEl) subtotalEl.textContent = money(subtotal);
      if (ivaEl) ivaEl.textContent = money(iva);
      if (totalEl) totalEl.textContent = money(total);
      // forzar mínimo de depósito 50%
      if (depositoEl) {
        const min = Math.max(0, total * 0.5);
        const cur = parseMoney(depositoEl.value || '0');
        if (cur < min) depositoEl.value = String(min.toFixed(2));
      }

      // Refrescar inventario disponible en UI (grid/hints)
      try { updateExistenciaHint(); } catch (e) {}
    }

    function getReservedByIndex(){
      const reserved = {};
      if (!partidasBody) return reserved;
      const rows = partidasBody.querySelectorAll('tr');
      Array.prototype.forEach.call(rows, (tr) => {
        const idxRaw = tr && tr.dataset ? tr.dataset.itemIndex : null;
        if (idxRaw === undefined || idxRaw === null || idxRaw === '') return;
        const idx = parseInt(String(idxRaw), 10);
        if (!isFinite(idx)) return;

        // calcular cantidad en piezas: sets * units
        const setsEl = tr.querySelector('.sets');
        const unitsEl = tr.querySelector('.units');
        let sets = parseFloat(setsEl ? setsEl.value : '0');
        if (!isFinite(sets) || sets === 0) {
          const gid = tr.dataset ? tr.dataset.groupId : '';
          if (gid) {
            const headerSets = partidasBody.querySelector(`tr[data-group-id="${gid}"] .sets`);
            sets = parseFloat(headerSets ? headerSets.value : '0');
          }
        }
        const units = parseFloat(unitsEl ? unitsEl.value : '0') || 0;
        const qty = Math.max(0, (sets || 0) * (units || 0));
        reserved[idx] = (reserved[idx] || 0) + qty;
      });
      return reserved;
    }

    function availableStockForIndex(idx){
      const it = invCatalogOrden[idx];
      const base = it && isFinite(it.stock) ? Number(it.stock) : 0;
      const reserved = getReservedByIndex();
      const used = reserved[idx] || 0;
      const avail = base - used;
      return avail < 0 ? 0 : avail;
    }

    function removeRow(btn){
      const tr = btn.closest('tr');
      if (!tr) return;
      const groupId = tr.dataset.groupId;
      if (groupId) {
        const siblings = Array.from(partidasBody.querySelectorAll(`tr[data-group-id="${groupId}"]`));
        const header = siblings.find(r => r.querySelector('td:nth-child(2) .type-badge'));
        if (header) {
          const td1 = header.querySelector('td:nth-child(1)');
          const td2 = header.querySelector('td:nth-child(2)');
          let rs1 = parseInt((td1 && td1.getAttribute('rowspan')) || '1', 10);
          let rs2 = parseInt((td2 && td2.getAttribute('rowspan')) || '1', 10);
          if (siblings.length > 1) {
            if (tr === header) {
              // Move header cell to next sibling in group
              const next = siblings.find(r => r !== header);
              if (next) {
                // move td1 and td2
                if (next.children[0]) next.removeChild(next.children[0]);
                if (next.children[0]) next.removeChild(next.children[0]);
                if (td2) next.insertBefore(td2, next.firstChild);
                if (td1) next.insertBefore(td1, next.firstChild);
                if (td1) td1.setAttribute('rowspan', String((rs1||2) - 1));
                if (td2) td2.setAttribute('rowspan', String((rs2||2) - 1));
              }
            } else {
              // Decrease rowspan on header
              if (td1) td1.setAttribute('rowspan', String(Math.max(1, (rs1||2) - 1)));
              if (td2) td2.setAttribute('rowspan', String(Math.max(1, (rs2||2) - 1)));
            }
          }
        }
      }
      tr.remove();
      recalc();
      try { updateExistenciaHint(); } catch (e) {}
    }

    function autoResize(el){
      if (!el) return;
      el.style.height = 'auto';
      el.style.overflow = 'hidden';
      el.style.height = (el.scrollHeight) + 'px';
    }

    function addRow(initial){
      if (!partidasBody) return;
      const tr = document.createElement('tr');
      const tipoVal = (initial && initial.tipo === 'conjunto') ? 'conjunto' : 'pieza';
      tr.dataset.tipo = tipoVal;
      const tipoLabel = tipoVal === 'conjunto' ? 'Conjunto' : 'Pieza';
      const tipoClass = tipoVal === 'conjunto' ? 'is-conjunto' : 'is-pieza';
      tr.classList.toggle('row-conjunto', tipoVal === 'conjunto');
      const badgeText = (initial && initial.badgeLabel) ? initial.badgeLabel : tipoLabel;
      tr.innerHTML = `
        <td><input type="number" min="0" step="1" class="sets" value="1" /></td>
        <td><span class="type-badge ${tipoClass}">${badgeText}</span></td>
        <td><textarea class="desc" rows="1" placeholder="Descripción (ej. Marco 2.0m / Kit estándar)"></textarea></td>
        <td><input type="number" min="0" step="1" class="units" value="1" /></td>
        <td><input type="text" inputmode="decimal" class="rate" value="$ 0.00" /></td>
        <td><input type="number" min="1" step="1" class="days" value="${computeServiceDays()}" readonly title="Se calcula con Inicio y Fin" /></td>
        <td class="importe">$ 0.00</td>
        <td><button type="button" class="btn" data-action="remove">Eliminar</button></td>
      `;
      partidasBody.appendChild(tr);
      tr.querySelectorAll('input, select, textarea').forEach(el => el.addEventListener('input', recalc));
      const rateInput = tr.querySelector('.rate');
      if (rateInput) {
        rateInput.addEventListener('blur', () => { formatRateInput(rateInput); recalc(); });
        // inicial
        formatRateInput(rateInput);
      }
      const descArea = tr.querySelector('.desc');
      if (descArea) descArea.addEventListener('input', () => autoResize(descArea));
      const removeBtn = tr.querySelector('[data-action="remove"]');
      if (removeBtn) removeBtn.addEventListener('click', () => removeRow(removeBtn));
      if (initial) {
        const desc = tr.querySelector('.desc');
        const sets = tr.querySelector('.sets');
        const units = tr.querySelector('.units');
        const rate = tr.querySelector('.rate');
        const unidad = null;
        if (initial.descripcion && desc) desc.value = initial.descripcion;
        if (desc) autoResize(desc);
        if (typeof initial.sets === 'number' && sets) sets.value = String(initial.sets);
        if (typeof initial.unidades === 'number' && units) units.value = String(initial.unidades);
        if (typeof initial.tarifa === 'number' && rate) { rate.value = money(initial.tarifa); }
        const days = tr.querySelector('.days');
        if (typeof initial.dias === 'number' && days) days.value = String(initial.dias);
        // unidad eliminada
      }
      if (!initial && descArea) autoResize(descArea);
      recalc();
      updateExistenciaHint();
      return tr;
    }

    if (btnAgregar) btnAgregar.addEventListener('click', () => addRow());
    if (transporteInput) {
      transporteInput.addEventListener('input', () => {
        transporteInput.dataset.manual = '1';
        recalc();
      });
      transporteInput.addEventListener('blur', () => { formatTransport(); });
    }
    if (depositoEl) depositoEl.addEventListener('input', () => {
      // validar contra mínimo
      const total = parseMoney((totalEl && totalEl.textContent) ? totalEl.textContent : '0');
      const min = Math.max(0, total * 0.5);
      const cur = parseMoney(depositoEl.value || '0');
      if (cur < min) depositoEl.value = String(min.toFixed(2));
    });

    // Catálogo de conjuntos (BOM) básico
    const CATALOG_BOM = {
      'andamio_basico_1': {
        nombre: 'Andamio básico 1.0',
        piezas: [
          { descripcion: 'Marco 2.0 m', cantidad: 2 },
          { descripcion: 'Cruceta estándar', cantidad: 2 },
          { descripcion: 'Plataforma/Tabla', cantidad: 2 },
          { descripcion: 'Base fija', cantidad: 4 },
          { descripcion: 'Abrazadera/Unión', cantidad: 8 }
        ]
      },
      'andamio_trabajo_ligero': {
        nombre: 'Andamio trabajo ligero',
        piezas: [
          { descripcion: 'Marco 1.5 m', cantidad: 2 },
          { descripcion: 'Cruceta ligera', cantidad: 2 },
          { descripcion: 'Plataforma aluminio', cantidad: 2 },
          { descripcion: 'Base con rueda', cantidad: 4 }
        ]
      }
    };

    // Inventario para selector de piezas
    function seedCatalogOrden(){
      const seed = [
        { codigo: 'MF-200', pieza: 'Marco', medida: '2.0 m', unidad: 'pz', peso: 12.5, tarifa: 45, stock: 120, categoria: 'marcos', img: '' },
        { codigo: 'MF-150', pieza: 'Marco', medida: '1.5 m', unidad: 'pz', peso: 10.8, tarifa: 42, stock: 90, categoria: 'marcos', img: '' },
        { codigo: 'CR-STD', pieza: 'Cruceta', medida: 'Estándar', unidad: 'pz', peso: 3.2, tarifa: 15, stock: 240, categoria: 'crucetas', img: '' },
        { codigo: 'PL-MADERA', pieza: 'Plataforma', medida: 'Madera 2.0 m', unidad: 'pz', peso: 8.0, tarifa: 35, stock: 60, categoria: 'plataformas', img: '' },
        { codigo: 'PL-AL-2', pieza: 'Plataforma', medida: 'Aluminio 2.0 m', unidad: 'pz', peso: 6.2, tarifa: 55, stock: 40, categoria: 'plataformas', img: '' },
        { codigo: 'BF-BASE', pieza: 'Base fija', medida: 'Acero', unidad: 'pz', peso: 2.1, tarifa: 8, stock: 300, categoria: 'bases', img: '' },
        { codigo: 'BR-RD-8', pieza: 'Rueda', medida: '8" con freno', unidad: 'pz', peso: 2.8, tarifa: 20, stock: 50, categoria: 'ruedas', img: '' },
        { codigo: 'AB-90', pieza: 'Abrazadera', medida: 'Fija 90°', unidad: 'pz', peso: 1.1, tarifa: 6, stock: 400, categoria: 'abrazaderas', img: '' },
        { codigo: 'TB-300', pieza: 'Tubo', medida: '3.0 m', unidad: 'pz', peso: 7.5, tarifa: 18, stock: 140, categoria: 'tubos', img: '' }
      ];
      try { localStorage.setItem('inv_catalog', JSON.stringify(seed)); } catch (e) {}
      return seed;
    }
    function loadCatalogOrden(){
      try {
        const raw = localStorage.getItem('inv_catalog');
        if (!raw) return seedCatalogOrden();
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return seedCatalogOrden();
        return parsed;
      } catch (e) { return seedCatalogOrden(); }
    }
    const invCatalogOrden = loadCatalogOrden();

    function labelItemInv(it){
      return [it.pieza, it.medida].filter(Boolean).join(' ');
    }

    function piezaIconText(it){
      const p = (it && it.pieza) ? String(it.pieza) : '';
      const m = p.replace(/\s+/g, ' ').trim();
      if (!m) return 'PZ';
      const parts = m.split(' ');
      const a = parts[0] ? parts[0].slice(0,1) : '';
      const b = parts[1] ? parts[1].slice(0,1) : '';
      const t = (a + b).toUpperCase();
      return t || m.slice(0,2).toUpperCase();
    }

    function setActivePiezaTile(){
      if (!piezaGrid) return;
      const val = itemSelect ? itemSelect.value : '';
      const tiles = piezaGrid.querySelectorAll('[data-val]');
      Array.prototype.forEach.call(tiles, (t) => {
        const isActive = t.getAttribute('data-val') === String(val);
        if (isActive) t.classList.add('is-active');
        else t.classList.remove('is-active');
      });
    }

    function updatePiezaGridCounts(){
      if (!piezaGrid) return;
      const tiles = piezaGrid.querySelectorAll('[data-val]');
      Array.prototype.forEach.call(tiles, (t) => {
        const idx = parseInt(String(t.getAttribute('data-val') || ''), 10);
        const avail = isFinite(idx) ? availableStockForIndex(idx) : 0;
        const meta = t.querySelector('.pieza-meta');
        const code = t.getAttribute('data-code') || '';
        if (meta) meta.textContent = code ? (code + ' · Disp: ' + String(avail)) : ('Disp: ' + String(avail));
        if (avail <= 0) t.classList.add('is-disabled');
        else t.classList.remove('is-disabled');
      });
    }

    function renderPiezaGrid(){
      if (!piezaGrid) return;
      piezaGrid.innerHTML = '';
      invCatalogOrden.forEach((it, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pieza-tile';
        btn.setAttribute('data-val', String(idx));
        const code = it && it.codigo ? String(it.codigo) : '';
        btn.setAttribute('data-code', code);
        const name = it ? labelItemInv(it) : '';
        btn.innerHTML = `
          <div class="pieza-icon">${piezaIconText(it)}</div>
          <div class="pieza-name">${name || 'Pieza'}</div>
          <div class="pieza-meta">${code}</div>
        `;
        btn.addEventListener('click', () => {
          if (itemSelect) itemSelect.value = String(idx);
          setActivePiezaTile();
          updateExistenciaHint();
        });
        piezaGrid.appendChild(btn);
      });
      setActivePiezaTile();
      updatePiezaGridCounts();
    }

    function populateItemSelect(){
      if (!itemSelect || !tipoPartida) return;
      itemSelect.innerHTML = '<option value="">Seleccionar…</option>';
      const t = tipoPartida.value;
      if (t === 'conjunto') {
        if (itemSelectWrap) itemSelectWrap.style.display = '';
        if (piezaGrid) piezaGrid.style.display = 'none';
        Object.entries(CATALOG_BOM).forEach(([key, def]) => {
          const opt = document.createElement('option');
          opt.value = key;
          opt.textContent = def.nombre;
          itemSelect.appendChild(opt);
        });
        // Default: Conjunto -> Andamio básico 1.0
        itemSelect.value = 'andamio_basico_1';
      } else {
        if (itemSelectWrap) itemSelectWrap.style.display = 'none';
        if (piezaGrid) piezaGrid.style.display = '';
        invCatalogOrden.forEach((it, idx) => {
          const opt = document.createElement('option');
          opt.value = String(idx);
          opt.textContent = labelItemInv(it);
          itemSelect.appendChild(opt);
        });
        // Default: primera pieza
        if (invCatalogOrden.length) itemSelect.value = '0';
        renderPiezaGrid();
      }
      updateExistenciaHint();
    }

    function stockForDescriptor(desc){
      const d = desc.toLowerCase();
      // Plataformas: sumar todas
      if (d.includes('plataforma')) {
        return invCatalogOrden.filter(x => x.categoria === 'plataformas').reduce((s, x) => s + (x.stock||0), 0);
      }
      if (d.includes('rueda')) {
        return invCatalogOrden.filter(x => x.categoria === 'ruedas').reduce((s, x) => s + (x.stock||0), 0);
      }
      if (d.includes('marco 2.0')) {
        const m = invCatalogOrden.find(x => x.pieza.toLowerCase()==='marco' && (x.medida||'').toLowerCase().includes('2.0'));
        return (m && m.stock) ? m.stock : 0;
      }
      if (d.includes('marco 1.5')) {
        const m = invCatalogOrden.find(x => x.pieza.toLowerCase()==='marco' && (x.medida||'').toLowerCase().includes('1.5'));
        return (m && m.stock) ? m.stock : 0;
      }
      if (d.includes('cruceta')) {
        const m = invCatalogOrden.find(x => x.pieza.toLowerCase().includes('cruceta'));
        return (m && m.stock) ? m.stock : 0;
      }
      if (d.includes('base fija')) {
        const m = invCatalogOrden.find(x => x.pieza.toLowerCase().includes('base fija'));
        return (m && m.stock) ? m.stock : 0;
      }
      if (d.includes('abrazadera')) {
        const m = invCatalogOrden.find(x => x.pieza.toLowerCase().includes('abrazadera'));
        return (m && m.stock) ? m.stock : 0;
      }
      // fallback: buscar por substring en pieza/medida
      const f = invCatalogOrden.find(x => `${x.pieza} ${x.medida}`.toLowerCase().includes(d));
      return (f && f.stock) ? f.stock : 0;
    }

    function reservedForDescriptor(desc){
      const it = findItemByDescriptor(desc);
      if (!it) return 0;
      const idx = invCatalogOrden.indexOf(it);
      if (idx < 0) return 0;
      const reserved = getReservedByIndex();
      return reserved[idx] || 0;
    }

    function availableStockForDescriptor(desc){
      const it = findItemByDescriptor(desc);
      if (!it) return 0;
      const idx = invCatalogOrden.indexOf(it);
      if (idx < 0) return 0;
      return availableStockForIndex(idx);
    }

    function findItemByDescriptor(desc){
      const d = (desc||'').toLowerCase();
      if (d.includes('marco 2.0')) {
        return invCatalogOrden.find(x => x.pieza.toLowerCase()==='marco' && (x.medida||'').toLowerCase().includes('2.0')) || null;
      }
      if (d.includes('marco 1.5')) {
        return invCatalogOrden.find(x => x.pieza.toLowerCase()==='marco' && (x.medida||'').toLowerCase().includes('1.5')) || null;
      }
      if (d.includes('cruceta')) {
        return invCatalogOrden.find(x => x.pieza.toLowerCase().includes('cruceta')) || null;
      }
      if (d.includes('plataforma')) {
        // preferir aluminio si existe, sino primera plataforma
        return invCatalogOrden.find(x => x.categoria==='plataformas' && (x.medida||'').toLowerCase().includes('aluminio'))
            || invCatalogOrden.find(x => x.categoria==='plataformas')
            || null;
      }
      if (d.includes('base fija')) {
        return invCatalogOrden.find(x => x.pieza.toLowerCase().includes('base fija')) || null;
      }
      if (d.includes('abrazadera') || d.includes('unión') || d.includes('union')) {
        return invCatalogOrden.find(x => x.pieza.toLowerCase().includes('abrazadera')) || null;
      }
      if (d.includes('rueda')) {
        return invCatalogOrden.find(x => x.categoria==='ruedas') || null;
      }
      return invCatalogOrden.find(x => `${x.pieza} ${x.medida}`.toLowerCase().includes(d)) || null;
    }

    function existenciaConjunto(key){
      const def = CATALOG_BOM[key];
      if (!def) return null;
      let minSets = Infinity;
      def.piezas.forEach(p => {
        const stock = availableStockForDescriptor(p.descripcion || '');
        const req = p.cantidad || 1;
        const sets = Math.floor((stock||0) / req);
        if (sets < minSets) minSets = sets;
      });
      return Number.isFinite(minSets) ? minSets : null;
    }

    function updateExistenciaHint(){
      if (!existenciaHint || !itemSelect || !tipoPartida) return;
      existenciaHint.classList.add('existencia-hint');
      const t = tipoPartida.value;
      const val = itemSelect.value;
      if (!val) { existenciaHint.textContent = 'Existencia: —'; return; }
      if (t === 'conjunto') {
        const sets = existenciaConjunto(val);
        existenciaHint.textContent = `Existencia: ${((sets !== undefined && sets !== null) ? sets : '—')} conjuntos`;
        if (conjuntoQty && Number.isFinite(sets)) {
          conjuntoQty.max = String(sets);
          const cur = parseInt(conjuntoQty.value || '1', 10) || 1;
          if (cur > sets) conjuntoQty.value = String(sets);
        }
      } else {
        const idx = parseInt(val, 10);
        const avail = isFinite(idx) ? availableStockForIndex(idx) : 0;
        existenciaHint.textContent = `Existencia: ${avail} piezas disponibles`;
        if (conjuntoQty && isFinite(avail)) {
          conjuntoQty.max = String(avail);
          const cur = parseInt(conjuntoQty.value || '1', 10) || 1;
          if (cur > avail) conjuntoQty.value = String(avail);
        }
      }
      updatePiezaGridCounts();
    }

    if (tipoPartida) tipoPartida.addEventListener('change', populateItemSelect);
    if (itemSelect) itemSelect.addEventListener('change', () => { updateExistenciaHint(); setActivePiezaTile(); });
    if (conjuntoQty) conjuntoQty.addEventListener('input', updateExistenciaHint);
    // Defaults on load: Conjunto + Andamio básico 1.0
    if (tipoPartida) tipoPartida.value = 'conjunto';
    if (inicioInput) inicioInput.required = true; // Inicio es obligatorio
    populateItemSelect();

    // Alternar tonos entre conjuntos consecutivos
    let conjuntoGroupCount = 0;

    function addConjuntoToPartidas(key, qty) {
      const def = CATALOG_BOM[key];
      if (!def) return;
      const gid = `g_${Date.now()}_${Math.floor(Math.random()*1000)}`;
      const created = [];
      const groupClass = (conjuntoGroupCount++ % 2 === 0) ? 'group-a' : 'group-b';
      def.piezas.forEach(p => {
        const item = findItemByDescriptor(p.descripcion || '');
        const idx = item ? invCatalogOrden.indexOf(item) : -1;
        const tr = addRow({
          tipo: 'conjunto',
          badgeLabel: def.nombre,
          descripcion: `${p.descripcion} (de ${def.nombre})`,
          sets: (qty || 1),
          unidades: (p.cantidad || 1),
          tarifa: (item && item.tarifa) ? item.tarifa : 0,
          unidad: 'mes'
        });
        if (tr) {
          tr.dataset.groupId = gid;
          if (idx >= 0) tr.dataset.itemIndex = String(idx);
          tr.classList.add(groupClass);
          created.push(tr);
        }
      });
      if (created.length > 1) {
        const first = created[0];
        const td1 = first.querySelector('td:nth-child(1)');
        const td2 = first.querySelector('td:nth-child(2)');
        if (td1) td1.setAttribute('rowspan', String(created.length));
        if (td2) td2.setAttribute('rowspan', String(created.length));
        // remove first two columns from subsequent rows
        for (let i = 1; i < created.length; i++) {
          const r = created[i];
          if (r.children[0]) r.removeChild(r.children[0]);
          if (r.children[0]) r.removeChild(r.children[0]);
        }
      }
    }

    if (agregarItemBtn) {
      agregarItemBtn.addEventListener('click', () => {
        const t = (tipoPartida && tipoPartida.value) ? tipoPartida.value : 'conjunto';
        const qty = parseInt((conjuntoQty && conjuntoQty.value) ? conjuntoQty.value : '1', 10) || 1;
        const sel = (itemSelect && itemSelect.value) ? itemSelect.value : '';
        if (!sel) { alert('Selecciona un elemento'); return; }
        if (t === 'conjunto') {
          const setsDisp = existenciaConjunto(sel);
          if (Number.isFinite(setsDisp) && qty > setsDisp) {
            alert(`No puedes agregar ${qty} conjuntos; solo hay ${setsDisp} en existencia.`);
            return;
          }
          addConjuntoToPartidas(sel, qty);
        } else {
          const it = invCatalogOrden[parseInt(sel, 10)];
          if (!it) return;
          const idx = parseInt(sel, 10);
          const available = isFinite(idx) ? availableStockForIndex(idx) : 0;
          if (qty > available) {
            alert(`No puedes agregar ${qty} piezas; solo hay ${available} disponibles.`);
            return;
          }
          const tr = addRow({
            tipo: 'pieza',
            descripcion: labelItemInv(it),
            sets: qty,
            unidades: 1,
            tarifa: it.tarifa || 0,
            unidad: 'mes'
          });
          if (tr) tr.dataset.itemIndex = String(parseInt(sel, 10));
        }
      });
    }

    // =====================
    // Transporte estimado
    // =====================
    const WAREHOUSE = { lat: 18.00302, lon: -92.95144 }; // Almacén "Andamios del Norte"

    function toRad(d){ return d * Math.PI / 180; }
    function haversineKm(aLat, aLon, bLat, bLon){
      const R = 6371; // km
      const dLat = toRad(bLat - aLat);
      const dLon = toRad(bLon - aLon);
      const sLat = Math.sin(dLat/2);
      const sLon = Math.sin(dLon/2);
      const s1 = (sLat * sLat) + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * (sLon * sLon);
      const c = 2 * Math.atan2(Math.sqrt(s1), Math.sqrt(1 - s1));
      return R * c;
    }

    function countTotalItems(){
      let total = 0;
      ((partidasBody && partidasBody.querySelectorAll('tr')) ? partidasBody.querySelectorAll('tr') : []).forEach(tr => {
        // sets fallback al header del grupo, igual que en recalc
        const setsEl = tr.querySelector('.sets');
        let sets = parseFloat(setsEl ? setsEl.value : '');
        if (!Number.isFinite(sets) || sets === 0) {
          const gid = tr.dataset.groupId;
          if (gid) {
            const headerSets = partidasBody.querySelector(`tr[data-group-id="${gid}"] .sets`);
            sets = parseFloat(headerSets ? headerSets.value : '0');
          } else { sets = 0; }
        }
        const unitsEl = tr.querySelector('.units');
        const units = parseFloat(unitsEl ? unitsEl.value : '0');
        total += (sets * units);
      });
      return total;
    }

    function estimateTransport(){
      // Parámetros de tarificación
      const KM_RATE = 12; // $/km gasolina
      const BASE_TRIP = 150; // base por viaje
      const PER_ITEM = 2.5; // manejo por pieza/conjunto
      const PERSON_RATE = 120; // $/hora por persona
      const AVG_SPEED = 35; // km/h

      const lat = parseFloat((latInput && latInput.value) ? latInput.value : '');
      const lon = parseFloat((lonInput && lonInput.value) ? lonInput.value : '');
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return 0;
      const dist = haversineKm(WAREHOUSE.lat, WAREHOUSE.lon, lat, lon);
      const items = countTotalItems();
      const trip = BASE_TRIP + KM_RATE * (dist * 2); // ida y vuelta
      const handling = PER_ITEM * items;
      const travelHours = (dist * 2) / AVG_SPEED; // round-trip
      const loadingHours = Math.min(2, Math.max(0.5, items * 0.02)); // 1.2 min por item, tope 2h
      const labor = (travelHours + loadingHours) * (PERSON_RATE * 2); // 2 personas
      return Math.max(0, Math.round((trip + handling + labor) * 100) / 100);
    }

    function maybeAutoSetTransport(){
      if (!transporteInput) return;
      // Si el usuario ya lo modificó manualmente, no sobrescribir
      if (transporteInput.dataset.manual === '1') return;
      const est = estimateTransport();
      if (est >= 0) {
        transporteInput.value = String(est.toFixed(2));
        formatTransport();
        recalc();
      }
    }

    // Reactualizar estimado cuando cambien ubicación, partidas o fechas (por si días cambian tiempos)
    if (latInput) latInput.addEventListener('change', maybeAutoSetTransport);
    if (lonInput) lonInput.addEventListener('change', maybeAutoSetTransport);
    if (partidasBody) partidasBody.addEventListener('input', maybeAutoSetTransport);
    if (inicioInput) inicioInput.addEventListener('change', maybeAutoSetTransport);
    if (finInput) finInput.addEventListener('change', maybeAutoSetTransport);
    // Inicial
    maybeAutoSetTransport();

    // Folio consecutivo de orden
    function nextOrderFolio() {
      const k = 'orden_folio_seq';
      let n = parseInt(localStorage.getItem(k) || '0', 10);
      n = isNaN(n) ? 0 : n;
      n += 1;
      localStorage.setItem(k, String(n));
      return `OR-${String(n).padStart(6, '0')}`;
    }

    // Previsualizar folio al cargar si está vacío
    if (orderIdInput && !orderIdInput.value) {
      const preview = parseInt(localStorage.getItem('orden_folio_seq') || '0', 10) + 1;
      orderIdInput.value = `OR-${String(preview).padStart(6, '0')}`;
    }

    // Actualizar mapa cuando cambien lat/lon
    // Leaflet Map with click-to-set and reverse geocoding
    let leafletMap = null;
    let leafletMarker = null;
    function reverseGeocode(lat, lon){
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
        return fetch(url, { headers: { 'Accept': 'application/json' } })
          .then(resp => { if (!resp.ok) return null; return resp.json(); })
          .then(data => (data && data.display_name) ? data.display_name : '')
          .catch(() => '');
      } catch (e) {
        return Promise.resolve('');
      }
    }
    function initLeaflet(){
      if (!mapContainer || typeof L === 'undefined') return;
      leafletMap = L.map(mapContainer).setView([18.00302, -92.95144], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(leafletMap);
      leafletMap.on('click', (e) => {
        const lat = e && e.latlng ? e.latlng.lat : null;
        const lng = e && e.latlng ? e.latlng.lng : null;
        if (lat === null || lng === null) return;
        if (latInput) latInput.value = lat.toFixed(6);
        if (lonInput) lonInput.value = lng.toFixed(6);
        if (leafletMarker) leafletMap.removeLayer(leafletMarker);
        leafletMarker = L.marker([lat, lng]).addTo(leafletMap);
        // Autocompletar dirección
        reverseGeocode(lat, lng).then((addr) => {
          const ubic = document.getElementById('ubicacion');
          if (ubic && addr) ubic.value = addr;
          // Recalcular transporte estimado al seleccionar en el mapa
          try { maybeAutoSetTransport(); } catch (err) {}
        });
      });
    }
    initLeaflet();

    // Utilidades de fechas y cortes de facturación (cada 30 días)
    function parseDate(val){
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    }

    function addDays(d, n){ const dd = new Date(d); dd.setDate(dd.getDate() + n); return dd; }
    function toISODate(d){ return d.toISOString().slice(0,10); }
    function daysBetween(a, b){
      const ms = (b.getTime() - a.getTime());
      return Math.floor(ms / (1000*60*60*24));
    }

    function computeServiceDays(){
      const i = parseDate((inicioInput && inicioInput.value) ? inicioInput.value : null);
      const f = parseDate((finInput && finInput.value) ? finInput.value : null);
      if (!i || !f) return 1; // periodo abierto o faltante -> 1 día por defecto
      if (f < i) return 1;
      // inclusivo: cuenta el día de inicio también
      const diff = daysBetween(i, f) + 1;
      return Math.max(1, diff);
    }

    function buildCortes(inicio, fin){
      const cortes = [];
      if (!inicio || !fin) return cortes;
      let start = new Date(inicio);
      let end = new Date(fin);
      if (end <= start) return cortes;
      // Genera tramos de máximo 30 días
      let tramoInicio = new Date(start);
      while (tramoInicio < end) {
        const tramoFinTent = addDays(tramoInicio, 30);
        const tramoFin = (tramoFinTent < end) ? tramoFinTent : end;
        cortes.push({ inicio: toISODate(tramoInicio), fin: toISODate(tramoFin) });
        tramoInicio = tramoFin;
      }
      return cortes;
    }

    function refreshPeriodoAviso(){
      if (!periodoAviso) return;
      const i = parseDate((inicioInput && inicioInput.value) ? inicioInput.value : null);
      const f = parseDate((finInput && finInput.value) ? finInput.value : null);
      if (!i) {
        periodoAviso.textContent = 'La fecha de inicio es obligatoria. La fecha de fin puede quedar abierta. Si el periodo supera 30 días se generará corte(s) para facturación.';
        return;
      }
      if (!f) {
        periodoAviso.textContent = 'Periodo abierto. Se facturará por cortes de 30 días mientras la orden siga activa.';
        return;
      }
      const diff = daysBetween(i, f);
      if (diff <= 30) {
        periodoAviso.textContent = `Periodo de ${diff} día(s). No requiere cortes adicionales.`;
      } else {
        const cortes = buildCortes(i, f);
        periodoAviso.textContent = `Periodo de ${diff} días. Se generarán ${cortes.length} corte(s) de facturación (máx 30 días por corte).`;
      }
    }

    function updateDaysFromPeriodo(){
      const d = computeServiceDays();
      const daysInputs = (partidasBody && partidasBody.querySelectorAll) ? partidasBody.querySelectorAll('.days') : [];
      Array.prototype.forEach.call(daysInputs, (inp) => { inp.value = String(d); });
      recalc();
    }
    if (inicioInput) inicioInput.addEventListener('change', () => { refreshPeriodoAviso(); updateDaysFromPeriodo(); });
    if (finInput) finInput.addEventListener('change', () => { refreshPeriodoAviso(); updateDaysFromPeriodo(); });
    refreshPeriodoAviso();
    updateDaysFromPeriodo();

    ordenForm.addEventListener('submit', (e) => {
      e.preventDefault();
      // Validar inicio requerido
      if (!inicioInput || !inicioInput.value) {
        alert('La fecha de inicio es obligatoria para guardar la orden.');
        try { inicioInput && inicioInput.focus && inicioInput.focus(); } catch (err) {}
        return;
      }
      // Asegurar folio definitivo al guardar
      if (orderIdInput) {
        const seqStored = parseInt(localStorage.getItem('orden_folio_seq') || '0', 10);
        const expected = `OR-${String(seqStored + 1).padStart(6, '0')}`;
        if (orderIdInput.value !== expected) {
          orderIdInput.value = nextOrderFolio();
        } else {
          localStorage.setItem('orden_folio_seq', String(seqStored + 1));
        }
      }
      const data = {
        orderId: orderIdInput ? orderIdInput.value : undefined,
        cliente: (ordenForm && ordenForm.cliente) ? ordenForm.cliente.value : undefined,
        obra: (ordenForm && ordenForm.obra) ? ordenForm.obra.value : undefined,
        ubicacion: (ordenForm && ordenForm.ubicacion) ? ordenForm.ubicacion.value : undefined,
        contactoNombre: (ordenForm && ordenForm.contactoNombre) ? ordenForm.contactoNombre.value : undefined,
        contactoTelefono: (ordenForm && ordenForm.contactoTelefono) ? ordenForm.contactoTelefono.value : undefined,
        latitud: (ordenForm && ordenForm.latitud) ? ordenForm.latitud.value : undefined,
        longitud: (ordenForm && ordenForm.longitud) ? ordenForm.longitud.value : undefined,
        inicio: (ordenForm && ordenForm.inicio) ? ordenForm.inicio.value : undefined,
        fin: (ordenForm && ordenForm.fin) ? ordenForm.fin.value : undefined,
        periodicidad: (ordenForm && ordenForm.periodicidad) ? ordenForm.periodicidad.value : undefined,
        deposito: parseFloat(((ordenForm && ordenForm.deposito) ? ordenForm.deposito.value : 0) || 0),
        tipoPagoDeposito: (ordenForm && ordenForm.tipoPagoDeposito) ? ordenForm.tipoPagoDeposito.value : undefined,
        observaciones: (ordenForm && ordenForm.observaciones) ? ordenForm.observaciones.value : undefined,
        partidas: Array.from((partidasBody && partidasBody.querySelectorAll) ? partidasBody.querySelectorAll('tr') : []).map(tr => ({
          tipo: tr.dataset.tipo,
          descripcion: (tr.querySelector('.desc') ? tr.querySelector('.desc').value : undefined),
          sets: parseFloat((tr.querySelector('.sets') ? tr.querySelector('.sets').value : 0) || 0),
          unidades: parseFloat((tr.querySelector('.units') ? tr.querySelector('.units').value : 0) || 0),
          cantidad: (parseFloat((tr.querySelector('.sets') ? tr.querySelector('.sets').value : 0) || 0) * parseFloat((tr.querySelector('.units') ? tr.querySelector('.units').value : 0) || 0)),
          dias: parseFloat((tr.querySelector('.days') ? tr.querySelector('.days').value : 1) || 1),
          tarifa: parseMoney((tr.querySelector('.rate') ? tr.querySelector('.rate').value : 0) || 0)
        })),
        cortes: (() => {
          const i = parseDate((ordenForm && ordenForm.inicio) ? ordenForm.inicio.value : null);
          const f = parseDate((ordenForm && ordenForm.fin) ? ordenForm.fin.value : null);
          if (!i || !f) return [];
          return buildCortes(i, f);
        })(),
        totales: {
          subtotal: (subtotalEl && subtotalEl.textContent) ? subtotalEl.textContent : undefined,
          transporte: (transporteInput && transporteInput.value) ? transporteInput.value : undefined,
          iva: (ivaEl && ivaEl.textContent) ? ivaEl.textContent : undefined,
          total: (totalEl && totalEl.textContent) ? totalEl.textContent : undefined
        }
      };
      const now = new Date().toISOString();
      const key = `orden_${now}`;
      if (!storageAvailable()) {
        alert('No se pudo guardar la orden en este dispositivo.\n\nCausa probable: Safari en modo privado o almacenamiento deshabilitado/lleno.\n\nSugerencia: desactiva Navegación privada, cierra/reabre Safari y vuelve a intentar.');
        return;
      }
      const saveRes = trySetLocal(key, JSON.stringify(data));
      if (!saveRes.ok) {
        const msg = (saveRes.error && saveRes.error.message) ? saveRes.error.message : String(saveRes.error || 'Error');
        alert('No se pudo guardar la orden en este dispositivo.\n\nDetalle: ' + msg + '\n\nSugerencia: desactiva Navegación privada o libera espacio y vuelve a intentar.');
        return;
      }
      alert('Orden guardada (simulada). Revisa la consola para ver el JSON.');
      console.log('Orden guardada:', key, data);

      // Limpiar formulario después de guardar
      try {
        ordenForm.reset();
        // Limpiar filas de partidas
        if (partidasBody) partidasBody.innerHTML = '';
        // Quitar marcador del mapa si existe
        if (leafletMarker && leafletMap) { leafletMap.removeLayer(leafletMarker); leafletMarker = null; }
        // Reset de transporte
        if (transporteInput) { transporteInput.dataset.manual = ''; transporteInput.value = '$ 0.00'; formatTransport(); }
        // Siguiente folio en preview
        if (orderIdInput) {
          const preview = parseInt(localStorage.getItem('orden_folio_seq') || '0', 10) + 1;
          orderIdInput.value = `OR-${String(preview).padStart(6, '0')}`;
        }
        // Defaults: tipo/elemento y días
        if (tipoPartida) tipoPartida.value = 'conjunto';
        populateItemSelect();
        updateExistenciaHint();
        updateDaysFromPeriodo();
        // Recalcular totales
        recalc();
      } catch (err) {}
    });
  }

  // =====================
  // recepcion.html (inspección)
  // =====================
  const recepForm = document.getElementById('recepForm');
  if (recepForm) {
    const itemsBody = document.getElementById('itemsBody');
    const addItemBtn = document.getElementById('addItem');
    const tOk = document.getElementById('tOk');
    const tDanio = document.getElementById('tDanio');
    const tPerdida = document.getElementById('tPerdida');
    const tSust = document.getElementById('tSust');
    const tCargo = document.getElementById('tCargo');

    function money(n){ return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n||0); }

    function recalc(){
      let ok=0, danio=0, perdida=0, sust=0, cargo=0;
      const rows = (itemsBody && itemsBody.querySelectorAll) ? itemsBody.querySelectorAll('tr') : [];
      Array.prototype.forEach.call(rows, tr => {
        const estadoEl = tr.querySelector('.estado');
        const cargoEl = tr.querySelector('.cargo');
        const estado = estadoEl ? estadoEl.value : '';
        const c = parseFloat(cargoEl ? cargoEl.value : '') || 0;
        cargo += c;
        if (estado === 'ok') ok++;
        else if (estado === 'danio') danio++;
        else if (estado === 'perdida') perdida++;
        else if (estado === 'sustitucion') sust++;
      });
      if (tOk) tOk.textContent = ok;
      if (tDanio) tDanio.textContent = danio;
      if (tPerdida) tPerdida.textContent = perdida;
      if (tSust) tSust.textContent = sust;
      if (tCargo) tCargo.textContent = money(cargo);
    }

    function removeRow(btn){ btn.closest('tr').remove(); recalc(); }

    function addRow(data={}){
      if (!itemsBody) return;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input class="serie" placeholder="Escanear QR / escribir serie" value="${data.serie||''}" /></td>
        <td><input class="tipo" placeholder="Tipo de pieza (marco, cruceta, etc.)" value="${data.tipo||''}" /></td>
        <td>
          <select class="estado">
            <option value="ok">OK</option>
            <option value="danio">Daño</option>
            <option value="perdida">Pérdida</option>
            <option value="sustitucion">Sustitución</option>
          </select>
        </td>
        <td><input class="notas" placeholder="Notas de inspección" value="${data.notas||''}" /></td>
        <td><input type="number" min="0" step="0.01" class="cargo" placeholder="0.00" value="${data.cargo||''}" /></td>
        <td><input class="evidencia" placeholder="URL de evidencia (foto)" value="${data.evidencia||''}" /></td>
        <td><button type="button" class="btn" data-action="remove">Eliminar</button></td>
      `;
      itemsBody.appendChild(tr);
      tr.querySelectorAll('input, select').forEach(el => el.addEventListener('input', recalc));
      const removeBtn = tr.querySelector('[data-action="remove"]');
      if (removeBtn) removeBtn.addEventListener('click', () => removeRow(removeBtn));
      recalc();
    }

    if (addItemBtn) addItemBtn.addEventListener('click', () => addRow());
    addRow();

    recepForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const payload = {
        ordenId: (recepForm && recepForm.ordenId) ? recepForm.ordenId.value : undefined,
        fecha: (recepForm && recepForm.fecha) ? recepForm.fecha.value : undefined,
        almacen: (recepForm && recepForm.almacen) ? recepForm.almacen.value : undefined,
        inspector: (recepForm && recepForm.inspector) ? recepForm.inspector.value : undefined,
        items: Array.from((itemsBody && itemsBody.querySelectorAll) ? itemsBody.querySelectorAll('tr') : []).map(tr => ({
          serie: (tr.querySelector('.serie') ? tr.querySelector('.serie').value : undefined),
          tipo: (tr.querySelector('.tipo') ? tr.querySelector('.tipo').value : undefined),
          estado: (tr.querySelector('.estado') ? tr.querySelector('.estado').value : undefined),
          notas: (tr.querySelector('.notas') ? tr.querySelector('.notas').value : undefined),
          cargo: parseFloat((tr.querySelector('.cargo') ? tr.querySelector('.cargo').value : 0) || 0),
          evidencia: (tr.querySelector('.evidencia') ? tr.querySelector('.evidencia').value : undefined)
        })),
        resumen: {
          ok: parseInt(((document.getElementById('tOk') && document.getElementById('tOk').textContent) || '0'), 10),
          danio: parseInt(((document.getElementById('tDanio') && document.getElementById('tDanio').textContent) || '0'), 10),
          perdida: parseInt(((document.getElementById('tPerdida') && document.getElementById('tPerdida').textContent) || '0'), 10),
          sustitucion: parseInt(((document.getElementById('tSust') && document.getElementById('tSust').textContent) || '0'), 10),
          cargos: (document.getElementById('tCargo') && document.getElementById('tCargo').textContent) ? document.getElementById('tCargo').textContent : undefined
        },
        observaciones: (recepForm && recepForm.observ) ? recepForm.observ.value : undefined,
        firma: (recepForm && recepForm.firma) ? recepForm.firma.value : undefined
      };
      const key = `recepcion_${new Date().toISOString()}`;
      if (!storageAvailable()) {
        alert('No se pudo guardar la recepción en este dispositivo.\n\nCausa probable: Safari en modo privado o almacenamiento deshabilitado/lleno.');
        return;
      }
      const saveRes = trySetLocal(key, JSON.stringify(payload));
      if (!saveRes.ok) {
        const msg = (saveRes.error && saveRes.error.message) ? saveRes.error.message : String(saveRes.error || 'Error');
        alert('No se pudo guardar la recepción en este dispositivo.\n\nDetalle: ' + msg);
        return;
      }
      alert('Recepción guardada (simulada). Revisa la consola para ver el JSON.');
      console.log('Recepción guardada:', key, payload);
    });
  }
});

