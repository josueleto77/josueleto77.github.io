import type { Message, MessageThread } from "@/lib/types";
import { DEMO_USER_ID } from "@/lib/data/users";
import { seedHoursAgo as hoursAgo } from "@/lib/utils/seedClock";

export const threads: MessageThread[] = [
  {
    id: "th_1",
    listingId: "lst_1",
    participantIds: [DEMO_USER_ID, "usr_2"],
    lastMessageAt: hoursAgo(1),
    unreadFor: [DEMO_USER_ID],
    context: "rent",
  },
  {
    id: "th_2",
    listingId: "lst_24",
    bookingId: undefined,
    participantIds: [DEMO_USER_ID, "usr_13"],
    lastMessageAt: hoursAgo(5),
    unreadFor: [],
    context: "rent",
  },
  {
    id: "th_3",
    listingId: "lst_23",
    swapId: "sp_1",
    participantIds: [DEMO_USER_ID, "usr_10"],
    lastMessageAt: hoursAgo(20),
    unreadFor: [DEMO_USER_ID],
    context: "switch",
  },
  {
    id: "th_4",
    listingId: "lst_6",
    participantIds: [DEMO_USER_ID, "usr_4"],
    lastMessageAt: hoursAgo(48),
    unreadFor: [],
    context: "rent",
  },
  {
    id: "th_5",
    listingId: "lst_23",
    participantIds: [DEMO_USER_ID, "usr_12"],
    lastMessageAt: hoursAgo(9),
    unreadFor: [],
    context: "rent",
  },
];

export const messages: Message[] = [
  // th_1 — guest (demo) <-> host Maria, pre-booking (contact masked)
  {
    id: "m_1",
    threadId: "th_1",
    senderId: DEMO_USER_ID,
    text: "Hi Maria! Is the villa available for the first week of next month? We'd be 6 adults.",
    sentAt: hoursAgo(30),
    readBy: [DEMO_USER_ID, "usr_2"],
  },
  {
    id: "m_2",
    threadId: "th_1",
    senderId: "usr_2",
    text: "Hi! Yes, those dates are open. Happy to hold them for you — let me know if you'd like to book or send an offer.",
    sentAt: hoursAgo(28),
    readBy: [DEMO_USER_ID, "usr_2"],
  },
  {
    id: "m_3",
    threadId: "th_1",
    senderId: DEMO_USER_ID,
    text: "You can reach me at jordan.ellis@email.com or +1 555 010 1000 if easier — actually let's keep it here for now!",
    sentAt: hoursAgo(27),
    readBy: [DEMO_USER_ID, "usr_2"],
    isMasked: true,
  },
  {
    id: "m_4",
    threadId: "th_1",
    senderId: "usr_2",
    text: "Sounds good — contact details stay hidden here until a booking's confirmed, that's just how Redormi keeps things safe for everyone. I've sent over a couple of photos of the pool deck at golden hour.",
    sentAt: hoursAgo(2),
    imageUrl: "https://picsum.photos/seed/th1-photo/700/500",
    readBy: ["usr_2"],
  },
  {
    id: "m_5",
    threadId: "th_1",
    senderId: "usr_2",
    text: "Whenever you're ready, just hit Reserve or send an offer and I'll get it locked in.",
    sentAt: hoursAgo(1),
    readBy: ["usr_2"],
  },

  // th_2 — Jordan (host) <-> guest Marcus, offer accepted
  {
    id: "m_6",
    threadId: "th_2",
    senderId: "usr_13",
    text: "Hey! Sent an offer for a work trip in a few weeks — let me know if 10% works.",
    sentAt: hoursAgo(31),
    readBy: [DEMO_USER_ID, "usr_13"],
  },
  {
    id: "m_7",
    threadId: "th_2",
    senderId: DEMO_USER_ID,
    text: "Booking confirmed! Your check-in instructions and the door code will show up here 48 hours before arrival.",
    sentAt: hoursAgo(30),
    readBy: [DEMO_USER_ID, "usr_13"],
    isAutomated: true,
  },
  {
    id: "m_8",
    threadId: "th_2",
    senderId: DEMO_USER_ID,
    text: "Thanks for booking! Let me know if you need any recommendations around Austin.",
    sentAt: hoursAgo(5),
    readBy: [DEMO_USER_ID, "usr_13"],
  },

  // th_3 — Switch negotiation
  {
    id: "m_9",
    threadId: "th_3",
    senderId: "usr_10",
    text: "Hi Jordan! Loved your loft's photos — would you be open to swapping with our Marais apartment June 10–24?",
    sentAt: hoursAgo(22),
    readBy: [DEMO_USER_ID, "usr_10"],
  },
  {
    id: "m_10",
    threadId: "th_3",
    senderId: DEMO_USER_ID,
    text: "That could work really well — I've got a small tier gap I'd like to offset. Would you take a couple of Extra Services credits toward it?",
    sentAt: hoursAgo(21),
    readBy: [DEMO_USER_ID, "usr_10"],
  },
  {
    id: "m_11",
    threadId: "th_3",
    senderId: "usr_10",
    text: "That works for us — I'll send over a formal proposal now.",
    sentAt: hoursAgo(20),
    readBy: ["usr_10"],
  },

  // th_4 — pre-stay questions with image
  {
    id: "m_12",
    threadId: "th_4",
    senderId: DEMO_USER_ID,
    text: "Is the machiya walkable to Fushimi Inari?",
    sentAt: hoursAgo(50),
    readBy: [DEMO_USER_ID, "usr_4"],
  },
  {
    id: "m_13",
    threadId: "th_4",
    senderId: "usr_4",
    text: "It's about 20 minutes by train, one change. Here's the walk to the station:",
    imageUrl: "https://picsum.photos/seed/th4-map/700/500",
    sentAt: hoursAgo(49),
    readBy: [DEMO_USER_ID, "usr_4"],
  },
  {
    id: "m_14",
    threadId: "th_4",
    senderId: "usr_4",
    text: "Checkout reminder: bins go out front by 9am, and please leave the AC remote on the genkan shelf. Thank you for staying with us!",
    sentAt: hoursAgo(48),
    readBy: [DEMO_USER_ID, "usr_4"],
    isAutomated: true,
  },

  // th_5 — counter-offer discussion
  {
    id: "m_15",
    threadId: "th_5",
    senderId: "usr_12",
    text: "Would you consider 18% off for a 6-night stay in October? We're pretty flexible.",
    sentAt: hoursAgo(10),
    readBy: [DEMO_USER_ID, "usr_12"],
  },
  {
    id: "m_16",
    threadId: "th_5",
    senderId: DEMO_USER_ID,
    text: "I can meet you closer to 8% for those dates — sent a counter on the offer.",
    sentAt: hoursAgo(9),
    readBy: [DEMO_USER_ID, "usr_12"],
  },
];

export function messagesForThread(threadId: string): Message[] {
  return messages
    .filter((m) => m.threadId === threadId)
    .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
}

export function threadsForUser(userId: string): MessageThread[] {
  return threads
    .filter((t) => t.participantIds.includes(userId))
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
}

export const QUICK_REPLIES = [
  "Thanks so much for reaching out — I'll get back to you shortly!",
  "Those dates are available. Want me to hold them for you?",
  "Check-in is after 3 PM, and I'll send the door code the day before.",
  "Happy to negotiate — feel free to send an offer.",
  "Hope you had a great stay! Would love a review if you have a moment.",
];
