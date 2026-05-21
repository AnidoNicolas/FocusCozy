import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TimerMode, TimerSettingKey, TimerSettings } from '../models';

@Component({
  selector: 'app-timer-panel',
  imports: [FormsModule],
  templateUrl: './timer-panel.html',
})
export class TimerPanelComponent {
  readonly settings = input.required<TimerSettings>();
  readonly mode = input.required<TimerMode>();
  readonly secondsLeft = input.required<number>();
  readonly isRunning = input.required<boolean>();
  readonly soundEnabled = input.required<boolean>();
  readonly completedPomodoros = input.required<number>();
  readonly activeTasks = input.required<number>();
  readonly completedTasks = input.required<number>();

  readonly modeSelected = output<TimerMode>();
  readonly timerToggled = output<void>();
  readonly timerReset = output<void>();
  readonly soundToggled = output<void>();
  readonly settingUpdated = output<{ key: TimerSettingKey; value: string | number }>();

  protected readonly settingsVisible = signal(false);

  protected readonly modeLabel = computed(() => {
    const labels: Record<TimerMode, string> = {
      focus: 'Enfoque',
      shortBreak: 'Descanso corto',
      longBreak: 'Descanso largo',
    };

    return labels[this.mode()];
  });

  protected readonly formattedTime = computed(() => {
    const minutes = Math.floor(this.secondsLeft() / 60);
    const seconds = this.secondsLeft() % 60;

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  });

  protected readonly progress = computed(() => {
    const total = this.settings()[this.mode()] * 60;

    return Math.round(((total - this.secondsLeft()) / total) * 100);
  });

  protected toggleSettings(): void {
    this.settingsVisible.update((visible) => !visible);
  }
}
