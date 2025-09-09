(function(){
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function closePanel(panel){
    if(!panel) return;
    panel.style.height = panel.scrollHeight + 'px'; // ensure current height set
    // force reflow
    panel.getBoundingClientRect();
    panel.style.transition = `height var(--dz-duration,240ms) var(--dz-ease), opacity var(--dz-duration,240ms) var(--dz-ease)`;
    panel.style.height = '0px';
    panel.setAttribute('aria-hidden','true');
    // after transition hide element to remove from tab order and allow hidden attr semantics
    const onEnd = function(e){
      if(e.propertyName !== 'height') return;
      panel.hidden = true;
      panel.style.height = '0px';
      panel.removeEventListener('transitionend', onEnd);
    };
    panel.addEventListener('transitionend', onEnd);
  }

  function openPanel(panel){
    if(!panel) return;
    panel.hidden = false;
    // set height from 0 -> scrollHeight
    panel.style.height = '0px';
    // force reflow
    panel.getBoundingClientRect();
    const target = panel.scrollHeight + 'px';
    panel.style.transition = `height var(--dz-duration,240ms) var(--dz-ease), opacity var(--dz-duration,240ms) var(--dz-ease)`;
    panel.style.height = target;
    panel.setAttribute('aria-hidden','false');
    // when done, clear inline height so content can grow/shrink naturally
    const onEnd = function(e){
      if(e.propertyName !== 'height') return;
      panel.style.height = 'auto';
      panel.removeEventListener('transitionend', onEnd);
    };
    panel.addEventListener('transitionend', onEnd);
  }

  // Close all other open items in the same group (groupId string)
  function closeOthers(groupId, exceptPanel){
    // find all roots that are part of this group
    const roots = Array.from(document.querySelectorAll('[data-accordion]')).filter(r => {
      const gid = r.dataset.group || r.id || r._dz_group;
      return gid === groupId;
    });
    roots.forEach(root => {
      const items = Array.from(root.querySelectorAll('.accordion-item'));
      items.forEach(item => {
        const trig = item.querySelector('.accordion-trigger');
        const pan = item.querySelector('.accordion-panel');
        if(!trig || !pan) return;
        if(pan === exceptPanel) return;
        if(trig.getAttribute('aria-expanded') === 'true' || item.dataset.open === 'true'){
          trig.setAttribute('aria-expanded','false');
          item.removeAttribute('data-open'); item.removeAttribute('aria-open');
          closePanel(pan);
        }
      });
    });
  }

  function initRoot(root){
    if(!root) return;
    // decide stable group id for this root
    const groupId = root.dataset.group || root.id || ('dz-accordion-autogroup-' + Math.random().toString(36).slice(2,8));
    root._dz_group = groupId;

    const items = Array.from(root.querySelectorAll('.accordion-item'));
    const triggers = items.map(it => it.querySelector('.accordion-trigger'));
    const panels = items.map(it => it.querySelector('.accordion-panel'));

    // ensure ARIA basics and initial hidden state
    items.forEach((item,i) => {
      const trig = triggers[i]; const pan = panels[i];
      if(!trig || !pan) return;
      if(!trig.id) trig.id = `${root.id || groupId}-trigger-${i}`;
      if(!pan.id) pan.id = `${root.id || groupId}-panel-${i}`;
      trig.setAttribute('aria-controls', pan.id);
      trig.setAttribute('aria-expanded','false');
      pan.setAttribute('role','region');
      pan.setAttribute('aria-labelledby', trig.id);
      pan.setAttribute('aria-hidden','true');
      pan.hidden = true;
      pan.style.height = '0px';
    });

    const defaultMode = (root.dataset.default || 'first').toLowerCase();
    const multiple = root.dataset.multiple === 'true' || root.hasAttribute('data-multiple');

    // defaults
    if(defaultMode === 'all'){
      items.forEach((item,i)=>{ const t=triggers[i], p=panels[i]; if(!t||!p) return; t.setAttribute('aria-expanded','true'); item.dataset.open='true'; p.hidden=false; p.setAttribute('aria-hidden','false'); p.style.height='auto'; });
    } else if(defaultMode === 'first'){
      if(items.length){ const t=triggers[0], p=panels[0]; t.setAttribute('aria-expanded','true'); items[0].dataset.open='true'; p.hidden=false; p.setAttribute('aria-hidden','false'); p.style.height='auto'; }
    }

    // per-item data-open override
    items.forEach((item,i)=>{ if(item.dataset.open==='true' || item.getAttribute('data-open')==='true'){ const t=triggers[i], p=panels[i]; if(!t||!p) return; t.setAttribute('aria-expanded','true'); p.hidden=false; p.setAttribute('aria-hidden','false'); p.style.height='auto'; } });

    // attach events
    items.forEach((item,i)=>{
      const trig = triggers[i]; const pan = panels[i];
      if(!trig || !pan) return;

      // Replace your existing trigger click handler with this robust handler.
// Put inside your initRoot (where you have `trig` and `pan` variables per item).
trig.addEventListener('click', () => {
  const expanded = trig.getAttribute('aria-expanded') === 'true';

  // lazy event before opening
  if(!expanded && item.dataset.lazy === 'true'){
    item.dispatchEvent(new CustomEvent('accordion:lazy', { detail:{ item, index:i, root }, bubbles:true }));
  }

  if(expanded){
    // close current item
    trig.setAttribute('aria-expanded','false');
    item.removeAttribute('data-open');
    item.removeAttribute('aria-open');
    // animate close (uses your animate/closePanel functions)
    closePanel(pan);
    return;
  }

  // If opening, first check whether multiple openings are allowed
  const multiple = root.dataset.multiple === 'true' || root.hasAttribute('data-multiple');

  if(!multiple){
    // Close ALL other open panels in the same group (including other roots that share same data-group)
    const groupId = root.dataset.group || root.id || root._dz_group || null;

    // find all accordion roots that belong to same groupId (if groupId null: fallback to same root only)
    let rootsToCheck;
    if(groupId){
      rootsToCheck = Array.from(document.querySelectorAll('[data-accordion]')).filter(r => {
        return (r.dataset.group || r.id || r._dz_group) === groupId;
      });
    } else {
      rootsToCheck = [root];
    }

    rootsToCheck.forEach(r => {
      const otherItems = Array.from(r.querySelectorAll('.accordion-item'));
      otherItems.forEach(otherItem => {
        if(otherItem === item) return; // don't close the one we're about to open
        const otherTrig = otherItem.querySelector('.accordion-trigger');
        const otherPanel = otherItem.querySelector('.accordion-panel');
        if(!otherTrig || !otherPanel) return;
        if(otherTrig.getAttribute('aria-expanded') === 'true' || otherItem.dataset.open === 'true'){
          otherTrig.setAttribute('aria-expanded','false');
          otherItem.removeAttribute('data-open');
          otherItem.removeAttribute('aria-open');
          closePanel(otherPanel);
        }
      });
    });
  }

  // finally open clicked panel
  trig.setAttribute('aria-expanded','true');
  item.dataset.open = 'true';
  item.setAttribute('aria-open','true');
  openPanel(pan);
});

    });

    // ResizeObserver to adjust height when content changes
    const ro = new ResizeObserver(entries=>{
      entries.forEach(entry=>{
        const p = entry.target;
        if(p.getAttribute('aria-hidden') === 'false'){
          p.style.height = p.scrollHeight + 'px';
          setTimeout(()=>{ if(p.getAttribute('aria-hidden') === 'false') p.style.height = 'auto'; }, 260);
        }
      });
    });
    panels.forEach(p=>{ if(p) ro.observe(p); });
  }

  // init on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', ()=>{
    document.querySelectorAll('[data-accordion]').forEach(root=>initRoot(root));
  });

  // optional API
  window.DZAccordion = {
    openItem(root, idx){ if(!root || typeof idx !== 'number') return; const t = root.querySelectorAll('.accordion-trigger')[idx]; if(t && t.getAttribute('aria-expanded')==='false') t.click(); },
    closeItem(root, idx){ if(!root || typeof idx !== 'number') return; const t = root.querySelectorAll('.accordion-trigger')[idx]; if(t && t.getAttribute('aria-expanded')==='true') t.click(); }
  };
})();