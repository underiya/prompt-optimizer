import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { prompt, inputFormat = 'text', outputFormat = 'text' } = await req.json();
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

        console.log("Gemini Request:", {
            hasKey: !!apiKey,
            keyLength: apiKey?.length,
            promptLength: prompt?.length,
            inputFormat,
            outputFormat
        });

        if (!apiKey) {
            return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        // Using gemini-2.5-flash as the current stable version (Dec 2025)
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const systemInstruction = `You are an expert prompt engineer. Your task is to optimize the provided user prompt.
        
        Input Format: ${inputFormat.toUpperCase()}
        Desired Output Format: ${outputFormat.toUpperCase()}

        Guidelines:
        1. Clarity & Precision: Remove all ambiguity and fluff.
        2. Effectiveness: Ensure the result is optimized for LLMs.
        3. Structure: Output the result STRICTLY in ${outputFormat.toUpperCase()} format.
        4. No Filler: Return ONLY the optimized prompt content. No preamble, labels, or additional text.`;

        const result = await model.generateContent([systemInstruction, `Original Prompt (${inputFormat.toUpperCase()}): ${prompt}\n\nOptimized Prompt (${outputFormat.toUpperCase()}):`]);
        const response = result.response;
        const optimizedPrompt = response.text().trim();
        const usage = response.usageMetadata;

        return NextResponse.json({
            optimizedPrompt,
            usage
        });
    } catch (error: any) {
        console.error("Gemini optimization error:", error);
        const errorMessage = error?.message || "Failed to optimize with Gemini";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
