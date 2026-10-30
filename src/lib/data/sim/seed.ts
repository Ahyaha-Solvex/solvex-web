import type {
  Ambulance,
  HospitalOption,
  NearbyPerson,
  NearbyVehicle,
  Occupant,
  Position,
  PrepItem,
} from '../types';

export const SEED_POSITION: Position = {
  lat: 36.3741,
  lng: 3.9012,
  roadLabel: 'RN5, km 112, towards Bouira',
};

export const SEED_HOSPITALS: HospitalOption[] = [
  {
    id: 'hosp-bouira',
    name: 'Hôpital Bouira (seed)',
    etaSeconds: 660, // 11 min
    freeBeds: 4,
    specialties: ['Urgences', 'Traumatologie', 'Chirurgie Générale'],
    score: 0.94,
    reasons: [
      'Centre de traumatologie le plus proche',
      'Box de déchocage disponible immédiatement',
      'Stock de sang O+ vérifié',
    ],
    recommended: true,
  },
  {
    id: 'chu-blida',
    name: 'CHU Blida (seed)',
    etaSeconds: 2400, // 40 min
    freeBeds: 12,
    specialties: ['Neurochirurgie', 'Grands Brûlés', 'Polytraumatisés'],
    score: 0.81,
    reasons: [
      'Plateau neurochirurgie de référence',
      'Unité de soins intensifs polyvalente',
    ],
    recommended: false,
  },
  {
    id: 'chu-tizi-ouzou',
    name: 'CHU Tizi Ouzou (seed)',
    etaSeconds: 2880, // 48 min
    freeBeds: 9,
    specialties: ['Chirurgie Vasculaire', 'Réanimation'],
    score: 0.74,
    reasons: ['Équipe chirurgie thoracique d’astreinte'],
    recommended: false,
  },
];

export const SEED_AMBULANCES: Ambulance[] = [
  {
    id: 'amb-102',
    unit: 'Ambulance PC-102 (Bouira)',
    status: 'available',
    lat: 36.345,
    lng: 3.882,
    etaSeconds: 660,
  },
  {
    id: 'amb-105',
    unit: 'Ambulance PC-105 (El Asnam)',
    status: 'available',
    lat: 36.402,
    lng: 3.945,
    etaSeconds: 900,
  },
  {
    id: 'amb-108',
    unit: 'Ambulance PC-108 (Aomar)',
    status: 'available',
    lat: 36.418,
    lng: 3.82,
    etaSeconds: 1200,
  },
];

export const SEED_NEARBY_PEOPLE: NearbyPerson[] = [
  {
    id: 'helper-1',
    kind: 'helper_medic',
    lat: 36.3725,
    lng: 3.899,
    distanceM: 280,
    accepted: false,
  },
  {
    id: 'helper-2',
    kind: 'helper_first_aider',
    lat: 36.376,
    lng: 3.9035,
    distanceM: 320,
    accepted: false,
  },
  {
    id: 'helper-3',
    kind: 'volunteer',
    lat: 36.371,
    lng: 3.906,
    distanceM: 580,
    accepted: false,
  },
  {
    id: 'helper-4',
    kind: 'volunteer',
    lat: 36.3775,
    lng: 3.898,
    distanceM: 650,
    accepted: false,
  },
  {
    id: 'helper-5',
    kind: 'volunteer',
    lat: 36.369,
    lng: 3.902,
    distanceM: 750,
    accepted: false,
  },
];

export const SEED_NEARBY_VEHICLES: NearbyVehicle[] = [
  { id: 'veh-1', lat: 36.3745, lng: 3.9018, headingDeg: 260, kind: 'car' },
  { id: 'veh-2', lat: 36.3735, lng: 3.9005, headingDeg: 80, kind: 'truck' },
  { id: 'veh-3', lat: 36.3752, lng: 3.9025, headingDeg: 260, kind: 'car' },
  { id: 'veh-4', lat: 36.3728, lng: 3.8998, headingDeg: 80, kind: 'bus' },
  { id: 'veh-5', lat: 36.376, lng: 3.903, headingDeg: 260, kind: 'car' },
  { id: 'veh-6', lat: 36.372, lng: 3.899, headingDeg: 80, kind: 'moto' },
];

export const SEED_ROUTE_POLYLINE: [number, number][] = [
  [36.345, 3.882],
  [36.352, 3.888],
  [36.359, 3.893],
  [36.366, 3.897],
  [36.371, 3.9],
  [36.3741, 3.9012],
];

export const SEED_OCCUPANT_A: Occupant = {
  id: 'occ-patient-a',
  label: 'Patient A',
  profile: {
    ageYears: 41,
    sex: 'm',
    bloodType: 'O+',
    chronicDiseases: [],
    allergies: [],
    medications: [],
    onBloodThinners: false,
    pregnant: false,
    emergencyContact: {
      label: 'Épouse / Spouce',
      phone: '+213 550 12 34 56',
    },
  },
  m3: {
    level: 'high',
    probability: 0.435, // ranking score per DATA_CONTRACT.md
    escalatedBy: [],
  },
  m4: {
    head: { level: 'check', probability: 0.58 },
    face: { level: 'unlikely', probability: 0.12 },
    spine_neck: { level: 'check', probability: 0.62 },
    thorax: { level: 'likely', probability: 0.88 },
    abdomen: { level: 'check', probability: 0.54 },
    arms: { level: 'unlikely', probability: 0.22 },
    legs: { level: 'check', probability: 0.65 },
  },
  triageColor: 'yellow',
};

export const SEED_PREP_ITEMS: PrepItem[] = [
  {
    id: 'prep-1',
    label: 'Protocole échographie FAST / Thorax dédié',
    reason: 'Région thoracique classée M4 likely (probabilité 0.88)',
  },
  {
    id: 'prep-2',
    label: 'Immobilisation rachis & collier cervical',
    reason: 'Région rachis & cou classée M4 check (probabilité 0.62)',
  },
  {
    id: 'prep-3',
    label: 'Préparation 2 culots globulaires O+ en attente',
    reason: 'Groupe O+, cinétique de choc violente (90 km/h avant impact)',
  },
  {
    id: 'prep-4',
    label: 'Abord veineux large et solutés réchauffés',
    reason: 'Risque de décompensation hémodynamique post-traumatique',
  },
];
