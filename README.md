# 키워드 → 영상 자동 생성 API

키워드 입력하면 12분짜리 영상 자동 생성

## API 사용법

### 1. 영상 생성 요청
```bash
curl -X POST https://your-server.com/generate \
  -H "Content-Type: application/json" \
  -d '{"keyword": "북한 탈북 가족 재회 실화"}'
```

응답:
```json
{
  "job_id": "a1b2c3d4",
  "status": "processing",
  "progress": "시작..."
}
```

### 2. 상태 확인
```bash
curl https://your-server.com/status/a1b2c3d4
```

응답:
```json
{
  "job_id": "a1b2c3d4",
  "status": "completed",
  "video_url": "/download/a1b2c3d4"
}
```

### 3. 영상 다운로드
```bash
curl -O https://your-server.com/download/a1b2c3d4
```

---

## 서버 배포

### 환경변수 설정
```bash
export OPENAI_API_KEY="sk-..."
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/credentials.json"
```

### 실행
```bash
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

### Docker (선택)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 비용
- ~$1/영상 (DALL-E 25장 + GPT)
- Google TTS 무료 (월 400만 글자)
