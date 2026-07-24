'use client';

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { adminFetch } from '../lib/browser-api';

export type UploadedProductImage = { id?: string; url: string; altText?: string | null; sortOrder?: number | null };
type UploadIntent = { file:{id:string;url:string|null;storageProvider:string;storageKey:string}; upload:{method:string;url:string;headers:Record<string,string>} };

export function ProductImageUploader({images,onChange,productName='sản phẩm'}:{images:UploadedProductImage[];onChange:(images:UploadedProductImage[])=>void;productName?:string}){
 const inputRef=useRef<HTMLInputElement>(null); const [dragging,setDragging]=useState(false),[uploading,setUploading]=useState(false),[message,setMessage]=useState('');
 async function upload(files:File[]){const accepted=files.filter(file=>file.type.startsWith('image/'));if(!accepted.length){setMessage('Vui lòng chọn tệp hình ảnh.');return}setUploading(true);setMessage(`Đang tải ${accepted.length} ảnh lên Cloudflare R2...`);const next=[...images];try{for(const file of accepted){const intent=await adminFetch<UploadIntent>('/files/upload-intent',{method:'POST',body:JSON.stringify({originalName:file.name,mimeType:file.type,size:file.size,isPublic:true})});const response=await fetch(intent.upload.url,{method:intent.upload.method||'PUT',headers:intent.upload.headers,body:file});if(!response.ok)throw new Error(`Không tải được ${file.name} (${response.status}).`);const confirmed=await adminFetch<{url:string|null}>(`/files/${intent.file.id}/confirm`,{method:'PATCH'});const url=confirmed.url??intent.file.url;if(!url)throw new Error(`Không tạo được URL công khai cho ${file.name}.`);next.push({url,altText:productName,sortOrder:next.length})}onChange(next);setMessage(`Đã tải ${accepted.length} ảnh lên R2.`)}catch(error){setMessage(error instanceof Error?error.message:'Không tải được ảnh.')}finally{setUploading(false);if(inputRef.current)inputRef.current.value=''}}
 function select(event:ChangeEvent<HTMLInputElement>){void upload(Array.from(event.target.files??[]))} function drop(event:DragEvent<HTMLDivElement>){event.preventDefault();setDragging(false);void upload(Array.from(event.dataTransfer.files))}
 return <div className="product-image-manager">
  <div className={`image-dropzone${dragging?' is-dragging':''}${uploading?' is-uploading':''}`} onDragEnter={e=>{e.preventDefault();setDragging(true)}} onDragOver={e=>e.preventDefault()} onDragLeave={()=>setDragging(false)} onDrop={drop} onClick={(event)=>{if(event.target===inputRef.current)return;if(!uploading)inputRef.current?.click()}} role="button" tabIndex={0} onKeyDown={e=>{if((e.key==='Enter'||e.key===' ')&&!uploading){e.preventDefault();inputRef.current?.click()}}}>
   <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={select}/><span className="dropzone-icon">⇧</span><strong>{uploading?'Đang tải ảnh...':'Kéo và thả ảnh vào đây'}</strong><small>hoặc nhấn để chọn nhiều ảnh · JPG, PNG, WebP</small><button type="button" className="secondary-button" disabled={uploading}>Chọn ảnh từ máy</button>
  </div>
  <div className="storage-note"><span>☁</span><div><strong>Nơi lưu: Cloudflare R2</strong><small>Bucket hanbotorder · uploads/tài-khoản-admin/…</small></div></div>
  {images.length?<div className="uploaded-image-grid">{images.map((image,index)=><article key={`${image.id??image.url}-${index}`}><img src={image.url} alt={image.altText||productName}/><div><input aria-label={`Mô tả ảnh ${index+1}`} value={image.altText??''} placeholder="Mô tả ảnh" onChange={e=>onChange(images.map((item,i)=>i===index?{...item,altText:e.target.value}:item))}/><small>Ảnh {index+1}{index===0?' · Ảnh đại diện':''}</small></div><button type="button" aria-label={`Xóa ảnh ${index+1}`} onClick={()=>onChange(images.filter((_,i)=>i!==index).map((item,i)=>({...item,sortOrder:i})))}>×</button></article>)}</div>:null}
  {message?<p className="image-upload-message" role="status">{message}</p>:null}
 </div>
}
