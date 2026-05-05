import { useEffect, useRef, useState } from "react";
import { CheckCheck, Mic, Camera, Paperclip, Smile, Video, ArrowLeft, MoreVertical, BadgeCheck } from "lucide-react";
import wareplyLogo from "@/assets/wareply-logo.png";
import productImg from "@/assets/product-headphones.png";

type MsgType = "text" | "image" | "voice" | "video" | "ai-text" | "ai-voice" | "typing";
interface Msg {
  id: number;
  side: "in" | "out";
  type: MsgType;
  content?: string;
  caption?: string;
  time?: string;
}

const script: Msg[] = [
  { id: 1, side: "in", type: "text", content: "Hi! Do you have this in stock? 🙏", time: "10:21" },
  { id: 2, side: "out", type: "typing" },
  { id: 3, side: "out", type: "ai-text", content: "Hello! 👋 Yes, we do — which color are you looking for?", time: "10:21" },
  { id: 4, side: "in", type: "image", caption: "This one 👇", time: "10:22" },
  { id: 5, side: "out", type: "typing" },
  { id: 6, side: "out", type: "ai-text", content: "Nice pick! ✨ That's our **Pro Wireless Headphones** — $79. Free shipping & 2-year warranty included.", time: "10:22" },
  { id: 7, side: "in", type: "voice", time: "10:23" },
  { id: 8, side: "out", type: "typing" },
  { id: 9, side: "out", type: "ai-text", content: "Sure! 🚚 Delivery takes 2–3 business days to your area, and payment is cash on delivery.", time: "10:23" },
  { id: 10, side: "in", type: "text", content: "Can you send a product video please? 🎥", time: "10:24" },
  { id: 11, side: "out", type: "typing" },
  { id: 12, side: "out", type: "video", caption: "Here's a quick demo 🎁✨", time: "10:24" },
  { id: 13, side: "out", type: "ai-text", content: "Want me to send the order link? 🚀", time: "10:24" },
];

