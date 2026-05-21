import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CompletedWeek, Task, TaskView } from '../models';

@Component({
  selector: 'app-task-panel',
  imports: [FormsModule],
  templateUrl: './task-panel.html',
})
export class TaskPanelComponent {
  readonly tasks = input.required<Task[]>();

  readonly taskAdded = output<string>();
  readonly taskToggled = output<number>();
  readonly taskRemoved = output<number>();
  readonly completedCleared = output<void>();

  protected readonly taskTitle = signal('');
  protected readonly taskView = signal<TaskView>('pending');

  protected readonly pendingTasks = computed(() => this.tasks().filter((task) => !task.completed));

  protected readonly completedWeeks = computed<CompletedWeek[]>(() => {
    const weeks = new Map<string, Task[]>();

    this.tasks()
      .filter((task) => task.completed && task.completedAt)
      .forEach((task) => {
        const label = this.weekLabel(new Date(task.completedAt as string));
        const weekTasks = weeks.get(label) ?? [];

        weeks.set(label, [...weekTasks, task]);
      });

    return Array.from(weeks.entries()).map(([label, tasks]) => ({ label, tasks }));
  });

  protected selectTaskView(view: TaskView): void {
    this.taskView.set(view);
  }

  protected addTask(): void {
    const title = this.taskTitle().trim();

    if (!title) {
      return;
    }

    this.taskAdded.emit(title);
    this.taskTitle.set('');
  }

  private weekLabel(date: Date): string {
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    const diff = day === 0 ? -6 : 1 - day;

    weekStart.setDate(weekStart.getDate() + diff);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return `${this.formatShortDate(weekStart)} - ${this.formatShortDate(weekEnd)}`;
  }

  private formatShortDate(date: Date): string {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'short',
    }).format(date);
  }
}
