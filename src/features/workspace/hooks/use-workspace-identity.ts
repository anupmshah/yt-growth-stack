"use client";
import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/integrations/supabase/browser";

export type WorkspaceContext = { accessToken: string; projectId: string; conversationId: string };
export type WorkspaceState = {
  configured: boolean; loading: boolean; user: User | null; context: WorkspaceContext | null;
  projectName: string | null; notice: string | null; error: string | null;
};

export function useWorkspaceIdentity() {
  const client = getSupabaseBrowserClient();
  const [state,setState] = useState<WorkspaceState>({ configured:Boolean(client),loading:Boolean(client),user:null,context:null,projectName:null,notice:null,error:null });

  const hydrate = useCallback(async (session: Session | null) => {
    if (!client || !session?.user) { setState(current=>({...current,loading:false,user:null,context:null,projectName:null})); return; }
    const projects = await client.from("projects").select("id,name").order("created_at",{ascending:true}).limit(1);
    if (projects.error) { setState(current=>({...current,loading:false,user:session.user,error:"Could not load your workspace."})); return; }
    const project = projects.data?.[0];
    if (!project) { setState(current=>({...current,loading:false,user:session.user,context:null,projectName:null,error:null})); return; }
    const conversations = await client.from("conversations").select("id").eq("project_id",project.id).order("updated_at",{ascending:false}).order("id",{ascending:false}).limit(1);
    if (conversations.error) { setState(current=>({...current,loading:false,user:session.user,error:"Could not load the project conversation."})); return; }
    let conversation = conversations.data?.[0];
    if (!conversation) {
      const created = await client.from("conversations").insert({project_id:project.id,title:"Voice research"}).select("id").single();
      if (created.error) { setState(current=>({...current,loading:false,user:session.user,error:"Could not create a conversation."})); return; }
      conversation = created.data;
    }
    setState({configured:true,loading:false,user:session.user,context:{accessToken:session.access_token,projectId:project.id,conversationId:conversation.id},projectName:project.name,notice:null,error:null});
  },[client]);

  useEffect(()=>{if(!client)return;void client.auth.getSession().then(({data})=>hydrate(data.session));const {data}=client.auth.onAuthStateChange((_event,session)=>{void hydrate(session);});return()=>data.subscription.unsubscribe();},[client,hydrate]);

  const signIn = useCallback(async (email:string,password:string,createAccount:boolean) => {
    if(!client)return; setState(current=>({...current,loading:true,error:null,notice:null}));
    const result=createAccount?await client.auth.signUp({email,password}):await client.auth.signInWithPassword({email,password});
    if(result.error){setState(current=>({...current,loading:false,error:result.error.message}));return;}
    if(createAccount&&!result.data.session){setState(current=>({...current,loading:false,notice:"Check your email to confirm the account, then sign in."}));return;}
    await hydrate(result.data.session);
  },[client,hydrate]);

  const createWorkspace = useCallback(async (name:string,niche:string) => {
    if(!client||!state.user)return; setState(current=>({...current,loading:true,error:null}));
    const created=await client.from("projects").insert({owner_id:state.user.id,name:name.trim(),niche:niche.trim()||null}).select("id,name").single();
    if(created.error){setState(current=>({...current,loading:false,error:created.error.message}));return;}
    const conversation=await client.from("conversations").insert({project_id:created.data.id,title:"Voice research"}).select("id").single();
    if(conversation.error){setState(current=>({...current,loading:false,error:conversation.error.message}));return;}
    const {data}=await client.auth.getSession(); await hydrate(data.session);
  },[client,state.user,hydrate]);

  const signOut=useCallback(async()=>{await client?.auth.signOut();},[client]);
  return {...state,signIn,createWorkspace,signOut};
}
