"use client";
import { useRouter } from "next/navigation";
import StudioNavigation from "./StudioNavigation";
import StudioHero from "./StudioHero";
import StudioMetrics from "./StudioMetrics";
import StudioFlow from "./StudioFlow";
import StudioModelCatalog from "./StudioModelCatalog";
import StudioQuickStart from "./StudioQuickStart";
import StudioFeatures from "./StudioFeatures";
import StudioFooter from "./StudioFooter";

export default function StudioLandingView() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#070A10] text-white font-sans overflow-x-hidden antialiased selection:bg-[#F97316] selection:text-white">
      {/* Dynamic Background Mesh Gradients */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
            backgroundSize: "32px 32px"
          }}
        />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[#F97316]/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -left-40 w-[600px] h-[600px] bg-[#3B82F6]/08 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 -right-40 w-[600px] h-[600px] bg-[#8B5CF6]/08 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10">
        <StudioNavigation />
        
        <main>
          <StudioHero />
          <StudioMetrics />
          <StudioFlow />
          <StudioModelCatalog />
          <StudioQuickStart />
          <StudioFeatures />

          {/* Bottom CTA Banner */}
          <section className="py-24 px-6 relative overflow-hidden">
            <div className="max-w-4xl mx-auto rounded-3xl border border-[#F97316]/30 bg-gradient-to-b from-[#151C2C] to-[#0A0D15] p-10 md:p-14 text-center shadow-[0_0_50px_rgba(249,115,22,0.15)] relative">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
                Supercharge Your AI Coding Workflow
              </h2>
              <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto mb-8">
                Start routing through Claude 3.7, GPT-5, DeepSeek and 100+ providers in seconds.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="w-full sm:w-auto h-12 px-8 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white text-sm font-bold transition-all shadow-[0_0_25px_rgba(249,115,22,0.5)] cursor-pointer"
                >
                  Launch Dashboard
                </button>
                <a
                  href="https://github.com/quangdigiaz/hermes-router#readme"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto h-12 px-7 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.1] text-white text-sm font-semibold transition-all flex items-center justify-center"
                >
                  Read Docs
                </a>
              </div>
            </div>
          </section>
        </main>

        <StudioFooter />
      </div>
    </div>
  );
}
