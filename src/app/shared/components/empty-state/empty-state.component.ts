import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '../button/button.component';

export type EmptyStateVariant = 'no-data' | 'no-results' | 'error' | 'permission';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, ButtonComponent, MatIconModule],
  template: `
    <div class="empty-state p-12 text-center" [class]="variantClass()">
      <div
        class="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
        [class]="iconBgClass()"
      >
        <mat-icon class="w-10 h-10" [class]="iconColorClass()">{{ icon() }}</mat-icon>
      </div>
      <h3 class="text-lg font-medium mb-2" [class]="titleColorClass()">{{ title() }}</h3>
      <p class="text-sm mb-6 max-w-md mx-auto" [class]="descriptionColorClass()">
        {{ description() }}
      </p>
      @if (actionLabel()) {
        <app-button
          [label]="actionLabel()"
          [icon]="actionIcon()"
          [variant]="actionVariant()"
          (click)="actionClick.emit()"
          class="inline-flex"
        />
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class EmptyStateComponent {
  icon = input<string>('inventory_2');
  title = input<string>('Không có dữ liệu');
  description = input<string>('Hiện tại chưa có dữ liệu nào');
  actionLabel = input<string>('');
  actionIcon = input<string>('add');
  actionVariant = input<'primary' | 'secondary' | 'ghost' | 'outline'>('primary');
  variant = input<EmptyStateVariant>('no-data');

  actionClick = output<void>();

  variantClass = computed(() => {
    const variants: Record<EmptyStateVariant, string> = {
      'no-data': '',
      'no-results': '',
      error:
        'bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-xl',
      permission:
        'bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-xl',
    };
    return variants[this.variant()];
  });

  iconBgClass = computed(() => {
    const variants: Record<EmptyStateVariant, string> = {
      'no-data': 'bg-slate-100 dark:bg-slate-800',
      'no-results': 'bg-slate-100 dark:bg-slate-800',
      error: 'bg-danger-100 dark:bg-danger-900/30',
      permission: 'bg-warning-100 dark:bg-warning-900/30',
    };
    return variants[this.variant()];
  });

  iconColorClass = computed(() => {
    const variants: Record<EmptyStateVariant, string> = {
      'no-data': 'text-slate-400 dark:text-slate-600',
      'no-results': 'text-slate-400 dark:text-slate-600',
      error: 'text-danger-600 dark:text-danger-400',
      permission: 'text-warning-600 dark:text-warning-400',
    };
    return variants[this.variant()];
  });

  titleColorClass = computed(() => {
    const variants: Record<EmptyStateVariant, string> = {
      'no-data': 'text-slate-900 dark:text-white',
      'no-results': 'text-slate-900 dark:text-white',
      error: 'text-danger-900 dark:text-danger-100',
      permission: 'text-warning-900 dark:text-warning-100',
    };
    return variants[this.variant()];
  });

  descriptionColorClass = computed(() => {
    const variants: Record<EmptyStateVariant, string> = {
      'no-data': 'text-slate-500 dark:text-slate-400',
      'no-results': 'text-slate-500 dark:text-slate-400',
      error: 'text-danger-700 dark:text-danger-300',
      permission: 'text-warning-700 dark:text-warning-300',
    };
    return variants[this.variant()];
  });
}
