import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import os from "os"

/**
 * リップシンク動画生成API
 * 
 * POST /api/lipsync
 * Body: FormData with:
 *   - avatarImage: キャラクター画像ファイル
 *   - slideId: スライドID
 *   - projectId: プロジェクトID
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const avatarImage = formData.get("avatarImage") as File | null
        const slideId = formData.get("slideId") as string
        const projectId = formData.get("projectId") as string
        const audioPath = formData.get("audioPath") as string

        if (!avatarImage) {
            return NextResponse.json(
                { error: "Avatar image is required" },
                { status: 400 }
            )
        }

        if (!audioPath) {
            return NextResponse.json(
                { error: "Audio path is required (generate audio first)" },
                { status: 400 }
            )
        }

        // アバター画像を保存
        const avatarDir = path.join(
            os.tmpdir(),
            "presentation-maker",
            projectId || "default",
            "avatar"
        )
        await fs.mkdir(avatarDir, { recursive: true })

        const avatarBytes = await avatarImage.arrayBuffer()
        const avatarFileName = `avatar_${slideId}_${Date.now()}.png`
        const avatarPath = path.join(avatarDir, avatarFileName)
        await fs.writeFile(avatarPath, Buffer.from(avatarBytes))

        // Modal APIを呼び出してリップシンク動画を生成
        const modalEndpoint = process.env.MODAL_LIPSYNC_ENDPOINT

        if (!modalEndpoint) {
            // Modal未設定の場合はプレースホルダーレスポンス
            return NextResponse.json({
                success: true,
                avatarImageUrl: `/api/images?path=${encodeURIComponent(avatarPath)}`,
                avatarVideoUrl: null, // Modal未設定
                avatarVideoPath: null,
                status: "pending",
                message: "Modal endpoint not configured. Set MODAL_LIPSYNC_ENDPOINT in .env.local",
            })
        }

        // 音声ファイルを読み込み
        const audioBuffer = await fs.readFile(audioPath)

        // Modal APIコール
        const modalFormData = new FormData()
        modalFormData.append("source_image", new Blob([avatarBytes]))
        modalFormData.append("driving_audio", new Blob([audioBuffer]))
        modalFormData.append("output_format", "webm") // ブラウザ互換

        const modalResponse = await fetch(modalEndpoint, {
            method: "POST",
            body: modalFormData,
        })

        if (!modalResponse.ok) {
            throw new Error(`Modal API error: ${modalResponse.statusText}`)
        }

        const videoBuffer = await modalResponse.arrayBuffer()

        // 動画を保存
        const videoFileName = `lipsync_${slideId}_${Date.now()}.webm`
        const videoPath = path.join(avatarDir, videoFileName)
        await fs.writeFile(videoPath, Buffer.from(videoBuffer))

        return NextResponse.json({
            success: true,
            avatarImageUrl: `/api/images?path=${encodeURIComponent(avatarPath)}`,
            avatarVideoUrl: `/api/video?path=${encodeURIComponent(videoPath)}`,
            avatarVideoPath: videoPath,
            status: "ready",
        })
    } catch (error) {
        console.error("Lipsync error:", error)
        return NextResponse.json(
            { error: "Lipsync generation failed", details: String(error) },
            { status: 500 }
        )
    }
}
