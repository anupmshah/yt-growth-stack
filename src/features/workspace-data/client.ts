"use client";

export async function workspaceRequest<T>(accessToken:string,path:string,init?:RequestInit):Promise<T>{
  const response=await fetch(path,{...init,headers:{...init?.headers,authorization:`Bearer ${accessToken}`,...(init?.body?{"content-type":"application/json"}:{})}});
  const payload:unknown=await response.json().catch(()=>null);
  if(!response.ok){const issue=payload&&typeof payload==="object"&&"error" in payload?(payload as {error?:unknown}).error:null;const message=typeof issue==="string"?issue:issue&&typeof issue==="object"&&"message" in issue&&typeof issue.message==="string"?issue.message:"The workspace request could not complete.";throw new Error(message);}
  return payload as T;
}

export function records<T>(payload:unknown,...keys:string[]):T[]{
  if(Array.isArray(payload))return payload as T[];
  if(!payload||typeof payload!=="object")return[];
  for(const key of keys){const value=(payload as Record<string,unknown>)[key];if(Array.isArray(value))return value as T[];}
  return[];
}

