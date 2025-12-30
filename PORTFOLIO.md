# 포토카드 키오스크 시스템

## 프로젝트 개요

제주 메이즈랜드에서 운영하는 포토카드 자동 발급 키오스크. 방문객이 QR 코드가 인쇄된 쿠폰을 카메라에 인식시키면, 서버에서 유효성을 검증하고 ESP32를 통해 카드 배출 장치를 작동시킨다.

처음에는 ESP32를 WiFi로 제어하려고 했는데, 현장 WiFi가 불안정해서 연결이 자주 끊겼다. 결국 Web Bluetooth API로 전환해서 태블릿과 ESP32를 직접 연결하는 방식으로 바꿨다.

### 주요 기능

- QR/바코드 실시간 스캔 (ZXing 라이브러리)
- MongoDB 쿠폰 검증 및 중복 사용 방지
- Web Bluetooth를 통한 ESP32 직접 제어
- 자동 재연결 (연결 끊겼을 때 최대 3회 재시도)
- PWA 키오스크 모드 (터치 제한, 전체화면)

### 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Next.js API Routes, MongoDB, Mongoose |
| Hardware | ESP32, Web Bluetooth API |
| 라이브러리 | @zxing/browser (바코드), lottie-react (애니메이션) |

---

## 기술적 도전과제 및 해결

### 1. HTTP에서 Web Bluetooth로 전환

**문제 상황**

처음에는 ESP32에 웹서버를 올려서 HTTP API로 제어했다. 개발 환경에서는 잘 동작했는데, 실제 현장에 설치하니까 WiFi가 자주 끊겼다. 관광지라서 사람이 많으면 WiFi 간섭이 심해지는 것 같았다.

**해결 방법**

Web Bluetooth API로 태블릿과 ESP32를 직접 BLE로 연결했다. 네트워크를 거치지 않으니까 연결이 훨씬 안정적이었다.

```typescript
// src/features/esp-connection/hooks/useESP32.ts:45-60
const connect = useCallback(async () => {
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ name: 'PhotoCard' }],
    optionalServices: [SERVICE_UUID],
  });

  const server = await device.gatt?.connect();
  const service = await server.getPrimaryService(SERVICE_UUID);
  const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

  characteristicRef.current = characteristic;
  setConnectionStatus('connected');
}, []);
```

**주의점**

Web Bluetooth는 Chrome/Edge에서만 동작하고, HTTPS가 필수다. Safari랑 Firefox는 아예 안 된다. 그래서 태블릿은 Chrome으로 고정해서 사용한다.

---

### 2. React Stale Closure 버그

**문제 상황**

QR 스캔 후 ESP32에 명령을 보내는 로직에서, 가끔 "배출기 연결 끊김" 상태인데도 명령이 전송되는 버그가 있었다. 콘솔 찍어보니까 `connectionStatus`가 계속 이전 값을 참조하고 있었다.

```typescript
// 문제가 있던 코드
const sendDispenseCommand = useCallback(async () => {
  // connectionStatus가 업데이트돼도 여기서는 옛날 값을 봄
  if (connectionStatus !== 'connected') return false;
  // ...
}, [connectionStatus]);
```

**해결 방법**

`useRef`로 항상 최신 상태를 참조하게 바꿨다.

```typescript
// src/app/page.tsx:29-38
const connectionStatusRef = useRef(connectionStatus);
const sendDispenseCommandRef = useRef(sendDispenseCommand);

useEffect(() => {
  connectionStatusRef.current = connectionStatus;
}, [connectionStatus]);

useEffect(() => {
  sendDispenseCommandRef.current = sendDispenseCommand;
}, [sendDispenseCommand]);
```

`useCallback` 안에서 상태를 직접 참조하면 클로저 때문에 첫 번째 값에 갇혀버린다. 의존성 배열에 넣으면 매번 함수가 재생성돼서 성능이 떨어지고. `useRef`로 우회하면 함수는 그대로 두면서 최신 값을 볼 수 있다.

---

