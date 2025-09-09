/* DZCarousel v1 - dynamic, accessible carousel */
(function(){
  class DZCarousel {
    constructor(root, opts = {}) {
      this.root = root;
      this.stage = root.querySelector('.dz-stage');
      this.track = root.querySelector('.dz-track');
      this.indicatorsEl = root.querySelector('.dz-indicators');
      this.controls = { prev: root.querySelector('[data-action="prev"]'), next: root.querySelector('[data-action="next"]') };
      this.live = root.querySelector('#carouselLive') || null;

      // options from data-attributes (declarative)
      const da = root.dataset;
      this.options = Object.assign({
        autoplay: da.autoplay === 'true' || opts.autoplay || false,
        interval: Number(da.interval || opts.interval || 4500),
        controls: da.controls !== 'false' && (opts.controls !== false),
        indicators: da.indicators !== 'false' && (opts.indicators !== false),
        pauseOnHover: da.pauseOnHover !== 'false' ? true : false,
        swipe: da.swipe !== 'false' ? true : false,
        aspect: da.aspect || opts.aspect || null, // "16/9" or css percent like "56.25%" or null
        startIndex: Number(da.startIndex || opts.startIndex || 0)
      }, opts);

      this.items = Array.from(this.track.children);
      this.count = this.items.length;
      this.index = 0;
      this.timer = null;
      this.isAnimating = false;
      this.touch = { startX: 0, deltaX: 0 };

      this._init();
    }

    _init(){
      // set aspect-ratio: data-aspect="16/9" => padding-top percent
      if (this.options.aspect) {
        let aspect = this.options.aspect;
        if (aspect.includes('/')) {
          // e.g. 16/9 or 4/3
          const [w,h] = aspect.split('/').map(Number);
          if (w && h) this.root.style.setProperty('--dz-carousel-aspect', ((h/w)*100) + '%');
        } else if (aspect.includes('%')) {
          this.root.style.setProperty('--dz-carousel-aspect', aspect);
        } else if (aspect.includes(':')) {
          const [w,h] = aspect.split(':').map(Number);
          if (w && h) this.root.style.setProperty('--dz-carousel-aspect', ((h/w)*100) + '%');
        } else if (!isNaN(Number(aspect))) {
          // assume ratio like "56.25" is percent
          this.root.style.setProperty('--dz-carousel-aspect', aspect + '%');
        }
      }

      // Wrap up slides: ensure class names and set aria-hidden except active
      this.items.forEach((s,i) => {
        s.classList.add('dz-slide');
        s.setAttribute('role', 'group');
        s.setAttribute('aria-roledescription', 'slide');
        s.setAttribute('aria-label', `${i+1} of ${this.count}`);
      });

      // init indicators
      if (this.options.indicators) this._buildIndicators();
      else this.indicatorsEl.style.display = 'none';

      // show/hide controls
      if (!this.options.controls || this.count <= 1) this.root.classList.add('dz-controls-hidden');
      if (!this.options.controls) {
        if (this.controls.prev) this.controls.prev.style.display = 'none';
        if (this.controls.next) this.controls.next.style.display = 'none';
      }

      // event bindings
      if (this.controls.prev) this.controls.prev.addEventListener('click', ()=>this.prev());
      if (this.controls.next) this.controls.next.addEventListener('click', ()=>this.next());
      this.stage.addEventListener('keydown', (e) => this._onKey(e));
      if (this.options.pauseOnHover) {
        this.root.addEventListener('mouseenter', ()=>this.pause());
        this.root.addEventListener('mouseleave', ()=>this.play());
      }
      if (this.options.swipe) this._bindSwipe();

      // lazy-load images within slides (if present)
      this._prepareSlides();

      // start at specified index
      this.goTo(this.options.startIndex, { immediate: true });

      // autoplay
      if (this.options.autoplay && this.count > 1) this.play();
    }

    _prepareSlides(){
      // convert <img data-src="..."> into lazy-loaded images
      this.items.forEach(slide => {
        const img = slide.querySelector('img[data-src]');
        if (img && !img.src) {
          // show placeholder until loaded (if not already)
          const placeholder = slide.querySelector('.img-placeholder');
          img.addEventListener('load', () => {
            if (placeholder) placeholder.remove();
            img.style.display = 'block';
            this._updateHeight(); // in case height needs adjust
          });
          img.addEventListener('error', ()=> {
            if (placeholder) placeholder.textContent = 'Image failed';
          });
          // set src to start loading
          img.src = img.dataset.src;
        }
      });
    }

    _buildIndicators(){
      this.indicatorsEl.innerHTML = '';
      for (let i=0;i<this.count;i++){
        const b = document.createElement('button');
        b.type='button';
        b.setAttribute('aria-label', `Go to slide ${i+1}`);
        b.addEventListener('click', ()=>this.goTo(i));
        if (i===0) b.setAttribute('aria-current','true');
        this.indicatorsEl.appendChild(b);
      }
    }

    _updateIndicators(){
      if (!this.options.indicators) return;
      const buttons = Array.from(this.indicatorsEl.children);
      buttons.forEach((b,i)=> b.setAttribute('aria-current', i===this.index ? 'true' : 'false'));
    }

    _updateAria(){
      // announce
      if (this.live) this.live.textContent = (this.items[this.index]?.dataset.caption || `Slide ${this.index+1}`) + ` (${this.index+1} of ${this.count})`;
      // set aria-hidden on slides
      this.items.forEach((s,i)=> s.setAttribute('aria-hidden', i===this.index ? 'false' : 'true'));
      // dispatch event
      this.root.dispatchEvent(new CustomEvent('carousel:change', { detail: { index: this.index } }));
    }

    _onKey(e){
      if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); this.next(); }
    }

    _bindSwipe(){
      const track = this.track;
      track.addEventListener('touchstart', (e)=> {
        this.touch.startX = e.touches[0].clientX;
        this.touch.deltaX = 0;
        this.pause(); // pause autoplay when interacting
      }, {passive:true});
      track.addEventListener('touchmove', (e)=> {
        const x = e.touches[0].clientX;
        this.touch.deltaX = x - this.touch.startX;
        // simple translation for drag feel
        track.style.transition = 'none';
        track.style.transform = `translateX(${ -this.index*100 + (this.touch.deltaX / this.root.clientWidth)*100 }%)`;
      }, {passive:true});
      track.addEventListener('touchend', (e)=> {
        const threshold = this.root.clientWidth * 0.12;
        if (this.touch.deltaX > threshold) this.prev();
        else if (this.touch.deltaX < -threshold) this.next();
        else this.goTo(this.index);
        this.play();
      });
    }

    _updateHeight(){
      // optional: do nothing - using aspect-ratio for sizing. Keep for future dynamic height support.
    }

    goTo(i, { immediate=false } = {}) {
      if (this.isAnimating) return;
      const newIndex = ((i % this.count) + this.count) % this.count;
      this.index = newIndex;
      // perform transform
      if (immediate) {
        this.track.style.transition = 'none';
      } else {
        this.track.style.transition = `transform ${Math.max(200, parseInt(getComputedStyle(this.root).getPropertyValue('--dz-carousel-duration')||350))}ms var(--dz-carousel-ease)`;
      }
      requestAnimationFrame(()=> {
        this.track.style.transform = `translateX(${-this.index*100}%)`;
        // restore transition after frame if immediate
        if (immediate) requestAnimationFrame(()=> this.track.style.transition = '');
      });
      this._updateIndicators();
      this._updateAria();
    }

    prev(){ this.goTo(this.index - 1); this._resetTimer(); }
    next(){ this.goTo(this.index + 1); this._resetTimer(); }

    play(){
      if (this.timer || !this.options.autoplay) return;
      this.timer = setInterval(()=> this.next(), Math.max(500, this.options.interval));
    }
    pause(){ if (this.timer) { clearInterval(this.timer); this.timer = null; } }
    _resetTimer(){ if (this.options.autoplay){ this.pause(); this.play(); } }

    addSlide(nodeOrHtml, index = this.count){
      let node;
      if (typeof nodeOrHtml === 'string'){
        const tmp = document.createElement('div'); tmp.innerHTML = nodeOrHtml; node = tmp.firstElementChild;
      } else node = nodeOrHtml;
      node.classList.add('dz-slide');
      node.setAttribute('role','group');
      this.track.insertBefore(node, this.track.children[index] || null);
      this.items = Array.from(this.track.children);
      this.count = this.items.length;
      if (this.options.indicators) this._buildIndicators();
      this._updateAria();
    }

    removeSlide(index){
      const n = this.track.children[index];
      if (!n) return;
      n.remove();
      this.items = Array.from(this.track.children);
      this.count = this.items.length;
      if (this.index >= this.count) this.index = Math.max(0, this.count - 1);
      if (this.options.indicators) this._buildIndicators();
      this.goTo(this.index, { immediate:true });
    }

    destroy(){
      this.pause();
      // remove events: simple approach — reload the page of remove nodes if necessary
    }
  }

  // Public API: auto-init
  window.DZCarousel = {
    instances: [],
    initAll(selector = '[data-carousel]') {
      document.querySelectorAll(selector).forEach(root => {
        if (root.__dzCarousel) return;
        const c = new DZCarousel(root);
        root.__dzCarousel = c;
        this.instances.push(c);
      });
    },
    create(root, opts){ // create from element or create new container
      if (typeof root === 'string') root = document.querySelector(root);
      if (!root) throw new Error('Invalid root for DZCarousel.create');
      const c = new DZCarousel(root, opts || {});
      root.__dzCarousel = c;
      this.instances.push(c);
      return c;
    },
    getInstances(){ return this.instances; }
  };

  // Auto-init on DOM ready
  document.addEventListener('DOMContentLoaded', ()=> window.DZCarousel.initAll());

})();