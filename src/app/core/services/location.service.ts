import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, shareReplay } from 'rxjs';

/**
 * Địa chỉ hành chính VN SAU SÁP NHẬP 2025 — chỉ còn 2 cấp:
 * Tỉnh/Thành phố → Phường/Xã (không còn Quận/Huyện).
 *
 * Dùng API công khai provinces.open-api.vn (34 tỉnh, CORS mở cho GET) nên gọi
 * thẳng từ FE, KHÔNG cần endpoint/entity phía BE. BE chỉ lưu code + name dạng chuỗi.
 *
 * Lưu ý tham số `depth`: depth=1 chỉ trả đúng cấp được hỏi (con để rỗng), nên
 * lấy phường/xã phải depth=2.
 */
export interface Province {
  code: number;
  name: string;
}

export interface Commune {
  code: number;
  name: string;
}

/** API trả object đầy đủ; FE chỉ cần code + name nên lọc lại cho nhẹ. */
interface RawProvince {
  code: number;
  name: string;
  wards?: Commune[];
}

const API_BASE = 'https://provinces.open-api.vn/api/v2';

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly http = inject(HttpClient);

  /** Danh sách tỉnh/thành — cache vì gần như không đổi trong 1 phiên. */
  private provinces$?: Observable<Province[]>;

  /** Phường/xã theo từng tỉnh — cache theo code để đổi qua lại không gọi lại. */
  private readonly communeCache = new Map<string, Observable<Commune[]>>();

  getProvinces(): Observable<Province[]> {
    if (!this.provinces$) {
      this.provinces$ = this.http.get<RawProvince[]>(`${API_BASE}/?depth=1`).pipe(
        map((list) => list.map((p) => ({ code: p.code, name: p.name }))),
        shareReplay(1),
      );
    }
    return this.provinces$;
  }

  /**
   * Phường/xã của 1 tỉnh. Chưa chọn tỉnh → trả mảng rỗng, không gọi API.
   *
   * BẮT BUỘC `depth=2`: `depth=1` chỉ trả đúng cấp được hỏi nên `wards` rỗng,
   * phải depth=2 mới lồng danh sách phường/xã vào province.
   */
  getCommunes(provinceCode: string): Observable<Commune[]> {
    if (!provinceCode) {
      return of([]);
    }
    let cached = this.communeCache.get(provinceCode);
    if (!cached) {
      cached = this.http.get<RawProvince>(`${API_BASE}/p/${provinceCode}?depth=2`).pipe(
        map((res) => (res.wards ?? []).map((w) => ({ code: w.code, name: w.name }))),
        shareReplay(1),
      );
      this.communeCache.set(provinceCode, cached);
    }
    return cached;
  }
}
