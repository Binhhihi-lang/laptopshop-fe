import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type LoadingType = 'spinner' | 'skeleton' | 'dots' | 'pulse';
export type LoadingSize = 'sm' | 'default' | 'lg' | 'xl';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    @switch (type()) {
      @case ('spinner') {
        <svg
          class="animate-spin"
          [class]="spinnerSizeClass()"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
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
      }
      @case ('dots') {
        <div class="flex gap-1" [class]="dotsSizeClass()" aria-hidden="true">
          <div class="rounded-full bg-current animate-bounce" style="animation-delay: 0ms;"></div>
          <div class="rounded-full bg-current animate-bounce" style="animation-delay: 150ms;"></div>
          <div class="rounded-full bg-current animate-bounce" style="animation-delay: 300ms;"></div>
        </div>
      }
      @case ('pulse') {
        <div [class]="pulseClass()" aria-hidden="true"></div>
      }
      @default {
        <!-- skeleton -->
        <div [class]="skeletonClass()" aria-hidden="true"></div>
      }
    }
    @if (text()) {
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center">{{ text() }}</p>
    }
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
      }
    `,
  ],
})
export class LoadingComponent {
  type = input<LoadingType>('spinner');
  size = input<LoadingSize>('default');
  color = input<'primary' | 'secondary' | 'muted'>('primary');
  text = input<string>('');
  width = input<string>('100%');
  height = input<string>('1rem');
  borderRadius = input<string>('rounded');

  spinnerSizeClass = computed(() => {
    const sizes: Record<LoadingSize, string> = {
      sm: 'w-4 h-4',
      default: 'w-8 h-8',
      lg: 'w-12 h-12',
      xl: 'w-16 h-16',
    };
    const colors: Record<string, string> = {
      primary: 'text-primary-600',
      secondary: 'text-slate-400',
      muted: 'text-slate-300 dark:text-slate-600',
    };
    return `${sizes[this.size()]} ${colors[this.color()]}`;
  });

  dotsSizeClass = computed(() => {
    const sizes: Record<LoadingSize, string> = {
      sm: 'w-1.5 h-1.5',
      default: 'w-2 h-2',
      lg: 'w-3 h-3',
      xl: 'w-4 h-4',
    };
    const colors: Record<string, string> = {
      primary: 'text-primary-600',
      secondary: 'text-slate-400',
      muted: 'text-slate-300 dark:text-slate-600',
    };
    return `${colors[this.color()]}`;
  });

  pulseClass = computed(() => {
    return `animate-pulse bg-slate-200 dark:bg-slate-700 ${this.borderRadius()} w-full h-4 ${this.width()} ${this.height()}`;
  });

  skeletonClass = computed(() => {
    return `animate-pulse bg-slate-200 dark:bg-slate-700 ${this.borderRadius()} ${this.width()} ${this.height()}`;
  });
}
