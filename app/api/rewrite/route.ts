import { NextRequest, NextResponse } from "next/server"
import { rewriteScript } from "@/lib/gemini"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { script, context } = body

        if (!script) {
            return NextResponse.json(
                { error: "Script is required" },
                { status: 400 }
            )
        }

        const rewrittenScript = await rewriteScript(script, context)

        return NextResponse.json({
            script: rewrittenScript,
        })
    } catch (error) {
        console.error("Rewrite error:", error)
        return NextResponse.json(
            { error: "Rewrite failed", details: String(error) },
            { status: 500 }
        )
    }
}
