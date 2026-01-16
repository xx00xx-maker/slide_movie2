"use client"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Video, Sparkles, Trash2, Loader2 } from "lucide-react"

interface HeaderProps {
  slidesCount: number
  hasGeneratedAudio: boolean
  onExport: () => void
  onClear: () => void
  isExporting: boolean
  exportProgress: number
}

export function Header({
  slidesCount,
  hasGeneratedAudio,
  onExport,
  onClear,
  isExporting,
  exportProgress,
}: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">AI Presentation Video Maker</h1>
          <p className="text-xs text-muted-foreground">Powered by Gemini 2.5 Flash</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {slidesCount > 0 && (
          <>
            <span className="text-sm text-muted-foreground">{slidesCount} スライド</span>
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              クリア
            </Button>
          </>
        )}

        {isExporting ? (
          <div className="flex items-center gap-3 min-w-[200px]">
            <Loader2 className="h-4 w-4 animate-spin" />
            <Progress value={exportProgress} className="flex-1" />
            <span className="text-sm text-muted-foreground">{exportProgress}%</span>
          </div>
        ) : (
          <Button onClick={onExport} disabled={!hasGeneratedAudio} className="gap-2">
            <Video className="h-4 w-4" />
            動画を書き出す
          </Button>
        )}
      </div>
    </header>
  )
}
