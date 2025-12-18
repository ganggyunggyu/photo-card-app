# 클로드 보고서: 포토카드 키오스크 소프트웨어 심층 분석

> 작성일: 2025-12-18
> 분석 대상: photo-card-app 전체 소프트웨어 스택

---

## 목차

1. [분석 개요](#1-분석-개요)
2. [원자적 업데이트 (중복 배출 방지)](#2-원자적-업데이트-중복-배출-방지)
3. [에러 핸들링](#3-에러-핸들링)
4. [쿨다운/중복 방지 로직](#4-쿨다운중복-방지-로직)
5. [로깅 구현](#5-로깅-구현)
6. [HTTP 방식 트리거 지원](#6-http-방식-트리거-지원)
7. [인덱스 설정](#7-인덱스-설정)
8. [BLE 통신 훅 분석](#8-ble-통신-훅-분석)
9. [바코드/카메라 스캔 분석](#9-바코드카메라-스캔-분석)
10. [ESP32 펌웨어 분석](#10-esp32-펌웨어-분석)
11. [MongoDB 연결 관리](#11-mongodb-연결-관리)
12. [종합 평가 및 개선 로드맵](#12-종합-평가-및-개선-로드맵)

---

## 1. 분석 개요

### 분석 대상 파일

| 영역 | 파일 경로 |
|------|----------|
| API 라우트 | `src/app/api/coupons/validate/route.ts` |
| BLE 훅 | `src/features/ble-connection/hooks/useBLE.ts` |
| MongoDB 연결 | `src/shared/lib/mongodb.ts` |
| MongoDB 스키마 | `src/entities/coupon/model/coupon.ts` |
| 바코드 스캔 훅 | `src/features/coupon-scan/hooks/useBarcodeScanner.ts` |
| 카메라 컴포넌트 | `src/features/coupon-scan/ui/CameraTab.tsx` |
| 메인 페이지 | `src/app/page.tsx` |
| ESP32 펌웨어 | `esp32/photo_card_trigger.ino` |

### 분석 관점

- 동시 요청 시 중복 배출 방지 (원자적 업데이트)
- 에러 핸들링 충분성
- 쿨다운/중복 방지 로직
- 로깅 구현 상태
- HTTP 방식 트리거 지원 여부
- 데이터베이스 인덱스 설정

---

## 2. 원자적 업데이트 (중복 배출 방지)

### 평가: **우수** ✅

**현재 구현** (`validate/route.ts:31-36`):

```typescript
const updatedCoupon = await Coupon.findOneAndUpdate(
  { couponNumber: normalizedCode, isUsed: false },
  { $set: { isUsed: true, usedAt: new Date() } },
  { new: true }
);
```

### 장점

- MongoDB의 `findOneAndUpdate`를 사용하여 **조회와 업데이트를 원자적으로 처리**
- 조건 `{ isUsed: false }`로 필터링하면, 동시 요청이 들어와도 **첫 번째 요청만 성공**
- Race condition이 기본적으로 차단됨

### 동작 흐름

```
요청 A (t=0ms): findOneAndUpdate → 성공 → VALID_AND_REDEEMED → 배출
요청 B (t=5ms): findOneAndUpdate → null 반환 → ALREADY_USED → 배출 안 함
```

### 결론

원자적 업데이트는 **완벽하게 구현**되어 있음. 단, 인덱스 최적화 필요 (섹션 7 참고)

---

## 3. 에러 핸들링

### 평가: **보통** ⚠️

### 3.1 현재 상태

| 위치 | 구현 | 평가 |
|------|------|------|
| API try-catch | 있음 | ⚠️ 일반적 |
| 입력 검증 | 기본 타입 체크만 | ⚠️ 부족 |
| DB 연결 오류 | 상위로 전파 | ⚠️ 명시적 처리 없음 |

### 3.2 문제점

#### 에러 로깅 부족

```typescript
catch (error) {
  console.error('Coupon validation error:', error);  // 너무 일반적
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

- 에러 종류 구분 안 함 (DB 연결? 스키마 오류? 네트워크?)
- 운영 환경 디버깅 어려움
- 클라이언트에 상세 정보 미제공

#### 입력 검증 부실

```typescript
if (!couponNumber || typeof couponNumber !== 'string') {
  // ❌ 빈 문자열("") 체크 없음
  // ❌ 극단적 길이 제한 없음
  // ❌ 바코드 포맷 검증 없음
}
```

### 3.3 개선 권장

```typescript
// 입력 검증 강화
const BARCODE_PATTERN = /^\d{8,20}$/;  // 8-20자리 숫자
const normalizedCode = couponNumber.trim();

if (!normalizedCode || !BARCODE_PATTERN.test(normalizedCode)) {
  return NextResponse.json(
    { status: COUPON_STATUS.INVALID, reason: 'invalid_format' },
    { status: 400 }
  );
}
```

---

## 4. 쿨다운/중복 방지 로직

### 평가: **약함** ⚠️

### 4.1 레이어별 분석

| 레이어 | 쿨다운 | 상태 |
|--------|--------|------|
| 카메라 스캔 | 2초 | ✅ 있음 |
| USB 바코드 | 없음 | ❌ 없음 |
| 메인 페이지 | 없음 | ❌ 없음 |
| API | 없음 (원자적 업데이트로 대체) | ✅ 충분 |

### 4.2 카메라 스캔 쿨다운 (`CameraTab.tsx:46-56`)

```typescript
if (
  scannedText !== lastScannedRef.current ||
  now - lastScanTimeRef.current > 2000
) {
  lastScannedRef.current = scannedText;
  lastScanTimeRef.current = now;
  onScan(scannedText);
}
```

- 같은 코드 2초 내 반복 시 무시 ✅
- 다른 코드는 즉시 허용 ✅

### 4.3 메인 페이지 문제 (`page.tsx:17-48`)

```typescript
const handleScan = useCallback(async (code: string) => {
  // ❌ 쿨다운 없이 즉시 API 호출
  const response = await fetch('/api/coupons/validate', { ... });
}, []);
```

**문제**: USB 바코드 리더 사용 시 중복 호출 가능

### 4.4 개선 권장

```typescript
// page.tsx에 쿨다운 추가
const lastApiCallRef = useRef<number>(0);
const COOLDOWN_MS = 1500;

const handleScan = useCallback(async (code: string) => {
  const now = Date.now();
  if (now - lastApiCallRef.current < COOLDOWN_MS) {
    console.log('Cooldown active, skipping...');
    return;
  }
  lastApiCallRef.current = now;

  // ... API 호출
}, []);
```

---

## 5. 로깅 구현

### 평가: **부족** ⚠️

### 5.1 현재 로깅 현황

| 위치 | 방식 | 내용 |
|------|------|------|
| API | `console.error()` | 쿠폰 검증 오류 |
| BLE | `console.error()` | 연결/송신 오류 |
| 카메라 | `console.error()` | 초기화 오류 |
| ESP32 | `Serial.println()` | BLE/트리거 로그 |

### 5.2 문제점

1. **구조화된 로깅 없음**: JSON 포맷 아님
2. **타임스탬프 없음**: 정확한 발생 시간 파악 어려움
3. **컨텍스트 정보 부족**:
   - 쿠폰 상태별 로깅 없음
   - 요청 ID(requestId) 없음
   - API 응답 시간 측정 안 함
4. **로그 레벨 구분 없음**: info/warn/error 미구분

### 5.3 개선 권장

```typescript
// src/shared/lib/logger.ts
export const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    console.log(JSON.stringify({
      level: 'INFO',
      msg,
      data,
      ts: new Date().toISOString()
    })),

  error: (msg: string, error?: Error, data?: Record<string, unknown>) =>
    console.error(JSON.stringify({
      level: 'ERROR',
      msg,
      error: error?.message,
      stack: error?.stack,
      data,
      ts: new Date().toISOString()
    })),
};

// 사용 예
logger.info('Coupon validated', {
  couponNumber: '12345678',
  status: 'VALID_AND_REDEEMED',
  responseTimeMs: 45
});
```

---

## 6. HTTP 방식 트리거 지원

### 평가: **미지원** ❌

### 6.1 현재 상태

- 트리거 방식: **BLE(Web Bluetooth)만 지원**
- HTTP REST API 트리거: **없음**

### 6.2 현재 트리거 로직 (`page.tsx:33-41`)

```typescript
if (data.status === COUPON_STATUS.VALID_AND_REDEEMED) {
  if (connectionStatus === 'connected') {
    const success = await sendPrintCommand();  // BLE만 사용
    setTriggerStatus(success ? 'success' : 'failed');
  } else {
    setTriggerStatus('failed');  // BLE 미연결 시 실패
  }
}
```

### 6.3 문제점

1. **BLE 연결 필수**: ESP32 미연결 시 배출 불가
2. **폴백 없음**: BLE 실패 시 대체 수단 없음
3. **운영 위험**: BLE 불안정 시 서비스 장애

### 6.4 개선 권장: HTTP 폴백 추가

```typescript
// 1. ESP32에 HTTP 서버 추가 (로컬 Wi-Fi)
// 2. 클라이언트에서 폴백 로직 구현

const triggerDispense = async (): Promise<boolean> => {
  // 1차: BLE 시도
  if (connectionStatus === 'connected') {
    const bleSuccess = await sendPrintCommand();
    if (bleSuccess) return true;
  }

  // 2차: HTTP 폴백
  try {
    const res = await fetch(`http://${ESP32_IP}/dispense`, {
      method: 'POST',
      signal: AbortSignal.timeout(5000)
    });
    return res.ok;
  } catch {
    return false;
  }
};
```

---

## 7. 인덱스 설정

### 평가: **부족** ⚠️

### 7.1 현재 스키마 (`coupon.ts`)

```typescript
const couponSchema = new Schema<ICoupon>({
  couponNumber: {
    type: String,
    required: true,
    unique: true,  // ✅ 유니크 인덱스
    index: true,   // ✅ 단일 인덱스
  },
  isUsed: {
    type: Boolean,
    default: false,
    // ❌ 인덱스 없음!
  },
});
```

### 7.2 문제점

API 핵심 쿼리:
```typescript
{ couponNumber: normalizedCode, isUsed: false }
```

- `couponNumber`: 인덱스 있음 ✅
- `isUsed`: **인덱스 없음** ❌
- 복합 쿼리 효율: **부분 최적화됨**

### 7.3 영향 분석

| 쿠폰 수 | 현재 성능 | 인덱스 추가 후 |
|---------|----------|---------------|
| 1,000 | 빠름 | 차이 미미 |
| 100,000 | 느려짐 | 빠름 유지 |
| 1,000,000 | **심각한 저하** | 빠름 유지 |

### 7.4 개선 권장

```typescript
// 방법 1: 스키마에 복합 인덱스 추가
couponSchema.index({ couponNumber: 1, isUsed: 1 });

// 방법 2: isUsed 필드에 개별 인덱스
isUsed: {
  type: Boolean,
  default: false,
  index: true,  // 추가
}
```

**MongoDB Shell로 직접 추가:**
```javascript
db.coupons.createIndex({ couponNumber: 1, isUsed: 1 });
```

---

## 8. BLE 통신 훅 분석

### 평가: **기본적 기능** ⚠️

### 8.1 장점

- 기본 연결/해제 구현 ✅
- 에러 메시지 표시 ✅
- GATT 서비스/특성 획득 ✅

### 8.2 문제점

#### 재연결 로직 없음

```typescript
const connect = useCallback(async () => {
  const server = await device.gatt?.connect();  // 1회만 시도
  // ❌ 실패 시 자동 재시도 없음
}, []);
```

#### 타임아웃 처리 없음

```typescript
await characteristicRef.current.writeValue(data);  // 무한 대기 가능
```

#### NOTIFY 특성 미사용

ESP32가 `DONE` 응답을 보내도 웹에서 수신하지 않음

### 8.3 개선 권장

```typescript
// 타임아웃 추가
const writeWithTimeout = async (data: Uint8Array, timeoutMs = 5000) => {
  return Promise.race([
    characteristicRef.current!.writeValue(data),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('BLE timeout')), timeoutMs)
    )
  ]);
};

// 재연결 로직
const connectWithRetry = async (maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await connect();
      return true;
    } catch (err) {
      console.warn(`Connection attempt ${i + 1} failed`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return false;
};
```

---

## 9. 바코드/카메라 스캔 분석

### 평가: **적절** ✅

### 9.1 장점

- 후면 카메라 우선 선택 (모바일 최적화) ✅
- 상세한 에러 메시지 ✅
- 2초 중복 스캔 방지 ✅
- 스트림 해제 (cleanup) ✅

### 9.2 문제점

#### 바코드 형식 검증 없음

```typescript
const scannedText = result.getText();  // 아무 검증 없이 전달
onScan(scannedText);
```

#### 카메라 재시도 없음

```typescript
if (videoInputDeviceList.length === 0) {
  setError('카메라를 찾을 수 없습니다.');
  return;  // 그냥 포기
}
```

### 9.3 개선 권장

```typescript
// 바코드 포맷 검증
const VALID_BARCODE = /^\d{8,20}$/;
if (!VALID_BARCODE.test(scannedText)) {
  console.warn('Invalid barcode format:', scannedText);
  return;
}
onScan(scannedText);
```

---

## 10. ESP32 펌웨어 분석

### 평가: **기본적** ⚠️

### 10.1 장점

- BLE GATT Server 구현 ✅
- 명령 수신 및 트리거 동작 ✅
- 시리얼 로깅 ✅

### 10.2 문제점

#### 데드맨 스위치 없음

```cpp
void triggerOutput() {
  digitalWrite(RELAY_PIN, HIGH);
  delay(TRIGGER_DURATION_MS);
  digitalWrite(RELAY_PIN, LOW);
  // ❌ 펌웨어 크래시 시 릴레이가 ON 상태로 남을 수 있음
}
```

#### GPIO4 부팅 스트랩 위험

GPIO4는 ESP32 부팅 중 HIGH 상태 필요. 외부 회로가 강하게 당기면 부팅 실패 가능.

### 10.3 개선 권장

```cpp
// Watchdog Timer 추가
#include <esp_task_wdt.h>

void setup() {
  esp_task_wdt_init(5, true);  // 5초 워치독
  esp_task_wdt_add(NULL);
}

void loop() {
  esp_task_wdt_reset();  // 주기적 리셋
  // ...
}

// 또는 Heartbeat 기반 안전장치
unsigned long lastActivity = 0;
void loop() {
  if (millis() - lastActivity > 10000) {
    digitalWrite(RELAY_PIN, LOW);  // 10초 무활동 시 강제 OFF
  }
}
```

---

## 11. MongoDB 연결 관리

### 평가: **적절** ✅

### 11.1 장점

- 전역 캐시 사용 (재연결 방지) ✅
- Promise 기반 ✅

### 11.2 문제점

- 연결 풀 설정 없음
- 재연결 정책 없음

### 11.3 개선 권장

```typescript
// mongodb.ts
cached.promise = mongoose.connect(MONGODB_URI!, {
  maxPoolSize: 10,
  minPoolSize: 5,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000,
}).then((mongoose) => mongoose);

// 재연결 이벤트 처리
mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected, will auto-reconnect');
});
```

---

## 12. 종합 평가 및 개선 로드맵

### 12.1 평가 요약

| 항목 | 현황 | 평가 | 우선순위 |
|------|------|------|---------|
| 원자적 업데이트 | findOneAndUpdate | ✅ 우수 | - |
| 에러 핸들링 | 기본 구현 | ⚠️ 보통 | 🟡 High |
| 쿨다운 | 카메라만 | ⚠️ 약함 | 🟡 High |
| 로깅 | console.log | ⚠️ 부족 | 🟡 High |
| HTTP 트리거 | 없음 | ❌ 미지원 | 🟡 High |
| 인덱스 | isUsed 부족 | ⚠️ 부족 | 🔴 Critical |
| BLE 재연결 | 없음 | ⚠️ 미흡 | 🟡 High |
| 입력 검증 | 기본만 | ⚠️ 보통 | 🔴 Critical |
| Notify 구독 | 미사용 | 🟠 미활용 | 🟠 Medium |
| ESP32 안전성 | 기본 | ⚠️ 기본 | 🟠 Medium |

### 12.2 개선 로드맵

#### 🔴 Phase 1: Critical (즉시 해결)

1. **인덱스 추가**
   ```javascript
   db.coupons.createIndex({ couponNumber: 1, isUsed: 1 });
   ```

2. **API 입력 검증 강화**
   - 바코드 포맷 검증
   - 길이 제한 (최대 50자)
   - trim() 후 빈 문자열 체크

#### 🟡 Phase 2: High (1주 내)

3. **메인 페이지 쿨다운 추가**
   - `handleScan`에 1.5초 쿨다운

4. **구조화된 로깅 도입**
   - JSON 포맷
   - 타임스탬프
   - 요청 ID

5. **BLE 재연결 로직**
   - 최대 3회 재시도
   - 5초 타임아웃

6. **HTTP 폴백 트리거**
   - ESP32에 HTTP 서버 추가
   - BLE 실패 시 HTTP 호출

#### 🟠 Phase 3: Medium (2주 내)

7. **BLE Notify 구독**
   - ESP32 `DONE` 응답 수신

8. **ESP32 Watchdog/Heartbeat**
   - 펌웨어 안정성 강화

9. **MongoDB 연결 풀 설정**
   - maxPoolSize, minPoolSize

10. **카메라 재시도 로직**
    - 초기화 실패 시 자동 재시도

---

## 부록: 체크리스트

### 배포 전 필수 확인

- [ ] MongoDB 인덱스 생성 확인
- [ ] API 입력 검증 테스트
- [ ] 동시 요청 중복 방지 테스트
- [ ] BLE 연결 끊김 시 동작 확인
- [ ] 에러 로깅 작동 확인
- [ ] 쿨다운 동작 확인

### 운영 모니터링

- [ ] API 응답 시간 추적
- [ ] 에러율 모니터링
- [ ] BLE 연결 성공률
- [ ] 쿠폰 사용 패턴 분석

---

*이 보고서는 Claude Code에 의해 자동 생성되었습니다.*
