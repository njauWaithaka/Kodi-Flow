import { Tenant, House, HouseStatus, MaintenanceStatus, PaymentRecord, PaymentConfig } from './types';

export const KENYAN_BANKS = [
  { name: 'Equity Bank', paybill: '247247' },
  { name: 'Co-operative Bank', paybill: '400200' },
  { name: 'KCB Bank', paybill: '522522' },
  { name: 'Family Bank', paybill: '222111' },
  { name: 'NCBA Bank', paybill: '880100' },
  { name: 'Absa Bank', paybill: '303030' },
  { name: 'Stanbic Bank', paybill: '600100' },
  { name: 'Standard Chartered', paybill: '329329' },
  { name: 'I&M Bank', paybill: '542542' },
  { name: 'Diamond Trust Bank (DTB)', paybill: '516600' }
];

export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  mpesaType: 'PAYBILL',
  mpesaNumber: '400200',
  mpesaAccountPrefix: 'ROYAL',
  bankName: 'Equity Bank',
  bankPaybillNumber: '247247',
  bankAccountNumber: '1234567890123',
  bankAccountName: 'ROYAL FLATS MANAGEMENT'
};

export const INITIAL_TENANTS: Tenant[] = [
  {
    id: 't_james',
    name: 'James Mwangi',
    email: 'james.mwangi@royal.com',
    houseNumber: 'A01',
    idNumber: '32104567',
    phoneNumber: '0712 345 678',
    nextOfKin: 'Grace Mwangi - 0712334455',
    joinDate: '2024-01-15',
    bills: { 
      rent: 8000, 
      water: 2400, 
      prevWaterReading: 142,
      currWaterReading: 162,
      garbage: 0, 
      total: 10400, 
      status: 'PAID' 
    },
    meterReadings: [
      {
        id: 'mr_may_james',
        date: '2025-05-31',
        reading: 142,
        unitsConsumed: 20,
        cost: 2400
      }
    ],
    rentAgreement: {
      startDate: '2024-01-15',
      depositAmount: 8000,
      depositStatus: 'HELD',
      status: 'ACTIVE'
    }
  },
  {
    id: 't_grace',
    name: 'Grace Atieno',
    email: 'grace.atieno@royal.com',
    houseNumber: 'A02',
    idNumber: '33221144',
    phoneNumber: '0722 456 789',
    nextOfKin: 'Charles Atieno - 0722556677',
    joinDate: '2023-03-10',
    bills: { 
      rent: 7500, 
      water: 1800, 
      prevWaterReading: 98,
      currWaterReading: 113,
      garbage: 0, 
      total: 9300, 
      status: 'UNPAID' 
    },
    meterReadings: [],
    rentAgreement: {
      startDate: '2023-03-10',
      depositAmount: 7500,
      depositStatus: 'HELD',
      status: 'ACTIVE'
    }
  },
  {
    id: 't_peter',
    name: 'Peter Kamau',
    email: 'peter.kamau@royal.com',
    houseNumber: 'B01',
    idNumber: '31425364',
    phoneNumber: '0733 567 890',
    nextOfKin: 'Wambui Kamau - 0733112233',
    joinDate: '2022-06-20',
    bills: { 
      rent: 9200, 
      water: 3960, 
      prevWaterReading: 210,
      currWaterReading: 243,
      garbage: 0, 
      total: 13160, 
      status: 'UNPAID' 
    },
    meterReadings: [],
    rentAgreement: {
      startDate: '2022-06-20',
      depositAmount: 9200,
      depositStatus: 'HELD',
      status: 'ACTIVE'
    }
  },
  {
    id: 't_amina',
    name: 'Amina Hassan',
    email: 'amina.hassan@royal.com',
    houseNumber: 'B03',
    idNumber: '32541627',
    phoneNumber: '0744 678 901',
    nextOfKin: 'Hassan Ali - 0744998877',
    joinDate: '2023-09-01',
    bills: { 
      rent: 8800, 
      water: 1920, 
      prevWaterReading: 55,
      currWaterReading: 71,
      garbage: 0, 
      total: 10720, 
      status: 'PAID' 
    },
    meterReadings: [],
    rentAgreement: {
      startDate: '2023-09-01',
      depositAmount: 8800,
      depositStatus: 'HELD',
      status: 'ACTIVE'
    }
  },
  {
    id: 't_david',
    name: 'David Ochieng',
    email: 'david.ochieng@palm.com',
    houseNumber: 'C02',
    idNumber: '29876543',
    phoneNumber: '0755 789 012',
    nextOfKin: 'Jane Ochieng - 0755443322',
    joinDate: '2021-11-05',
    bills: { 
      rent: 12000, 
      water: 1200, 
      prevWaterReading: 100,
      currWaterReading: 108,
      garbage: 300, 
      total: 13500, 
      status: 'PARTIAL' 
    },
    meterReadings: [],
    rentAgreement: {
      startDate: '2021-11-05',
      depositAmount: 12000,
      depositStatus: 'HELD',
      status: 'ACTIVE'
    }
  }
];

