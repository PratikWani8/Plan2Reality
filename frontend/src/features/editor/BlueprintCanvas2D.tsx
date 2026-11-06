import React, { useState, useRef, useEffect } from 'react';
import { 
  Ruler, 
  Layers, 
  Move, 
  Plus, 
  Eye, 
  RotateCcw, 
  Check, 
  AlertCircle,
  HelpCircle,
  MousePointer
} from 'lucide-react';
import { FloorPlanGeometry, Wall, Point2D } from '../../types/geometry';
import { Button } from '../../components/common/Button';

interface BlueprintCanvas2DProps {
  geometry: FloorPlanGeometry;
  imageUrl?: string;
  onUpdateGeometry: (updater: (prev: FloorPlanGeometry) => FloorPlanGeometry) => void;
  selectedWallId?: string | null;
  onSelectWall?: (wallId: string | null) => void;
}

export const BlueprintCanvas2D: React.FC<BlueprintCanvas2DProps> = ({
  geometry,
  imageUrl,
  onUpdateGeometry,
  selectedWallId,
  onSelectWall,
}) => {
  const [viewMode, setViewMode] = useState<'both' | 'image' | 'vector'>('both');
  const [activeTool, setActiveTool] = useState<'select' | 'calibrate' | 'addWall'>('select');
  
  // Caliper state
  const [caliperP1, setCaliperP1] = useState<Point2D | null>(null);
  const [caliperP2, setCaliperP2] = useState<Point2D | null>(null);
  const [knownLengthMeters, setKnownLengthMeters] = useState<number>(4.0);
  const [calibratingStep, setCalibratingStep] = useState<1 | 2 | 3>(1);

  // New wall drafting state
  const [draftStart, setDraftStart] = useState<Point2D | null>(null);

  // Dragging wall endpoint
  const [draggingEndpoint, setDraggingEndpoint] = useState<{ wallId: string; point: 'start' | 'end' } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Map 3D meter coordinates (centered around 0,0) to 2D canvas pixel coordinates
  const ppm = geometry.metadata.scale.pixelsPerMeter || 45.0;
  const canvasCenter = { x: 500, y: 380 };

  const toCanvas = (pt: Point2D) => ({
    x: canvasCenter.x + pt.x * ppm,
    y: canvasCenter.y + pt.z * ppm,
  });

  const fromCanvas = (cx: number, cy: number): Point2D => ({
    x: (cx - canvasCenter.x) / ppm,
    z: (cy - canvasCenter.y) / ppm,
  });

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = (e.clientX - rect.left - pan.x) / zoom;
    const rawY = (e.clientY - rect.top - pan.y) / zoom;
    const meterPt = fromCanvas(rawX, rawY);

    if (activeTool === 'calibrate') {
      if (calibratingStep === 1) {
        setCaliperP1(meterPt);
        setCalibratingStep(2);
      } else if (calibratingStep === 2) {
        setCaliperP2(meterPt);
        setCalibratingStep(3);
      }
    } else if (activeTool === 'addWall') {
      if (!draftStart) {
        setDraftStart(meterPt);
      } else {
        // Complete new wall
        const newWall: Wall = {
          id: `wall_${Date.now()}`,
          start: draftStart,
          end: meterPt,
          height: geometry.metadata.defaultWallHeight,
          thickness: geometry.metadata.defaultWallThickness,
          material: 'plaster_white',
          confidence: 0.95,
          isExterior: false,
        };
        onUpdateGeometry((prev) => ({
          ...prev,
          walls: [...prev.walls, newWall],
        }));
        setDraftStart(null);
        setActiveTool('select');
      }
    }
  };

  const handleApplyCalibration = () => {
    if (!caliperP1 || !caliperP2 || knownLengthMeters <= 0) return;
    const dx = caliperP2.x - caliperP1.x;
    const dz = caliperP2.z - caliperP1.z;
    const currentDistM = Math.hypot(dx, dz);
    if (currentDistM <= 0) return;

    // Rescale factor
    const scaleFactor = knownLengthMeters / currentDistM;
    const newPpm = ppm / scaleFactor;

    onUpdateGeometry((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        scale: {
          pixelsPerMeter: Math.round(newPpm * 10) / 10,
          calibrated: true,
          referenceLineLengthMeters: knownLengthMeters,
        },
      },
      walls: prev.walls.map((w) => ({
        ...w,
        start: { x: w.start.x * scaleFactor, z: w.start.z * scaleFactor },
        end: { x: w.end.x * scaleFactor, z: w.end.z * scaleFactor },
      })),
      rooms: prev.rooms.map((r) => ({
        ...r,
        polygon: r.polygon.map((p) => ({ x: p.x * scaleFactor, z: p.z * scaleFactor })),
        area: r.area ? Math.round(r.area * scaleFactor * scaleFactor * 10) / 10 : undefined,
      })),
    }));

    setCaliperP1(null);
    setCaliperP2(null);
    setCalibratingStep(1);
    setActiveTool('select');
  };

  const handleEndpointDrag = (e: React.MouseEvent, wallId: string, pointType: 'start' | 'end') => {
    e.stopPropagation();
    setDraggingEndpoint({ wallId, point: pointType });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      });
      return;
    }

    if (draggingEndpoint && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = (e.clientX - rect.left - pan.x) / zoom;
      const rawY = (e.clientY - rect.top - pan.y) / zoom;
      const meterPt = fromCanvas(rawX, rawY);

      onUpdateGeometry((prev) => ({
        ...prev,
        walls: prev.walls.map((w) => {
          if (w.id === draggingEndpoint.wallId) {
            return {
              ...w,
              [draggingEndpoint.point]: meterPt,
            };
          }
          return w;
        }),
      }));
    }
  };

  const handleMouseUp = () => {
    setDraggingEndpoint(null);
    setIsPanning(false);
  };

  return (
    <div className="w-full h-full relative select-none bg-[#0D0F0D] flex flex-col overflow-hidden">
      
      {/* 2D Canvas Controls Topbar */}
      <div className="h-12 bg-[#141614] border-b border-[#2B2C2B] px-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2">
          {/* Mode Selector */}
          <div className="flex items-center gap-1 bg-[#0E100E] p-1 rounded-lg border border-[#2B2C2B]">
            <button
              onClick={() => setViewMode('both')}
              className={`px-2.5 py-1 rounded text-xs transition ${
                viewMode === 'both' ? 'bg-[#1E372D] text-white' : 'text-[#888888] hover:text-white'
              }`}
            >
              Overlaid
            </button>
            <button
              onClick={() => setViewMode('image')}
              className={`px-2.5 py-1 rounded text-xs transition ${
                viewMode === 'image' ? 'bg-[#1E372D] text-white' : 'text-[#888888] hover:text-white'
              }`}
            >
              Original Plan
            </button>
            <button
              onClick={() => setViewMode('vector')}
              className={`px-2.5 py-1 rounded text-xs transition ${
                viewMode === 'vector' ? 'bg-[#1E372D] text-white' : 'text-[#888888] hover:text-white'
              }`}
            >
              Extracted Vector
            </button>
          </div>

          <span className="w-px h-4 bg-[#2B2C2B] mx-1" />

          {/* Tool selector */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTool('select')}
              className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition ${
                activeTool === 'select' ? 'bg-[#1E372D] text-white' : 'text-[#888888] hover:text-white'
              }`}
              title="Select & Move Wall Points"
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span>Select</span>
            </button>

            <button
              onClick={() => {
                setActiveTool('calibrate');
                setCalibratingStep(1);
                setCaliperP1(null);
                setCaliperP2(null);
              }}
              className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition ${
                activeTool === 'calibrate' ? 'bg-[#C27D56] text-white' : 'text-[#888888] hover:text-white'
              }`}
              title="Scale Caliper Tool"
            >
              <Ruler className="w-3.5 h-3.5" />
              <span>Calibrate Scale</span>
            </button>

            <button
              onClick={() => {
                setActiveTool('addWall');
                setDraftStart(null);
              }}
              className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition ${
                activeTool === 'addWall' ? 'bg-[#1E372D] text-white' : 'text-[#888888] hover:text-white'
              }`}
              title="Add New Wall"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Wall</span>
            </button>
          </div>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2 text-xs text-[#888888]">
          <button
            onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
            className="w-7 h-7 rounded bg-[#1A1C1A] hover:bg-[#2B2C2B] text-white flex items-center justify-center"
          >
            -
          </button>
          <span className="font-mono text-white text-[11px]">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
            className="w-7 h-7 rounded bg-[#1A1C1A] hover:bg-[#2B2C2B] text-white flex items-center justify-center"
          >
            +
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1.5 rounded bg-[#1A1C1A] hover:bg-[#2B2C2B] text-white"
            title="Reset View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseDown={(e) => {
          if (e.button === 1 || e.altKey) {
            setIsPanning(true);
            panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
          }
        }}
        className="flex-1 relative overflow-hidden cursor-crosshair"
      >
        <svg
          className="w-full h-full"
          onClick={handleSvgClick}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Background Blueprint Raster Image */}
          {(viewMode === 'both' || viewMode === 'image') && imageUrl && (
            <image
              href={imageUrl}
              x={canvasCenter.x - 450}
              y={canvasCenter.y - 300}
              width={900}
              height={600}
              opacity={viewMode === 'both' ? 0.65 : 1.0}
            />
          )}

          {/* Vector Overlays */}
          {(viewMode === 'both' || viewMode === 'vector') && (
            <g>
              {/* Room Polygons */}
              {geometry.rooms.map((room) => {
                const pts = room.polygon.map(toCanvas);
                const pointsStr = pts.map((p) => `${p.x},${p.y}`).join(' ');
                const cx = pts.reduce((acc, p) => acc + p.x, 0) / pts.length;
                const cy = pts.reduce((acc, p) => acc + p.y, 0) / pts.length;

                return (
                  <g key={room.id}>
                    <polygon
                      points={pointsStr}
                      fill="#467A65"
                      fillOpacity={0.22}
                      stroke="#467A65"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                    />
                    <text
                      x={cx}
                      y={cy}
                      fill="#FAF8F5"
                      fontSize={11}
                      fontFamily="sans-serif"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none drop-shadow"
                    >
                      {room.name} ({room.area}m²)
                    </text>
                  </g>
                );
              })}

              {/* Walls */}
              {geometry.walls.map((wall) => {
                const p1 = toCanvas(wall.start);
                const p2 = toCanvas(wall.end);
                const isSelected = selectedWallId === wall.id;

                return (
                  <g key={wall.id} onClick={(e) => {
                    e.stopPropagation();
                    onSelectWall?.(wall.id);
                  }}>
                    {/* Wall Thick Line */}
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={isSelected ? '#C27D56' : wall.isExterior ? '#6E9C88' : '#FAF8F5'}
                      strokeWidth={Math.max(4, wall.thickness * ppm)}
                      strokeLinecap="round"
                      className="hover:stroke-[#9DBEB0] cursor-pointer transition-colors"
                    />

                    {/* Interactive Endpoints Handles for Dragging */}
                    {activeTool === 'select' && (
                      <>
                        <circle
                          cx={p1.x}
                          cy={p1.y}
                          r={6}
                          fill="#C27D56"
                          stroke="#FAF8F5"
                          strokeWidth={2}
                          className="cursor-move hover:scale-125 transition-transform"
                          onMouseDown={(e) => handleEndpointDrag(e, wall.id, 'start')}
                        />
                        <circle
                          cx={p2.x}
                          cy={p2.y}
                          r={6}
                          fill="#C27D56"
                          stroke="#FAF8F5"
                          strokeWidth={2}
                          className="cursor-move hover:scale-125 transition-transform"
                          onMouseDown={(e) => handleEndpointDrag(e, wall.id, 'end')}
                        />
                      </>
                    )}
                  </g>
                );
              })}

              {/* Openings (Doors / Windows) */}
              {geometry.openings.map((op) => {
                const pos = toCanvas(op.position);
                return (
                  <circle
                    key={op.id}
                    cx={pos.x}
                    cy={pos.y}
                    r={op.type === 'door' ? 5 : 4}
                    fill={op.type === 'door' ? '#D4AF37' : '#5BC0BE'}
                    stroke="#141614"
                    strokeWidth={1.5}
                  />
                );
              })}
            </g>
          )}

          {/* Caliper Mode Measurement Line */}
          {activeTool === 'calibrate' && caliperP1 && (
            <g>
              <circle cx={toCanvas(caliperP1).x} cy={toCanvas(caliperP1).y} r={6} fill="#C27D56" />
              {caliperP2 && (
                <>
                  <circle cx={toCanvas(caliperP2).x} cy={toCanvas(caliperP2).y} r={6} fill="#C27D56" />
                  <line
                    x1={toCanvas(caliperP1).x}
                    y1={toCanvas(caliperP1).y}
                    x2={toCanvas(caliperP2).x}
                    y2={toCanvas(caliperP2).y}
                    stroke="#C27D56"
                    strokeWidth={2.5}
                    strokeDasharray="5 3"
                  />
                </>
              )}
            </g>
          )}

          {/* Draft Wall Line */}
          {activeTool === 'addWall' && draftStart && (
            <circle cx={toCanvas(draftStart).x} cy={toCanvas(draftStart).y} r={6} fill="#6E9C88" />
          )}
        </svg>

        {/* Caliper Calibration Floating Modal Box */}
        {activeTool === 'calibrate' && calibratingStep === 3 && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-[#141614] border border-[#C27D56] rounded-xl p-4 shadow-elevated z-30 max-w-sm w-full text-xs space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Ruler className="w-4 h-4 text-[#C27D56]" />
              <span>Confirm Scale Dimension</span>
            </div>
            <p className="text-[#888888]">
              Enter the true real-world distance between the two selected caliper points in physical meters:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                min="0.2"
                max="50"
                value={knownLengthMeters}
                onChange={(e) => setKnownLengthMeters(parseFloat(e.target.value) || 1)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-[#0E100E] border border-[#2B2C2B] text-white font-mono"
              />
              <span className="text-[#888888]">meters</span>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCaliperP1(null);
                  setCaliperP2(null);
                  setCalibratingStep(1);
                  setActiveTool('select');
                }}
              >
                Cancel
              </Button>
              <Button variant="terracotta" size="sm" onClick={handleApplyCalibration}>
                Apply Calibrated Scale
              </Button>
            </div>
          </div>
        )}

        {/* Helper Notification Banner */}
        <div className="absolute bottom-4 left-4 right-4 pointer-events-none flex justify-center">
          <div className="bg-[#141614]/90 backdrop-blur-md px-4 py-2 rounded-xl border border-[#2B2C2B] text-xs text-[#9DBEB0] flex items-center gap-2">
            {activeTool === 'select' && (
              <span>Drag the orange circular handles on wall ends to adjust alignment in 2D</span>
            )}
            {activeTool === 'calibrate' && calibratingStep < 3 && (
              <span>Click point 1 then point 2 on a known dimension line (e.g. 0.9m door opening)</span>
            )}
            {activeTool === 'addWall' && (
              <span>Click to place wall start, then click to place wall end</span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
