    // Segmented radiogroup keyboard + mouse behavior
  document.querySelectorAll('.btn-segment').forEach(group=>{
    const radios = Array.from(group.querySelectorAll('[role="radio"]'));
    radios.forEach((r, i)=>{
      r.addEventListener('click', ()=> setChecked(i));
      r.addEventListener('keydown', (e)=>{
        if(e.key === 'ArrowRight' || e.key === 'ArrowDown'){ e.preventDefault(); setChecked((i+1)%radios.length); radios[(i+1)%radios.length].focus(); }
        if(e.key === 'ArrowLeft' || e.key === 'ArrowUp'){ e.preventDefault(); setChecked((i-1+radios.length)%radios.length); radios[(i-1+radios.length)%radios.length].focus(); }
        if(e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); setChecked(i); }
      });
    });
    function setChecked(idx){
      radios.forEach((r,j)=>{
        const checked = j === idx;
        r.setAttribute('aria-checked', checked ? 'true' : 'false');
        r.tabIndex = checked ? 0 : -1;
        r.classList.toggle('toggle-on', checked);
      });
    }
  });

  // Simple toggleable multi-select buttons
  document.querySelectorAll('[data-toggle="toggle"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      btn.classList.toggle('toggle-on');
      btn.setAttribute('aria-pressed', btn.classList.contains('toggle-on'));
      // visual change: apply a default filled style when active
      if(btn.classList.contains('toggle-on')){
        btn.style.background = getComputedStyle(document.documentElement).getPropertyValue('--dz-gradient-primary') || '#5c6af0';
        btn.style.color = '#fff';
        btn.style.borderColor = 'transparent';
      } else {
        btn.style.background = 'transparent';
        btn.style.color = 'inherit';
        btn.style.borderColor = '';
      }
    });
  });

  // small keyboard accessibility so icon-only buttons are focusable visually
  document.querySelectorAll('.btn-icon').forEach(b=>{
    b.addEventListener('keydown', e=> { if(e.key === 'Enter') b.click(); });
  });