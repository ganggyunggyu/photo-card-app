# Galaxy Tab + Chrome 키오스크 모드 가이드

> 포토카드 키오스크 운영을 위한 터치 제한 및 잠금 모드 설정 방법

## 목차
1. [개요](#개요)
2. [방법 1: Fully Kiosk Browser (추천)](#방법-1-fully-kiosk-browser-추천)
3. [방법 2: Samsung Knox](#방법-2-samsung-knox)
4. [방법 3: Android 기본 화면 고정](#방법-3-android-기본-화면-고정)
5. [방법 4: MDM 솔루션](#방법-4-mdm-솔루션)
6. [방법 5: 웹 기반 터치 차단 (현재 구현)](#방법-5-웹-기반-터치-차단-현재-구현)
7. [권장 설정 조합](#권장-설정-조합)

---

## 개요

키오스크 모드의 핵심 요구사항:
- **단일 앱 잠금**: 사용자가 다른 앱으로 이동 불가
- **터치 제한**: 불필요한 영역 터치 차단
- **UI 숨김**: 상태바, 네비게이션바 숨김
- **하드웨어 버튼 차단**: 볼륨, 전원, 홈 버튼 비활성화

---

## 방법 1: Fully Kiosk Browser (추천)

**가장 강력하고 실용적인 솔루션**

### 설치
- Play Store에서 "Fully Kiosk Browser" 검색 설치
- 무료 버전 사용 가능 (워터마크 있음)
- 라이선스: €7.90/기기 (영구)

### 주요 설정

#### 1) 터치 컨트롤
```
Settings > Web Content Settings
├── Enable User Interaction: ON (카메라 영역만)
├── Enable Long Tap: OFF
├── Enable Dragging: OFF (스크롤도 비활성화됨)
└── Enable Scrolling: OFF
```

#### 2) UI 숨김
```
Settings > Device Management
├── Show Status Bar: OFF
├── Show Navigation Bar: OFF
├── Show Action Bar: OFF
└── Show Address Bar: OFF
```

#### 3) 키오스크 잠금
```
Settings > Kiosk Mode
├── Enable Kiosk Mode: ON
├── Kiosk Exit Gesture: 5 Finger Tap (관리자용)
├── Kiosk Exit PIN: 설정
├── Disable Status Bar: ON
├── Disable Volume Buttons: ON
├── Disable Power Button: ON
└── Advanced Kiosk Protection: ON
```

#### 4) 시작 URL 설정
```
Settings > Web Content Settings
└── Start URL: https://localhost:3000 또는 실제 서버 URL
```

### 장점
- 터치 영역별 세밀한 제어 가능
- 하드웨어 버튼 완전 차단
- JavaScript 인터페이스로 앱과 통신 가능
- 자동 재시작, 화면 보호기 등 부가 기능

### 단점
- 유료 라이선스 필요 (무료는 워터마크)
- Web Bluetooth 지원 불완전할 수 있음

**참고**: [Fully Kiosk Browser 공식 문서](https://www.fully-kiosk.com/en/)

---

## 방법 2: Samsung Knox

**삼성 기기 전용 엔터프라이즈 솔루션**

### Knox Manage (클라우드 MDM)

#### 설정 경로
```
Knox Manage Console > Profiles > Android Enterprise
└── Kiosk Settings
    ├── Kiosk Type: Single App Mode
    ├── Allowed Apps: Chrome (또는 커스텀 앱)
    ├── Hardware Keys: Disabled
    └── Navigation Bar: Hidden
```

#### 주요 기능
- Wi-Fi, Bluetooth 제어 허용/차단
- 하드웨어 키 완전 비활성화
- 원격 관리 및 모니터링
- 앱 자동 업데이트

### Knox Configure (ProKiosk Mode)

#### 설정
```
Knox Configure Console > Dynamic Edition Profile
└── ProKiosk Mode
    ├── Configuration Mode: ProKiosk mode
    ├── Home Activity: Single-app kiosk
    ├── Allowed App: Chrome / PWA
    └── Device Settings: Restricted
```

### 비용
- Knox Manage: $0.61/기기/월
- Knox Configure: $0.35/기기/월
- Knox Suite: $1.08/기기/월 (통합 패키지)

### 장점
- 삼성 기기 네이티브 지원
- 가장 강력한 잠금 기능
- 원격 관리 가능
- 대규모 기기 관리에 적합

### 단점
- 삼성 기기 전용
- 설정이 복잡함
- 월간 라이선스 비용

**참고**: [Samsung Knox 키오스크 문서](https://docs.samsungknox.com/admin/knox-manage/kiosk-devices/introduction/about-kiosk-mode/)

---

## 방법 3: Android 기본 화면 고정

**무료, 임시 사용에 적합**

### 설정 방법

```
설정 > 보안 > 기타 보안 설정 > 화면 고정 (또는 앱 고정)
```

1. 화면 고정 활성화
2. "해제 시 잠금 패턴 요청" 활성화 (권장)
3. 최근 앱 버튼으로 앱 선택 후 고정 아이콘 탭

### 고정 해제
- 뒤로가기 + 최근앱 버튼 동시에 길게 누르기
- 또는 PIN/패턴 입력

### 장점
- 무료
- 별도 앱 설치 불필요
- 간단한 설정

### 단점
- 터치 제한 불가 (앱 내부 터치는 모두 가능)
- 상태바 완전히 숨기지 못함
- 쉽게 해제 가능 (보안 약함)
- 재부팅 시 해제됨

---

## 방법 4: MDM 솔루션

**엔터프라이즈급 관리가 필요할 때**

### AirDroid Business
```
가격: $12-33/기기/년
특징:
- Chrome 전용 키오스크 모드
- 원격 제어 및 모니터링
- 앱 블랙리스트/화이트리스트
- 원격 화면 공유
```

### Scalefusion
```
가격: $2-6/기기/월
특징:
- Single App Mode
- 하드웨어 키 차단
- 네트워크 설정 잠금
- 브랜딩 커스터마이징
```

### Hexnode UEM
```
가격: $1-3/기기/월
특징:
- Web App 키오스크
- 위치 추적
- 규정 준수 모니터링
- 원격 와이프
```

**참고**:
- [AirDroid Business](https://www.airdroid.com/mdm/android-tablet-kiosk/)
- [Scalefusion](https://scalefusion.com/android-kiosk-mode)
- [Hexnode](https://www.hexnode.com/mobile-device-management/android-tablet-kiosk-mode/)

---

## 방법 5: 웹 기반 터치 차단 (현재 구현)

**현재 앱에서 사용 중인 방식**

### 구현 코드 (page.tsx)

```tsx
{/* 터치 잠금 오버레이 */}
{isLocked && (
  <>
    <div
      className="fixed top-0 left-16 right-0 h-10 z-9999"
      onTouchStart={(e) => e.preventDefault()}
      onTouchMove={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    />
    <div
      className="fixed top-[45%] left-0 right-0 bottom-0 z-9999"
      onTouchStart={(e) => e.preventDefault()}
      onTouchMove={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    />
  </>
)}
```

### 장점
- 추가 비용 없음
- 코드로 완전 제어
- 영역별 세밀한 설정

### 단점
- 상태바/네비게이션바 숨기지 못함
- 하드웨어 버튼 차단 불가
- 새로고침/URL 변경 가능
- 앱 전환 가능

---

## 권장 설정 조합

### 옵션 A: 최소 비용 (무료)
```
1. Android 화면 고정 활성화
2. 웹 앱 터치 오버레이 (현재 구현)
3. 전체화면 모드 (F11 / manifest.json display: standalone)
```

### 옵션 B: 균형 잡힌 선택 (권장)
```
1. Fully Kiosk Browser 설치 (€7.90 일회성)
2. 키오스크 모드 + 터치 제한 설정
3. 시작 URL을 앱 주소로 설정
4. 5손가락 탭으로 관리자 접근
```

### 옵션 C: 엔터프라이즈급
```
1. Samsung Knox 등록
2. Knox Manage로 키오스크 정책 배포
3. 원격 모니터링 및 관리
4. 여러 기기 중앙 관리
```

---

## PWA 설정 (보조)

### manifest.json 예시
```json
{
  "name": "포토카드 키오스크",
  "short_name": "PhotoCard",
  "display": "standalone",
  "orientation": "landscape",
  "start_url": "/?standalone=true",
  "background_color": "#ffffff",
  "theme_color": "#0ea5e9"
}
```

### 전체화면 API (JavaScript)
```javascript
// 전체화면 진입
document.documentElement.requestFullscreen();

// 전체화면 해제
document.exitFullscreen();
```

**주의**: Chrome for Android에서는 사용자 제스처 없이 전체화면 진입 불가

---

## 체크리스트

### 배포 전 확인사항

- [ ] 화면 자동 꺼짐 비활성화 (설정 > 디스플레이 > 화면 시간 초과: 없음)
- [ ] 화면 밝기 고정
- [ ] 자동 업데이트 비활성화
- [ ] 알림 차단
- [ ] 배터리 최적화 예외 처리 (앱이 백그라운드에서 종료되지 않도록)
- [ ] 개발자 옵션 > 화면 켜짐 유지 활성화 (충전 중)
- [ ] Wi-Fi 자동 연결 설정
- [ ] BLE 권한 항상 허용

---

## Sources

- [Fully Kiosk Browser](https://www.fully-kiosk.com/en/)
- [Samsung Knox Kiosk Mode](https://docs.samsungknox.com/admin/knox-manage/kiosk-devices/introduction/about-kiosk-mode/)
- [Knox Configure ProKiosk](https://docs.samsungknox.com/admin/knox-configure/how-to-guides/profiles/configure-prokiosk-mode/)
- [AirDroid Android Kiosk](https://www.airdroid.com/mdm/android-tablet-kiosk/)
- [Scalefusion Kiosk Mode](https://scalefusion.com/android-kiosk-mode)
- [Hexnode Android Kiosk](https://www.hexnode.com/mobile-device-management/android-tablet-kiosk-mode/)
- [Chrome Kiosk Mode Android](https://www.airdroid.com/mdm/chrome-kiosk-mode-android/)
