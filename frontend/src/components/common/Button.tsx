import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/cn';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'terracotta' | 'ghost' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  isLoading,
  children,
  className,
  disabled,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none";

  const variants = {
    primary: "bg-[#1E372D] hover:bg-[#2A4D3F] text-[#FAF8F5] shadow-sm hover:shadow-md focus:ring-[#34604F] border border-transparent",
    secondary: "bg-[#EAE2D8] hover:bg-[#DCD3C6] text-[#13241E] focus:ring-[#9DBEB0] border border-[#DCD3C6]/60",
    outline: "bg-transparent hover:bg-[#FAF8F5] text-[#1E372D] border border-[#CAD6CE] hover:border-[#1E372D] focus:ring-[#34604F]",
    terracotta: "bg-[#C27D56] hover:bg-[#AD6B46] text-white shadow-sm hover:shadow-md focus:ring-[#C27D56]",
    ghost: "bg-transparent hover:bg-[#EAE2D8]/50 text-[#13241E] focus:ring-[#CAD6CE]",
    dark: "bg-[#111311] hover:bg-[#2B2C2B] text-white shadow-sm focus:ring-[#4F4F4F]",
  };

  const sizes = {
    sm: "text-xs px-3.5 py-1.5 gap-1.5 tracking-wide",
    md: "text-sm px-5 py-2.5 gap-2",
    lg: "text-base px-6 py-3.5 gap-2.5 font-semibold",
  };

  return (
    <motion.button
      whileHover={!disabled && !isLoading ? { y: -1 } : undefined}
      whileTap={!disabled && !isLoading ? { scale: 0.98 } : undefined}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : leftIcon ? (
        <span className="shrink-0">{leftIcon}</span>
      ) : null}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </motion.button>
  );
};
