import {
  Component,
  forwardRef,
  input,
  output,
  signal,
  computed,
  effect,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectComponent), multi: true },
  ],
  template: `
    <div class="relative">
      @if (icon()) {
        <mat-icon
          class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 pointer-events-none"
          >{{ icon() }}</mat-icon
        >
      }
      <select
        [id]="id()"
        [name]="name()"
        [value]="_value()"
        [disabled]="displayDisabled()"
        [required]="required()"
        [multiple]="multiple()"
        [class]="computedClass()"
        (change)="onChange($event)"
        (blur)="onBlur()"
        (focus)="onFocus()"
        [attr.aria-label]="ariaLabel()"
        [attr.aria-describedby]="error() ? errorId() : hint() ? hintId() : null"
        [attr.aria-invalid]="!!error()"
        [attr.aria-required]="required()"
      >
        @if (!multiple() && placeholder()) {
          <option [value]="" disabled [selected]="!_value()">{{ placeholder() }}</option>
        }
        @for (option of options(); track option.value) {
          <option [value]="option.value" [disabled]="option.disabled">{{ option.label }}</option>
        }
      </select>
      <mat-icon
        class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
        >expand_more</mat-icon
      >
    </div>
    @if (error()) {
      <p [id]="errorId()" class="input-error-text mt-1.5" role="alert">{{ error() }}</p>
    } @else if (hint() && !hasError()) {
      <p [id]="hintId()" class="input-hint mt-1.5">{{ hint() }}</p>
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
export class SelectComponent implements ControlValueAccessor {
  // Inputs
  id = input.required<string>();
  name = input<string>('');
  options = input.required<SelectOption[]>();
  value = input<string>('');
  placeholder = input<string>('');
  disabled = input<boolean>(false);
  required = input<boolean>(false);
  multiple = input<boolean>(false);
  icon = input<string>('');
  error = input<string>('');
  hint = input<string>('');
  ariaLabel = input<string>('');

  // State
  private _focused = signal(false);
  private _touched = signal(false);

  // ControlValueAccessor
  protected _value = signal('');
  protected _disabled = signal(false);
  private _onChange: (v: string) => void = () => {};
  private _onTouched: () => void = () => {};

  // FIX: untracked() để effect chỉ theo dõi `value` (input từ parent qua [value]),
  // không tự kích hoạt lại mỗi khi writeValue()/onChange() đổi `_value()`.
  // Nếu không, mỗi lần writeValue() set categoryId từ patchValue(), effect này
  // tự chạy lại, thấy `value` (luôn là '' vì dùng formControlName, không bind [value])
  // khác với _value() vừa set, rồi set _value về '' — xóa mất categoryId vừa patch.
  private readonly valueSyncEffect = effect(() => {
    const parentValue = this.value();
    untracked(() => {
      if (parentValue !== this._value()) {
        this._value.set(parentValue);
      }
    });
  });

  displayDisabled = computed(() => this._disabled() || this.disabled());

  writeValue(value: string): void {
    // Chuẩn hóa về string vì <option [value]="option.value"> luôn là string.
    // Nếu Backend trả categoryId dạng number, ép kiểu ở đây để tránh lệch kiểu
    // khi so khớp option nào đang được chọn.
    this._value.set(value != null ? String(value) : '');
  }

  registerOnChange(fn: (v: string) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._disabled.set(isDisabled);
  }

  // Outputs
  valueChange = output<string>();
  blurEvent = output<void>();
  focusEvent = output<void>();

  // Computed
  hasError = computed(() => !!this.error());
  errorId = computed(() => `${this.id()}-error`);
  hintId = computed(() => `${this.id()}-hint`);

  computedClass = computed(() => {
    const base =
      'w-full appearance-none px-3 py-2 rounded-lg text-sm transition-colors bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500';

    let paddingLeft = 'pl-3';
    if (this.icon()) paddingLeft = 'pl-10';
    const paddingRight = 'pr-10';

    let border = 'border-slate-300 dark:border-slate-600';
    let ring = '';
    let bg = 'bg-slate-50 dark:bg-slate-800';

    if (this._focused()) {
      border = 'border-primary-500';
      ring = 'ring-2 ring-primary-500/30 ring-offset-white dark:ring-offset-slate-950';
    } else if (this.hasError()) {
      border = 'border-danger-500';
      ring = 'ring-2 ring-danger-500/30 ring-offset-white dark:ring-offset-slate-950';
    } else if (this._disabled() || this.disabled()) {
      bg = 'bg-slate-100 dark:bg-slate-800/50';
      border = 'border-slate-300 dark:border-slate-600';
    }

    return `${base} ${paddingLeft} ${paddingRight} ${border} ${ring} ${bg} focus:outline-none`;
  });

  onChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this._value.set(value);
    this._onChange(value);
    this.valueChange.emit(value);
  }

  onBlur(): void {
    this._touched.set(true);
    this._focused.set(false);
    this._onTouched();
    this.blurEvent.emit();
  }

  onFocus(): void {
    this._focused.set(true);
    this.focusEvent.emit();
  }
}
