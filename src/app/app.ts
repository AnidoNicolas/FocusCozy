import { Component, OnDestroy, ViewEncapsulation, computed, signal } from '@angular/core';
import { TaskPanelComponent } from './task-panel/task-panel';
import { TimerPanelComponent } from './timer-panel/timer-panel';
import { Task, TimerMode, TimerSettingKey, TimerSettings } from './models';

const TASKS_COOKIE = 'productivityTasks';
const TASK_ID_COOKIE = 'productivityNextTaskId';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const DEFAULT_TASKS: Task[] = [
  { id: 1, title: 'Planificar las 3 prioridades del dia', completed: false, completedAt: null },
  { id: 2, title: 'Bloquear una sesion de foco profundo', completed: false, completedAt: null },
];

@Component({
  selector: 'app-root',
  imports: [TimerPanelComponent, TaskPanelComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  encapsulation: ViewEncapsulation.None,
})
export class App implements OnDestroy {
  protected readonly settings = signal<TimerSettings>({
    focus: 25,
    shortBreak: 5,
    longBreak: 15,
    sessionsBeforeLongBreak: 4,
  });
  protected readonly mode = signal<TimerMode>('focus');
  protected readonly secondsLeft = signal(this.settings().focus * 60);
  protected readonly isRunning = signal(false);
  protected readonly soundEnabled = signal(true);
  protected readonly completedPomodoros = signal(0);
  protected readonly tasks = signal<Task[]>(this.loadTasks());

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private nextTaskId = this.loadNextTaskId();

  protected readonly completedTasks = computed(
    () => this.tasks().filter((task) => task.completed).length,
  );

  protected readonly activeTasks = computed(
    () => this.tasks().filter((task) => !task.completed).length,
  );

  ngOnDestroy(): void {
    this.stopTimer();
  }

  protected toggleTimer(): void {
    if (this.isRunning()) {
      this.stopTimer();
      return;
    }

    this.isRunning.set(true);
    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  protected resetTimer(): void {
    this.stopTimer();
    this.secondsLeft.set(this.durationForMode(this.mode()) * 60);
  }

  protected toggleSound(): void {
    this.soundEnabled.update((enabled) => !enabled);
  }

  protected selectMode(mode: TimerMode): void {
    this.mode.set(mode);
    this.resetTimer();
  }

  protected updateSetting(key: TimerSettingKey, value: string | number): void {
    const numericValue = Number(value);
    const minimums: TimerSettings = {
      focus: 1,
      shortBreak: 1,
      longBreak: 1,
      sessionsBeforeLongBreak: 2,
    };
    const maximums: TimerSettings = {
      focus: 90,
      shortBreak: 30,
      longBreak: 60,
      sessionsBeforeLongBreak: 8,
    };

    const clampedValue = Math.min(
      maximums[key],
      Math.max(minimums[key], Number.isFinite(numericValue) ? numericValue : minimums[key]),
    );

    this.settings.update((settings) => ({
      ...settings,
      [key]: clampedValue,
    }));

    this.resetTimer();
  }

  protected addTask(title: string): void {
    this.tasks.update((tasks) => [
      { id: this.nextTaskId++, title, completed: false, completedAt: null },
      ...tasks,
    ]);
    this.saveTasks();
    this.setCookie(TASK_ID_COOKIE, String(this.nextTaskId));
  }

  protected toggleTask(taskId: number): void {
    this.tasks.update((tasks) =>
      tasks.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        const completed = !task.completed;

        return {
          ...task,
          completed,
          completedAt: completed ? new Date().toISOString() : null,
        };
      }),
    );
    this.saveTasks();
  }

  protected removeTask(taskId: number): void {
    this.tasks.update((tasks) => tasks.filter((task) => task.id !== taskId));
    this.saveTasks();
  }

  protected clearCompleted(): void {
    this.tasks.update((tasks) => tasks.filter((task) => !task.completed));
    this.saveTasks();
  }

  private tick(): void {
    if (this.secondsLeft() > 1) {
      this.secondsLeft.update((seconds) => seconds - 1);
      return;
    }

    this.completeInterval();
  }

  private completeInterval(): void {
    this.stopTimer();
    this.playCompletionSound();

    if (this.mode() === 'focus') {
      const completed = this.completedPomodoros() + 1;
      const nextMode =
        completed % this.settings().sessionsBeforeLongBreak === 0 ? 'longBreak' : 'shortBreak';

      this.completedPomodoros.set(completed);
      this.mode.set(nextMode);
      this.secondsLeft.set(this.durationForMode(nextMode) * 60);
      return;
    }

    this.mode.set('focus');
    this.secondsLeft.set(this.settings().focus * 60);
  }

  private stopTimer(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning.set(false);
  }

  private durationForMode(mode: TimerMode): number {
    return this.settings()[mode];
  }

  private loadTasks(): Task[] {
    const storedTasks = this.getCookie(TASKS_COOKIE);

    if (!storedTasks) {
      return DEFAULT_TASKS;
    }

    try {
      const parsedTasks = JSON.parse(storedTasks) as Task[];

      if (!Array.isArray(parsedTasks)) {
        return DEFAULT_TASKS;
      }

      return parsedTasks.filter(
        (task) =>
          typeof task.id === 'number' &&
          typeof task.title === 'string' &&
          typeof task.completed === 'boolean',
      ).map((task) => ({
        ...task,
        completedAt: task.completedAt ?? null,
      }));
    } catch {
      return DEFAULT_TASKS;
    }
  }

  private loadNextTaskId(): number {
    const storedNextId = Number(this.getCookie(TASK_ID_COOKIE));

    if (Number.isFinite(storedNextId) && storedNextId > 0) {
      return storedNextId;
    }

    const highestTaskId = this.tasks().reduce((highest, task) => Math.max(highest, task.id), 0);

    return highestTaskId + 1;
  }

  private saveTasks(): void {
    this.setCookie(TASKS_COOKIE, JSON.stringify(this.tasks()));
  }

  private getCookie(name: string): string {
    const cookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${encodeURIComponent(name)}=`));

    return cookie ? decodeURIComponent(cookie.split('=')[1]) : '';
  }

  private setCookie(name: string, value: string): void {
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
      value,
    )}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
  }

  private playCompletionSound(): void {
    if (!this.soundEnabled()) {
      return;
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const audioContext = new AudioContextClass();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    const tones = [740, 988, 740];

    gain.connect(audioContext.destination);
    gain.gain.setValueAtTime(0.0001, now);

    tones.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const start = now + index * 0.16;
      const end = start + 0.12;

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.connect(gain);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.start(start);
      oscillator.stop(end);
    });

    window.setTimeout(() => void audioContext.close(), 650);
  }
}
