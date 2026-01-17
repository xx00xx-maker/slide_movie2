# Modal Lip-sync Inference

Modal上で動作するリップシンク動画生成エンドポイント。

## セットアップ

```bash
# Modal CLIのインストール
pip install modal

# Modal認証
modal token new

# HuggingFace Secret設定（オプション）
modal secret create huggingface-secret HUGGINGFACE_TOKEN=your_token
```

## デプロイ

```bash
# デプロイ
modal deploy modal/lipsync.py

# ローカルテスト
modal run modal/lipsync.py --source-image test.jpg --driving-audio test.mp3
```

## API使用方法

### Python Client

```python
import modal

# リモート関数を呼び出し
generate_lipsync = modal.Function.lookup("lipsync-inference", "generate_lipsync_video")

with open("avatar.jpg", "rb") as f:
    image_bytes = f.read()

with open("narration.mp3", "rb") as f:
    audio_bytes = f.read()

result = generate_lipsync.remote(image_bytes, audio_bytes, "webm")

with open("output.webm", "wb") as f:
    f.write(result)
```

### HTTP Endpoint

```bash
curl -X POST https://your-modal-endpoint/lipsync_endpoint \
  -F "source_image=@avatar.jpg" \
  -F "driving_audio=@narration.mp3" \
  -F "output_format=webm" \
  -o output.webm
```

## 出力形式

- **ProRes 4444 (.mov)**: macOS/DaVinci Resolve向け、最高品質
- **WebM VP9 (.webm)**: クロスプラットフォーム、ブラウザ再生可能

両形式ともアルファチャンネル（透過）を保持。