### 3. 쿠폰 중복 사용 방지 (Race Condition)

**문제 상황**

같은 쿠폰을 빠르게 두 번 스캔하면, 두 요청이 거의 동시에 서버에 도착한다. 둘 다 "사용 안 됨" 상태를 읽고, 둘 다 "사용됨"으로 업데이트해버리면 카드가 2장 나온다.

**해결 방법**

MongoDB의 `findOneAndUpdate`를 사용해서 조회와 업데이트를 원자적으로 처리했다.

```typescript
// src/app/api/coupons/validate/route.ts:15-22
const updatedCoupon = await Coupon.findOneAndUpdate(
  { couponNumber: normalizedCode, isUsed: false },  // 조건
  { $set: { isUsed: true, usedAt: new Date() } },   // 업데이트
  { new: true }
);

if (updatedCoupon) {
  return NextResponse.json({ status: COUPON_STATUS.VALID_AND_REDEEMED });
}
```

`findOneAndUpdate`는 MongoDB 서버에서 단일 연산으로 실행된다. 두 요청이 동시에 와도, 첫 번째 요청이 `isUsed: true`로 바꾸면 두 번째 요청은 조건에 맞는 문서를 못 찾는다.

---

### 4. 카메라 선택 로직

**문제 상황**

태블릿에서 카메라가 2개(전면/후면)인데, 기본으로 후면 카메라가 선택됐다. 사용자가 자기 얼굴을 못 보면서 QR을 찍으려니까 각도 잡기가 어려웠다.

**해결 방법**

전면 카메라를 우선 선택하도록 바꿨다.

```typescript
// src/features/coupon-scan/ui/CameraTab.tsx:25-32
const frontCamera = videoInputDeviceList.find(
  (device) =>
    device.label.toLowerCase().includes('front') ||
    device.label.toLowerCase().includes('selfie') ||
    device.label.includes('전면') ||
    device.label.includes('facetime')
);

const selectedDeviceId = frontCamera?.deviceId || videoInputDeviceList[0].deviceId;
```

카메라 라벨이 기기마다 다르게 표시돼서, 여러 키워드로 매칭했다. 영문/한글 둘 다 체크한다.

---

### 5. 연결 끊김 시 자동 재연결

**문제 상황**

BLE 연결이 가끔 끊겼다. 배터리 절약 모드, 화면 꺼짐, 거리 멀어짐 등 여러 원인이 있었다. 수동으로 다시 연결하라고 안내하기엔 키오스크 운영에 적합하지 않았다.

**해결 방법**

연결 해제 이벤트를 감지해서 자동으로 재연결을 시도한다.

```typescript
// src/features/esp-connection/hooks/useESP32.ts:68-85
device.addEventListener('gattserverdisconnected', async () => {
  setConnectionStatus('disconnected');

  // 최대 3회 재연결 시도
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      const server = await device.gatt?.connect();
      if (server) {
        const service = await server.getPrimaryService(SERVICE_UUID);
        const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
        characteristicRef.current = characteristic;
        setConnectionStatus('connected');
        return;
      }
    } catch (e) {
      console.log(`재연결 시도 ${i + 1}/3 실패`);
    }
  }

  setConnectionStatus('error');
});
```

1초 간격으로 3번 시도하고, 다 실패하면 에러 상태로 표시한다. ESP32 쪽에서도 30초마다 Keep-Alive notify를 보내서 연결 유지를 돕는다.

---

### 6. 키오스크 터치 제한

**문제 상황**

태블릿을 키오스크로 쓰려면 화면 스와이프, 상태바 터치 같은 것들을 막아야 했다. Android 설정에서 화면 고정 기능을 썼는데, 태블릿 버전에 따라 지원 안 되는 경우도 있었다.

**해결 방법**

웹 레벨에서 터치 이벤트를 막는 방식으로 구현했다.

```css
/* src/app/globals.css:22-32 */
html,
body {
  overscroll-behavior: none;  /* pull-to-refresh 차단 */
  overflow: hidden;           /* 스크롤 차단 */
  height: 100dvh;             /* 동적 뷰포트 높이 */
  touch-action: none;         /* 터치 제스처 차단 */
}
```

