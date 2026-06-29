import { apiService } from './api';
import type { TodoItem, TaskPriority } from '../types/config';

// Why: Backend model returns ID as number. We translate it to string for React app schema compatibility.
interface BackendSubTask {
  id: number;
  todoId: number;
  title: string;
  completed: boolean;
}

interface BackendTodo {
  id: number;
  userId: number;
  title: string;
  description?: string;
  completed: boolean;
  priority: string;
  estimatedTime?: string;
  dueDate?: string;
  aiGenerated?: boolean;
  createdAt: string;
  subTasks?: BackendSubTask[];
}

const mapSubTask = (st: BackendSubTask) => ({
  id: String(st.id),
  title: st.title,
  completed: st.completed,
});

const mapTodo = (t: BackendTodo): TodoItem => ({
  id: String(t.id),
  title: t.title,
  description: t.description,
  completed: t.completed,
  priority: t.priority as TaskPriority,
  estimatedTime: t.estimatedTime,
  dueDate: t.dueDate ? t.dueDate.split('T')[0] : undefined, // Format date to YYYY-MM-DD
  aiGenerated: t.aiGenerated ?? false,
  createdAt: t.createdAt ? t.createdAt.split('T')[0] : '',
  subTasks: t.subTasks ? t.subTasks.map(mapSubTask) : [],
});

export const todoApi = {
  // Why: Fetch all todos and transform their numeric IDs to strings.
  async getTodos(): Promise<TodoItem[]> {
    const res = await apiService.fetch('/todos');
    return res.data.map(mapTodo);
  },

  // Why: Send POST request to create a new Todo and format return values.
  async createTodo(todo: Omit<TodoItem, 'id' | 'createdAt'>): Promise<TodoItem> {
    const res = await apiService.fetch('/todos', {
      method: 'POST',
      body: JSON.stringify({
        title: todo.title,
        description: todo.description,
        priority: todo.priority,
        estimatedTime: todo.estimatedTime,
        dueDate: todo.dueDate,
        aiGenerated: todo.aiGenerated ?? false,
        subTasks: todo.subTasks?.map(st => ({ title: st.title, completed: st.completed })),
      }),
    });
    return mapTodo(res.data);
  },

  // Why: Send PUT request to update Todo fields and subtask states.
  async updateTodo(id: string, updates: Partial<TodoItem>): Promise<TodoItem> {
    const res = await apiService.fetch(`/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: updates.title,
        description: updates.description,
        completed: updates.completed,
        priority: updates.priority,
        estimatedTime: updates.estimatedTime,
        dueDate: updates.dueDate,
        // Why: Pass subtasks array if present so backend can update their completion statuses.
        subTasks: updates.subTasks?.map(st => ({
          id: Number(st.id),
          title: st.title,
          completed: st.completed,
        })),
      }),
    });
    return mapTodo(res.data);
  },

  // Why: Send DELETE request to delete a Todo and its subtasks.
  async deleteTodo(id: string): Promise<void> {
    await apiService.fetch(`/todos/${id}`, {
      method: 'DELETE',
    });
  },

  // Why: Request AI optimizer for splitting tasks and predicting time duration, passing current AI config.
  async aiSplit(title: string, description?: string): Promise<{
    title: string;
    description: string;
    priority: TaskPriority;
    estimatedTime: string;
    subTasks: Array<{ title: string; completed: boolean }>;
  }> {
    const configStr = localStorage.getItem('smarttodo_ai_config');
    const config = configStr ? JSON.parse(configStr) : undefined;

    const res = await apiService.fetch('/todos/ai-split', {
      method: 'POST',
      body: JSON.stringify({ title, description, config }),
    });
    return res.data;
  },

  // Why: Fetch aggregated todo statistics for the dashboard charts.
  async getStats(): Promise<{
    total: number;
    completed: number;
    pending: number;
    completionRate: number;
    p0Count: number;
    p1Count: number;
    p2Count: number;
    totalSubTasks: number;
    completedSubTasks: number;
    aiGenerated: number;
  }> {
    const res = await apiService.fetch('/todos/stats');
    return res.data;
  }
};
