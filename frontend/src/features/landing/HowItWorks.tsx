import React from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, Cpu, Eye, ArrowRight, Check } from 'lucide-react';
import { Badge } from '../../components/common/Badge';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      number: '01',
      title: 'Upload Floor Plan',
      tagline: 'Multi-Format Ingestion',
      description: 'Upload your architectural drawing in PNG, JPG, or PDF format. High-resolution scans, clean blueprints, or technical drawings are supported.',
      icon: <UploadCloud className="w-6 h-6 text-[#1E372D]" />,
      details: ['PNG, JPG, PDF documents', 'Preserves raw blueprint aspect ratio', 'Drag-and-drop workspace'],
      visualBg: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=800&auto=format&fit=crop',
    },
    {
      number: '02',
      title: 'Analyse & Refine',
      tagline: 'Computer Vision & Calibration',
      description: 'The computer vision pipeline segments walls, detects door/window openings, and calculates room loops. Calibrate the real-world scale in seconds.',
      icon: <Cpu className="w-6 h-6 text-[#1E372D]" />,
      details: ['Adaptive thresholding & Canny edge detection', 'Interactive scale caliper tool', 'Wall thickness & height adjustments'],
      visualBg: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=800&auto=format&fit=crop',
    },
    {
      number: '03',
      title: 'Explore & Export in 3D',
      tagline: 'Real-Time Spatial Visualiser',
      description: 'Immerse yourself in a real Three.js 3D model. Inspect dollhouse cutaways, change flooring materials, place furniture, and export to GLB.',
      icon: <Eye className="w-6 h-6 text-[#1E372D]" />,
      details: ['Dollhouse & orthographic cameras', 'Flooring & wall material customization', 'One-click standard GLB 3D download'],
      visualBg: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=800&auto=format&fit=crop',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-[#FAF8F5] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="max-w-xl">
            <Badge variant="sage" className="mb-3">
              Streamlined Workflow
            </Badge>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#13241E]">
              How Plan2Reality Works
            </h2>
            <p className="text-sm sm:text-base text-[#555146] mt-3">
              Three straightforward stages taking your schematic design from a flat drawing into an interactive Three.js environment.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-[#6E9C88] bg-[#E1EBE6] px-3.5 py-2 rounded-lg border border-[#C2D6CD]">
            <span>Automated CV</span>
            <ArrowRight className="w-3.5 h-3.5" />
            <span>Scale Calibration</span>
            <ArrowRight className="w-3.5 h-3.5" />
            <span>3D Mesh</span>
          </div>
        </div>

        {/* 3 Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="bg-white rounded-2xl overflow-hidden border border-[#DCD3C6] shadow-subtle hover:shadow-card-hover transition-all duration-300 flex flex-col group"
            >
              {/* Image Preview with Number Badge */}
              <div className="relative h-48 overflow-hidden bg-[#1E372D]">
                <img
                  src={step.visualBg}
                  alt={step.title}
                  className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#13241E]/80 via-transparent to-transparent" />
                
                {/* Step badge */}
                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3 py-1 rounded-md text-xs font-mono font-bold text-[#1E372D] shadow-sm border border-[#EAE2D8]">
                  STEP {step.number}
                </div>

                {/* Subtitle tag */}
                <div className="absolute bottom-3 left-4 text-xs font-medium text-[#FAF8F5]">
                  {step.tagline}
                </div>
              </div>

              {/* Content Details */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#13241E] mb-2.5">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#555146] leading-relaxed mb-6">
                    {step.description}
                  </p>
                </div>

                <ul className="space-y-2 pt-4 border-t border-[#EAE2D8] text-xs text-[#3D5245]">
                  {step.details.map((detail) => (
                    <li key={detail} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-[#E1EBE6] text-[#2A4D3F] flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};
