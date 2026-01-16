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
        const fileName = path.basename(filePath)

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": "video/mp4",
                "Content-Disposition": `attachment; filename="${fileName}"`,
                "Cache-Control": "no-cache",
            },
        })
    } catch (error) {
        console.error("Video serve error:", error)
        return NextResponse.json(
            { error: "Failed to serve video" },
            { status: 500 }
        )
    }
}
