import { Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton-card',
  standalone: true,
  imports: [],
  template: `
    <div
      class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 animate-pulse {{
        padding()
      }}"
    >
      <ng-content></ng-content>
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
export class SkeletonCardComponent {
  padding = input<string>('p-6');
}
