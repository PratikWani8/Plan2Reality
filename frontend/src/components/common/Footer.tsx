import React from 'react';
import { Link } from 'react-router-dom';
import { Box, ArrowUpRight, Github, Mail, Shield, FileText, CheckCircle2 } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#13241E] text-[#E1EBE6] pt-16 pb-12 border-t border-[#1E372D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-[#2A4D3F]/60">
          {/* Brand info */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#2A4D3F] flex items-center justify-center text-[#FAF8F5] border border-[#467A65]/40">
                <Box className="w-5 h-5 text-[#9DBEB0]" />
              </div>
              <span className="font-serif text-2xl font-bold tracking-tight text-[#FAF8F5]">
                Plan2Reality<span className="text-[#C27D56] font-sans text-xs ml-1 font-semibold uppercase tracking-wider bg-[#2A4D3F] px-1.5 py-0.5 rounded">AI</span>
              </span>
            </Link>
            <p className="text-[#9DBEB0] text-sm leading-relaxed max-w-sm">
              Architectural computer vision and 3D spatial reconstruction engine. Converting real-estate blueprints and architectural floor plans into interactive, dimensionally calibrated 3D environments.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-[#C2D6CD] bg-[#1E372D] px-2.5 py-1 rounded-md border border-[#2A4D3F]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#6E9C88]" />
                Web-based Three.js + OpenCV Pipeline
              </span>
            </div>
          </div>

          {/* Product links */}
          <div>
            <h4 className="text-sm font-semibold tracking-wider text-[#FAF8F5] uppercase mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5 text-sm text-[#9DBEB0]">
              <li>
                <Link to="/app" className="hover:text-white transition-colors flex items-center gap-1">
                  3D Workspace <ArrowUpRight className="w-3 h-3 text-[#6E9C88]" />
                </Link>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Computer Vision Engine
                </a>
              </li>
              <li>
                <a href="#examples" className="hover:text-white transition-colors">
                  Architectural Presets
                </a>
              </li>
              <li>
                <a href="#professionals" className="hover:text-white transition-colors">
                  Enterprise & Studios
                </a>
              </li>
            </ul>
          </div>

          {/* Formats & Exports */}
          <div>
            <h4 className="text-sm font-semibold tracking-wider text-[#FAF8F5] uppercase mb-4">
              Supported Data
            </h4>
            <ul className="space-y-2.5 text-sm text-[#9DBEB0]">
              <li className="flex items-center justify-between">
                <span>Raster Plans</span>
                <span className="text-xs text-[#6E9C88] bg-[#1E372D] px-2 py-0.5 rounded">PNG, JPG</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Vector Docs</span>
                <span className="text-xs text-[#6E9C88] bg-[#1E372D] px-2 py-0.5 rounded">PDF</span>
              </li>
              <li className="flex items-center justify-between">
                <span>3D Model Export</span>
                <span className="text-xs text-[#C27D56] bg-[#1E372D] px-2 py-0.5 rounded">GLB / glTF</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Spatial Geometry</span>
                <span className="text-xs text-[#9DBEB0] bg-[#1E372D] px-2 py-0.5 rounded">JSON</span>
              </li>
            </ul>
          </div>

          {/* Legal / Contact */}
          <div>
            <h4 className="text-sm font-semibold tracking-wider text-[#FAF8F5] uppercase mb-4">
              Resources & Info
            </h4>
            <ul className="space-y-2.5 text-sm text-[#9DBEB0]">
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Github className="w-4 h-4 text-[#6E9C88]" /> GitHub Repository
                </a>
              </li>
              <li>
                <a href="mailto:contact@plan2reality.ai" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-[#6E9C88]" /> Developer Contact
                </a>
              </li>
              <li>
                <span className="text-[#6E9C88] flex items-center gap-1 text-xs">
                  <Shield className="w-3.5 h-3.5" /> Privacy Policy (Placeholder)
                </span>
              </li>
              <li>
                <span className="text-[#6E9C88] flex items-center gap-1 text-xs">
                  <FileText className="w-3.5 h-3.5" /> Terms of Service (Placeholder)
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#6E9C88] gap-4">
          <p>© {new Date().getFullYear()} Plan2Reality AI. All rights reserved. Architectural visualization tool.</p>
          <p className="text-center sm:text-right">
            Designed with precision for architects, builders, interior designers, and prospective home buyers.
          </p>
        </div>
      </div>
    </footer>
  );
};
