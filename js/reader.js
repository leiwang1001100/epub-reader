'use strict';
/********** Reader **********/
let book, rendition, locations;
let currentBookId=null;
let _keyHandler=null;
let _resizeHandler=null;

const bgModes=['paper','sepia','dark'];
const BG_COLORS={paper:{bg:'#fdfaf3',fg:'#2b2b2b'},sepia:{bg:'#f4ecd8',fg:'#3b2f1a'},dark:{bg:'#111',fg:'#eee'}};

const FONT_SIZE_MIN=50;
const FONT_SIZE_MAX=200;
const FONT_SIZE_STEP=10;
const LOCATIONS_SAMPLE_SIZE=1000;

let fontSize=parseInt(localStorage.getItem('epub_fontSize')||'100',10);
let bgIdx=bgModes.indexOf(localStorage.getItem('epub_bgMode')||'paper');
if(bgIdx<0) bgIdx=0;
let tocVisible=true;

function setBackgroundForContents(c, mode){
  const {bg,fg}=BG_COLORS[mode]||BG_COLORS.paper;
  const el=c.document?.documentElement;
  if(el){ el.style.background=bg; el.style.color=fg; }
  try{
    c.addStylesheetRules({
      'html,body':{ background:`${bg} !important`, color:`${fg} !important` },
      'p,div,span,li,td,th,h1,h2,h3,h4,h5,h6':{ color:`${fg} !important` }
    });
  }catch{}
}

function applyBackground(mode){
  if(!rendition)return;
  localStorage.setItem('epub_bgMode', mode);
  rendition.getContents().forEach(c=>setBackgroundForContents(c,mode));
  bgToggle.textContent=`Background: ${mode[0].toUpperCase()}${mode.slice(1)}`;
}

function applyFontSize(){
  localStorage.setItem('epub_fontSize', fontSize);
  try { rendition.themes.fontSize(fontSize+'%'); } catch {}
  try {
    rendition.getContents().forEach(c=>{
      c.addStylesheetRules({
        'html, body, p, div, span': {
          'font-size': fontSize+'% !important',
          'line-height': '1.6'
        }
      });
    });
  } catch {}
}

function updateTocVisibility(){
  if(!rendition) return;
  if(tocVisible){ tocEl.classList.remove('hidden'); tocToggle.textContent='Hide TOC'; }
  else { tocEl.classList.add('hidden'); tocToggle.textContent='Show TOC'; }
  requestAnimationFrame(()=>rendition.resize());
}

function buildTOC(nav){
  tocEl.innerHTML='';
  const ul=document.createElement('ul');
  nav.forEach(item=>{
    const li=document.createElement('li');
    const a=document.createElement('a');
    a.textContent=(item.label||'').trim()||'(untitled)';
    a.href='#';
    a.onclick=(e)=>{ e.preventDefault(); rendition.display(item.href); };
    li.appendChild(a);
    if(item.subitems?.length){
      const sub=document.createElement('ul');
      item.subitems.forEach(s=>{
        const sli=document.createElement('li');
        const sa=document.createElement('a');
        sa.textContent=(s.label||'').trim()||'(untitled)';
        sa.href='#';
        sa.onclick=(e)=>{ e.preventDefault(); rendition.display(s.href); };
        sli.appendChild(sa); sub.appendChild(sli);
      });
      li.appendChild(sub);
    }
    ul.appendChild(li);
  });
  tocEl.appendChild(ul);
}

function wirePaging(){
  prevBtn.onclick=()=>rendition.prev();
  nextBtn.onclick=()=>rendition.next();

  if(_keyHandler) document.removeEventListener('keydown', _keyHandler);
  _keyHandler=(e)=>{
    if(viewerEl.style.display!=='block') return;
    let handled=false;
    switch(e.key){
      case 'ArrowLeft': case 'PageUp': rendition.prev(); handled=true; break;
      case 'ArrowRight': case 'PageDown': case ' ': rendition.next(); handled=true; break;
      case 't': case 'T': tocVisible=!tocVisible; updateTocVisibility(); handled=true; break;
      case 'b': case 'B': bgIdx=(bgIdx+1)%bgModes.length; applyBackground(bgModes[bgIdx]); applyFontSize(); handled=true; break;
      case '+': fontSize=Math.min(fontSize+FONT_SIZE_STEP,FONT_SIZE_MAX); applyFontSize(); handled=true; break;
      case '=': if(e.shiftKey){fontSize=Math.min(fontSize+FONT_SIZE_STEP,FONT_SIZE_MAX); applyFontSize(); handled=true;} break;
      case '-': case '_': fontSize=Math.max(fontSize-FONT_SIZE_STEP,FONT_SIZE_MIN); applyFontSize(); handled=true; break;
    }
    if(handled){ e.preventDefault(); e.stopPropagation(); }
  };
  document.addEventListener('keydown', _keyHandler);
}

