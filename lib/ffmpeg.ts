import { spawn } from "child_process"
import { promises as fs } from "fs"
import path from "path"

interface VideoInput {
    imagePath: string
    audioPath: string
    duration?: number // seconds, calculated from audio if not provided
}

/**
 * Get audio duration using ffprobe
 */
export async function getAudioDuration(audioPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
        const ffprobe = spawn("ffprobe", [
            "-v", "quiet",
            "-show_entries", "format=duration",
            "-of", "csv=p=0",
            audioPath
        ])

        let stdout = ""
        let stderr = ""

        ffprobe.stdout.on("data", (data) => {
            stdout += data.toString()
        })

        ffprobe.stderr.on("data", (data) => {
            stderr += data.toString()
        })

        ffprobe.on("close", (code) => {
            if (code === 0) {
                const duration = parseFloat(stdout.trim())
                resolve(isNaN(duration) ? 5 : duration)
            } else {
                reject(new Error(`ffprobe failed: ${stderr}`))
            }
        })
    })
}

/**
 * Create a video segment from an image and audio file
 */
export async function createVideoSegment(
    input: VideoInput,
    outputPath: string
): Promise<void> {
    const duration = input.duration ?? await getAudioDuration(input.audioPath)

    return new Promise((resolve, reject) => {
        const ffmpeg = spawn("ffmpeg", [
            "-y",
            "-loop", "1",
            "-i", input.imagePath,
            "-i", input.audioPath,
            "-c:v", "libx264",
            "-tune", "stillimage",
            "-c:a", "aac",
            "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-shortest",
            "-t", duration.toString(),
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
                reject(new Error(`ffmpeg failed: ${stderr}`))
            }
        })
    })
}

/**
 * Concatenate multiple video files into one
 */
export async function concatenateVideos(
    videoPaths: string[],
    outputPath: string,
    tempDir: string
): Promise<void> {
    // Create concat file list
    const concatListPath = path.join(tempDir, "concat_list.txt")
    const concatContent = videoPaths
        .map((p) => `file '${p}'`)
        .join("\n")
    await fs.writeFile(concatListPath, concatContent)

    return new Promise((resolve, reject) => {
        const ffmpeg = spawn("ffmpeg", [
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", concatListPath,
            "-c", "copy",
            outputPath
        ])

        let stderr = ""
        ffmpeg.stderr.on("data", (data) => {
            stderr += data.toString()
        })

        ffmpeg.on("close", async (code) => {
            // Cleanup concat file
            try {
                await fs.unlink(concatListPath)
            } catch {
                // Ignore cleanup errors
            }

            if (code === 0) {
                resolve()
            } else {
                reject(new Error(`ffmpeg concat failed: ${stderr}`))
            }
        })
    })
}

/**
 * Create a full presentation video from multiple slides
 */
export async function createPresentationVideo(
    slides: Array<{
        imagePath: string
        audioPath: string
    }>,
    outputPath: string,
    onProgress?: (current: number, total: number) => void
): Promise<void> {
    const tempDir = path.join(path.dirname(outputPath), ".temp")
    await fs.mkdir(tempDir, { recursive: true })

    const segmentPaths: string[] = []

    try {
        // Create individual video segments
        for (let i = 0; i < slides.length; i++) {
            const slide = slides[i]
            const segmentPath = path.join(tempDir, `segment_${i.toString().padStart(3, "0")}.mp4`)

            await createVideoSegment(
                { imagePath: slide.imagePath, audioPath: slide.audioPath },
                segmentPath
            )

            segmentPaths.push(segmentPath)
            onProgress?.(i + 1, slides.length)
        }

        // Concatenate all segments
        await concatenateVideos(segmentPaths, outputPath, tempDir)
    } finally {
        // Cleanup temp files
        for (const segmentPath of segmentPaths) {
            try {
                await fs.unlink(segmentPath)
            } catch {
                // Ignore cleanup errors
            }
        }
        try {
            await fs.rmdir(tempDir)
        } catch {
            // Ignore cleanup errors
        }
    }
}

/**
 * Check if FFmpeg is available
 */
export async function checkFFmpegAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
        const ffmpeg = spawn("ffmpeg", ["-version"])
        ffmpeg.on("close", (code) => {
            resolve(code === 0)
        })
        ffmpeg.on("error", () => {
            resolve(false)
        })
    })
}
