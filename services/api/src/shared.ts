export type BalanceSheetSide = 'asset' | 'liability';

export enum AssetCategory {
  Cash = 'cash',
  Brokerage = 'brokerage',
  Retirement = 'retirement',
  RealEstate = 'real_estate',
  Vehicle = 'vehicle',
  BusinessOwnership = 'business_ownership',
  Other = 'other'
}

export enum LiabilityCategory {
  CreditCard = 'credit_card',
  Mortgage = 'mortgage',
  StudentLoan = 'student_loan',
  AutoLoan = 'auto_loan',
  PersonalLoan = 'personal_loan',
  TaxesOwed = 'taxes_owed',
  Other = 'other'
}

export type PositionCategory = AssetCategory | LiabilityCategory;

export enum PositionSourceType {
  Manual = 'manual',
  ConnectedAccount = 'connected_account',
  ImportedStatement = 'imported_statement'
}

export interface Position {
  id: string;
  userId: string;
  name: string;
  side: BalanceSheetSide;
  category: PositionCategory;
  currencyCode: string;
  linkedAccountId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ValuationProvenance {
  sourceType: PositionSourceType;
  sourceDetails: string;
}

export interface ValuationSnapshot extends ValuationProvenance {
  id: string;
  userId: string;
  positionId: string;
  asOfDate: string;
  value: number;
  createdAt: string;
}

export interface NetWorthPoint {
  asOfDate: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}
