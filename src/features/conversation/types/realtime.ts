export type ConnectionState =
  | "idle"
  | "requesting-permission"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export type MicrophonePermission = "prompt" | "granted" | "denied" | "unsupported";

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  status?: "streaming" | "complete";
};

export type RealtimeSessionResponse = {
  client_secret?: { value?: string } | string;
  value?: string;
  ephemeral_key?: string;
  model?: string;
  session?: { model?: string };
};

export type RealtimeEvent = {
  type?: string;
  delta?: string;
  transcript?: string;
  item_id?: string;
  response_id?: string;
  error?: { message?: string };
};
