import { Component, input, signal, computed, effect } from '@angular/core';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarShape = 'rounded' | 'circle';
export type AvatarShadow = 'none' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-20 h-20',
};

const INITIAL_SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: 'text-[10px]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-xl',
};

const SHADOW_CLASSES: Record<AvatarShadow, string> = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
};

/**
 * Avatar hiển thị 3 trạng thái cho ảnh:
 * - loading: skeleton pulse (không text)
 * - error: fallback icon mặc định (không text)
 * - loaded: ảnh thật
 * Khi không có `src`, hiển thị initials (hoặc icon nếu không có initials).
 */
@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [],
  template: `
    <div [class]="containerClass()">
      @if (src()) {
        @if (hasError()) {
          <div class="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <svg class="w-2/5 h-2/5 text-white/80" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
              />
            </svg>
          </div>
        } @else {
          <img
            [src]="src()!"
            [alt]="alt()"
            class="w-full h-full object-cover"
            [class.invisible]="isLoading()"
            (load)="onImgLoaded()"
            (error)="onImgError()"
          />
          @if (isLoading()) {
            <div
              class="absolute inset-0 animate-pulse bg-slate-200 dark:bg-slate-700"
              aria-hidden="true"
            ></div>
          }
        }
      } @else {
        @if (initials()) {
          <span class="text-white font-bold" [class]="initialClass()">{{ initials() }}</span>
        } @else {
          <svg
            class="w-2/5 h-2/5 text-white/80"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
            />
          </svg>
        }
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }
    `,
  ],
})
export class AvatarComponent {
  src = input<string>('');
  alt = input<string>('avatar');
  initials = input<string>('');
  size = input<AvatarSize>('md');
  shape = input<AvatarShape>('rounded');
  shadow = input<AvatarShadow>('none');

  // trạng thái tải
  readonly isLoading = signal(true);
  readonly hasError = signal(false);

  // Reset trạng thái ảnh mỗi khi src thay đổi
  private readonly resetEffect = effect(() => {
    this.src();
    this.isLoading.set(true);
    this.hasError.set(false);
  });

  // computed() là một Signal đặc biệt, nó tự động nội suy (tính toán) ra một giá trị mới dựa trên các Signals khác.
  containerClass = computed(() => {
    const shapeClass = this.shape() === 'rounded' ? 'rounded-full' : 'rounded-2xl';
    return [
      'relative overflow-hidden shrink-0 flex items-center justify-center select-none',
      'bg-gradient-to-br from-blue-500 to-blue-700',
      SIZE_CLASSES[this.size()],
      shapeClass,
      SHADOW_CLASSES[this.shadow()],
    ].join(' ');
  });

  initialClass = computed(() => INITIAL_SIZE_CLASSES[this.size()]);

  onImgLoaded(): void {
    this.isLoading.set(false);
  }

  onImgError(): void {
    this.isLoading.set(false);
    this.hasError.set(true);
  }
}
