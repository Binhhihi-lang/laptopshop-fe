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

export type InputType =
  'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'textarea';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => InputComponent), multi: true },
  ],
  template: `
    <div class="relative">
      @if (icon()) {
        <mat-icon
          class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 pointer-events-none"
          >{{ icon() }}</mat-icon
        >
      }
      @if (type() === 'textarea') {
        <textarea
          [id]="id()"
          [name]="name()"
          [placeholder]="placeholder()"
          [value]="_value()"
          [disabled]="displayDisabled()"
          [readonly]="readonly()"
          [required]="required()"
          [attr.minlength]="minLength()"
          [attr.maxlength]="maxLength()"
          [autocomplete]="autocomplete()"
          [rows]="rows()"
          [class]="computedClass()"
          (input)="onInput($event)"
          (blur)="onBlur()"
          (focus)="onFocus()"
          [attr.aria-label]="ariaLabel()"
          [attr.aria-describedby]="error() ? errorId() : hint() ? hintId() : null"
          [attr.aria-invalid]="!!error()"
          [attr.aria-required]="required()"
        ></textarea>
      } @else {
        <input
          [type]="type()"
          [id]="id()"
          [name]="name()"
          [placeholder]="placeholder()"
          [value]="_value()"
          [disabled]="displayDisabled()"
          [readonly]="readonly()"
          [required]="required()"
          [min]="min()"
          [max]="max()"
          [step]="step()"
          [attr.minlength]="minLength()"
          [attr.maxlength]="maxLength()"
          [pattern]="pattern()"
          [autocomplete]="autocomplete()"
          [class]="computedClass()"
          (input)="onInput($event)"
          (blur)="onBlur()"
          (focus)="onFocus()"
          [attr.aria-label]="ariaLabel()"
          [attr.aria-describedby]="error() ? errorId() : hint() ? hintId() : null"
          [attr.aria-invalid]="!!error()"
          [attr.aria-required]="required()"
        />
      }
      @if (showPasswordToggle() && (type() === 'password' || type() === 'text')) {
        <button
          type="button"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          (click)="togglePassword()"
          [attr.aria-label]="showPassword() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
          [attr.aria-pressed]="showPassword()"
        >
          <mat-icon class="w-5 h-5">{{
            showPassword() ? 'visibility_off' : 'visibility'
          }}</mat-icon>
        </button>
      }
      @if (prefix()) {
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{{
          prefix()
        }}</span>
      }
      @if (suffix()) {
        <span
          class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          >{{ suffix() }}</span
        >
      }
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
      textarea {
        resize: vertical;
        min-height: 80px;
        padding-top: 0.75rem !important;
        padding-bottom: 0.75rem !important;
      }
    `,
  ],
})
export class InputComponent implements ControlValueAccessor {
  // Inputs
  id = input.required<string>();
  name = input<string>('');
  type = input<InputType>('text');
  value = input<string>('');
  placeholder = input<string>('');
  disabled = input<boolean>(false);
  readonly = input<boolean>(false);
  required = input<boolean>(false);
  min = input<string>('');
  max = input<string>('');
  step = input<string>('');
  minLength = input<number | null>(null);
  maxLength = input<number | null>(null);
  pattern = input<string>('');
  autocomplete = input<string>('off');
  icon = input<string>('');
  prefix = input<string>('');
  suffix = input<string>('');
  showPasswordToggle = input<boolean>(false);
  error = input<string>('');
  hint = input<string>('');
  ariaLabel = input<string>('');
  rows = input<number>(3);
  /** Khi parent gán giá trị cụ thể, đồng bộ trạng thái hiện/ẩn mật khẩu từ bên ngoài */
  passwordVisible = input<boolean | undefined>(undefined);

  // State
  private _focused = signal(false);
  private _touched = signal(false);
  showPassword = signal(false);

  // ControlValueAccessor
  protected _value = signal('');
  protected _disabled = signal(false);
  private _onChange: (v: string) => void = () => {};
  private _onTouched: () => void = () => {};

  // FIX: dùng untracked() khi đọc _value() bên trong effect này, để effect
  // CHỈ re-run khi `value` (input từ parent qua [value]) đổi — không tự kích hoạt
  // lại mỗi khi writeValue()/onInput() thay đổi _value(). Nếu không, mỗi lần
  // writeValue() set giá trị mới (ví dụ khi patchValue() ở form), effect này sẽ
  // tự chạy lại, thấy `value` (luôn là '' vì không ai bind [value] khi dùng
  // formControlName) khác với _value() vừa set, rồi set _value về '' lại —
  // xóa mất giá trị vừa patch trong cùng 1 tick.
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
    this._value.set(value ?? '');
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

  // Chỉ đồng bộ khi parent bind giá trị cụ thể (undefined = mặc định, không đè nội bộ)
  private readonly passwordVisibleEffect = effect(() => {
    const visible = this.passwordVisible();
    if (visible !== undefined) {
      this.showPassword.set(visible);
    }
  });

  // Outputs
  valueChange = output<string>();
  blurEvent = output<void>();
  focusEvent = output<void>();
  passwordToggle = output<void>();

  // Computed
  hasError = computed(() => !!this.error());
  errorId = computed(() => `${this.id()}-error`);
  hintId = computed(() => `${this.id()}-hint`);

  computedClass = computed(() => {
    const base =
      'w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 border transition-colors placeholder-slate-400 dark:placeholder-slate-500';

    let paddingLeft = 'pl-3';
    if (this.icon()) paddingLeft = 'pl-10';
    if (this.prefix()) paddingLeft = 'pl-8';

    let paddingRight = 'pr-3';
    if (this.showPasswordToggle() || this.suffix()) paddingRight = 'pr-10';

    let border = 'border-slate-300 dark:border-slate-600';
    let ring = '';
    let bg = 'bg-slate-50 dark:bg-slate-800';

    if (this._focused()) {
      border = 'border-primary-500';
      bg = 'bg-slate-50 dark:bg-slate-800';
      ring = 'ring-2 ring-primary-500/30 ring-offset-white dark:ring-offset-slate-950';
    } else if (this.hasError()) {
      border = 'border-danger-500';
      ring = 'ring-2 ring-danger-500/30 ring-offset-white dark:ring-offset-slate-950';
    } else if (this._disabled() || this.readonly()) {
      bg = 'bg-slate-100 dark:bg-slate-800/50';
      border = 'border-slate-300 dark:border-slate-600';
    }

    return `${base} ${paddingLeft} ${paddingRight} ${border} ${ring} ${bg} text-slate-900 dark:text-white focus:outline-none`;
  });

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
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

  togglePassword(): void {
    this.showPassword.update((v) => !v);
    this.passwordToggle.emit();
  }
}
