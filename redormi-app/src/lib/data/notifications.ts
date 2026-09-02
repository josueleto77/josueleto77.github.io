import type { Notification } from "@/lib/types";
import { DEMO_USER_ID } from "@/lib/data/users";
import { seedHoursAgo as hoursAgo } from "@/lib/utils/seedClock";

export const notifications: Notification[] = [
  {
    id: "ntf_1",
    userId: DEMO_USER_ID,
    type: "deal",
    title: "Last-minute deal near Tulum",
    body: "22% off a beachfront villa you searched recently.",
    href: "/listing/lst_20",
    read: false,
    createdAt: hoursAgo(3),
  },
  {
    id: "ntf_2",
    userId: DEMO_USER_ID,
    type: "counter",
    title: "New counter-offer",
    body: "Jordan countered your offer at 8% off.",
    href: "/dashboard/host",
    read: false,
    createdAt: hoursAgo(9),
  },
  {
    id: "ntf_3",
    userId: DEMO_USER_ID,
    type: "swap",
    title: "Swap proposal update",
    body: "Priya Chandrasekhar sent a Switch proposal for your Seattle loft.",
    href: "/switch/match/sp_1",
    read: true,
    createdAt: hoursAgo(22),
  },
  {
    id: "ntf_4",
    userId: DEMO_USER_ID,
    type: "message",
    title: "New message from Maria",
    body: "Whenever you're ready, just hit Reserve or send an offer.",
    href: "/messages/th_1",
    read: false,
    createdAt: hoursAgo(1),
  },
];

export const savedListingIds: Record<string, string[]> = {
  [DEMO_USER_ID]: ["lst_14", "lst_10", "lst_18", "lst_6"],
};
