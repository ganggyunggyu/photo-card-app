# Photo Card Kiosk

쿠폰 바코드를 스캔하면 ESP32를 통해 포토카드를 출력하는 키오스크 시스템.

## 심층 문서

- `docs/SYSTEM_OVERVIEW.md`
- `docs/PROJECT_GUIDE.md`
- `docs/HARDWARE_WIRING_GUIDE.md`

## 개요

쿠폰 번호를 바코드 리더 또는 카메라로 스캔하면, MongoDB에서 쿠폰 유효성을 검증한 뒤 Web Bluetooth를 통해 ESP32로 출력 명령을 전송한다. ESP32는 릴레이를 트리거하여 포토카드 머신을 작동시킨다.

## 주요 기능

- **바코드 스캔**: USB 바코드 리더 또는 카메라로 쿠폰 번호 인식
- **쿠폰 검증**: MongoDB에서 쿠폰 유효성 및 사용 여부 확인
- **BLE 통신**: Web Bluetooth로 ESP32와 연결하여 출력 명령 전송
- **ESP32 트리거**: BLE 명령 수신 시 릴레이 작동

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Database | MongoDB (Mongoose) |
| Barcode | @zxing/browser (ZXing) |
| Hardware | ESP32, Web Bluetooth API |

## 시스템 요구사항

- Node.js 18 이상
- MongoDB (로컬 또는 Atlas)
- ESP32 보드 (BLE 지원)
- Web Bluetooth 지원 브라우저 (Chrome, Edge)

## 설치

### 1. 프로젝트 클론 및 의존성 설치

```bash
git clone <repository-url>
cd photo-card-app
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일 생성:

```env
MONGODB_URI=mongodb://localhost:27017/photo-card-app
```

MongoDB Atlas 사용 시:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/photo-card-app
```

### 3. 데이터베이스 시드

쿠폰 데이터를 MongoDB에 추가:

```bash
npm run seed
```

### 4. ESP32 펌웨어 업로드

1. Arduino IDE에서 `esp32/photo_card_trigger.ino` 열기
2. ESP32 보드 선택
3. BLE 라이브러리 설치 (ESP32 기본 포함)
4. 업로드

**핀 연결:**

| GPIO | 용도 |
|------|------|
| GPIO 2 | 내장 LED (테스트용) |
| GPIO 4 | 릴레이 모듈 |

## 실행

### 개발 서버

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

### 프로덕션 빌드

```bash
npm run build
npm run start
```

## 사용 방법

1. 웹 페이지에서 **[디바이스 연결]** 버튼 클릭
2. ESP32 기기 선택하여 BLE 연결
3. 바코드 리더로 쿠폰 스캔 또는 카메라 탭에서 바코드 인식
4. 유효한 쿠폰이면 자동으로 포토카드 출력

### 쿠폰 상태

| 상태 | 설명 |
|------|------|
| VALID_AND_REDEEMED | 유효한 쿠폰, 사용 처리 완료 |
| ALREADY_USED | 이미 사용된 쿠폰 |
| INVALID | 존재하지 않는 쿠폰 |

## 프로젝트 구조

```
photo-card-app/
├── src/
│   ├── app/
│   │   ├── api/coupons/validate/   # 쿠폰 검증 API
│   │   ├── layout.tsx
│   │   └── page.tsx                # 메인 페이지(오케스트레이션)
│   ├── features/
│   │   ├── ble-connection/         # Web Bluetooth 연결/트리거
│   │   └── coupon-scan/            # 카메라/바코드리더 스캔
│   ├── entities/
│   │   └── coupon/                 # 쿠폰 도메인 모델(Mongoose)
│   └── shared/
│       ├── lib/                    # 상수/DB 등 공용 유틸
│       ├── types/                  # 공용 타입
│       └── ui/                     # 공용 UI
├── esp32/
│   └── photo_card_trigger.ino      # ESP32 펌웨어
├── scripts/
│   └── seed.ts                     # DB 시드 스크립트
└── package.json
```

## API

### POST /api/coupons/validate

쿠폰 번호를 검증하고 사용 처리한다.

**Request:**

```json
{
  "couponNumber": "75863985"
}
```

**Response:**

```json
{
  "status": "VALID_AND_REDEEMED",
  "redeemedAt": "2025-01-01T12:00:00.000Z"
}
```

## BLE 프로토콜

| UUID | 용도 |
|------|------|
| `12345678-1234-1234-1234-1234567890a1` | Service UUID |
| `12345678-1234-1234-1234-1234567890a2` | Write Characteristic |
| `12345678-1234-1234-1234-1234567890a3` | Notify Characteristic |

**명령어:**

- `PRINT`: 출력 트리거 요청
- `DONE`: 출력 완료 응답 (Notify)

## 스크립트

```bash
npm run dev      # 개발 서버 실행
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버 실행
npm run lint     # ESLint 실행
npm run seed     # 쿠폰 데이터 시드
```

## 주의사항

- Web Bluetooth는 **HTTPS** 또는 **localhost**에서만 동작
- Chrome/Edge 브라우저 권장 (Safari, Firefox는 Web Bluetooth 미지원)
- ESP32와 연결 시 브라우저에서 기기 선택 팝업이 나타남

## 라이선스

MIT
