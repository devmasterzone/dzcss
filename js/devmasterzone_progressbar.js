(function(){
  // Convenience: animate determinate bar to value
  function setProgress(el, value){
    el.style.setProperty('--value', value + '%');
    el.setAttribute('aria-valuenow', String(value));
    const label = el.closest('.demo-block')?.querySelector('.progress-labels .muted');
    if(label) label.textContent = value + '% complete';
  }

  // initialize from data-value
  document.querySelectorAll('.dz-progress[data-value]').forEach(p=>{
    const v = Number(p.dataset.value || 0);
    setProgress(p, v);
  });

  // demo: start animating a few bars
  const startBtn = document.getElementById('startDemo');
  const resetBtn = document.getElementById('resetDemo');
  const determ = document.querySelector('.dz-progress[data-value]');
  const striped = document.querySelector('.dz-progress.dz-striped');
  const gradient = document.querySelector('.dz-progress.dz-gradient');

  let t;
  function demoStart(){
    let v = 0;
    clearInterval(t);
    t = setInterval(()=>{
      v = Math.min(100, v + Math.floor(Math.random()*8)+2);
      if(determ) setProgress(determ, v);
      if(striped) setProgress(striped, Math.min(100, v - 12));
      if(gradient) setProgress(gradient, Math.max(8, v - 5));
      if(v >= 100) clearInterval(t);
    }, 420);
  }
  function demoReset(){
    clearInterval(t);
    if(determ) setProgress(determ, Number(determ.dataset.value||0));
    if(striped) setProgress(striped, Number(striped.dataset.value||0));
    if(gradient) setProgress(gradient, Number(gradient.dataset.value||0));
  }

  if(startBtn) startBtn.addEventListener('click', demoStart);
  if(resetBtn) resetBtn.addEventListener('click', demoReset);

  // expose small API if needed
  window.DZProgress = { set: setProgress };
})();