import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2, Bot, User } from "lucide-react";
import ChatbotAnimatedEntry from "./ChatbotAnimatedEntry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

type Message = { role: "user" | "assistant"; content: string };

interface SalesChatbotProps {
  externalOpen?: boolean;
  onExternalClose?: () => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sales-chatbot`;

const SalesChatbot = ({ externalOpen, onExternalClose }: SalesChatbotProps = {}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = (val: boolean) => {
    if (!val && onExternalClose) onExternalClose();
    setInternalOpen(val);
  };
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const greetingSent = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0 && !greetingSent.current) {
      greetingSent.current = true;
      streamChat([]);
    }
  }, [isOpen]);

  const streamChat = async (msgs: Message[]) => {
    setIsLoading(true);
    let assistantSoFar = "";

    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && isLoading) {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: msgs }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        upsert(errData.error || "Sorry, I'm having trouble connecting. Please try again!");
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch { /* partial json, wait */ }
        }
      }
    } catch {
      upsert("Sorry, something went wrong. Please try again!");
    }
    setIsLoading(false);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    const userMsg: Message = { role: "user", content: text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    await streamChat(newMsgs);
  };

  // Render markdown links as clickable
  const renderContent = (content: string) => {
    const parts = content.split(/(\[.*?\]\(.*?\))/g);
    return parts.map((part, i) => {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        const [, text, href] = match;
        return (
          <button
            key={i}
            onClick={() => { setIsOpen(false); navigate(href); }}
            className="text-accent underline font-medium hover:text-accent-hover"
          >
            {text}
          </button>
        );
      }
      // Bold
      const boldParts = part.split(/(\*\*.*?\*\*)/g);
      return boldParts.map((bp, j) => {
        const boldMatch = bp.match(/\*\*(.*?)\*\*/);
        if (boldMatch) return <strong key={`${i}-${j}`}>{boldMatch[1]}</strong>;
        return <span key={`${i}-${j}`}>{bp}</span>;
      });
    });
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[998] w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center animate-fade-in"
          aria-label="Open chat"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[998] w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-6rem)] bg-background border border-border rounded-2xl shadow-2xl flex flex-col animate-fade-in overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-accent p-4 flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary-foreground" />
              <div>
                <p className="text-sm font-semibold text-primary-foreground">Gradia Assistant</p>
                <p className="text-xs text-primary-foreground/70">Find the best plan for you</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-primary-foreground/80 hover:text-primary-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="h-4 w-4 text-accent" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}>
                  {renderContent(msg.content)}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-accent" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-3.5 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions (when no messages yet or just greeting) */}
          {messages.length <= 1 && !isLoading && (
            <div className="px-4 pb-2 flex gap-2">
              <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => { setInput("I'm a Candidate"); }}>
                🎓 I'm a Candidate
              </Button>
              <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => { setInput("I'm an Employer"); }}>
                🏢 I'm an Employer
              </Button>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-border">
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 h-9 text-sm"
                disabled={isLoading}
              />
              <Button type="submit" size="sm" className="h-9 w-9 p-0" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default SalesChatbot;
