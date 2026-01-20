"use client"

import { SlideCard } from "@/components/slide-card"
import { FileText } from "lucide-react"
import type { SlideData, VideoFormat } from "@/types/presentation"

interface SlideEditorProps {
  slides: SlideData[]
  globalVoiceId: string
  videoFormat: VideoFormat
  playingSlideId: string | null
  onSlideUpdate: (id: string, updates: Partial<SlideData>) => void
  onGenerateAudio: (id: string) => void
  onPlayAudio: (id: string) => void
  onStopAudio: () => void
  onReorderSlides: (fromIndex: number, toIndex: number) => void
  onRewriteScript: (id: string) => void
}

export function SlideEditor({
  slides,
  globalVoiceId,
  videoFormat,
  playingSlideId,
  onSlideUpdate,
  onGenerateAudio,
  onPlayAudio,
  onStopAudio,
  onRewriteScript,
}: SlideEditorProps) {
  if (slides.length === 0) {
    return (
      <main className="flex flex-1 items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-foreground">スライドがありません</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              右側のパネルからPDFと原稿をアップロードして
              <br />
              「解析して展開」をクリックしてください
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        {slides.map((slide, index) => (
          <SlideCard
            key={slide.id}
            slide={slide}
            index={index}
            globalVoiceId={globalVoiceId}
            onUpdate={(updates) => onSlideUpdate(slide.id, updates)}
            onGenerateAudio={() => onGenerateAudio(slide.id)}
            onPlayAudio={() => onPlayAudio(slide.id)}
            onStopAudio={onStopAudio}
            onRewriteScript={() => onRewriteScript(slide.id)}
            videoFormat={videoFormat}
            isPlaying={playingSlideId === slide.id}
          />
        ))}
      </div>
    </main>
  )
}
