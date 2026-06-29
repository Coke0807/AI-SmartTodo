import { apiService, getAuthHeader } from './api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const aiApi = {
  // Why: Forward conversation message with history and current AI config to backend.
  async chat(message: string, history: ChatMessage[]): Promise<string> {
    const configStr = localStorage.getItem('smarttodo_ai_config');
    const config = configStr ? JSON.parse(configStr) : undefined;

    const res = await apiService.fetch('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history, config }),
    });
    return res.data.response;
  },

  // Why: Stream chat response token-by-token via SSE for real-time display.
  async *chatStream(message: string, history: ChatMessage[]): AsyncGenerator<string, void, unknown> {
    const configStr = localStorage.getItem('smarttodo_ai_config');
    const config = configStr ? JSON.parse(configStr) : undefined;

    const response = await fetch('/api/ai/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ message, history, config }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '流式请求失败');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('无法读取流式响应');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            if (parsed.token) {
              yield parsed.token;
            }
            if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (e) {
            if (e instanceof Error && !e.message.includes('流式') && !e.message.includes('无法读取')) {
              console.warn('[SSE] Parse skip:', data);
            } else if (e instanceof Error && (e.message.includes('流式') || e.message.includes('无法读取'))) {
              throw e;
            }
          }
        }
      }
    }
  },

  // Why: Query the RAG knowledge base using local Ollama model with active AI config.
  async ragQuery(query: string): Promise<string> {
    const configStr = localStorage.getItem('smarttodo_ai_config');
    const config = configStr ? JSON.parse(configStr) : undefined;

    const res = await apiService.fetch('/ai/rag', {
      method: 'POST',
      body: JSON.stringify({ query, config }),
    });
    return res.data.answer;
  },

  // Why: Fetch list of uploaded notes/documents for RAG.
  async getFiles(): Promise<string[]> {
    const res = await apiService.fetch('/ai/files');
    return res.data || [];
  },

  // Why: Delete a specific note/document from the RAG knowledge base.
  async deleteFile(filename: string): Promise<void> {
    await apiService.fetch(`/ai/files/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });
  },

  // Why: Upload a file using FormData and native fetch to preserve boundary headers.
  async uploadFile(file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/ai/upload', {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error || '上传文件失败';
      throw new Error(errorMsg);
    }
  }
};
