"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ConnectionState,
  ConversationMessage,
  MicrophonePermission,
  RealtimeEvent,
  RealtimeSessionResponse,
} from "../types/realtime";

const DEFAULT_MODEL = "gpt-realtime-2.1";

function sessionCredential(payload: RealtimeSessionResponse) {
  if (typeof payload.client_secret === "string") return payload.client_secret;
  return payload.client_secret?.value ?? payload.value ?? payload.ephemeral_key;
}

function messageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useRealtimeVoice() {
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [permission, setPermission] = useState<MicrophonePermission>("prompt");
  const [isTalking, setIsTalking] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const assistantDraftRef = useRef("");

  const sendEvent = useCallback((event: Record<string, unknown>) => {
    const channel = channelRef.current;
    if (channel?.readyState === "open") channel.send(JSON.stringify(event));
  }, []);

  const handleEvent = useCallback((event: RealtimeEvent) => {
    switch (event.type) {
      case "input_audio_buffer.speech_started":
        setLiveTranscript("");
        break;
      case "conversation.item.input_audio_transcription.delta":
        setLiveTranscript((current) => current + (event.delta ?? ""));
        break;
      case "conversation.item.input_audio_transcription.completed": {
        const transcript = event.transcript?.trim();
        if (transcript) {
          setMessages((current) => [...current, { id: event.item_id ?? messageId("user"), role: "user", text: transcript, status: "complete" }]);
        }
        setLiveTranscript("");
        break;
      }
      case "response.audio.delta":
        setIsAgentSpeaking(true);
        break;
      case "response.audio_transcript.delta":
      case "response.output_text.delta": {
        const delta = event.delta ?? "";
        assistantDraftRef.current += delta;
        const id = event.response_id ?? "assistant-stream";
        setMessages((current) => {
          const withoutDraft = current.filter((message) => message.id !== "assistant-stream" && message.id !== id);
          return [...withoutDraft, { id, role: "assistant", text: assistantDraftRef.current, status: "streaming" }];
        });
        break;
      }
      case "response.done":
        setIsAgentSpeaking(false);
        setMessages((current) => current.map((message) => message.status === "streaming" ? { ...message, status: "complete" } : message));
        assistantDraftRef.current = "";
        break;
      case "error":
        setError(event.error?.message ?? "The voice session reported an error.");
        break;
    }
  }, []);

  const disconnect = useCallback(() => {
    channelRef.current?.close();
    peerRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    audioRef.current?.pause();
    channelRef.current = null;
    peerRef.current = null;
    streamRef.current = null;
    audioRef.current = null;
    setIsTalking(false);
    setIsAgentSpeaking(false);
    setConnectionState("idle");
  }, []);

  const connect = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
      setPermission("unsupported");
      setError("This browser does not support microphone-based Realtime conversations.");
      return;
    }
    if (connectionState === "connected" || connectionState === "connecting") return;
    setError(null);
    setConnectionState("requesting-permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      stream.getAudioTracks().forEach((track) => { track.enabled = false; });
      streamRef.current = stream;
      setPermission("granted");
      setConnectionState("connecting");

      const sessionResponse = await fetch("/api/realtime/session", { method: "POST" });
      const payload = await sessionResponse.json() as RealtimeSessionResponse & { error?: string };
      if (!sessionResponse.ok) throw new Error(payload.error ?? "Could not create a voice session.");
      const credential = sessionCredential(payload);
      if (!credential) throw new Error("The voice session did not return a temporary credential.");

      const peer = new RTCPeerConnection();
      peerRef.current = peer;
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      const audio = new Audio();
      audio.autoplay = true;
      audioRef.current = audio;
      peer.ontrack = ({ streams }) => { audio.srcObject = streams[0]; };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "connected") setConnectionState("connected");
        if (peer.connectionState === "disconnected") setConnectionState("reconnecting");
        if (peer.connectionState === "failed") {
          setConnectionState("error");
          setError("The voice connection failed. Disconnect and try again.");
        }
      };
      const channel = peer.createDataChannel("oai-events");
      channelRef.current = channel;
      channel.onmessage = ({ data }) => {
        try { handleEvent(JSON.parse(data) as RealtimeEvent); } catch { /* Ignore malformed provider events. */ }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const model = payload.model ?? payload.session?.model ?? DEFAULT_MODEL;
      const sdpResponse = await fetch(`https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model)}`, {
        method: "POST",
        body: offer.sdp,
        headers: { Authorization: `Bearer ${credential}`, "Content-Type": "application/sdp" },
      });
      if (!sdpResponse.ok) throw new Error("OpenAI could not establish the voice connection.");
      await peer.setRemoteDescription({ type: "answer", sdp: await sdpResponse.text() });
    } catch (cause) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const denied = cause instanceof DOMException && (cause.name === "NotAllowedError" || cause.name === "SecurityError");
      if (denied) setPermission("denied");
      setConnectionState("error");
      setError(cause instanceof Error ? cause.message : "Could not start the voice session.");
    }
  }, [connectionState, handleEvent]);

  const startTalking = useCallback(async () => {
    if (connectionState !== "connected") {
      await connect();
      return;
    }
    if (isAgentSpeaking) sendEvent({ type: "response.cancel" });
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = true; });
    setLiveTranscript("");
    setIsTalking(true);
  }, [connect, connectionState, isAgentSpeaking, sendEvent]);

  const stopTalking = useCallback(() => {
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = false; });
    if (isTalking) sendEvent({ type: "input_audio_buffer.commit" });
    setIsTalking(false);
  }, [isTalking, sendEvent]);

  const interrupt = useCallback(() => {
    sendEvent({ type: "response.cancel" });
    audioRef.current?.pause();
    setIsAgentSpeaking(false);
  }, [sendEvent]);

  const sendText = useCallback((text: string) => {
    const cleanText = text.trim();
    if (!cleanText || connectionState !== "connected") return false;
    setMessages((current) => [...current, { id: messageId("user"), role: "user", text: cleanText, status: "complete" }]);
    sendEvent({ type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_text", text: cleanText }] } });
    sendEvent({ type: "response.create" });
    return true;
  }, [connectionState, sendEvent]);

  useEffect(() => disconnect, [disconnect]);

  return { connectionState, permission, isTalking, isAgentSpeaking, liveTranscript, messages, error, connect, disconnect, startTalking, stopTalking, interrupt, sendText };
}
