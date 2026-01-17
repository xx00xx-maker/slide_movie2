"use client"

import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Upload, User, Loader2, Video, Trash2 } from "lucide-react"

interface AvatarUploadProps {
    avatarImageUrl?: string
    avatarVideoUrl?: string
    avatarStatus?: "none" | "uploading" | "generating" | "ready"
    slideId: string
    audioPath?: string
    onUpload: (file: File) => void
    onRemove: () => void
    disabled?: boolean
}

export function AvatarUpload({
    avatarImageUrl,
    avatarVideoUrl,
    avatarStatus = "none",
    slideId,
    audioPath,
    onUpload,
    onRemove,
    disabled = false,
}: AvatarUploadProps) {
    const [isDragOver, setIsDragOver] = useState(false)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            setIsDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file && file.type.startsWith("image/")) {
                onUpload(file)
            }
        },
        [onUpload]
    )

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(true)
    }, [])

    const handleDragLeave = useCallback(() => {
        setIsDragOver(false)
    }, [])

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0]
            if (file) {
                onUpload(file)
            }
        },
        [onUpload]
    )

    const handleClick = useCallback(() => {
        fileInputRef.current?.click()
    }, [])

    // ステータスに応じた表示
    const renderContent = () => {
        switch (avatarStatus) {
            case "uploading":
                return (
                    <div className="flex flex-col items-center justify-center gap-1">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">アップロード中...</span>
                    </div>
                )

            case "generating":
                return (
                    <div className="flex flex-col items-center justify-center gap-1">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">リップシンク生成中...</span>
                    </div>
                )

            case "ready":
                return (
                    <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                        <DialogTrigger asChild>
                            <div className="relative w-full h-full cursor-pointer group">
                                {avatarVideoUrl ? (
                                    <video
                                        src={avatarVideoUrl}
                                        className="w-full h-full object-cover rounded-full"
                                        loop
                                        muted
                                        playsInline
                                        autoPlay
                                    />
                                ) : (
                                    <img
                                        src={avatarImageUrl}
                                        alt="Avatar"
                                        className="w-full h-full object-cover rounded-full"
                                    />
                                )}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors rounded-full">
                                    <Video className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle>アバタープレビュー</DialogTitle>
                            </DialogHeader>
                            <div className="aspect-square rounded-full overflow-hidden mx-auto w-64">
                                {avatarVideoUrl ? (
                                    <video
                                        src={avatarVideoUrl}
                                        className="w-full h-full object-cover"
                                        controls
                                        loop
                                        autoPlay
                                    />
                                ) : (
                                    <img
                                        src={avatarImageUrl}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </div>
                            <div className="flex justify-center gap-2 mt-4">
                                <Button variant="destructive" size="sm" onClick={onRemove}>
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    削除
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )

            default:
                return (
                    <div
                        className={`flex flex-col items-center justify-center gap-1 cursor-pointer ${isDragOver ? "scale-105" : ""
                            } transition-transform`}
                        onClick={handleClick}
                    >
                        <User className="h-6 w-6 text-muted-foreground/50" />
                        <span className="text-[10px] text-muted-foreground/50 text-center leading-tight">
                            キャラクター
                            <br />
                            画像
                        </span>
                    </div>
                )
        }
    }

    return (
        <div
            className={`relative w-16 h-16 rounded-full border-2 transition-colors ${isDragOver
                    ? "border-primary bg-primary/10"
                    : avatarStatus === "ready"
                        ? "border-primary"
                        : "border-dashed border-muted-foreground/30 hover:border-muted-foreground/50"
                } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
            />
            <div className="w-full h-full flex items-center justify-center">
                {renderContent()}
            </div>

            {/* Audio required hint */}
            {avatarStatus === "none" && !audioPath && (
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-muted-foreground">
                    音声生成後に使用可能
                </div>
            )}
        </div>
    )
}
