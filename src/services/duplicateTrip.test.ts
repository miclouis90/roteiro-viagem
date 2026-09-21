import { beforeEach, describe, expect, it, vi } from 'vitest';
import { demoTrip, demoEvents } from '../data/demo';
const mocks=vi.hoisted(()=>({readTrip:vi.fn(),readEvents:vi.fn(),batch:vi.fn(),saveTrip:vi.fn(),saveEvent:vi.fn()}));
vi.mock('../lib/firebase',()=>({db:{},demoMode:false}));
vi.mock('./repository',()=>({saveTrip:mocks.saveTrip,saveEvent:mocks.saveEvent}));
vi.mock('firebase/firestore',()=>({collection:(_db:unknown,...segments:string[])=>segments.join('/'),doc:(parent:unknown,...segments:string[])=>({id:segments.at(-1)??'new-id',path:segments.length?segments.join('/'):`${parent}/new-id`}),getDocFromServer:mocks.readTrip,getDocsFromServer:mocks.readEvents,writeBatch:mocks.batch,serverTimestamp:()=> 'SERVER_TIMESTAMP'}));
import { duplicateTrip } from './duplicateTrip';
beforeEach(()=>{vi.clearAllMocks();mocks.readTrip.mockResolvedValue({exists:()=>true,id:demoTrip.id,data:()=>demoTrip});mocks.readEvents.mockResolvedValue({docs:demoEvents.map(e=>({id:e.id,data:()=>e}))});});
describe('Duplicação sem alterar origem',()=>{
 it('cria uma cópia privada e novos programas após o documento pai',async()=>{const order:string[]=[];const parent={set:vi.fn(),commit:vi.fn(async()=>{order.push('parent');})};const events={set:vi.fn(),commit:vi.fn(async()=>{order.push('events');})};mocks.batch.mockReturnValueOnce(parent).mockReturnValueOnce(events);expect(await duplicateTrip(demoTrip,demoEvents)).toBe('new-id');expect(order).toEqual(['parent','events']);expect(parent.set.mock.calls[0][1]).toMatchObject({isPublic:false,title:'Férias em Brasília · cópia'});expect(parent.set.mock.calls[0][1]).not.toHaveProperty('id');expect(events.set).toHaveBeenCalledTimes(8);expect(demoTrip.isPublic).toBe(true);});
 it('informa a cópia preservada se a gravação dos programas falhar',async()=>{mocks.batch.mockReturnValueOnce({set:vi.fn(),commit:vi.fn().mockResolvedValue(undefined)}).mockReturnValueOnce({set:vi.fn(),commit:vi.fn().mockRejectedValue(new Error('offline'))});await expect(duplicateTrip(demoTrip,demoEvents)).rejects.toThrow('#/viagem/new-id');});
 it('aborta antes de gravar se há programas fora do período',async()=>{mocks.readEvents.mockResolvedValue({docs:[{id:'outside',data:()=>({...demoEvents[0],date:'2027-01-01'})}]});await expect(duplicateTrip(demoTrip,demoEvents)).rejects.toThrow('fora do período');expect(mocks.batch).not.toHaveBeenCalled();});
 it('não grava quando falha a leitura da origem',async()=>{mocks.readTrip.mockRejectedValue(new Error('sem acesso'));await expect(duplicateTrip(demoTrip,demoEvents)).rejects.toThrow('sem acesso');expect(mocks.batch).not.toHaveBeenCalled();});
});
