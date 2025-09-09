/* DZAlerts — advance alerts + toast manager */
(function(){
  const container = document.querySelector('.dz-toast-container') || (function(){
    const el = document.createElement('div');
    el.className = 'dz-toast-container';
    document.body.appendChild(el);
    return el;
  })();

  const icons = {
    info: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 7a1 1 0 102 0 1 1 0 10-2 0zM11 11h2v6h-2z" fill="currentColor"/></svg>`,
    success: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
    danger: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 7h2v6h-2zM11 15h2v2h-2z" fill="currentColor"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.2L3 19h18L12 4.2z" fill="currentColor"/><path d="M12 9v4" stroke="#fff" stroke-width="1.4" stroke-linecap="round" /></svg>`,
    dark: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 7a1 1 0 102 0 1 1 0 10-2 0zM11 11h2v6h-2z" fill="currentColor"/></svg>`
  };

  function createAlert(opts = {}){
    const type = opts.type || 'info'; // info|success|danger|warning|dark
    const variant = opts.variant || 'ghost'; // ghost|solid|bordered
    const title = opts.title || (type.charAt(0).toUpperCase()+type.slice(1)+' alert');
    const message = opts.message || '';
    const dismissible = opts.dismissible !== false; // default true
    const autoDismiss = typeof opts.autoDismiss === 'number' ? opts.autoDismiss : (opts.autoDismiss === false ? null : (opts.autoDismissDefault || 5000));
    const pauseOnHover = opts.pauseOnHover !== false;
    const actions = Array.isArray(opts.actions) ? opts.actions : []; // [{label,onClick,variant}]
    const containerEl = opts.container ? (typeof opts.container === 'string' ? document.querySelector(opts.container) : opts.container) : container;

    // build element
    const el = document.createElement('div');
    el.className = `dz-alert ${type} ${variant}`;
    el.setAttribute('role','status');
    el.setAttribute('aria-live','polite');

    el.innerHTML = `
      <div class="dz-icon" aria-hidden="true">${icons[type] || icons.info}</div>
      <div class="dz-body">
        <div class="dz-title">${title}</div>
        <div class="dz-message">${message}</div>
        ${autoDismiss ? `<div class="dz-progress" aria-hidden="true"><i></i></div>` : ''}
      </div>
      <div class="dz-actions" aria-hidden="false"></div>
    `;

    // actions
    const actionsEl = el.querySelector('.dz-actions');
    actions.forEach(a => {
      const btn = document.createElement('button');
      btn.className = 'dz-btn';
      btn.type = 'button';
      btn.textContent = a.label || 'Action';
      if(a.variant === 'outline') btn.style.background = 'transparent';
      btn.addEventListener('click', (e) => {
        try{ a.onClick && a.onClick(e, el); } catch(e){ console.error(e); }
      });
      actionsEl.appendChild(btn);
    });

    // dismiss button
    if(dismissible){
      const close = document.createElement('button');
      close.className = 'dz-close';
      close.setAttribute('aria-label','Dismiss');
      close.innerHTML = '✕';
      close.addEventListener('click', ()=> instance.close('manual'));
      actionsEl.appendChild(close);
    }

    // insert into container (prepend so newest on top)
    containerEl.prepend(el);
    // animate enter
    el.classList.add('is-enter');
    requestAnimationFrame(()=> el.classList.add('dz-show'));
    setTimeout(()=> el.classList.remove('is-enter'), 20);

    // auto-dismiss logic
    let timer = null;
    let start = null;
    let remaining = autoDismiss;
    const progressBar = el.querySelector('.dz-progress > i');

    function startTimer(){
      if(!autoDismiss) return;
      start = performance.now();
      // animate progress bar using transform scaleX
      if(progressBar){
        progressBar.style.transition = `transform ${remaining}ms linear`;
        requestAnimationFrame(()=> progressBar.style.transform = 'scaleX(0)');
      }
      timer = setTimeout(()=> instance.close('auto'), remaining);
    }
    function pauseTimer(){
      if(!autoDismiss) return;
      if(timer){ clearTimeout(timer); timer = null; }
      if(start){
        const elapsed = performance.now() - start;
        remaining = Math.max(0, remaining - elapsed);
        // freeze progress bar
        if(progressBar){
          const computed = getComputedStyle(progressBar);
          // compute current transform by reading matrix (best-effort)
          progressBar.style.transition = '';
          const matrix = new WebKitCSSMatrix(computed.transform || computed.webkitTransform);
          // keep current transform as-is (do nothing)
        }
      }
    }
    function resumeTimer(){
      if(!autoDismiss) return;
      if(!timer) startTimer();
    }

    if(autoDismiss){
      startTimer();
      if(pauseOnHover){
        el.addEventListener('mouseenter', pauseTimer);
        el.addEventListener('mouseleave', resumeTimer);
        el.addEventListener('focusin', pauseTimer);
        el.addEventListener('focusout', resumeTimer);
      }
    }

    // close function
    let closed = false;
    function close(source){
      if(closed) return;
      closed = true;
      // animate exit
      el.classList.add('is-exit');
      el.style.opacity = '0';
      el.style.transform = 'translateY(-8px) scale(.995)';
      // clear timers
      if(timer) clearTimeout(timer);
      // after animation remove element
      setTimeout(()=> {
        el.remove();
        try{ opts.onClose && opts.onClose(instance); } catch(e){ console.error(e); }
      }, 220);
    }

    // keyboard: Esc to close when focused
    el.addEventListener('keydown', (ev) => {
      if(ev.key === 'Escape') close('esc');
    });

    // expose instance
    const instance = {
      el,
      close,
      startTimer,
      pauseTimer,
      resumeTimer,
      type,
      variant
    };

    // return instance
    return instance;
  }

  // auto-init existing dismissible alerts on DOMContentLoaded
  function initExisting(){
    document.querySelectorAll('.dz-alert[data-dismissible]').forEach(a=>{
      if(a.dataset._dzInit) return;
      a.dataset._dzInit = '1';
      // ensure wrapper for actions if not present
      if(!a.querySelector('.dz-actions')) {
        const actions = document.createElement('div'); actions.className = 'dz-actions';
        const btn = document.createElement('button'); btn.className='dz-close'; btn.setAttribute('aria-label','Dismiss'); btn.innerHTML='✕';
        btn.addEventListener('click', ()=> a.remove());
        actions.appendChild(btn);
        a.appendChild(actions);
      } else {
        const btn = a.querySelector('.dz-close');
        if(btn) btn.addEventListener('click', ()=> a.remove());
      }

      // wire auto-dismiss attribute if present
      const ad = parseInt(a.dataset.autoDismiss || a.getAttribute('data-auto-dismiss') || 0, 10);
      if(ad > 0){
        // add a tiny progress element if none
        if(!a.querySelector('.dz-progress')){
          const prog = document.createElement('div'); prog.className='dz-progress'; prog.innerHTML='<i></i>';
          a.appendChild(prog);
        }
        // use manual instance to control
        const copy = a.cloneNode(true);
        // simple auto remove after timeout (no progress animation here)
        setTimeout(()=> { if(document.contains(a)) a.remove(); }, ad);
      }
    });
  }

  // public API
  window.DZAlerts = {
    create(opts){ return createAlert(opts); },
    info(opts = {}){ return createAlert(Object.assign({type:'info'}, opts)); },
    success(opts = {}){ return createAlert(Object.assign({type:'success'}, opts)); },
    danger(opts = {}){ return createAlert(Object.assign({type:'danger'}, opts)); },
    warning(opts = {}){ return createAlert(Object.assign({type:'warning'}, opts)); },
    dark(opts = {}){ return createAlert(Object.assign({type:'dark'}, opts)); },
    initExisting
  };

  // init existing on DOM ready
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initExisting);
  else initExisting();

})();