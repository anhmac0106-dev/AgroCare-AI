import express from 'express';
import multer from 'multer';
import helmet from 'helmet';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectPlantDisease } from './deepseek.js';
import { createHistoryWorkbook } from './history-export.js';

const root=path.dirname(fileURLToPath(import.meta.url));
const maxImage=3*1024*1024;
const bucket='plant-images';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(status,message)=>Object.assign(new Error(message),{status});
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
function result(response){if(response.error)throw fail(503,'Dịch vụ lưu trữ chưa sẵn sàng. Vui lòng thử lại.');return response.data;}
function text(value,name,max){if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw fail(400,`${name} không hợp lệ (tối đa ${max} ký tự).`);return value.trim();}
export function validateAI(raw){
 let data;try{data=JSON.parse(raw);}catch{throw fail(502,'AI trả về dữ liệu không hợp lệ.');}
 if(!data||typeof data!=='object'||Array.isArray(data))throw fail(502,'AI trả về dữ liệu không hợp lệ.');
 const out={};for(const key of ['disease','confidence','level','cause','solution','medicine','prevent']){
  if(typeof data[key]!=='string'||!data[key].trim()||data[key].length>({disease:1000,level:100,confidence:100}[key]||6000))throw fail(502,'AI trả về dữ liệu thiếu hoặc quá dài.');
  out[key]=data[key].trim();
 }
 return out;
}
export function createApp({store,adminIds=[],publicConfig={},detect=detectPlantDisease,app=express()}={}){
 app.disable('x-powered-by');
 app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'",'https://cdn.tailwindcss.com','https://cdn.jsdelivr.net'],styleSrc:["'self'","'unsafe-inline'",'https://fonts.googleapis.com','https://cdnjs.cloudflare.com'],fontSrc:["'self'",'https://fonts.gstatic.com','https://cdnjs.cloudflare.com'],imgSrc:["'self'",'blob:','data:'],connectSrc:["'self'",...(publicConfig.supabaseUrl?[publicConfig.supabaseUrl]:[])],upgradeInsecureRequests:null}},crossOriginEmbedderPolicy:false}));
 app.use(express.json({limit:'32kb'}));
 app.get('/api/ping',(req,res)=>res.json({success:true,message:'Server Online'}));
 app.get('/api/config',(req,res)=>{if(!publicConfig.supabaseUrl||!publicConfig.supabaseAnonKey)return res.status(503).json({success:false,error:'Chưa cấu hình Supabase.'});res.json(publicConfig);});
 app.use('/api', (req,res,next)=>{res.set('Cache-Control','private, no-store');next();});
 app.use('/api',wrap(async(req,res,next)=>{
  if(!store)throw fail(503,'Chưa cấu hình dịch vụ dữ liệu.');
  const match=/^Bearer ([^\s]+)$/.exec(req.headers.authorization||'');
  if(!match)throw fail(401,'Vui lòng đăng nhập.');
  const {data,error}=await store.auth.getUser(match[1]);
  if(error||!data?.user)throw fail(401,'Phiên đăng nhập đã hết hạn.');
  req.user=data.user;req.isAdmin=adminIds.includes(data.user.id);next();
 }));
 function scope(req){if(req.query.scope&&req.query.scope!=='all')throw fail(400,'Phạm vi không hợp lệ.');if(req.query.scope==='all'&&!req.isAdmin)throw fail(403,'Chỉ quản trị viên được xem toàn bộ.');return req.query.scope==='all';}
 function scoped(table,req,fields='*'){const all=scope(req);let q=store.from(table).select(fields);return all?q:q.eq('user_id',req.user.id);}
 async function list(table,req,limit=100){const offset=Number(req.query.offset||0);if(!Number.isSafeInteger(offset)||offset<0)throw fail(400,'Vị trí trang không hợp lệ.');return result(await scoped(table,req,table==='history'?'id,user_id,image,disease,solution,level,created_at':'*').order('created_at',{ascending:false}).range(offset,offset+limit-1));}
 app.get('/api/me',wrap(async(req,res)=>{const quota=result(await store.rpc('recognition_quota',{p_user_id:req.user.id,p_is_admin:req.isAdmin}));res.json({success:true,user:{id:req.user.id,email:req.user.email,isAdmin:req.isAdmin},quota});}));
 app.get('/api/check-ai',(req,res)=>res.json({success:true,ai:Boolean(process.env.DEEPSEEK_API_KEY?.trim())}));
 const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:maxImage,files:1,fields:0}});
 app.post('/api/detect',upload.single('image'),wrap(async(req,res)=>{
  if(!req.file)throw fail(400,'Chưa chọn ảnh.');
  let buffer;try{const processor=sharp(req.file.buffer,{limitInputPixels:25000000});const meta=await processor.metadata();if(!['jpeg','png','webp','gif'].includes(meta.format))throw Error();buffer=await processor.rotate().resize(1600,1600,{fit:'inside',withoutEnlargement:true}).jpeg({quality:85}).toBuffer();}catch{throw fail(400,'Ảnh không hợp lệ. Dùng JPEG, PNG, WebP hoặc GIF, tối đa 25 triệu pixel.');}
  const quota=result(await store.rpc('reserve_recognition',{p_user_id:req.user.id,p_is_admin:req.isAdmin}));
  if(!quota.allowed){res.set('Retry-After',String(Math.max(1,Math.ceil((Date.parse(quota.resetAt)-Date.now())/1000))));return res.status(429).json({success:false,error:`Đã dùng hết ${quota.limit} lượt trong ${quota.windowHours} giờ gần nhất.`,quota});}
  let parsed;try{parsed=validateAI(await detect(buffer));}catch(error){if(error.status)throw error;throw fail(502,'Không thể phân tích ảnh lúc này. Lượt gọi đã được tính; vui lòng thử lại sau.');}
  const image=`${req.user.id}/${randomUUID()}.jpg`;
  result(await store.storage.from(bucket).upload(image,buffer,{contentType:'image/jpeg',upsert:false}));
  const saved=await store.from('history').insert({user_id:req.user.id,image,disease:parsed.disease,solution:parsed.solution,level:parsed.level,result:parsed}).select('id').single();
  if(saved.error){await store.storage.from(bucket).remove([image]);result(saved);}
  res.json({success:true,image,historyId:saved.data.id,result:JSON.stringify(parsed),quota});
 }));
 app.post('/api/history',(req,res)=>res.status(405).json({success:false,error:'Lịch sử được lưu tự động sau khi nhận diện.'}));
 app.get('/api/history',wrap(async(req,res)=>res.json({success:true,data:await list('history',req),pageSize:100})));
 app.get('/api/history/:id/image',wrap(async(req,res)=>{
  if(!uuid.test(req.params.id))throw fail(400,'ID không hợp lệ.');
  let q=store.from('history').select('image,user_id').eq('id',req.params.id);if(!req.isAdmin)q=q.eq('user_id',req.user.id);
  const row=result(await q.maybeSingle());if(!row)throw fail(404,'Không tìm thấy ảnh.');
  if(!row.image.startsWith(row.user_id+'/'))throw fail(404,'Không tìm thấy ảnh.');
  const image=result(await store.storage.from(bucket).download(row.image));res.type('jpeg').send(Buffer.from(await image.arrayBuffer()));
 }));
 app.get('/api/history/export-excel',wrap(async(req,res)=>{
  const rows=await list('history',req,20);
  const workbook=await createHistoryWorkbook(rows,undefined,async item=>{
   if(!item.image.startsWith(item.user_id+'/'))throw Object.assign(Error(),{code:'ENOENT'});
   const response=await store.storage.from(bucket).download(item.image);if(response.error)throw Object.assign(Error(),{code:'ENOENT'});return Buffer.from(await response.data.arrayBuffer());
  });
  const buffer=Buffer.from(await workbook.xlsx.writeBuffer());if(buffer.length>4*1024*1024)throw fail(413,'Báo cáo quá lớn. Hãy xuất ít bản ghi hơn.');
  res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').attachment('AgroCare_AI_Thong_Ke.xlsx').send(buffer);
 }));
 app.delete('/api/history',wrap(async(req,res)=>{
  if(req.query.scope)throw fail(403,'Chỉ được xóa lịch sử của chính mình.');
  let cleanupPending=false;
  for (;;) {
   const batch=result(await store.from('history').select('id').eq('user_id',req.user.id).limit(200));
   if(!batch.length)break;
   const deleted=result(await store.from('history').delete().eq('user_id',req.user.id).in('id',batch.map(row=>row.id)).select('image'));
   const keys=deleted.map(row=>row.image).filter(key=>key.startsWith(req.user.id+'/'));
   if(keys.length){const response=await store.storage.from(bucket).remove(keys);if(response.error)cleanupPending=true;}
   if(batch.length<200)break;
  }
  res.json({success:true,cleanupPending});
 }));
 app.get('/api/statistics',wrap(async(req,res)=>{const data=await list('history',req);res.json({success:true,statistics:{total:data.length,light:data.filter(x=>x.level==='Nhẹ').length,medium:data.filter(x=>x.level==='Trung bình').length,heavy:data.filter(x=>x.level==='Nặng').length},limitedTo:100});}));
 app.get('/api/reviews',wrap(async(req,res)=>res.json({success:true,data:await list('reviews',req),pageSize:100})));
 app.post('/api/reviews',wrap(async(req,res)=>{const name=text(req.body.name,'Tên',80),content=text(req.body.content,'Nội dung',2000),star=req.body.star;if(!Number.isInteger(star)||star<1||star>5)throw fail(400,'Số sao phải từ 1 đến 5.');const row=result(await store.from('reviews').insert({user_id:req.user.id,name,content,star}).select('id').single());res.json({success:true,id:row.id});}));
 app.put('/api/reviews/:id',wrap(async(req,res)=>{if(!uuid.test(req.params.id))throw fail(400,'ID không hợp lệ.');const name=text(req.body.name,'Tên',80),content=text(req.body.content,'Nội dung',2000);const data=result(await store.from('reviews').update({name,content}).eq('id',req.params.id).eq('user_id',req.user.id).select('id'));if(!data.length)throw fail(404,'Không tìm thấy đánh giá.');res.json({success:true});}));
 app.delete('/api/reviews/:id',wrap(async(req,res)=>{if(!uuid.test(req.params.id))throw fail(400,'ID không hợp lệ.');const data=result(await store.from('reviews').delete().eq('id',req.params.id).eq('user_id',req.user.id).select('id'));if(!data.length)throw fail(404,'Không tìm thấy đánh giá.');res.json({success:true});}));
 app.use('/api',(req,res)=>res.status(404).json({success:false,error:'API không tồn tại.'}));
 app.get('/vendor/supabase.js',(req,res)=>res.sendFile(path.join(root,'node_modules/@supabase/supabase-js/dist/umd/supabase.js')));
 app.use(express.static(path.join(root,'public')));
 app.use((err,req,res,next)=>{const status=err instanceof multer.MulterError?400:err.status||500;res.status(status).json({success:false,error:err instanceof multer.MulterError?'Ảnh tối đa 3 MiB, mỗi lần một ảnh.':status>=500&&status!==502&&status!==503?'Có lỗi hệ thống. Vui lòng thử lại.':err.message});});
 return app;
}
