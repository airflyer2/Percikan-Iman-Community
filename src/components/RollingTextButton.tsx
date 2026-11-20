import React, { useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  gsap.registerPlugin(useGSAP);
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface RollingTextButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  magnetic?: boolean;
}

export const RollingTextButton: React.FC<RollingTextButtonProps> = ({
  label,
  leftIcon,
  rightIcon,
  magnetic = true,
  type = 'button',
  disabled = false,
  className,
  'aria-label': ariaLabel,
  onMouseEnter,
  onMouseLeave,
  onMouseMove,
  onFocus,
  onBlur,
  ...rest
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const quickXRef = useRef<gsap.QuickToFunc | null>(null);
  const quickYRef = useRef<gsap.QuickToFunc | null>(null);
  const chars = useMemo(() => Array.from(label), [label]);

  const { contextSafe } = useGSAP(
    () => {
      quickXRef.current = null;
      quickYRef.current = null;

      if (!btnRef.current || prefersReducedMotion()) return;

      if (disabled) {
        gsap.set(btnRef.current, { x: 0, y: 0 });
        gsap.set(btnRef.current.querySelectorAll('[data-roll-col]'), { yPercent: 0 });
        return;
      }

      gsap.set(btnRef.current.querySelectorAll('[data-roll-col]'), { yPercent: 0 });

      if (magnetic === false) {
        gsap.set(btnRef.current, { x: 0, y: 0 });
        return;
      }

      quickXRef.current = gsap.quickTo(btnRef.current, 'x', {
        duration: 0.32,
        ease: 'power3.out',
      });
      quickYRef.current = gsap.quickTo(btnRef.current, 'y', {
        duration: 0.32,
        ease: 'power3.out',
      });
    },
    { scope: btnRef, dependencies: [disabled, magnetic, label], revertOnUpdate: true }
  );

  const rollTo = contextSafe((targetY: number) => {
    if (!btnRef.current || disabled || prefersReducedMotion()) return;
    gsap.to(btnRef.current.querySelectorAll('[data-roll-col]'), {
      yPercent: targetY,
      duration: 0.36,
      stagger: 0.014,
      ease: 'power3.out',
      overwrite: 'auto',
    });
  });

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    rollTo(-100);
    onMouseEnter?.(e);
  };

  const handleMouseMove = contextSafe((e: React.MouseEvent<HTMLButtonElement>) => {
    if (btnRef.current && !disabled && magnetic !== false && !prefersReducedMotion()) {
      const rect = btnRef.current.getBoundingClientRect();
      if (rect.width && rect.height) {
        const relX = (e.clientX - rect.left) / rect.width - 0.5;
        const relY = (e.clientY - rect.top) / rect.height - 0.5;
        quickXRef.current?.(gsap.utils.clamp(-5, 5, relX * 10));
        quickYRef.current?.(gsap.utils.clamp(-5, 5, relY * 10));
      }
    }
    onMouseMove?.(e);
  });

  const handleMouseLeave = contextSafe((e: React.MouseEvent<HTMLButtonElement>) => {
    rollTo(0);
    if (btnRef.current && !disabled && magnetic !== false && !prefersReducedMotion()) {
      gsap.to(btnRef.current, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.5)',
        overwrite: 'auto',
      });
    }
    onMouseLeave?.(e);
  });

  const handleFocus = (e: React.FocusEvent<HTMLButtonElement>) => {
    rollTo(-100);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLButtonElement>) => {
    rollTo(0);
    onBlur?.(e);
  };

  return (
    <button
      ref={btnRef}
      type={type}
      aria-label={ariaLabel ?? label}
      disabled={disabled}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      {...rest}
    >
      {leftIcon}
      <span
        aria-hidden="true"
        className="overflow-hidden inline-flex h-[1.35em] leading-[1.35em] align-middle"
      >
        {chars.map((ch, idx) => (
          <span key={idx} className="relative inline-block overflow-hidden h-[1.35em]">
            <span data-roll-col className="relative inline-block h-[1.35em]">
              <span className="block h-[1.35em]">{ch === ' ' ? '\u00A0' : ch}</span>
              <span className="block h-[1.35em] absolute left-0 top-full">
                {ch === ' ' ? '\u00A0' : ch}
              </span>
            </span>
          </span>
        ))}
      </span>
      {rightIcon}
    </button>
  );
};
