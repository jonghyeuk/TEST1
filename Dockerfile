FROM python:3.11-slim

WORKDIR /app

# 시스템 패키지 (MoviePy, 폰트 등)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    imagemagick \
    fonts-nanum \
    && rm -rf /var/lib/apt/lists/*

# ImageMagick 정책 수정 (텍스트 렌더링 허용)
RUN sed -i 's/rights="none" pattern="@\*"/rights="read|write" pattern="@*"/' /etc/ImageMagick-6/policy.xml

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# output 폴더 생성
RUN mkdir -p /app/output

# Cloud Run은 PORT 환경변수 사용
CMD uvicorn app:app --host 0.0.0.0 --port ${PORT:-8080}
