import {
  Component,
  input,
  output,
  signal,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '../button/button.component';

export interface FilterPreset {
  name: string;
  [key: string]: any;
}

@Component({
  selector: 'app-filter-presets',
  standalone: true,
  imports: [CommonModule, MatIconModule, ButtonComponent],
  template: `
    <div #container class="relative">
      <app-button
        variant="ghost"
        icon="filter_list"
        label="Bộ lọc"
        (click)="toggle()"
        [attr.aria-expanded]="open()"
        ariaLabel="Bộ lọc đã lưu"
        class="hidden sm:inline-flex"
      />
      <button
        type="button"
        (click)="toggle()"
        class="flex items-center gap-2 px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors sm:hidden"
        aria-label="Bộ lọc đã lưu"
        [attr.aria-expanded]="open()"
      >
        <mat-icon class="w-5 h-5">filter_list</mat-icon>
      </button>
      @if (open()) {
        <div
          class="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden z-[200] animate-scale-in"
        >
          <div
            class="px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between"
          >
            <p class="text-sm font-medium text-slate-900 dark:text-white">Bộ lọc nhanh</p>
            <button
              type="button"
              (click)="onSave()"
              class="text-xs text-primary hover:text-primary-hover font-medium"
              aria-label="Lưu bộ lọc hiện tại"
            >
              Lưu
            </button>
          </div>
          <div class="max-h-60 overflow-y-auto">
            @for (preset of presets(); track preset.name; let i = $index) {
              <div
                class="flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700/50"
              >
                <button
                  type="button"
                  (click)="onApply(preset)"
                  class="flex-1 text-left text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2"
                >
                  <mat-icon class="w-4 h-4 text-slate-400">filter_alt</mat-icon>
                  <span class="truncate">{{ preset.name }}</span>
                </button>
                <button
                  type="button"
                  (click)="deleteIndex.emit(i)"
                  class="p-1 text-slate-400 hover:text-danger-500 transition-colors"
                  aria-label="Xóa bộ lọc"
                >
                  <mat-icon class="w-4 h-4">close</mat-icon>
                </button>
              </div>
            }
          </div>
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
export class FilterPresetsComponent {
  // Inputs
  presets = input<FilterPreset[]>([]);

  // Outputs
  apply = output<FilterPreset>();
  save = output<void>();
  deleteIndex = output<number>();

  // Internal open state + click-outside
  open = signal(false);
  @ViewChild('container', { static: true }) container?: ElementRef<HTMLElement>;

  toggle(): void {
    this.open.set(!this.open());
  }

  onApply(preset: FilterPreset): void {
    this.apply.emit(preset);
    this.open.set(false);
  }

  onSave(): void {
    this.save.emit();
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    const target = event.target as HTMLElement;
    if (!this.container?.nativeElement.contains(target)) {
      this.open.set(false);
    }
  }
}
