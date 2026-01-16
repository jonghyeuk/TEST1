# 키워드 → 영상 자동 생성 파이프라인 (API 기반)

> OpenAI 이미지 생성 + Google TTS로 영상 자동화

---

## 필요 API

| API | 용도 | 가격 |
|-----|------|------|
| OpenAI DALL-E 3 | 이미지 생성 | $0.04~0.12/장 |
| Google Cloud TTS | 음성 생성 | 무료 400만 글자/월, 이후 $4/100만 글자 |
| (선택) OpenAI GPT | 대본 생성 | $0.01~0.03/1K 토큰 |

---

## 파이프라인 구조

```
키워드 입력
    ↓
1. GPT로 대본 생성 (장면별 분할)
    ↓
2. 각 장면별 DALL-E로 이미지 생성
    ↓
3. Google TTS로 나레이션 생성
    ↓
4. FFmpeg로 이미지+음성 결합 → 영상 출력
```

---

## 1. 환경 설정

```bash
pip install openai google-cloud-texttospeech moviepy pillow
```

```bash
# API 키 환경변수
export OPENAI_API_KEY="sk-..."
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/credentials.json"
```

---

## 2. 대본 생성 (GPT)

```python
from openai import OpenAI

client = OpenAI()

def generate_script(keyword: str, duration_minutes: int = 12) -> list[dict]:
    """키워드로 장면별 대본 생성"""

    prompt = f"""
    주제: {keyword}
    형식: 시니어 타깃 감정형 유튜브 영상 ({duration_minutes}분)

    아래 형식으로 장면별 대본을 JSON 배열로 출력하세요:
    [
      {{"scene": 1, "narration": "나레이션 텍스트", "image_prompt": "DALL-E용 이미지 프롬프트 (영어)"}},
      ...
    ]

    구조:
    - scene 1-2: 훅 (결말의 이상한 한 줄로 시작)
    - scene 3-10: 상황/인물/갈등 전개
    - scene 11-20: 단서 투입, 반전
    - scene 21-25: 정리 + 시청자 질문

    총 25개 장면, 각 나레이션은 20-30초 분량(50-80자)
    """

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )

    import json
    return json.loads(response.choices[0].message.content)["scenes"]
```

---

## 3. 이미지 생성 (DALL-E 3)

```python
import requests
from pathlib import Path

def generate_image(prompt: str, output_path: str) -> str:
    """DALL-E 3로 이미지 생성"""

    response = client.images.generate(
        model="dall-e-3",
        prompt=prompt,
        size="1792x1024",  # 16:9 비율
        quality="standard",
        n=1
    )

    image_url = response.data[0].url

    # 이미지 다운로드
    img_data = requests.get(image_url).content
    Path(output_path).write_bytes(img_data)

    return output_path


def generate_all_images(scenes: list[dict], output_dir: str) -> list[str]:
    """모든 장면 이미지 생성"""

    Path(output_dir).mkdir(exist_ok=True)
    image_paths = []

    for scene in scenes:
        path = f"{output_dir}/scene_{scene['scene']:02d}.png"
        generate_image(scene["image_prompt"], path)
        image_paths.append(path)
        print(f"Generated: {path}")

    return image_paths
```

---

## 4. 음성 생성 (Google TTS)

```python
from google.cloud import texttospeech

def generate_audio(text: str, output_path: str) -> str:
    """Google TTS로 음성 생성"""

    client = texttospeech.TextToSpeechClient()

    synthesis_input = texttospeech.SynthesisInput(text=text)

    voice = texttospeech.VoiceSelectionParams(
        language_code="ko-KR",
        name="ko-KR-Wavenet-A",  # 또는 ko-KR-Wavenet-B, C, D
        ssml_gender=texttospeech.SsmlVoiceGender.FEMALE
    )

    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3,
        speaking_rate=0.9,  # 시니어용 약간 느리게
        pitch=0.0
    )

    response = client.synthesize_speech(
        input=synthesis_input,
        voice=voice,
        audio_config=audio_config
    )

    Path(output_path).write_bytes(response.audio_content)
    return output_path


def generate_all_audio(scenes: list[dict], output_dir: str) -> list[str]:
    """모든 장면 음성 생성"""

    Path(output_dir).mkdir(exist_ok=True)
    audio_paths = []

    for scene in scenes:
        path = f"{output_dir}/scene_{scene['scene']:02d}.mp3"
        generate_audio(scene["narration"], path)
        audio_paths.append(path)
        print(f"Generated: {path}")

    return audio_paths
```

