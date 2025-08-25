// src/navigation/types.ts

export type RootStackParamList = {
  MainTabs: undefined;
  AddBeneficiary: undefined;
  AddSeller: undefined;
  AddCattle: { beneficiary_id: string };
  CattleDetails: { animal_id: string };
  CattleDetailsFromScan: { animal_id: string; score?: number };
  CattleVisit: { animal_id: string; newVisit?: any };
  AddVisit: { animal_id: string };
  BeneficiaryProfile: { beneficiary_id: string };
  BeneficiaryDetails: { beneficiary_id: string };
  SellerProfile: { seller_id: string; seller?: any };
  TestAPI: undefined;
  TestConnection: undefined;
  MuzzleDetection: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};
