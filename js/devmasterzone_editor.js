/**
 * Premium WYSIWYG editor v1
 * - Enhanced toolbar actions
 * - Better paste sanitization (whitelist-based)
 * - Image insert + drag & drop + resize handle
 * - Link modal
 * - Table insert
 * - Autosave and export
 *
 * Note: For production, include DOMPurify to harden sanitization:
 * <script src="https://unpkg.com/dompurify@2.4.0/dist/purify.min.js"></script>
 * then use DOMPurify.sanitize(html, {ALLOWED_TAGS: ..., ALLOWED_ATTR: ...});
 */

(function(){
  const editor = document.getElementById('editor');
  const toolbar = document.querySelector('.toolbar');
  const blockFormat = document.getElementById('blockFormat');
  const imgBtn = document.getElementById('imgBtn');
  const imgInput = document.getElementById('imgInput');
  const linkBtn = document.getElementById('linkBtn');
  const getHtmlBtn = document.getElementById('getHtml');
  const getMdBtn = document.getElementById('getMD');
  const clearAllBtn = document.getElementById('clearAll');
  const clearFormatting = document.getElementById('clearFormatting');
  const insertHrBtn = document.getElementById('insertHr');
  const insertTableBtn = document.getElementById('insertTable');
  const fontFamily = document.getElementById('fontFamily');
  const fontSize = document.getElementById('fontSize');
  const textColor = document.getElementById('textColor');
  const bgColor = document.getElementById('bgColor');

  const wordCountEl = document.getElementById('wordCount');
  const charCountEl = document.getElementById('charCount');
  const readTimeEl = document.getElementById('readTime');
  const output = document.getElementById('output');

  const linkModal = document.getElementById('linkModal');
  const linkUrl = document.getElementById('linkUrl');
  const linkText = document.getElementById('linkText');
  const linkApply = document.getElementById('linkApply');
  const linkCancel = document.getElementById('linkCancel');

  const tableModal = document.getElementById('tableModal');
  const tblRows = document.getElementById('tblRows');
  const tblCols = document.getElementById('tblCols');
  const tblApply = document.getElementById('tblApply');
  const tblCancel = document.getElementById('tblCancel');

  // helper: exec command
  function exec(cmd, val=null){
    document.execCommand(cmd, false, val);
    syncToolbar();
    editor.focus();
  }

  // toolbar click delegation
  toolbar.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-cmd]');
    if(!btn) return;
    const cmd = btn.dataset.cmd;
    if(cmd === 'undo' || cmd === 'redo') return exec(cmd);
    if(cmd === 'clearFormatting'){
      // clear selection formatting only
      const sel = window.getSelection();
      if(!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const text = range.toString();
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      updateCounts();
      syncToolbar();
      return;
    }
    exec(cmd);
  });

  // font family / size / colors
  fontFamily.addEventListener('change', ()=> {
    const val = fontFamily.value;
    if(!val) return;
    exec('fontName', val);
    fontFamily.value = '';
  });
  fontSize.addEventListener('change', ()=> {
    const v = fontSize.value;
    if(!v) return;
    // exec fontSize with a hack: create span with style
    const sel = window.getSelection();
    if(!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if(range.collapsed) return;
    const span = document.createElement('span');
    span.style.fontSize = v;
    span.appendChild(range.extractContents());
    range.insertNode(span);
    syncToolbar();
    fontSize.value = '';
  });
  textColor.addEventListener('input', ()=> {
    exec('foreColor', textColor.value);
  });
  bgColor.addEventListener('input', ()=> {
    const sel = window.getSelection();
    if(!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if(range.collapsed) {
      // toggle highlight for caret (insert span)
      exec('backColor', bgColor.value);
    } else {
      const span = document.createElement('span');
      span.style.backgroundColor = bgColor.value;
      span.appendChild(range.extractContents());
      range.insertNode(span);
    }
  });

  // block format
  blockFormat.addEventListener('change', ()=>{
    const v = blockFormat.value;
    if(v === 'pre'){
      exec('formatBlock', 'pre');
    } else {
      exec('formatBlock', v);
    }
    blockFormat.value = 'p';
  });

  // image upload
  imgBtn.addEventListener('click', ()=> imgInput.click());
  imgInput.addEventListener('change', handleFileInsert);

  function handleFileInsert(e){
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    if(!file.type.startsWith('image/')) return alert('Please select an image file.');
    const reader = new FileReader();
    reader.onload = () => insertImageDataUrl(reader.result, file.name);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  // drag & drop image into editor
  editor.addEventListener('dragover', (e)=> { e.preventDefault(); });
  editor.addEventListener('drop', (e)=>{
    e.preventDefault();
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if(file && file.type.startsWith('image/')){
      const reader = new FileReader();
      reader.onload = () => insertImageDataUrl(reader.result, file.name);
      reader.readAsDataURL(file);
    } else {
      // fallback: if text being dropped
      const text = e.dataTransfer.getData('text/plain');
      if(text) {
        exec('insertText', text);
      }
    }
  });

  // insert image and attach resize handle
  function insertImageDataUrl(dataUrl, alt='image'){
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = alt;
    img.style.maxWidth = '90%';
    img.classList.add('dz-image');

    // wrap in container to attach resize handle
    const wrapper = document.createElement('span');
    wrapper.className = 'img-resizer';
    wrapper.style.display = 'inline-block';
    wrapper.style.position = 'relative';
    wrapper.appendChild(img);

    const handle = document.createElement('span');
    handle.className = 'img-resize-handle';
    wrapper.appendChild(handle);

    // insert at caret
    const sel = window.getSelection();
    if(sel.rangeCount){
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(wrapper);
      // set caret after
      range.setStartAfter(wrapper);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      editor.appendChild(wrapper);
    }

    // attach mousedown for resizing
    handle.addEventListener('pointerdown', startResize);

    function startResize(e){
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = img.getBoundingClientRect().width;
      function onMove(ev){
        const dx = ev.clientX - startX;
        const newW = Math.max(40, startWidth + dx);
        img.style.width = newW + 'px';
      }
      function onUp(){ window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); }
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    }
  }

  // link dialog
  let savedSelection = null;
  function saveSelection(){
    const sel = window.getSelection();
    if(sel.rangeCount) savedSelection = sel.getRangeAt(0).cloneRange();
  }
  function restoreSelection(){
    if(!savedSelection) return;
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedSelection);
    savedSelection = null;
  }
  linkBtn.addEventListener('click', ()=>{
    saveSelection();
    linkUrl.value = '';
    linkText.value = '';
    showModal(linkModal);
  });
  linkApply.addEventListener('click', ()=>{
    const url = (linkUrl.value || '').trim();
    const txt = (linkText.value || '').trim();
    if(!url) { hideModal(linkModal); return; }
    restoreSelection();
    const sel = window.getSelection();
    if(sel.rangeCount){
      if(txt){
        exec('insertText', txt);
        // find the inserted text node and wrap link around it
        // simpler approach: use createLink on selection after inserting text
        // select the inserted text (we approximate)
      }
      exec('createLink', url);
      // ensure target and rel attributes
      setTimeout(()=>{
        const anchors = editor.querySelectorAll('a[href]');
        anchors.forEach(a=>{
          if(a.href && a.href.indexOf('javascript:') === -1){
            a.setAttribute('target','_blank');
            a.setAttribute('rel','noopener noreferrer');
          }
        });
      },50);
    }
    hideModal(linkModal);
  });
  linkCancel.addEventListener('click', ()=> hideModal(linkModal));

  // insert hr
  insertHrBtn.addEventListener('click', ()=> {
    const hr = document.createElement('hr');
    hr.style.border = 'none';
    hr.style.height = '1px';
    hr.style.background = 'var(--border)';
    const sel = window.getSelection();
    if(sel.rangeCount){
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(hr);
      range.setStartAfter(hr);
      range.collapse(true);
      sel.removeAllRanges(); sel.addRange(range);
    } else editor.appendChild(hr);
  });

  // table modal
  insertTableBtn.addEventListener('click', ()=>{
    showModal(tableModal);
  });
  tblApply.addEventListener('click', ()=>{
    const r = Math.max(1, parseInt(tblRows.value,10)||1);
    const c = Math.max(1, parseInt(tblCols.value,10)||1);
    insertTable(r,c);
    hideModal(tableModal);
  });
  tblCancel.addEventListener('click', ()=> hideModal(tableModal));

  function insertTable(rows, cols){
    const table = document.createElement('table');
    table.className = 'table-preview';
    for(let i=0;i<rows;i++){
      const tr = document.createElement('tr');
      for(let j=0;j<cols;j++){
        const td = document.createElement(i===0?'th':'td');
        td.textContent = i===0 ? 'Header' : 'Cell';
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    const sel = window.getSelection();
    if(sel.rangeCount){
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(table);
      range.setStartAfter(table);
      range.collapse(true);
      sel.removeAllRanges(); sel.addRange(range);
    } else editor.appendChild(table);
  }

  // modal helpers
  function showModal(m){ m.classList.remove('hidden'); m.style.zIndex = 1200; }
  function hideModal(m){ m.classList.add('hidden'); }

  // paste handler: sanitize allowed HTML & convert some markdown-like content
  editor.addEventListener('paste', (e)=>{
    e.preventDefault();
    const clipboard = (e.clipboardData || window.clipboardData);
    const html = clipboard.getData('text/html');
    const text = clipboard.getData('text/plain');

    if(html){
      // parse and sanitize basic tags
      const clean = sanitizeFragment(html);
      insertFragment(clean);
    } else if(text){
      // support basic markdown-like newlines -> paragraphs
      const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
      const frag = document.createDocumentFragment();
      paragraphs.forEach(p=>{
        const pEl = document.createElement('p');
        // simple conversion: **bold**, _italic_
        pEl.innerHTML = escapeHtml(p).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/_(.+?)_/g,'<em>$1</em>').replace(/`(.+?)`/g,'<code>$1</code>');
        frag.appendChild(pEl);
      });
      insertFragment(frag);
    }
    setTimeout(()=>{ syncToolbar(); updateCounts(); },20);
  });

  // basic fragment insertion
  function insertFragment(nodeOrHtml){
    const sel = window.getSelection();
    if(!sel.rangeCount) { if(typeof nodeOrHtml === 'string') editor.insertAdjacentHTML('beforeend', nodeOrHtml); else editor.appendChild(nodeOrHtml); return; }
    const range = sel.getRangeAt(0);
    range.deleteContents();
    if(typeof nodeOrHtml === 'string'){
      const tmp = document.createElement('div'); tmp.innerHTML = nodeOrHtml;
      const frag = document.createDocumentFragment();
      Array.from(tmp.childNodes).forEach(n => frag.appendChild(n));
      range.insertNode(frag);
    } else {
      range.insertNode(nodeOrHtml);
    }
    range.collapse(false);
    sel.removeAllRanges(); sel.addRange(range);
  }

  // sanitize fragment: whitelist tags & attributes (improved but not a replacement for DOMPurify)
  function sanitizeFragment(dirtyHtml){
    const allowedTags = ['P','BR','STRONG','B','EM','I','UL','OL','LI','A','IMG','PRE','CODE','BLOCKQUOTE','H1','H2','H3','TABLE','THEAD','TBODY','TR','TH','TD','HR','SPAN'];
    const doc = new DOMParser().parseFromString(dirtyHtml, 'text/html');
    doc.querySelectorAll('script,style,iframe,object,embed').forEach(n=>n.remove());
    const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT, null, false);
    const removeNodes = [];
    while(walker.nextNode()){
      const el = walker.currentNode;
      if(!allowedTags.includes(el.tagName)){
        // replace with text content
        const span = document.createElement('span');
        span.innerHTML = el.innerHTML;
        el.parentNode.replaceChild(span, el);
        continue;
      }
      // filter attributes
      for(const attr of Array.from(el.attributes)){
        const name = attr.name.toLowerCase();
        const val = attr.value;
        if(/^on/i.test(name)) el.removeAttribute(attr.name);
        if(name === 'style') el.removeAttribute('style'); // remove inline styles
        if(el.tagName === 'A' && name === 'href'){
          if(/^\s*javascript:/i.test(val)) el.removeAttribute('href');
          else el.setAttribute('rel','noopener noreferrer');
        }
        if(el.tagName === 'IMG' && name === 'src'){
          if(!/^data:|^https?:/i.test(val)) el.removeAttribute('src');
          // keep alt but remove others
        }
        if(!['href','src','alt','title','colspan','rowspan'].includes(name)) el.removeAttribute(attr.name);
      }
    }
    return doc.body.innerHTML;
  }

  // escape utility
  function escapeHtml(s){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // export HTML (with final sanitize)
  function getSanitizedHTML(){
    const html = editor.innerHTML;
    // If DOMPurify available, prefer it:
    if(window.DOMPurify) {
      return DOMPurify.sanitize(html, {ALLOWED_TAGS: ['p','br','strong','b','em','i','ul','ol','li','a','img','pre','code','blockquote','h1','h2','h3','table','thead','tbody','tr','th','td','hr','span'], ALLOWED_ATTR: ['href','src','alt','title','rel','target','colspan','rowspan']});
    } else {
      return sanitizeFragment(html);
    }
  }

  getHtmlBtn.addEventListener('click', ()=>{
    const s = getSanitizedHTML();
    output.hidden = false;
    output.textContent = s;
    // scroll into view
    output.scrollIntoView({behavior:'smooth',block:'nearest'});
  });

  // basic markdown conversion for headings, bold, italic, lists, links
  function htmlToMarkdown(html){
    const tmp = document.createElement('div');
    tmp.innerHTML = getSanitizedHTML();
    // walk and convert (simple)
    function nodeToMd(node){
      if(node.nodeType === 3) return node.nodeValue;
      const tag = node.tagName;
      if(tag === 'P') return nodeToMdWrapChildren(node)+'\n\n';
      if(/^H[1-6]$/.test(tag)) {
        const level = parseInt(tag[1],10);
        return '#'.repeat(level) + ' ' + nodeToMdWrapChildren(node) + '\n\n';
      }
      if(tag === 'STRONG' || tag === 'B') return '**' + nodeToMdWrapChildren(node) + '**';
      if(tag === 'EM' || tag === 'I') return '_' + nodeToMdWrapChildren(node) + '_';
      if(tag === 'A') return '['+ (node.textContent || node.href) + '](' + (node.getAttribute('href') || node.href) + ')';
      if(tag === 'IMG') return '![' + (node.alt || '') + '](' + (node.getAttribute('src') || '') + ')';
      if(tag === 'UL') return Array.from(node.children).map(li=>'- '+nodeToMdWrapChildren(li)).join('\n') + '\n\n';
      if(tag === 'OL') {
        return Array.from(node.children).map((li,i)=> (i+1)+'. '+nodeToMdWrapChildren(li)).join('\n') + '\n\n';
      }
      if(tag === 'PRE' || tag === 'CODE') return '```\\n' + node.textContent + '\\n```\\n\\n';
      if(tag === 'BLOCKQUOTE') return '> '+ nodeToMdWrapChildren(node) + '\n\n';
      if(tag === 'HR') return '---\n\n';
      // tables: convert basic rows
      if(tag === 'TABLE') {
        const rows = Array.from(node.querySelectorAll('tr')).map(tr=>{
          return '| ' + Array.from(tr.children).map(td => td.textContent.trim()).join(' | ') + ' |';
        });
        // add header separator after first row
        if(rows.length>1){
          const cols = node.querySelectorAll('tr')[0].children.length;
          const sep = '| ' + Array.from({length:cols}).map(()=> '---').join(' | ') + ' |';
          rows.splice(1,0,sep);
        }
        return rows.join('\n') + '\n\n';
      }
      return nodeToMdWrapChildren(node);
    }
    function nodeToMdWrapChildren(n){
      return Array.from(n.childNodes).map(nodeToMd).join('');
    }
    return nodeToMd(tmp).trim();
  }

  getMdBtn.addEventListener('click', ()=>{
    const md = htmlToMarkdown();
    output.hidden = false;
    output.textContent = md;
    output.scrollIntoView({behavior:'smooth',block:'nearest'});
  });

  // update counts
  function updateCounts(){
    const text = editor.innerText.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = text.length;
    const minutes = Math.max(1, Math.round(words / 200));
    wordCountEl.textContent = 'Words: ' + words;
    charCountEl.textContent = 'Chars: ' + chars;
    readTimeEl.textContent = minutes + ' min read';
  }
  editor.addEventListener('input', ()=>{ updateCounts(); syncToolbar(); scheduleAutosave(); });

  // toolbar sync
  function syncToolbar(){
    const cmds = ['bold','italic','underline','strikeThrough','insertOrderedList','insertUnorderedList','justifyLeft','justifyCenter','justifyRight'];
    cmds.forEach(c=>{
      const active = document.queryCommandState(c);
      const el = toolbar.querySelector(`[data-cmd="${c}"]`);
      if(el) el.classList.toggle('active', !!active);
    });
  }

  // keyboard shortcuts
  editor.addEventListener('keydown', (e)=>{
    const mac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const mod = mac ? e.metaKey : e.ctrlKey;
    if(!mod && !e.altKey) return;
    const key = e.key.toLowerCase();
    if(mod && key === 'b'){ e.preventDefault(); exec('bold'); }
    if(mod && key === 'i'){ e.preventDefault(); exec('italic'); }
    if(mod && key === 'u'){ e.preventDefault(); exec('underline'); }
    if(mod && key === 'k'){ e.preventDefault(); saveSelection(); showModal(linkModal); }
    if(mod && key === 's'){ e.preventDefault(); // save -> export sanitized html to localStorage
      const h = getSanitizedHTML();
      localStorage.setItem('dz-editor-export', h);
      flashSaved();
    }
  });

  // simple saved flash
  function flashSaved(){
    const el = document.querySelector('.header .small');
    if(!el) return;
    const prev = el.textContent;
    el.textContent = 'Saved ✓';
    setTimeout(()=> el.textContent = prev, 900);
  }

  // autosave
  let autosaveTimer = null;
  function scheduleAutosave(){
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(()=> {
      localStorage.setItem('dz-editor-draft', editor.innerHTML);
      // also store caret position if needed (not implemented)
    }, 1200);
  }

  // restore if draft
  window.addEventListener('load', ()=>{
    const draft = localStorage.getItem('dz-editor-draft');
    if(draft) {
      // ask user or restore automatically: we'll restore automatically but notify
      editor.innerHTML = draft;
      updateCounts();
      syncToolbar();
    } else {
      editor.innerHTML = '<p>Start typing — this editor autosaves locally. Try drag & drop images, tables, links and paste content.</p>';
    }
  });

  // clear all
  clearAllBtn.addEventListener('click', ()=>{
    if(confirm('Clear editor content? This cannot be undone.')) {
      editor.innerHTML = '';
      updateCounts();
      syncToolbar();
      localStorage.removeItem('dz-editor-draft');
    }
  });

  // small API to get/set/clear
  window.DZEditor = {
    getHTML: () => getSanitizedHTML(),
    setHTML: (h) => { editor.innerHTML = h; updateCounts(); syncToolbar(); },
    clear: () => { editor.innerHTML = ''; updateCounts(); syncToolbar(); },
    exportMarkdown: () => htmlToMarkdown()
  };

  // helper: insert HTML after sanitizing
  function insertSanitizedHtml(html){
    const s = sanitizeFragment(html);
    insertFragment(s);
  }

  // utility: format selection -> wrap with node
  function wrapSelection(tagName, attrs={}){
    const sel = window.getSelection();
    if(!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const content = range.extractContents();
    const el = document.createElement(tagName);
    for(const k in attrs) el.setAttribute(k, attrs[k]);
    el.appendChild(content);
    range.insertNode(el);
    range.selectNode(el);
    sel.removeAllRanges();
    sel.addRange(range);
    syncToolbar();
  }

  // small sanitize helper for final use when saving
  // (already implemented: getSanitizedHTML)

  // small helper: close modals on ESC or click outside
  document.addEventListener('keydown', (e)=> {
    if(e.key === 'Escape'){
      hideModal(linkModal); hideModal(tableModal);
    }
  });
  // click outside to close
  document.addEventListener('click', (e)=>{
    if(!linkModal.classList.contains('hidden') && !linkModal.contains(e.target) && !e.target.closest('#linkBtn')) hideModal(linkModal);
    if(!tableModal.classList.contains('hidden') && !tableModal.contains(e.target) && !e.target.closest('#insertTable')) hideModal(tableModal);
  });

  // initial sync
  setTimeout(()=>{ updateCounts(); syncToolbar(); },60);

})();

// Move modals to document.body so they overlay the page reliably
document.addEventListener('DOMContentLoaded', ()=> {
  const linkModal = document.getElementById('linkModal');
  const tableModal = document.getElementById('tableModal');
  if(linkModal && linkModal.parentNode !== document.body) document.body.appendChild(linkModal);
  if(tableModal && tableModal.parentNode !== document.body) document.body.appendChild(tableModal);
});
