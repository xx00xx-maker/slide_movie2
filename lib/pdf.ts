import { spawn } from "child_process"
import { promises as fs } from "fs"
import path from "path"

/**
 * Convert PDF pages to images using pdftoppm (poppler-utils)
 * This avoids the browser-dependent pdfjs issues in Node.js
 */
export async function pdfToImages(
    pdfPath: string,
    outputDir: string,
    dpi: number = 150
): Promise<string[]> {
    await fs.mkdir(outputDir, { recursive: true })

    const outputPrefix = path.join(outputDir, "slide")

    return new Promise((resolve, reject) => {
        // Use pdftoppm from poppler-utils
        const pdftoppm = spawn("pdftoppm", [
            "-png",
            "-r", dpi.toString(),
            pdfPath,
            outputPrefix
        ])

        let stderr = ""
        pdftoppm.stderr.on("data", (data) => {
            stderr += data.toString()
        })

        pdftoppm.on("close", async (code) => {
            if (code !== 0) {
                reject(new Error(`pdftoppm failed: ${stderr}`))
                return
            }

            try {
                // Find generated files
                const files = await fs.readdir(outputDir)
                const imagePaths = files
                    .filter((f) => f.startsWith("slide") && f.endsWith(".png"))
                    .sort()
                    .map((f) => path.join(outputDir, f))

                resolve(imagePaths)
            } catch (error) {
                reject(error)
            }
        })

        pdftoppm.on("error", (error) => {
            reject(new Error(`Failed to run pdftoppm: ${error.message}. Install with: brew install poppler`))
        })
    })
}

/**
 * Get PDF page count using pdfinfo
 */
export async function getPdfPageCount(pdfPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
        const pdfinfo = spawn("pdfinfo", [pdfPath])

        let stdout = ""
        let stderr = ""

        pdfinfo.stdout.on("data", (data) => {
            stdout += data.toString()
        })

        pdfinfo.stderr.on("data", (data) => {
            stderr += data.toString()
        })

        pdfinfo.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(`pdfinfo failed: ${stderr}`))
                return
            }

            const match = stdout.match(/Pages:\s*(\d+)/)
            if (match) {
                resolve(parseInt(match[1], 10))
            } else {
                reject(new Error("Could not parse page count"))
            }
        })

        pdfinfo.on("error", (error) => {
            reject(new Error(`Failed to run pdfinfo: ${error.message}. Install with: brew install poppler`))
        })
    })
}

/**
 * Check if poppler-utils is available
 */
export async function checkPopplerAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
        const pdftoppm = spawn("pdftoppm", ["-v"])
        pdftoppm.on("close", (code) => {
            resolve(code === 0)
        })
        pdftoppm.on("error", () => {
            resolve(false)
        })
    })
}

/**
 * Save uploaded PDF to temp file
 */
export async function savePdfToTemp(
    pdfBuffer: ArrayBuffer,
    projectDir: string
): Promise<string> {
    const pdfPath = path.join(projectDir, "source.pdf")
    await fs.writeFile(pdfPath, Buffer.from(pdfBuffer))
    return pdfPath
}
