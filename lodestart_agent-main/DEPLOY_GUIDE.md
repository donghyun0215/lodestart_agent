# Lodestart Outreach — 오늘 밤 배포 가이드

순서대로 따라오면 돼. 각 단계 끝에 **[확인]** 이 있어. 안 되면 거기서 멈추고 알려줘.
전체 소요: 처음이면 1.5~2시간. 대부분은 계정 설정이고 코드는 안 건드려.

준비물: GitHub 계정, 이 폴더(lodestart-app).

---

## 0. 로컬에서 먼저 돌려보기 (선택이지만 추천)

```bash
cd lodestart-app
npm install
cp .env.example .env.local
```

`.env.local`은 아래 단계들에서 값을 하나씩 채워. 다 채우기 전엔 앱이 완전히 안 돌아가.
로컬 실행은 `npm run dev` → http://localhost:3000

---

## 1. Anthropic API 키 ($5 충전)

1. https://console.anthropic.com 로그인
2. **Billing** → Add credit → **$5** 충전
3. **API Keys** → Create Key → 이름 아무거나 → 키 복사 (sk-ant-...)
4. `.env.local` 의 `ANTHROPIC_API_KEY=` 뒤에 붙여넣기

**[확인]** 키가 sk-ant- 로 시작하면 OK.

---

## 2. Supabase (DB, 무료)

1. https://supabase.com → Start your project → 로그인
2. **New project** → 이름 `lodestart` → DB 비밀번호 아무거나(적어둬) → 리전 Singapore → Create
3. 프로젝트 뜨면 (1~2분) → 좌측 **SQL Editor** → New query
4. 이 폴더의 `supabase_schema.sql` 내용 전체 복붙 → **Run**
   → "Success" 뜨면 테이블 3개(contacts, campaigns, sends) 생성됨
5. 좌측 **Settings (톱니) → API**
   - **Project URL** 복사 → `.env.local` 의 `NEXT_PUBLIC_SUPABASE_URL=`
   - **anon public** 키 복사 → `NEXT_PUBLIC_SUPABASE_ANON_KEY=`

**[확인]** Table Editor 에 `contacts`, `campaigns`, `sends` 세 테이블 보이면 OK.

> 컨택 리스트는 이제 매번 파일을 올릴 필요 없이 DB에 저장돼.
> 배포 다 끝난 뒤, 앱의 "1 · 컨택" 탭에서 `contacts_master.csv` 를
> 딱 한 번 업로드하면 그 뒤로는 누가 접속하든 DB에서 바로 불러와.
> 나중에 새 리스트를 추가할 때도 같은 탭에서 CSV를 다시 올리면
> 이메일 기준으로 자동 병합(업데이트/추가, 중복 없음)돼.

---

## 3. Google OAuth (Gmail 초안)

여기가 제일 손이 많이 가. 천천히.

### 3-1. 프로젝트 만들기
1. https://console.cloud.google.com
2. 상단 프로젝트 선택 → **New Project** → 이름 `lodestart` → Create

### 3-2. Gmail API 켜기
3. 좌측 **APIs & Services → Library**
4. "Gmail API" 검색 → **Enable**

### 3-3. 동의 화면 (OAuth consent screen)
5. **APIs & Services → OAuth consent screen**
6. User Type: lodestart.ai 가 Google Workspace 면 **Internal** 선택 (검증 불필요! 이게 베스트)
   - Workspace 가 아니면 **External** → 아래 Test users 에 Tammy 이메일 추가
7. 앱 이름 `Lodestart Outreach`, 지원 이메일 선택 → 저장
8. Scopes 는 건너뛰어도 됨 (코드에서 지정함)

### 3-4. 사용자 인증 정보 (Credentials)
9. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
10. Application type: **Web application**
11. **Authorized redirect URIs** 에 추가 (Add URI):
    - 로컬 테스트용: `http://localhost:3000/api/auth/callback`
    - (Vercel 배포 후 URL 나오면 그것도 추가: `https://YOUR-APP.vercel.app/api/auth/callback`)
12. Create → **Client ID** 와 **Client secret** 복사
13. `.env.local`:
    - `GOOGLE_CLIENT_ID=` 에 Client ID
    - `GOOGLE_CLIENT_SECRET=` 에 Client secret
    - `GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback` (로컬 테스트 시)

