'use client';
import { useEffect, useState } from 'react';

export function useActiveHash(): string {
  const [hash, setHash] = useState('');

  useEffect(() => {
    const read = () => window.location.hash.replace(/^#/, '');
    const update = () => setHash((prev) => {
      const h = read();
      return prev === h ? prev : h;
    });

    // Read immediately on mount
    update();

    // Browser native hash navigation and back/forward
    window.addEventListener('hashchange', update);
    window.addEventListener('popstate', update);

    // Patch history methods — Next.js App Router uses pushState/replaceState
    // for client-side navigation without firing hashchange
    const origPush = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);

    history.pushState = function (...args: Parameters<typeof history.pushState>) {
      origPush(...args);
      update();
    };
    history.replaceState = function (...args: Parameters<typeof history.replaceState>) {
      origReplace(...args);
      update();
    };

    return () => {
      window.removeEventListener('hashchange', update);
      window.removeEventListener('popstate', update);
      history.pushState = origPush;
      history.replaceState = origReplace;
    };
  }, []);

  return hash;
}
