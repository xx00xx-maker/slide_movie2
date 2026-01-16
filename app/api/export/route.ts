import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import os from "os"
import { createPresentationVideo, checkFFmpegAvailable } from "@/lib/ffmpeg"

export async function POST(request: NextRequest) {
    try {
        // Check FFmpeg availability
        const ffmpegAvailable = await checkFFmpegAvailable()
        if (!ffmpegAvailable) {
            return NextResponse.json(
                { error: "FFmpeg is not installed. Please install FFmpeg to export videos." },
                { status: 500 }
            )
        }

        const body = await request.json()
        const { slides, projectId } = body

        if (!slides || !Array.isArray(slides) || slides.length === 0) {
            return NextResponse.json(
                { error: "Slides array is required" },
                { status: 400 }
            )
        }

        // Validate that all slides have image and audio paths
        for (const slide of slides) {
            if (!slide.imagePath || !slide.audioPath) {
                return NextResponse.json(
                    { error: "Each slide must have imagePath and audioPath" },
                    { status: 400 }
                )
            }
        }

        // Create output directory
        const outputDir = path.join(
            os.tmpdir(),
            "presentation-maker",
            projectId || "default",
            "output"
        )
        await fs.mkdir(outputDir, { recursive: true })

        const outputFileName = `presentation_${Date.now()}.mp4`
        const outputPath = path.join(outputDir, outputFileName)

        // Create the video
        await createPresentationVideo(
            slides.map((s: any) => ({
                imagePath: s.imagePath,
                audioPath: s.audioPath,
            })),
            outputPath
        )

        return NextResponse.json({
            videoUrl: `/api/video?path=${encodeURIComponent(outputPath)}`,
            videoPath: outputPath,
        })
    } catch (error) {
        console.error("Export error:", error)
        return NextResponse.json(
            { error: "Video export failed", details: String(error) },
            { status: 500 }
        )
    }
}
