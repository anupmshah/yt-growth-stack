"use client";
import { useState } from "react";
import { CheckCircle2, Database, LogOut, ShieldCheck } from "lucide-react";
import type { useWorkspaceIdentity } from "../hooks/use-workspace-identity";
import styles from "./workspace-access.module.css";

type Identity = ReturnType<typeof useWorkspaceIdentity>;
export function WorkspaceAccess({identity}:{identity:Identity}) {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [createAccount,setCreateAccount]=useState(false); const [name,setName]=useState("Personal Brand"); const [niche,setNiche]=useState("");
  if(identity.context) return <div className={styles.ready}><CheckCircle2 size={14}/><span><strong>{identity.projectName}</strong> · secure workspace</span><button onClick={()=>void identity.signOut()} aria-label="Sign out"><LogOut size={13}/></button></div>;
  return <section className={styles.panel} aria-label="Workspace setup"><header><span><Database size={17}/></span><div><strong>Connect your workspace</strong><small>Required before the agent can run research tools.</small></div></header>
    {!identity.configured?<div className={styles.message}><ShieldCheck size={16}/><p>Add the Supabase URL and anon key to <b>.env.local</b>, then restart the preview. Provider keys are not needed yet.</p></div>
    :identity.loading?<p className={styles.loading}>Checking secure workspace...</p>
    :!identity.user?<form onSubmit={e=>{e.preventDefault();void identity.signIn(email,password,createAccount);}}><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" required/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password (8+ characters)" minLength={8} required/><button type="submit">{createAccount?"Create account":"Sign in"}</button><button type="button" className={styles.link} onClick={()=>setCreateAccount(value=>!value)}>{createAccount?"I already have an account":"Create a new account"}</button></form>
    :<form onSubmit={e=>{e.preventDefault();void identity.createWorkspace(name,niche);}}><input value={name} onChange={e=>setName(e.target.value)} placeholder="Project name" required/><input value={niche} onChange={e=>setNiche(e.target.value)} placeholder="YouTube niche (optional)"/><button type="submit">Create workspace</button></form>}
    {identity.notice&&<p className={styles.notice}>{identity.notice}</p>}{identity.error&&<p className={styles.error} role="alert">{identity.error}</p>}
  </section>;
}