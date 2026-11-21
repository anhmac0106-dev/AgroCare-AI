import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from './backend.js';

test('private endpoints reject unauthenticated requests before database access', async () => {
 const app=createApp({store:{auth:{getUser:async()=>({error:{}})}}});
 for(const url of ['/api/history','/api/reviews','/api/me','/api/history/export-excel']) assert.equal((await request(app).get(url)).status,401);
 assert.equal((await request(app).post('/api/detect')).status,401);
});
test('regular users cannot request all users data or forge history',async()=>{
 const store={auth:{getUser:async()=>({data:{user:{id:'user-a',email:'a@example.com'}}})}};
 const app=createApp({store,adminIds:[]});
 assert.equal((await request(app).get('/api/history?scope=all').set('Authorization','Bearer valid')).status,403);
 assert.equal((await request(app).post('/api/history').set('Authorization','Bearer valid').send({user_id:'user-b'})).status,405);
});

function fakeStore(rows=[]){
 const calls=[];const storageCalls=[];
 const store={calls,storageCalls,auth:{getUser:async(token)=>token==='valid'?{data:{user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',email:'a@example.com'}}}:{error:{}}},
 from(table){const filters=[];let mode='read';const q={select(){return q;},eq(k,v){filters.push([k,v]);calls.push([table,k,v]);return q;},order(){return q;},range(){return q;},delete(){mode='delete';return q;},update(){mode='update';return q;},insert(){return q;},maybeSingle(){return Promise.resolve({data:rows.filter(r=>filters.every(([k,v])=>r[k]===v))[0]||null});},then(resolve,reject){return Promise.resolve({data:rows.filter(r=>filters.every(([k,v])=>r[k]===v))}).then(resolve,reject);}};return q;},
 rpc:async()=>({data:{allowed:false,used:10,remaining:0,resetAt:new Date(Date.now()+3600000).toISOString()}}),
 storage:{from(){return {download:async key=>{storageCalls.push(key);return {data:new Blob(['image'])}},remove:async()=>({data:[]})}}}};
 return store;
}
const a='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',b='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
test('history, exports and image IDs enforce ownership; admin read-all is explicit',async()=>{
 const store=fakeStore([{id,user_id:b,image:b+'/x.jpg',disease:'Private B'},{id:a,user_id:a,image:a+'/x.jpg',disease:'Own'}]);
 const app=createApp({store});
 const h=await request(app).get('/api/history').set('Authorization','Bearer valid');assert.equal(h.status,200);assert.equal(h.body.data.length,1);assert.equal(h.body.data[0].user_id,a);
 const img=await request(app).get('/api/history/'+id+'/image').set('Authorization','Bearer valid');assert.equal(img.status,404);assert.equal(store.storageCalls.length,0);
 const mutation=await request(app).delete('/api/reviews/'+id).set('Authorization','Bearer valid');assert.equal(mutation.status,404);
 const admin=createApp({store,adminIds:[a]});
 assert.equal((await request(admin).get('/api/history?scope=all').set('Authorization','Bearer valid')).body.data.length,2);
 assert.equal((await request(admin).get('/api/history').set('Authorization','Bearer valid')).body.data.length,1);
 assert.equal((await request(admin).delete('/api/history?scope=all').set('Authorization','Bearer valid')).status,403);
});
test('invalid image rejected before quota; exhausted quota never calls AI',async()=>{
 const store=fakeStore();let reservations=0,ai=0;const rpc=store.rpc;store.rpc=async(...args)=>{reservations++;return rpc(...args)};
 const app=createApp({store,detect:async()=>{ai++;return '{}'}});
 assert.equal((await request(app).post('/api/detect').set('Authorization','Bearer valid').attach('image',Buffer.from('<script>alert(1)</script>'),'fake.jpg')).status,400);
 assert.equal(reservations,0);
 const sharp=(await import('sharp')).default;const image=await sharp({create:{width:10,height:10,channels:3,background:'green'}}).png().toBuffer();
 const response=await request(app).post('/api/detect').set('Authorization','Bearer valid').attach('image',image,'leaf.png');
 assert.equal(response.status,429);assert.equal(reservations,1);assert.equal(ai,0);assert.ok(response.headers['retry-after']);
});
test('oversized reviews and invalid stars rejected; private responses not cached',async()=>{
 const app=createApp({store:fakeStore()});
 const response=await request(app).post('/api/reviews').set('Authorization','Bearer valid').send({name:'A',star:99,content:'hello'});assert.equal(response.status,400);
 assert.equal((await request(app).post('/api/reviews').set('Authorization','Bearer valid').send({name:'A',star:5,content:'x'.repeat(2001)})).status,400);
 assert.match((await request(app).get('/api/history').set('Authorization','Bearer valid')).headers['cache-control'],/no-store/);
});

test('successful recognition saves verified owner and normalized image on server',async()=>{
 const store=fakeStore();const parsed={disease:'Bệnh',confidence:'80%',level:'Nhẹ',cause:'Nguyên nhân',solution:'Xử lý',medicine:'Không',prevent:'Phòng'};
 let inserted,stored;store.rpc=async()=>({data:{allowed:true,used:1,remaining:9,resetAt:new Date().toISOString()}});
 store.storage.from=()=>({upload:async(key,bytes)=>{stored={key,bytes};return {data:{path:key}}},remove:async()=>({data:[]})});
 store.from=()=>({insert(row){inserted=row;return this},select(){return this},single:async()=>({data:{id}})});
 const app=createApp({store,detect:async buffer=>{assert.ok(Buffer.isBuffer(buffer));return JSON.stringify(parsed)}});
 const sharp=(await import('sharp')).default;const image=await sharp({create:{width:4,height:4,channels:3,background:'green'}}).png().toBuffer();
 const response=await request(app).post('/api/detect').set('Authorization','Bearer valid').attach('image',image,'../../evil.png');
 assert.equal(response.status,200);assert.equal(response.body.historyId,id);assert.equal(inserted.user_id,a);assert.deepEqual(inserted.result,parsed);assert.ok(stored.key.startsWith(a+'/'));assert.match(stored.key,/\.jpg$/);assert.equal((await sharp(stored.bytes).metadata()).format,'jpeg');
});
test('configuration exposes public keys only and vendor SDK is served',async()=>{
 const app=createApp({publicConfig:{supabaseUrl:'https://test.supabase.co',supabaseAnonKey:'public'}});
 const config=await request(app).get('/api/config');assert.deepEqual(config.body,{supabaseUrl:'https://test.supabase.co',supabaseAnonKey:'public'});
 assert.equal((await request(app).get('/vendor/supabase.js')).status,200);
 const page=await request(app).get('/');assert.equal(page.status,200);assert.ok(page.headers['content-security-policy']);
});

test('quota tier comes from verified admin ID, never client input',async()=>{
 for(const isAdmin of [false,true]){
  const store=fakeStore();const calls=[];
  store.rpc=async(name,args)=>{calls.push({name,args});return {data:{allowed:false,used:isAdmin?50:10,remaining:0,limit:isAdmin?50:10,windowHours:isAdmin?24:8,resetAt:new Date(Date.now()+60000).toISOString()}}};
  const app=createApp({store,adminIds:isAdmin?[a]:[],detect:()=>{throw Error('must not call AI')}});
  const me=await request(app).get('/api/me?isAdmin=true').set('Authorization','Bearer valid');
  assert.equal(me.body.quota.limit,isAdmin?50:10);assert.equal(me.body.quota.windowHours,isAdmin?24:8);
  const sharp=(await import('sharp')).default;const image=await sharp({create:{width:2,height:2,channels:3,background:'green'}}).png().toBuffer();
  const response=await request(app).post('/api/detect?isAdmin=true').set('Authorization','Bearer valid').attach('image',image,'leaf.png');
  assert.equal(response.status,429);assert.match(response.body.error,new RegExp(isAdmin?'50 lượt trong 24':'10 lượt trong 8'));
  assert.deepEqual(calls,[{name:'recognition_quota',args:{p_user_id:a,p_is_admin:isAdmin}},{name:'reserve_recognition',args:{p_user_id:a,p_is_admin:isAdmin}}]);
 }
});
