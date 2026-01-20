"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, FileText, Wand2, Settings2, Loader2, User } from "lucide-react"
import type { GlobalSettings, VideoFormat } from "@/types/presentation"
import { VOICE_OPTIONS, getVoiceById } from "@/lib/voices"

interface ControlPanelProps {
  globalSettings: GlobalSettings
  onGlobalSettingsChange: (settings: GlobalSettings) => void
  onAnalyze: (pdfFile: File | null, manuscript: string) => void
  onApplyGlobalSettings: () => void
  isProcessing: boolean
}

export function ControlPanel({
  globalSettings,
  onGlobalSettingsChange,
  onAnalyze,
  onApplyGlobalSettings,
  isProcessing,
}: ControlPanelProps) {
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [manuscript, setManuscript] = useState("")
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type === "application/pdf") {
      setPdfFile(file)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPdfFile(file)
    }
  }, [])

  const selectedVoice = getVoiceById(globalSettings.voiceId)

  return (
    <aside className="flex w-[350px] flex-col gap-4 border-l border-border bg-card p-4 overflow-y-auto">
      {/* Video Format Selector */}
      <Card className="p-4">
        <Label className="mb-3 flex items-center gap-2 text-sm font-medium">
          動画フォーマット
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={globalSettings.videoFormat === "landscape" ? "default" : "outline"}
            size="sm"
            onClick={() => onGlobalSettingsChange({ ...globalSettings, videoFormat: "landscape" })}
            className="gap-2"
          >
            <span className="text-lg">📺</span>
            横型 (16:9)
          </Button>
          <Button
            variant={globalSettings.videoFormat === "portrait" ? "default" : "outline"}
            size="sm"
            onClick={() => onGlobalSettingsChange({ ...globalSettings, videoFormat: "portrait" })}
            className="gap-2"
          >
            <span className="text-lg">📱</span>
            縦型 (9:16)
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {globalSettings.videoFormat === "landscape"
            ? "YouTube・通常動画向け"
            : "YouTube Shorts・TikTok向け"}
        </p>
      </Card>

      {/* PDF Upload Area */}
      <Card className="p-4">
        <Label className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Upload className="h-4 w-4" />
          PDFスライドをアップロード
        </Label>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${isDragOver
            ? "border-primary bg-primary/5"
            : pdfFile
              ? "border-primary/50 bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
        >
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          {pdfFile ? (
            <div className="flex flex-col items-center gap-2 text-center">
              <FileText className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium text-foreground">{pdfFile.name}</span>
              <span className="text-xs text-muted-foreground">クリックして変更</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-center">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">ドラッグ＆ドロップ</span>
              <span className="text-xs text-muted-foreground">またはクリックして選択</span>
            </div>
          )}
        </div>
      </Card>

      {/* Manuscript Input Area */}
      <Card className="flex-1 p-4">
        <Label className="mb-3 flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4" />
          原稿テキスト
        </Label>
        <Textarea
          value={manuscript}
          onChange={(e) => setManuscript(e.target.value)}
          placeholder={`スライド1: ここに1枚目の原稿を入力...\n\nスライド2: ここに2枚目の原稿を入力...\n\nスライド3: ここに3枚目の原稿を入力...`}
          className="min-h-[200px] resize-none font-mono text-sm"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          「スライド1:」「スライド2:」の形式でテキストを区切ってください
        </p>
      </Card>

      {/* Analyze Button */}
      <Button
        onClick={() => onAnalyze(pdfFile, manuscript)}
        disabled={isProcessing || (!pdfFile && !manuscript)}
        className="h-12 gap-2 text-base"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            解析中...
          </>
        ) : (
          <>
            <Wand2 className="h-5 w-5" />
            解析して展開
          </>
        )}
      </Button>

      {/* Global Settings */}
      <Card className="p-4">
        <Label className="mb-4 flex items-center gap-2 text-sm font-medium">
          <Settings2 className="h-4 w-4" />
          グローバル設定
        </Label>

        <div className="space-y-4">
          {/* Voice Type */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              デフォルト話者
            </Label>
            <Select
              value={globalSettings.voiceId}
              onValueChange={(value) => onGlobalSettingsChange({ ...globalSettings, voiceId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="話者を選択">
                  {selectedVoice?.displayName}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-b">女性</div>
                {VOICE_OPTIONS.filter(v => v.gender === "female").map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    <div className="flex flex-col py-0.5">
                      <span className="font-medium">{voice.displayName}</span>
                      <span className="text-xs text-muted-foreground">{voice.description}</span>
                    </div>
                  </SelectItem>
                ))}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t border-b">男性</div>
                {VOICE_OPTIONS.filter(v => v.gender === "male").map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    <div className="flex flex-col py-0.5">
                      <span className="font-medium">{voice.displayName}</span>
                      <span className="text-xs text-muted-foreground">{voice.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Speed */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">読み上げスピード</Label>
              <span className="text-xs font-medium">{globalSettings.speed.toFixed(1)}x</span>
            </div>
            <Slider
              value={[globalSettings.speed]}
              onValueChange={([value]) => onGlobalSettingsChange({ ...globalSettings, speed: value })}
              min={0.5}
              max={2.0}
              step={0.1}
              className="w-full"
            />
          </div>

          <Button variant="secondary" size="sm" onClick={onApplyGlobalSettings} className="w-full">
            全スライドに適用
          </Button>
        </div>
      </Card>
    </aside>
  )
}
