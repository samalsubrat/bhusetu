
import Link from 'next/link'
import { Landmark } from 'lucide-react'
import { Button } from './ui/button'
import MaxWidthWrapper from './MaxWidthWrapper';

const navLinks = [
  { label: "MARKETPLACE", href: "/marketplace" },
  { label: "CONTACT US", href: "/contact-us" },
];

const Navbar = () => {
  return (
    <>
      <MaxWidthWrapper className='sticky z-50 top-6 '>
        <div className='rounded-full shadow-sm bg-white/80 backdrop-blur-xl flex items-center justify-between px-4 h-12'>
          {/* Logo  */}
          <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <div className="rounded-lg bg-primary p-1.5 text-primary-foreground">
              <Landmark className="size-5" />
            </div>
            <span className="text-xl font-black tracking-tight text-primary">
              BhuSetu
            </span>
            <div className="mx-2 hidden h-4 w-px bg-border sm:block" />
            <span className="hidden text-[10px] font-bold uppercase leading-tight tracking-widest text-muted-foreground sm:block">
              National Land
              <br />
              Registry
            </span>
          </Link>
          <div className="flex items-center gap-4 ">
            <nav className="hidden items-center gap-4 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm font-semibold text-foreground/70 transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <Button className="font-bold rounded-full">
              LOGIN
            </Button>
          </div>
        </div >
      </MaxWidthWrapper>
    </>
  )
}

export default Navbar