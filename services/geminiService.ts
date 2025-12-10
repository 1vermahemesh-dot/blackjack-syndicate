import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

let ai: GoogleGenAI | null = null;
if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
}

export const getBlackjackAdvice = async (
    playerHand: string[], 
    dealerUpCard: string,
    currentScore: number
): Promise<string> => {
    if (!ai) {
        return "Oracle disconnected. (Check API Key)";
    }

    try {
        const prompt = `
        You are a Blackjack grandmaster. 
        The player has cards: ${playerHand.join(', ')}.
        The player's current score is: ${currentScore}.
        The dealer is showing: ${dealerUpCard}.
        
        Analyze the odds mathematically. 
        Should the player HIT, STAND, or DOUBLE?
        Provide the best move and a 1-sentence witty reason based on probability.
        Keep it under 20 words.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text ? response.text.trim() : "The cards remain silent.";
    } catch (error) {
        console.error("Gemini Error:", error);
        return "The Oracle is clouded... (API Error)";
    }
};

export const generateFactionImage = async (
    themeName: string, 
    color: string, 
    icon: string
): Promise<string | null> => {
    if (!ai) return null;

    try {
        // Construct a prompt for a cool, game-ready button/emblem asset
        const prompt = `
            Design a high-quality, 3D glossy circular emblem for a futuristic cyberpunk faction named "${themeName}".
            The primary color is ${color}.
            The central symbol is a stylized "${icon}".
            Art style: Neon, glowing, glassmorphism, highly detailed, sci-fi, centered composition.
            Background: Dark void or black, ensuring the emblem pops.
            This image will be used as a button icon in a dark UI.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
        });

        // Extract image part
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:image/png;base64,${part.inlineData.data}`;
                }
            }
        }
        return null;
    } catch (error) {
        console.error("Gemini Image Gen Error:", error);
        return null;
    }
};