PWA로 설치하면 주소창도 사라지고, `manifest.json`에서 `display: fullscreen`으로 설정하면 상태바까지 숨길 수 있다.

---

## 아키텍처 설계

### FSD (Feature-Sliced Design) 적용

프로젝트가 커지면서 파일 찾기가 어려워져서 FSD 구조로 리팩토링했다.

```
src/
├── app/                    # Next.js 라우팅
│   └── api/coupons/       # 쿠폰 API
├── features/              # 기능별 모듈
│   ├── coupon-scan/       # QR 스캔
│   └── esp-connection/    # BLE 연결
├── entities/              # 도메인 모델
│   └── coupon/
└── shared/                # 공용 유틸
    ├── lib/               # MongoDB, 상수
    ├── types/             # 타입 정의
    └── ui/                # 공용 컴포넌트
```

기능 추가할 때 `features/` 아래에 폴더 하나 만들면 되니까 관리가 편해졌다.

### MongoDB 연결 풀

Next.js 서버리스 환경에서 API 호출마다 DB 연결을 새로 하면 느리다. 전역 변수에 연결을 캐싱해서 재사용한다.

```typescript
// src/shared/lib/mongodb.ts:12-25
const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI!);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
```

---

## ESP32 펌웨어

### BLE 서비스 구성

```cpp
// esp32/photo_card_trigger/photo_card_trigger.ino
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

const int RELAY_PIN = 4;           // 릴레이 제어
const int TRIGGER_DURATION_MS = 300;  // 트리거 시간
const int COOLDOWN_MS = 2000;      // 연타 방지
```

### 명령 처리

```cpp
void onWrite(BLECharacteristic *pCharacteristic) {
  String value = pCharacteristic->getValue();

  if (value == "DISPENSE") {
    unsigned long now = millis();

    // 2초 쿨다운
    if (now - lastTriggerTime < COOLDOWN_MS) {
      pCharacteristic->setValue("COOLDOWN");
      return;
    }

    lastTriggerTime = now;
    digitalWrite(RELAY_PIN, HIGH);
    delay(TRIGGER_DURATION_MS);
    digitalWrite(RELAY_PIN, LOW);

    pCharacteristic->setValue("OK");
  }
}
```

릴레이를 300ms 동안 켰다 끄면 카드가 한 장 나온다. 2초 쿨다운을 넣어서 연타로 여러 장 나오는 걸 방지했다.

---

## 트러블슈팅 기록

### Git 커밋에서 추적한 문제들

| 커밋 | 문제 | 해결 |
|------|------|------|
| `c14b987` | Stale Closure로 상태 동기화 안 됨 | useRef로 최신 값 참조 |
| `2d398bb` | 후면 카메라가 기본 선택됨 | 전면 카메라 우선 선택 로직 |
| `0af4cc1` | WiFi 연결 불안정 | HTTP → Web Bluetooth 전환 |
| `b1c0138` | BLE 연결 자주 끊김 | Keep-Alive 및 자동 재연결 |

---

## 성과 및 학습

### 기술적 성장

- **Web Bluetooth API**: 브라우저에서 하드웨어 직접 제어하는 경험
- **React 클로저**: 상태 관리와 메모이제이션의 트레이드오프 이해
- **MongoDB 원자성**: 동시성 문제 해결 패턴 학습
- **ESP32**: 마이크로컨트롤러 펌웨어 작성

### 개선 예정

- 테스트 코드 추가 (현재 없음)
- 에러 로깅 시스템 (Sentry 등)
- 쿠폰 사용 통계 대시보드

---

## 실행 방법

```bash
# 개발 서버 (HTTPS 필수)
npm run dev:https

# 쿠폰 데이터 시딩
npm run seed

# 프로덕션 배포
npm run build
npm run start:https
```

### 환경 변수

```env
MONGODB_URI=mongodb+srv://...
```
