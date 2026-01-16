import os
import json
import uuid
import tempfile
import requests
from pathlib import Path
from fastapi import FastAPI, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from openai import OpenAI
from google.cloud import texttospeech
from google.oauth2 import service_account
from moviepy.editor import (
    ImageClip, AudioFileClip, concatenate_videoclips,
    CompositeVideoClip, TextClip
)

app = FastAPI(title="키워드 → 영상 생성 API")

# OpenAI 클라이언트
openai_client = OpenAI()

# Google TTS 클라이언트 (환경변수에서 JSON 직접 읽기)
def get_tts_client():
    creds_json = os.environ.get("GOOGLE_CREDENTIALS_JSON")
    if creds_json:
        creds_dict = json.loads(creds_json)
        credentials = service_account.Credentials.from_service_account_info(creds_dict)
        return texttospeech.TextToSpeechClient(credentials=credentials)
    return texttospeech.TextToSpeechClient()

tts_client = None

# 작업 상태 저장
jobs = {}


class GenerateRequest(BaseModel):
    keyword: str
    duration_minutes: int = 12


class JobStatus(BaseModel):
    job_id: str
    status: str  # pending, processing, completed, failed
    progress: str | None = None
    video_url: str | None = None
    error: str | None = None


# ===== 대본 생성 =====
def generate_script(keyword: str, duration_minutes: int = 12) -> list[dict]:
    prompt = f"""
    주제: {keyword}
    형식: 시니어 타깃 감정형 유튜브 영상 ({duration_minutes}분)

    아래 형식으로 장면별 대본을 JSON으로 출력하세요:
    {{"scenes": [
      {{"scene": 1, "narration": "나레이션 텍스트", "image_prompt": "DALL-E용 이미지 프롬프트 (영어)"}},
      ...
    ]}}

    구조:
    - scene 1-2: 훅 (결말의 이상한 한 줄로 시작)
    - scene 3-10: 상황/인물/갈등 전개
    - scene 11-20: 단서 투입, 반전
    - scene 21-25: 정리 + 시청자 질문

    총 25개 장면, 각 나레이션은 20-30초 분량(50-80자)
    """

    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )

    return json.loads(response.choices[0].message.content)["scenes"]


# ===== 이미지 생성 =====
def generate_image(prompt: str, output_path: str) -> str:
    response = openai_client.images.generate(
        model="dall-e-3",
        prompt=prompt,
        size="1792x1024",
        quality="standard",
        n=1
    )

    img_data = requests.get(response.data[0].url).content
    Path(output_path).write_bytes(img_data)
    return output_path


# ===== 음성 생성 =====
def generate_audio(text: str, output_path: str) -> str:
    global tts_client
    if tts_client is None:
        tts_client = get_tts_client()

    synthesis_input = texttospeech.SynthesisInput(text=text)
    voice = texttospeech.VoiceSelectionParams(
        language_code="ko-KR",
        name="ko-KR-Neural2-A",
        ssml_gender=texttospeech.SsmlVoiceGender.FEMALE
    )
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3,
        speaking_rate=0.9
    )

    response = tts_client.synthesize_speech(
        input=synthesis_input,
        voice=voice,
        audio_config=audio_config
    )

    Path(output_path).write_bytes(response.audio_content)
    return output_path


# ===== 영상 합성 =====
def create_video(image_paths: list, audio_paths: list, scenes: list, output_path: str) -> str:
    clips = []

    for img_path, audio_path, scene in zip(image_paths, audio_paths, scenes):
        audio = AudioFileClip(audio_path)
        img_clip = (ImageClip(img_path)
                    .set_duration(audio.duration)
                    .set_audio(audio)
                    .resize(height=1080))

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

    final = concatenate_videoclips(clips, method="compose")
    final.write_videofile(output_path, fps=24, codec='libx264', audio_codec='aac')

    return output_path


# ===== 전체 파이프라인 =====
def process_video(job_id: str, keyword: str, duration_minutes: int):
    try:
        output_dir = f"./output/{job_id}"
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        # 1. 대본 생성
        jobs[job_id]["progress"] = "대본 생성 중... (1/4)"
        scenes = generate_script(keyword, duration_minutes)

        # 2. 이미지 생성
        jobs[job_id]["progress"] = "이미지 생성 중... (2/4)"
        image_dir = f"{output_dir}/images"
        Path(image_dir).mkdir(exist_ok=True)
        image_paths = []
        for i, scene in enumerate(scenes):
            jobs[job_id]["progress"] = f"이미지 생성 중... ({i+1}/{len(scenes)})"
            path = f"{image_dir}/scene_{scene['scene']:02d}.png"
            generate_image(scene["image_prompt"], path)
            image_paths.append(path)

        # 3. 음성 생성
        jobs[job_id]["progress"] = "음성 생성 중... (3/4)"
        audio_dir = f"{output_dir}/audio"
        Path(audio_dir).mkdir(exist_ok=True)
        audio_paths = []
        for scene in scenes:
            path = f"{audio_dir}/scene_{scene['scene']:02d}.mp3"
            generate_audio(scene["narration"], path)
            audio_paths.append(path)

        # 4. 영상 합성
        jobs[job_id]["progress"] = "영상 합성 중... (4/4)"
        video_path = f"{output_dir}/video.mp4"
        create_video(image_paths, audio_paths, scenes, video_path)

        jobs[job_id]["status"] = "completed"
        jobs[job_id]["video_url"] = f"/download/{job_id}"
        jobs[job_id]["progress"] = "완료"

    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)


# ===== API 엔드포인트 =====

@app.post("/generate", response_model=JobStatus)
async def generate_video(req: GenerateRequest, background_tasks: BackgroundTasks):
    """키워드로 영상 생성 시작"""
    job_id = str(uuid.uuid4())[:8]

    jobs[job_id] = {
        "job_id": job_id,
        "status": "processing",
        "progress": "시작...",
        "video_url": None,
        "error": None
    }

    background_tasks.add_task(process_video, job_id, req.keyword, req.duration_minutes)

    return jobs[job_id]


@app.get("/status/{job_id}", response_model=JobStatus)
async def get_status(job_id: str):
    """작업 상태 확인"""
    if job_id not in jobs:
        return JobStatus(job_id=job_id, status="not_found")
    return jobs[job_id]


@app.get("/download/{job_id}")
async def download_video(job_id: str):
    """완성된 영상 다운로드"""
    video_path = f"./output/{job_id}/video.mp4"
    if not Path(video_path).exists():
        return {"error": "영상을 찾을 수 없습니다"}
    return FileResponse(video_path, filename=f"{job_id}.mp4", media_type="video/mp4")


@app.get("/")
async def root():
    return {
        "service": "키워드 → 영상 생성 API",
        "endpoints": {
            "POST /generate": "영상 생성 시작 (body: {keyword, duration_minutes})",
            "GET /status/{job_id}": "작업 상태 확인",
            "GET /download/{job_id}": "영상 다운로드"
        }
    }