async function unloadBook(){
  if(_keyHandler){ document.removeEventListener('keydown', _keyHandler); _keyHandler=null; }
  if(_resizeHandler){ window.removeEventListener('resize', _resizeHandler); _resizeHandler=null; }
  try{ await rendition?.destroy(); }catch{}
  try{ await book?.destroy(); }catch{}
  book=null; rendition=null; locations=null;
  controls.style.display='none';
  // sidebar was never hidden, nothing to restore
}

async function openBookFromDB(id){
  await openDB();
  const rec=await idbGet(id);
  if(!rec) return alert('Book not found.');
  currentBookId=id;

  await unloadBook();

  // Switch UI to Reader
  document.body.classList.remove('mode-library');
  libraryEl.style.display='none';
  collectionsView.style.display='none';
  // sidebar stays visible during reading
  viewerEl.style.display='block';
  controls.style.display='flex';
  // toLibraryBtn removed
  searchBox.style.display='inline-block';
  importBtn.style.display='none';
  progressBar.style.display='block';
  progressLabel.style.display='block';
  progressFill.style.width='0%';
  progressLabel.textContent='';

  const buf=await rec.bufBlob.arrayBuffer();
  book=ePub(buf,{openAs:'binary'}); await book.ready;

  rendition=book.renderTo('rendition',{ width:'100%', height:'100%', manager:'continuous', flow:'paginated', spread:'none' });
  await rendition.display(rec.lastCfi || undefined);

  rendition.themes.register('reader-base',{
    'html, body': { margin:0, padding:0 },
    'img, svg': { maxWidth:'100%', height:'auto' }
  });
  rendition.themes.select('reader-base');

  applyBackground(bgModes[bgIdx]);
  applyFontSize();

  const md=await book.loaded.metadata.catch(()=>({}));
  metaEl.textContent=`${md?.title||rec.title||''}${md?.creator?' · '+md.creator:''}`;

  // TOC
  const nav=await book.loaded.navigation.catch(()=>({toc:[]}));
  buildTOC(nav.toc||[]);
  updateTocVisibility();

  // Search
  searchBox.onkeydown=async(e)=>{
    if(e.key!=='Enter') return;
    const q=searchBox.value.trim(); if(!q) return;
    flashStatus('Searching…');
    try{
      const results=await Promise.all(
        book.spine.spineItems.map(i=>i.load(book.load.bind(book)).then(()=>i.find(q)).finally(()=>i.unload()))
      );
      const flat=results.flat();
      if(flat.length){ await rendition.display(flat[0].cfi); flashStatus(`${flat.length} match${flat.length>1?'es':''} found`); }
      else flashStatus('No matches found');
    }catch(e){ console.error(e); flashStatus('Search error'); }
  };

  // Scroll toggle
  let scrollToggle=document.getElementById('scrollToggle');
  if(!scrollToggle){
    scrollToggle=document.createElement('button');
    scrollToggle.id='scrollToggle'; scrollToggle.className='btn-blue';
    scrollToggle.textContent='Scroll mode';
    controls.appendChild(scrollToggle);
  }
  let isScrolled=false;
  scrollToggle.onclick=()=>{
    isScrolled=!isScrolled;
    rendition.flow(isScrolled?'scrolled-doc':'paginated');
    scrollToggle.textContent=isScrolled?'Page mode':'Scroll mode';
  };

  // Resize
  if(_resizeHandler) window.removeEventListener('resize', _resizeHandler);
  _resizeHandler=()=>rendition.resize();
  window.addEventListener('resize', _resizeHandler);

  wirePaging();

  // Font size buttons
  fontPlus.onclick=()=>{ fontSize=Math.min(fontSize+FONT_SIZE_STEP,FONT_SIZE_MAX); applyFontSize(); };
  fontMinus.onclick=()=>{ fontSize=Math.max(fontSize-FONT_SIZE_STEP,FONT_SIZE_MIN); applyFontSize(); };

  bgToggle.onclick=()=>{
    if(!rendition) return;
    bgIdx=(bgIdx+1)%bgModes.length;
    applyBackground(bgModes[bgIdx]);
    applyFontSize();
  };

  tocToggle.onclick=()=>{ tocVisible=!tocVisible; updateTocVisibility(); };

  // Progress + persist CFI
  try{ locations=await book.locations.generate(LOCATIONS_SAMPLE_SIZE); }catch{}
  rendition.on('relocated', async(loc)=>{
    try{
      const pct=book.locations?.percentageFromCfi?.(loc.start.cfi)||0;
      const pctRounded=Math.round(pct*100);
      document.title=`${pctRounded}% · ${md?.title||rec.title||'EPUB Reader'}`;
      progressFill.style.width=`${pctRounded}%`;
      progressLabel.textContent=`${pctRounded}%`;
      const r=await idbGet(currentBookId);
      if(r){ r.lastCfi=loc.start.cfi; await idbAddBook(r); }
    }catch{}
  });

  rendition.on('rendered', ()=>{
    applyBackground(bgModes[bgIdx]);
    applyFontSize();
    updateTocVisibility();
  });
}
