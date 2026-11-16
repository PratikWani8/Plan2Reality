import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Compass, Eye, Sparkles, Box, ShieldCheck, Ruler, Layers } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Link } from 'react-router-dom';

interface HeroSectionProps {
  onOpenDemo?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenDemo }) => {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-gradient-to-b from-[#FAF8F5] via-[#F4EFEA]/40 to-[#FAF8F5]">
      {/* Subtle Architectural Grid Background Accent */}
      <div 
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#1E372D 1px, transparent 1px), linear-gradient(to right, #1E372D 1px, transparent 1px), linear-gradient(to bottom, #1E372D 1px, transparent 1px)`,
          backgroundSize: '40px 40px, 120px 120px, 120px 120px'
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Headline & Messaging */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="sage" className="shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#467A65]" />
                Next-Gen Architectural Visualisation
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#13241E] leading-[1.12]"
            >
              From Floor Plan <br />
              <span className="italic font-normal text-[#2A4D3F]">to Reality.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base sm:text-lg text-[#3D5245] leading-relaxed max-w-xl"
            >
              Turn your 2D blueprint into an interactive 3D space. Explore layouts, understand dimensions, and visualise your future home in minutes.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2"
            >
              <Link to="/app">
                <Button
                  variant="primary"
                  size="lg"
                  rightIcon={<ArrowRight className="w-4 h-4 text-[#9DBEB0]" />}
                  className="w-full sm:w-auto text-base shadow-elevated"
                >
                  Transform Your Floor Plan
                </Button>
              </Link>
              <Link to="/app?demo=nordic">
                <Button
                  variant="secondary"
                  size="lg"
                  leftIcon={<Eye className="w-4 h-4 text-[#467A65]" />}
                  className="w-full sm:w-auto text-base border border-[#DCD3C6]"
                >
                  Explore a 3D Demo
                </Button>
              </Link>
            </motion.div>

            {/* Micro Highlights */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              className="pt-6 border-t border-[#EAE2D8] grid grid-cols-3 gap-4"
            >
              <div className="flex flex-col">
                <span className="font-serif text-2xl font-bold text-[#13241E]">100%</span>
                <span className="text-xs text-[#6E9C88]">Browser-native 3D</span>
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-2xl font-bold text-[#13241E]">glTF / GLB</span>
                <span className="text-xs text-[#6E9C88]">Standard Export</span>
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-2xl font-bold text-[#13241E]">0.01m</span>
                <span className="text-xs text-[#6E9C88]">Scale Precision</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Architectural 2D-to-3D Visual Composition */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-6 relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-card-hover border border-[#DCD3C6] bg-white group">
              
              {/* Split Visual: Left blueprint sketch, Right modern 3D visual render */}
              <div className="relative h-[380px] sm:h-[460px] w-full overflow-hidden">
                {/* 3D Realistic Render Background */}
                <img
                  src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop"
                  alt="Modern architectural living room with floor to ceiling glass"
                  className="w-full h-full object-cover object-center transform transition-transform duration-700 group-hover:scale-105"
                  loading="eager"
                />

                {/* Left 2D Blueprint Graphic Overlay */}
                <div className="absolute inset-y-0 left-0 w-2/5 sm:w-1/2 bg-[#1E372D]/90 backdrop-blur-xs p-5 flex flex-col justify-between border-r border-[#6E9C88]/40">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#9DBEB0]">
                      Input Blueprint
                    </span>
                    <p className="text-xs font-mono text-white/90">
                      SCALE 1:50 · LEVEL 01
                    </p>
                  </div>

                  {/* Stylized Floor Plan Blueprint Vector */}
                  <div className="my-auto py-2">
                    <svg viewBox="0 0 200 150" className="w-full text-[#9DBEB0] fill-none stroke-current stroke-[1.5]">
                      {/* Outer boundary */}
                      <rect x="10" y="10" width="180" height="130" strokeDasharray="4 2" className="opacity-40" />
                      <rect x="15" y="15" width="170" height="120" strokeWidth="2.5" className="stroke-white" />
                      {/* Room partitions */}
                      <line x1="85" y1="15" x2="85" y2="85" strokeWidth="2" />
                      <line x1="85" y1="85" x2="185" y2="85" strokeWidth="2" />
                      <line x1="45" y1="85" x2="45" y2="135" strokeWidth="1.5" />
                      {/* Door swings */}
                      <path d="M 85,50 A 25,25 0 0,0 60,75" strokeDasharray="2 2" className="stroke-[#C27D56]" />
                      <path d="M 140,85 A 25,25 0 0,0 165,110" strokeDasharray="2 2" className="stroke-[#C27D56]" />
                      {/* Dimension labels */}
                      <text x="35" y="55" fill="#FAF8F5" fontSize="8" fontFamily="monospace" stroke="none">LIVING 28m²</text>
                      <text x="100" y="55" fill="#FAF8F5" fontSize="8" fontFamily="monospace" stroke="none">BEDROOM 14m²</text>
                      <text x="100" y="115" fill="#FAF8F5" fontSize="8" fontFamily="monospace" stroke="none">BATH 7m²</text>
                    </svg>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#6E9C88] animate-ping" />
                    <span className="text-[11px] font-mono text-[#E1EBE6]">CV Analysis Active</span>
                  </div>
                </div>

                {/* Right Interactive Tag */}
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-sm border border-[#EAE2D8] flex items-center gap-2">
                  <Box className="w-4 h-4 text-[#2A4D3F]" />
                  <span className="text-xs font-semibold text-[#13241E]">3D Reconstruction</span>
                </div>

                {/* Dimension Overlay Pin */}
                <div className="absolute bottom-4 right-4 bg-[#13241E]/90 text-white backdrop-blur-md px-3 py-2 rounded-lg text-xs space-y-0.5 border border-[#34604F]/60">
                  <div className="flex items-center gap-1.5 text-[#9DBEB0]">
                    <Ruler className="w-3.5 h-3.5" />
                    <span className="font-mono text-[11px]">8.00m × 6.00m</span>
                  </div>
                  <p className="text-[10px] text-gray-300">Calibrated ground plane</p>
                </div>
              </div>

              {/* Bottom Quick-Action Bar on Card */}
              <div className="p-4 bg-[#FAF8F5] border-t border-[#EAE2D8] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#E1EBE6] flex items-center justify-center text-[#2A4D3F]">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-[#13241E]">Nordic 1-Bedroom Layout</h2>
                    <p className="text-[11px] text-[#6E9C88]">3 enclosed spaces · 7 walls detected</p>
                  </div>
                </div>
                <Link to="/app?demo=nordic">
                  <Button variant="outline" size="sm" className="text-xs py-1 px-3">
                    Launch Interactive 3D
                  </Button>
                </Link>
              </div>

            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};
