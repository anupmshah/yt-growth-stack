import { RealtimeVoiceWorkspace } from "@/features/conversation/components/realtime-voice-workspace";
export default async function Page({params}:{params:Promise<{conversationId:string}>}){const {conversationId}=await params;return <RealtimeVoiceWorkspace conversationId={conversationId}/>}

