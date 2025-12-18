import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { prompt, inputFormat = 'text', outputFormat = 'text' } = await req.json();
        const apiKey = process.env.OPENAI_API_KEY;

        console.log("OpenAI Request:", {
            hasKey: !!apiKey,
            keyLength: apiKey?.length,
            promptLength: prompt?.length,
            inputFormat,
            outputFormat
        });

        if (!apiKey) {
            return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
        }

        const openai = new OpenAI({ apiKey });

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an expert prompt engineer. Optimize the user's prompt for LLM consumption.
                    Input Format: ${inputFormat.toUpperCase()}
                    Desired Output Format: ${outputFormat.toUpperCase()}
                    
                    Return ONLY the optimized prompt content strictly in ${outputFormat.toUpperCase()} format. No preamble or explanations.`
                },
                { role: "user", content: `Original Prompt (${inputFormat.toUpperCase()}): ${prompt}` }
            ],
            temperature: 0.7,
        });

        const optimizedPrompt = response.choices[0].message.content?.trim();
        const usage = response.usage;

        return NextResponse.json({
            optimizedPrompt,
            usage
        });
    } catch (error: any) {
        console.error("OpenAI optimization error:", error);
        const errorMessage = error?.error?.message || error?.message || "Failed to optimize with OpenAI";
        return NextResponse.json({ error: errorMessage }, { status: error?.status || 500 });
    }
}
