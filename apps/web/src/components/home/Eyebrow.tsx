export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 text-xs font-bold uppercase tracking-widest text-gradient-accent">
      {children}
    </div>
  );
}
