/** Shape of a Google Places Autocomplete selection, as consumed by the landing form. */
export interface PlaceSelection {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  placeId: string | null;
}

declare global {
  interface Window {
    google?: typeof google;
    __nexisGoogleMapsCallback?: () => void;
  }
}

export {};
