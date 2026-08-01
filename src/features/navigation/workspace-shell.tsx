"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Compass, Database, Lightbulb, MessageSquare, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { useWorkspaceIdentity } from "@/features/workspace/hooks/use-workspace-identity";
import { WorkspaceAccess } from "@/features/workspace/components/workspace-access";
import { workspaceRequest } from "@/features/workspace-data/client";
import styles from "./workspace-shell.module.css";

const links=[{href:"/",label:"Conversation",Icon:MessageSquare},{href:"/research-runs",label:"Research runs",Icon:Compass},{href:"/ideas",label:"Saved ideas",Icon:Lightbulb},{href:"/sources",label:"Sources",Icon:Database}];
export function WorkspaceShell({children}:{children:React.ReactNode}){
 const identity=useWorkspaceIdentity();const pathname=usePathname();const router=useRouter();const [creating,setCreating]=useState(false);const [error,setError]=useState<string|null>(null);
 const active=(href:string)=>href==="/"?pathname==="/"||pathname.startsWith("/conversations/"):pathname.startsWith(href);
 const create=async()=>{if(!identity.context){setError("Sign in and create a workspace first.");return;}setCreating(true);setError(null);try{const payload=await workspaceRequest<{conversation?:{id:string};id?:string}>(identity.context.accessToken,"/api/workspace/conversations",{method:"POST",body:JSON.stringify({projectId:identity.context.projectId,title:"New research conversation"})});const id=payload.conversation?.id??payload.id;if(!id)throw new Error("The server did not return the new conversation.");router.push(`/conversations/${id}`);router.refresh();}catch(cause){setError(cause instanceof Error?cause.message:"Could not create the conversation.");}finally{setCreating(false);}};
 const nav=<>{links.map(({href,label,Icon})=><Link href={href} key={href} aria-current={active(href)?"page":undefined}><Icon size={16}/><span>{label}</span></Link>)}</>;
 return <main className={styles.shell}><WorkspaceAccess identity={identity}/><div className={styles.frame}><aside className={styles.sidebar}><div className={styles.brand}><span className={styles.mark}><Sparkles size={15}/></span>YT Growth Stack</div><button className={styles.new} onClick={()=>void create()} disabled={creating}><Plus size={14}/>{creating?"Creating...":"New research"}</button>{error&&<p className={styles.error} role="alert">{error}</p>}<nav className={styles.nav} aria-label="Primary navigation">{nav}</nav><div className={styles.foot}><strong>Evidence first</strong><small>Every recommendation remains connected to its stored sources.</small></div></aside><section className={styles.content}>{children}</section><nav className={styles.mobileNav} aria-label="Mobile navigation">{nav}</nav></div></main>;
}
