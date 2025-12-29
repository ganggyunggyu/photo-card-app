# Photo Card Kiosk

쿠폰 바코드를 스캔하면 ESP32를 통해 포토카드를 출력하는 키오스크 시스템.

## 문서

- [SYSTEM_OVERVIEW.md](docs/SYSTEM_OVERVIEW.md) - 시스템 아키텍처
- [PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md) - 프로젝트 가이드
- [HARDWARE_WIRING_GUIDE.md](docs/HARDWARE_WIRING_GUIDE.md) - 하드웨어 배선
- [KIOSK_MODE_GUIDE.md](docs/KIOSK_MODE_GUIDE.md) - 키오스크 모드 설정
- [CLAUDE_REPORT.md](docs/CLAUDE_REPORT.md) - 소프트웨어 심층 분석

## 개요

쿠폰 번호를 바코드 리더 또는 카메라로 스캔하면, MongoDB에서 쿠폰 유효성을 검증한 뒤 Web Bluetooth를 통해 ESP32로 출력 명령을 전송한다. ESP32는 릴레이를 트리거하여 포토카드 머신을 작동시킨다.

## 주요 기능

- **바코드 스캔**: USB 바코드 리더 또는 카메라로 쿠폰 번호 인식
- **쿠폰 검증**: MongoDB에서 쿠폰 유효성 및 사용 여부 확인 (원자적 업데이트)
- **BLE 통신**: Web Bluetooth로 ESP32와 연결하여 출력 명령 전송
- **ESP32 트리거**: BLE 명령 수신 시 릴레이 작동 (쿨다운 2초)
- **터치 잠금**: 키오스크 모드에서 사용자 터치 방지
- **Lottie 피드백**: 애니메이션 기반 상태 피드백 UI

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Database | MongoDB (Mongoose) |
| Barcode | @zxing/browser (ZXing) |
| Animation | lottie-react |
| Hardware | ESP32, Web Bluetooth API |
| Firmware | PlatformIO, Arduino Framework |

## 시스템 요구사항

- Node.js 18 이상
- MongoDB (로컬 또는 Atlas)
- ESP32 보드 (BLE 지원)
- Web Bluetooth 지원 브라우저 (Chrome, Edge)
- PlatformIO (ESP32 펌웨어 빌드/업로드)

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

**PlatformIO 사용** (권장):

```bash
# PlatformIO 설치
brew install platformio

# esp32 폴더로 이동
cd esp32

# 빌드
pio run

# 업로드
pio run -t upload

# 시리얼 모니터 (BLE 연결 확인)
pio device monitor
```

**핀 연결:**

| GPIO | 용도 |
|------|------|
| GPIO 2 | 내장 LED (상태 표시) |
| GPIO 4 | 릴레이 모듈 |

## 실행

### 개발 서버

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

### HTTPS 개발 서버

Web Bluetooth는 HTTPS 또는 localhost에서만 동작. 외부 기기(태블릿 등)에서 테스트하려면:

```bash
npm run dev:https
```

또는 localtunnel 사용:

```bash
npx localtunnel --port 3000
```

### 프로덕션 빌드

```bash
npm run build
npm run start
```

### 키오스크 모드

```bash
# 빌드 후 HTTPS로 실행
npm run kiosk

# Chrome 키오스크 모드 실행 (macOS)
npm run kiosk:chrome

# 전체 자동화 (빌드 + 서버 + 크롬)
npm run kiosk:full
```

## 사용 방법

1. 웹 페이지에서 **[디바이스 연결]** 버튼 클릭
2. "PhotoCard" BLE 기기 선택하여 연결
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
│   │   ├── api/
│   │   │   ├── coupons/validate/  # 쿠폰 검증 API
│   │   │   └── esp32/             # ESP32 HTTP 프록시 (옵션)
│   │   ├── layout.tsx
│   │   └── page.tsx               # 메인 페이지
│   ├── features/
│   │   ├── ble-connection/        # Web Bluetooth 연결
│   │   ├── esp-connection/        # ESP32 연결 훅
│   │   └── coupon-scan/           # 카메라/바코드 스캔
│   ├── entities/
│   │   └── coupon/                # 쿠폰 도메인 모델
│   └── shared/
│       ├── lib/                   # 공용 유틸 (DB, 상수)
│       ├── types/                 # 공용 타입
│       └── ui/                    # 공용 UI (StatusBadge)
├── esp32/
│   ├── src/
│   │   └── main.cpp               # ESP32 BLE 펌웨어
│   └── platformio.ini             # PlatformIO 설정
├── scripts/
│   ├── seed.ts                    # DB 시드 스크립트
│   └── kiosk.sh                   # 키오스크 모드 스크립트
├── docs/                          # 문서
└── package.json
```

## API

### POST /api/coupons/validate

쿠폰 번호를 검증하고 사용 처리한다. (원자적 업데이트로 중복 사용 방지)

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

| 항목 | 값 |
|------|------|
| Device Name | PhotoCard |
| Service UUID | `4fafc201-1fb5-459e-8fcc-c5c9c331914b` |
| Characteristic UUID | `beb5483e-36e1-4688-b7f5-ea07361b26a8` |

**명령어:**

| 명령 | 설명 |
|------|------|
| `DISPENSE` | 릴레이 트리거 요청 |
| `OK` | 트리거 완료 응답 |
| `COOLDOWN` | 쿨다운 중 (2초) |

## 스크립트

```bash
npm run dev          # 개발 서버 (Turbopack)
npm run dev:https    # HTTPS 개발 서버
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버
npm run start:https  # HTTPS 프로덕션 서버
npm run kiosk        # 키오스크 모드 (빌드+HTTPS)
npm run lint         # ESLint
npm run seed         # 쿠폰 데이터 시드
```

## 트러블슈팅

### Web Bluetooth 연결 안 됨

- HTTPS 또는 localhost에서만 동작
- Chrome/Edge 권장 (Safari, Firefox 미지원)
- ESP32가 "PhotoCard"로 광고 중인지 시리얼 모니터로 확인

### ESP32 포트 인식 안 됨

```bash
# macOS에서 USB 시리얼 포트 확인
ls /dev/cu.*

# CP2102 드라이버 설치 필요할 수 있음
# https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
```

### 카메라 권한 없음

- HTTPS 필수 (localhost 제외)
- 브라우저에서 카메라 권한 허용 필요

## 라이선스

MIT
