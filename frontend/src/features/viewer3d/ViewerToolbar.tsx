import React from 'react';
import { 
  Orbit, 
  Layers, 
  Box, 
  Eye, 
  RotateCcw, 
  Maximize, 
  Grid, 
  Download, 
  Sliders, 
  Camera,
  DoorOpen,
  Armchair,
  FileJson,
  Sun
} from 'lucide-react';
import { CameraViewPreset, ViewerSettings } from './types';

interface ViewerToolbarProps {
  settings: ViewerSettings;
  onUpdateSettings: (updater: (prev: ViewerSettings) => ViewerSettings) => void;
  onResetCamera: () => void;
  onExportGLB: () => void;
  onExportJSON: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  exportLoading?: boolean;
}

export const ViewerToolbar: React.FC<ViewerToolbarProps> = ({
  settings,
  onUpdateSettings,
  onResetCamera,
  onExportGLB,
  onExportJSON,
  onToggleFullscreen,
  isFullscreen,
  exportLoading,
}) => {
  const cameraPresets: { id: CameraViewPreset; label: string; icon: string }[] = [
    { id: 'orbit', label: 'Orbit 3D', icon: '🔄' },
    { id: 'topDown', label: 'Top-Down', icon: '📐' },
    { id: 'dollhouse', label: 'Dollhouse', icon: '🏠' },
    { id: 'front', label: 'Front View', icon: '⬆️' },
    { id: 'side', label: 'Side View', icon: '➡️' },
    { id: 'firstPerson', label: 'Walkthrough', icon: '🚶' },
  ];

  return (
    <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
      
      {/* Left: Camera Preset Switcher */}
      <div className="flex items-center gap-1 bg-[#1A1C1A]/90 backdrop-blur-md p-1.5 rounded-xl border border-[#2B2C2B] shadow-elevated pointer-events-auto">
        {cameraPresets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onUpdateSettings((prev) => ({ ...prev, cameraPreset: preset.id }))}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              settings.cameraPreset === preset.id
                ? 'bg-[#1E372D] text-white shadow-xs border border-[#467A65]'
                : 'text-[#9DBEB0] hover:text-white hover:bg-[#2B2C2B]/50'
            }`}
            title={preset.label}
          >
            <span>{preset.icon}</span>
            <span className="hidden sm:inline">{preset.label}</span>
          </button>
        ))}
      </div>

      {/* Right: Visibility Toggles & Actions */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Visibility Popover / Quick Toggles */}
        <div className="flex items-center gap-1 bg-[#1A1C1A]/90 backdrop-blur-md p-1.5 rounded-xl border border-[#2B2C2B] shadow-elevated">
          {/* Walls Toggle */}
          <button
            onClick={() => onUpdateSettings((p) => ({ ...p, showWalls: !p.showWalls }))}
            className={`p-2 rounded-lg text-xs transition ${
              settings.showWalls ? 'text-[#9DBEB0] bg-[#1E372D]/60' : 'text-[#555146] hover:text-white'
            }`}
            title="Toggle Walls"
          >
            <Box className="w-4 h-4" />
          </button>

          {/* Floors Toggle */}
          <button
            onClick={() => onUpdateSettings((p) => ({ ...p, showFloors: !p.showFloors }))}
            className={`p-2 rounded-lg text-xs transition ${
              settings.showFloors ? 'text-[#9DBEB0] bg-[#1E372D]/60' : 'text-[#555146] hover:text-white'
            }`}
            title="Toggle Floors"
          >
            <Layers className="w-4 h-4" />
          </button>

          {/* Openings Toggle */}
          <button
            onClick={() => onUpdateSettings((p) => ({ ...p, showOpenings: !p.showOpenings }))}
            className={`p-2 rounded-lg text-xs transition ${
              settings.showOpenings ? 'text-[#9DBEB0] bg-[#1E372D]/60' : 'text-[#555146] hover:text-white'
            }`}
            title="Toggle Doors & Windows"
          >
            <DoorOpen className="w-4 h-4" />
          </button>

          {/* Furniture Toggle */}
          <button
            onClick={() => onUpdateSettings((p) => ({ ...p, showFurniture: !p.showFurniture }))}
            className={`p-2 rounded-lg text-xs transition ${
              settings.showFurniture ? 'text-[#9DBEB0] bg-[#1E372D]/60' : 'text-[#555146] hover:text-white'
            }`}
            title="Toggle Furniture"
          >
            <Armchair className="w-4 h-4" />
          </button>

          {/* Grid Toggle */}
          <button
            onClick={() => onUpdateSettings((p) => ({ ...p, showGrid: !p.showGrid }))}
            className={`p-2 rounded-lg text-xs transition ${
              settings.showGrid ? 'text-[#9DBEB0] bg-[#1E372D]/60' : 'text-[#555146] hover:text-white'
            }`}
            title="Toggle Ground Grid"
          >
            <Grid className="w-4 h-4" />
          </button>

          {/* Wireframe Toggle */}
          <button
            onClick={() => onUpdateSettings((p) => ({ ...p, wireframe: !p.wireframe }))}
            className={`px-2 py-1 rounded text-[11px] font-mono transition ${
              settings.wireframe ? 'bg-[#C27D56] text-white' : 'text-[#888888] hover:text-white'
            }`}
            title="Toggle Wireframe Mode"
          >
            WF
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 bg-[#1A1C1A]/90 backdrop-blur-md p-1.5 rounded-xl border border-[#2B2C2B] shadow-elevated">
          {/* Reset Camera */}
          <button
            onClick={onResetCamera}
            className="p-2 rounded-lg text-[#9DBEB0] hover:text-white hover:bg-[#2B2C2B] transition"
            title="Reset Camera Position"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={onToggleFullscreen}
            className="p-2 rounded-lg text-[#9DBEB0] hover:text-white hover:bg-[#2B2C2B] transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            <Maximize className="w-4 h-4" />
          </button>

          <span className="w-px h-4 bg-[#2B2C2B] mx-1" />

          {/* Export JSON Geometry */}
          <button
            onClick={onExportJSON}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#9DBEB0] hover:text-white hover:bg-[#2B2C2B] flex items-center gap-1.5 transition"
            title="Export Spatial Geometry JSON"
          >
            <FileJson className="w-3.5 h-3.5 text-[#6E9C88]" />
            <span className="hidden md:inline">JSON</span>
          </button>

          {/* Export GLB Model */}
          <button
            onClick={onExportGLB}
            disabled={exportLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#C27D56] hover:bg-[#AD6B46] text-white flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
            title="Export Three.js Mesh as Standard GLB"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export GLB</span>
          </button>
        </div>
      </div>

    </div>
  );
};
