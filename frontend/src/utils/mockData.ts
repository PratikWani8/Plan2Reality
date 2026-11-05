import { FloorPlanGeometry, Project } from '../types/geometry';

export const COMPACT_APARTMENT_GEOMETRY: FloorPlanGeometry = {
  version: '1.0.0',
  metadata: {
    sourceFileName: 'compact_nordic_apartment.png',
    sourceDimensions: { width: 1600, height: 1200 },
    scale: {
      pixelsPerMeter: 50,
      calibrated: true,
      referenceLineLengthMeters: 6.0,
    },
    defaultWallHeight: 2.8,
    defaultWallThickness: 0.18,
    units: 'meters',
    processedAt: '2026-03-15T10:00:00Z',
  },
  walls: [
    // Exterior perimeter (8m x 6m)
    { id: 'w_ext_n', start: { x: -4, z: -3 }, end: { x: 4, z: -3 }, height: 2.8, thickness: 0.22, isExterior: true, confidence: 0.96 },
    { id: 'w_ext_e', start: { x: 4, z: -3 }, end: { x: 4, z: 3 }, height: 2.8, thickness: 0.22, isExterior: true, confidence: 0.95 },
    { id: 'w_ext_s', start: { x: 4, z: 3 }, end: { x: -4, z: 3 }, height: 2.8, thickness: 0.22, isExterior: true, confidence: 0.97 },
    { id: 'w_ext_w', start: { x: -4, z: 3 }, end: { x: -4, z: -3 }, height: 2.8, thickness: 0.22, isExterior: true, confidence: 0.96 },
    // Interior divider between Living and Bedroom
    { id: 'w_int_1', start: { x: 0.5, z: -3 }, end: { x: 0.5, z: 1 }, height: 2.8, thickness: 0.15, isExterior: false, confidence: 0.91 },
    // Interior divider for Bathroom
    { id: 'w_int_2', start: { x: 0.5, z: 1 }, end: { x: 4, z: 1 }, height: 2.8, thickness: 0.15, isExterior: false, confidence: 0.92 },
    // Entry hallway partition
    { id: 'w_int_3', start: { x: -1.8, z: 1.2 }, end: { x: -1.8, z: 3 }, height: 2.8, thickness: 0.15, isExterior: false, confidence: 0.89 },
  ],
  rooms: [
    {
      id: 'room_living',
      name: 'Open Living & Kitchen',
      polygon: [
        { x: -4, z: -3 },
        { x: 0.5, z: -3 },
        { x: 0.5, z: 1 },
        { x: -1.8, z: 1.2 },
        { x: -1.8, z: 3 },
        { x: -4, z: 3 },
      ],
      area: 28.5,
      floorMaterial: 'hardwood_oak',
      wallColor: '#F5F2EB',
      confidence: 0.94,
    },
    {
      id: 'room_bedroom',
      name: 'Primary Bedroom',
      polygon: [
        { x: 0.5, z: -3 },
        { x: 4, z: -3 },
        { x: 4, z: 1 },
        { x: 0.5, z: 1 },
      ],
      area: 14.0,
      floorMaterial: 'carpet_beige',
      wallColor: '#EBE7DF',
      confidence: 0.92,
    },
    {
      id: 'room_bath',
      name: 'Ensuite Bath',
      polygon: [
        { x: 0.5, z: 1 },
        { x: 4, z: 1 },
        { x: 4, z: 3 },
        { x: 0.5, z: 3 },
      ],
      area: 7.0,
      floorMaterial: 'tile_marble',
      wallColor: '#F8F9FA',
      confidence: 0.88,
    },
  ],
  openings: [
    // Windows on South and North
    { id: 'win_1', type: 'window', wallId: 'w_ext_n', position: { x: -2, z: -3 }, width: 1.8, height: 1.4, sillHeight: 0.8, confidence: 0.95 },
    { id: 'win_2', type: 'window', wallId: 'w_ext_n', position: { x: 2.2, z: -3 }, width: 1.4, height: 1.4, sillHeight: 0.8, confidence: 0.93 },
    { id: 'win_3', type: 'window', wallId: 'w_ext_w', position: { x: -4, z: 0 }, width: 2.0, height: 1.6, sillHeight: 0.7, confidence: 0.91 },
    // Doors
    { id: 'door_main', type: 'door', wallId: 'w_ext_s', position: { x: -3.0, z: 3 }, width: 0.95, height: 2.1, sillHeight: 0, confidence: 0.96 },
    { id: 'door_bed', type: 'door', wallId: 'w_int_1', position: { x: 0.5, z: -0.8 }, width: 0.85, height: 2.1, sillHeight: 0, confidence: 0.92 },
    { id: 'door_bath', type: 'door', wallId: 'w_int_2', position: { x: 1.8, z: 1 }, width: 0.8, height: 2.1, sillHeight: 0, confidence: 0.90 },
  ],
  furniture: [
    { id: 'f_sofa', type: 'sofa', name: 'Boucle 3-Seater Sofa', position: { x: -2.2, y: 0, z: -1.0 }, rotation: { x: 0, y: Math.PI / 2, z: 0 }, dimensions: { width: 2.2, height: 0.8, depth: 0.9 } },
    { id: 'f_coffee', type: 'coffee_table', name: 'Solid Oak Coffee Table', position: { x: -1.2, y: 0, z: -1.0 }, rotation: { x: 0, y: 0, z: 0 }, dimensions: { width: 1.1, height: 0.4, depth: 0.6 } },
    { id: 'f_table', type: 'dining_table', name: 'Minimalist Dining Table', position: { x: -2.4, y: 0, z: 1.4 }, rotation: { x: 0, y: 0, z: 0 }, dimensions: { width: 1.6, height: 0.76, depth: 0.85 } },
    { id: 'f_bed', type: 'bed', name: 'King Size Platform Bed', position: { x: 2.3, y: 0, z: -1.8 }, rotation: { x: 0, y: 0, z: 0 }, dimensions: { width: 2.0, height: 0.9, depth: 2.1 } },
    { id: 'f_plant', type: 'plant', name: 'Monstera Deliciosa', position: { x: -3.5, y: 0, z: -2.4 }, rotation: { x: 0, y: 0, z: 0 }, dimensions: { width: 0.5, height: 1.2, depth: 0.5 } },
  ],
};

