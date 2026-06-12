import React, { useEffect, useState, type ReactNode } from 'react';

/* ===== Basis-UI-Kit der GrowMate Design-Sprache (DESIGN.md) ===== */

export function Card({ children, onClick, className = '' }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <div className={`card p-4 ${onClick ? 'card-tap cursor-pointer' : ''} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Button({
  children, onClick, variant = 'primary', small, disabled, className = '', type = 'button',
}: {
  children: ReactNode; onClick?: () => void; variant?: BtnVariant; small?: boolean; disabled?: boolean; className?: string; type?: 'button' | 'submit';
}) {
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`btn btn-${variant} ${small ? 'btn-sm' : ''} ${className}`}>
      {children}
    </button>
  );
}

export function Chip({ label, active, onClick, color }: { label: string; active?: boolean; onClick?: () => void; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-9 px-4 rounded-full text-[13px] font-semibold transition-colors flex-none"
      style={active
        ? { background: color ?? 'var(--color-accent)', color: 'var(--color-accent-ink)' }
        : { background: 'var(--color-bg3)', color: 'var(--color-ink-dim)', border: '1px solid var(--color-line)' }}
    >
      {label}
    </button>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="flex bg-bg3 rounded-xl p-1 border border-line">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 h-10 rounded-lg text-[13px] font-bold transition-colors ${value === o.value ? 'bg-accent text-accent-ink' : 'text-ink-dim'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Fortschritt als diskrete Pixel-Blöcke (Pixel-Organic-Baustein) */
export function BlockBar({ value, max, color = 'var(--color-accent)', blocks = 12 }: { value: number; max: number; color?: string; blocks?: number }) {
  const filled = max > 0 ? Math.round(Math.min(1, Math.max(0, value / max)) * blocks) : 0;
  return (
    <div className="flex gap-[3px]" role="progressbar" aria-valuenow={value} aria-valuemax={max} aria-valuemin={0}>
      {Array.from({ length: blocks }).map((_, i) => (
        <div key={i} className="h-2.5 flex-1 rounded-[2px]" style={{ background: i < filled ? color : 'var(--color-bg3)' }} />
      ))}
    </div>
  );
}

export const AMPEL_COLORS: Record<string, string> = {
  green: 'var(--color-st-green)',
  yellow: 'var(--color-st-yellow)',
  orange: 'var(--color-st-orange)',
  red: 'var(--color-st-red)',
};

export function AmpelDot({ status, pulse }: { status: 'green' | 'yellow' | 'orange' | 'red'; pulse?: boolean }) {
  return <span className={`ampel-dot inline-block ${pulse && status === 'red' ? 'anim-pulse' : ''}`} style={{ background: AMPEL_COLORS[status] }} aria-label={`Status ${status}`} />;
}

/** Bottom-Sheet für alle Log-Aktionen */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-bg1 rounded-t-3xl border-t border-line max-h-[88dvh] flex flex-col anim-sheet safe-bottom">
        <div className="flex justify-center pt-3 pb-1 flex-none" onClick={onClose}>
          <div className="w-10 h-1.5 rounded-full bg-bg3" />
        </div>
        {title && <h2 className="text-lg font-bold px-5 pt-2 pb-1 flex-none">{title}</h2>}
        <div className="overflow-y-auto px-5 pb-6 pt-2">{children}</div>
      </div>
    </div>
  );
}

/** Formularfeld mit Label + optionaler Anfänger-Erklärung */
export function Field({ label, hint, children, beginnerHint, beginner }: {
  label: string; hint?: string; children: ReactNode; beginnerHint?: string; beginner?: boolean;
}) {
  return (
    <label className="block mb-4">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[13px] font-bold text-ink">{label}</span>
        {hint && <InfoTip term={label} text={hint} />}
      </div>
      {children}
      {beginner && beginnerHint && <p className="text-[12px] text-ink-faint mt-1.5 leading-relaxed">{beginnerHint}</p>}
    </label>
  );
}

/** ⓘ – Inline-Erklärung für Fachbegriffe (Anfänger-Modus) */
export function InfoTip({ term, text }: { term: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={`Was bedeutet ${term}?`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className="w-[18px] h-[18px] rounded-full border border-ink-faint text-ink-faint text-[11px] font-bold leading-none inline-flex items-center justify-center flex-none"
      >
        i
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" onClick={(e) => { e.stopPropagation(); setOpen(false); }}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative card p-5 max-w-sm w-full anim-pop" onClick={(e) => e.stopPropagation()}>
            <p className="px-label mb-2">{term}</p>
            <p className="text-[14px] leading-relaxed text-ink-dim">{text}</p>
            <Button small variant="secondary" className="mt-4 w-full" onClick={() => setOpen(false)}>Verstanden</Button>
          </div>
        </div>
      )}
    </>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="text-[44px] mb-3">{icon}</div>
      <h3 className="font-bold text-[16px] mb-1">{title}</h3>
      {text && <p className="text-[13px] text-ink-dim max-w-[260px] leading-relaxed">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Screen-Header mit optionalem Zurück-Pfeil */
export function Header({ title, back, right, sub }: { title: string; back?: () => void; right?: ReactNode; sub?: string }) {
  return (
    <header className="safe-top sticky top-0 z-30 bg-bg0/92 backdrop-blur-md border-b border-line/60">
      <div className="flex items-center gap-3 px-4 h-14">
        {back && (
          <button type="button" onClick={back} aria-label="Zurück" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-ink-dim text-xl">
            ←
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-[18px] font-bold truncate">{title}</h1>
          {sub && <p className="text-[11px] text-ink-faint truncate -mt-0.5">{sub}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}

export function Divider({ label }: { label?: string }) {
  return label
    ? <div className="px-label my-4">{label}</div>
    : <hr className="border-line my-4" />;
}