export const WhatsAppMockup = () => {
  const [visible, setVisible] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let i = 0;

    const tick = async () => {
      while (!cancelled) {
        const msg = script[i];
        if (msg.type === "typing") {
          setVisible((prev) => [...prev, msg]);
          await wait(1200);
          setVisible((prev) => prev.filter((m) => m.id !== msg.id));
        } else {
          setVisible((prev) => [...prev, msg]);
          await wait(msg.side === "in" ? 1500 : 1800);
        }
        i++;
        if (i >= script.length) {
          await wait(2500);
          if (!cancelled) {
            // smooth scroll back to top before restart
            if (scrollRef.current) {
              scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
            }
            await wait(1200);
            setVisible([]);
            i = 0;
          }
        }
      }
    };
    tick();
    return () => { cancelled = true; };
  }, []);

  // Auto scroll to bottom when a new message appears
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [visible]);

  return (
    <div className="relative">
      {/* Glow */}
      <div className="absolute -inset-8 bg-primary/20 blur-3xl rounded-full opacity-60 wa-bg-float" />

      {/* iPhone frame */}
      <div className="relative w-[320px] h-[640px] bg-[#1a1a1a] rounded-[3rem] p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] border border-white/5">
        {/* Side buttons */}
        <div className="absolute -left-[3px] top-24 h-8 w-[3px] bg-[#1a1a1a] rounded-l" />
        <div className="absolute -left-[3px] top-36 h-12 w-[3px] bg-[#1a1a1a] rounded-l" />
        <div className="absolute -left-[3px] top-52 h-12 w-[3px] bg-[#1a1a1a] rounded-l" />
        <div className="absolute -right-[3px] top-32 h-16 w-[3px] bg-[#1a1a1a] rounded-r" />

        {/* Screen */}
        <div className="relative w-full h-full rounded-[2.4rem] overflow-hidden bg-[#0b141a] flex flex-col">
          {/* Dynamic Island */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-30" />

          {/* WhatsApp Header */}
          <div className="bg-[#1f2c33] pt-9 pb-2 px-3 flex items-center gap-2.5 z-20 shadow-md">
            <ArrowLeft className="h-5 w-5 text-white/80" />
            <div className="relative">
              <div className="h-9 w-9 rounded-full bg-white overflow-hidden grid place-items-center shrink-0">
                <img src={wareplyLogo} alt="WaReply AI" className="h-full w-full object-cover" />
              </div>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-primary border-2 border-[#1f2c33]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-white text-sm font-semibold truncate">WaReply AI</span>
                <BadgeCheck className="h-3.5 w-3.5 text-primary fill-primary/20" />
              </div>
              <div className="text-[10px] text-white/60">online · typing instantly</div>
            </div>
            <Video className="h-5 w-5 text-white/80" />
            <MoreVertical className="h-5 w-5 text-white/80" />
          </div>

          {/* Chat area */}
          <div
            ref={scrollRef}
            className="wa-bg flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 flex flex-col gap-1.5 scroll-smooth wa-scroll"
          >
            <div className="text-center my-1">
              <span className="bg-[#182229] text-[10px] text-white/60 px-2.5 py-1 rounded-md">TODAY</span>
            </div>
            {visible.map((m) => (
              <ChatBubble key={m.id} msg={m} />
            ))}
          </div>

          {/* Input bar */}
          <div className="bg-[#1f2c33] px-2 py-2 flex items-center gap-2">
            <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-2 flex items-center gap-2">
              <Smile className="h-4 w-4 text-white/60" />
              <span className="text-xs text-white/40 flex-1">Message</span>
              <Paperclip className="h-4 w-4 text-white/60" />
              <Camera className="h-4 w-4 text-white/60" />
            </div>
            <div className="h-9 w-9 rounded-full bg-primary grid place-items-center">
              <Mic className="h-4 w-4 text-black" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const ChatBubble = ({ msg }: { msg: Msg }) => {
  const isOut = msg.side === "out";
  const base = "wa-msg max-w-[78%] px-2.5 py-1.5 text-[13px] leading-snug shadow-sm relative";
  const tail = isOut
    ? "bg-[#005c4b] text-white rounded-2xl rounded-tr-sm self-end"
    : "bg-[#1f2c33] text-white rounded-2xl rounded-tl-sm self-start";

  if (msg.type === "typing") {
    return (
      <div className={`${base} ${tail} flex items-center gap-1.5 py-2.5`}>
        <span className="wa-typing-dot h-1.5 w-1.5 rounded-full bg-white/70" style={{ animationDelay: "0s" }} />
        <span className="wa-typing-dot h-1.5 w-1.5 rounded-full bg-white/70" style={{ animationDelay: "0.2s" }} />
        <span className="wa-typing-dot h-1.5 w-1.5 rounded-full bg-white/70" style={{ animationDelay: "0.4s" }} />
      </div>
    );
  }

  if (msg.type === "image") {
    return (
      <div className={`${base} ${tail} p-1`}>
        <div className="h-40 w-48 rounded-xl bg-white grid place-items-center overflow-hidden relative">
          <img src={productImg} alt="Product" className="h-full w-full object-contain p-2" />
        </div>
        {msg.caption && <div className="px-1.5 pt-1 text-[12px]">{msg.caption}</div>}
        <Meta time={msg.time} isOut={isOut} />
      </div>
    );
  }

  if (msg.type === "video") {
    return (
      <div className={`${base} ${tail} p-1`}>
        <div className="h-32 w-44 rounded-xl bg-gradient-to-br from-blue-500/40 to-primary/30 grid place-items-center relative">
          <div className="h-10 w-10 rounded-full bg-black/50 grid place-items-center">
            <div className="h-0 w-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-white ml-1" />
          </div>
          <span className="absolute bottom-1.5 left-2 text-[10px] text-white bg-black/50 px-1.5 rounded">0:18</span>
        </div>
        {msg.caption && <div className="px-1.5 pt-1 text-[12px]">{msg.caption}</div>}
        <Meta time={msg.time} isOut={isOut} />
      </div>
    );
  }

  if (msg.type === "voice" || msg.type === "ai-voice") {
    return (
      <div className={`${base} ${tail} flex items-center gap-2 min-w-[180px]`}>
        <div className="h-7 w-7 rounded-full bg-primary/30 grid place-items-center shrink-0">
          <Mic className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="flex items-end gap-[2px] h-6 flex-1">
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className="wa-voice-bar w-[2px] bg-white/70 rounded-full"
              style={{ height: `${30 + ((i * 17) % 70)}%`, animationDelay: `${i * 0.08}s` }}
            />
          ))}
        </div>
        <span className="text-[10px] text-white/60 shrink-0">0:0{msg.type === "ai-voice" ? "9" : "5"}</span>
        <Meta time={msg.time} isOut={isOut} inline />
      </div>
    );
  }

  return (
    <div className={`${base} ${tail} pr-12`}>
      <span dangerouslySetInnerHTML={{ __html: (msg.content || "").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>") }} />
      <Meta time={msg.time} isOut={isOut} inline />
    </div>
  );
};

const Meta = ({ time, isOut, inline }: { time?: string; isOut: boolean; inline?: boolean }) => (
  <span className={`${inline ? "absolute bottom-1 right-2" : "block text-right pr-1.5 pb-0.5"} text-[9px] text-white/50 flex items-center gap-0.5 justify-end`}>
    {time}
    {isOut && <CheckCheck className="h-3 w-3 text-[#53bdeb]" />}
  </span>
);
