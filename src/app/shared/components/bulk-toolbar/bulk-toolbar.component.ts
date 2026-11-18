import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
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
  imports: [CommonModule, MatIconModule, MatMenuModule, ButtonComponent],
  template: `
    @if (count() > 0) {
      <div
        class="bg-primary/10 dark:bg-primary/20 border-b border-primary/30 py-3 sticky top-16 z-[85] animate-slide-down"
      >
        <div class="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div class="flex items-center gap-2 sm:gap-3 text-sm font-medium text-primary min-w-0">
            <mat-icon class="!w-5 !h-5 shrink-0">check_circle</mat-icon>
            <span class="truncate">{{ count() }} {{ itemLabel() }} đã chọn</span>
          </div>

          <!-- Mobile: 1 hàng — nút chính + menu cho phần còn lại -->
          <div class="flex items-center gap-1 sm:hidden shrink-0">
            @if (primaryButton(); as main) {
              <app-button
                [variant]="main.variant"
                [icon]="main.icon"
                size="icon"
                [iconOnly]="true"
                [ariaLabel]="main.label"
                [disabled]="main.disabled ?? false"
                (click)="main.handler()"
              />
            }
            <button
              type="button"
              class="p-2 rounded-lg text-primary hover:bg-primary/10"
              [matMenuTriggerFor]="moreMenu"
              aria-label="Thao tác khác"
            >
              <mat-icon class="!w-6 !h-6 !text-2xl !leading-none">more_vert</mat-icon>
            </button>
            <mat-menu #moreMenu="matMenu">
              @for (button of secondaryButtons(); track button.label) {
                <button
                  mat-menu-item
                  [disabled]="button.disabled ?? false"
                  (click)="button.handler()"
                >
                  <mat-icon>{{ button.icon }}</mat-icon>
                  <span>{{ button.label }}</span>
                </button>
              }
              <button mat-menu-item (click)="clear.emit()">
                <mat-icon>close</mat-icon>
                <span>Bỏ chọn</span>
              </button>
            </mat-menu>
          </div>

          <!-- Tablet/desktop: hiện đủ nút -->
          <div class="hidden sm:flex items-center gap-2 flex-wrap justify-end">
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

  /** Nút chính hiện trên mobile; phần còn lại gom vào menu. */
  primaryButton = computed<BulkToolbarButton | null>(() => this.buttons()[0] ?? null);
  secondaryButtons = computed<BulkToolbarButton[]>(() => this.buttons().slice(1));
}
