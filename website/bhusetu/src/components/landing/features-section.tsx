import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ScrollText,
  Zap,
  ShieldCheck,
  Eye,
} from "lucide-react";

const features = [
  {
    icon: ScrollText,
    title: "Clear Title",
    description:
      "Legally verified ownership history secured by decentralized blockchain protocols. No more ambiguous documents.",
  },
  {
    icon: Zap,
    title: "Real-Time Transfer",
    description:
      "Execute property sales and transfers instantly through automated smart contracts. Elimination of administrative delays.",
  },
  {
    icon: ShieldCheck,
    title: "Immutable Records",
    description:
      "Permanent, unalterable data storage resistant to unauthorized changes. Your records are protected by cryptographic security.",
  },
  {
    icon: Eye,
    title: "Transparent Portal",
    description:
      "Open and auditable tracking for citizens and government officials. Complete visibility into the land lifecycle.",
  },
];

export function FeaturesSection() {
  return (
    <section id="services" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mb-16 text-center">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-saffron">
            Core Infrastructure
          </h2>
          <h3 className="text-3xl font-black text-foreground lg:text-4xl">
            Secure Digital Governance
          </h3>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Our platform provides a transparent and immutable ledger for all
            property transactions, ensuring safety and ease for every citizen.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="group border-border transition-all duration-300 hover:border-primary/50 hover:shadow-xl"
            >
              <CardHeader>
                <div className="mb-2 flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <feature.icon className="size-7" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
