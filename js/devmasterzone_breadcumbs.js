
  // Make non-anchor crumbs focusable for keyboard users (only if they are not links)
  document.querySelectorAll('.breadcrumb li[aria-current="page"] > span.crumb, .breadcrumb li[aria-current="page"] > .crumb-current').forEach(el=>{
    if(!el.hasAttribute('tabindex')) el.setAttribute('tabindex','0');
  });

  // Optional: if a breadcrumb row overflows horizontally, allow arrow keys to scroll it when focused
  document.querySelectorAll('.breadcrumb').forEach(b=>{
    b.addEventListener('keydown', (e)=>{
      if(e.key === 'ArrowRight') { b.scrollBy({left: 80, behavior:'smooth'}); }
      if(e.key === 'ArrowLeft')  { b.scrollBy({left:-80, behavior:'smooth'}); }
    });
  });