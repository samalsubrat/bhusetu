import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-primary p-8 text-center lg:p-16">
          {/* Animated texture overlay */}
          {/* <div className="absolute inset-0 animate-texture-drift opacity-100" style={{
            backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.15) 1px, transparent 1px),
              radial-gradient(circle, rgba(30,30,30,0.5) 1px, transparent 1px)`,
            backgroundSize: '20px 20px, 30px 30px',
            backgroundPosition: '0 0, 15px 15px',
          }} /> */}
          <div className="absolute inset-0 animate-texture-shimmer opacity-30" style={{
            background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px)',
            backgroundSize: '200% 200%',
          }} />

          <div className="relative z-10 mx-auto max-w-3xl">
            <h2 className="mb-6 text-3xl font-black text-primary-foreground lg:text-5xl">
              Ready to secure your property legacy?
            </h2>
            <p className="mb-10 text-lg leading-relaxed text-primary-foreground/80">
              Join the national blockchain registry today for a dispute-free
              tomorrow. Registration takes less than 15 minutes with a verified
              digital identity.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                variant="secondary"
                className="rounded-xl py-6 px-10 text-lg font-bold text-primary shadow-xl shadow-black/20"
              >
                Get Started Now
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-xl border-primary-foreground/30 bg-primary-foreground/10 py-6 px-10 text-lg font-bold text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
              >
                View Documentation
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
