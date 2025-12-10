import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Task, CreateTaskInput, UpdateTaskInput } from '../types';
import * as tasksApi from '../api/tasks';

interface TaskContextType {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  fetchTasks: (includeCompleted?: boolean) => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (id: string, input: UpdateTaskInput) => Promise<Task>;
  completeTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  clearTasks: () => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (includeCompleted = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedTasks = await tasksApi.getTasks(includeCompleted);
      setTasks(fetchedTasks);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tasks');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTask = useCallback(async (input: CreateTaskInput) => {
    const newTask = await tasksApi.createTask(input);
    setTasks((prev) => [newTask, ...prev]);
    return newTask;
  }, []);

  const updateTask = useCallback(async (id: string, input: UpdateTaskInput) => {
    const updatedTask = await tasksApi.updateTask(id, input);
    setTasks((prev) =>
      prev.map((task) => (task._id === id ? updatedTask : task))
    );
    return updatedTask;
  }, []);

  const completeTask = useCallback(async (id: string) => {
    const completedTask = await tasksApi.completeTask(id);
    setTasks((prev) =>
      prev.map((task) => (task._id === id ? completedTask : task))
    );
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    await tasksApi.deleteTask(id);
    setTasks((prev) => prev.filter((task) => task._id !== id));
  }, []);

  const clearTasks = useCallback(() => {
    setTasks([]);
    setError(null);
  }, []);

  const value: TaskContextType = {
    tasks,
    isLoading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
    clearTasks,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks(): TaskContextType {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
}

