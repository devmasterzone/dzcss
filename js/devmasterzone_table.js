(function(){
  const table = document.getElementById('demo-table');
  if(!table) return console.warn('demo-table not found');

  const tbody = table.tBodies[0];
  const rows = Array.from(tbody.querySelectorAll('tr'));
  const search = document.getElementById('tbl-search');
  const pageSizeSelect = document.getElementById('tbl-pagesize');
  const pageButtonsWrap = document.getElementById('page-buttons');
  const info = document.getElementById('table-info');
  const selectAll = document.getElementById('selectAll');
  const variantBtns = document.querySelectorAll('.variant-btn');
  const exportBtn = document.getElementById('exportCsv');
  const btnPrev = document.querySelector('[data-action="prev"]');
  const btnNext = document.querySelector('[data-action="next"]');

  // defensive checks
  if(!tbody || !pageButtonsWrap || !info) {
    console.warn('Table script: required nodes missing', {tbody, pageButtonsWrap, info});
  }

  // State
  let data = rows.map(r => ({
    id: r.dataset.id,
    el: r,
    name: (r.querySelector('.cell-name')?.textContent || '').trim(),
    role: (r.querySelector('.cell-role')?.textContent || '').trim(),
    status: (r.querySelector('.badge')?.textContent || '').trim()
  }));
  let filtered = [...data];
  let sortKey = null, sortDir = 1;
  let page = 1;
  let pageSize = pageSizeSelect ? parseInt(pageSizeSelect.value,10) : 10;

  function totalPagesCount() {
    return Math.max(1, Math.ceil(filtered.length / pageSize));
  }

  // render current page
  function renderPage(){
    const total = filtered.length;
    const totalPages = totalPagesCount();
    if(page > totalPages) page = totalPages;
    if(page < 1) page = 1;

    // remove all rows then append visible
    if(tbody) {
      tbody.innerHTML = '';
      const start = (page-1) * pageSize;
      const visible = filtered.slice(start, start + pageSize);
      visible.forEach(d => tbody.appendChild(d.el));
    }

    // info text
    const from = total === 0 ? 0 : ((page - 1) * pageSize) + 1;
    const to = Math.min(page * pageSize, total);
    if(info) info.textContent = `Showing ${from}–${to} of ${total}`;

    // render page buttons (delegated approach)
    if(pageButtonsWrap){
      pageButtonsWrap.innerHTML = '';
      for(let i=1;i<=totalPages;i++){
        const btn = document.createElement('button');
        btn.className = 'page' + (i===page ? ' active' : '');
        btn.type = 'button';
        btn.textContent = i;
        btn.dataset.page = i;
        pageButtonsWrap.appendChild(btn);
      }
    }

    // Prev / Next disabled states
    if(btnPrev) btnPrev.disabled = page <= 1;
    if(btnNext) btnNext.disabled = page >= totalPages;

    // update selection visuals for visible rows
    updateSelectAll();
  }

  // search + filter
  function applySearch(){
    const q = (search?.value || '').trim().toLowerCase();
    filtered = data.filter(d => {
      if(!q) return true;
      return (d.name + ' ' + d.role + ' ' + d.status).toLowerCase().includes(q);
    });
    page = 1;
    renderPage();
  }

  // sort handler
  function sortBy(key){
    if(sortKey === key) sortDir = -sortDir; else { sortKey = key; sortDir = 1; }
    filtered.sort((a,b)=>{
      const av = (a[key] || '').toLowerCase();
      const bv = (b[key] || '').toLowerCase();
      return av === bv ? 0 : (av > bv ? 1 : -1) * sortDir;
    });
    // update header indicators
    table.querySelectorAll('th.sortable').forEach(th=>{
      th.setAttribute('aria-sort','none');
      const ind = th.querySelector('.sort-indicator');
      if(ind) ind.textContent = '↕';
    });
    const th = table.querySelector('th.sortable[data-key="'+key+'"]');
    if(th){
      th.setAttribute('aria-sort', sortDir===1 ? 'ascending':'descending');
      const ind = th.querySelector('.sort-indicator');
      if(ind) ind.textContent = sortDir===1 ? '↑' : '↓';
    }
    page = 1;
    renderPage();
  }

  // selection helpers
  function updateSelectAll(){
    if(!tbody || !selectAll) return;
    const visibleChecks = Array.from(tbody.querySelectorAll('.row-check'));
    const checkedCount = visibleChecks.filter(c => c.checked).length;
    selectAll.checked = checkedCount > 0 && checkedCount === visibleChecks.length;
    selectAll.indeterminate = checkedCount > 0 && checkedCount < visibleChecks.length;
    visibleChecks.forEach(c => c.closest('tr')?.classList.toggle('selected', c.checked));
  }

  // export CSV
  function exportCSV(){
    const headers = ['Name','Role','Status'];
    const rowsToExport = filtered.map(d => [d.name, d.role, d.status]);
    const csv = [headers.join(','), ...rowsToExport.map(r => r.map(v=>'"'+(v||'').replace(/"/g,'""')+'"').join(','))].join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'table-export.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  // Wire events (with defensive guards)
  if(search) search.addEventListener('input', debounce(applySearch, 180));
  if(pageSizeSelect) pageSizeSelect.addEventListener('change', ()=>{ pageSize = parseInt(pageSizeSelect.value,10) || 10; page = 1; renderPage(); });

  if(btnPrev) btnPrev.addEventListener('click', ()=> { page = Math.max(1, page-1); renderPage(); });
  if(btnNext) btnNext.addEventListener('click', ()=> { page = Math.min(totalPagesCount(), page+1); renderPage(); });

  // delegate page-button clicks
  if(pageButtonsWrap){
    pageButtonsWrap.addEventListener('click', (e)=>{
      const btn = e.target.closest('button[data-page]');
      if(!btn) return;
      const p = parseInt(btn.dataset.page,10);
      if(!isNaN(p)){ page = p; renderPage(); }
    });
  }

  // sortable headers
  table.querySelectorAll('th.sortable').forEach(th=>{
    const key = th.dataset.key;
    th.addEventListener('click', ()=> sortBy(key));
    th.addEventListener('keydown', (e)=> { if(e.key==='Enter' || e.key===' ') { e.preventDefault(); sortBy(key); } });
  });

  // row checkbox handling
  table.addEventListener('change', (e)=>{
    const el = e.target;
    if(el.classList.contains('row-check')) updateSelectAll();
  });
  if(selectAll) selectAll.addEventListener('change', (e)=>{
    const chk = selectAll.checked;
    table.querySelectorAll('.row-check').forEach(cb=>{ cb.checked = chk; cb.closest('tr')?.classList.toggle('selected', chk); });
    selectAll.indeterminate = false;
  });

  // variant toggle
  variantBtns.forEach(b=>{
    b.addEventListener('click', ()=> {
      variantBtns.forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      const v = b.dataset.variant;
      table.classList.remove('variant-striped','variant-hover','variant-compact','variant-bordered');
      if(v === 'striped') table.classList.add('variant-striped');
      if(v === 'hover') table.classList.add('variant-hover');
      if(v === 'compact') table.classList.add('variant-compact');
    });
  });

  if(exportBtn) exportBtn.addEventListener('click', exportCSV);

  // initial render
  renderPage();
  updateSelectAll();

  // small utilities
  function debounce(fn, ms){ let t; return function(){ clearTimeout(t); t = setTimeout(()=> fn.apply(this, arguments), ms); }; }

})();














document.querySelectorAll('.expand-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('aria-controls');
    const nested = document.getElementById(targetId);
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    btn.textContent = expanded ? '+' : '–';
    if(nested) nested.hidden = expanded;
  });
});
