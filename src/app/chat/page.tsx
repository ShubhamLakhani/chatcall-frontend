"use client";
import { Suspense } from "react";
import ChatClient from "~/components/chat/ChatClient";

export default function ChatPage() {
  return (
    <Suspense fallback={<p>Loading chat...</p>}>
      <ChatClient />
    </Suspense>
  );
}