export const INITIAL_HOUSES: House[] = [
  {
    id: 'h1',
    houseNumber: 'A01',
    propertyName: 'Royal Flats',
    location: 'Kawangware',
    type: '2 Bedroom',
    status: HouseStatus.RENTED,
    maintenanceStatus: MaintenanceStatus.NONE,
    lastVacantDate: '2022-12-01',
    totalEarnings: 450000,
    tenantHistory: [],
    repairs: []
  },
  {
    id: 'h2',
    houseNumber: 'A02',
    propertyName: 'Royal Flats',
    location: 'Kawangware',
    type: '2 Bedroom',
    status: HouseStatus.RENTED,
    maintenanceStatus: MaintenanceStatus.NONE,
    lastVacantDate: '2022-12-01',
    totalEarnings: 450000,
    tenantHistory: [],
    repairs: []
  },
  {
    id: 'h3',
    houseNumber: 'B01',
    propertyName: 'Royal Flats',
    location: 'Kawangware',
    type: '2 Bedroom',
    status: HouseStatus.RENTED,
    maintenanceStatus: MaintenanceStatus.NONE,
    lastVacantDate: '2022-12-01',
    totalEarnings: 450000,
    tenantHistory: [],
    repairs: []
  },
  {
    id: 'h4',
    houseNumber: 'B03',
    propertyName: 'Royal Flats',
    location: 'Kawangware',
    type: '2 Bedroom',
    status: HouseStatus.RENTED,
    maintenanceStatus: MaintenanceStatus.NONE,
    lastVacantDate: '2022-12-01',
    totalEarnings: 450000,
    tenantHistory: [],
    repairs: []
  },
  {
    id: 'h5',
    houseNumber: 'A03',
    propertyName: 'Royal Flats',
    location: 'Kawangware',
    type: '1 Bedroom',
    status: HouseStatus.VACANT,
    maintenanceStatus: MaintenanceStatus.NONE,
    lastVacantDate: '2024-02-15',
    totalEarnings: 125000,
    tenantHistory: [],
    repairs: []
  },
  {
    id: 'h6',
    houseNumber: 'B02',
    propertyName: 'Royal Flats',
    location: 'Kawangware',
    type: '1 Bedroom',
    status: HouseStatus.VACANT,
    maintenanceStatus: MaintenanceStatus.UNDER_REPAIR,
    lastVacantDate: '2024-02-15',
    totalEarnings: 125000,
    tenantHistory: [],
    repairs: []
  },
  {
    id: 'h7',
    houseNumber: 'C02',
    propertyName: 'Palm Heights',
    location: 'Kileleshwa',
    type: 'Penthouse',
    status: HouseStatus.VACANT,
    maintenanceStatus: MaintenanceStatus.NONE,
    lastVacantDate: '2024-08-01',
    totalEarnings: 0,
    tenantHistory: [],
    repairs: []
  }
];

export const INITIAL_PAYMENTS: PaymentRecord[] = [
  {
    id: 'p1',
    tenantId: 't1',
    amount: 35000,
    date: '2024-10-01T08:30:00Z',
    type: 'RENT',
    reference: 'MPESA-RKJ982LM2',
    method: 'M-Pesa'
  }
];