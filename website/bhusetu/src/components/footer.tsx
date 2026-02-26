import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Landmark, Share2, Mail, Phone, MapPin } from "lucide-react";

const resourceLinks = [
  { label: "Public Ledger", href: "#" },
  { label: "Digital Identity FAQ", href: "#" },
  { label: "Policy Framework", href: "#" },
  { label: "Security Audit", href: "#" },
];

const serviceLinks = [
  { label: "Property Registration", href: "#" },
  { label: "Title Search", href: "#" },
  { label: "Mutations", href: "#" },
  { label: "Analytics Dashboard", href: "#" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-foreground text-muted-foreground">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-4">
          {/* Brand column */}
          <div>
            <div className="mb-6 flex items-center gap-2">
              <div className="rounded bg-primary p-1.5 text-primary-foreground">
                <Landmark className="size-4" />
              </div>
              <span className="text-xl font-black tracking-tight text-background">
                BhuSetu
              </span>
            </div>
            <p className="mb-6 text-sm leading-relaxed">
              India&apos;s premier blockchain infrastructure for transparent and
              secure land governance. Empowering citizens through technology.
            </p>
            <div className="flex gap-4">
              <Link
                href="#"
                className="flex size-8 items-center justify-center rounded-full bg-muted-foreground/20 transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <Share2 className="size-3.5" />
              </Link>
              <Link
                href="#"
                className="flex size-8 items-center justify-center rounded-full bg-muted-foreground/20 transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <Mail className="size-3.5" />
              </Link>
            </div>
          </div>

          {/* Resources */}
          <div>
            <h5 className="mb-6 font-bold text-background">Resources</h5>
            <ul className="space-y-4 text-sm font-medium">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h5 className="mb-6 font-bold text-background">Services</h5>
            <ul className="space-y-4 text-sm font-medium">
              {serviceLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h5 className="mb-6 font-bold text-background">Contact Support</h5>
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Phone className="size-4 shrink-0 text-primary" />
                <span>1800-BHUSETU (Toll Free)</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="size-4 shrink-0 text-primary" />
                <span>
                  Ministry of Land Records,
                  <br />
                  New Delhi, India
                </span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="bg-muted-foreground/20" />

        <div className="flex flex-col items-center justify-between gap-4 pt-8 text-xs font-semibold uppercase tracking-widest md:flex-row">
          <div>© 2026 BHUSETU NATIONAL PORTAL. ALL RIGHTS RESERVED.</div>
          <div className="flex gap-8">
            <Link href="#" className="hover:text-background">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-background">
              Terms of Service
            </Link>
            <Link href="#" className="hover:text-background">
              Accessibility
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
