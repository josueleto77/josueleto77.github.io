export type Locale = "en" | "es";

export const locales: Locale[] = ["en", "es"];

export interface Dictionary {
  tagline: string;
  nav: {
    rent: string;
    switch: string;
    hotPlaces: string;
    specialOffers: string;
    listYourHome: string;
    messages: string;
    login: string;
    signup: string;
    account: string;
    dashboard: string;
    logout: string;
  };
  trustBar: {
    curated: string;
    secure: string;
    authentic: string;
    support: string;
  };
  search: {
    whereTo: string;
    checkIn: string;
    checkOut: string;
    guests: string;
    search: string;
    rentMode: string;
    switchMode: string;
  };
  common: {
    night: string;
    nights: string;
    guest: string;
    guests: string;
    reserve: string;
    makeOffer: string;
    viewDetails: string;
    seeAll: string;
    loading: string;
    save: string;
    cancel: string;
    continue: string;
    back: string;
    submit: string;
    publish: string;
    accept: string;
    decline: string;
    counter: string;
    total: string;
  };
  footer: {
    rights: string;
    company: string;
    support: string;
    legal: string;
    language: string;
  };
}

export const dictionaries: Record<Locale, Dictionary> = {
  en: {
    tagline: "Stay. Rest. Redormi.",
    nav: {
      rent: "Rent",
      switch: "Switch",
      hotPlaces: "Hot Places",
      specialOffers: "Special Offers",
      listYourHome: "List your home",
      messages: "Messages",
      login: "Log in",
      signup: "Sign up",
      account: "Account",
      dashboard: "Dashboard",
      logout: "Log out",
    },
    trustBar: {
      curated: "Curated Places",
      secure: "Secure Booking",
      authentic: "Authentic Experiences",
      support: "24/7 Support",
    },
    search: {
      whereTo: "Where to?",
      checkIn: "Check in",
      checkOut: "Check out",
      guests: "Guests",
      search: "Search",
      rentMode: "Rent",
      switchMode: "Switch",
    },
    common: {
      night: "night",
      nights: "nights",
      guest: "guest",
      guests: "guests",
      reserve: "Reserve",
      makeOffer: "Make an offer",
      viewDetails: "View details",
      seeAll: "See all",
      loading: "Loading…",
      save: "Save",
      cancel: "Cancel",
      continue: "Continue",
      back: "Back",
      submit: "Submit",
      publish: "Publish",
      accept: "Accept",
      decline: "Decline",
      counter: "Counter",
      total: "Total",
    },
    footer: {
      rights: "All rights reserved.",
      company: "Company",
      support: "Support",
      legal: "Legal",
      language: "Language",
    },
  },
  es: {
    tagline: "Quédate. Descansa. Redormi.",
    nav: {
      rent: "Alquiler",
      switch: "Switch",
      hotPlaces: "Lugares populares",
      specialOffers: "Ofertas especiales",
      listYourHome: "Publica tu casa",
      messages: "Mensajes",
      login: "Iniciar sesión",
      signup: "Registrarse",
      account: "Cuenta",
      dashboard: "Panel",
      logout: "Cerrar sesión",
    },
    trustBar: {
      curated: "Lugares curados",
      secure: "Reserva segura",
      authentic: "Experiencias auténticas",
      support: "Soporte 24/7",
    },
    search: {
      whereTo: "¿A dónde vas?",
      checkIn: "Llegada",
      checkOut: "Salida",
      guests: "Huéspedes",
      search: "Buscar",
      rentMode: "Alquiler",
      switchMode: "Switch",
    },
    common: {
      night: "noche",
      nights: "noches",
      guest: "huésped",
      guests: "huéspedes",
      reserve: "Reservar",
      makeOffer: "Hacer una oferta",
      viewDetails: "Ver detalles",
      seeAll: "Ver todo",
      loading: "Cargando…",
      save: "Guardar",
      cancel: "Cancelar",
      continue: "Continuar",
      back: "Atrás",
      submit: "Enviar",
      publish: "Publicar",
      accept: "Aceptar",
      decline: "Rechazar",
      counter: "Contraoferta",
      total: "Total",
    },
    footer: {
      rights: "Todos los derechos reservados.",
      company: "Compañía",
      support: "Soporte",
      legal: "Legal",
      language: "Idioma",
    },
  },
};
