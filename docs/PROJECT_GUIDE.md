# Photo Card Kiosk — 심층 가이드

이 문서는 `photo-card-app`의 **현재 구현 구조**를 기준으로 동작 흐름, 핵심 모듈, 운영/개발 포인트, 그리고 **향후 구현 방향(로드맵)**을 정리한다.

## 1) 시스템 한 줄 요약

쿠폰 바코드를 스캔하면 `/api/coupons/validate`에서 **쿠폰을 원자적으로 사용 처리**하고, 성공 시 Web Bluetooth로 ESP32에 `PRINT`를 보내 **포토카드 머신(릴레이)을 트리거**한다.

## 2) 런타임 전제(중요)

- Web Bluetooth는 **HTTPS 또는 localhost**에서만 동작한다.
  - 로컬 네트워크(예: 태블릿/노트북에서 `192.168.x.x:3000` 접근) 테스트는 `npm run dev:https`를 권장한다.
- 카메라 접근은 브라우저 권한이 필요하다.
- 권장 브라우저: Chrome/Edge 계열 (Web Bluetooth 지원)
- `next.config.ts`의 `allowedDevOrigins`는 개발 중 로컬 네트워크에서 접근하는 상황을 고려해 `192.168.0.*`, `192.168.1.*`, `localhost:*`를 허용한다.

## 3) 현재 구현 플로우(데이터/상태 흐름)

### 3-1. 시퀀스(현재 코드 기준)

1. `src/components/CameraTab.tsx`가 카메라 스트림에서 바코드를 감지 → `onScan(code)` 호출
2. `src/app/page.tsx`의 `handleScan`이 `/api/coupons/validate`에 `POST` 요청
3. `src/app/api/coupons/validate/route.ts`가 MongoDB에서 쿠폰을 조회/갱신
   - **핵심: `isUsed=false`인 문서만 찾아 `isUsed=true`로 바꾸는 원자적 업데이트**
4. 응답이 `VALID_AND_REDEEMED`이고 BLE 연결이 되어 있으면 `src/hooks/useBLE.ts`가 `PRINT`를 write
5. ESP32(`esp32/photo_card_trigger.ino`)가 `PRINT` 수신 → 릴레이를 짧게 ON/OFF → (옵션) `DONE` notify

### 3-2. 상태 머신(현재 UI 기준)

- `couponStatus`: `INVALID` / `ALREADY_USED` / `VALID_AND_REDEEMED` / `null`
- `triggerStatus`: `idle` → `sending` → `success|failed`

현재 구현은 **ESP32의 `DONE` notify를 기다리지 않고**, write 성공 여부로 `success|failed`를 판단한다.

## 4) 폴더/파일 역할(핵심만)

- `src/app/page.tsx`
  - 키오스크 메인 화면(카메라 스캔 + 쿠폰 검증 + BLE 트리거까지 한 화면에서 orchestrate)
- `src/app/api/coupons/validate/route.ts`
  - 쿠폰 검증/사용 처리 API (핵심 비즈니스 로직)
- `src/lib/mongodb.ts`
  - Next dev 환경을 고려한 Mongoose 커넥션 캐시(`global.mongooseCache`)
- `src/lib/models/coupon.ts`
  - Coupon 모델(유일키: `couponNumber`)
- `src/hooks/useBLE.ts`
  - Web Bluetooth 연결 및 `PRINT` write
- `src/components/CameraTab.tsx`
  - ZXing 기반 카메라 스캔(중복 스캔 방지: 2초 쿨다운)
- `esp32/photo_card_trigger.ino`
  - BLE GATT Server, `PRINT` 수신 시 릴레이 트리거 + `DONE` notify

참고:
- `src/components/BarcodeTab.tsx`, `src/hooks/useBarcodeScanner.ts`, `src/components/BLEConnection.tsx`는 **현재 `page.tsx`에서 사용되지 않는다.** (향후 “USB 바코드 리더 모드/탭” 복원 가능)

## 5) DB 모델/동시성(쿠폰 중복 사용 방지)

### 5-1. Coupon 모델 의미

