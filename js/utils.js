'use strict';
/********** Utilities **********/
function humanSize(bytes){const u=['B','KB','MB','GB'];let i=0,n=bytes;while(n>=1024&&i<u.length-1){n/=1024;i++;}return`${n.toFixed(n<10&&i>0?1:0)} ${u[i]}`;}
function flashStatus(msg){statusEl.textContent=msg;setTimeout(()=>statusEl.textContent='',1400);}
function normalizePath(path){path=path.split('#')[0].split('?')[0];const parts=path.split('/');const out=[];for(const p of parts){if(!p||p==='.')continue;if(p==='..')out.pop();else out.push(p);}return out.join('/');}
function resolveRelative(src,baseHref){const baseDir=baseHref.includes('/')?baseHref.slice(0,baseHref.lastIndexOf('/')+1):'';return normalizePath(baseDir+src);}
function escapeHtml(str){return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

const MAX_COL_NAME=50;

// Shared book card builder — used by library.js and collections.js
// onRead: callback when Read/Continue clicked
// extraButtons: optional array of additional button elements
function createBookCard(r, onRead, extraButtons=[]){
  const card=document.createElement('div'); card.className='card';

  // Cover image
  const covWrap=document.createElement('div'); covWrap.className='coverWrap';
  const img=document.createElement('img'); img.className='cover'; img.alt=r.title||'Book cover';
  if(r.coverBlob){
    const blobUrl=URL.createObjectURL(r.coverBlob);
    img.src=blobUrl;
    img.onload=()=>URL.revokeObjectURL(blobUrl);
    img.onerror=()=>URL.revokeObjectURL(blobUrl);
  }
  covWrap.appendChild(img);

  // Meta
  const meta=document.createElement('div'); meta.className='meta';
  const title=document.createElement('div'); title.className='title'; title.textContent=r.title||'Untitled'; title.title=r.title||'Untitled';
  const author=document.createElement('div'); author.className='author'; author.textContent=r.author||''; author.title=r.author||'';

  // Buttons row
  const row=document.createElement('div'); row.className='row';
  const readBtn=document.createElement('button'); readBtn.className='btn-blue'; readBtn.textContent=r.lastCfi?'Continue':'Read';
  readBtn.onclick=()=>onRead(r.id);
  row.appendChild(readBtn);
  extraButtons.forEach(btn=>row.appendChild(btn));

  // ··· more button
  const moreBtn=document.createElement('button'); moreBtn.className='btn-more'; moreBtn.textContent='···'; moreBtn.title='More options';

  meta.append(title, author, row);
  card.append(covWrap, meta, moreBtn);
  return { card, moreBtn };
}

// Generate SHA-256 hash of an ArrayBuffer
async function sha256(buffer){
  const hashBuffer=await crypto.subtle.digest('SHA-256', buffer);
  const hashArray=Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function promptNewCollection(){
  const name=(prompt('Collection name (max 50 characters):') || '').trim();
  if(!name) return null;
  if(name.length > MAX_COL_NAME){
    alert(`Collection name is too long (max ${MAX_COL_NAME} characters).`); return null;
  }
  const existing=await idbGetAllCols();
  if(existing.some(c=>c.name.toLowerCase()===name.toLowerCase())){
    alert(`A collection named "${name}" already exists.`); return null;
  }
  const col={ id:crypto.randomUUID(), name, createdAt:Date.now() };
  await idbAddCol(col);
  return col;
}
