"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Header } from "@/components/header"
import { ControlPanel } from "@/components/control-panel"
import { SlideEditor } from "@/components/slide-editor"
import type { SlideData, GlobalSettings, AnalyzeResponse, TtsResponse, ExportResponse, LipsyncResponse } from "@/types/presentation"
import { getVoiceById, getDefaultVoice } from "@/lib/voices"

const LOCAL_STORAGE_KEY = "presentation-maker-project"

export function PresentationVideoMaker() {
  const [slides, setSlides] = useState<SlideData[]>([])
  const [projectId, setProjectId] = useState<string | null>(null)
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    voiceId: getDefaultVoice().id,
    speed: 1.0,
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [playingSlideId, setPlayingSlideId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        if (data.slides) setSlides(data.slides)
        if (data.projectId) setProjectId(data.projectId)
        if (data.globalSettings) {
          // Handle legacy voiceType -> voiceId migration
          if (data.globalSettings.voiceType && !data.globalSettings.voiceId) {
            data.globalSettings.voiceId = getDefaultVoice().id
          }
          setGlobalSettings(data.globalSettings)
        }
      }
    } catch (error) {
      console.error("Failed to load saved project:", error)
    }
  }, [])

  // Save to localStorage on changes
  useEffect(() => {
    if (slides.length > 0 || projectId) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
          slides,
          projectId,
          globalSettings,
          updatedAt: new Date().toISOString(),
        }))
      } catch (error) {
        console.error("Failed to save project:", error)
      }
    }
  }, [slides, projectId, globalSettings])

  const handleAnalyze = useCallback(
    async (pdfFile: File | null, manuscript: string) => {
      if (!pdfFile && !manuscript) return

      setIsProcessing(true)

      try {
        const formData = new FormData()
        if (pdfFile) {
          formData.append("pdf", pdfFile)
        }
        if (manuscript) {
          formData.append("manuscript", manuscript)
        }

        const response = await fetch("/api/analyze", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Analysis failed")
        }

        const data: AnalyzeResponse = await response.json()
        setProjectId(data.projectId)

        const newSlides: SlideData[] = data.scenes.map((scene, index) => ({
          id: `slide-${Date.now()}-${index}`,
          slideNumber: scene.slideNumber,
          imageUrl: scene.imageUrl,
          text: scene.script,
          speed: globalSettings.speed,
          intonation: 1.0,
          audioStatus: "not_generated" as const,
        }))

        setSlides(newSlides)
      } catch (error) {
        console.error("Analysis error:", error)
        alert(`解析エラー: ${error instanceof Error ? error.message : "Unknown error"}`)
      } finally {
        setIsProcessing(false)
      }
    },
    [globalSettings.speed]
  )

  const handleSlideUpdate = useCallback((id: string, updates: Partial<SlideData>) => {
    setSlides((prev) => prev.map((slide) => (slide.id === id ? { ...slide, ...updates } : slide)))
  }, [])

  const handleGenerateAudio = useCallback(async (id: string) => {
    const slide = slides.find((s) => s.id === id)
    if (!slide) return

    // Get effective voice (slide-specific or global)
    const effectiveVoiceId = slide.voiceId || globalSettings.voiceId
    const voice = getVoiceById(effectiveVoiceId)

    setSlides((prev) =>
      prev.map((s) => (s.id === id ? { ...s, audioStatus: "generating" as const } : s))
    )

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: slide.text,
          speed: slide.speed,
          intonation: slide.intonation > 1.2 ? "strong" : slide.intonation < 0.8 ? "weak" : "normal",
          actingInstruction: slide.actingInstruction,
          voiceName: voice?.name || "Aoede",
          projectId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "TTS failed")
      }

      const data: TtsResponse = await response.json()

      setSlides((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, audioStatus: "generated" as const, audioUrl: data.audioUrl, audioPath: data.audioPath }
            : s
        )
      )
    } catch (error) {
      console.error("TTS error:", error)
      setSlides((prev) =>
        prev.map((s) => (s.id === id ? { ...s, audioStatus: "not_generated" as const } : s))
      )
      alert(`音声生成エラー: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }, [slides, projectId, globalSettings.voiceId])

  const handlePlayAudio = useCallback((id: string) => {
    const slide = slides.find((s) => s.id === id)
    if (!slide?.audioUrl) return

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    const audio = new Audio(slide.audioUrl)
    audioRef.current = audio
    setPlayingSlideId(id)

    audio.onended = () => {
      setPlayingSlideId(null)
      audioRef.current = null
    }

    audio.onerror = () => {
      setPlayingSlideId(null)
      audioRef.current = null
      alert("音声の再生に失敗しました")
    }

    audio.play()
  }, [slides])

  const handleStopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlayingSlideId(null)
  }, [])

  const handleReorderSlides = useCallback((fromIndex: number, toIndex: number) => {
    setSlides((prev) => {
      const newSlides = [...prev]
      const [movedSlide] = newSlides.splice(fromIndex, 1)
      newSlides.splice(toIndex, 0, movedSlide)
      return newSlides
    })
  }, [])

  const handleApplyGlobalSettings = useCallback(() => {
    setSlides((prev) =>
      prev.map((slide) => ({
        ...slide,
        speed: globalSettings.speed,
        voiceId: undefined, // Reset to global
      }))
    )
  }, [globalSettings.speed])

  const handleRewriteScript = useCallback(async (id: string) => {
    const slide = slides.find((s) => s.id === id)
    if (!slide) return

    try {
      const response = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: slide.text,
          context: `スライド${slide.slideNumber}`,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Rewrite failed")
      }

      const data = await response.json()
      handleSlideUpdate(id, { text: data.script })
    } catch (error) {
      console.error("Rewrite error:", error)
      alert(`リライトエラー: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }, [slides, handleSlideUpdate])

  const handleExport = useCallback(async () => {
    const generatedSlides = slides.filter((s) => s.audioStatus === "generated" && s.audioPath)
    if (generatedSlides.length === 0) {
      alert("音声が生成されたスライドがありません")
      return
    }

    setIsExporting(true)
    setExportProgress(0)

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slides: generatedSlides.map((s) => ({
            imagePath: s.imagePath || s.imageUrl.replace(/^\/api\/images\?path=/, ""),
            audioPath: s.audioPath,
          })),
          projectId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Export failed")
      }

      const data: ExportResponse = await response.json()

      // Download the video
      const link = document.createElement("a")
      link.href = data.videoUrl
      link.download = `presentation_${Date.now()}.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setExportProgress(100)
    } catch (error) {
      console.error("Export error:", error)
      alert(`書き出しエラー: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsExporting(false)
    }
  }, [slides, projectId])

  const handleClearProject = useCallback(() => {
    if (confirm("プロジェクトをクリアしますか？")) {
      // Stop any playing audio
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      setPlayingSlideId(null)
      setSlides([])
      setProjectId(null)
      localStorage.removeItem(LOCAL_STORAGE_KEY)
    }
  }, [])

  const handleAvatarUpload = useCallback(async (id: string, file: File) => {
    const slide = slides.find((s) => s.id === id)
    if (!slide || !slide.audioPath) {
      alert("先に音声を生成してください")
      return
    }

    // Update status to uploading
    setSlides((prev) =>
      prev.map((s) => (s.id === id ? { ...s, avatarStatus: "uploading" as const } : s))
    )

    try {
      const formData = new FormData()
      formData.append("avatarImage", file)
      formData.append("slideId", id)
      formData.append("projectId", projectId || "default")
      formData.append("audioPath", slide.audioPath)

      const response = await fetch("/api/lipsync", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Upload failed")
      }

      const data: LipsyncResponse = await response.json()

      setSlides((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
              ...s,
              avatarImageUrl: data.avatarImageUrl,
              avatarVideoUrl: data.avatarVideoUrl || undefined,
              avatarVideoPath: data.avatarVideoPath || undefined,
              avatarStatus: data.status === "ready" ? "ready" as const : "generating" as const,
            }
            : s
        )
      )

      if (data.message) {
        console.log(data.message)
      }
    } catch (error) {
      console.error("Avatar upload error:", error)
      setSlides((prev) =>
        prev.map((s) => (s.id === id ? { ...s, avatarStatus: "none" as const } : s))
      )
      alert(`アバターアップロードエラー: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }, [slides, projectId])

  const handleAvatarRemove = useCallback((id: string) => {
    setSlides((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
            ...s,
            avatarImageUrl: undefined,
            avatarVideoUrl: undefined,
            avatarVideoPath: undefined,
            avatarStatus: "none" as const,
          }
          : s
      )
    )
  }, [])

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header
        slidesCount={slides.length}
        hasGeneratedAudio={slides.some((s) => s.audioStatus === "generated")}
        onExport={handleExport}
        onClear={handleClearProject}
        isExporting={isExporting}
        exportProgress={exportProgress}
      />

      <div className="flex flex-1 flex-row-reverse overflow-hidden">
        {/* Right Sidebar - Control Panel */}
        <ControlPanel
          globalSettings={globalSettings}
          onGlobalSettingsChange={setGlobalSettings}
          onAnalyze={handleAnalyze}
          onApplyGlobalSettings={handleApplyGlobalSettings}
          isProcessing={isProcessing}
        />

        {/* Left Main Area - Slide Editor */}
        <SlideEditor
          slides={slides}
          globalVoiceId={globalSettings.voiceId}
          playingSlideId={playingSlideId}
          onSlideUpdate={handleSlideUpdate}
          onGenerateAudio={handleGenerateAudio}
          onPlayAudio={handlePlayAudio}
          onStopAudio={handleStopAudio}
          onReorderSlides={handleReorderSlides}
          onRewriteScript={handleRewriteScript}
          onAvatarUpload={handleAvatarUpload}
          onAvatarRemove={handleAvatarRemove}
        />
      </div>
    </div>
  )
}
