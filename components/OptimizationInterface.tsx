"use client";

import { useState } from "react";
import { Copy, Sparkles, Wand2, Check, AlertCircle, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function OptimizationInterface() {
    const [prompt, setPrompt] = useState("");
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [evaluatingModel, setEvaluatingModel] = useState<string | null>(null);
    const [selectedModels, setSelectedModels] = useState({ gemini: true, openai: true });
    const [inputFormat, setInputFormat] = useState("text");
    const [outputFormat, setOutputFormat] = useState("text");
    const [evaluationError, setEvaluationError] = useState<string | null>(null);

    // Results structure
    type MetricRow = { parameter: string, original: string, optimized: string, winner: string };
    type Benchmark = { originalScore: number, optimizedScore: number, winner: string, reason: string, formatAnalysis: string };
    type ResultType = {
        optimized?: string,
        error?: string,
        usage?: any,
        evaluationUsage?: any,
        analysis?: {
            originalResponse: string,
            optimizedResponse: string,
            metrics: MetricRow[],
            benchmark: Benchmark,
            summary: string
        }
    };

    const [results, setResults] = useState<{ gemini?: ResultType; openai?: ResultType; error?: string } | null>(null);

    const handleOptimize = async () => {
        if (!prompt.trim()) return;
        setIsOptimizing(true);
        setResults(null);
        setEvaluationError(null);

        try {
            const promises = [];
            const newResults: any = {};

            if (selectedModels.gemini) {
                promises.push(
                    fetch("/api/optimize/gemini", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ prompt, inputFormat, outputFormat })
                    })
                        .then(r => r.json())
                        .then(data => { newResults.gemini = { optimized: data.optimizedPrompt, usage: data.usage, error: data.error }; })
                        .catch(e => { newResults.gemini = { error: e.message || "Failed" }; })
                );
            }

            if (selectedModels.openai) {
                promises.push(
                    fetch("/api/optimize/openai", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ prompt, inputFormat, outputFormat })
                    })
                        .then(r => r.json())
                        .then(data => { newResults.openai = { optimized: data.optimizedPrompt, usage: data.usage, error: data.error }; })
                        .catch(e => { newResults.openai = { error: e.message || "Failed" }; })
                );
            }

            await Promise.all(promises);
            setResults(newResults);

        } catch (e) {
            setResults({ error: "Something went wrong." });
        } finally {
            setIsOptimizing(false);
        }
    };

    const handleEvaluate = async (modelKey: 'gemini' | 'openai') => {
        const optimized = results?.[modelKey]?.optimized;
        const original = prompt;
        if (!optimized || !original) return;

        setEvaluatingModel(modelKey);
        setEvaluationError(null);
        try {
            const r = await fetch("/api/evaluate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ originalPrompt: original, optimizedPrompt: optimized })
            });

            if (!r.ok) {
                const errData = await r.json().catch(() => ({}));
                throw new Error(errData.error || `Evaluation failed (${r.status}). Please check API usage.`);
            }

            const data = await r.json();

            if (data.analysis) {
                setResults(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        [modelKey]: {
                            ...prev[modelKey],
                            evaluationUsage: data.usage,
                            analysis: {
                                originalResponse: data.originalResponse,
                                optimizedResponse: data.optimizedResponse,
                                metrics: data.analysis.metrics,
                                benchmark: data.analysis.benchmark,
                                summary: data.analysis.summary
                            }
                        }
                    }
                });
            } else {
                throw new Error("Analysis data missing in response");
            }

        } catch (e: any) {
            console.error("Evaluation Error:", e);
            setEvaluationError(e.message || "Connection timed out. Gemini API might be busy.");
        } finally {
            setEvaluatingModel(null);
        }
    }

    const resetAll = () => {
        setPrompt("");
        setResults(null);
        setEvaluationError(null);
    }

    return (
        <div className="w-full max-w-6xl mx-auto px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
            >
                <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
                    Prompt <span className="gradient-text">Optimizer</span>
                </h1>
                <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
                    Advanced prompt engineering for Gemini & GPT-4o.
                </p>
            </motion.div>

            {/* Input Section */}
            <div className="glass-panel rounded-2xl p-6 md:p-8 mb-8 backdrop-blur-xl bg-black/40 border-white/10 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500/50 via-purple-500/50 to-pink-500/50 opacity-50" />

                <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-white/40 uppercase font-bold tracking-widest">Input</span>
                            {prompt && (
                                <button onClick={resetAll} className="text-white/20 hover:text-red-400 transition-colors p-1" title="Clear All">
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                        <div className="flex gap-4 items-center">
                            <span className="text-[10px] text-white/30 uppercase font-bold">Input Format:</span>
                            <div className="flex gap-1 bg-white/5 p-1 rounded-md border border-white/10">
                                {['text', 'json', 'yaml'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setInputFormat(f)}
                                        className={cn("px-2 py-0.5 text-[10px] rounded transition-all uppercase font-bold", inputFormat === f ? "bg-white/20 text-white" : "text-white/40 hover:text-white/60")}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Paste your prompt here..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-6 text-white text-lg placeholder:text-neutral-700 resize-none min-h-[180px] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-light"
                    />

                    <div className="flex justify-between items-center px-1">
                        <button
                            onClick={() => setPrompt(`I need a python script that can scrape a specific e-commerce website. It needs to log in using a username and password (which should be variables). Then it should go to the 'electronics' category, filter by 'price high to low', and scroll down to load at least 50 items. For each item, I want the title, price, usage rating, and the link to the image. It should save all of this into a CSV file named with the current date. Also, it needs to be able to handle if the internet goes down, so maybe some retry logic? And please make sure it uses Selenium because I suspect the site uses a lot of JavaScript. Oh, and adding a random delay between clicks would be good to avoid getting banned. The code should be clean and have comments explaining what each part does.`)}
                            className="text-xs text-indigo-400/60 hover:text-indigo-400 transition-colors flex items-center gap-1 group"
                        >
                            <Sparkles className="w-3 h-3 group-hover:animate-pulse" /> Try Long Sample
                        </button>
                        <span className="text-[10px] text-neutral-600 font-mono italic">{prompt.length} chars</span>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center mt-4 gap-6 pt-6 border-t border-white/5">
                        <div className="flex flex-wrap items-center gap-8">
                            <div className="flex gap-6">
                                <label className="flex items-center space-x-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={selectedModels.gemini}
                                        onChange={e => setSelectedModels(p => ({ ...p, gemini: e.target.checked }))}
                                        className="w-5 h-5 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-black"
                                    />
                                    <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">Gemini 2.5</span>
                                </label>
                                <label className="flex items-center space-x-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={selectedModels.openai}
                                        onChange={e => setSelectedModels(p => ({ ...p, openai: e.target.checked }))}
                                        className="w-5 h-5 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500 focus:ring-offset-black"
                                    />
                                    <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">GPT-4o</span>
                                </label>
                            </div>

                            <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                                <span className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Output Format:</span>
                                <div className="flex gap-2">
                                    {['text', 'json', 'yaml'].map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setOutputFormat(f)}
                                            className={cn("px-3 py-1 text-xs rounded-lg transition-all uppercase font-bold border",
                                                outputFormat === f ? "bg-indigo-500 border-indigo-400 text-white shadow-lg" : "border-white/5 text-white/40 hover:text-white/60 hover:bg-white/5")}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleOptimize}
                            disabled={isOptimizing || !prompt.trim() || (!selectedModels.gemini && !selectedModels.openai)}
                            className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-xl bg-white px-10 font-bold text-neutral-950 transition-all duration-300 hover:bg-neutral-100 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-xl"
                        >
                            {isOptimizing ? (
                                <Sparkles className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <Wand2 className="mr-2 h-5 w-5 transition-transform group-hover:rotate-12" />
                            )}
                            <span>{isOptimizing ? "Optimizing..." : "Optimize Prompt"}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Results Section */}
            <AnimatePresence>
                <div className="flex flex-col gap-12 mt-12">
                    {results?.gemini && selectedModels.gemini && (
                        <ResultCard
                            modelId="gemini"
                            modelName="Gemini 2.5 Flash"
                            result={results.gemini}
                            onEvaluate={() => handleEvaluate('gemini')}
                            isEvaluating={evaluatingModel === 'gemini'}
                            evaluationError={evaluationError}
                        />
                    )}
                    {results?.openai && selectedModels.openai && (
                        <ResultCard
                            modelId="openai"
                            modelName="GPT-4o"
                            result={results.openai}
                            onEvaluate={() => handleEvaluate('openai')}
                            isEvaluating={evaluatingModel === 'openai'}
                            evaluationError={evaluationError}
                        />
                    )}
                </div>

                {results?.error && !results.gemini && !results.openai && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center text-red-400 max-w-md mx-auto"
                    >
                        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-bold mb-2">Error</h3>
                        <p className="text-sm opacity-80">{results.error}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ResultCard({ modelId, modelName, result, onEvaluate, isEvaluating, evaluationError }: {
    modelId: string,
    modelName: string,
    result: any,
    onEvaluate: () => void,
    isEvaluating: boolean,
    evaluationError: string | null
}) {
    const [copied, setCopied] = useState(false);
    const isError = !!result.error;
    const content = result.optimized || result.error;

    const handleCopy = () => {
        if (!content) return;
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("glass-panel p-8 rounded-2xl relative group transition-all duration-500", isError ? "border-red-500/20 bg-red-500/5" : "hover:border-white/20 bg-white/2 border-white/5")}
        >
            <div className="flex justify-between items-start mb-8 pb-6 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <div className={cn("h-3 w-3 rounded-full", isError ? "bg-red-500" : "bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)] animate-pulse")} />
                    <h3 className="font-bold text-2xl text-white/95 tracking-tight">{modelName}</h3>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <div className="flex gap-4">
                        {result.usage && (
                            <div className="flex flex-col items-end justify-center px-4 py-1.5 bg-white/5 rounded-xl border border-white/10">
                                <span className="text-[9px] text-white/30 uppercase font-black">Optimization Cost</span>
                                <span className="text-[11px] text-indigo-400 font-mono font-bold">
                                    {(result.usage.totalTokenCount || result.usage.total_tokens) || 0} tokens
                                </span>
                            </div>
                        )}
                        {!isError && !result.analysis && (
                            <button
                                onClick={onEvaluate}
                                disabled={isEvaluating}
                                className="text-sm px-6 py-2.5 rounded-xl bg-indigo-500 font-bold hover:bg-indigo-400 text-white transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                            >
                                {isEvaluating ? <Sparkles className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                {isEvaluating ? "Analyzing..." : "Analyze Comparison"}
                            </button>
                        )}
                        {!isError && (
                            <button onClick={handleCopy} className="text-white/40 hover:text-white transition-all px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-2 text-sm">
                                {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                                {copied ? "Copied" : "Copy Prompt"}
                            </button>
                        )}
                    </div>
                    {evaluationError && isEvaluating && (
                        <div className="flex items-center gap-2 text-red-400 text-[10px] font-bold uppercase py-1 px-3 bg-red-500/10 rounded-lg border border-red-500/20">
                            <AlertCircle className="w-3 h-3" /> {evaluationError}
                        </div>
                    )}
                </div>
            </div>

            <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-white/30">Optimized Prompt</span>
                    <span className="text-[10px] text-white/20 font-mono italic">Ready for use</span>
                </div>
                <div className="bg-black/60 p-8 rounded-2xl border border-white/5 shadow-inner">
                    <pre className="whitespace-pre-wrap text-white leading-relaxed text-base font-mono">
                        {content || "Generating prompt..."}
                    </pre>
                </div>
            </div>

            {result.evaluationUsage && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <TokenStat label="Eval Prompt Tokens" value={result.evaluationUsage.optimized?.promptTokenCount || result.evaluationUsage.optimized?.prompt_tokens} />
                    <TokenStat label="Eval Resp Tokens" value={result.evaluationUsage.optimized?.candidatesTokenCount || result.evaluationUsage.optimized?.completion_tokens} />
                    <TokenStat label="Total Eval Tokens" value={result.evaluationUsage.optimized?.totalTokenCount || result.evaluationUsage.optimized?.total_tokens} />
                    <div className="bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20">
                        <span className="text-[9px] uppercase font-black text-indigo-300 block mb-1 opacity-70">Provider</span>
                        <span className="text-xs font-mono text-white truncate">{modelId.toUpperCase()}</span>
                    </div>
                </div>
            )}

            {result.analysis && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-12 mt-12 pt-12 border-t border-indigo-500/20"
                >
                    {/* Benchmarking Summary */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 p-8 rounded-2xl border border-white/10 shadow-xl">
                        <div>
                            <h4 className="text-xs uppercase tracking-widest text-indigo-400 font-bold mb-3">Benchmarking Performance</h4>
                            <div className="flex items-baseline gap-4">
                                <span className="text-5xl font-black text-white">{result.analysis.benchmark.optimizedScore}</span>
                                <div className="flex flex-col">
                                    <span className="text-white/30 text-[10px] uppercase font-bold">Optimized Pts</span>
                                    <span className="text-white/20 text-xs">vs {result.analysis.benchmark.originalScore} Original</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] uppercase font-bold text-white/30 mb-3 tracking-widest">Efficiency Winner</span>
                            <div className={cn("px-8 py-3 rounded-2xl text-base font-black tracking-widest border-2 shadow-2xl transition-all",
                                result.analysis.benchmark.winner === "Optimized" ? "bg-green-500/10 border-green-500/40 text-green-400" : "bg-yellow-500/10 border-yellow-500/40 text-yellow-500")}>
                                {result.analysis.benchmark.winner.toUpperCase()}
                            </div>
                        </div>
                    </div>

                    {/* Comparison Table */}
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                                <Wand2 className="w-3 h-3 text-indigo-400" /> Metric Comparison Table
                            </h4>
                        </div>
                        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-2xl">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white/5 border-b border-white/10">
                                        <th className="p-5 text-[10px] uppercase font-bold text-white/40 tracking-wider">Metric</th>
                                        <th className="p-5 text-[10px] uppercase font-bold text-white/40 tracking-wider">Original Prompt</th>
                                        <th className="p-5 text-[10px] uppercase font-bold text-white/40 tracking-wider">Optimized Prompt</th>
                                        <th className="p-5 text-center text-[10px] uppercase font-bold text-white/40 tracking-wider">Winner</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.analysis.metrics.map((row: any, i: number) => (
                                        <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-all">
                                            <td className="p-5 text-sm font-bold text-indigo-300/60">{row.parameter}</td>
                                            <td className="p-5 text-sm text-white/30 italic font-light">{row.original}</td>
                                            <td className="p-5 text-sm text-white leading-relaxed">{row.optimized}</td>
                                            <td className="p-5 text-center">
                                                <div className={cn("inline-flex items-center justify-center min-w-[70px] py-1 rounded-full text-[9px] font-black uppercase tracking-tighter",
                                                    row.winner === "Optimized" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20")}>
                                                    {row.winner.slice(0, 3)}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Reasoning */}
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
                                <h5 className="text-[10px] uppercase font-bold text-white/20 mb-4 tracking-widest">Logic Comparison Summary</h5>
                                <p className="text-sm text-white/80 leading-relaxed font-light">{result.analysis.summary}</p>
                            </div>
                            <div className="bg-indigo-500/5 p-8 rounded-3xl border border-indigo-500/20">
                                <h5 className="text-[10px] uppercase font-bold text-indigo-300/40 mb-4 tracking-widest">Benchmarking Reason</h5>
                                <p className="text-sm text-white/80 leading-relaxed italic">{result.analysis.benchmark.reason}</p>
                            </div>
                        </div>
                        <div className="bg-purple-500/5 p-8 rounded-3xl border border-purple-500/20 flex flex-col">
                            <h5 className="text-[10px] uppercase font-bold text-purple-300/40 mb-4 tracking-widest">Format Impact Analysis</h5>
                            <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap font-mono text-[13px]">{result.analysis.benchmark.formatAnalysis}</p>

                            <div className="mt-8 grid grid-cols-2 gap-4">
                                <ResponseSample label="Original Response" content={result.analysis.originalResponse} color="bg-red-500/10 border-red-500/20 text-red-300" />
                                <ResponseSample label="Optimized Response" content={result.analysis.optimizedResponse} color="bg-green-500/10 border-green-500/20 text-green-300" />
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    )
}

function TokenStat({ label, value }: { label: string, value: any }) {
    if (value === undefined || value === null) return null;
    return (
        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
            <span className="text-[9px] uppercase font-black text-white/30 block mb-1">{label}</span>
            <span className="text-lg font-mono font-black text-white">{value}</span>
        </div>
    )
}

function ResponseSample({ label, content, color }: { label: string, content: string, color: string }) {
    return (
        <div className={cn("p-4 rounded-2xl border shadow-inner", color)}>
            <span className="text-[9px] uppercase font-black block mb-2 opacity-60 tracking-widest">{label}</span>
            <p className="text-[10px] opacity-40 line-clamp-3 font-mono leading-tight">{content}</p>
        </div>
    )
}
