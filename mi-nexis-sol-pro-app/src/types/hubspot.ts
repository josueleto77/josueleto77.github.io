export interface HubSpotContactProperties {
  phone?: string;
  address?: string;
  annual_electric_usage_kwh?: string;
  lead_source?: string;
  firstname?: string;
  lastname?: string;
  [key: string]: string | undefined;
}

export interface HubSpotContact {
  id: string;
  properties: HubSpotContactProperties;
}

export interface HubSpotDealProperties {
  dealname?: string;
  pipeline?: string;
  dealstage?: string;
  property_address?: string;
  phone?: string;
  annual_consumption_kwh?: string;
  solar_score?: string;
  recommended_system_size_kw?: string;
  recommended_panel_count?: string;
  estimated_solar_production_kwh?: string;
  estimated_energy_offset_percent?: string;
  max_panel_count?: string;
  max_system_size_kw?: string;
  usable_solar_roof_area_sqft?: string;
  solar_suitability?: string;
  google_solar_imagery_date?: string;
  lead_source?: string;
  solar_analysis_status?: SolarAnalysisStatus;
  nexis_submission_id?: string;
  [key: string]: string | undefined;
}

export interface HubSpotDeal {
  id: string;
  properties: HubSpotDealProperties;
}

export type SolarAnalysisStatus = "completed" | "partial" | "unavailable" | "error";