export const TWO_BEDROOM_HOME_GEOMETRY: FloorPlanGeometry = {
  version: '1.0.0',
  metadata: {
    sourceFileName: 'modern_suburban_residence.jpg',
    sourceDimensions: { width: 2000, height: 1400 },
    scale: {
      pixelsPerMeter: 48,
      calibrated: true,
      referenceLineLengthMeters: 10.0,
    },
    defaultWallHeight: 3.0,
    defaultWallThickness: 0.20,
    units: 'meters',
    processedAt: '2026-03-20T14:30:00Z',
  },
  walls: [
    { id: 'w_n', start: { x: -5.5, z: -4 }, end: { x: 5.5, z: -4 }, height: 3.0, thickness: 0.24, isExterior: true, confidence: 0.97 },
    { id: 'w_e', start: { x: 5.5, z: -4 }, end: { x: 5.5, z: 4 }, height: 3.0, thickness: 0.24, isExterior: true, confidence: 0.97 },
    { id: 'w_s', start: { x: 5.5, z: 4 }, end: { x: -5.5, z: 4 }, height: 3.0, thickness: 0.24, isExterior: true, confidence: 0.96 },
    { id: 'w_w', start: { x: -5.5, z: 4 }, end: { x: -5.5, z: -4 }, height: 3.0, thickness: 0.24, isExterior: true, confidence: 0.96 },
    // Center dividing wall
    { id: 'w_c1', start: { x: 0, z: -4 }, end: { x: 0, z: 4 }, height: 3.0, thickness: 0.16, isExterior: false, confidence: 0.94 },
    // Bedroom partition
    { id: 'w_c2', start: { x: 0, z: 0 }, end: { x: 5.5, z: 0 }, height: 3.0, thickness: 0.16, isExterior: false, confidence: 0.92 },
    // Kitchen divider
    { id: 'w_c3', start: { x: -5.5, z: 0.5 }, end: { x: -2.0, z: 0.5 }, height: 3.0, thickness: 0.16, isExterior: false, confidence: 0.90 },
  ],
  rooms: [
    {
      id: 'room_great',
      name: 'Great Room & Lounge',
      polygon: [{ x: -5.5, z: -4 }, { x: 0, z: -4 }, { x: 0, z: 0.5 }, { x: -5.5, z: 0.5 }],
      area: 24.7,
      floorMaterial: 'hardwood_walnut',
      confidence: 0.95,
    },
    {
      id: 'room_chef_kitchen',
      name: 'Chef Kitchen & Dining',
      polygon: [{ x: -5.5, z: 0.5 }, { x: 0, z: 0.5 }, { x: 0, z: 4 }, { x: -5.5, z: 4 }],
      area: 19.2,
      floorMaterial: 'tile_marble',
      confidence: 0.93,
    },
    {
      id: 'room_master_suite',
      name: 'Master Suite',
      polygon: [{ x: 0, z: -4 }, { x: 5.5, z: -4 }, { x: 5.5, z: 0 }, { x: 0, z: 0 }],
      area: 22.0,
      floorMaterial: 'hardwood_oak',
      confidence: 0.95,
    },
    {
      id: 'room_guest_suite',
      name: 'Guest Bedroom / Office',
      polygon: [{ x: 0, z: 0 }, { x: 5.5, z: 0 }, { x: 5.5, z: 4 }, { x: 0, z: 4 }],
      area: 22.0,
      floorMaterial: 'carpet_beige',
      confidence: 0.94,
    },
  ],
  openings: [
    { id: 'w1', type: 'window', position: { x: -3.0, z: -4 }, width: 2.4, height: 1.8, sillHeight: 0.6, confidence: 0.96 },
    { id: 'w2', type: 'window', position: { x: 2.8, z: -4 }, width: 2.0, height: 1.8, sillHeight: 0.6, confidence: 0.95 },
    { id: 'w3', type: 'window', position: { x: 5.5, z: 2.0 }, width: 1.6, height: 1.4, sillHeight: 0.8, confidence: 0.92 },
    { id: 'w4', type: 'window', position: { x: -5.5, z: 2.2 }, width: 2.0, height: 1.4, sillHeight: 0.8, confidence: 0.94 },
    { id: 'd_front', type: 'door', position: { x: -1.0, z: 4 }, width: 1.0, height: 2.2, sillHeight: 0, confidence: 0.97 },
    { id: 'd_mbed', type: 'door', position: { x: 0, z: -1.5 }, width: 0.9, height: 2.1, sillHeight: 0, confidence: 0.93 },
    { id: 'd_gbed', type: 'door', position: { x: 0, z: 1.8 }, width: 0.9, height: 2.1, sillHeight: 0, confidence: 0.92 },
  ],
  furniture: [
    { id: 'f1', type: 'sofa', name: 'L-Shaped Sectional', position: { x: -2.8, y: 0, z: -2.0 }, rotation: { x: 0, y: 0, z: 0 }, dimensions: { width: 2.8, height: 0.85, depth: 2.0 } },
    { id: 'f2', type: 'coffee_table', name: 'Travertine Coffee Table', position: { x: -2.8, y: 0, z: -0.8 }, rotation: { x: 0, y: 0, z: 0 }, dimensions: { width: 1.2, height: 0.38, depth: 0.7 } },
    { id: 'f3', type: 'dining_table', name: '6-Seater Oak Dining Table', position: { x: -3.0, y: 0, z: 2.2 }, rotation: { x: 0, y: 0, z: 0 }, dimensions: { width: 2.0, height: 0.76, depth: 0.95 } },
    { id: 'f4', type: 'bed', name: 'Master Bed with Upholstered Headboard', position: { x: 2.8, y: 0, z: -2.2 }, rotation: { x: 0, y: 0, z: 0 }, dimensions: { width: 2.1, height: 1.1, depth: 2.2 } },
    { id: 'f5', type: 'desk', name: 'Executive Walnut Desk', position: { x: 2.8, y: 0, z: 2.2 }, rotation: { x: 0, y: 0, z: 0 }, dimensions: { width: 1.6, height: 0.75, depth: 0.8 } },
  ],
};

