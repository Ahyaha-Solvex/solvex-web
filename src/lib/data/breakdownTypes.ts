export type BreakdownIssueType =
  | 'engine'
  | 'flat_tire'
  | 'battery'
  | 'overheat'
  | 'accident_minor';

export type BreakdownStatus =
  | 'pending'
  | 'accepted'
  | 'en_route'
  | 'on_scene'
  | 'completed'
  | 'declined';

export interface TowTruckProvider {
  id: string;
  name: string;
  unitCode: string;
  phone: string;
  rating: number;
  totalMissions: number;
  position: {
    lat: number;
    lng: number;
    heading: number;
  };
  isOnline: boolean;
  status: 'available' | 'busy';
}

export interface BreakdownRequest {
  id: string;
  userName: string;
  userPhone: string;
  vehicleModel: string;
  vehiclePlate: string;
  issueType: BreakdownIssueType;
  issueDescription: string;
  position: {
    lat: number;
    lng: number;
  };
  roadLabel: string;
  distanceKm: number;
  etaMinutes: number;
  priceDzd: number;
  status: BreakdownStatus;
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
  // GeoJSON [longitude, latitude] coordinates along the road
  routeCoordinates: [number, number][];
  currentProgress?: number; // 0 to 1 along route
}
