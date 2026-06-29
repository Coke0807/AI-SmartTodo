// SmartTodo AI Core TypeScript Type Definitions

export type TaskPriority = 'P0' | 'P1' | 'P2';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: TaskPriority;
  estimatedTime?: string; // e.g., "2 hours"
  aiGenerated?: boolean;
  subTasks?: SubTask[];
  createdAt: string;
  dueDate?: string;
}

export type AiMode = 'local' | 'cloud' | 'hybrid';

export interface AiConfig {
  mode: AiMode;
  localEndpoint: string; // Ollama Base URL, e.g., http://localhost:11434
  cloudEndpoint: string; // OpenAI/DeepSeek API Base URL
  apiKey: string;
  modelLocal: string; // Local Model Name, e.g., llama3
  modelCloud: string; // Cloud Model Name, e.g., deepseek-chat
}
