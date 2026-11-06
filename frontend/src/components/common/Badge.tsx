import React from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'sage' | 'terracotta' | 'forest' | 'stone' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'sage',
  size = 'md',
  className,
  icon,
}) => {
  const variants = {
    sage: 'bg-[#E1EBE6] text-[#2A4D3F] border border-[#C2D6CD]',
    terracotta: 'bg-[#F8EFEA] text-[#AD6B46] border border-[#E9C3B0]',
    forest: 'bg-[#1E372D] text-[#FAF8F5]',
    stone: 'bg-[#EAE2D8]/70 text-[#555146] border border-[#DCD3C6]',
    outline: 'bg-transparent text-[#2A4D3F] border border-[#CAD6CE]',
  };

  const sizes = {
    sm: 'text-[11px] px-2.5 py-0.5 font-medium tracking-wide',
    md: 'text-xs px-3 py-1 font-semibold tracking-wider uppercase',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full select-none transition-colors',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
