import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [],
  template: `<div [class]="skeletonClass()"></div>`,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class SkeletonComponent {
  width = input<string>('');
  height = input<string>('');
  radius = input<string>('rounded');
  circle = input<boolean>(false);

  skeletonClass = computed(() => {
    const base = 'bg-slate-200 dark:bg-slate-700 animate-pulse';
    if (this.circle()) {
      return `${base} rounded-full ${this.width()}`;
    }
    return `${base} ${this.radius()} ${this.width()} ${this.height()}`;
  });
}
