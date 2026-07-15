export enum UserRole {
  TENANT = 'TENANT',
  CARETAKER = 'CARETAKER',
  LANDLORD = 'LANDLORD'
}

export enum HouseStatus {
  VACANT = 'VACANT',
  RENTED = 'RENTED'
}

export enum MaintenanceStatus {
  NONE = 'NONE',
  UNDER_REPAIR = 'UNDER_REPAIR'
}

export interface PaymentConfig {
  mpesaType: 'PAYBILL' | 'TILL';
  mpesaNumber: string;
  mpesaAccountPrefix: string;
  bankName: string;
  bankPaybillNumber: string;
  bankAccountNumber: string;
  bankAccountName: string;
}

export interface MeterReading {
  id: string;
  date: string;
  reading: number;
  unitsConsumed: number;
  cost: number;
}

export interface Bill {
  rent: number;
  water: number;
  prevWaterReading: number;
  currWaterReading: number;
  garbage: number;
  total: number;
  status: 'PAID' | 'UNPAID' | 'PARTIAL';
}

export interface RentAgreement {
  startDate: string;
  depositAmount: number;
  depositStatus: 'HELD' | 'REFUNDED' | 'FORFEITED';
  status: 'ACTIVE' | 'TERMINATED';
  tenantSignature?: string;
  landlordSignature?: string;
  witnessSignature?: string;
  signedDate?: string;
}

export interface Incident {
  id: string;
  date: string;
  type: 'LEASE_RENEWAL' | 'LATE_PAYMENT' | 'MAINTENANCE_ISSUE' | 'COMPLIANCE' | 'NOTE';
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  houseNumber: string;
  idNumber: string;
  phoneNumber: string;
  nextOfKin: string;
  agreementUrl?: string;
  bills: Bill;
  joinDate: string;
  rentAgreement?: RentAgreement;
  incidents?: Incident[];
  meterReadings?: MeterReading[];
}

export interface House {
  id: string;
  houseNumber: string;
  propertyName?: string;
  location?: string;
  type: 'Studio' | '1 Bedroom' | '2 Bedroom' | 'Penthouse';
  status: HouseStatus;
  maintenanceStatus: MaintenanceStatus;
  lastVacantDate: string;
  repairs: Repair[];
  totalEarnings: number;
  tenantHistory: { name: string; period: string; exitReason: string }[];
}

export interface Repair {
  id: string;
  date: string;
  description: string;
  cost: number;
  category: string;
}

export interface Expense {
  id: string;
  date: string;
  category: 'MAINTENANCE' | 'UTILITIES' | 'TAX' | 'LEGAL' | 'SALARY' | 'OTHER';
  amount: number;
  description: string;
}

export interface PaymentRecord {
  id: string;
  tenantId: string;
  amount: number;
  date: string;
  type: 'RENT' | 'WATER' | 'GARBAGE' | 'TOTAL';
  reference: string;
  method: string;
}