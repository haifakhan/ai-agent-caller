import type { CallRequestInput } from "./types";

export const callTemplates: Record<string, CallRequestInput> = {
  dentist: {
    callerName: "Sam Rivera",
    phoneNumber: "+15550134820",
    organization: "Northside Dental Clinic",
    callType: "Book an appointment",
    goal:
      "Book a routine dental cleaning. Prefer Tuesday or Thursday afternoon, but ask for the earliest available appointment if those are not open.",
    allowedInfo:
      "Name: Sam Rivera\nReason: routine dental cleaning\nPhone: use the number on file\nInsurance: ask whether they accept GreenShield before booking",
    restrictions:
      "Do not discuss unrelated medical history.\nDo not agree to X-rays unless required and confirmed first.\nDo not accept a morning appointment.",
    preferredOptions: "Best: Tuesday after 2 PM\nSecond: Thursday after 1 PM\nAcceptable: any weekday after 3 PM",
    mustConfirm: "Date and time\nClinic address\nPrice or insurance acceptance\nAnything Sam needs to bring",
    neverAgree:
      "Payment, cancellation fees, appointment changes, diagnostic decisions, or sharing sensitive information without asking Sam first.",
    saveTranscriptPreference: true,
    callingNumberConfig: { mode: "shared" },
  },
  pharmacy: {
    callerName: "Sam Rivera",
    phoneNumber: "+15550192844",
    organization: "Riverside Pharmacy",
    callType: "Confirm next steps",
    goal: "Ask whether Sam's routine refill is ready for pickup and whether there is any cost due today.",
    allowedInfo:
      "Name: Sam Rivera\nDate of birth: only provide if the pharmacy says it is required\nPhone: use the number on file",
    restrictions:
      "Do not discuss symptoms or medication changes.\nDo not authorize substitutions.\nDo not agree to delivery fees.",
    preferredOptions: "Pickup after 4 PM today or tomorrow\nAsk for text confirmation if available",
    mustConfirm: "Ready status\nPickup window\nCost due\nWhether ID or insurance card is needed",
    neverAgree: "Medication changes, substitutions, delivery fees, or sharing extra health details without asking Sam first.",
    saveTranscriptPreference: true,
    callingNumberConfig: { mode: "shared" },
  },
  pricing: {
    callerName: "Sam Rivera",
    phoneNumber: "+15550159137",
    organization: "Harbor Vision Care",
    callType: "Ask about pricing",
    goal: "Ask for the price of a standard eye exam for a new patient and whether weekend appointments are available.",
    allowedInfo: "Name: Sam Rivera\nGeneral request: new patient eye exam\nInsurance: ask which plans they accept",
    restrictions: "Do not book yet.\nDo not provide payment details.\nDo not share health history.",
    preferredOptions: "Saturday morning\nWeekday after 5 PM",
    mustConfirm: "Exam price\nInsurance accepted\nEarliest available appointment\nRequired documents",
    neverAgree: "Booking, payment, deposits, or cancellation fees without Sam's approval.",
    saveTranscriptPreference: true,
    callingNumberConfig: { mode: "shared" },
  },
};

export const emptyCallRequest: CallRequestInput = {
  callerName: "",
  phoneNumber: "",
  organization: "",
  callType: "",
  goal: "",
  allowedInfo: "",
  restrictions: "",
  preferredOptions: "",
  mustConfirm: "",
  neverAgree: "",
  saveTranscriptPreference: true,
  callingNumberConfig: { mode: "shared" },
};
