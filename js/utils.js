'use strict';
/********** Utilities **********/
function humanSize(bytes){const u=['B','KB','MB','GB'];let i=0,n=bytes;while(n>=1024&&i<u.length-1){n/=1024;i++;}return`${n.toFixed(n<10&&i>0?1:0)} ${u[i]}`;}
function flashStatus(msg){statusEl.textContent=msg;setTimeout(()=>statusEl.textContent='',1400);}
function normalizePath(path){path=path.split('#')[0].split('?')[0];const parts=path.split('/');const out=[];for(const p of parts){if(!p||p==='.')continue;if(p==='..')out.pop();else out.push(p);}return out.join('/');}
function resolveRelative(src,baseHref){const baseDir=baseHref.includes('/')?baseHref.slice(0,baseHref.lastIndexOf('/')+1):'';return normalizePath(baseDir+src);}
function escapeHtml(str){return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

const MAX_COL_NAME=50;

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
