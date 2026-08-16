import { Component, input, ContentChild, TemplateRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="form-group space-y-1.5" [class]="computedClass()">
      @if (label()) {
        <label [for]="id()" class="input-label block">
          {{ label() }}
          @if (required()) {
            <span class="text-red-500 ml-1" aria-hidden="true">*</span>
          }
        </label>
      }
      <div class="relative">
        <ng-content></ng-content>
      </div>
      @if (error()) {
        <p class="input-error-text" role="alert">{{ error() }}</p>
      } @else if (hint() && !hasError()) {
        <p class="input-hint">{{ hint() }}</p>
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
export class FormFieldComponent {
  label = input<string>('');
  id = input.required<string>();
  required = input<boolean>(false);
  error = input<string>('');
  hint = input<string>('');
  horizontal = input<boolean>(false);

  hasError = computed(() => !!this.error());

  computedClass = computed(() => {
    return this.horizontal() ? 'flex items-center gap-4' : '';
  });
}
