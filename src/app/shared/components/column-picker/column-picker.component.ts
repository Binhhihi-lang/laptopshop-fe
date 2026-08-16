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
import { Column } from '../table/table.component';

@Component({
  selector: 'app-column-picker',
  standalone: true,
  imports: [CommonModule, MatIconModule, ButtonComponent],
  template: `
    <div #container class="relative">
      <app-button
        variant="ghost"
        icon="view_column"
        [label]="label()"
        (click)="toggle()"
        [attr.aria-expanded]="open()"
        ariaLabel="Chọn cột hiển thị"
        class="hidden sm:inline-flex"
      />
      <button
        type="button"
        (click)="toggle()"
        class="flex items-center gap-2 px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors sm:hidden"
        aria-label="Chọn cột hiển thị"
        [attr.aria-expanded]="open()"
      >
        <mat-icon class="w-5 h-5">view_column</mat-icon>
      </button>
      @if (open()) {
        <div
          class="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-[200] animate-scale-in"
        >
          @for (column of columns(); track column.key) {
            <label
              class="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
            >
              <input
                type="checkbox"
                [checked]="column.visible"
                (change)="toggleColumn.emit(column.key)"
                class="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary/30"
              />
              <span>{{ column.label }}</span>
            </label>
          }
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
export class ColumnPickerComponent {
  // Inputs
  columns = input<Column<any>[]>([]);
  label = input<string>('Cột');

  // Outputs
  toggleColumn = output<string>();

  // Internal open state + click-outside
  open = signal(false);
  @ViewChild('container', { static: true }) container?: ElementRef<HTMLElement>;

  toggle(): void {
    this.open.set(!this.open());
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
