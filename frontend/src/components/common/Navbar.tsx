import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Box, ArrowUpRight, Sparkles, Layers } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../utils/cn';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 24) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'How It Works', href: '/#how-it-works' },
    { label: 'Features', href: '/#features' },
    { label: 'Examples', href: '/#examples' },
    { label: 'For Professionals', href: '/#professionals' },
  ];

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 font-sans',
        isScrolled
          ? 'bg-[#FAF8F5]/95 backdrop-blur-md shadow-subtle border-b border-[#EAE2D8] py-3.5'
          : 'bg-transparent py-5'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Brand Logo & Wordmark */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#1E372D] flex items-center justify-center text-[#FAF8F5] shadow-sm transition-transform duration-200 group-hover:scale-105 border border-[#34604F]/40">
              <Box className="w-5 h-5 text-[#9DBEB0]" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#13241E] leading-none">
                Plan2Reality<span className="text-[#C27D56] font-sans text-xs ml-1 font-semibold uppercase tracking-wider bg-[#F8EFEA] px-1.5 py-0.5 rounded border border-[#E9C3B0]/60">AI</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[#6E9C88] font-medium mt-0.5">
                Architectural 3D Engine
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-7">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-[#2A362F] hover:text-[#1E372D] transition-colors relative py-1 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#467A65] after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="font-semibold text-xs text-[#2A4D3F]">
                Sign In
              </Button>
            </Link>
            <Link to="/app">
              <Button
                variant="primary"
                size="sm"
                rightIcon={<ArrowUpRight className="w-3.5 h-3.5 text-[#9DBEB0]" />}
                className="shadow-sm font-medium"
              >
                Create Your 3D Model
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="lg:hidden flex items-center gap-2">
            <Link to="/app" className="sm:hidden">
              <Button variant="primary" size="sm" className="text-xs px-2.5 py-1.5">
                Launch
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#1E372D] hover:bg-[#EAE2D8]/50 focus:outline-none focus:ring-2 focus:ring-[#34604F]"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#FAF8F5] border-b border-[#EAE2D8] shadow-elevated px-4 pt-4 pb-6 mt-3 animate-fade-in">
          <div className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium text-[#1E372D] py-2 px-3 rounded-md hover:bg-[#E1EBE6] transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-4 border-t border-[#EAE2D8] flex flex-col gap-2.5">
              <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" size="md" className="w-full justify-center">
                  Sign In
                </Button>
              </Link>
              <Link to="/app" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant="primary"
                  size="md"
                  rightIcon={<ArrowUpRight className="w-4 h-4" />}
                  className="w-full justify-center"
                >
                  Create Your 3D Model
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
