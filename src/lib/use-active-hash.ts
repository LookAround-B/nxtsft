'use client';
import { useEffect, useState } from 'react';

export function useActiveHash(): string {
  const [hash, setHash] = useState('');

  useEffect(() => {
    const read = () => window.location.hash.replace(/^#/, '');
    // Sync on mount so direct URL loads (e.g. /admin-portal#team) work
    setHash(read());

    const onHashChange = () => setHash(read());
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('popstate', onHashChange);

    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('popstate', onHashChange);
    };
  }, []);

  return hash;
}
