export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';
export type TaskView = 'pending' | 'weeklyCompleted';
export type TimerSettingKey = keyof TimerSettings;

export interface Task {
  id: number;
  title: string;
  completed: boolean;
  completedAt?: string | null;
}

export interface CompletedWeek {
  label: string;
  tasks: Task[];
}

export interface TimerSettings {
  focus: number;
  shortBreak: number;
  longBreak: number;
  sessionsBeforeLongBreak: number;
}
