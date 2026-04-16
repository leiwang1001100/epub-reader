/********** Collections **********/
async function renderCollections(){
  collectionsView.style.display='block';
  collectionDetail.style.display='none';
  collectionsGrid.style.display='grid';
  const [allCols, books] = await Promise.all([idbGetAllCols(), idbGetAll()]);
  collectionsGrid.innerHTML='';
  if(allCols.length===0){
    collectionsGrid.innerHTML='<p style="color:var(--muted)">No collections yet. Click <b>＋ New Collection</b> to create one.</p>';
    return;
  }

  const sortedCols=allCols.sort((a,b)=>a.name.localeCompare(b.name));
  const totalPages=Math.max(1,Math.ceil(sortedCols.length/colPageSize));
  colPage=Math.min(colPage,totalPages);
  const start=(colPage-1)*colPageSize;
  const cols=sortedCols.slice(start, start+colPageSize);

  // Update pagination UI
  const colPageInfo=document.getElementById('colPageInfo');
  const colPrevBtn=document.getElementById('colPrevBtn');
  const colNextBtn=document.getElementById('colNextBtn');
  colPageInfo.textContent=`Page ${colPage} of ${totalPages}`;
  colPrevBtn.disabled=colPage<=1;
  colNextBtn.disabled=colPage>=totalPages;

  // Sync active page size button
  document.querySelectorAll('.col-size-btn').forEach(btn=>{
    btn.classList.toggle('active', parseInt(btn.dataset.size)===colPageSize);
  });

  for(const col of cols){
    const colBooks=books.filter(b=>b.collectionId===col.id).sort((a,b)=>b.createdAt-a.createdAt);
    const count=colBooks.length;
    const card=document.createElement('div'); card.className='col-card';

    // Show cover of most recently added book, or folder emoji if empty
    const icon=document.createElement('div'); icon.className='col-icon';
    const latestBook=colBooks[0];
    if(latestBook?.coverBlob){
      const img=document.createElement('img');
      img.src=URL.createObjectURL(latestBook.coverBlob);
      img.style.cssText='width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:4px;';
      icon.appendChild(img);
    } else {
      icon.textContent='📁';
    }

    const name=document.createElement('div'); name.className='col-name'; name.textContent=col.name;
    const cnt=document.createElement('div'); cnt.className='col-count'; cnt.textContent=`${count} book${count!==1?'s':''}`;
    const row=document.createElement('div'); row.className='row';
    const openBtn=document.createElement('button'); openBtn.className='btn-blue'; openBtn.textContent='Open';
    openBtn.onclick=(e)=>{ e.stopPropagation(); openCollectionDetail(col); };
    const delBtn=document.createElement('button'); delBtn.className='btn-orange'; delBtn.textContent='Delete'; delBtn.title='Delete collection';
    delBtn.onclick=async(e)=>{
      e.stopPropagation();
      if(!confirm(`Delete collection "${escapeHtml(col.name)}"?\nBooks will remain in your library.`)) return;
      const toUpdate=books.filter(b=>b.collectionId===col.id);
      await Promise.all(toUpdate.map(b=>{ b.collectionId=null; return idbAddBook(b); }));
      await idbDeleteCol(col.id);
      renderCollections();
    };
    row.append(openBtn, delBtn);
    card.append(icon, name, cnt, row);
    card.ondblclick=()=>openCollectionDetail(col);
    collectionsGrid.appendChild(card);
  }
}

async function openCollectionDetail(col){
  collectionDetail.style.display='block';
  collectionsGrid.style.display='none';
  detailTitle.textContent=`📁 ${col.name}`;
  detailGrid.innerHTML='';
  const books=(await idbGetAll()).filter(b=>b.collectionId===col.id).sort((a,b)=>b.createdAt-a.createdAt);
  if(!books.length){
    detailGrid.innerHTML='<p style="color:var(--muted)">No books in this collection yet.</p>';
    return;
  }
  for(const r of books){
    const card=document.createElement('div'); card.className='card';
    const covWrap=document.createElement('div'); covWrap.className='coverWrap';
    const img=document.createElement('img'); img.className='cover';
    if(r.coverBlob) img.src=URL.createObjectURL(r.coverBlob); else img.alt='No cover';
    covWrap.appendChild(img);
    const meta=document.createElement('div'); meta.className='meta';
    const title=document.createElement('div'); title.className='title'; title.textContent=r.title||'Untitled'; title.title=r.title||'Untitled';
    const author=document.createElement('div'); author.className='author'; author.textContent=r.author||''; author.title=r.author||'';
    const row=document.createElement('div'); row.className='row';
    const readBtn=document.createElement('button'); readBtn.className='btn-blue'; readBtn.textContent=r.lastCfi?'Continue':'Read';
    readBtn.onclick=()=>openBookFromDB(r.id);
    row.append(readBtn);

    const moreBtn=document.createElement('button'); moreBtn.className='btn-more'; moreBtn.textContent='···';
    moreBtn.title='More options';
    moreBtn.onclick=(e)=>{ e.stopPropagation(); showCollectionDetailMenu(moreBtn, r, card, col); };

    meta.append(title, author, row);
    card.append(covWrap, meta, moreBtn);
    detailGrid.appendChild(card);
  }
}

