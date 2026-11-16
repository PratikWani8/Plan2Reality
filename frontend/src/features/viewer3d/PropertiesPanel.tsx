import React from 'react';
import { 
  Sliders, 
  Layers, 
  Palette, 
  Plus, 
  Trash2, 
  Ruler, 
  Info,
  Maximize2,
  Box,
  Home,
  Check
} from 'lucide-react';
import { FloorPlanGeometry, Room, Wall, FurnitureItem } from '../../types/geometry';
import { SelectedEntity } from './types';

interface PropertiesPanelProps {
  geometry: FloorPlanGeometry;
  selectedEntity: SelectedEntity;
  onUpdateGeometry: (updater: (prev: FloorPlanGeometry) => FloorPlanGeometry) => void;
  onSelectEntity: (entity: SelectedEntity) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  geometry,
  selectedEntity,
  onUpdateGeometry,
  onSelectEntity,
}) => {
  const selectedWall = selectedEntity.type === 'wall'
    ? geometry.walls.find((w) => w.id === selectedEntity.id)
    : null;

  const selectedRoom = selectedEntity.type === 'room'
    ? geometry.rooms.find((r) => r.id === selectedEntity.id)
    : null;

  const selectedFurniture = selectedEntity.type === 'furniture'
    ? geometry.furniture?.find((f) => f.id === selectedEntity.id)
    : null;

  // Add a procedural furniture piece to the scene
  const handleAddFurniture = (type: FurnitureItem['type'], name: string) => {
    const newItem: FurnitureItem = {
      id: `furn_${Date.now()}`,
      type,
      name,
      position: { x: (Math.random() - 0.5) * 3, y: 0, z: (Math.random() - 0.5) * 3 },
      rotation: { x: 0, y: 0, z: 0 },
      dimensions: type === 'sofa'
        ? { width: 2.2, height: 0.8, depth: 0.9 }
        : type === 'bed'
        ? { width: 2.0, height: 0.9, depth: 2.1 }
        : type === 'dining_table'
        ? { width: 1.8, height: 0.76, depth: 0.9 }
        : type === 'desk'
        ? { width: 1.4, height: 0.75, depth: 0.7 }
        : { width: 0.5, height: 1.1, depth: 0.5 },
    };

    onUpdateGeometry((prev) => ({
      ...prev,
      furniture: [...(prev.furniture || []), newItem],
    }));

    onSelectEntity({ type: 'furniture', id: newItem.id });
  };

  const handleDeleteFurniture = (id: string) => {
    onUpdateGeometry((prev) => ({
      ...prev,
      furniture: prev.furniture.filter((f) => f.id !== id),
    }));
    onSelectEntity({ type: null, id: null });
  };

  const floorMaterials = [
    { id: 'hardwood_oak', label: 'Nordic Oak' },
    { id: 'hardwood_walnut', label: 'Walnut' },
    { id: 'tile_marble', label: 'Carrara Marble' },
    { id: 'polished_concrete', label: 'Concrete' },
    { id: 'carpet_beige', label: 'Wool Carpet' },
  ];

  return (
    <div className="w-80 border-l border-[#2B2C2B] bg-[#1A1C1A] text-[#FAF8F5] p-5 flex flex-col justify-between shrink-0 overflow-y-auto font-sans select-none">
      <div className="space-y-6">
        
        {/* Panel Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2B2C2B]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#6E9C88]" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Properties Inspector
            </span>
          </div>
          {selectedEntity.type && (
            <button
              onClick={() => onSelectEntity({ type: null, id: null })}
              className="text-[11px] text-[#888888] hover:text-white underline"
            >
              Clear
            </button>
          )}
        </div>

        {/* Global Blueprint Parametric Dimensions (When nothing specific is selected) */}
        {!selectedEntity.type && (
          <div className="space-y-5">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#888888] font-bold block mb-1">
                Global Wall Height
              </span>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-[#888888]">Elevation</span>
                <span className="font-mono text-[#9DBEB0] font-semibold">
                  {geometry.metadata.defaultWallHeight.toFixed(2)} m
                </span>
              </div>
              <input
                type="range"
                min="2.2"
                max="4.5"
                step="0.05"
                value={geometry.metadata.defaultWallHeight}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateGeometry((prev) => ({
                    ...prev,
                    metadata: { ...prev.metadata, defaultWallHeight: val },
                    walls: prev.walls.map((w) => ({ ...w, height: val })),
                  }));
                }}
                className="w-full accent-[#467A65] bg-[#111311] h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#888888] font-bold block mb-1">
                Global Wall Thickness
              </span>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-[#888888]">Structural depth</span>
                <span className="font-mono text-[#9DBEB0] font-semibold">
                  {geometry.metadata.defaultWallThickness.toFixed(2)} m
                </span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.45"
                step="0.01"
                value={geometry.metadata.defaultWallThickness}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateGeometry((prev) => ({
                    ...prev,
                    metadata: { ...prev.metadata, defaultWallThickness: val },
                    walls: prev.walls.map((w) => ({ ...w, thickness: val })),
                  }));
                }}
                className="w-full accent-[#467A65] bg-[#111311] h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Quick Add Furniture Presets */}
            <div className="pt-4 border-t border-[#2B2C2B]">
              <span className="text-[11px] uppercase tracking-wider text-[#888888] font-bold block mb-3">
                Place Furniture Model
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => handleAddFurniture('sofa', 'Contemporary Sofa')}
                  className="p-2 rounded-lg bg-[#111311] border border-[#2B2C2B] hover:border-[#467A65] text-left transition flex items-center justify-between"
                >
                  <span>+ Sofa</span>
                </button>
                <button
                  onClick={() => handleAddFurniture('bed', 'King Platform Bed')}
                  className="p-2 rounded-lg bg-[#111311] border border-[#2B2C2B] hover:border-[#467A65] text-left transition flex items-center justify-between"
                >
                  <span>+ Bed</span>
                </button>
                <button
                  onClick={() => handleAddFurniture('dining_table', 'Oak Dining Table')}
                  className="p-2 rounded-lg bg-[#111311] border border-[#2B2C2B] hover:border-[#467A65] text-left transition flex items-center justify-between"
                >
                  <span>+ Dining</span>
                </button>
                <button
                  onClick={() => handleAddFurniture('plant', 'Terracotta Plant')}
                  className="p-2 rounded-lg bg-[#111311] border border-[#2B2C2B] hover:border-[#467A65] text-left transition flex items-center justify-between"
                >
                  <span>+ Plant</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Selected Wall Inspector */}
        {selectedWall && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 rounded-xl bg-[#1E372D]/40 border border-[#34604F]/60">
              <span className="text-[10px] uppercase font-bold text-[#9DBEB0] block">Wall Entity</span>
              <span className="text-sm font-semibold text-white">{selectedWall.id}</span>
              <div className="text-xs text-[#9DBEB0] mt-1 font-mono">
                Start: ({selectedWall.start.x.toFixed(2)}, {selectedWall.start.z.toFixed(2)}) <br />
                End: ({selectedWall.end.x.toFixed(2)}, {selectedWall.end.z.toFixed(2)})
              </div>
            </div>

            <div>
              <label className="text-xs text-[#888888] block mb-1">Height (meters)</label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="6.0"
                value={selectedWall.height}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 2.8;
                  onUpdateGeometry((prev) => ({
                    ...prev,
                    walls: prev.walls.map((w) => (w.id === selectedWall.id ? { ...w, height: val } : w)),
                  }));
                }}
                className="w-full px-3 py-2 rounded-lg bg-[#111311] border border-[#2B2C2B] text-white text-xs font-mono focus:outline-none focus:border-[#467A65]"
              />
            </div>

            <div>
              <label className="text-xs text-[#888888] block mb-1">Thickness (meters)</label>
              <input
                type="number"
                step="0.02"
                min="0.05"
                max="0.6"
                value={selectedWall.thickness}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0.2;
                  onUpdateGeometry((prev) => ({
                    ...prev,
                    walls: prev.walls.map((w) => (w.id === selectedWall.id ? { ...w, thickness: val } : w)),
                  }));
                }}
                className="w-full px-3 py-2 rounded-lg bg-[#111311] border border-[#2B2C2B] text-white text-xs font-mono focus:outline-none focus:border-[#467A65]"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-[#888888]">Exterior Wall</span>
              <input
                type="checkbox"
                checked={!!selectedWall.isExterior}
                onChange={(e) => {
                  const val = e.target.checked;
                  onUpdateGeometry((prev) => ({
                    ...prev,
                    walls: prev.walls.map((w) => (w.id === selectedWall.id ? { ...w, isExterior: val } : w)),
                  }));
                }}
                className="accent-[#467A65] w-4 h-4 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Selected Room Inspector */}
        {selectedRoom && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 rounded-xl bg-[#1E372D]/40 border border-[#34604F]/60">
              <span className="text-[10px] uppercase font-bold text-[#9DBEB0] block">Room Entity</span>
              <input
                type="text"
                value={selectedRoom.name}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateGeometry((prev) => ({
                    ...prev,
                    rooms: prev.rooms.map((r) => (r.id === selectedRoom.id ? { ...r, name: val } : r)),
                  }));
                }}
                className="w-full mt-1 bg-transparent border-b border-[#34604F] text-sm font-semibold text-white focus:outline-none focus:border-[#9DBEB0]"
              />
              <span className="text-xs text-[#9DBEB0] font-mono mt-1 block">
                Calculated Footprint: {selectedRoom.area?.toFixed(1) || '—'} m²
              </span>
            </div>

            <div>
              <span className="text-xs text-[#888888] block mb-2 font-medium">
                Surface Flooring Material
              </span>
              <div className="space-y-1.5">
                {floorMaterials.map((mat) => (
                  <button
                    key={mat.id}
                    onClick={() => {
                      onUpdateGeometry((prev) => ({
                        ...prev,
                        rooms: prev.rooms.map((r) =>
                          r.id === selectedRoom.id ? { ...r, floorMaterial: mat.id as any } : r
                        ),
                      }));
                    }}
                    className={`w-full p-2.5 rounded-lg border text-xs text-left transition flex items-center justify-between ${
                      (selectedRoom.floorMaterial || 'hardwood_oak') === mat.id
                        ? 'bg-[#1E372D] border-[#467A65] text-white'
                        : 'bg-[#111311] border-[#2B2C2B] text-[#888888] hover:text-white'
                    }`}
                  >
                    <span>{mat.label}</span>
                    {(selectedRoom.floorMaterial || 'hardwood_oak') === mat.id && (
                      <Check className="w-3.5 h-3.5 text-[#6E9C88]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Selected Furniture Inspector */}
        {selectedFurniture && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 rounded-xl bg-[#1E372D]/40 border border-[#34604F]/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#9DBEB0] block">Furniture Entity</span>
                <span className="text-sm font-semibold text-white">{selectedFurniture.name}</span>
              </div>
              <button
                onClick={() => handleDeleteFurniture(selectedFurniture.id)}
                className="p-1.5 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-900/60 transition"
                title="Remove furniture"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-[#888888] block mb-1">Pos X (m)</label>
                <input
                  type="number"
                  step="0.2"
                  value={selectedFurniture.position.x}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    onUpdateGeometry((prev) => ({
                      ...prev,
                      furniture: prev.furniture.map((f) =>
                        f.id === selectedFurniture.id ? { ...f, position: { ...f.position, x: val } } : f
                      ),
                    }));
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#111311] border border-[#2B2C2B] text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#888888] block mb-1">Pos Z (m)</label>
                <input
                  type="number"
                  step="0.2"
                  value={selectedFurniture.position.z}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    onUpdateGeometry((prev) => ({
                      ...prev,
                      furniture: prev.furniture.map((f) =>
                        f.id === selectedFurniture.id ? { ...f, position: { ...f.position, z: val } } : f
                      ),
                    }));
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#111311] border border-[#2B2C2B] text-white text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-[#888888] block mb-1">Rotation Angle (Degrees)</label>
              <input
                type="range"
                min="0"
                max="360"
                step="15"
                value={Math.round((selectedFurniture.rotation.y * 180) / Math.PI)}
                onChange={(e) => {
                  const rad = (parseFloat(e.target.value) * Math.PI) / 180;
                  onUpdateGeometry((prev) => ({
                    ...prev,
                    furniture: prev.furniture.map((f) =>
                      f.id === selectedFurniture.id ? { ...f, rotation: { ...f.rotation, y: rad } } : f
                    ),
                  }));
                }}
                className="w-full accent-[#467A65] bg-[#111311] h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        )}

      </div>

      {/* Summary Footer */}
      <div className="pt-4 border-t border-[#2B2C2B] text-xs text-[#888888] space-y-1">
        <div className="flex justify-between">
          <span>Active Walls:</span>
          <span className="text-white font-mono">{geometry.walls.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Rooms:</span>
          <span className="text-white font-mono">{geometry.rooms.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Openings:</span>
          <span className="text-white font-mono">{geometry.openings.length}</span>
        </div>
      </div>
    </div>
  );
};
