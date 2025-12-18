import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { originalPrompt, optimizedPrompt } = await req.json();
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const [originalRes, optimizedRes, analysisRes] = await Promise.all([
            model.generateContent(`Execute this prompt and provide a sample response: ${originalPrompt}`),
            model.generateContent(`Execute this prompt and provide a sample response: ${optimizedPrompt}`),
            model.generateContent(`
            Compare the following two prompts.
            Original: "${originalPrompt}"
            Optimized: "${optimizedPrompt}"
            
            Evaluate them on these specific criteria for a professional comparison table:
            1. **Tokens**: Estimated token usage for both (qualitative comparison).
            2. **Clarity**: Score (1-10) for both.
            3. **Precision**: Score (1-10) for both.
            4. **Edge Case Handling**: Score (1-10) for both.
            5. **Format Compliance**: How well it follows instructions like "JSON" or "YAML".

            Additionally, perform a **Benchmarking**:
            - Assign a total score (0-100) to both.
            - Explicitly decide a "Winner".
            - Analyze if the prompts would perform differently across formats (JSON vs Text vs YAML).

            Return the response in this exact JSON format:
            {
                "metrics": [
                    { "parameter": "Tokens", "original": "Estimated 120", "optimized": "Estimated 85", "winner": "Optimized" },
                    { "parameter": "Clarity", "original": "6/10", "optimized": "9/10", "winner": "Optimized" },
                    { "parameter": "Precision", "original": "5/10", "optimized": "9.5/10", "winner": "Optimized" },
                    { "parameter": "Edge Case Handling", "original": "4/10", "optimized": "8/10", "winner": "Optimized" },
                    { "parameter": "Format Compliance", "original": "N/A", "optimized": "10/10", "winner": "Optimized" }
                ],
                "benchmark": {
                    "originalScore": 45,
                    "optimizedScore": 85,
                    "winner": "Optimized",
                    "reason": "Why the winner is better...",
                    "formatAnalysis": "How different formats affect this prompt's performance..."
                },
                "summary": "Overall comparison summary..."
            }
        `)
        ]);

        console.log("original Response:", originalRes.response);
        console.log("optimized Response:", optimizedRes.response);
        console.log("analysis Response:", analysisRes.response);
        const analysisText = analysisRes.response.text();
        const jsonStr = analysisText.replace(/```json/g, '').replace(/```/g, '').trim();
        const analysisData = JSON.parse(jsonStr);

        // Inject actual token counts if available
        const originalUsage = originalRes.response.usageMetadata;
        const optimizedUsage = optimizedRes.response.usageMetadata;
        const analysisUsage = analysisRes.response.usageMetadata;

        if (originalUsage || optimizedUsage) {
            const tokenMetric = analysisData.metrics.find((m: any) => m.parameter === "Tokens");
            if (tokenMetric) {
                tokenMetric.original = originalUsage ? `${originalUsage.totalTokenCount} tokens` : "N/A";
                tokenMetric.optimized = optimizedUsage ? `${optimizedUsage.totalTokenCount} tokens` : "N/A";
                tokenMetric.winner = (originalUsage?.totalTokenCount || Infinity) > (optimizedUsage?.totalTokenCount || 0) ? "Optimized" : "Original";
            }
        }

        return NextResponse.json({
            originalResponse: originalRes.response.text(),
            optimizedResponse: optimizedRes.response.text(),
            analysis: analysisData,
            usage: {
                original: originalUsage,
                optimized: optimizedUsage,
                analysis: analysisUsage
            }
        });

    } catch (error: any) {
        console.error("Evaluation error:", error);
        return NextResponse.json({ error: "Failed to evaluate prompts: " + error.message }, { status: 500 });
    }
}
