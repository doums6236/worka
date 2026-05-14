'use client';

import { forwardRef } from 'react';
import clsx from 'clsx';

/* ----------------------------- Button ----------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-dark shadow-sm shadow-primary/30 disabled:bg-primary/50',
  secondary:
    'bg-white text-ink border border-line hover:border-primary hover:text-primary disabled:opacity-50',
  danger:
    'bg-danger text-white hover:bg-red-700 shadow-sm shadow-danger/30 disabled:bg-danger/50',
  ghost: 'bg-transparent text-ink hover:bg-surface-muted disabled:opacity-50',
  success:
    'bg-success text-white hover:bg-emerald-700 shadow-sm shadow-success/30 disabled:bg-success/50',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-5 py-3 text-base rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, iconLeft, iconRight, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-bold transition-all duration-150 active:scale-[0.98]',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        loading && 'opacity-70 cursor-wait',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        iconLeft
      )}
      {children}
      {!loading && iconRight}
    </button>
  );
});

/* ----------------------------- Card ----------------------------- */

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, children, ...rest }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-white rounded-2xl border border-line shadow-card',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ----------------------------- Input ----------------------------- */

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-bold uppercase tracking-wider text-ink-secondary"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={clsx(
          'rounded-xl border-[1.5px] border-line bg-white px-4 py-3 text-base text-ink outline-none transition-colors',
          'focus:border-primary',
          'placeholder:text-ink-muted',
          error && 'border-danger focus:border-danger',
          className,
        )}
        {...rest}
      />
      {error ? (
        <p className="text-xs font-semibold text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-secondary">{hint}</p>
      ) : null}
    </div>
  );
});

/* ----------------------------- Modal ----------------------------- */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const MODAL_SIZES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className={clsx(
          'w-full rounded-2xl bg-white shadow-2xl',
          MODAL_SIZES[size],
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="border-b border-line px-5 py-4">
            <h3 className="text-base font-extrabold text-ink">{title}</h3>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ----------------------------- Badge ----------------------------- */

type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-muted text-ink-secondary',
  primary: 'bg-surface-bgLight text-primary',
  success: 'bg-emerald-50 text-success',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-danger',
};

export function Badge({
  variant = 'neutral',
  children,
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide rounded-full',
        BADGE_VARIANTS[variant],
      )}
    >
      {children}
    </span>
  );
}

/* ----------------------------- Empty state ----------------------------- */

export function EmptyState({
  icon,
  title,
  hint,
  cta,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon && (
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-muted text-ink-muted">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-extrabold text-ink">{title}</h3>
      {hint && <p className="mt-1.5 max-w-sm text-sm text-ink-secondary">{hint}</p>}
      {cta && <div className="mt-5">{cta}</div>}
    </div>
  );
}
