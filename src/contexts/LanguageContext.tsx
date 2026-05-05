import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Lang = "en" | "bn";

type Dict = Record<string, { en: string; bn: string }>;

// All translatable strings used across the public site.
export const translations: Dict = {
  // Navbar
  "nav.features": { en: "Features", bn: "ফিচার" },
  "nav.how": { en: "How It Works", bn: "যেভাবে কাজ করে" },
  "nav.pricing": { en: "Pricing", bn: "প্রাইসিং" },
  "nav.docs": { en: "Documentation", bn: "ডকুমেন্টেশন" },
  "nav.help": { en: "Help", bn: "সহায়তা" },
  "nav.login": { en: "Login", bn: "লগইন" },
  "nav.getStarted": { en: "Get Started", bn: "শুরু করুন" },
  "nav.langLabel": { en: "EN", bn: "BN" },
  "nav.langTooltip": { en: "Switch to Bangla", bn: "Switch to English" },

  // Hero
  "hero.badge.new": { en: "New", bn: "নতুন" },
  "hero.badge.trust": { en: "Trusted by 10,000+ developers worldwide", bn: "বিশ্বজুড়ে ১০,০০০+ ডেভেলপারের আস্থা" },
  "hero.title.1": { en: "The All-in-One", bn: "অল-ইন-ওয়ান" },
  "hero.title.2": { en: "WhatsApp API +", bn: "হোয়াটসঅ্যাপ API +" },
  "hero.title.3": { en: "AI Automation", bn: "AI অটোমেশন" },
  "hero.title.4": { en: "Platform", bn: "প্ল্যাটফর্ম" },
  "hero.subtitle": {
    en: "Send unlimited messages, manage multiple sessions, and power smart AI-driven conversations — all without per-message fees or complicated setup.",
    bn: "আনলিমিটেড মেসেজ পাঠান, একাধিক সেশন ম্যানেজ করুন এবং স্মার্ট AI-চালিত কথোপকথন চালান — কোনো পার-মেসেজ ফি বা জটিল সেটআপ ছাড়াই।",
  },
  "hero.cta.trial": { en: "Start Your Free Trial", bn: "ফ্রি ট্রায়াল শুরু করুন" },
  "hero.cta.docs": { en: "View API Docs", bn: "API ডকস দেখুন" },
  "hero.trust.noCard": { en: "No credit card required", bn: "ক্রেডিট কার্ড লাগবে না" },
  "hero.trust.trial": { en: "3-day free trial", bn: "৩ দিনের ফ্রি ট্রায়াল" },
  "hero.trust.cancel": { en: "Cancel anytime", bn: "যেকোনো সময় বাতিল" },
  "hero.stat.devs": { en: "Active Developers", bn: "অ্যাক্টিভ ডেভেলপার" },
  "hero.stat.msgs": { en: "Messages Sent", bn: "মেসেজ পাঠানো হয়েছে" },
  "hero.stat.uptime": { en: "Uptime SLA", bn: "আপটাইম SLA" },
  "hero.stat.rating": { en: "Customer Rating", bn: "কাস্টমার রেটিং" },

  // Code section
  "code.title.1": { en: "WhatsApp Integration Made", bn: "হোয়াটসঅ্যাপ ইন্টিগ্রেশন এখন" },
  "code.title.2": { en: "Effortless", bn: "সহজ" },
  "code.subtitle": { en: "Drop a few lines of code. Start sending in minutes.", bn: "কয়েক লাইন কোড লিখুন। কয়েক মিনিটেই মেসেজ পাঠান।" },

  // How
  "how.badge": { en: "Simple 3-step process", bn: "সহজ ৩-ধাপের প্রসেস" },
  "how.title.1": { en: "How It", bn: "যেভাবে" },
  "how.title.2": { en: "Works", bn: "কাজ করে" },
  "how.subtitle": { en: "From zero to sending messages in under 2 minutes.", bn: "মাত্র ২ মিনিটেই শূন্য থেকে মেসেজ পাঠানো শুরু।" },
  "how.s1.t": { en: "Connect Your WhatsApp", bn: "আপনার হোয়াটসঅ্যাপ কানেক্ট করুন" },
  "how.s1.d": { en: "Scan a QR code from your phone to link a session in seconds.", bn: "ফোন থেকে QR কোড স্ক্যান করে সেকেন্ডেই সেশন লিঙ্ক করুন।" },
  "how.s2.t": { en: "Create Your Message", bn: "আপনার মেসেজ তৈরি করুন" },
  "how.s2.d": { en: "Build text, media, polls, locations or contacts via the API.", bn: "API দিয়ে টেক্সট, মিডিয়া, পোল, লোকেশন বা কন্ট্যাক্ট তৈরি করুন।" },
  "how.s3.t": { en: "Send & Analyze", bn: "পাঠান ও বিশ্লেষণ করুন" },
  "how.s3.d": { en: "Track delivery, receipts and webhooks in real time.", bn: "রিয়েল-টাইমে ডেলিভারি, রিসিপ্ট ও ওয়েবহুক ট্র্যাক করুন।" },

  // Message types section
  "mt.badge": { en: "Real-time AI conversations", bn: "রিয়েল-টাইম AI কথোপকথন" },
  "mt.title.1": { en: "Every message type,", bn: "সব ধরনের মেসেজ," },
  "mt.title.2": { en: "handled by AI", bn: "AI সামলাবে" },
  "mt.subtitle": {
    en: "WaReply AI auto-replies across text, image, voice, video and more — in seconds, in your customer's language.",
    bn: "WaReply AI টেক্সট, ছবি, ভয়েস, ভিডিওসহ সব ফরম্যাটে অটো-রিপ্লাই দেয় — সেকেন্ডে, কাস্টমারের নিজের ভাষায়।",
  },
  "mt.section.types": { en: "Message Types", bn: "মেসেজের ধরন" },
  "mt.section.sendTo": { en: "Send To", bn: "যাদের পাঠাবেন" },
  "mt.featured.t": { en: "Text & Rich Replies", bn: "টেক্সট ও রিচ রিপ্লাই" },
  "mt.featured.d": { en: "Smart formatted text with buttons, lists & multilingual auto-reply.", bn: "বাটন, লিস্ট ও মাল্টিলিঙ্গুয়াল অটো-রিপ্লাই সহ স্মার্ট ফরম্যাটেড টেক্সট।" },
  "mt.featured.tag": { en: "Most used", bn: "সবচেয়ে ব্যবহৃত" },
  "mt.image.l": { en: "Image", bn: "ছবি" },
  "mt.image.d": { en: "Photos & captions", bn: "ফটো ও ক্যাপশন" },
  "mt.video.l": { en: "Video", bn: "ভিডিও" },
  "mt.video.d": { en: "MP4 & shorts", bn: "MP4 ও শর্টস" },
  "mt.doc.l": { en: "Document", bn: "ডকুমেন্ট" },
  "mt.doc.d": { en: "PDF, DOCX, XLS", bn: "PDF, DOCX, XLS" },
  "mt.voice.l": { en: "Voice", bn: "ভয়েস" },
  "mt.voice.d": { en: "Audio notes", bn: "অডিও নোট" },
  "mt.location.l": { en: "Location", bn: "লোকেশন" },
  "mt.location.d": { en: "Live & static pins", bn: "লাইভ ও স্ট্যাটিক পিন" },
  "mt.contact.l": { en: "Contact", bn: "কন্ট্যাক্ট" },
  "mt.contact.d": { en: "vCards", bn: "vCards" },
  "mt.users.l": { en: "Users", bn: "ইউজার" },
  "mt.users.d": { en: "1-on-1 chats", bn: "ওয়ান-টু-ওয়ান চ্যাট" },
  "mt.groups.l": { en: "Groups", bn: "গ্রুপ" },
  "mt.groups.d": { en: "Multi-member", bn: "মাল্টি-মেম্বার" },
  "mt.channels.l": { en: "Channels", bn: "চ্যানেল" },
  "mt.channels.d": { en: "Broadcast", bn: "ব্রডকাস্ট" },
  "mt.cta": { en: "Start Integrating Now", bn: "এখনই ইন্টিগ্রেট করুন" },

  // Use cases
  "uc.badge": { en: "Use cases", bn: "ব্যবহার ক্ষেত্র" },
  "uc.title.1": { en: "Built for", bn: "তৈরি" },
  "uc.title.2": { en: "every use case", bn: "সব ব্যবহারের জন্য" },
  "uc.subtitle": { en: "From customer support to advanced analytics — power any workflow with one API.", bn: "কাস্টমার সাপোর্ট থেকে অ্যাডভান্সড অ্যানালিটিক্স — একটি API দিয়ে যেকোনো ওয়ার্কফ্লো চালান।" },
  "uc.learnMore": { en: "Learn more", bn: "আরও জানুন" },
  "uc.1.t": { en: "Customer Support Automation", bn: "কাস্টমার সাপোর্ট অটোমেশন" },
  "uc.1.d": { en: "Auto-reply, route tickets, and escalate to humans seamlessly.", bn: "অটো-রিপ্লাই, টিকেট রাউট ও সহজে হিউম্যানে এসকেলেট করুন।" },
  "uc.2.t": { en: "Real-time Business Alerts", bn: "রিয়েল-টাইম বিজনেস অ্যালার্ট" },
  "uc.2.d": { en: "Send order updates, stock alerts and reminders instantly.", bn: "অর্ডার আপডেট, স্টক অ্যালার্ট ও রিমাইন্ডার তাৎক্ষণিক পাঠান।" },
  "uc.3.t": { en: "AI-Powered Virtual Assistants", bn: "AI-চালিত ভার্চুয়াল অ্যাসিস্ট্যান্ট" },
  "uc.3.d": { en: "Pair with LLMs to handle conversations 24/7.", bn: "LLM-এর সাথে যুক্ত করে ২৪/৭ কথোপকথন সামলান।" },
  "uc.4.t": { en: "Dynamic Lead Nurturing", bn: "ডায়নামিক লিড নার্চারিং" },
  "uc.4.d": { en: "Drip-feed leads through personalized sequences.", bn: "পার্সোনালাইজড সিকোয়েন্সের মাধ্যমে লিড নার্চার করুন।" },
  "uc.5.t": { en: "E-commerce Engagement", bn: "ই-কমার্স এনগেজমেন্ট" },
  "uc.5.d": { en: "Cart recovery, order confirmations, post-purchase flows.", bn: "কার্ট রিকভারি, অর্ডার কনফার্মেশন, পোস্ট-পারচেজ ফ্লো।" },
  "uc.6.t": { en: "Advanced Analytics", bn: "অ্যাডভান্সড অ্যানালিটিক্স" },
  "uc.6.d": { en: "Pipe message events into your data warehouse.", bn: "মেসেজ ইভেন্ট আপনার ডেটা ওয়্যারহাউসে পাইপ করুন।" },

  // Pricing
  "price.badge": { en: "Pricing plans", bn: "প্রাইসিং প্ল্যান" },
  "price.title.1": { en: "Simple, transparent", bn: "সহজ, স্বচ্ছ" },
  "price.title.2": { en: "pricing", bn: "প্রাইসিং" },
  "price.subtitle": { en: "No per-message fees. No hidden charges. Cancel anytime.", bn: "কোনো পার-মেসেজ ফি নেই। লুকানো চার্জ নেই। যেকোনো সময় বাতিল।" },
  "price.monthly": { en: "Monthly", bn: "মাসিক" },
  "price.yearly": { en: "Yearly", bn: "বার্ষিক" },
  "price.popular": { en: "Popular", bn: "জনপ্রিয়" },
  "price.free": { en: "Free", bn: "ফ্রি" },
  "price.perMo": { en: "/mo", bn: "/মাস" },
  "price.billed": { en: "Billed", bn: "বিল করা হবে" },
  "price.yearlySuffix": { en: "yearly", bn: "বার্ষিক" },
  "price.numbers.one": { en: "Connected WhatsApp Number", bn: "কানেক্টেড হোয়াটসঅ্যাপ নাম্বার" },
  "price.numbers.many": { en: "Connected WhatsApp Numbers", bn: "কানেক্টেড হোয়াটসঅ্যাপ নাম্বার" },
  "price.cta.default": { en: "Choose Plan", bn: "প্ল্যান বেছে নিন" },
  "price.partner.t": { en: "Need higher volume or custom infrastructure?", bn: "বেশি ভলিউম বা কাস্টম ইনফ্রাস্ট্রাকচার দরকার?" },
  "price.partner.d": { en: "Join our partner program for custom plans and dedicated infrastructure.", bn: "কাস্টম প্ল্যান ও ডেডিকেটেড ইনফ্রার জন্য আমাদের পার্টনার প্রোগ্রামে যোগ দিন।" },
  "price.partner.cta": { en: "Partner Program", bn: "পার্টনার প্রোগ্রাম" },

  // FAQ
  "faq.badge": { en: "FAQ", bn: "প্রশ্নোত্তর" },
  "faq.title.1": { en: "Frequently Asked", bn: "সচরাচর জিজ্ঞাসিত" },
  "faq.title.2": { en: "Questions", bn: "প্রশ্ন" },
  "faq.subtitle": { en: "Everything you need to know. Can't find an answer? Reach out to our team.", bn: "যা যা জানা দরকার সব এখানে। উত্তর না পেলে আমাদের টিমকে নক করুন।" },
  "faq.contact.1": { en: "Still have questions?", bn: "আরও প্রশ্ন আছে?" },
  "faq.contact.2": { en: "Contact our support team", bn: "আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন" },
  "faq.q1.q": { en: "Do you charge per message?", bn: "আপনারা কি প্রতি মেসেজে চার্জ নেন?" },
  "faq.q1.a": { en: "No. All paid plans include unlimited messages with no per-message fees.", bn: "না। সব পেইড প্ল্যানে আনলিমিটেড মেসেজ — কোনো পার-মেসেজ ফি নেই।" },
  "faq.q2.q": { en: "How many WhatsApp numbers can I connect?", bn: "আমি কতগুলো হোয়াটসঅ্যাপ নাম্বার কানেক্ট করতে পারব?" },
  "faq.q2.a": { en: "It depends on your plan: Basic 1, Pro 3, Plus 6, Business 10. Need more? Contact us.", bn: "প্ল্যান অনুযায়ী: Basic ১, Pro ৩, Plus ৬, Business ১০। আরও দরকার হলে আমাদের জানান।" },
  "faq.q3.q": { en: "Is a credit card required for the trial?", bn: "ট্রায়ালের জন্য কি ক্রেডিট কার্ড লাগে?" },
  "faq.q3.a": { en: "No, you can start your 3-day trial without entering any payment details.", bn: "না, কোনো পেমেন্ট ডিটেইলস ছাড়াই ৩ দিনের ট্রায়াল শুরু করতে পারবেন।" },
  "faq.q4.q": { en: "Will my WhatsApp account get banned?", bn: "আমার হোয়াটসঅ্যাপ অ্যাকাউন্ট কি ব্যান হবে?" },
  "faq.q4.a": { en: "Account Protection enforces safe sending limits. As with any unofficial API, follow WhatsApp's policies.", bn: "Account Protection নিরাপদ সেন্ডিং লিমিট নিশ্চিত করে। যেকোনো আনঅফিসিয়াল API-র মতোই হোয়াটসঅ্যাপের পলিসি মেনে চলুন।" },
  "faq.q5.q": { en: "Do you provide an n8n integration?", bn: "আপনারা কি n8n ইন্টিগ্রেশন দেন?" },
  "faq.q5.a": { en: "Yes, we maintain an official n8n community node. See our docs for installation.", bn: "হ্যাঁ, আমাদের অফিসিয়াল n8n কমিউনিটি নোড আছে। ইনস্টলেশনের জন্য ডকস দেখুন।" },
  "faq.q6.q": { en: "Can I send media (images, video, documents)?", bn: "আমি কি মিডিয়া (ছবি, ভিডিও, ডকুমেন্ট) পাঠাতে পারব?" },
  "faq.q6.a": { en: "Yes — text, image, video, audio, document, location, contact, sticker and poll messages.", bn: "হ্যাঁ — টেক্সট, ছবি, ভিডিও, অডিও, ডকুমেন্ট, লোকেশন, কন্ট্যাক্ট, স্টিকার ও পোল মেসেজ।" },
  "faq.q7.q": { en: "Are webhooks supported?", bn: "ওয়েবহুক কি সাপোর্ট করে?" },
  "faq.q7.a": { en: "Absolutely. Subscribe to 20+ event types per session and receive JSON POSTs to your URL.", bn: "অবশ্যই। প্রতি সেশনে ২০+ ইভেন্টে সাবস্ক্রাইব করে আপনার URL-এ JSON POST পান।" },
  "faq.q8.q": { en: "Can I cancel any time?", bn: "আমি কি যেকোনো সময় বাতিল করতে পারব?" },
  "faq.q8.a": { en: "Yes, cancel from your dashboard at any point. No long-term contracts.", bn: "হ্যাঁ, যেকোনো সময় ড্যাশবোর্ড থেকে বাতিল করুন। কোনো লং-টার্ম কন্ট্রাক্ট নেই।" },

  // Final CTA
  "cta.badge": { en: "Premium Access", bn: "প্রিমিয়াম অ্যাক্সেস" },
  "cta.title.1": { en: "Fast, Easy, Affordable", bn: "দ্রুত, সহজ, সাশ্রয়ী" },
  "cta.title.2": { en: "WhatsApp API", bn: "হোয়াটসঅ্যাপ API" },
  "cta.subtitle": {
    en: "WaSendAPI is a fast, affordable WhatsApp API for developers. Manage multiple sessions and scale without per-message fees. Try it free today!",
    bn: "WaSendAPI হলো ডেভেলপারদের জন্য দ্রুত, সাশ্রয়ী হোয়াটসঅ্যাপ API। একাধিক সেশন ম্যানেজ করুন এবং পার-মেসেজ ফি ছাড়াই স্কেল করুন। আজই ফ্রি ট্রাই করুন!",
  },
  "cta.l1": { en: "No credit card required to start", bn: "শুরু করতে ক্রেডিট কার্ড লাগবে না" },
  "cta.l2": { en: "3-day free trial with full access", bn: "ফুল অ্যাক্সেস সহ ৩ দিনের ফ্রি ট্রায়াল" },
  "cta.l3": { en: "Cancel anytime, no commitments", bn: "যেকোনো সময় বাতিল, কোনো বাধ্যবাধকতা নেই" },
  "cta.btn.note": { en: "No credit card required to get started", bn: "শুরু করতে ক্রেডিট কার্ড লাগবে না" },

  // Footer
  "foot.tagline": { en: "The developer-friendly WhatsApp API. Unlimited messages, no per-message fees.", bn: "ডেভেলপার-ফ্রেন্ডলি হোয়াটসঅ্যাপ API। আনলিমিটেড মেসেজ, কোনো পার-মেসেজ ফি নেই।" },
  "foot.product": { en: "Product", bn: "প্রোডাক্ট" },
  "foot.company": { en: "Company", bn: "কোম্পানি" },
  "foot.resources": { en: "Resources", bn: "রিসোর্স" },
  "foot.features": { en: "Features", bn: "ফিচার" },
  "foot.pricing": { en: "Pricing", bn: "প্রাইসিং" },
  "foot.docs": { en: "Documentation", bn: "ডকুমেন্টেশন" },
  "foot.about": { en: "About", bn: "আমাদের সম্পর্কে" },
  "foot.blog": { en: "Blog", bn: "ব্লগ" },
  "foot.partner": { en: "Partner Program", bn: "পার্টনার প্রোগ্রাম" },
  "foot.help": { en: "Help Center", bn: "হেল্প সেন্টার" },
  "foot.status": { en: "Status", bn: "স্ট্যাটাস" },
  "foot.changelog": { en: "Changelog", bn: "চেঞ্জলগ" },
  "foot.rights": { en: "All rights reserved.", bn: "সর্বস্বত্ব সংরক্ষিত।" },
};

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    return (localStorage.getItem("lang") as Lang) || "en";
  });

  useEffect(() => {
    localStorage.setItem("lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: Lang) => setLangState(l);
  const toggle = () => setLangState((p) => (p === "en" ? "bn" : "en"));
  const t = (key: string) => translations[key]?.[lang] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
