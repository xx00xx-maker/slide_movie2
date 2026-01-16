import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import os from "os"
import { pdfToImages, getPdfPageCount, savePdfToTemp, checkPopplerAvailable } from "@/lib/pdf"
import { mapScriptToSlides } from "@/lib/gemini"

export async function POST(request: NextRequest) {
    try {
        // Check if poppler is available
        const popplerAvailable = await checkPopplerAvailable()

        const formData = await request.formData()
        const pdfFile = formData.get("pdf") as File | null
        const manuscript = formData.get("manuscript") as string | null

        if (!pdfFile && !manuscript) {
            return NextResponse.json(
                { error: "PDF or manuscript is required" },
                { status: 400 }
            )
        }

        // Create temp directory for this project
        const projectId = `project_${Date.now()}`
        const projectDir = path.join(os.tmpdir(), "presentation-maker", projectId)
        const imagesDir = path.join(projectDir, "images")
        await fs.mkdir(imagesDir, { recursive: true })

        let imagePaths: string[] = []
        let slideCount = 0

        // Process PDF if provided
        if (pdfFile && popplerAvailable) {
            const pdfBuffer = await pdfFile.arrayBuffer()
            const pdfPath = await savePdfToTemp(pdfBuffer, projectDir)

            slideCount = await getPdfPageCount(pdfPath)
            imagePaths = await pdfToImages(pdfPath, imagesDir)
        } else if (pdfFile && !popplerAvailable) {
            console.warn("Poppler not available, using placeholder images")
            // Create placeholder response when poppler is not installed
            const pdfBuffer = await pdfFile.arrayBuffer()
            // Estimate page count from file size (rough estimate)
            slideCount = Math.max(1, Math.ceil(pdfBuffer.byteLength / 50000))
        }

        // Map manuscript to slides
        let scenes: Array<{
            slideNumber: number
            imageUrl: string
            imagePath?: string
            script: string
        }> = []

        if (manuscript) {
            const estimatedSlideCount = slideCount || Math.max(
                1,
                manuscript.split(/スライド\s*\d+/i).length - 1 || 3
            )

            try {
                const mappedScripts = await mapScriptToSlides(manuscript, estimatedSlideCount)

                scenes = mappedScripts.map((item, index) => {
                    const actualImagePath = imagePaths[item.slideNumber - 1]
                    return {
                        slideNumber: item.slideNumber,
                        imageUrl: actualImagePath
                            ? `/api/images?path=${encodeURIComponent(actualImagePath)}`
                            : `/placeholder.svg?height=360&width=640&query=slide ${item.slideNumber}`,
                        imagePath: actualImagePath,
                        script: item.script,
                    }
                })
            } catch (error) {
                console.error("Script mapping failed:", error)
                // Fallback: simple split
                const defaultScripts = manuscript.split(/(?=スライド\s*\d+)/i).filter(Boolean)
                scenes = defaultScripts.map((text, index) => {
                    const actualImagePath = imagePaths[index]
                    return {
                        slideNumber: index + 1,
                        imageUrl: actualImagePath
                            ? `/api/images?path=${encodeURIComponent(actualImagePath)}`
                            : `/placeholder.svg?height=360&width=640&query=slide ${index + 1}`,
                        imagePath: actualImagePath,
                        script: text.replace(/^スライド\s*\d+[:\s]*/i, "").trim(),
                    }
                })
            }
        } else {
            // PDF only: create empty scripts
            scenes = imagePaths.map((imagePath, index) => ({
                slideNumber: index + 1,
                imageUrl: `/api/images?path=${encodeURIComponent(imagePath)}`,
                imagePath,
                script: "",
            }))
        }

        return NextResponse.json({
            projectId,
            projectDir,
            scenes,
        })
    } catch (error) {
        console.error("Analyze error:", error)
        return NextResponse.json(
            { error: "Analysis failed", details: String(error) },
            { status: 500 }
        )
    }
}
