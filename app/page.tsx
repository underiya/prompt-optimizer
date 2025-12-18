import OptimizationInterface from "@/components/OptimizationInterface";

export default function Home() {
  return (
    <main className="min-h-screen bg-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black selection:bg-indigo-500/30">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
      <div className="relative z-10">
        <OptimizationInterface />
      </div>
    </main>
  );
}
