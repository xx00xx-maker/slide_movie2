import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import os from "os"
import { spawn } from "child_process"
import { generateSpeech } from "@/lib/gemini"

/**
 * Convert raw PCM to WAV format with proper header
 */
function pcmToWav(pcmData: Buffer, sampleRate: number = 24000, channels: number = 1, bitsPerSample: number = 16): Buffer {
    const byteRate = sampleRate * channels * (bitsPerSample / 8)
    const blockAlign = channels * (bitsPerSample / 8)
    const dataSize = pcmData.length
    const headerSize = 44
    const fileSize = headerSize + dataSize - 8

    const header = Buffer.alloc(headerSize)

    // RIFF header
    header.write("RIFF", 0)
    header.writeUInt32LE(fileSize, 4)
    header.write("WAVE", 8)

    // fmt subchunk
    header.write("fmt ", 12)
    header.writeUInt32LE(16, 16) // Subchunk1Size for PCM
    header.writeUInt16LE(1, 20) // AudioFormat (1 = PCM)
    header.writeUInt16LE(channels, 22)
    header.writeUInt32LE(sampleRate, 24)
    header.writeUInt32LE(byteRate, 28)
    header.writeUInt16LE(blockAlign, 32)
    header.writeUInt16LE(bitsPerSample, 34)

    // data subchunk
    header.write("data", 36)
    header.writeUInt32LE(dataSize, 40)

    return Buffer.concat([header, pcmData])
}

/**
 * Convert audio to MP3 using FFmpeg for better browser compatibility
 */
async function convertToMp3(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn("ffmpeg", [
            "-y",
            "-f", "s16le",        // Input format: signed 16-bit little-endian PCM
            "-ar", "24000",        // Sample rate: 24kHz (Gemini TTS default)
            "-ac", "1",            // Channels: mono
            "-i", inputPath,       // Input file
            "-acodec", "libmp3lame",
            "-b:a", "128k",
            outputPath
        ])

        let stderr = ""
        ffmpeg.stderr.on("data", (data) => {
            stderr += data.toString()
        })

        ffmpeg.on("close", (code) => {
            if (code === 0) {
                resolve()
            } else {
                reject(new Error(`FFmpeg failed: ${stderr}`))
            }
        })

        ffmpeg.on("error", (error) => {
            reject(error)
        })
    })
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { text, speed = 1.0, intonation = "normal", actingInstruction, voiceName = "Aoede", projectId } = body

        if (!text) {
            return NextResponse.json(
                { error: "Text is required" },
                { status: 400 }
            )
        }

        // Generate speech using Gemini TTS
        const audioBuffer = await generateSpeech(text, {
            speed,
            intonation,
            actingInstruction,
            voiceName,
        })

        // Save audio file
        const audioDir = path.join(
            os.tmpdir(),
            "presentation-maker",
            projectId || "default",
            "audio"
        )
        await fs.mkdir(audioDir, { recursive: true })

        const timestamp = Date.now()
        const pcmPath = path.join(audioDir, `audio_${timestamp}.pcm`)
        const mp3Path = path.join(audioDir, `audio_${timestamp}.mp3`)

        // Save raw PCM data
        await fs.writeFile(pcmPath, Buffer.from(audioBuffer))

        // Convert to MP3 for browser compatibility
        await convertToMp3(pcmPath, mp3Path)

        // Clean up PCM file
        await fs.unlink(pcmPath).catch(() => { })

        return NextResponse.json({
            audioUrl: `/api/audio?path=${encodeURIComponent(mp3Path)}`,
            audioPath: mp3Path,
        })
    } catch (error) {
        console.error("TTS error:", error)
        return NextResponse.json(
            { error: "TTS generation failed", details: String(error) },
            { status: 500 }
        )
    }
}
