/*
  Universal Tabs initializer
  - Auto-inits every tab widget on the page
  - Supports variants: line (indicator), pills, segments, vertical
  - Keyboard: ArrowLeft/Right, ArrowUp/Down (for vertical), Home, End, Enter/Space
  - Exposes window.DZTabsAPI for programmatic control
*/
(function(){
  const widgets = [];

  // Utility
  function q(sel, ctx=document) { return ctx.querySelector(sel); }
  function qa(sel, ctx=document) { return Array.from(ctx.querySelectorAll(sel)); }
  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  // Initialize a single tabs root (container element)
  function initTabs(root){
    if(!root) return null;
    // avoid double-init
    if(root.__dzTabsInited) return root.__dzTabsRef;
    root.__dzTabsInited = true;

    // flexible selectors: either .tabs-wrapper (composed demo) or plain .tabs
    const tabList = q('[role="tablist"], .tab-list, .tabs, .tabs.pills, .tabs.line, .tabs.seg, .tab-column', root) || q('.tab-list', root);
    if(!tabList) return null;

    // gather tab buttons (role=tab or .tab)
    const tabs = qa('[role="tab"], .tab, .vtab', tabList).filter(Boolean);
    const panels = qa('[role="tabpanel"], .tab-panel, .panel, .vpanel', root);
    const variant = root.dataset.variant || root.getAttribute('data-variant') || (
      tabList.classList.contains('pills') ? 'pills' :
      tabList.classList.contains('line') ? 'line' :
      tabList.classList.contains('seg') ? 'segments' :
      root.classList.contains('tabs-vertical') ? 'vertical' : (root.classList.contains('tabs') && root.classList.contains('pills') ? 'pills' : 'line')
    );

    // indicator (create if line variant)
    let indicator = q('.tab-indicator, .indicator', tabList);
    if(variant === 'line' && !indicator){
      indicator = document.createElement('div');
      indicator.className = 'tab-indicator';
      tabList.appendChild(indicator);
    }

    // helper: activate by index
    function activateIndex(idx, opts={}){
      idx = clamp(idx, 0, tabs.length-1);
      const tab = tabs[idx];
      if(!tab) return;
      tabs.forEach((t,i)=>{
        const sel = t === tab;
        t.setAttribute('aria-selected', sel ? 'true' : 'false');
        t.tabIndex = sel ? 0 : -1;
        if(panels[i]) panels[i].hidden = !sel;
      });
      // focus optional
      if(!opts.noFocus) tab.focus();
      // indicator position
      updateIndicator(tab);
      // raise custom event
      root.dispatchEvent(new CustomEvent('dz-tab-change',{detail:{index:idx,tab,variant}}));
    }

    function indexOfTab(el){ return tabs.indexOf(el); }

    // update indicator placement (for line/underline)
    function updateIndicator(activeTab){
      if(!indicator) return;
      if(!activeTab){ indicator.style.opacity = 0; return; }
      // compute relative left/width inside tabList
      const tRect = activeTab.getBoundingClientRect();
      const pRect = tabList.getBoundingClientRect();
      const left = tRect.left - pRect.left + tabList.scrollLeft;
      indicator.style.left = left + 'px';
      indicator.style.width = tRect.width + 'px';
      indicator.style.opacity = 1;
    }

    // click handlers
    tabs.forEach((tab, i) => {
      tab.setAttribute('role','tab');
      if(!tab.hasAttribute('tabindex')) tab.tabIndex = -1;
      tab.addEventListener('click', (e)=>{
        activateIndex(i);
      });
      // keyboard
      tab.addEventListener('keydown', (e)=>{
        const key = e.key;
        const dirH = (key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0);
        const dirV = (key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0);
        if(dirH || dirV){
          e.preventDefault();
          const useVert = (variant === 'vertical' || tabList.getAttribute('aria-orientation') === 'vertical');
          const nextIdx = (useVert ? dirV : dirH) ? clamp(i + (useVert ? dirV : dirH), 0, tabs.length-1) : i;
          if(nextIdx !== i) activateIndex(nextIdx);
        } else if(key === 'Home'){
          e.preventDefault(); activateIndex(0);
        } else if(key === 'End'){
          e.preventDefault(); activateIndex(tabs.length - 1);
        } else if(key === 'Enter' || key === ' '){
          e.preventDefault(); activateIndex(i);
        }
      });
    });

    // Select initial tab (respect aria or default to first)
    let startIdx = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');
    if(startIdx === -1) startIdx = 0;
    // Map panels length to tabs (hide extras)
    tabs.forEach((t,i)=> {
      if(panels[i] === undefined){
        // keep safe: create empty panel slot if none
      } else {
        // ensure panels have role=tabpanel
        panels[i].setAttribute('role','tabpanel');
      }
    });

    // Render initial state after layout (indicator needs geometry)
    setTimeout(()=> activateIndex(startIdx, {noFocus:true}), 30);

    // watch resize/scroll inside tabList (if overflow) to reposition indicator
    let resizeT;
    window.addEventListener('resize', ()=> { clearTimeout(resizeT); resizeT = setTimeout(()=> updateIndicator(tabs.find(t=>t.getAttribute('aria-selected')==='true')), 120); }, {passive:true});
    if(tabList){
      tabList.addEventListener('scroll', ()=> updateIndicator(tabs.find(t=>t.getAttribute('aria-selected')==='true')));
    }

    // expose API for this root
    const ref = {
      root, tabList, tabs, panels, variant,
      activate: (idxOrTab) => {
        if(typeof idxOrTab === 'number') activateIndex(idxOrTab);
        else {
          const t = (typeof idxOrTab === 'string') ? tabs.find(x=> x.dataset.panel === idxOrTab || x.id === idxOrTab) : idxOrTab;
          const idx = tabs.indexOf(t);
          if(idx >= 0) activateIndex(idx);
        }
      },
      getActiveIndex: ()=> tabs.findIndex(t => t.getAttribute('aria-selected')==='true'),
      destroy: ()=> {
        tabs.forEach(t => t.replaceWith(t.cloneNode(true))); // cheap way to remove handlers
        root.__dzTabsInited = false;
      }
    };

    root.__dzTabsRef = ref;
    widgets.push(ref);
    return ref;
  }

  // Init all roots found on page
  function initAll(){
    const roots = Array.from(document.querySelectorAll('.tabs-wrapper, .tabs, .tabs.pills, .tabs.line, .tabs.seg, .tabs-vertical, .tabs.pills-demo, .demo-card')).filter(Boolean);
    // fallback: any element with role=tablist parent
    const extra = Array.from(document.querySelectorAll('[role="tablist"]')).map(el => el.closest('section, .tabs-wrapper, .tabs, .demo-card') || el.parentElement).filter(Boolean);
    const all = Array.from(new Set([...roots, ...extra]));
    all.forEach(r => initTabs(r));
    return widgets;
  }

  // run on DOMContentLoaded (or immediately if already ready)
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  // Global API
  window.DZTabsAPI = {
    init: initTabs,      // init specific root element: DZTabsAPI.init(document.querySelector('.my-tabs'))
    initAll,
    widgets,             // array of widget refs
    activateAll: (idx)=> widgets.forEach(w => w.activate(idx)),
    findByRoot: (root)=> widgets.find(w => w.root === root)
  };

  // small helpful log for dev (remove if noisy)
  // console.info('DZTabsAPI initialized — widgets:', widgets.length);

})();