`src/lib/models/coupon.ts` 기준:

- `couponNumber`: 쿠폰 식별자(바코드로 들어오는 값)
- `isUsed`: 사용 여부
- `usedAt`: 사용 처리 시간
- `usedBy`: (확장 여지) 키오스크/오퍼레이터 식별

### 5-2. 원자적 사용 처리(중요)

`src/app/api/coupons/validate/route.ts`는 아래 조건으로 갱신한다:

- 조건: `{ couponNumber, isUsed: false }`
- 갱신: `{ $set: { isUsed: true, usedAt: new Date() } }`

즉, 동시에 두 번 들어와도 **첫 요청만 성공**하고 나머지는 `ALREADY_USED`로 떨어지게 설계되어 있다.

## 6) BLE 프로토콜(웹 ↔ ESP32)

- UUID는 `src/lib/constants.ts`와 `esp32/photo_card_trigger.ino`가 동일해야 한다.
  - Service: `BLE_SERVICE_UUID`
  - Write: `BLE_WRITE_CHAR_UUID`
  - Notify: `BLE_NOTIFY_CHAR_UUID` (ESP32는 `DONE` notify를 보냄)
- 명령:
  - Web → ESP32: `PRINT`
  - ESP32 → Web: `DONE` (현재 웹은 미사용)

권장 개선:
- Web에서 notify characteristic 구독을 붙이고 `DONE` 기준으로 `triggerStatus`를 `success`로 전환
- timeout(예: 5초) 후 `failed` 처리

## 7) 운영/현장 체크리스트(키오스크 관점)

- 브라우저 권한
  - 카메라 권한 허용
  - BLE 연결 팝업에서 올바른 디바이스 선택(서비스 UUID로 필터링)
- 네트워크
  - MongoDB 연결 가능해야 함(`MONGODB_URI`)
  - 로컬 네트워크 접속이면 HTTPS 필수 (`npm run dev:https`로 빠른 검증)
- 장비
  - ESP32 전원/릴레이 결선 확인(GPIO4)
  - 릴레이 트리거 지속시간(`TRIGGER_DURATION_MS`)은 머신 요구사항에 맞게 조정

## 8) 구현 방향(로드맵 제안)

현재는 “한 화면에서 빠르게 동작”에 초점이 맞춰져 있다. 운영 안정성과 확장성을 위해 아래 순서로 정리하는 걸 권장한다.

### 8-1. FE 공통 인프라 도입

1) `cn()` 유틸 추가 및 className 일괄 정리

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
```

권장:
- 위치: `src/shared/lib/cn/cn.ts` (FSD 전환 전이라면 임시로 `src/lib/cn.ts`도 가능)
- 패키지: `clsx`, `tailwind-merge`

2) TanStack Query 도입(필수)
- `/api/coupons/validate`를 `useMutation`으로 전환해 네트워크/에러/재시도 정책을 중앙화한다.

App Router 기준 Provider 예시:

```tsx
'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};
```

3) Jotai 도입(필수)
- “현재 스캔 상태 / 마지막 코드 / 연결 상태”처럼 화면 전역에서 공유되는 상태를 atom으로 정리한다.

### 8-2. 도메인 분리(FSD 점진 전환)

- `coupon 검증`, `BLE 트리거`, `scan 입력(카메라/USB)`를 각각 `features/*`로 분리
- 화면 단위는 `widgets/*`로 합치고 `src/app/page.tsx`는 조립만 담당

### 8-3. BLE 신뢰성 개선

- `DONE` notify를 실제로 사용해 “출력 완료”를 판정
- 재연결 UX(자동 reconnect, 가이드 문구) 개선

### 8-4. 보안/운영 안전장치

- `/api/coupons/validate`는 외부 노출 시 쿠폰 소진이 가능하므로 운영 환경에서 최소한의 보호(예: 키오스크 토큰, IP allowlist 등)를 고려한다.
- `seed`는 운영 DB에서 실행하면 데이터가 초기화되므로, 개발 환경에서만 사용하도록 가이드/스크립트 분리 권장
