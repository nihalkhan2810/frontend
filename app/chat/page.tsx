"use client";

import { useState, useRef, useEffect } from "react";
import Navbar from "../components/Navbar";
import { sendChat } from "../lib/api";
import styles from "./chat.module.css";

interface Message {
    id: string;
    role: "user" | "bot";
    content: string;
    sources?: string[];
}

const TONES = ["Corporate", "Conversational", "Casual", "Gen Z"] as const;

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "bot",
            content:
                "Welcome to Nihal. I've successfully connected to your data sources. How can I assist you with your personalized information today?",
        },
    ]);
    const [input, setInput] = useState("");
    const [tone, setTone] = useState<string>("Conversational");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
        }
    }, [input]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input.trim(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const res = await sendChat(userMsg.content, tone.toLowerCase().replace(" ", ""));
            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "bot",
                content: res.answer,
                sources: res.sources,
            };
            setMessages((prev) => [...prev, botMsg]);
        } catch (err) {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "bot",
                content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : "Unknown error"}. Make sure the backend is running and documents are ingested.`,
            };
            setMessages((prev) => [...prev, errorMsg]);
        }

        setLoading(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Simple markdown-like rendering
    const renderContent = (content: string) => {
        // Split by code blocks first
        const parts = content.split(/(```[\s\S]*?```)/g);
        return parts.map((part, i) => {
            if (part.startsWith("```") && part.endsWith("```")) {
                const code = part.slice(3, -3).replace(/^\w+\n/, "");
                return (
                    <pre key={i} className={styles.codeBlock}>
                        <code>{code}</code>
                    </pre>
                );
            }

            // Process inline formatting
            const lines = part.split("\n");
            return lines.map((line, j) => {
                // Headers
                if (line.startsWith("### ")) return <h4 key={`${i}-${j}`} className={styles.mdH}>{line.slice(4)}</h4>;
                if (line.startsWith("## ")) return <h3 key={`${i}-${j}`} className={styles.mdH}>{line.slice(3)}</h3>;
                if (line.startsWith("# ")) return <h2 key={`${i}-${j}`} className={styles.mdH}>{line.slice(2)}</h2>;

                // Bullet points
                if (line.match(/^[-*•]\s/)) {
                    return <li key={`${i}-${j}`} className={styles.mdLi}>{line.slice(2)}</li>;
                }

                // Bold
                const boldProcessed = line.replace(
                    /\*\*(.*?)\*\*/g,
                    '<strong>$1</strong>'
                );

                if (line.trim() === "") return <br key={`${i}-${j}`} />;

                return (
                    <p
                        key={`${i}-${j}`}
                        className={styles.mdP}
                        dangerouslySetInnerHTML={{ __html: boldProcessed }}
                    />
                );
            });
        });
    };

    return (
        <div className={styles.page}>
            <Navbar />

            {/* ── Messages Area ─────────────────────────────────────── */}
            <div className={styles.messagesArea}>
                {messages.length <= 1 && (
                    <div className={styles.hero}>
                        <h1 className={styles.heroTitle}>
                            Hi there, <span className={styles.heroAccent}>how can I help today?</span>
                        </h1>
                    </div>
                )}

                <div className={styles.messages}>
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`${styles.message} ${msg.role === "user" ? styles.userMessage : styles.botMessage
                                }`}
                        >
                            {msg.role === "bot" && (
                                <div className={styles.botAvatar}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path>
                                        <path d="M12 22a2 2 0 0 1 2-2v-2a2 2 0 0 1-2-2 2 2 0 0 1-2 2v2a2 2 0 0 1 2 2z"></path>
                                        <path d="M22 12a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2 2 2 0 0 1 2-2h2a2 2 0 0 1 2 2z"></path>
                                        <path d="M2 12a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"></path>
                                        <rect x="7" y="7" width="10" height="10" rx="3"></rect>
                                    </svg>
                                </div>
                            )}
                            <div
                                className={
                                    msg.role === "user" ? styles.userBubble : styles.botBubble
                                }
                            >
                                {msg.role === "bot" ? (
                                    <div className={styles.botContent}>{renderContent(msg.content)}</div>
                                ) : (
                                    <p>{msg.content}</p>
                                )}
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className={styles.sources}>
                                        Sources: {msg.sources.join(", ")}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className={`${styles.message} ${styles.botMessage}`}>
                            <div className={styles.botAvatar}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path>
                                    <path d="M12 22a2 2 0 0 1 2-2v-2a2 2 0 0 1-2-2 2 2 0 0 1-2 2v2a2 2 0 0 1 2 2z"></path>
                                    <path d="M22 12a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2 2 2 0 0 1 2-2h2a2 2 0 0 1 2 2z"></path>
                                    <path d="M2 12a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"></path>
                                    <rect x="7" y="7" width="10" height="10" rx="3"></rect>
                                </svg>
                            </div>
                            <div className={styles.botBubble}>
                                <div className={styles.typing}>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Input Area ────────────────────────────────────────── */}
            <div className={styles.inputArea}>
                <div className={styles.inputContainer}>
                    <div className={styles.inputWrapper}>
                        <textarea
                            ref={textareaRef}
                            className={styles.textarea}
                            placeholder="Message Nihal..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            disabled={loading}
                        />
                        <div className={styles.inputActions}>
                            <button
                                className={styles.sendBtn}
                                onClick={handleSend}
                                disabled={!input.trim() || loading}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="19" x2="12" y2="5" />
                                    <polyline points="5 12 12 5 19 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* ── Tone Selector ──────────────────────────────────── */}
                    <div className={styles.toneSelector}>
                        {TONES.map((t) => (
                            <button
                                key={t}
                                className={`${styles.tonePill} ${tone === t ? styles.tonePillActive : ""}`}
                                onClick={() => setTone(t)}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <p className={styles.footerText}>
                    POWERED BY NIHAL PERSONAL RAG ENGINE
                </p>
            </div >
        </div >
    );
}
