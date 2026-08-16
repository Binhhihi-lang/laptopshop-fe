import { Component, input, computed, ContentChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          {{ title() }}
        </h1>
        @if (subtitle()) {
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ subtitle() }}</p>
        }
      </div>
      @if (hasActions()) {
        <div class="flex items-center gap-2">
          <ng-content></ng-content>
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
export class PageHeaderComponent {
  title = input.required<string>();
  subtitle = input<string>('');
  hasActions = input<boolean>(false);
}
