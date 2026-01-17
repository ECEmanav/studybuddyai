
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  officialInfo?: string;
  communityHack?: string;
  sources?: { uri: string; title: string }[];
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isLoading: boolean;
  error: string | null;
}