---

## 5. 영상 합성 (MoviePy)

```python
from moviepy.editor import (
    ImageClip, AudioFileClip, concatenate_videoclips,
    CompositeVideoClip, TextClip
)

def create_video(image_paths: list[str], audio_paths: list[str],
                 scenes: list[dict], output_path: str) -> str:
    """이미지+음성 결합하여 영상 생성"""

    clips = []

    for img_path, audio_path, scene in zip(image_paths, audio_paths, scenes):
        # 음성 길이에 맞춰 이미지 클립 생성
        audio = AudioFileClip(audio_path)

        img_clip = (ImageClip(img_path)
                    .set_duration(audio.duration)
                    .set_audio(audio)
                    .resize(height=1080))

        # 자막 추가 (선택)
        txt_clip = (TextClip(scene["narration"],
                            fontsize=40,
                            color='white',
                            font='NanumGothic',
                            stroke_color='black',
                            stroke_width=2)
                    .set_position(('center', 'bottom'))
                    .set_duration(audio.duration))

        video = CompositeVideoClip([img_clip, txt_clip])
        clips.append(video)

    # 전체 영상 결합
    final = concatenate_videoclips(clips, method="compose")
    final.write_videofile(output_path, fps=24, codec='libx264')

    return output_path
```

---

## 6. 전체 파이프라인

```python
def keyword_to_video(keyword: str, output_dir: str = "./output") -> str:
    """키워드 입력 → 영상 출력"""

    print(f"=== 키워드: {keyword} ===")

    # 1. 대본 생성
    print("\n[1/4] 대본 생성 중...")
    scenes = generate_script(keyword)
    print(f"  → {len(scenes)}개 장면 생성 완료")

    # 2. 이미지 생성
    print("\n[2/4] 이미지 생성 중...")
    image_paths = generate_all_images(scenes, f"{output_dir}/images")

    # 3. 음성 생성
    print("\n[3/4] 음성 생성 중...")
    audio_paths = generate_all_audio(scenes, f"{output_dir}/audio")

    # 4. 영상 합성
    print("\n[4/4] 영상 합성 중...")
    video_path = create_video(
        image_paths,
        audio_paths,
        scenes,
        f"{output_dir}/final_video.mp4"
    )

    print(f"\n=== 완료: {video_path} ===")
    return video_path


# 실행
if __name__ == "__main__":
    keyword_to_video("북한에서 탈출한 가족의 20년 만의 재회")
```

---

## 7. 비용 계산 (12분 영상 기준)

| 항목 | 수량 | 단가 | 비용 |
|------|------|------|------|
| GPT-4o (대본) | ~2K 토큰 | $0.01/1K | ~$0.02 |
| DALL-E 3 이미지 | 25장 | $0.04/장 | ~$1.00 |
| Google TTS | ~2000자 | 무료 | $0.00 |
| **총합** | | | **~$1.02/영상** |

---

## 8. Google TTS 설정 방법

```bash
# 1. Google Cloud 프로젝트 생성
# 2. Cloud Text-to-Speech API 활성화
# 3. 서비스 계정 생성 → JSON 키 다운로드

# 4. 환경변수 설정
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your-key.json"
```

**사용 가능한 한국어 음성**:
| 음성 ID | 성별 | 특징 |
|---------|------|------|
| ko-KR-Wavenet-A | 여성 | 자연스러움 |
| ko-KR-Wavenet-B | 여성 | 차분함 |
| ko-KR-Wavenet-C | 남성 | 또렷함 |
| ko-KR-Wavenet-D | 남성 | 중후함 |
| ko-KR-Neural2-A | 여성 | 최신, 더 자연스러움 |
| ko-KR-Neural2-B | 여성 | 최신 |
| ko-KR-Neural2-C | 남성 | 최신 |

---

## 9. 디렉토리 구조

```
output/
├── images/
│   ├── scene_01.png
│   ├── scene_02.png
│   └── ...
├── audio/
│   ├── scene_01.mp3
│   ├── scene_02.mp3
│   └── ...
└── final_video.mp4
```

---

## 핵심 요약

```
키워드 → GPT(대본) → DALL-E(이미지) → Google TTS(음성) → FFmpeg(합성) → 영상
```

**예상 비용**: ~$1/영상
**예상 시간**: 5~10분 (API 호출 시간)
