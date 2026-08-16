import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <span [class]="computedClass()" [attr.aria-label]="label()">
      @if (icon()) {
        <mat-icon class="w-3.5 h-3.5 mr-1.5">{{ icon() }}</mat-icon>
      }
      {{ label() }}
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
    `,
  ],
})
export class BadgeComponent {
  label = input.required<string>();
  variant = input<BadgeVariant>('neutral');
  icon = input<string>('');
  size = input<'sm' | 'default'>('default');
  dot = input<boolean>(false);

  computedClass = computed(() => {
    const base = 'inline-flex items-center font-medium rounded-full border whitespace-nowrap';

    const sizeClasses = {
      sm: 'px-2 py-0.5 text-xs',
      default: 'px-2.5 py-0.5 text-xs',
    };

    const variantClasses: Record<BadgeVariant, string> = {
      success:
        'bg-success-50 text-success-700 border-success-200 dark:bg-success-900/30 dark:text-success-400 dark:border-success-800',
      warning:
        'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-900/30 dark:text-warning-400 dark:border-warning-800',
      danger:
        'bg-danger-50 text-danger-700 border-danger-200 dark:bg-danger-900/30 dark:text-danger-400 dark:border-danger-800',
      info: 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/30 dark:text-primary-400 dark:border-primary-800',
      primary:
        'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/30 dark:text-primary-400 dark:border-primary-800',
      neutral:
        'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700',
    };

    return `${base} ${sizeClasses[this.size()]} ${variantClasses[this.variant()]}`;
  });
}
