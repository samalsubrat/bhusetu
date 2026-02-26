import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShieldCheck, Compass, BadgeCheck, User } from "lucide-react";

const avatars = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAXPiQlQ6CvM7eQPtK7JvDmVwtAfko3vX_X8N6X_cVDjsLTJSqWxvUjg2TWqgya9B420v-XfmXYa6WuSCaruNKjQKO4Pl9jk_OcLpIcUV1nEjuMyH9-DXd2qkSg_4NcUiSR_nGbOGecocYkLWULzJMH30TOzL83wGF6MnBw55hbpMT0rY09yKaMb_9QTPetNzXqJZTzNXXopDI_uSmMlU8pqq1R7wAPsGTMMYnS4M3RHAbMzsrl3g4diJ_jM8xzVEH3JdLhoqlw",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBU8xPw5yuz04PKk8MDq8wd-jFXKtVCAEJlKLyQbplV_L1waomf4KyqKY_OfBKPly27CUs1gjg1WJGPs7OdPf1bK1fM-OXp9_E1kqkIfcqJdapPh5haDsdHqhlhs8BJdS3AQnm7fXG8e1bSdf_1v_qgxdqr0zGZWKR2oSNMglhyt_FDehNSw6zFPa5qs_nAqFLSO81SEpwXhdrWLv-090g2QOGMpR806kB8yvzwbYDX3Q-FXX70kj4jTWmPAZNbgZ0wrnTSS11H",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBhdAqURC14PGz-_csSJ3vGiyKQa5aezSvtPv9ear02W_T2y8QbBFTRe3SJXtvLUat9j-tnPJjNJ52c5Al2NyD8qE9dvJ78RB-LMQCcCEZfDdspztKJa-LhxBMmi_ZLuRN3QOkp8NCVpjtbrvQ7cY8AlDR5oC58KgMhmbZFRkHU4-KcX4C6QTfxy04yq-Arq9H9qf07-hg4kg6hYBzWJM41QqD7zACFHl0QYyGUGW3Qj2AjKziypT0KUX1voU_xu_4VuhTT_zNC",
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden -mt-16 pt-40 pb-20 lg:pb-24 bg-linear-to-b from-primary/15 ">
      <div className="hero-pattern absolute inset-0 -z-10" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center">
          {/* Content */}
          <div className="text-center">
            <Badge
              variant="outline"
              className="mb-6 gap-2 border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Blockchain Secured Infrastructure
            </Badge>

            <h1 className="mb-6 text-5xl font-black leading-[1.1] tracking-tight text-foreground lg:text-7xl">
              Real-Time,{" "}
              <span className="italic text-primary">Tamper-<br/>Proof</span> Land
              Registry
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Revolutionizing national land records with decentralized digital
              governance. Eliminate disputes, remove middlemen, and secure your
              heritage on the world&apos;s most advanced blockchain ledger.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                className="gap-3 rounded-xl py-6 px-8 text-base font-bold shadow-xl shadow-primary/25"
              >
                <ShieldCheck className="size-5" />
                Register Property
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="gap-3 rounded-xl py-6 px-8 text-base font-bold"
              >
                <Compass className="size-5" />
                Explore Public Ledger
              </Button>
            </div>

            {/* Social proof */}
            <div className="mt-12 flex items-center justify-center gap-6">
              <div className="flex -space-x-3">
                {avatars.map((src, i) => (
                  <Avatar
                    key={i}
                    className="size-10 border-2 border-background"
                  >
                    <AvatarImage src={src} alt={`Verified user ${i + 1}`} />
                    <AvatarFallback>
                      <User className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                <span className="font-bold text-foreground">2.4M+</span>{" "}
                citizens already registered
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
