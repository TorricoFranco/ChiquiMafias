 interface ChatMessage {
  avatar: string;
  user: string;
  time: string;
  message: string;
}

export type ChatMessagesProps = ChatMessage[];