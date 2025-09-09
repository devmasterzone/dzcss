/* DZNav (mobile-first): drawer + dropdown + keyboard */
(function(){
  const q = (sel, root=document) => root.querySelector(sel);
  const qa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function toggleDrawer(drawerId, open){
    const drawer = drawerId ? document.querySelector(drawerId) : document.querySelector('.dz-drawer');
    if(!drawer) return;
    const isOpen = open === undefined ? !drawer.classList.contains('open') : open;
    drawer.classList.toggle('open', isOpen);
    drawer.setAttribute('aria-hidden', !isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  // wire primary nav's toggle to primary drawer if present
// wire navbar toggles -> drawer reliably
document.querySelectorAll('.dz-navbar__toggle').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    // 1) prefer explicit data attribute
    const targetSel = btn.getAttribute('data-drawer-target') || btn.getAttribute('aria-controls');
    let drawer = null;
    if (targetSel) drawer = document.querySelector(targetSel);
    // 2) fallback: find nearest sibling drawer in the same container
    if (!drawer) {
      const nav = btn.closest('.dz-navbar') || btn.closest('.card') || document;
      drawer = (nav && nav.querySelector('.dz-drawer')) || null;
    }
    // 3) final fallback by id/name
    if (!drawer) drawer = document.getElementById('primaryDrawer') || document.querySelector('.dz-drawer');

    if (!drawer) return;
    const willOpen = !drawer.classList.contains('open');
    drawer.classList.toggle('open', willOpen);
    drawer.setAttribute('aria-hidden', willOpen ? 'false' : 'true');
    btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    document.body.style.overflow = willOpen ? 'hidden' : '';
  });
});


  // drawer close buttons
  qa('.drawer-close, #drawerClose').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const drawer = btn.closest('.dz-drawer') || document.querySelector('.dz-drawer.open');
      if(!drawer) return;
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden','true');
      document.body.style.overflow = '';
      // restore any toggles
      qa('.dz-navbar__toggle').forEach(t=>t.setAttribute('aria-expanded','false'));
    });
  });

  // drawer toggles inside drawer
  qa('[data-drawer-toggle]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const li = btn.closest('.drawer-item');
      if(!li) return;
      li.classList.toggle('open');
      const expanded = li.classList.contains('open');
      btn.setAttribute('aria-expanded', expanded);
    });
  });

  // desktop dropdown toggles (also works on larger screens)
  qa('[data-toggle]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const li = btn.closest('.dz-nav-item, .dz-dropdown, .dz-navbar__user');
      if(!li) return;
      const open = li.classList.toggle('open');
      btn.setAttribute('aria-expanded', open);
      const menu = li.querySelector('.dz-dropdown__menu');
      if(menu) menu.setAttribute('aria-hidden', !open);
      // close sibling menus
      const parent = li.parentElement;
      if(parent){
        Array.from(parent.children).forEach(sib=>{
          if(sib !== li){ sib.classList.remove('open'); const sb = sib.querySelector('[data-toggle]'); if(sb) sb.setAttribute('aria-expanded','false'); const sm = sib.querySelector('.dz-dropdown__menu'); if(sm) sm.setAttribute('aria-hidden','true'); }
        });
      }
    });

    // keyboard support for toggles
    btn.addEventListener('keydown', (ev)=>{
      if(ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); btn.click(); }
      if(ev.key === 'Escape') {
        const li = btn.closest('.dz-nav-item, .dz-dropdown');
        if(li){ li.classList.remove('open'); btn.setAttribute('aria-expanded','false'); const menu = li.querySelector('.dz-dropdown__menu'); if(menu) menu.setAttribute('aria-hidden','true'); btn.focus(); }
      }
    });
  });

  // clicking inside dropdown shouldn't close it (prevents immediate close when clicking options)
  qa('.dz-dropdown__menu').forEach(menu => menu.addEventListener('click', e => e.stopPropagation()));

  // click outside closes everything
  document.addEventListener('click', (e)=>{
    if(!e.target.closest('.dz-navbar') && !e.target.closest('.dz-drawer')){
      qa('.dz-dropdown, .dz-nav-item').forEach(li => li.classList.remove('open'));
      qa('.dz-drawer').forEach(drawer => { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true'); });
      document.body.style.overflow = '';
      qa('.dz-navbar__toggle').forEach(t=>t.setAttribute('aria-expanded','false'));
    }
  });

  // keyboard navigation for top-level menubar (desktop)
  qa('.dz-nav-list').forEach(menubar=>{
    const items = Array.from(menubar.querySelectorAll('.dz-nav-link, [data-toggle]'));
    menubar.addEventListener('keydown', (ev)=>{
      const cur = document.activeElement;
      const idx = items.indexOf(cur);
      if(ev.key === 'ArrowRight'){ ev.preventDefault(); const next = items[(idx+1) % items.length]; next && next.focus(); }
      if(ev.key === 'ArrowLeft'){ ev.preventDefault(); const prev = items[(idx-1+items.length) % items.length]; prev && prev.focus(); }
      if(ev.key === 'Escape'){ qa('.dz-dropdown').forEach(d => d.classList.remove('open')); items[0] && items[0].focus(); }
    });
  });

  // expose small API
  window.DZNav = {
    openDrawer: () => { const d = document.querySelector('.dz-drawer'); if(d){ d.classList.add('open'); d.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; } },
    closeDrawer: () => { const d = document.querySelector('.dz-drawer'); if(d){ d.classList.remove('open'); d.setAttribute('aria-hidden','true'); document.body.style.overflow=''; } }
  };

  // auto-init no-op (behavior attached above)
})();