async function showCollectionDetailMenu(btn, book, card, col){
  closeMenu();
  const menu=document.createElement('div'); menu.className='more-menu';
  menu.onclick=e=>e.stopPropagation();

  const hdr=document.createElement('div');
  hdr.style.cssText='padding:4px 14px;font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em;';
  hdr.textContent='Options';
  menu.appendChild(hdr);

  const removeItem=document.createElement('div'); removeItem.className='more-menu-item';
  removeItem.innerHTML=`<span>✖</span><span>Remove from collection</span>`;
  removeItem.onclick=async()=>{ book.collectionId=null; await idbAddBook(book); closeMenu(); openCollectionDetail(col); };
  menu.appendChild(removeItem);

  card.appendChild(menu);
  activeMenu=menu;
}

/********** More menu for Home book cards **********/
let activeMenu=null;
function closeMenu(){ if(activeMenu){ activeMenu.remove(); activeMenu=null; } }

async function showMoreMenu(btn, book, container){
  closeMenu();
  const cols=await idbGetAllCols();
  const menu=document.createElement('div'); menu.className='more-menu';
  menu.onclick=e=>e.stopPropagation();

  const hdr=document.createElement('div');
  hdr.style.cssText='padding:4px 14px;font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em;';
  hdr.textContent='Add to Collection';
  menu.appendChild(hdr);

  // Scrollable list of collections (capped with scroll)
  const scrollWrap=document.createElement('div'); scrollWrap.className='more-menu-scroll';

  const noneItem=document.createElement('div'); noneItem.className='more-menu-item'+(book.collectionId===null?' selected':'');
  if(book.collectionId===null) noneItem.style.color='#4f46e5';
  noneItem.innerHTML=`<span>🚫</span><span>None</span>`;
  noneItem.onclick=async()=>{ book.collectionId=null; await idbAddBook(book); closeMenu(); renderLibrary(); };
  scrollWrap.appendChild(noneItem);

  if(cols.length){
    for(const col of cols.sort((a,b)=>a.name.localeCompare(b.name))){
      const item=document.createElement('div'); item.className='more-menu-item';
      if(book.collectionId===col.id) item.style.color='#4f46e5';
      item.innerHTML=`<span>📁</span><span>${escapeHtml(col.name)}${book.collectionId===col.id?' ✓':''}</span>`;
      item.onclick=async()=>{ book.collectionId=col.id; await idbAddBook(book); closeMenu(); renderLibrary(); };
      scrollWrap.appendChild(item);
    }
  } else {
    const empty=document.createElement('div'); empty.className='more-menu-item';
    empty.style.cssText='color:var(--muted);cursor:default;';
    empty.innerHTML=`<span>📭</span><span>No collections yet</span>`;
    scrollWrap.appendChild(empty);
  }
  menu.appendChild(scrollWrap);

  const divider=document.createElement('div');
  divider.style.cssText='border-top:1px solid var(--border);margin:4px 0;';
  menu.appendChild(divider);

  const newItem=document.createElement('div'); newItem.className='more-menu-item';
  newItem.style.color='#4f46e5';
  newItem.innerHTML=`<span>＋</span><span>New Collection</span>`;
  newItem.onclick=async()=>{
    closeMenu();
    const col=await promptNewCollection();
    if(!col) return;
    book.collectionId=col.id;
    await idbAddBook(book);
    renderLibrary();
    flashStatus(`Added to "${escapeHtml(col.name)}"`);
  };
  menu.appendChild(newItem);

  container.appendChild(menu);
  activeMenu=menu;

  // Make menu items focusable and add arrow key navigation
  const items=[...menu.querySelectorAll('.more-menu-item')];
  items.forEach(item=>item.setAttribute('tabindex','0'));
  if(items.length) items[0].focus();

  menu.addEventListener('keydown',(e)=>{
    const focused=document.activeElement;
    const idx=items.indexOf(focused);
    if(e.key==='ArrowDown'){ e.preventDefault(); items[(idx+1)%items.length].focus(); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); items[(idx-1+items.length)%items.length].focus(); }
    else if(e.key==='Enter'||e.key===' '){ e.preventDefault(); focused.click(); }
    else if(e.key==='Escape'){ closeMenu(); }
  });
}

function initCollections(){
  backToCollections.onclick=()=>{ collectionDetail.style.display='none'; collectionsGrid.style.display='grid'; renderCollections(); };
  newCollectionBtn.onclick=async()=>{
    const col=await promptNewCollection();
    if(!col) return;
    renderCollections();
  };
  document.addEventListener('click', (e)=>{ if(activeMenu && !activeMenu.contains(e.target)) closeMenu(); });
}
