// seedFirebase.ts
// ─────────────────────────────────────────────────────────────
// ElectraGuard — Seed Script (TypeScript)
// Yeh script SIRF EK BAAR chalti hai — pehli launch par
// automatically saara Learn screen ka data Firebase ke
// "learnContent" collection mein upload kar deti hai.
// ─────────────────────────────────────────────────────────────
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

const COLLECTION = "learnContent"; // ✅ ElectraGuard collection name

export async function seedAllData(forceUpdate = false): Promise<boolean> {
  try {
    // Check karein — agar data already hai toh skip karein (unless forceUpdate = true)
    if (!forceUpdate) {
      const checkDoc = await getDoc(doc(db, COLLECTION, "electricity_theft"));
      if (checkDoc.exists()) {
        console.log("✅ Data already exists in learnContent — skipping seed.");
        return true;
      }
    }

    // ── 1. Electricity Theft ─────────────────────────────────
    await setDoc(doc(db, COLLECTION, "electricity_theft"), {
      title: "Electricity Theft Awareness",
      subtitle:
        "Understanding electricity theft and its impact on our community",
      icon: "shield",
      color: "#E53E3E",
      order: 1,
      learnMoreLabel: "Learn More",
      learnMoreUrl: "https://nepra.org.pk/",
      subsections: [
        {
          heading: "What is Electricity Theft?",
          body: "Electricity theft is the unauthorized use of electrical power through meter tampering, illegal connections, or bypassing the billing system.",
          icon: "information-circle",
          iconColor: "#E53E3E",
          bulletPoints: [],
        },
        {
          heading: "Why it is Illegal",
          body: "Electricity theft is a criminal offense punishable by law. It leads to financial losses, infrastructure damage, and safety hazards.",
          icon: "warning",
          iconColor: "#D69E2E",
          bulletPoints: [],
        },
        {
          heading: "Impact on Society",
          body: "",
          icon: "people",
          iconColor: "#38A169",
          bulletPoints: [
            "Increases electricity bills for honest consumers",
            "Causes power outages and infrastructure damage",
            "Creates serious safety risks including fire hazards",
          ],
        },
      ],
    });

    // ── 2. Energy Saving Tips ────────────────────────────────
    await setDoc(doc(db, COLLECTION, "energy_saving"), {
      title: "Energy Saving Tips",
      subtitle: "Simple habits that help reduce your electricity consumption",
      icon: "leaf",
      color: "#38A169",
      order: 2,
      tips: [
        {
          id: "tip1",
          icon: "power",
          iconColor: "#4299E1",
          title: "Turn Off Unused Appliances",
          body: "Switch off lights, fans, and electronics when not in use. Even standby mode consumes power.",
        },
        {
          id: "tip2",
          icon: "bulb",
          iconColor: "#ECC94B",
          title: "Use Energy-Efficient Bulbs",
          body: "Replace traditional bulbs with LED or CFL bulbs. They use 75% less energy and last longer.",
        },
        {
          id: "tip3",
          icon: "time",
          iconColor: "#ED8936",
          title: "Avoid Peak Hour Usage",
          body: "Reduce heavy appliance usage during peak hours (6-10 PM) to lower bills and grid load.",
        },
        {
          id: "tip4",
          icon: "speedometer",
          iconColor: "#805AD5",
          title: "Regular Meter Inspection",
          body: "Check your meter regularly for any irregularities or damage. Report issues immediately.",
        },
      ],
    });

    // ── 3. Safety Guidelines ─────────────────────────────────
    await setDoc(doc(db, COLLECTION, "safety_guidelines"), {
      title: "Safety Guidelines",
      subtitle: "Protect yourself and your community",
      icon: "shield-checkmark",
      color: "#ED8936",
      order: 3,
      viewGuideLabel: "View Detailed Safety Guide",
      viewGuideUrl: "https://www.nepra.org.pk/Regulation/Guidelines.aspx",
      helplineNumber: "03258568691",
      communityMessage:
        "By reporting electricity theft and following energy-saving practices, you contribute to a safer, more sustainable community. Every action counts!",
      tamperingSigns: [
        {
          number: 1,
          label: "Broken seals:",
          detail: "Check if the meter seal is intact and not tampered with.",
        },
        {
          number: 2,
          label: "Irregular readings:",
          detail:
            "Bills significantly lower than usual without changing usage.",
        },
        {
          number: 3,
          label: "Unauthorized wires:",
          detail: "Extra wires or connections bypassing the meter.",
        },
        {
          number: 4,
          label: "Physical damage:",
          detail: "Scratches, dents, or signs of forced opening.",
        },
      ],
      suspiciousActivitySteps: [
        {
          icon: "flag",
          iconColor: "#E53E3E",
          text: "Report immediately: Use the 'Report Issue' feature in the app to notify authorities.",
        },
        {
          icon: "camera",
          iconColor: "#38A169",
          text: "Document evidence: Take clear photos of any suspicious activity or tampering.",
        },
        {
          icon: "hand-left",
          iconColor: "#D69E2E",
          text: "Do not intervene: Avoid confronting suspects directly. Let trained officials handle it.",
        },
        {
          icon: "call",
          iconColor: "#4299E1",
          text: "Call helpline: Contact the emergency helpline for urgent cases.",
        },
      ],
    });

    console.log("✅ learnContent seeded successfully in Firebase!");
    return true;
  } catch (error) {
    console.error("❌ Seed error:", error);
    return false;
  }
}