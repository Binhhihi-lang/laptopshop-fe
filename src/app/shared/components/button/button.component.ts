import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
export type ButtonSize = 'sm' | 'default' | 'lg' | 'icon';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <button
      [type]="type()"
      [disabled]="disabled()"
      [class]="computedClass()"
      (click)="onClick($event)"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-disabled]="disabled()"
    >
      @if (loading()) {
        <svg
          class="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      } @else if (icon()) {
        <mat-icon class="w-5 h-5" [class.mr-2]="!iconOnly()">{{ icon() }}</mat-icon>
      }
      <span>{{ label() }}</span>
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
    `,
  ],
})
export class ButtonComponent {
  // Inputs
  label = input<string>('');
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('default');
  type = input<'button' | 'submit' | 'reset'>('button');
  disabled = input<boolean>(false);
  loading = input<boolean>(false);
  icon = input<string>('');
  iconOnly = input<boolean>(false);
  ariaLabel = input<string>('');

  // Computed classes based on DESIGN.md tokens
  computedClass = computed(() => {
    const base =
      'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantClasses: Record<ButtonVariant, string> = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
      secondary:
        'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 active:bg-slate-300 dark:active:bg-slate-500',
      ghost:
        'bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
      danger: 'bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-800',
      success: 'bg-success-600 text-white hover:bg-success-700 active:bg-success-800',
      outline:
        'border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700',
    };

    const sizeClasses: Record<ButtonSize, string> = {
      sm: 'px-3 py-1.5 text-xs gap-1.5',
      default: 'px-4 py-2 text-sm gap-1.5',
      lg: 'px-6 py-3 text-base gap-2',
      icon: 'p-2',
    };

    return `${base} ${variantClasses[this.variant()]} ${sizeClasses[this.size()]}${this.iconOnly() ? ' w-10 h-10' : ''} rounded-lg`;
  });

  onClick(event: MouseEvent): void {
    if (this.disabled() || this.loading()) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
