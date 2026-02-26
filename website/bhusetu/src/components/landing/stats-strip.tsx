import { Separator } from "@/components/ui/separator";
import MaxWidthWrapper from "../MaxWidthWrapper";

const stats = [
  { value: "5.2M+", label: "Registered Plots" },
  { value: "100%", label: "Data Integrity" },
  { value: "Zero", label: "Pending Disputes" },
  { value: "Instant", label: "Digital Transfers" },
];

export function StatsStrip() {
  return (
    <MaxWidthWrapper>
      <div className="px-4 py-10 sm:px-6 lg:px-8 rounded-2xl border border-border bg-card shadow-sm">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="relative text-center"
            >
              <div className="mb-1 text-3xl font-black text-primary">
                {stat.value}
              </div>
              <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </div>
              {i < stats.length - 1 && (
                <Separator
                  orientation="vertical"
                  className="absolute top-0 right-0 hidden h-full md:block"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </MaxWidthWrapper>
  );
}
