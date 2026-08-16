import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent, ButtonVariant } from '../button/button.component';

export interface BulkToolbarButton {
  label: string;
  icon: string;
  variant: ButtonVariant;
  handler: () => void;
  disabled?: boolean;
}

@Component({
  selector: 'app-bulk-toolbar',
  standalone: true,
  imports: [CommonModule, MatIconModule, ButtonComponent],
  template: `
    @if (count() > 0) {
      <div
        class="bg-primary/10 dark:bg-primary/20 border-b border-primary/30 px-4 md:px-6 lg:px-8 py-3 sticky top-[72px] z-[85] animate-slide-down"
      >
        <div
          class="max-w-screen-2xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div class="flex items-center gap-3 text-sm font-medium text-primary">
            <mat-icon class="w-5 h-5">check_circle</mat-icon>
            <span>{{ count() }} {{ itemLabel() }} đã chọn</span>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            @for (button of buttons(); track button.label) {
              <app-button
                [variant]="button.variant"
                [icon]="button.icon"
                [label]="button.label"
                (click)="button.handler()"
                [disabled]="button.disabled ?? false"
              />
            }
            <app-button
              variant="ghost"
              icon="close"
              label="Bỏ chọn"
              (click)="clear.emit()"
              ariaLabel="Bỏ chọn tất cả"
            />
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class BulkToolbarComponent {
  // Inputs
  count = input<number>(0);
  itemLabel = input<string>('mục');
  buttons = input<BulkToolbarButton[]>([]);

  // Outputs
  clear = output<void>();
}
