"use client";

import { useState, useRef, useEffect } from "react";
import { useChat, Message } from "ai/react";
import { MessageSquare, Send, Bot, User, Minimize2, Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import ReactMarkdown from 'react-markdown';

export function RayBot() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const [pageContext, setPageContext] = useState("");

    useEffect(() => {
        if (!isOpen) return;
        // Obtenemos contexto del DOM cuando se abre el chat o cambia la ruta
        const mainEl = document.querySelector('main') || document.body;
        const textContext = mainEl?.innerText?.replace(/\n+/g, ' ').substring(0, 4000) || "";
        setPageContext(textContext);
    }, [pathname, isOpen]);

    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: "/api/chat",
        body: {
            pathname,
            pageContext
        },
        onError: (error: Error) => {
            console.error("Chat error:", error);
        }
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_10px_25px_-5px_rgba(99,102,241,0.4)] transition-all hover:shadow-[0_15px_30px_-5px_rgba(99,102,241,0.6)] hover:scale-110 active:scale-95 group"
                aria-label="Open RayBot Chat"
            >
                <Bot className="h-7 w-7" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-violet-600 border-2 border-white"></span>
                </span>
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex w-[380px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] sm:w-[450px] transition-all duration-500 animate-in fade-in zoom-in-95 slide-in-from-bottom-5">
            {/* Light Futuristic Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 backdrop-blur-md px-5 py-5">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="absolute -inset-1 rounded-full bg-indigo-500 opacity-20 blur-sm"></div>
                        <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white border border-slate-200 text-indigo-600 shadow-sm">
                            <Bot size={24} className="animate-pulse" />
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            RAYBOT <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">Advisor</span>
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Neural Engine Online</p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all border border-transparent"
                >
                    <Minimize2 size={20} />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex h-[400px] flex-col overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-slate-400">
                        <Bot size={48} className="text-blue-500/50" />
                        <div className="space-y-1">
                            <p className="font-medium text-slate-300">Hello! I'm RayBot.</p>
                            <p className="text-sm">Ask me about any report, SDLC phases, or how to improve your KPIs.</p>
                        </div>
                    </div>
                )}

                {messages.map((message: Message) => (
                    <div
                        key={message.id}
                        className={`flex w-full ${message.role === "user" ? "justify-end" : "justify-start"
                            }`}
                    >
                        <div className={`flex max-w-[88%] gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl mt-1.5 transition-all ${message.role === "user"
                                    ? "bg-slate-100 text-slate-500 border border-slate-200"
                                    : "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                                }`}>
                                {message.role === "user" ? <User size={14} /> : <Bot size={14} />}
                            </div>
                            <div
                                className={`rounded-2xl px-5 py-4 text-[14px] leading-relaxed relative border ${message.role === "user"
                                        ? "bg-slate-50 border-slate-200 text-slate-800 rounded-tr-sm"
                                        : "bg-white border-slate-100 shadow-sm text-slate-700 rounded-tl-sm"
                                    }`}
                            >
                                <div className={`prose prose-slate prose-sm max-w-none ${message.role === "user" ? "text-slate-800" : "text-slate-700"}`}>
                                    <ReactMarkdown
                                        components={{
                                            h1: ({ children }) => <h1 className="text-base font-bold my-1.5 text-indigo-700">{children}</h1>,
                                            h2: ({ children }) => <h2 className="text-base font-bold my-1.5 text-indigo-700">{children}</h2>,
                                            h3: ({ children }) => <h3 className="text-sm font-bold my-1 text-indigo-600">{children}</h3>,
                                            p: ({ children }) => <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>,
                                            ul: ({ children }) => <ul className="list-disc ml-4 mb-2.5 space-y-1">{children}</ul>,
                                            ol: ({ children }) => <ol className="list-decimal ml-4 mb-2.5 space-y-1">{children}</ol>,
                                            li: ({ children }) => <li className="mb-1">{children}</li>,
                                            strong: ({ children }) => <strong className="font-bold text-indigo-600">{children}</strong>,
                                            code: ({ children }) => <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-600 font-mono text-[12px]">{children}</code>,
                                        }}
                                    >
                                        {message.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start animate-pulse">
                        <div className="flex max-w-[80%] gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl mt-1.5 bg-indigo-600 text-white">
                                <Bot size={14} />
                            </div>
                            <div className="flex items-center rounded-2xl px-5 py-4 bg-slate-50 border border-slate-100">
                                <div className="flex gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Light Futuristic Input Area */}
            <div className="p-4 bg-white border-t border-slate-100">
                <form onSubmit={handleSubmit} className="flex gap-2.5 items-center">
                    <div className="flex-1 relative group">
                        <input
                            value={input}
                            onChange={handleInputChange}
                            placeholder="Type a message..."
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-inner"
                            disabled={isLoading}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100 transition-all hover:scale-105 active:scale-95 disabled:opacity-20 disabled:grayscale disabled:scale-100"
                    >
                        <Send size={18} className={input.trim() ? "translate-x-0.5" : ""} />
                    </button>
                </form>
                <div className="mt-3 text-center">
                    <p className="text-[10px] text-slate-400 font-bold tracking-tight uppercase">RayBot Neural Assistant // v1.2</p>
                </div>
            </div>
        </div>
    );
}
