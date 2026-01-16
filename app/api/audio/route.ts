import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import { existsSync } from "fs"
import path from "path"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const filePath = searchParams.get("path")

        if (!filePath) {
            return NextResponse.json(
                { error: "Path parameter is required" },
                { status: 400 }
            )
        }

        // Security: ensure path is within temp directory
        if (!filePath.includes("presentation-maker")) {
            return NextResponse.json(
                { error: "Invalid path" },
                { status: 403 }
            )
        }

        if (!existsSync(filePath)) {
            return NextResponse.json(
                { error: "File not found" },
                { status: 404 }
            )
        }

        const fileBuffer = await fs.readFile(filePath)
        const ext = path.extname(filePath).toLowerCase()

        // Determine content type based on file extension
        let contentType = "audio/mpeg" // Default to MP3
        if (ext === ".wav") {
            contentType = "audio/wav"
        } else if (ext === ".mp3") {
            contentType = "audio/mpeg"
        } else if (ext === ".ogg") {
            contentType = "audio/ogg"
        }

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": contentType,
                "Content-Length": fileBuffer.length.toString(),
                "Accept-Ranges": "bytes",
                "Cache-Control": "public, max-age=3600",
            },
        })
    } catch (error) {
        console.error("Audio serve error:", error)
        return NextResponse.json(
            { error: "Failed to serve audio" },
            { status: 500 }
        )
    }
}
