import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Shield, Eye, Lock, FileText } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Data Protection",
    desc: "We employ industry-standard security measures to protect your personal information from unauthorized access and disclosure.",
  },
  {
    icon: Eye,
    title: "Transparent Practices",
    desc: "We are committed to transparency in our data collection and processing practices, ensuring you always know how your information is being used.",
  },
  {
    icon: Lock,
    title: "Secure Infrastructure",
    desc: "Our platform is built on secure infrastructure with encryption at rest and in transit to safeguard your data and communications.",
  },
  {
    icon: FileText,
    title: "Compliance",
    desc: "We maintain compliance with relevant data protection regulations and industry standards to ensure proper handling of your information.",
  },
];

const sections: { title: string; items: string[] }[] = [
  {
    title: "Information We Collect",
    items: [
      "We collect information you provide directly to us when you register for an account, create or modify your profile, set preferences, sign-up for or make purchases through the Services.",
      "We collect information when you use our WhatsApp automation services, including message content, recipient information, and usage statistics.",
      "We automatically collect certain information when you use the Service, such as your IP address, device information, browser type, and how you interact with our platform.",
      "We may use cookies and similar tracking technologies to collect information about your interactions with our Service.",
    ],
  },
  {
    title: "How We Use Your Information",
    items: [
      "To provide, maintain, and improve our Services, including to process transactions, develop new products and services, and manage the performance of our Services.",
      "To communicate with you about products, services, offers, promotions, and events, and provide news and information we think will be of interest to you.",
      "To monitor and analyze trends, usage, and activities in connection with our Services.",
      "To detect, investigate, and prevent fraudulent transactions and other illegal activities and protect the rights and property of WaReply AI and others.",
      "To personalize your experience and deliver content and product and service offerings relevant to your interests.",
    ],
  },
  {
    title: "Information Sharing",
    items: [
      "We do not sell or rent your personal information to third parties for their marketing purposes without your explicit consent.",
      "We may share your information with third-party service providers who perform services on our behalf, such as payment processing, data analysis, email delivery, hosting services, and customer service.",
      "We may share information if required to comply with applicable laws and regulations, to respond to a subpoena, search warrant or other lawful request for information we receive, or to otherwise protect our rights.",
      "If WaReply AI is involved in a merger, acquisition, or sale of all or a portion of its assets, your information may be transferred as part of that transaction.",
    ],
  },
  {
    title: "Data Security",
    items: [
      "We implement appropriate technical and organizational measures to protect the security of your personal information.",
      "We use encryption protocols and software to protect your personal information during transmission and once we receive it.",
      "We regularly review our information collection, storage, and processing practices, including physical security measures, to prevent unauthorized access to our systems.",
      "While we strive to protect your personal information, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.",
    ],
  },
  {
    title: "Your Rights and Choices",
    items: [
      "You can access, update, or delete your account information at any time by logging into your account settings.",
      "You can opt-out of receiving promotional communications from us by following the instructions in those communications.",
      "You can set your browser to refuse all or some browser cookies, or to alert you when cookies are being sent.",
      "Depending on your location, you may have certain rights regarding your personal information, such as the right to access, correct, or delete your personal data.",
    ],
  },
  {
    title: "Changes to This Privacy Policy",
    items: [
      "We may update this Privacy Policy from time to time. If we make material changes, we will notify you through the Service or by other means, such as email.",
      "We encourage you to review the Privacy Policy whenever you access the Service to stay informed about our information practices and your options.",
    ],
  },
];

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="container py-16 md:py-20 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          WaReply AI <br />
          <span className="text-primary">Privacy Policy</span>
        </h1>
        <p className="mt-5 text-muted-foreground max-w-2xl mx-auto">
          Learn how we collect, use, and protect your personal information when you use our WhatsApp automation platform.
        </p>
      </section>

      {/* Feature cards */}
      <section className="container grid gap-5 md:grid-cols-2 lg:grid-cols-4 pb-12">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border border-border bg-card p-6">
            <f.icon className="h-6 w-6 text-primary" />
            <h3 className="mt-4 font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Intro card */}
      <section className="container pb-6">
        <div className="rounded-xl border border-border bg-card p-6 md:p-8">
          <h2 className="text-2xl font-semibold mb-4">Privacy Policy</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This Privacy Policy describes how WaReply AI ("we," "our," or "us") collects, uses, and shares information in connection with your use of our websites, services, and applications (collectively, the "Services"). This Privacy Policy does not apply to information we collect from our employees or contractors.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            By using the Services, you agree to the collection, use, disclosure, and procedures this Privacy Policy describes. Beyond the Privacy Policy, your use of our Services is also subject to our Terms of Service.
          </p>
          <p className="text-sm text-muted-foreground mt-4">Last Updated: May 6, 2026</p>
        </div>
      </section>

      {/* Sections */}
      <section className="container space-y-6 pb-16">
        {sections.map((s) => (
          <div key={s.title} className="rounded-xl border border-border bg-card p-6 md:p-8">
            <h2 className="text-2xl font-semibold mb-5">{s.title}</h2>
            <ul className="space-y-3">
              {s.items.map((it, i) => (
                <li key={i} className="flex gap-3 text-sm text-muted-foreground leading-relaxed">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Contact */}
        <div className="rounded-xl border border-border bg-card p-6 md:p-8">
          <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If you have any questions about this Privacy Policy or our practices, please contact us at:
          </p>
          <div className="mt-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">WaReply AI</p>
            <p>Email: privacy@wareply.ai</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Privacy;
