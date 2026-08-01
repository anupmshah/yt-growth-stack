export type ConnectionState = "idle" | "requesting-permission" | "connecting" | "connected" | "reconnecting" | "error";
export type MicrophonePermission = "prompt" | "granted" | "denied" | "unsupported";
export type ConversationMessage = { id:string; role:"user"|"assistant"; text:string; status?:"streaming"|"complete" };
export type RealtimeSessionResponse = { client_secret?:{value?:string}|string; value?:string; ephemeral_key?:string; model?:string; session?:{model?:string} };
export type PendingToolApproval = { callId:string; name:string; arguments:unknown; summary:string };
export type RealtimeEvent = {
  type?:string; delta?:string; transcript?:string; item_id?:string; response_id?:string;
  call_id?:string; name?:string; arguments?:string; error?:{message?:string};
};
export type RealtimeWorkspaceContext = { accessToken:string; projectId:string; conversationId:string };