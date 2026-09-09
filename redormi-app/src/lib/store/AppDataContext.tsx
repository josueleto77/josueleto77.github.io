"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type {
  AcceptanceRecord,
  Booking,
  ExtraService,
  ExtraServiceOrder,
  Listing,
  LastMinuteDeal,
  Message,
  MessageThread,
  Notification,
  Offer,
  SwapAgreement,
  SwapProposal,
  User,
} from "@/lib/types";
import { users as seedUsers } from "@/lib/data/users";
import { listings as seedListings } from "@/lib/data/listings";
import { offers as seedOffers } from "@/lib/data/offers";
import { threads as seedThreads, messages as seedMessages } from "@/lib/data/messages";
import { swapProposals as seedSwaps, swapAgreements as seedAgreements } from "@/lib/data/switch";
import { bookings as seedBookings } from "@/lib/data/bookings";
import { lastMinuteDeals as seedDeals } from "@/lib/data/deals";
import { extraServices as seedExtraServices } from "@/lib/data/services";
import { notifications as seedNotifications, savedListingIds } from "@/lib/data/notifications";
import { makeId } from "@/lib/utils/ids";
import { OFFER_EXPIRY_HOURS } from "@/lib/utils/pricing";
import { useToast } from "@/lib/store/ToastContext";
import { supabase } from "@/lib/supabase/client";
import { signInWithEmail, signUpWithEmail, signOutSupabase, fetchProfile, upsertProfile } from "@/lib/supabase/auth";
import { fetchPublishedListings } from "@/lib/supabase/listings";

interface AppState {
  currentUserId: string | null;
  users: User[];
  listings: Listing[];
  offers: Offer[];
  threads: MessageThread[];
  messages: Message[];
  swaps: SwapProposal[];
  agreements: SwapAgreement[];
  bookings: Booking[];
  deals: LastMinuteDeal[];
  extraServices: ExtraService[];
  serviceOrders: ExtraServiceOrder[];
  saved: Record<string, string[]>;
  notifications: Notification[];
  acceptances: AcceptanceRecord[];
}

const STORAGE_KEY = "redormi_state_v1";

function initialState(): AppState {
  return {
    // Logged out by default now that real accounts exist — visitors opt
    // into the demo account explicitly (see loginDemo) rather than being
    // silently signed in as "Jordan Ellis" on their first visit.
    currentUserId: null,
    users: seedUsers,
    listings: seedListings,
    offers: seedOffers,
    threads: seedThreads,
    messages: seedMessages,
    swaps: seedSwaps,
    agreements: seedAgreements,
    bookings: seedBookings,
    deals: seedDeals,
    extraServices: seedExtraServices,
    serviceOrders: [],
    saved: savedListingIds,
    notifications: seedNotifications,
    acceptances: [],
  };
}

function loadState(): AppState {
  if (typeof window === "undefined") return initialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return { ...initialState(), ...parsed };
  } catch {
    return initialState();
  }
}

interface AppDataApi {
  state: AppState;
  currentUser: User | undefined;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginDemo: (userId: string) => void;
  logout: () => Promise<void>;
  signup: (
    email: string,
    password: string,
    profile: Partial<User> & { name: string }
  ) => Promise<{ ok: boolean; needsEmailConfirmation?: boolean; error?: string }>;
  updateUser: (userId: string, patch: Partial<User>) => void;
  acceptAgreement: (documentSlug: string, version: string) => void;
  hasAccepted: (documentSlug: string, version: string) => boolean;

  createOffer: (offer: Omit<Offer, "id" | "createdAt" | "status" | "expiresAt" | "history" | "lastActor">) => Offer;
  counterOffer: (offerId: string, actor: "guest" | "host", discountPercent: number, message?: string) => void;
  respondOffer: (offerId: string, status: "accepted" | "declined") => void;

  createSwap: (swap: Omit<SwapProposal, "id" | "createdAt" | "status">) => SwapProposal;
  respondSwap: (swapId: string, status: SwapProposal["status"]) => void;
  signAgreement: (swapId: string, actor: "from" | "to", addOnIds: string[]) => void;