**[확인]** 로컬에서 `npm run dev` → http://localhost:3000 →
우상단 "Gmail 연결" 클릭 → Google 로그인 → 돌아와서 "● Gmail 연결됨" 되면 성공!

---

## 4. GitHub 에 올리기

```bash
cd lodestart-app
git init
git add .
git commit -m "Lodestart outreach v1"
```
그다음 github.com 에서 New repository (Private 추천) 만들고, 뜨는 안내대로:
```bash
git remote add origin https://github.com/<너>/lodestart-outreach.git
git branch -M main
git push -u origin main
```

**[확인]** GitHub 에 코드 보이고, `.env.local` 은 **안 올라갔는지** 확인 (gitignore가 막음).

---

## 5. Vercel 배포

1. https://vercel.com → 로그인 (GitHub 계정으로)
2. **Add New → Project** → 방금 repo Import
3. **Environment Variables** 에 `.env.local` 의 값들을 하나씩 추가:
   - ANTHROPIC_API_KEY
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - GOOGLE_CLIENT_ID
   - GOOGLE_CLIENT_SECRET
   - GOOGLE_REDIRECT_URI  ← **여기만 주의**: 배포 URL 로. 아직 URL 모르면 일단 배포하고 6번에서 수정.
4. **Deploy**

**[확인]** 몇 분 뒤 `https://YOUR-APP.vercel.app` URL 나옴.

---

## 6. 배포 URL 로 OAuth 마무리

1. Vercel 이 준 URL 확인 (예: `https://lodestart-outreach.vercel.app`)
2. **Google Console → Credentials → 그 OAuth client → Authorized redirect URIs** 에
   `https://lodestart-outreach.vercel.app/api/auth/callback` 추가 → Save
3. **Vercel → Settings → Environment Variables → GOOGLE_REDIRECT_URI** 를
   `https://lodestart-outreach.vercel.app/api/auth/callback` 로 수정 → **Redeploy**

**[확인]** 배포 URL 에서 Gmail 연결 → 초안 생성 → "Gmail 초안함에 넣기" →
Gmail 초안함에 실제로 메일이 생기면 **끝. 완성.**

---

## 사용 흐름 (완성 후)

```
(처음 한 번) 컨택 탭에서 contacts_master.csv 업로드 → DB에 저장됨
→ 다음부터는 자동으로 DB에서 불러옴, 새 리스트는 같은 방식으로 추가

스타트업(또는 IR PDF) → 매칭 → 초안 생성(한/영)
→ "Gmail 초안함에 넣기" → Gmail 열어서 검토, 또는 앱에서 "지금 발송"
→ 대시보드에서 보냄/회신 상태 확인 → 회신율 확인
```

## ⚠️ "지금 발송" 버튼에 대해

이번 업데이트로 앱 안에서 바로 발송하는 버튼이 생겼어. **기본은 여전히 Gmail 초안함에
넣기**이고, 실제 발송은 확인 절차를 거치게 만들어뒀어(개별은 confirm, 전체는 "발송"
직접 타이핑). 그래도 이건 클릭 한 번으로 실제 메일이 나가는 기능이니, 처음 몇 번은
Gmail에서 직접 검토하고 보내는 걸 권장해. 신뢰가 쌓이면 "지금 발송"을 써도 좋아.

## 크레딧 표시에 대해

헤더의 "≈ $X 사용" 은 **추정치**야. Anthropic API 키로는 실제 잔여 크레딧을 조회할
방법이 없어서, 이번 세션에 실제로 쓴 토큰 수를 세서 계산한 값이야. 정확한 잔액은
console.anthropic.com → Billing 에서 확인해야 해.

## 안 되면 자주 나오는 것들

- **Gmail 연결 후 error**: redirect URI 가 Google Console 과 env 에서 100% 똑같은지 확인 (http/https, 끝 슬래시).
- **초안 생성 API 500**: ANTHROPIC_API_KEY 오타이거나 $5 충전 안 됨.
- **"not_connected"**: Gmail 토큰 만료(1시간). 다시 "Gmail 연결" 누르면 됨.
- **Internal 선택 안 보임**: lodestart.ai 가 Workspace 가 아니라서. External + Test users 로.

막히면 스크린샷이랑 같이 물어봐. 단계별로 봐줄게.
