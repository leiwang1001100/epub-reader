'use strict';
/********** Library **********/
async function renderLibrary(){
  document.body.classList.add('mode-library');
  libraryEl.style.display='block';
  collectionsView.style.display='none';
  viewerEl.style.display='none';
  controls.style.display='none';
  toLibraryBtn.style.display='none';
  searchBox.style.display='none';
  importBtn.style.display='inline-block';
  progressBar.style.display='none';
  progressLabel.style.display='none';
  setSidebarActive('home');
  metaEl.textContent=''; statusEl.textContent='';

  // Populate collection filter dropdown + fetch all books in parallel
  const libColFilter=document.getElementById('libColFilter');
  const libSearch=document.getElementById('libSearch');
  const libSort=document.getElementById('libSort');
  const [allCols, allBooks]=await Promise.all([idbGetAllCols(), idbGetAll()]);
  const prevColVal=libColFilter.value;
  libColFilter.innerHTML='<option value="">📁 All Collections</option>';
  libColFilter.innerHTML+='<option value="__none__">🚫 Uncategorised</option>';
  allCols.sort((a,b)=>a.name.localeCompare(b.name)).forEach(c=>{
    libColFilter.innerHTML+=`<option value="${c.id}">${escapeHtml(c.name)}</option>`;
  });
  libColFilter.value=prevColVal||'';

  // Apply search/sort/filter
  let filteredBooks=[...allBooks];

  // Filter by collection
  const colFilter=libColFilter.value;
  if(colFilter==='__none__') filteredBooks=filteredBooks.filter(b=>!b.collectionId);
  else if(colFilter) filteredBooks=filteredBooks.filter(b=>b.collectionId===colFilter);

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
  const libPageInfo=document.getElementById('libPageInfo');
  const libPrevBtn=document.getElementById('libPrevBtn');
  const libNextBtn=document.getElementById('libNextBtn');
  libPageInfo.textContent=`Page ${libPage} of ${totalPages}`;
  libPrevBtn.disabled=libPage<=1;
  libNextBtn.disabled=libPage>=totalPages;

  // Sync active page size button
  document.querySelectorAll('.page-size-btn').forEach(btn=>{
    btn.classList.toggle('active', parseInt(btn.dataset.size)===libPageSize);
  });

  gridEl.innerHTML='';
  const total=filteredBooks.length;
  libHint.textContent = total
    ? `Showing ${Math.min(start+1, total)}–${Math.min(start+libPageSize, total)} of ${total} book${total!==1?'s':''}`
    : (q||colFilter ? 'No books match your search.' : 'Tip: Click "Import EPUBs" to add books to your library.');

  for(const r of books){
    const card=document.createElement('div'); card.className='card';
    const covWrap=document.createElement('div'); covWrap.className='coverWrap';
    const img=document.createElement('img'); img.className='cover'; img.alt=r.title||'Book cover';
    if(r.coverBlob){
      const blobUrl=URL.createObjectURL(r.coverBlob);
      img.src=blobUrl;
      img.onload=()=>URL.revokeObjectURL(blobUrl);
      img.onerror=()=>URL.revokeObjectURL(blobUrl);
    }
    covWrap.appendChild(img);

    const meta=document.createElement('div'); meta.className='meta';
    const title=document.createElement('div'); title.className='title'; title.textContent=r.title||'Untitled'; title.title=r.title||'Untitled';
    const author=document.createElement('div'); author.className='author'; author.textContent=r.author||''; author.title=r.author||'';
    const small=document.createElement('div'); small.className='small';
    small.textContent=`${humanSize(r.size||0)} · Added ${new Date(r.createdAt).toLocaleDateString()}`;

    const row=document.createElement('div'); row.className='row';
    const openBtn=document.createElement('button'); openBtn.className='btn-blue'; openBtn.textContent=r.lastCfi?'Continue':'Read';
    openBtn.onclick=()=>openBookFromDB(r.id);
    const delBtn=document.createElement('button'); delBtn.className='btn-orange'; delBtn.textContent='✖'; delBtn.title='Delete book';
    delBtn.onclick=async()=>{
      if(!confirm(`Delete "${r.title || 'this book'}"?\nThis cannot be undone.`)) return;
      await idbDelete(r.id); renderLibrary();
    };
    row.append(openBtn, delBtn);

    // ··· button pinned to top-right of card
    const moreBtn=document.createElement('button'); moreBtn.className='btn-more'; moreBtn.textContent='···';
    moreBtn.title='More options';
    moreBtn.onclick=(e)=>{ e.stopPropagation(); showMoreMenu(moreBtn, r, card); };

    meta.append(title,author,small,row);
    card.append(covWrap, meta, moreBtn);
    gridEl.appendChild(card);
  }
}

/********** Import **********/
function initImport(){
  importBtn.onclick=()=>importInput.click();
  importInput.addEventListener('change', async ()=>{
    const files=Array.from(importInput.files||[]); if(!files.length)return;
    await openDB(); statusEl.textContent='Importing…';
    for(const f of files){
      const buf=await f.arrayBuffer();
      const rec=await extractBookRecord(buf,f.name,f.size);
      await idbAddBook(rec);
    }
    statusEl.textContent='';
    libPage=1;
    await renderLibrary();
    importInput.value='';
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
  return {
    id: crypto.randomUUID(),
    title, author, size,
    filename,
    bufBlob: new Blob([buf]),
    coverBlob,
    createdAt: Date.now(),
    lastCfi: null,
    collectionId: null
  };
}
