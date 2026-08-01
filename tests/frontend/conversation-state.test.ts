import test from "node:test";
import assert from "node:assert/strict";
import { storedConversationView } from "@/features/conversation/conversation-state";

test("conversation payload keeps the selected title and only its messages", () => {
  const view = storedConversationView({
    conversation: { id: "new-conversation", title: "Latest research" },
    messages: [{ id: "new-message", kind: "user", content: "Latest question" }],
  });
  assert.equal(view?.title, "Latest research");
  assert.deepEqual(view?.messages.map((message) => message.text), ["Latest question"]);
});

test("invalid conversation payload cannot preserve stale messages", () => {
  assert.equal(storedConversationView(null), null);
});
