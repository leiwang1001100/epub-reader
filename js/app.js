'use strict';
/********** Elements **********/
// toLibraryBtn removed — sidebar 🏠 handles navigation back to library
const importInput=document.getElementById('importInput');
const importBtn=document.getElementById('importBtn');
const libraryEl=document.getElementById('library');
const gridEl=document.getElementById('grid');
const libHint=document.getElementById('libHint');
const collectionsView=document.getElementById('collectionsView');
const collectionsGrid=document.getElementById('collectionsGrid');
const newCollectionBtn=document.getElementById('newCollectionBtn');
const collectionDetail=document.getElementById('collectionDetail');
const detailGrid=document.getElementById('detailGrid');
const detailTitle=document.getElementById('detailTitle');
const backToCollections=document.getElementById('backToCollections');
const sideHome=document.getElementById('sideHome');
const sideCollections=document.getElementById('sideCollections');
const viewerEl=document.getElementById('viewer');
const tocEl=document.getElementById('toc');
const metaEl=document.getElementById('meta');
const searchBox=document.getElementById('searchBox');
const prevBtn=document.getElementById('prev');
const nextBtn=document.getElementById('next');
const tocToggle=document.getElementById('tocToggle');
const fontMinus=document.getElementById('fontMinus');
const fontPlus=document.getElementById('fontPlus');
const bgToggle=document.getElementById('bgToggle');
const controls=document.getElementById('controls');
const statusEl=document.getElementById('status');
const progressBar=document.getElementById('progressBar');
const progressFill=document.getElementById('progressFill');
const progressLabel=document.getElementById('progressLabel');

/********** Pagination state **********/
let libPageSize=parseInt(localStorage.getItem('epub_libPageSize')||'20',10);
let libPage=1;
let colPageSize=parseInt(localStorage.getItem('epub_colPageSize')||'20',10);
let colPage=1;

/********** Dark theme **********/
function initTheme(){
  const toggle=document.getElementById('themeToggle');
  // Detect saved preference or system preference
  const saved=localStorage.getItem('epub_theme');
  const prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved ? saved==='dark' : prefersDark;
  applyTheme(isDark);

  toggle.onclick=()=>{
    const nowDark=!document.documentElement.classList.contains('dark');
    applyTheme(nowDark);
    localStorage.setItem('epub_theme', nowDark?'dark':'light');
  };

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e=>{
    if(!localStorage.getItem('epub_theme')) applyTheme(e.matches);
  });
}

function applyTheme(dark){
  document.documentElement.classList.toggle('dark', dark);
  const toggle=document.getElementById('themeToggle');
  if(toggle){ toggle.title=dark?'Switch to light mode':'Switch to dark mode'; toggle.setAttribute('aria-label', dark?'Switch to light mode':'Switch to dark mode'); }
}

/********** Sidebar navigation **********/
function setSidebarActive(view){
  sideHome.classList.toggle('active', view==='home');
  sideCollections.classList.toggle('active', view==='collections');
}

function renderLibrary_hide(){
  libraryEl.style.display='none';
  document.body.classList.add('mode-library');
}

sideHome.onclick=async()=>{ await openDB(); if(typeof rendition!=='undefined'&&rendition) await unloadBook(); collectionsView.style.display='none'; renderLibrary(); setSidebarActive('home'); };
sideCollections.onclick=async()=>{ await openDB(); if(typeof rendition!=='undefined'&&rendition) await unloadBook(); renderLibrary_hide(); renderCollections(); setSidebarActive('collections'); };

/********** Pagination event wiring **********/
// Home pagination
document.querySelectorAll('.page-size-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    libPageSize=parseInt(btn.dataset.size);
    localStorage.setItem('epub_libPageSize', libPageSize);
    libPage=1;
    renderLibrary();
  });
});
document.getElementById('libPrevBtn').addEventListener('click',()=>{ libPage--; renderLibrary(); });
document.getElementById('libNextBtn').addEventListener('click',()=>{ libPage++; renderLibrary(); });

// Collections pagination
document.querySelectorAll('.col-size-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    colPageSize=parseInt(btn.dataset.size);
    localStorage.setItem('epub_colPageSize', colPageSize);
    colPage=1;
    renderCollections();
  });
});
document.getElementById('colPrevBtn').addEventListener('click',()=>{ colPage--; renderCollections(); });
document.getElementById('colNextBtn').addEventListener('click',()=>{ colPage++; renderCollections(); });

/********** Library search/sort/filter **********/
document.getElementById('libSearch').addEventListener('input',()=>{ libPage=1; renderLibrary(); });
document.getElementById('libColFilter').addEventListener('change',()=>{ libPage=1; renderLibrary(); });
document.getElementById('libSort').addEventListener('change',()=>{ libPage=1; renderLibrary(); });

// toLibraryBtn removed — sidebar 🏠 handles navigation back to library

/********** Boot **********/
window.addEventListener('error', e=>console.error('Error:', e.message));
window.addEventListener('unhandledrejection', e=>console.error('Promise rejection:', e.reason));

(async function init(){
  try{
    initTheme();
    await openDB();
    initImport();
    initCollections();
    await renderLibrary();
  }catch(err){
    console.error('Init failed:', err);
    const msg=escapeHtml(String(err?.message||err));
    document.body.innerHTML=`<div style="padding:2rem;font-family:system-ui;color:#b91c1c;">
      <h2>⚠️ Failed to initialise app</h2>
      <p>${msg}</p>
      <p>Try opening the browser console for more details.</p>
    </div>`;
  }
})();