export const DEMO_PROJECTS: Project[] = [
  {
    id: 'demo-compact-apartment',
    name: 'Nordic Residence (Apt 4B)',
    description: 'Clean Scandinavian 1-bedroom flat with open-plan living, kitchen island, and ensuite bath.',
    createdAt: '2026-03-10T09:00:00Z',
    updatedAt: '2026-03-15T12:00:00Z',
    thumbnailUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=900&auto=format&fit=crop',
    originalImageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop',
    geometry: COMPACT_APARTMENT_GEOMETRY,
    status: 'completed',
  },
  {
    id: 'demo-two-bedroom-residence',
    name: 'The Glass Pavilion (Villa 12)',
    description: 'Contemporary two-bedroom layout with double height ceilings, floor-to-ceiling glass, and master suite.',
    createdAt: '2026-03-18T11:00:00Z',
    updatedAt: '2026-03-20T14:30:00Z',
    thumbnailUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=900&auto=format&fit=crop',
    originalImageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1200&auto=format&fit=crop',
    geometry: TWO_BEDROOM_HOME_GEOMETRY,
    status: 'completed',
  },
  {
    id: 'demo-modern-villa',
    name: 'Aura Waterfront Villa',
    description: 'Expansive single-story architectural estate with courtyard entry, cantilevered terrace, and open living spaces.',
    createdAt: '2026-03-22T08:00:00Z',
    updatedAt: '2026-03-24T16:00:00Z',
    thumbnailUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=900&auto=format&fit=crop',
    originalImageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200&auto=format&fit=crop',
    geometry: TWO_BEDROOM_HOME_GEOMETRY,
    status: 'completed',
  },
  {
    id: 'demo-studio-loft',
    name: 'Industrial Penthouse Loft',
    description: 'Converted loft space with raw polished concrete, exposed structural columns, and tailored joinery.',
    createdAt: '2026-03-25T13:00:00Z',
    updatedAt: '2026-03-26T17:15:00Z',
    thumbnailUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=900&auto=format&fit=crop',
    originalImageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200&auto=format&fit=crop',
    geometry: COMPACT_APARTMENT_GEOMETRY,
    status: 'completed',
  },
];
