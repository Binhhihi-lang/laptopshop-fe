import { Component, input, computed, contentChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export type CardVariant = 'default' | 'hover' | 'compact' | 'spacious';
export type CardPadding = 'none' | 'sm' | 'default' | 'lg';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="computedClass()">
      @if (hasHeader()) {
        <div
          class="card-header border-b border-slate-200 dark:border-slate-700"
          [class.pb-4]="!compact()"
          [class.mb-4]="!compact()"
        >
          <ng-content select="app-card-header"></ng-content>
        </div>
      }

      <div class="card-content flex-1" [class]="contentPaddingClass()">
        <ng-content></ng-content>
      </div>

      @if (hasFooter()) {
        <div
          class="card-footer border-t border-slate-200 dark:border-slate-700 pt-4 mt-4 flex justify-end gap-2"
        >
          <ng-content select="app-card-footer"></ng-content>
        </div>
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
export class CardComponent {
  variant = input<CardVariant>('default');
  padding = input<CardPadding>('default');
  border = input<boolean>(true);
  shadow = input<boolean>(false);
  compact = input<boolean>(false);

  private readonly headerContent = contentChild(CardHeaderComponent);
  private readonly footerContent = contentChild(CardFooterComponent);

  hasHeader = computed(() => this.headerContent() !== undefined);

  hasFooter = computed(() => this.footerContent() !== undefined);

  computedClass = computed(() => {
    const base = 'rounded-xl bg-white dark:bg-slate-800';
    const borderClass = this.border()
      ? 'border border-slate-200 dark:border-slate-700'
      : 'border-0';
    const shadowClass = this.shadow() ? 'shadow-sm' : '';
    const hoverClass =
      this.variant() === 'hover'
        ? 'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all'
        : '';

    return `${base} ${borderClass} ${shadowClass} ${hoverClass}`;
  });

  contentPaddingClass = computed(() => {
    const compact = this.compact();
    const padding = this.padding();

    if (compact) return 'p-3';

    const paddingClasses: Record<CardPadding, string> = {
      none: 'p-0',
      sm: 'p-3',
      default: 'p-5',
      lg: 'p-6',
    };
    return paddingClasses[padding];
  });
}

@Component({
  selector: 'app-card-header',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div class="flex items-center gap-2.5 min-w-0">
        @if (icon()) {
          <mat-icon class="w-5 h-5 text-primary shrink-0">{{ icon() }}</mat-icon>
        }
        <div class="min-w-0">
          <h3 class="text-title font-semibold text-slate-900 dark:text-white">{{ title() }}</h3>
          @if (subtitle()) {
            <p class="text-body-sm text-slate-500 dark:text-slate-400 mt-1">{{ subtitle() }}</p>
          }
        </div>
      </div>
      <div class="flex items-center gap-2">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class CardHeaderComponent {
  title = input<string>('');
  subtitle = input<string>('');
  icon = input<string>('');
}

@Component({
  selector: 'app-card-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex justify-end gap-2">
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class CardFooterComponent {}
