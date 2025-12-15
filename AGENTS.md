# photo-card-app (Next.js 키오스크) — 작업 가이드

이 레포는 **쿠폰 바코드 스캔 → MongoDB 검증/사용 처리 → Web Bluetooth로 ESP32 트리거**까지 한 번에 이어지는 키오스크 앱이다.

## 기술 스택 / 런타임

- Frontend: **Next.js(App Router) + React + TypeScript**
- Styling: **Tailwind CSS v4**
- DB: **MongoDB + Mongoose**
- Scan: **ZXing (@zxing/browser)**
- Device: **Web Bluetooth API** + `esp32/photo_card_trigger.ino`

## 필수 컨벤션

- **절대경로 import만 사용**: `@/*` → `src/*`
- **className은 `cn()`로만 조합** (Tailwind + 조건부 포함)
- **React Fragment는 `React.Fragment`만 사용** (단축 `<>` 금지)
- **이모지 지양**: UI 피드백은 아이콘 라이브러리로 대체 (예: `lucide-react`)
- **구조분해 할당 우선** (불가피할 때만 예외)

> 참고: 현재 코드베이스는 `components/`, `hooks/`, `lib/` 중심으로 구성되어 있고 `cn()`, TanStack Query, Jotai가 아직 들어가 있지 않다. 신규 작업부터 점진적으로 도입한다.

## 상태관리 / 데이터 패칭

- **TanStack Query 셋업 필수**: `/api/*` 호출은 `useQuery`/`useMutation` 기반으로 정리
- **Jotai 셋업 필수(React/Next)**: 전역 상태는 atom으로 관리
  - Action을 atom에 넣지 말고, atom을 활용하는 함수는 `hooks/`(공용) 또는 도메인 `hooks/`에 둔다.

## 디렉토리 방향(권장, 점진 전환)

Next App Router 구조는 유지하되, UI/도메인 로직은 FSD로 이동한다.

```
src/
  app/               # Next 라우팅, providers
  pages/             # (선택) 페이지 UI 레이어
  widgets/           # 화면 단위 블록(키오스크 화면 등)
  features/          # 쿠폰 검증, BLE 트리거, 스캔 등 기능
  entities/          # coupon 등 도메인
  shared/            # cn, api client, ui primitives
```

## API/DB 작업 규칙

- `src/app/api/coupons/validate/route.ts`의 **원자적 업데이트(findOneAndUpdate + isUsed=false 필터)** 패턴을 유지한다.
- `MONGODB_URI`는 런타임 필수. `.env.local`은 커밋하지 않는다.

## BLE/ESP32 작업 규칙

- UUID/명령은 `src/lib/constants.ts`와 `esp32/photo_card_trigger.ino`를 **항상 같이 맞춘다.**
- Web Bluetooth는 **HTTPS 또는 localhost**에서만 동작한다.
  - 로컬 네트워크 디바이스 테스트는 `npm run dev:https`를 우선 사용한다.

## 자주 쓰는 명령

- `npm run dev` / `npm run dev:https`
- `npm run build` / `npm run start`
- `npm run lint`
- `npm run seed`

