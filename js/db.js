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

/********** Transaction helpers **********/
function txGet(store, id){
  return new Promise((res,rej)=>{
    const rq=db.transaction(store,'readonly').objectStore(store).get(id);
    rq.onsuccess=()=>res(rq.result||null);
    rq.onerror=()=>rej(rq.error);
  });
}
function txGetAll(store){
  return new Promise((res,rej)=>{
    const rq=db.transaction(store,'readonly').objectStore(store).getAll();
    rq.onsuccess=()=>res(rq.result||[]);
    rq.onerror=()=>rej(rq.error);
  });
}
function txPut(store, record){
  return new Promise((res,rej)=>{
    const tx=db.transaction(store,'readwrite');
    tx.oncomplete=()=>res();
    tx.onerror=()=>rej(tx.error);
    tx.objectStore(store).put(record);
  });
}
function txDelete(store, id){
  return new Promise((res,rej)=>{
    const tx=db.transaction(store,'readwrite');
    tx.oncomplete=()=>res();
    tx.onerror=()=>rej(tx.error);
    tx.objectStore(store).delete(id);
  });
}

/********** Validation **********/
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

/********** Books API **********/
function idbAddBook(record){ return txPut(STORE, record); }
async function idbGetAll(){ return (await txGetAll(STORE)).map(sanitiseBook); }
async function idbGet(id){ return sanitiseBook(await txGet(STORE, id)); }
function idbDelete(id){ return txDelete(STORE, id); }

/********** Collections API **********/
function idbAddCol(col){ return txPut(COL_STORE, col); }
function idbGetAllCols(){ return txGetAll(COL_STORE); }
function idbDeleteCol(id){ return txDelete(COL_STORE, id); }
