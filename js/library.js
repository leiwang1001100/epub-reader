'use strict';
/********** In-memory cache **********/
let _booksCache=null;
let _colsCache=null;

function invalidateBooksCache(){ _booksCache=null; }
function invalidateColsCache(){ _colsCache=null; }
function invalidateAllCache(){ _booksCache=null; _colsCache=null; }

async function getCachedBooks(){ if(!_booksCache) _booksCache=await idbGetAll(); return _booksCache; }
async function getCachedCols(){ if(!_colsCache) _colsCache=await idbGetAllCols(); return _colsCache; }

/********** Library **********/
async function renderLibrary(){
  document.body.classList.add('mode-library');
  libraryEl.style.display='block';
  collectionsView.style.display='none';
  viewerEl.style.display='none';
  controls.style.display='none';
  // toLibraryBtn removed
  searchBox.style.display='none';
  importBtn.style.display='inline-block';
  progressBar.style.display='none';
  progressLabel.style.display='none';
  setSidebarActive('home');
  metaEl.textContent=''; statusEl.textContent='';

  // Populate collection filter dropdown + fetch all books (from cache if available)
  const [allCols, allBooks]=await Promise.all([getCachedCols(), getCachedBooks()]);
  const prevColVal=libColFilter.value;
  const optionsHtml = [
    '<option value="">📁 All Collections</option>',
    '<option value="__none__">🚫 Uncategorised</option>',
    ...allCols.sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`)
  ].join('');
  libColFilter.innerHTML = optionsHtml;
  libColFilter.value=prevColVal||'';

  // Apply search/sort/filter
  let filteredBooks=[...allBooks];

  // Filter by collection
  const colFilter=libColFilter.value;
  if(colFilter==='__none__') filteredBooks=filteredBooks.filter(b=>!b.collectionId);
  else if(colFilter) filteredBooks=filteredBooks.filter(b=>b.collectionId===colFilter);

  // Filter by status (in progress / finished)
  if(statusFilter==='progress') filteredBooks=filteredBooks.filter(b=>b.lastCfi && !b.finished);
  else if(statusFilter==='finished') filteredBooks=filteredBooks.filter(b=>b.finished);

  // Filter by search
  const q=(libSearch.value||'').trim().toLowerCase();
  if(q) filteredBooks=filteredBooks.filter(b=>(b.title||'').toLowerCase().includes(q)||(b.author||'').toLowerCase().includes(q));

  // Sort
  const sort=libSort.value||'newest';
  if(sort==='newest') filteredBooks.sort((a,b)=>b.createdAt-a.createdAt);
  else if(sort==='oldest') filteredBooks.sort((a,b)=>a.createdAt-b.createdAt);
  else if(sort==='title-az') filteredBooks.sort((a,b)=>(a.title||'').localeCompare(b.title||''));
  else if(sort==='title-za') filteredBooks.sort((a,b)=>(b.title||'').localeCompare(a.title||''));

  const totalPages=Math.max(1,Math.ceil(filteredBooks.length/libPageSize));
  libPage=Math.min(libPage,totalPages);
  const start=(libPage-1)*libPageSize;
  const books=filteredBooks.slice(start, start+libPageSize);

  // Update pagination UI
  libPageInfo.textContent=`Page ${libPage} of ${totalPages}`;
  libPrevBtn.disabled=libPage<=1;
  libNextBtn.disabled=libPage>=totalPages;

  // Sync active page size button
  document.querySelectorAll('.page-size-btn').forEach(btn=>{
    btn.classList.toggle('active', parseInt(btn.dataset.size)===libPageSize);
  });

  gridEl.innerHTML='';
  const total=filteredBooks.length;
  if(total){
    const inProgressCount=allBooks.filter(b=>b.lastCfi && !b.finished).length;
    const finishedCount=allBooks.filter(b=>b.finished).length;
    libHint.innerHTML='';

    const totalSpan=document.createElement('span');
    totalSpan.textContent=`📚 ${allBooks.length} total`;
    totalSpan.style.cssText='margin-right:8px;';

    const progSpan=document.createElement('span');
    progSpan.textContent=`📖 ${inProgressCount} in progress`;
    if(inProgressCount>0){
      progSpan.style.cssText=`cursor:pointer;margin-right:8px;font-weight:${statusFilter==='progress'?'700':'400'};text-decoration:${statusFilter==='progress'?'underline':'none'};color:${statusFilter==='progress'?'#4f46e5':'inherit'};`;
      progSpan.onclick=()=>{ statusFilter=statusFilter==='progress'?'':'progress'; libPage=1; renderLibrary(); };
    } else {
      progSpan.style.cssText='margin-right:8px;color:var(--text-muted);cursor:default;opacity:0.5;';
    }

    const finSpan=document.createElement('span');
    finSpan.textContent=`✅ ${finishedCount} finished`;
    if(finishedCount>0){
      finSpan.style.cssText=`cursor:pointer;font-weight:${statusFilter==='finished'?'700':'400'};text-decoration:${statusFilter==='finished'?'underline':'none'};color:${statusFilter==='finished'?'#16a34a':'inherit'};`;
      finSpan.onclick=()=>{ statusFilter=statusFilter==='finished'?'':'finished'; libPage=1; renderLibrary(); };
    } else {
      finSpan.style.cssText='color:var(--text-muted);cursor:default;opacity:0.5;';
    }

    const sep=()=>{ const s=document.createElement('span'); s.textContent='  ·  '; s.style.color='var(--text-muted)'; return s; };
    libHint.append(totalSpan, sep(), progSpan, sep(), finSpan);
  } else {
    libHint.textContent=q||colFilter ? 'No books match your search.' : 'Tip: Click "Import EPUBs" to add books to your library.';
  }

  for(const r of books){
    // Delete button
    const delBtn=document.createElement('button'); delBtn.className='btn-orange'; delBtn.textContent='✖'; delBtn.title='Delete book';
    delBtn.onclick=async()=>{
      if(!confirm(`Delete "${r.title||'this book'}"?\nThis cannot be undone.`)) return;
      await idbDelete(r.id); invalidateBooksCache(); renderLibrary();
    };

    const {card, moreBtn}=createBookCard(r, openBookFromDB, [delBtn]);

    // Add file size + date info
    const small=document.createElement('div'); small.className='small';
    small.textContent=`${humanSize(r.size||0)} · Added ${new Date(r.createdAt).toLocaleDateString()}`;
    card.querySelector('.meta').insertBefore(small, card.querySelector('.row'));

    moreBtn.onclick=(e)=>{ e.stopPropagation(); showMoreMenu(moreBtn, r, card); };
    gridEl.appendChild(card);
  }
}

/********** Import **********/
/********** Hash backfill for existing books **********/
async function backfillHashes(){
  const books=await idbGetAll();
  const missing=books.filter(b=>!b.hash && b.bufBlob);
  if(!missing.length) return;
  console.log(`Backfilling hashes for ${missing.length} book(s)...`);
  for(const b of missing){
    try{
      const buf=await b.bufBlob.arrayBuffer();
      b.hash=await sha256(buf);
      await idbAddBook(b);
    }catch(e){ console.warn(`Hash backfill failed for "${b.title}":`, e); }
  }
  invalidateBooksCache();
  console.log('Hash backfill complete.');
}

function initImport(){
  importBtn.onclick=()=>importInput.click();
  importInput.addEventListener('change', async ()=>{
    const files=Array.from(importInput.files||[]); if(!files.length)return;
    await openDB();
    const existingBooks=await idbGetAll();
    let imported=0, skipped=0, failed=0;
    const total=files.length;

    try{
      for(let i=0;i<files.length;i++){
        const f=files[i];
        statusEl.textContent=`Importing ${i+1}/${total}: ${f.name}…`;
        try{
          const buf=await f.arrayBuffer();
          const hash=await sha256(buf);

          // Check for duplicate by hash
          const duplicate=existingBooks.find(b=>b.hash===hash);
          if(duplicate){
            const replace=confirm(`"${duplicate.title||f.name}" is already in your library.\n\nDo you want to replace it?`);
            if(replace){
              await idbDelete(duplicate.id);
            } else {
              skipped++;
              continue;
            }
          }

          const rec=await extractBookRecord(buf, f.name, f.size);
          await idbAddBook(rec);
          imported++;
        }catch(e){
          console.error(`Failed to import "${f.name}":`, e);
          failed++;
        }
      }
    }finally{
      statusEl.textContent='';
      const msg=[];
      if(imported) msg.push(`${imported} book${imported!==1?'s':''} imported`);
      if(skipped) msg.push(`${skipped} skipped`);
      if(failed) msg.push(`${failed} failed`);
      if(msg.length) flashStatus(msg.join(', '));
      invalidateAllCache();
      libPage=1;
      await renderLibrary();
      importInput.value='';
    }
  });
}

async function extractBookRecord(buf,filename,size){
  const b=ePub(buf,{openAs:'binary'}); await b.ready;
  const md=await b.loaded.metadata.catch(()=>({}));
  const title=md?.title || filename.replace(/\.epub$/i,'');
  const author=md?.creator || '';
  let coverBlob=null;
  try{
    if(b.coverUrl){
      const url=await b.coverUrl();
      if(url?.startsWith('blob:')){ const res=await fetch(url); coverBlob=await res.blob(); }
      else if(url){ const file=b.archive?.zip?.file(url)||b.archive?.zip?.file(decodeURI(url)); if(file) coverBlob=await file.async('blob'); }
    }
    if(!coverBlob){
      const si=b.spine.spineItems[0];
      if(si){
        try{
          await si.load(b.load.bind(b));
          const doc=si.document;
          const img=doc&&doc.querySelector('img[src]');
          if(img){
            const src=img.getAttribute('src');
            if(src && !src.startsWith('data:')){
              const href=resolveRelative(src, si.href);
              if(href){
                const file=b.archive?.zip?.file(href)||b.archive?.zip?.file(decodeURI(href));
                if(file) coverBlob=await file.async('blob');
              }
            }
          }
          si.unload();
        }catch(e){ console.warn('Cover fallback failed:',e); try{ si.unload(); }catch{} }
      }
    }
  }catch(e){ console.warn('Cover extraction failed:',e); }
  try{ await b.destroy(); }catch{}
  const hash=await sha256(buf);
  return {
    id: crypto.randomUUID(),
    title, author, size,
    filename,
    hash,
    bufBlob: new Blob([buf]),
    coverBlob,
    createdAt: Date.now(),
    lastCfi: null,
    collectionId: null
  };
}
