import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputComponent } from './input.component';

/**
 * Bug thật (voucher-form): ô "Giá trị giảm (₫)" TRỐNG khi mở form sửa voucher
 * loại số tiền, dù FormControl đã có giá trị.
 *
 * <p>
 * Nguyên nhân: ô nằm trong `@if (isPercentType()) {...} @else {...}`, nên khi mở
 * form sửa, `patchForm()` đổi `discountType` sang `'amount'` VÀ set giá trị CÙNG
 * LÚC → change detection mới tạo `app-input`, lúc đó FormControl đã có giá trị.
 * `writeValue()` nạp giá trị vào `_value`, rồi `valueSyncEffect` (đọc `value()`
 * không ai bind) ghi đè về rỗng → ô trống.
 *
 * <p>
 * Hệ quả nặng hơn bug hiển thị: admin bấm Lưu mà không nhập lại → FE gửi
 * `discountAmount: null` → voucher mất giá trị giảm trong DB.
 */
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, InputComponent],
  template: `
    <form [formGroup]="form">
      @if (kind() === 'percent') {
        <app-input id="percent" formControlName="percent" type="number" />
      } @else {
        <app-input id="amount" formControlName="amount" type="number" />
      }
    </form>
  `,
})
class HostComponent {
  readonly kind = signal<'percent' | 'amount'>('percent');
  readonly form = new FormGroup({
    percent: new FormControl<number | null>(null),
    amount: new FormControl<number | null>(null),
  });
}

@Component({
  standalone: true,
  imports: [InputComponent],
  template: `<app-input id="email" [value]="email()" />`,
})
class BoundHostComponent {
  readonly email = signal('a@b.com');
}

describe('InputComponent — giá trị patch vào ô nằm trong @if', () => {
  /** <input> thật đang render (lấy theo thẻ, tránh nhầm với host <app-input>). */
  function theInput(fixture: ComponentFixture<unknown>): HTMLInputElement {
    const list = fixture.nativeElement.querySelectorAll('input');
    expect(list.length).toBe(1);
    return list[0] as HTMLInputElement;
  }

  it('đổi nhánh @if + patch cùng lúc → ô số tiền phải hiện giá trị đã patch', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);

    fixture.detectChanges(); // render nhánh 'percent' trước

    // Đúng chuỗi thao tác của patchForm(): set giá trị + đổi nhánh cùng lúc.
    fixture.componentInstance.form.patchValue({ amount: 500000 });
    fixture.componentInstance.kind.set('amount');

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(theInput(fixture).value).toBe('500000');
  });

  it('ô NGOÀI @if patch bình thường vẫn hiển thị đúng (không hồi quy)', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    fixture.componentInstance.form.patchValue({ percent: 15 });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(theInput(fixture).value).toBe('15');
  });

  it('parent bind [value] thì vẫn đồng bộ xuống (giữ tính năng cũ)', async () => {
    await TestBed.configureTestingModule({ imports: [BoundHostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(BoundHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(theInput(fixture).value).toBe('a@b.com');
  });
});
