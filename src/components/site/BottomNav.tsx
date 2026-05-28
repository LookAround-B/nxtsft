'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Info, Mail, CircleUserRound } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const items = [
  { href: '/',           label: 'Home',    Icon: Home   },
  { href: '/properties', label: 'Search',  Icon: Search },
  { href: '/about',      label: 'About',   Icon: Info   },
  { href: '/contact',    label: 'Contact', Icon: Mail   },
];

export function BottomNav() {
  const pathname = usePathname();
  const { session } = useAuth();
  const accountHref = session ? '/profile' : '/login';

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 md:hidden">
      {/* Safe-area spacer */}
      <div className="h-[env(safe-area-inset-bottom)] bg-white/95" />

      <div className="border-t border-border/60 bg-white/95 backdrop-blur-xl">
        <ul className="mx-auto grid max-w-sm grid-cols-5 px-2 py-1">
          {items.map(({ href, label, Icon }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex flex-col items-center gap-0.5 rounded-xl px-1 py-2.5"
                >
                  <span className={`
                    grid h-8 w-8 place-items-center rounded-xl transition-all duration-200
                    ${active
                      ? 'bg-accent/12 text-accent scale-110'
                      : 'text-muted-foreground group-hover:bg-secondary group-hover:text-foreground'
                    }
                  `}>
                    <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                  </span>
                  <span className={`text-[9px] font-semibold uppercase tracking-wider transition-colors ${active ? 'text-accent' : 'text-muted-foreground'}`}>
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}

          {/* Account */}
          <li>
            <Link
              href={accountHref}
              className="group flex flex-col items-center gap-0.5 rounded-xl px-1 py-2.5"
            >
              {session ? (
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent text-[11px] font-bold text-accent-foreground ring-2 ring-accent/30 transition-transform group-hover:scale-105">
                  {session.initials}
                </span>
              ) : (
                <span className={`
                  grid h-8 w-8 place-items-center rounded-xl transition-all duration-200
                  ${pathname === '/login'
                    ? 'bg-accent/12 text-accent scale-110'
                    : 'text-muted-foreground group-hover:bg-secondary group-hover:text-foreground'
                  }
                `}>
                  <CircleUserRound size={18} strokeWidth={pathname === '/login' ? 2.5 : 1.8} />
                </span>
              )}
              <span className={`text-[9px] font-semibold uppercase tracking-wider transition-colors
                ${(pathname.startsWith('/profile') || pathname === '/login') ? 'text-accent' : 'text-muted-foreground'}`}
              >
                {session ? 'Me' : 'Sign in'}
              </span>
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
