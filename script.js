// Utilidades comunes
function setYear() {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

document.addEventListener('DOMContentLoaded', () => {
  setYear();

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
    // Datos simulados
    const renta = document.getElementById('metricRenta');
    const clientes = document.getElementById('metricClientes');
    const manto = document.getElementById('metricManto');
    const flujo = document.getElementById('metricFlujo');
    if (renta) renta.textContent = '245';
    if (clientes) clientes.textContent = '18';
    if (manto) manto.textContent = '7';
    if (flujo) flujo.textContent = '$ 1.2M';
  }

  // =====================
  // rentlist.html (lista de órdenes locales)
  // =====================
  const ordersBody = document.getElementById('ordersBody');
  if (ordersBody) {
    function rl_money(n){
      try { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n)||0); } catch(e){ return '$ 0.00'; }
    }
    function rl_safeParse(s){ try { return JSON.parse(s); } catch { return null; } }
    function rl_readAll(){
      const keys = Object.keys(localStorage).filter(k => k.startsWith('orden_')).sort();
      return keys.map(k => ({ key: k, data: rl_safeParse(localStorage.getItem(k)) })).filter(x => !!x.data);
    }
    function rl_state(o){ return o?.fin ? 'Cerrada' : 'Abierta'; }
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
        const total = data?.totales?.total || data?.totales?.subtotal || '';
        tr.innerHTML = `
          <td>${data?.orderId || '—'}</td>
          <td>${rl_escape(data?.cliente || '—')}</td>
          <td>${rl_escape(data?.obra || '—')}</td>
          <td>${data?.inicio || '—'}</td>
          <td>${data?.fin || '—'}</td>
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
          w.document.write('<pre style="white-space:pre-wrap; word-break:break-word; padding:16px;">'+rl_escape(JSON.stringify(data, null, 2))+'</pre>');
          w.document.close();
        }
      } else if (action === 'download'){
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = (data?.orderId || key)+'.json';
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
      } else if (action === 'delete'){
        if (confirm('¿Eliminar esta orden?')){
          try { localStorage.removeItem(key); } catch {}
          rl_render();
        }
      }
    }

    document.addEventListener('click', rl_handle);
    const exportAllBtn = document.getElementById('exportAll');
    if (exportAllBtn) exportAllBtn.addEventListener('click', () => {
      const rows = rl_readAll();
      const payload = rows.map(r => ({ key: r.key, ...r.data }));
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
      try { localStorage.setItem('inv_catalog', JSON.stringify(seed)); } catch {}
      return seed;
    }

    function loadCatalog(){
      try {
        const raw = localStorage.getItem('inv_catalog');
        if (!raw) return seedCatalog();
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return seedCatalog();
        return parsed;
      } catch { return seedCatalog(); }
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
          <td class="hide-sm">${(item.peso??'')}${item.peso? ' kg':''}</td>
          <td>${moneyInv(item.tarifa)}</td>
          <td>${item.stock??0}</td>
        `;
        invBody.appendChild(tr);
      });
    }

    const catalog = loadCatalog();

    function applyFilters(){
      const q = (invSearch?.value||'').toLowerCase();
      const cat = invCategoria?.value || '';
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
      const email = (document.getElementById('email') || {}).value?.trim();
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
        let sets = parseFloat(tr.querySelector('.sets')?.value || '');
        if (!Number.isFinite(sets) || sets === 0) {
          const gid = tr.dataset.groupId;
          if (gid) {
            const headerSets = partidasBody.querySelector(`tr[data-group-id="${gid}"] .sets`);
            sets = parseFloat(headerSets?.value || '0');
          } else {
            sets = 0;
          }
        }
        const units = parseFloat(tr.querySelector('.units')?.value) || 0;
        const rate = parseMoney(tr.querySelector('.rate')?.value || '0') || 0;
        const days = parseFloat(tr.querySelector('.days')?.value) || 1;
        const imp = sets * units * rate * days;
        const impCell = tr.querySelector('.importe');
        if (impCell) impCell.textContent = money(imp);
        subtotal += imp;
      });
      const transporte = parseMoney(transporteInput?.value || '0') || 0;
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
          let rs1 = parseInt(td1?.getAttribute('rowspan')||'1', 10);
          let rs2 = parseInt(td2?.getAttribute('rowspan')||'1', 10);
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
      const total = parseMoney(totalEl?.textContent || '0');
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
      try { localStorage.setItem('inv_catalog', JSON.stringify(seed)); } catch {}
      return seed;
    }
    function loadCatalogOrden(){
      try {
        const raw = localStorage.getItem('inv_catalog');
        if (!raw) return seedCatalogOrden();
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return seedCatalogOrden();
        return parsed;
      } catch { return seedCatalogOrden(); }
    }
    const invCatalogOrden = loadCatalogOrden();

    function labelItemInv(it){
      return [it.pieza, it.medida].filter(Boolean).join(' ');
    }

    function populateItemSelect(){
      if (!itemSelect || !tipoPartida) return;
      itemSelect.innerHTML = '<option value="">Seleccionar…</option>';
      const t = tipoPartida.value;
      if (t === 'conjunto') {
        Object.entries(CATALOG_BOM).forEach(([key, def]) => {
          const opt = document.createElement('option');
          opt.value = key;
          opt.textContent = def.nombre;
          itemSelect.appendChild(opt);
        });
        // Default: Conjunto -> Andamio básico 1.0
        itemSelect.value = 'andamio_basico_1';
      } else {
        invCatalogOrden.forEach((it, idx) => {
          const opt = document.createElement('option');
          opt.value = String(idx);
          opt.textContent = labelItemInv(it);
          itemSelect.appendChild(opt);
        });
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
        return m?.stock || 0;
      }
      if (d.includes('marco 1.5')) {
        const m = invCatalogOrden.find(x => x.pieza.toLowerCase()==='marco' && (x.medida||'').toLowerCase().includes('1.5'));
        return m?.stock || 0;
      }
      if (d.includes('cruceta')) {
        const m = invCatalogOrden.find(x => x.pieza.toLowerCase().includes('cruceta'));
        return m?.stock || 0;
      }
      if (d.includes('base fija')) {
        const m = invCatalogOrden.find(x => x.pieza.toLowerCase().includes('base fija'));
        return m?.stock || 0;
      }
      if (d.includes('abrazadera')) {
        const m = invCatalogOrden.find(x => x.pieza.toLowerCase().includes('abrazadera'));
        return m?.stock || 0;
      }
      // fallback: buscar por substring en pieza/medida
      const f = invCatalogOrden.find(x => `${x.pieza} ${x.medida}`.toLowerCase().includes(d));
      return f?.stock || 0;
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
        const stock = stockForDescriptor(p.descripcion || '');
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
        existenciaHint.textContent = `Existencia: ${sets ?? '—'} conjuntos`;
        if (conjuntoQty && Number.isFinite(sets)) {
          conjuntoQty.max = String(sets);
          const cur = parseInt(conjuntoQty.value || '1', 10) || 1;
          if (cur > sets) conjuntoQty.value = String(sets);
        }
      } else {
        const it = invCatalogOrden[parseInt(val, 10)];
        const stock = it?.stock ?? '—';
        existenciaHint.textContent = `Existencia: ${stock} piezas`;
        if (conjuntoQty && Number.isFinite(stock)) {
          conjuntoQty.max = String(stock);
          const cur = parseInt(conjuntoQty.value || '1', 10) || 1;
          if (cur > stock) conjuntoQty.value = String(stock);
        }
      }
    }

    if (tipoPartida) tipoPartida.addEventListener('change', populateItemSelect);
    if (itemSelect) itemSelect.addEventListener('change', updateExistenciaHint);
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
        const tr = addRow({
          tipo: 'conjunto',
          badgeLabel: def.nombre,
          descripcion: `${p.descripcion} (de ${def.nombre})`,
          sets: (qty || 1),
          unidades: (p.cantidad || 1),
          tarifa: item?.tarifa || 0,
          unidad: 'mes'
        });
        if (tr) {
          tr.dataset.groupId = gid;
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
        const t = tipoPartida?.value || 'conjunto';
        const qty = parseInt(conjuntoQty?.value || '1', 10) || 1;
        const sel = itemSelect?.value || '';
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
          const stock = parseInt(it.stock || 0, 10) || 0;
          if (qty > stock) {
            alert(`No puedes agregar ${qty} piezas; solo hay ${stock} en existencia.`);
            return;
          }
          addRow({
            tipo: 'pieza',
            descripcion: labelItemInv(it),
            sets: qty,
            unidades: 1,
            tarifa: it.tarifa || 0,
            unidad: 'mes'
          });
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
      const s1 = Math.sin(dLat/2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon/2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(s1), Math.sqrt(1 - s1));
      return R * c;
    }

    function countTotalItems(){
      let total = 0;
      (partidasBody?.querySelectorAll('tr') || []).forEach(tr => {
        // sets fallback al header del grupo, igual que en recalc
        let sets = parseFloat(tr.querySelector('.sets')?.value || '');
        if (!Number.isFinite(sets) || sets === 0) {
          const gid = tr.dataset.groupId;
          if (gid) {
            const headerSets = partidasBody.querySelector(`tr[data-group-id="${gid}"] .sets`);
            sets = parseFloat(headerSets?.value || '0');
          } else { sets = 0; }
        }
        const units = parseFloat(tr.querySelector('.units')?.value || '0');
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

      const lat = parseFloat(latInput?.value || '');
      const lon = parseFloat(lonInput?.value || '');
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
    async function reverseGeocode(lat, lon){
      try {
        const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1` , { headers: { 'Accept': 'application/json' } });
        if (!resp.ok) return null;
        const data = await resp.json();
        return data.display_name || '';
      } catch { return ''; }
    }
    function initLeaflet(){
      if (!mapContainer || typeof L === 'undefined') return;
      leafletMap = L.map(mapContainer).setView([18.00302, -92.95144], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(leafletMap);
      leafletMap.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        if (latInput) latInput.value = lat.toFixed(6);
        if (lonInput) lonInput.value = lng.toFixed(6);
        if (leafletMarker) leafletMap.removeLayer(leafletMarker);
        leafletMarker = L.marker([lat, lng]).addTo(leafletMap);
        // Autocompletar dirección
        const addr = await reverseGeocode(lat, lng);
        const ubic = document.getElementById('ubicacion');
        if (ubic && addr) ubic.value = addr;
        // Recalcular transporte estimado al seleccionar en el mapa
        try { maybeAutoSetTransport(); } catch {}
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
      const i = parseDate(inicioInput?.value);
      const f = parseDate(finInput?.value);
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
      const i = parseDate(inicioInput?.value);
      const f = parseDate(finInput?.value);
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
      (partidasBody?.querySelectorAll('.days') || []).forEach(inp => {
        inp.value = String(d);
      });
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
        try { inicioInput?.focus(); } catch {}
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
        orderId: orderIdInput?.value,
        cliente: ordenForm.cliente?.value,
        obra: ordenForm.obra?.value,
        ubicacion: ordenForm.ubicacion?.value,
        contactoNombre: ordenForm.contactoNombre?.value,
        contactoTelefono: ordenForm.contactoTelefono?.value,
        latitud: ordenForm.latitud?.value,
        longitud: ordenForm.longitud?.value,
        inicio: ordenForm.inicio?.value,
        fin: ordenForm.fin?.value,
        periodicidad: ordenForm.periodicidad?.value,
        deposito: parseFloat(ordenForm.deposito?.value || 0),
        tipoPagoDeposito: ordenForm.tipoPagoDeposito?.value,
        observaciones: ordenForm.observaciones?.value,
        partidas: Array.from(partidasBody?.querySelectorAll('tr') || []).map(tr => ({
          tipo: tr.dataset.tipo,
          descripcion: tr.querySelector('.desc')?.value,
          sets: parseFloat(tr.querySelector('.sets')?.value || 0),
          unidades: parseFloat(tr.querySelector('.units')?.value || 0),
          cantidad: (parseFloat(tr.querySelector('.sets')?.value || 0) * parseFloat(tr.querySelector('.units')?.value || 0)),
          dias: parseFloat(tr.querySelector('.days')?.value || 1),
          tarifa: parseMoney(tr.querySelector('.rate')?.value || 0)
        })),
        cortes: (() => {
          const i = parseDate(ordenForm.inicio?.value);
          const f = parseDate(ordenForm.fin?.value);
          if (!i || !f) return [];
          return buildCortes(i, f);
        })(),
        totales: {
          subtotal: subtotalEl?.textContent,
          transporte: transporteInput?.value,
          iva: ivaEl?.textContent,
          total: totalEl?.textContent
        }
      };
      const now = new Date().toISOString();
      const key = `orden_${now}`;
      try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
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
      } catch {}
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
      (itemsBody?.querySelectorAll('tr') || []).forEach(tr => {
        const estado = tr.querySelector('.estado')?.value;
        const c = parseFloat(tr.querySelector('.cargo')?.value) || 0;
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
        ordenId: recepForm.ordenId?.value,
        fecha: recepForm.fecha?.value,
        almacen: recepForm.almacen?.value,
        inspector: recepForm.inspector?.value,
        items: Array.from(itemsBody?.querySelectorAll('tr') || []).map(tr => ({
          serie: tr.querySelector('.serie')?.value,
          tipo: tr.querySelector('.tipo')?.value,
          estado: tr.querySelector('.estado')?.value,
          notas: tr.querySelector('.notas')?.value,
          cargo: parseFloat(tr.querySelector('.cargo')?.value || 0),
          evidencia: tr.querySelector('.evidencia')?.value
        })),
        resumen: {
          ok: parseInt((document.getElementById('tOk')?.textContent)||'0', 10),
          danio: parseInt((document.getElementById('tDanio')?.textContent)||'0', 10),
          perdida: parseInt((document.getElementById('tPerdida')?.textContent)||'0', 10),
          sustitucion: parseInt((document.getElementById('tSust')?.textContent)||'0', 10),
          cargos: document.getElementById('tCargo')?.textContent
        },
        observaciones: recepForm.observ?.value,
        firma: recepForm.firma?.value
      };
      const key = `recepcion_${new Date().toISOString()}`;
      try { localStorage.setItem(key, JSON.stringify(payload)); } catch {}
      alert('Recepción guardada (simulada). Revisa la consola para ver el JSON.');
      console.log('Recepción guardada:', key, payload);
    });
  }
});

