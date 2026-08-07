import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">{{ title }}</h1>
        @if (subtitle) {
          <p class="text-sm text-slate-500 mt-1">{{ subtitle }}</p>
        }
      </div>
      @if (actions) {
        <div class="flex items-center gap-2">
          <ng-content></ng-content>
        </div>
      }
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle?: string;
  @Input() actions = false;
}