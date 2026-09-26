import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ listeners: [] as {target: unknown; next: (v:any)=>void; error:(e:Error)=>void; stop:ReturnType<typeof vi.fn>}[] }));
vi.mock('../lib/firebase',()=>({db:{},auth:null,demoMode:false}));
vi.mock('firebase/firestore',()=>({
  collection: (_db:unknown,path:string)=>({path}), collectionGroup:(_db:unknown,path:string)=>({group:path}),
  where:(field:string,op:string,value:string)=>({field,op,value}), query:(target:unknown,filter:unknown)=>({target,filter}),
  onSnapshot:(target:unknown,next:(v:any)=>void,error:(e:Error)=>void)=>{const stop=vi.fn();state.listeners.push({target,next,error,stop});return stop;},
  addDoc:vi.fn(),deleteDoc:vi.fn(),deleteField:vi.fn(),doc:vi.fn(),getDocs:vi.fn(),getDocFromServer:vi.fn(),serverTimestamp:vi.fn(),writeBatch:vi.fn(),updateDoc:vi.fn(),
}));
import { watchTrips } from './repository';
const tripDoc = (id:string) => ({id,data:()=>({title:id}),exists:()=>true});
const membership = (id:string, uid='B') => ({id:uid,ref:{parent:{parent:{id,path:`trips/${id}`,parent:{path:'trips'}}}}});
beforeEach(()=>{state.listeners=[];});
it('uses only owner query and own memberships, including for admins',()=>{
  const next=vi.fn();const stop=watchTrips(true,next,vi.fn(),'B');
  expect(state.listeners.map(l=>l.target)).toEqual([
    {target:{path:'trips'},filter:{field:'ownerId',op:'==',value:'B'}},
    {target:{group:'members'},filter:{field:'uid',op:'==',value:'B'}},
  ]);
  state.listeners[0].next({docs:[tripDoc('X')]});
  state.listeners[1].next({docs:[membership('X'),membership('Y')]});
  state.listeners[2].next(tripDoc('X'));state.listeners[3].next(tripDoc('Y'));
  expect(next.mock.lastCall?.[0].map((t:{id:string})=>t.id)).toEqual(['X','Y']);
  state.listeners[1].next({docs:[]});
  expect(next.mock.lastCall?.[0].map((t:{id:string})=>t.id)).toEqual(['X']);
  state.listeners[3].next(tripDoc('Y'));
  expect(next.mock.lastCall?.[0].map((t:{id:string})=>t.id)).toEqual(['X']);
  stop();expect(state.listeners.every(l=>l.stop.mock.calls.length>0)).toBe(true);
});
it('does not list public trips for signed-out visitors',()=>{
  const next=vi.fn();watchTrips(false,next,vi.fn());
  expect(next).toHaveBeenCalledWith([]);expect(state.listeners).toHaveLength(0);
});
