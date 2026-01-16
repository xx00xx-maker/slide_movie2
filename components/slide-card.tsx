"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { GripVertical, Play, Loader2, CheckCircle2, Circle, Volume2, Square, Wand2, User, ZoomIn } from "lucide-react"
import type { SlideData } from "@/types/presentation"
import { VOICE_OPTIONS, getVoiceById } from "@/lib/voices"

interface SlideCardProps {
  slide: SlideData
  index: number
  globalVoiceId: string
  onUpdate: (updates: Partial<SlideData>) => void
  onGenerateAudio: () => void
  onPlayAudio: () => void
  onStopAudio: () => void
  onRewriteScript: () => void
  isPlaying: boolean
}

export function SlideCard({
  slide,
  index,
  globalVoiceId,
  onUpdate,
  onGenerateAudio,
  onPlayAudio,
  onStopAudio,
  onRewriteScript,
  isPlaying,
}: SlideCardProps) {
  const statusConfig = {
    not_generated: {
      icon: Circle,
      label: "未生成",
      variant: "secondary" as const,
    },
    generating: {
      icon: Loader2,
      label: "生成中...",
      variant: "default" as const,
    },
    generated: {
      icon: CheckCircle2,
      label: "生成済み",
      variant: "default" as const,
    },
  }

  const status = statusConfig[slide.audioStatus]
  const StatusIcon = status.icon

  // Get effective voice (slide-specific or global)
  const effectiveVoiceId = slide.voiceId || globalVoiceId
  const effectiveVoice = getVoiceById(effectiveVoiceId)

  return (
    <Card className="overflow-hidden bg-card transition-shadow hover:shadow-md">
      <div className="flex items-stretch">
        {/* Drag Handle */}
        <div className="flex w-10 cursor-grab items-center justify-center border-r border-border bg-muted/50 active:cursor-grabbing">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col p-4">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">スライド {index + 1}</h3>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={onRewriteScript}
                className="h-7 gap-1 px-2 text-xs"
              >
                <Wand2 className="h-3 w-3" />
                AIリライト
              </Button>
              <Badge variant={status.variant} className="gap-1">
                <StatusIcon
                  className={`h-3 w-3 ${slide.audioStatus === "generating" ? "animate-spin" : ""} ${slide.audioStatus === "generated" ? "text-emerald-500" : ""}`}
                />
                {status.label}
              </Badge>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid gap-4 md:grid-cols-[280px_1fr]">
            {/* Slide Preview - 16:9 aspect ratio */}
            <SlideImagePreview
              imageUrl={slide.imageUrl}
              slideNumber={index + 1}
            />

            {/* Text Editor */}
            <div className="flex flex-col gap-3">
              <Textarea
                value={slide.text}
                onChange={(e) => onUpdate({ text: e.target.value })}
                placeholder="読み上げ原稿を入力..."
                className="min-h-[120px] flex-1 resize-none text-sm"
              />
            </div>
          </div>

          {/* Controls */}
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-4">
            {/* Voice Selector */}
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                <User className="h-3 w-3" />
                話者
              </Label>
              <Select
                value={slide.voiceId || "__global__"}
                onValueChange={(value) => onUpdate({ voiceId: value === "__global__" ? undefined : value })}
              >
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder={effectiveVoice?.displayName || "グローバル設定"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__global__">
                    <span className="text-muted-foreground">グローバル設定</span>
                  </SelectItem>
                  <div className="px-2 py-1 text-xs text-muted-foreground font-medium">女性</div>
                  {VOICE_OPTIONS.filter(v => v.gender === "female").map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <div className="flex flex-col">
                        <span>{voice.displayName}</span>
                        <span className="text-xs text-muted-foreground">{voice.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                  <div className="px-2 py-1 text-xs text-muted-foreground font-medium">男性</div>
                  {VOICE_OPTIONS.filter(v => v.gender === "male").map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <div className="flex flex-col">
                        <span>{voice.displayName}</span>
                        <span className="text-xs text-muted-foreground">{voice.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Speed Slider */}
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">スピード</Label>
              <Slider
                value={[slide.speed]}
                onValueChange={([value]) => onUpdate({ speed: value })}
                min={0.5}
                max={2.0}
                step={0.1}
                className="w-20"
              />
              <span className="w-8 text-xs font-medium">{slide.speed.toFixed(1)}x</span>
            </div>

            {/* Intonation Slider */}
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">抑揚</Label>
              <Slider
                value={[slide.intonation]}
                onValueChange={([value]) => onUpdate({ intonation: value })}
                min={0.5}
                max={1.5}
                step={0.1}
                className="w-20"
              />
              <span className="w-8 text-xs font-medium">{slide.intonation.toFixed(1)}</span>
            </div>

            {/* Generate/Play/Stop Buttons */}
            <div className="ml-auto flex gap-2">
              {slide.audioStatus === "generated" && (
                isPlaying ? (
                  <Button size="sm" variant="outline" onClick={onStopAudio} className="gap-2 bg-transparent text-destructive">
                    <Square className="h-4 w-4" />
                    停止
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={onPlayAudio} className="gap-2 bg-transparent">
                    <Volume2 className="h-4 w-4" />
                    再生
                  </Button>
                )
              )}
              <Button
                size="sm"
                onClick={onGenerateAudio}
                disabled={slide.audioStatus === "generating"}
                className="gap-2"
              >
                {slide.audioStatus === "generating" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    音声生成
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

/**
 * Slide image preview with zoom dialog
 */
function SlideImagePreview({ imageUrl, slideNumber }: { imageUrl: string; slideNumber: number }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div
        className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted cursor-pointer group"
        onClick={() => setIsOpen(true)}
      >
        <img
          src={imageUrl || "/placeholder.svg"}
          alt={`スライド ${slideNumber}`}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
        {/* Zoom indicator */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
          <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        {/* Placeholder for lip-sync character overlay */}
        <div className="absolute bottom-2 right-2 h-16 w-16 rounded-full border-2 border-dashed border-muted-foreground/30" />
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl p-2">
          <DialogTitle className="sr-only">スライド {slideNumber} プレビュー</DialogTitle>
          <img
            src={imageUrl || "/placeholder.svg"}
            alt={`スライド ${slideNumber}`}
            className="w-full h-auto rounded-lg"
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
