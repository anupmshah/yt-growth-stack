"use client";

import { useEffect, useRef, useState } from "react";
import { CircleStop, Compass, Database, Headphones, Lightbulb, MessageSquare, Mic, MicOff, Plus, Send, Sparkles, Wifi, WifiOff } from "lucide-react";
import { useRealtimeVoice } from "../hooks/use-realtime-voice";
import { useWorkspaceIdentity } from "@/features/workspace/hooks/use-workspace-identity";
import { WorkspaceAccess } from "@/features/workspace/components/workspace-access";
import styles from "./realtime-voice-workspace.module.css";

const nav = [[MessageSquare,"Conversation"],[Compass,"Research runs"],[Lightbulb,"Saved ideas"],[Database,"Sources"]] as const;
const labels = { idle:"Voice disconnected", "requesting-permission":"Waiting for microphone", connecting:"Connecting securely", connected:"Agent ready", reconnecting:"Reconnecting", error:"Connection needs attention" } as const;

export function RealtimeVoiceWorkspace() {
  const identity = useWorkspaceIdentity();
  const voice = useRealtimeVoice(identity.context);
  const [text,setText] = useState("");
  const list = useRef<HTMLDivElement>(null);
  useEffect(()=>{list.current?.scrollTo({top:list.current.scrollHeight,behavior:"smooth"});},[voice.messages,voice.liveTranscript]);
  useEffect(()=>{
    const down=(event:KeyboardEvent)=>{const typing=(event.target as HTMLElement|null)?.matches("textarea,input,[contenteditable=true]");if(event.code==="Space"&&!typing&&!event.repeat){event.preventDefault();void voice.startTalking();}if(event.key==="Escape"&&voice.isAgentSpeaking)voice.interrupt();};
    const up=(event:KeyboardEvent)=>{const typing=(event.target as HTMLElement|null)?.matches("textarea,input,[contenteditable=true]");if(event.code==="Space"&&!typing){event.preventDefault();voice.stopTalking();}};
    window.addEventListener("keydown",down);window.addEventListener("keyup",up);return()=>{window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);};
  },[voice]);
  const submit=()=>{if(voice.connectionState!=="connected"){void voice.connect();return;}if(voice.sendText(text))setText("");};
  return <main className={styles.shell}><WorkspaceAccess identity={identity}/><div className={styles.workspace}>
    <aside className={styles.sidebar}><div className={styles.brand}><span><Sparkles size={15}/></span>YT Growth Stack</div><button className={styles.newResearch}><Plus size={14}/>New research</button><nav aria-label="Primary navigation">{nav.map(([Icon,label],index)=><button className={index===0?styles.active:""} key={label}><Icon size={16}/>{label}</button>)}</nav><div className={styles.sidebarFoot}><strong>Voice first</strong><small>Talk naturally. Every recommendation stays connected to its evidence.</small></div></aside>
    <section className={styles.conversation} aria-label="Growth Agent conversation"><header><div><strong>New research conversation</strong><small>Voice-first workspace</small></div><span className={voice.connectionState==="error"?styles.danger:""} role="status">{voice.connectionState==="connected"?<Wifi size={15}/>:<WifiOff size={15}/>}{labels[voice.connectionState]}</span></header>
      <div className={styles.messages} ref={list} aria-live="polite"><div className={styles.intro}><strong><Sparkles size={15}/>Growth Agent</strong><p>Tell me what niche, competitors, or audience you want to investigate. I&apos;ll collect evidence, explain what I find, and keep every recommendation traceable.</p></div>{voice.messages.map(message=><article className={message.role==="user"?styles.user:styles.agent} key={message.id}>{message.text}{message.status==="streaming"&&<i aria-hidden="true"/>}</article>)}{voice.liveTranscript&&<div className={styles.transcript}><Mic size={16}/><div><small>Live transcript</small><p>{voice.liveTranscript}</p></div></div>}{voice.error&&<div className={styles.error} role="alert"><MicOff size={18}/><div><strong>Voice is unavailable</strong><p>{voice.error}</p>{voice.permission==="denied"&&<small>Allow microphone access in browser settings, then try again.</small>}</div></div>}</div>
      <footer>{voice.pendingApproval&&<div className={styles.approval} role="alert"><div><strong>Approval required</strong><p>{voice.pendingApproval.summary}</p><small>The agent will not continue until you decide.</small></div><button onClick={voice.rejectTool}>Decline</button><button className={styles.approve} onClick={voice.approveTool}>Approve</button></div>}{voice.toolStatus&&<div className={styles.toolStatus}>{voice.toolStatus}</div>}{voice.isAgentSpeaking&&<button className={styles.interrupt} onClick={voice.interrupt}><CircleStop size={15}/>Interrupt agent <kbd>Esc</kbd></button>}<div className={styles.composer}><button className={`${styles.mic} ${voice.isTalking?styles.talking:""}`} onPointerDown={event=>{event.currentTarget.setPointerCapture(event.pointerId);void voice.startTalking();}} onPointerUp={voice.stopTalking} onPointerCancel={voice.stopTalking} onKeyDown={event=>{if((event.key===" "||event.key==="Enter")&&!event.repeat){event.preventDefault();void voice.startTalking();}}} onKeyUp={event=>{if(event.key===" "||event.key==="Enter"){event.preventDefault();voice.stopTalking();}}} aria-label={voice.connectionState==="connected"?"Hold to talk":"Connect microphone"} aria-pressed={voice.isTalking}><Mic size={21}/></button><textarea value={text} onChange={event=>setText(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();submit();}}} placeholder={voice.isTalking?"Listening...":"Ask the agent anything..."} aria-label="Message" rows={1}/><button className={styles.send} onClick={submit} disabled={voice.connectionState==="connected"&&!text.trim()} aria-label={voice.connectionState==="connected"?"Send message":"Connect voice session"}>{voice.connectionState==="connected"?<Send size={17}/>:<Headphones size={17}/>}</button></div><small>{voice.isTalking?"Release to send":voice.connectionState==="connected"?"Hold microphone or Space to talk - Enter sends text":"Connect to start - Permanent API keys stay server-side"}</small></footer>
    </section>
    <aside className={styles.evidence}>
  <header><div><strong>Research desk</strong><small>Sources, patterns, and ideas appear while you talk.</small></div><span>Demo preview</span></header>
  <section className={styles.signals}><small>WHAT IS MOVING</small><h3>Growth signals</h3><div><article><b>Fastest-growing format</b><strong>Build in public</strong><p>3.2x median velocity</p></article><article><b>Repeated hook</b><strong>I replaced...</strong><p>Found in 4 outliers</p></article><article><b>Content gap</b><strong>Voice workflows</strong><p>High demand, low supply</p></article></div></section>
  <section className={styles.outliers}><h3>Competitor outliers</h3><p>Illustrative rows - live evidence replaces these after a research run.</p><div><article><span><strong>I Replaced My Content Team With AI Agents</strong><small>Future Builder</small></span><b>1.2M <em>8.4x</em></b></article><article><span><strong>The AI Workflow Nobody Is Talking About</strong><small>Creator Systems</small></span><b>684K <em>6.1x</em></b></article><article><span><strong>Build Your Personal AI Operating System</strong><small>Modern Operator</small></span><b>421K <em>4.7x</em></b></article></div></section>
  <section className={styles.ideaPreview}><Lightbulb size={18}/><div><strong>Ideas worth testing</strong><p>Generated from retrieved evidence - not generic prompts.</p></div></section>
</aside>
  </div></main>;
}


