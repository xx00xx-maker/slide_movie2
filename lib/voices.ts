/**
 * Voice type definitions for Gemini TTS
 * Based on research of Gemini 2.5 Flash TTS available voices
 */

export interface VoiceOption {
    id: string
    name: string           // Gemini API voice name
    displayName: string    // User-friendly display name in Japanese
    description: string    // Short description of voice characteristics
    gender: "female" | "male"
    characteristics: string[] // Voice characteristics tags
}

/**
 * Curated list of 6 voices (3 female, 3 male) with distinct characteristics
 * Selected for variety in pitch, tone, and personality
 */
export const VOICE_OPTIONS: VoiceOption[] = [
    // Female voices
    {
        id: "female-soft",
        name: "Achernar",
        displayName: "やさしい女性",
        description: "ソフトで落ち着いた声。柔らかく穏やかな印象",
        gender: "female",
        characteristics: ["ソフト", "落ち着き", "穏やか"],
    },
    {
        id: "female-bright",
        name: "Zephyr",
        displayName: "明るい女性",
        description: "明るく元気な声。はきはきと聞き取りやすい",
        gender: "female",
        characteristics: ["明るい", "元気", "クリア"],
    },
    {
        id: "female-warm",
        name: "Sulafat",
        displayName: "温かい女性",
        description: "温かみのある声。親しみやすく包容力のある印象",
        gender: "female",
        characteristics: ["温かい", "親しみ", "成熟"],
    },
    // Male voices  
    {
        id: "male-calm",
        name: "Charon",
        displayName: "落ち着いた男性",
        description: "落ち着いた説明調の声。信頼感のある印象",
        gender: "male",
        characteristics: ["落ち着き", "説明調", "信頼感"],
    },
    {
        id: "male-energetic",
        name: "Puck",
        displayName: "元気な男性",
        description: "明るく元気な声。親しみやすく軽快な印象",
        gender: "male",
        characteristics: ["元気", "親しみ", "軽快"],
    },
    {
        id: "male-deep",
        name: "Zubenelgenubi",
        displayName: "深みのある男性",
        description: "低音で重厚な声。権威性と説得力のある印象",
        gender: "male",
        characteristics: ["低音", "重厚", "権威"],
    },
]

/**
 * Get voice option by ID
 */
export function getVoiceById(id: string): VoiceOption | undefined {
    return VOICE_OPTIONS.find((v) => v.id === id)
}

/**
 * Get voice option by Gemini API name
 */
export function getVoiceByName(name: string): VoiceOption | undefined {
    return VOICE_OPTIONS.find((v) => v.name === name)
}

/**
 * Get default voice
 */
export function getDefaultVoice(): VoiceOption {
    return VOICE_OPTIONS[0] // Achernar (soft female)
}

/**
 * Get voices by gender
 */
export function getVoicesByGender(gender: "female" | "male"): VoiceOption[] {
    return VOICE_OPTIONS.filter((v) => v.gender === gender)
}
