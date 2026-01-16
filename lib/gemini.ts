import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
]

/**
 * 原稿テキストをスライドごとにマッピングするプロンプト
 */
export async function mapScriptToSlides(
  manuscript: string,
  slideCount: number
): Promise<{ slideNumber: number; script: string }[]> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite",
    safetySettings,
  })

  const prompt = `あなたはプレゼンテーション原稿の解析エキスパートです。
以下の原稿テキストを${slideCount}枚のスライドに分割してマッピングしてください。

原稿に「スライド1:」「スライド2:」などの明示的な区切りがある場合はそれに従ってください。
区切りがない場合は、内容を論理的に${slideCount}個のセクションに分割してください。

必ず以下のJSON形式で出力してください（他のテキストは不要）:
[
  {"slideNumber": 1, "script": "最初のスライドの原稿..."},
  {"slideNumber": 2, "script": "2番目のスライドの原稿..."}
]

原稿テキスト:
${manuscript}`

  const result = await model.generateContent(prompt)
  const response = result.response.text()

  // JSONを抽出
  const jsonMatch = response.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    throw new Error("Failed to parse script mapping response")
  }

  return JSON.parse(jsonMatch[0])
}

/**
 * Gemini TTS APIで音声を生成
 */
export async function generateSpeech(
  text: string,
  options: {
    speed?: number
    intonation?: string
    actingInstruction?: string
    voiceName?: string
  } = {}
): Promise<ArrayBuffer> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-preview-tts",
  })

  // 演技指導を含むプロンプト構築
  let speechPrompt = text
  if (options.actingInstruction) {
    speechPrompt = `【演技指導: ${options.actingInstruction}】\n${text}`
  }
  if (options.intonation === "strong") {
    speechPrompt = `【抑揚を強めに、感情豊かに読んでください】\n${speechPrompt}`
  } else if (options.intonation === "weak") {
    speechPrompt = `【落ち着いた、平坦なトーンで読んでください】\n${speechPrompt}`
  }

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: speechPrompt }] }],
    generationConfig: {
      responseModalities: ["audio"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: options.voiceName || "Aoede",
          },
        },
      },
    },
  } as any)

  // 音声データを取得
  const candidate = result.response.candidates?.[0]
  if (!candidate?.content?.parts?.[0]) {
    throw new Error("No audio data in response")
  }

  const part = candidate.content.parts[0] as any
  if (!part.inlineData?.data) {
    throw new Error("No inline audio data found")
  }

  // Base64デコード
  const audioData = Buffer.from(part.inlineData.data, "base64")
  return audioData.buffer
}

/**
 * AIリライト機能: 原稿を最適化
 */
export async function rewriteScript(
  originalScript: string,
  context?: string
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite",
    safetySettings,
  })

  const prompt = `あなたはプレゼンテーション原稿のライターです。
以下の原稿を、より聞きやすく、プレゼンテーションに適した形に書き換えてください。

要件:
- 話し言葉で自然に聞こえるように
- 適度な長さ（30秒〜1分程度で読める長さ）
- 要点を明確に
${context ? `- 文脈: ${context}` : ""}

元の原稿:
${originalScript}

書き換えた原稿（原稿本文のみ出力してください）:`

  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}