  sendMessage: (threadId: string, text: string, imageUrl?: string) => void;
  ensureThread: (listingId: string, otherUserId: string, context: "rent" | "switch") => string;
  markThreadRead: (threadId: string) => void;

  createBooking: (booking: Omit<Booking, "id" | "createdAt" | "status" | "extraServiceOrderIds">) => Booking;
  orderService: (order: Omit<ExtraServiceOrder, "id" | "createdAt" | "status">) => ExtraServiceOrder;

  toggleSaved: (listingId: string) => void;
  isSaved: (listingId: string) => boolean;

  createListing: (listing: Listing) => void;
  updateListing: (listingId: string, patch: Partial<Listing>) => void;
  createDeal: (deal: Omit<LastMinuteDeal, "id" | "createdAt">) => void;

  createExtraService: (service: Omit<ExtraService, "id">) => ExtraService;
  updateExtraService: (serviceId: string, patch: Partial<ExtraService>) => void;
  deleteExtraService: (serviceId: string) => void;

  markNotificationRead: (id: string) => void;
}

const AppDataContext = createContext<AppDataApi | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const hydrated = useRef(false);
  const toast = useToast();

  useEffect(() => {
    // Intentional one-time handoff: the first render must match the
    // statically-prerendered HTML (which used the seed data), so any
    // localStorage-persisted state is only applied after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loadState());
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage unavailable — ignore, state stays in-memory for this session
    }
  }, [state]);

  // Real backend sync: restore a real Supabase session (if any) and pull in
  // real, host-created listings alongside the seed/demo ones. Runs once
  // after the localStorage hydration above, and again on auth changes so a
  // real sign-in/out (including via the password-reset flow) stays in sync.
  useEffect(() => {
    let cancelled = false;

    async function syncSession() {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) return;
      const profile = await fetchProfile(userId);
      if (cancelled || !profile) return;
      setState((s) => ({
        ...s,
        users: s.users.some((u) => u.id === profile.id)
          ? s.users.map((u) => (u.id === profile.id ? profile : u))
          : [...s.users, profile],
        currentUserId: profile.id,
      }));
    }

    async function syncListings() {
      const realListings = await fetchPublishedListings();
      if (cancelled || realListings.length === 0) return;
      setState((s) => {
        const seedIds = new Set(s.listings.map((l) => l.id));
        const merged = [...realListings.filter((l) => !seedIds.has(l.id)), ...s.listings];
        return { ...s, listings: merged };
      });
    }

    syncSession();
    syncListings();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setState((s) => ({ ...s, currentUserId: null }));
      } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        syncSession();
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const currentUser = useMemo(
    () => state.users.find((u) => u.id === state.currentUserId),
    [state.users, state.currentUserId]
  );

  const login = useCallback<AppDataApi["login"]>(
    async (email, password) => {
      const { userId, error } = await signInWithEmail(email, password);
      if (error || !userId) {
        toast?.push({ tone: "error", text: error ?? "We couldn't log you in with those details." });
        return { ok: false, error: error ?? undefined };
      }
      const profile = await fetchProfile(userId);
      if (profile) {
        setState((s) => ({
          ...s,
          users: s.users.some((u) => u.id === profile.id)
            ? s.users.map((u) => (u.id === profile.id ? profile : u))
            : [...s.users, profile],
          currentUserId: profile.id,
        }));
        toast?.push({ tone: "success", text: `Welcome back, ${profile.name.split(" ")[0]}!` });
      } else {
        setState((s) => ({ ...s, currentUserId: userId }));
      }
      return { ok: true };
    },
    [toast]
  );

  const loginDemo = useCallback<AppDataApi["loginDemo"]>((userId) => {
    setState((s) => ({ ...s, currentUserId: userId }));
  }, []);

  const logout = useCallback(async () => {
    await signOutSupabase();
    setState((s) => ({ ...s, currentUserId: null }));
  }, []);

  const signup = useCallback<AppDataApi["signup"]>(async (email, password, profile) => {
    const { userId, error } = await signUpWithEmail(email, password);
    if (error || !userId) {
      return { ok: false, error: error ?? "Something went wrong creating your account." };
    }
    const roles = profile.roles ?? ["traveler"];
    const patch = {
      name: profile.name,
      phone: profile.phone,
      date_of_birth: profile.dateOfBirth,
      address: profile.address,
      city: profile.city,
      roles,
      is_host: roles.includes("host"),
      is_switch_member: roles.includes("switch_member"),
    };
    const updatedProfile = await upsertProfile(userId, patch);
    // Supabase projects default to requiring email confirmation before a
    // session exists — signUp() succeeds but there's no session yet. In
    // that case the account is created but not yet logged in.
    const { data: sessionData } = await supabase.auth.getSession();
    const loggedIn = !!sessionData.session;
    if (updatedProfile) {
      setState((s) => ({
        ...s,
        users: s.users.some((u) => u.id === updatedProfile.id)
          ? s.users.map((u) => (u.id === updatedProfile.id ? updatedProfile : u))
          : [...s.users, updatedProfile],
        currentUserId: loggedIn ? updatedProfile.id : s.currentUserId,
      }));
    }
    return { ok: true, needsEmailConfirmation: !loggedIn };
  }, []);

  const updateUser = useCallback<AppDataApi["updateUser"]>((userId, patch) => {
    setState((s) => ({
      ...s,
      users: s.users.map((u) => (u.id === userId ? { ...u, ...patch } : u)),
    }));
  }, []);

  const acceptAgreement = useCallback<AppDataApi["acceptAgreement"]>(
    (documentSlug, version) => {
      if (!state.currentUserId) return;
      const record: AcceptanceRecord = {
        id: makeId("acc"),
        userId: state.currentUserId,
        documentSlug,
        version,
        acceptedAt: new Date().toISOString(),
        ip: "127.0.0.1 (simulated)",
      };
      setState((s) => ({ ...s, acceptances: [...s.acceptances, record] }));
    },
    [state.currentUserId]
  );

  const hasAccepted = useCallback<AppDataApi["hasAccepted"]>(
    (documentSlug, version) =>
      state.acceptances.some(
        (a) =>
          a.userId === state.currentUserId &&
          a.documentSlug === documentSlug &&
          a.version === version
      ),
    [state.acceptances, state.currentUserId]
  );

  const createOffer = useCallback<AppDataApi["createOffer"]>((offer) => {
    const full: Offer = {
      ...offer,
      id: makeId("off"),
      status: "pending",
      expiresAt: new Date(Date.now() + OFFER_EXPIRY_HOURS * 3600000).toISOString(),
      createdAt: new Date().toISOString(),
      history: [],
      lastActor: "guest",
    };
    setState((s) => ({ ...s, offers: [full, ...s.offers] }));
    toast?.push({ tone: "success", text: "Offer sent! You'll hear back within 48 hours." });
    return full;
  }, [toast]);

  const counterOffer = useCallback<AppDataApi["counterOffer"]>((offerId, actor, discountPercent, message) => {
    setState((s) => ({
      ...s,
      offers: s.offers.map((o) => {
        if (o.id !== offerId) return o;
        const listing = s.listings.find((l) => l.id === o.listingId);
        const nightly = listing ? listing.pricing.baseNightly * (1 - discountPercent / 100) : o.resultingNightly;
        const nights = Math.max(
          1,
          Math.round((new Date(o.checkOut).getTime() - new Date(o.checkIn).getTime()) / 86400000)
        );
        return {
          ...o,
          status: "countered",
          discountPercent,
          resultingNightly: Math.round(nightly * 100) / 100,
          resultingTotal: Math.round(nightly * nights * 100) / 100,
          lastActor: actor,
          history: [
            ...o.history,
            { id: makeId("co"), offerId, actor, discountPercent, message, createdAt: new Date().toISOString() },
          ],
        };
      }),
    }));
    toast?.push({ tone: "info", text: "Counter-offer sent." });
  }, [toast]);

  const respondOffer = useCallback<AppDataApi["respondOffer"]>((offerId, status) => {
    setState((s) => ({
      ...s,
      offers: s.offers.map((o) => (o.id === offerId ? { ...o, status } : o)),
    }));
    toast?.push({
      tone: status === "accepted" ? "success" : "info",
      text: status === "accepted" ? "Offer accepted — reservation held." : "Offer declined.",
    });
  }, [toast]);

  const createSwap = useCallback<AppDataApi["createSwap"]>((swap) => {
    const full: SwapProposal = { ...swap, id: makeId("sp"), status: "proposed", createdAt: new Date().toISOString() };
    setState((s) => ({ ...s, swaps: [full, ...s.swaps] }));
    toast?.push({ tone: "success", text: "Swap proposal sent!" });
    return full;
  }, [toast]);

  const respondSwap = useCallback<AppDataApi["respondSwap"]>((swapId, status) => {
    setState((s) => ({ ...s, swaps: s.swaps.map((sp) => (sp.id === swapId ? { ...sp, status } : sp)) }));
  }, []);

  const signAgreement = useCallback<AppDataApi["signAgreement"]>((swapId, actor, addOnIds) => {
    setState((s) => {
      const existing = s.agreements.find((a) => a.swapId === swapId);
      const base: SwapAgreement = existing ?? {
        id: makeId("agr"),
        swapId,
        signedByFrom: false,
        signedByTo: false,
        addOnIds: [],
        version: "1.0",
      };
      const updated: SwapAgreement = {
        ...base,
        addOnIds: Array.from(new Set([...base.addOnIds, ...addOnIds])),
        signedByFrom: actor === "from" ? true : base.signedByFrom,
        signedByTo: actor === "to" ? true : base.signedByTo,
      };
      const bothSigned = updated.signedByFrom && updated.signedByTo;
      if (bothSigned) updated.signedAt = new Date().toISOString();
      return {
        ...s,
        agreements: existing
          ? s.agreements.map((a) => (a.swapId === swapId ? updated : a))
          : [...s.agreements, updated],
        swaps: s.swaps.map((sp) =>
          sp.id === swapId ? { ...sp, status: bothSigned ? "confirmed" : "agreement_pending" } : sp
        ),
      };
    });
  }, []);

  const ensureThread = useCallback<AppDataApi["ensureThread"]>(
    (listingId, otherUserId, context) => {
      if (!state.currentUserId) return "";
      const existing = state.threads.find(
        (t) =>
          t.listingId === listingId &&
          t.participantIds.includes(otherUserId) &&
          t.participantIds.includes(state.currentUserId!)
      );
      if (existing) return existing.id;
      const id = makeId("th");
      const thread: MessageThread = {
        id,
        listingId,
        participantIds: [state.currentUserId, otherUserId],
        lastMessageAt: new Date().toISOString(),
        unreadFor: [],
        context,
      };
      setState((s) => ({ ...s, threads: [thread, ...s.threads] }));
      return id;
    },
    [state.currentUserId, state.threads]
  );

  const sendMessage = useCallback<AppDataApi["sendMessage"]>((threadId, text, imageUrl) => {
    if (!state.currentUserId) return;
    const msg: Message = {
      id: makeId("m"),
      threadId,
      senderId: state.currentUserId,
      text,
      imageUrl,
      sentAt: new Date().toISOString(),
      readBy: [state.currentUserId],
    };
    setState((s) => ({
      ...s,
      messages: [...s.messages, msg],
      threads: s.threads.map((t) =>
        t.id === threadId
          ? {
              ...t,
              lastMessageAt: msg.sentAt,
              unreadFor: t.participantIds.filter((p) => p !== state.currentUserId),
            }
          : t
      ),
    }));
  }, [state.currentUserId]);

  const markThreadRead = useCallback<AppDataApi["markThreadRead"]>((threadId) => {
    if (!state.currentUserId) return;
    setState((s) => ({
      ...s,
      threads: s.threads.map((t) =>
        t.id === threadId ? { ...t, unreadFor: t.unreadFor.filter((u) => u !== state.currentUserId) } : t
      ),
    }));
  }, [state.currentUserId]);

  const createBooking = useCallback<AppDataApi["createBooking"]>((booking) => {
    const full: Booking = {
      ...booking,
      id: makeId("bk"),
      status: "held",
      extraServiceOrderIds: [],
      createdAt: new Date().toISOString(),
    };
    setState((s) => ({ ...s, bookings: [full, ...s.bookings] }));
    toast?.push({ tone: "success", text: "Reservation held! Check your trips for details." });
    return full;
  }, [toast]);

  const orderService = useCallback<AppDataApi["orderService"]>((order) => {
    const full: ExtraServiceOrder = { ...order, id: makeId("eso"), status: "confirmed", createdAt: new Date().toISOString() };
    setState((s) => ({ ...s, serviceOrders: [full, ...s.serviceOrders] }));
    toast?.push({ tone: "success", text: "Added to your trip." });
    return full;
  }, [toast]);

  const toggleSaved = useCallback<AppDataApi["toggleSaved"]>((listingId) => {
    if (!state.currentUserId) {
      toast?.push({ tone: "info", text: "Log in to save homes." });
      return;
    }
    setState((s) => {
      const current = s.saved[state.currentUserId!] ?? [];
      const next = current.includes(listingId)
        ? current.filter((id) => id !== listingId)
        : [...current, listingId];
      return { ...s, saved: { ...s.saved, [state.currentUserId!]: next } };
    });
  }, [state.currentUserId, toast]);

  const isSaved = useCallback<AppDataApi["isSaved"]>(
    (listingId) => (state.currentUserId ? (state.saved[state.currentUserId] ?? []).includes(listingId) : false),
    [state.currentUserId, state.saved]
  );

  const createListing = useCallback<AppDataApi["createListing"]>((listing) => {
    setState((s) => ({
      ...s,
      listings: s.listings.some((l) => l.id === listing.id)
        ? s.listings.map((l) => (l.id === listing.id ? listing : l))
        : [...s.listings, listing],
    }));
  }, []);

  const updateListing = useCallback<AppDataApi["updateListing"]>((listingId, patch) => {
    setState((s) => ({
      ...s,
      listings: s.listings.map((l) => (l.id === listingId ? { ...l, ...patch } : l)),
    }));
  }, []);

  const createDeal = useCallback<AppDataApi["createDeal"]>((deal) => {
    const full: LastMinuteDeal = { ...deal, id: makeId("deal"), createdAt: new Date().toISOString() };
    setState((s) => ({ ...s, deals: [full, ...s.deals] }));
    toast?.push({ tone: "success", text: "Last-minute deal published." });
  }, [toast]);

  const createExtraService = useCallback<AppDataApi["createExtraService"]>((service) => {
    const full: ExtraService = { ...service, id: makeId("svc") };
    setState((s) => ({ ...s, extraServices: [...s.extraServices, full] }));
    toast?.push({ tone: "success", text: "Extra service added." });
    return full;
  }, [toast]);

  const updateExtraService = useCallback<AppDataApi["updateExtraService"]>((serviceId, patch) => {
    setState((s) => ({
      ...s,
      extraServices: s.extraServices.map((sv) => (sv.id === serviceId ? { ...sv, ...patch } : sv)),
    }));
  }, []);

  const deleteExtraService = useCallback<AppDataApi["deleteExtraService"]>((serviceId) => {
    setState((s) => ({ ...s, extraServices: s.extraServices.filter((sv) => sv.id !== serviceId) }));
  }, []);

  const markNotificationRead = useCallback<AppDataApi["markNotificationRead"]>((id) => {
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  }, []);

  const value: AppDataApi = {
    state,
    currentUser,
    isLoggedIn: !!currentUser,
    login,
    loginDemo,
    logout,
    signup,
    updateUser,
    acceptAgreement,
    hasAccepted,
    createOffer,
    counterOffer,
    respondOffer,
    createSwap,
    respondSwap,
    signAgreement,
    sendMessage,
    ensureThread,
    markThreadRead,
    createBooking,
    orderService,
    toggleSaved,
    isSaved,
    createListing,
    updateListing,
    createDeal,
    createExtraService,
    updateExtraService,
    deleteExtraService,
    markNotificationRead,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataApi {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
