'use strict';
/********** IndexedDB **********/
const DB_NAME='epubLibrary', DB_VERSION=2, STORE='books', COL_STORE='collections';
let db;

function openDB(){
  if(db) return Promise.resolve(db);
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=(e)=>{
      const d=e.target.result;
      if(!d.objectStoreNames.contains(STORE)){
        const s=d.createObjectStore(STORE,{keyPath:'id'});
        try{ s.createIndex('createdAt','createdAt'); }catch{}
      }
      if(!d.objectStoreNames.contains(COL_STORE)){
        d.createObjectStore(COL_STORE,{keyPath:'id'});
      }
    };
    req.onsuccess=(e)=>{db=e.target.result;resolve(db);};
    req.onerror=(e)=>{ console.error('IndexedDB error:',e.target.error); reject(e.target.error); };
    req.onblocked=()=>{ console.warn('IndexedDB blocked — please close other tabs running this app.'); };
  });
}

function idbAddBook(record){return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.objectStore(STORE).put(record);});}
const UUID_REGEX=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitiseBook(r){
  if(!r) return null;
  return {
    ...r,
    id: typeof r.id==='string' ? r.id : String(r.id),
    title: typeof r.title==='string' ? r.title : '',
    author: typeof r.author==='string' ? r.author : '',
    size: typeof r.size==='number' ? r.size : 0,
    createdAt: typeof r.createdAt==='number' ? r.createdAt : Date.now(),
    collectionId: typeof r.collectionId==='string' && UUID_REGEX.test(r.collectionId) ? r.collectionId : null,
    lastCfi: typeof r.lastCfi==='string' ? r.lastCfi : null,
  };
}

function idbGetAll(){return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readonly');const rq=tx.objectStore(STORE).getAll();rq.onsuccess=()=>res((rq.result||[]).map(sanitiseBook));rq.onerror=()=>rej(rq.error);});}
function idbGet(id){return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readonly');const rq=tx.objectStore(STORE).get(id);rq.onsuccess=()=>res(sanitiseBook(rq.result||null));rq.onerror=()=>rej(rq.error);});}
function idbDelete(id){return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);});}

// Collections CRUD
function idbAddCol(col){return new Promise((res,rej)=>{const tx=db.transaction(COL_STORE,'readwrite');tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.objectStore(COL_STORE).put(col);});}
function idbGetAllCols(){return new Promise((res,rej)=>{const tx=db.transaction(COL_STORE,'readonly');const rq=tx.objectStore(COL_STORE).getAll();rq.onsuccess=()=>res(rq.result||[]);rq.onerror=()=>rej(rq.error);});}
function idbDeleteCol(id){return new Promise((res,rej)=>{const tx=db.transaction(COL_STORE,'readwrite');tx.objectStore(COL_STORE).delete(id);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);});}
