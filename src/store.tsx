import { createContext, useContext, useEffect, useReducer, useState } from 'react';
import type { Dispatch, ReactNode } from 'react';
import { createSeed, reducer, STORAGE_KEY } from './model';
import type { Action, AppState, Page } from './model';

interface Store { state: AppState; dispatch: Dispatch<Action>; branchId: string; setBranchId: (id:string)=>void; page: Page; navigate:(page:Page)=>void; toast:(message:string)=>void; storageError:boolean }
const Context=createContext<Store|null>(null);
const validPages:Page[]=['overview','members','schedule','leads','billing','training','copilot','automations','settings','portal'];
function load():AppState {
  try { const s=JSON.parse(localStorage.getItem(STORAGE_KEY)??'null'); if(s?.version===1&&['members','payments','classes','leads','tasks','audit','automations','trainingPlans','workouts'].every(k=>Array.isArray(s[k]))&&s.settings&&['gymName','ownerName','email'].every(k=>typeof s.settings[k]==='string')&&['renewalReminders','weeklyDigest'].every(k=>typeof s.settings[k]==='boolean')) return s; } catch { /* recover malformed demo state */ }
  return createSeed();
}
export function StoreProvider({children}:{children:ReactNode}) {
  const [state,dispatch]=useReducer(reducer,undefined,load);
  const [branchId,setBranchId]=useState('all');
  const getPage=()=>{const p=location.hash.slice(1) as Page;return validPages.includes(p)?p:'overview';};
  const [page,setPage]=useState<Page>(getPage);
  const [notification,setNotification]=useState('');
  const [storageError,setStorageError]=useState(false);
  useEffect(()=>{try { localStorage.setItem(STORAGE_KEY,JSON.stringify(state));setStorageError(false); } catch { setStorageError(true); }},[state]);
  useEffect(()=>{const fn=()=>setPage(getPage());addEventListener('hashchange',fn);return()=>removeEventListener('hashchange',fn);},[]);
  useEffect(()=>{if(!notification)return;const timer=setTimeout(()=>setNotification(''),4500);return()=>clearTimeout(timer);},[notification]);
  const navigate=(p:Page)=>{location.hash=p;setPage(p);window.scrollTo({top:0});};
  return <Context.Provider value={{state,dispatch,branchId,setBranchId,page,navigate,toast:setNotification,storageError}}>{children}{notification&&<div role="status" className="toast"><span className="toast-dot">✓</span>{notification}<button onClick={()=>setNotification('')} aria-label="Dismiss notification">×</button></div>}</Context.Provider>;
}
export function useApp(){const s=useContext(Context);if(!s)throw new Error('Missing StoreProvider');return s;}
