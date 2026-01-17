"""
Modal Lip-sync Inference Endpoint
=================================
LivePortrait + JoyVASA を使用してキャラクター画像を音声に合わせてリップシンク動画を生成

使用方法:
    modal deploy modal/lipsync.py
    modal run modal/lipsync.py --source-image path/to/image.jpg --driving-audio path/to/audio.mp3
"""

import modal
import os
import tempfile
import subprocess
from pathlib import Path

# Modal App定義
app = modal.App("lipsync-inference")

# GPU付きイメージ定義
image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install(
        "git",
        "ffmpeg",
        "libgl1-mesa-glx",
        "libglib2.0-0",
        "libsm6",
        "libxext6",
        "libxrender-dev",
    )
    .pip_install(
        "torch>=2.0.0",
        "torchvision",
        "torchaudio",
        "numpy",
        "opencv-python-headless",
        "pillow",
        "librosa",
        "soundfile",
        "onnxruntime-gpu",
        "huggingface_hub",
        "gradio_client",  # For JoyVASA API
        "fastapi",  # Required for web endpoints
    )
)

# 永続ボリューム（モデルキャッシュ用）
volume = modal.Volume.from_name("lipsync-models", create_if_missing=True)
MODEL_DIR = "/models"


@app.cls(
    image=image,
    gpu="A10G",  # または "L4"
    timeout=600,
    volumes={MODEL_DIR: volume},
)
class LipSyncGenerator:
    """リップシンク動画生成クラス"""

    @modal.enter()
    def setup(self):
        """モデルの初期化"""
        import torch
        
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Using device: {self.device}")
        
        # LivePortraitモデルのセットアップ
        self._setup_liveportrait()

    def _setup_liveportrait(self):
        """LivePortraitのセットアップ"""
        from huggingface_hub import snapshot_download
        
        # モデルがなければダウンロード
        liveportrait_path = Path(MODEL_DIR) / "liveportrait"
        if not liveportrait_path.exists():
            print("Downloading LivePortrait models...")
            snapshot_download(
                repo_id="KwaiVGI/LivePortrait",
                local_dir=str(liveportrait_path),
                local_dir_use_symlinks=False,
            )
            volume.commit()
        
        self.liveportrait_path = liveportrait_path

    @modal.method()
    def generate_lipsync(
        self,
        source_image_bytes: bytes,
        driving_audio_bytes: bytes,
        output_format: str = "prores",  # "prores" or "webm"
    ) -> bytes:
        """
        リップシンク動画を生成
        
        Args:
            source_image_bytes: キャラクター画像のバイナリ
            driving_audio_bytes: 音声ファイルのバイナリ
            output_format: 出力形式 ("prores" for ProRes 4444, "webm" for VP9)
        
        Returns:
            生成された動画のバイナリ（透過チャンネル付き）
        """
        import cv2
        import numpy as np
        from PIL import Image
        import io
        
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir = Path(tmpdir)
            
            # 入力ファイルを保存
            source_path = tmpdir / "source.png"
            audio_path = tmpdir / "audio.wav"
            output_raw = tmpdir / "output_raw.mp4"
            
            # 画像を保存
            img = Image.open(io.BytesIO(source_image_bytes))
            img.save(source_path)
            
            # 音声を保存
            with open(audio_path, "wb") as f:
                f.write(driving_audio_bytes)
            
            # JoyVASAを使用して音声からモーションを生成
            motion_data = self._audio_to_motion(audio_path)
            
            # LivePortraitでアニメーション生成
            frames = self._generate_animation(source_path, motion_data)
            
            # フレームを動画に変換（透過付き）
            if output_format == "prores":
                output_path = tmpdir / "output.mov"
                output_bytes = self._frames_to_prores(frames, output_path, audio_path)
            else:
                output_path = tmpdir / "output.webm"
                output_bytes = self._frames_to_webm(frames, output_path, audio_path)
            
            return output_bytes

    def _audio_to_motion(self, audio_path: Path) -> dict:
        """
        音声からモーションデータを生成（JoyVASA）
        
        Note: 実際の実装ではJoyVASAまたは類似のモデルを使用
        ここではプレースホルダー実装
        """
        import librosa
        import numpy as np
        
        # 音声を読み込み
        y, sr = librosa.load(str(audio_path), sr=16000)
        
        # 音声の長さからフレーム数を計算（30fps）
        duration = len(y) / sr
        num_frames = int(duration * 30)
        
        # 音声エンベロープからモーションを生成（簡易版）
        # 実際にはJoyVASAで詳細なモーションを生成
        envelope = librosa.feature.rms(y=y, frame_length=512, hop_length=int(sr/30))[0]
        envelope = np.interp(
            np.linspace(0, len(envelope)-1, num_frames),
            np.arange(len(envelope)),
            envelope
        )
        
        # 正規化
        envelope = (envelope - envelope.min()) / (envelope.max() - envelope.min() + 1e-6)
        
        return {
            "num_frames": num_frames,
            "mouth_open": envelope,  # 口の開き具合
            "head_motion": np.sin(np.linspace(0, 2*np.pi, num_frames)) * 0.02,  # 微細な頭部動き
        }

    def _generate_animation(self, source_path: Path, motion_data: dict) -> list:
        """
        LivePortraitでアニメーションフレームを生成
        
        Note: 実際の実装ではLivePortraitのAPIを使用
        ここではプレースホルダー実装
        """
        import cv2
        import numpy as np
        from PIL import Image
        
        # ソース画像を読み込み
        source_img = np.array(Image.open(source_path).convert("RGBA"))
        h, w = source_img.shape[:2]
        
        frames = []
        for i in range(motion_data["num_frames"]):
            # 簡易的なアニメーション（実際にはLivePortraitを使用）
            frame = source_img.copy()
            
            # 口の動きをシミュレート（実際にはLivePortraitで生成）
            mouth_open = motion_data["mouth_open"][i]
            
            # プレースホルダー: 画像を少し変形
            # 実際にはLivePortraitがフェイシャルアニメーションを生成
            
            frames.append(frame)
        
        return frames

    def _frames_to_prores(self, frames: list, output_path: Path, audio_path: Path) -> bytes:
        """
        フレームをProRes 4444動画に変換（アルファチャンネル保持）
        """
        import cv2
        import numpy as np
        
        h, w = frames[0].shape[:2]
        
        # 一時的にPNG連番として保存
        frames_dir = output_path.parent / "frames"
        frames_dir.mkdir(exist_ok=True)
        
        for i, frame in enumerate(frames):
            cv2.imwrite(
                str(frames_dir / f"frame_{i:06d}.png"),
                cv2.cvtColor(frame, cv2.COLOR_RGBA2BGRA)
            )
        
        # FFmpegでProRes 4444に変換
        cmd = [
            "ffmpeg", "-y",
            "-framerate", "30",
            "-i", str(frames_dir / "frame_%06d.png"),
            "-i", str(audio_path),
            "-c:v", "prores_ks",
            "-profile:v", "4",  # ProRes 4444
            "-pix_fmt", "yuva444p10le",  # アルファチャンネル付き
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            str(output_path)
        ]
        
        subprocess.run(cmd, check=True, capture_output=True)
        
        with open(output_path, "rb") as f:
            return f.read()

    def _frames_to_webm(self, frames: list, output_path: Path, audio_path: Path) -> bytes:
        """
        フレームをWebM VP9動画に変換（アルファチャンネル保持）
        ProResが使えない環境向けの代替
        """
        import cv2
        
        h, w = frames[0].shape[:2]
        
        # 一時的にPNG連番として保存
        frames_dir = output_path.parent / "frames"
        frames_dir.mkdir(exist_ok=True)
        
        for i, frame in enumerate(frames):
            cv2.imwrite(
                str(frames_dir / f"frame_{i:06d}.png"),
                cv2.cvtColor(frame, cv2.COLOR_RGBA2BGRA)
            )
        
        # FFmpegでWebM VP9に変換（透過対応）
        cmd = [
            "ffmpeg", "-y",
            "-framerate", "30",
            "-i", str(frames_dir / "frame_%06d.png"),
            "-i", str(audio_path),
            "-c:v", "libvpx-vp9",
            "-pix_fmt", "yuva420p",  # アルファチャンネル付き
            "-c:a", "libopus",
            "-b:a", "128k",
            "-shortest",
            str(output_path)
        ]
        
        subprocess.run(cmd, check=True, capture_output=True)
        
        with open(output_path, "rb") as f:
            return f.read()


