  (function(){
    // Helper: close all dropdowns
    function closeAll(){
      document.querySelectorAll('[data-dropdown]').forEach(d => {
        d.classList.remove('open');
        const btn = d.querySelector('[data-trigger]');
        if(btn) btn.setAttribute('aria-expanded','false');
        d.querySelectorAll('.menu-item-has-submenu.open').forEach(s => s.classList.remove('open'));
        d.querySelectorAll('[data-sub-trigger]').forEach(t => t.setAttribute('aria-expanded','false'));
      });
    }

    // Wire up top-level dropdown triggers
    document.querySelectorAll('[data-trigger]').forEach(btn => {
      const wrapper = btn.closest('[data-dropdown]');
      // click toggles drop
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasOpen = wrapper.classList.contains('open');
        // close others (optional)
        closeAll();
        if(!wasOpen){
          wrapper.classList.add('open');
          btn.setAttribute('aria-expanded','true');
          // focus first item
          const first = wrapper.querySelector('[role="menuitem"]');
          if(first) first.focus();
        } else {
          wrapper.classList.remove('open');
          btn.setAttribute('aria-expanded','false');
        }
      });

      // keyboard: Enter/Space opens; Down opens and focuses first item
      btn.addEventListener('keydown', (e) => {
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault(); btn.click();
        }
        if(e.key === 'ArrowDown'){
          e.preventDefault();
          if(!wrapper.classList.contains('open')) btn.click();
          const first = wrapper.querySelector('[role="menuitem"]');
          if(first) first.focus();
        }
      });
    });

    // Prevent clicks inside menus from bubbling (so outside click handler doesn't close immediately)
    document.querySelectorAll('[data-menu]').forEach(menu => {
      menu.addEventListener('click', e => e.stopPropagation());
    });
    document.querySelectorAll('[data-sub-menu]').forEach(menu => {
      menu.addEventListener('click', e => e.stopPropagation());
    });

    // Submenu triggers: OPEN/CLOSE only on click (no mouseenter open)
    document.querySelectorAll('[data-sub-trigger]').forEach(st => {
      // ensure non-submit
      if (st.tagName === 'BUTTON' && !st.hasAttribute('type')) st.setAttribute('type','button');

      st.addEventListener('click', (e) => {
        e.stopPropagation();
        const parent = st.closest('.menu-item-has-submenu');
        const isOpen = parent.classList.contains('open');

        // close sibling submenus in same container (optional)
        parent.parentElement.querySelectorAll('.menu-item-has-submenu.open').forEach(sibling => {
          if (sibling !== parent) sibling.classList.remove('open');
        });

        parent.classList.toggle('open', !isOpen);
        st.setAttribute('aria-expanded', String(!isOpen));

        if(!isOpen){
          const first = parent.querySelector('[role="menuitem"]');
          if(first) first.focus();
        }
      });

      // keyboard handling for the submenu trigger
      st.addEventListener('keydown', (e) => {
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault(); st.click();
        }
        if(e.key === 'ArrowRight'){
          // open submenu
          if (!st.closest('.menu-item-has-submenu').classList.contains('open')) st.click();
          // focus first item in submenu
          const first = st.closest('.menu-item-has-submenu').querySelector('[role="menuitem"]');
          if(first) first.focus();
        }
        if(e.key === 'ArrowLeft'){
          // close this submenu if open, move focus back
          const parentMenuItem = st.closest('.menu-item-has-submenu.open');
          if(parentMenuItem){
            parentMenuItem.classList.remove('open');
            st.setAttribute('aria-expanded','false');
            // move focus to the nearest parent menu item (if any)
            const outerMenu = parentMenuItem.closest('[data-menu]');
            if(outerMenu){
              const fm = outerMenu.querySelector('[role="menuitem"]');
              if(fm) fm.focus();
            }
          }
        }
      });

      // NOTE: No mouseenter/mouseleave listeners here. Submenus open only on click or keyboard.
    });

    // Keyboard navigation inside menus: ArrowUp/Down/Home/End/Escape
    document.addEventListener('keydown', (e) => {
      if(!['ArrowDown','ArrowUp','Home','End','Escape'].includes(e.key)) return;

      const active = document.activeElement;
      // If Escape -> close all
      if(e.key === 'Escape'){
        closeAll();
        return;
      }

      // If focus is inside a menu, handle arrow navigation
      const menuEl = active && active.closest('[data-menu]');
      if(menuEl){
        const items = Array.from(menuEl.querySelectorAll('[role="menuitem"]'));
        if(!items.length) return;
        const idx = items.indexOf(active);
        let next = idx;
        if(e.key === 'ArrowDown') next = Math.min(items.length - 1, idx + 1);
        if(e.key === 'ArrowUp') next = Math.max(0, idx - 1);
        if(e.key === 'Home') next = 0;
        if(e.key === 'End') next = items.length - 1;
        e.preventDefault();
        items[next].focus();
      }
    });

    // Click outside closes all dropdowns/submenus
    document.addEventListener('click', () => closeAll());

    // Close on Escape from anywhere
    document.addEventListener('keydown', (e) => {
      if(e.key === 'Escape') closeAll();
    });

    // Initialize: ensure aria states correct
    document.querySelectorAll('[data-dropdown]').forEach(d => {
      const btn = d.querySelector('[data-trigger]');
      if(btn) btn.setAttribute('aria-expanded', 'false');
      d.querySelectorAll('[data-sub-trigger]').forEach(s => s.setAttribute('aria-expanded','false'));
    });

  })();