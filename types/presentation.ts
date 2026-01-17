export interface SlideData {
  id: string
  slideNumber: number
  imageUrl: string
  imagePath?: string // Server-side path for export
  text: string
  speed: number
  intonation: number
  audioStatus: "not_generated" | "generating" | "generated"
  audioUrl?: string
  audioPath?: string // Server-side path for export
  actingInstruction?: string
  voiceId?: string // Override global voice setting per slide
  // Avatar/Lip-sync fields
  avatarImageUrl?: string      // キャラクター静止画URL
  avatarVideoUrl?: string      // リップシンク動画URL
  avatarVideoPath?: string     // サーバーサイドパス
  avatarStatus?: "none" | "uploading" | "generating" | "ready"
}

export interface GlobalSettings {
  voiceId: string
  speed: number
}

export interface WipeSettings {
  diameter: number      // デフォルト280
  positionX: number     // 左下からのX（デフォルト40）
  positionY: number     // 左下からのY（デフォルト40）
  borderWidth: number   // デフォルト8
  borderColor: string   // デフォルト#FFFFFF
}

export interface ProjectData {
  projectId: string
  projectDir: string
  scenes: SlideData[]
  globalSettings: GlobalSettings
  wipeSettings?: WipeSettings
  createdAt: string
  updatedAt: string
}

export interface AnalyzeResponse {
  projectId: string
  projectDir: string
  scenes: Array<{
    slideNumber: number
    imageUrl: string
    script: string
  }>
}

export interface TtsResponse {
  audioUrl: string
  audioPath: string
}

export interface ExportResponse {
  videoUrl: string
  videoPath: string
}

export interface LipsyncResponse {
  success: boolean
  avatarImageUrl: string
  avatarVideoUrl: string | null
  avatarVideoPath: string | null
  status: "pending" | "ready"
  message?: string
}
