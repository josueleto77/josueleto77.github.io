export * from "./solar";
export * from "./hubspot";

export interface AnalyzeHomeRequest {
  address: string;
  latitude: number;
  longitude: number;
  placeId: string | null;
  phone: string;
  annualConsumptionKwh: number;
  consentAccepted: boolean;
  submissionId: string;
}

export interface AnalyzeHomeResponse {
  success: boolean;
  reportId?: string;
  property?: {
    formattedAddress: string;
    latitude: number;
    longitude: number;
  };
  solarPotential?: import("./solar").SolarAnalysisResult;
  error?: {
    code:
      | "VALIDATION_ERROR"
      | "SOLAR_UNAVAILABLE"
      | "NO_COVERAGE"
      | "RATE_LIMITED"
      | "SERVER_ERROR";
    message: string;
  };
}