@app.function(image=image)
def generate_lipsync_video(
    source_image_bytes: bytes,
    driving_audio_bytes: bytes,
    output_format: str = "webm",
) -> bytes:
    """
    リップシンク動画を生成する関数エントリーポイント
    
    Args:
        source_image_bytes: キャラクター画像
        driving_audio_bytes: 駆動音声
        output_format: 出力形式 ("prores" or "webm")
    
    Returns:
        透過動画のバイナリ
    """
    generator = LipSyncGenerator()
    return generator.generate_lipsync.remote(
        source_image_bytes,
        driving_audio_bytes,
        output_format
    )


# Web エンドポイント
@app.function(image=image, timeout=600)
@modal.fastapi_endpoint(method="POST")
def lipsync_endpoint(
    source_image: bytes,
    driving_audio: bytes,
    output_format: str = "webm",
) -> bytes:
    """
    HTTPエンドポイント
    
    POST /lipsync_endpoint
    Content-Type: multipart/form-data
    
    Fields:
        - source_image: キャラクター画像ファイル
        - driving_audio: 音声ファイル
        - output_format: "prores" or "webm"
    """
    return generate_lipsync_video.remote(source_image, driving_audio, output_format)


# CLIテスト用
@app.local_entrypoint()
def main(
    source_image: str,
    driving_audio: str,
    output: str = "output.webm",
    format: str = "webm",
):
    """
    ローカルテスト用エントリーポイント
    
    Usage:
        modal run modal/lipsync.py --source-image image.jpg --driving-audio audio.mp3
    """
    with open(source_image, "rb") as f:
        image_bytes = f.read()
    
    with open(driving_audio, "rb") as f:
        audio_bytes = f.read()
    
    result = generate_lipsync_video.remote(image_bytes, audio_bytes, format)
    
    with open(output, "wb") as f:
        f.write(result)
    
    print(f"Output saved to: {output}")
