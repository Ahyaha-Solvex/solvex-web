import type { BreakdownRequest, TowTruckProvider, BreakdownIssueType } from '../breakdownTypes';

export const SEED_TOW_PROVIDER: TowTruckProvider = {
  id: 'tow-provider-1',
  name: 'Dépannage Express Bouira',
  unitCode: 'DEP-07',
  phone: '+213 555 12 34 88',
  rating: 4.9,
  totalMissions: 142,
  position: {
    lat: 36.3700,
    lng: 3.8950,
    heading: 55,
  },
  isOnline: true,
  status: 'available',
};

export const SEED_BREAKDOWN_REQUESTS: BreakdownRequest[] = [
  {
    id: 'req-001',
    userName: 'Karim Zitouni',
    userPhone: '+213 661 88 42 19',
    vehicleModel: 'Renault Symbol (2019)',
    vehiclePlate: '16-119-02194',
    issueType: 'engine',
    issueDescription: 'Surchauffe moteur brutale avec fumée blanche sur la bande d’arrêt d’urgence',
    position: {
      lat: 36.3768,
      lng: 3.9180,
    },
    roadLabel: 'RN5 km 124, sens Alger -> Bouira',
    distanceKm: 3.1,
    etaMinutes: 6,
    priceDzd: 4500,
    status: 'pending',
    createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    routeCoordinates: [
      [36.3700, 3.8950],
      [36.3718, 3.9005],
      [36.3735, 3.9065],
      [36.3752, 3.9125],
      [36.3768, 3.9180],
    ],
  },
  {
    id: 'req-002',
    userName: 'Amina Mansouri',
    userPhone: '+213 770 45 90 12',
    vehicleModel: 'Peugeot 208 (2021)',
    vehiclePlate: '10-221-08512',
    issueType: 'flat_tire',
    issueDescription: 'Double crevaison flanc droit après nid-de-poule, cric d’origine inopérant',
    position: {
      lat: 36.3885,
      lng: 3.8790,
    },
    roadLabel: 'Autoroute Est-Ouest A1, PK 82',
    distanceKm: 4.8,
    etaMinutes: 9,
    priceDzd: 5500,
    status: 'pending',
    createdAt: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
    routeCoordinates: [
      [36.3700, 3.8950],
      [36.3745, 3.8910],
      [36.3795, 3.8860],
      [36.3840, 3.8820],
      [36.3885, 3.8790],
    ],
  },
  {
    id: 'req-003',
    userName: 'Youcef Belkacem',
    userPhone: '+213 552 73 11 05',
    vehicleModel: 'Toyota Hilux (2018)',
    vehiclePlate: '15-118-03419',
    issueType: 'battery',
    issueDescription: 'Batterie à plat suite à arrêt feux de détresse prolongés, démarreur muet',
    position: {
      lat: 36.3620,
      lng: 3.9050,
    },
    roadLabel: 'Route de Aïn El Hadjar, km 4',
    distanceKm: 2.4,
    etaMinutes: 5,
    priceDzd: 3500,
    status: 'pending',
    createdAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    routeCoordinates: [
      [36.3700, 3.8950],
      [36.3670, 3.8980],
      [36.3645, 3.9015],
      [36.3620, 3.9050],
    ],
  },
];

const RANDOM_NAMES = [
  'Samir Haddad',
  'Leila Benali',
  'Mohamed Cherif',
  'Nadia Saidi',
  'Khaled Boukhalfa',
];

const RANDOM_VEHICLES = [
  { model: 'Dacia Duster (2020)', plate: '16-332-05189' },
  { model: 'Hyundai Accent (2017)', plate: '09-115-09214' },
  { model: 'Volkswagen Golf 7 (2018)', plate: '16-440-12048' },
  { model: 'Kia Picanto (2019)', plate: '35-112-07431' },
];

const RANDOM_ISSUES: { type: BreakdownIssueType; desc: string; basePrice: number }[] = [
  {
    type: 'overheat',
    desc: 'Voyant rouge température liquide de refroidissement allumé, arrêt immédiat',
    basePrice: 4000,
  },
  {
    type: 'accident_minor',
    desc: 'Accrochage léger arrière, pare-choc frottant contre le pneu arrière gauche',
    basePrice: 6500,
  },
  {
    type: 'battery',
    desc: 'Alternateur défaillant, perte totale d’alimentation électrique sur autoroute',
    basePrice: 3800,
  },
  {
    type: 'engine',
    desc: 'Bruit anormal de courroie suivi d’une perte totale de puissance motrice',
    basePrice: 5000,
  },
];

export function createSimulatedRequest(providerPos: { lat: number; lng: number }): BreakdownRequest {
  const name = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
  const veh = RANDOM_VEHICLES[Math.floor(Math.random() * RANDOM_VEHICLES.length)];
  const issue = RANDOM_ISSUES[Math.floor(Math.random() * RANDOM_ISSUES.length)];

  // Generate coordinate offset ~ 1.5 to 5 km away
  const latOffset = (Math.random() - 0.5) * 0.035;
  const lngOffset = (Math.random() - 0.5) * 0.035;
  const targetLat = Number((providerPos.lat + latOffset).toFixed(5));
  const targetLng = Number((providerPos.lng + lngOffset).toFixed(5));

  const distanceKm = Number((Math.sqrt(latOffset * latOffset + lngOffset * lngOffset) * 111).toFixed(1));
  const etaMinutes = Math.max(3, Math.round(distanceKm * 2));
  const reqId = `req-${Date.now().toString().slice(-4)}`;

  // Generate intermediate points along line
  const steps = 4;
  const routeCoordinates: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Add minor natural curve
    const wobble = Math.sin(t * Math.PI) * 0.003;
    routeCoordinates.push([
      Number((providerPos.lat + latOffset * t + wobble).toFixed(5)),
      Number((providerPos.lng + lngOffset * t + wobble).toFixed(5)),
    ]);
  }

  return {
    id: reqId,
    userName: name,
    userPhone: `+213 6${Math.floor(10000000 + Math.random() * 90000000)}`,
    vehicleModel: veh.model,
    vehiclePlate: veh.plate,
    issueType: issue.type,
    issueDescription: issue.desc,
    position: {
      lat: targetLat,
      lng: targetLng,
    },
    roadLabel: `RN5 / A1 Secteur Bouira (km ${(Math.random() * 20 + 100).toFixed(0)})`,
    distanceKm: Math.max(1.2, distanceKm),
    etaMinutes,
    priceDzd: issue.basePrice + Math.round(distanceKm * 250),
    status: 'pending',
    createdAt: new Date().toISOString(),
    routeCoordinates,
  };
}
