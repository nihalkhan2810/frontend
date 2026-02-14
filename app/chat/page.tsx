"use client";

import { useState, useRef, useEffect } from "react";
import Navbar from "../components/Navbar";
import { sendChat } from "../lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
            content: "Hey, I'm Nihal. I've connected to my data sources—how can I help you today?",
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

    // ── Persistence: Focus on input after loading ────────────────────
    useEffect(() => {
        if (!loading) {
            textareaRef.current?.focus();
        }
    }, [loading]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input.trim(),
        };

        const botMsgPlaceholder: Message = {
            id: (Date.now() + 1).toString(),
            role: "bot",
            content: "",
            sources: [],
        };

        setMessages((prev) => [...prev, userMsg, botMsgPlaceholder]);
        setInput("");
        setLoading(true);

        try {
            const history = messages
                .filter(m => m.id !== "welcome")
                .map(m => ({ role: m.role, content: m.content }));

            const response = await fetch("http://localhost:8000/api/chat/stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question: userMsg.content,
                    tone: tone,
                    history: history
                }),
            });

            if (!response.ok) throw new Error("Streaming request failed");

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let accumulatedAnswer = "";
            let finalSources: string[] = [];

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split("\n");

                    for (const line of lines) {
                        if (line.startsWith("data: ")) {
                            const dataStr = line.slice(6).trim();
                            if (dataStr === "[DONE]") break;

                            try {
                                const data = JSON.parse(dataStr);
                                if (data.answer) {
                                    accumulatedAnswer += data.answer;
                                }
                                if (data.sources) {
                                    finalSources = data.sources;
                                }

                                // Update the placeholder message in real-time
                                setMessages((prev) => {
                                    const newMsgs = [...prev];
                                    const index = newMsgs.findIndex(m => m.id === botMsgPlaceholder.id);
                                    if (index !== -1) {
                                        newMsgs[index] = {
                                            ...newMsgs[index],
                                            content: accumulatedAnswer,
                                            sources: finalSources,
                                        };
                                    }
                                    return newMsgs;
                                });
                            } catch (e) {
                                // Bit of a dirty chunk, ignore or log
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Streaming error:", error);
            setMessages((prev) => {
                const newMsgs = [...prev];
                const index = newMsgs.findIndex(m => m.id === botMsgPlaceholder.id);
                if (index !== -1) {
                    newMsgs[index] = {
                        ...newMsgs[index],
                        content: "Sorry, I encountered an error while processing your request.",
                    };
                }
                return newMsgs;
            });
        }

        setLoading(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
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
                                    <div className={styles.botContent}>
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                h1: ({ ...props }) => <h1 className={styles.mdH} {...props} />,
                                                h2: ({ ...props }) => <h2 className={styles.mdH} {...props} />,
                                                h3: ({ ...props }) => <h3 className={styles.mdH} {...props} />,
                                                p: ({ ...props }) => <p className={styles.mdP} {...props} />,
                                                ul: ({ ...props }) => <ul className={styles.mdUl} {...props} />,
                                                ol: ({ ...props }) => <ol className={styles.mdOl} {...props} />,
                                                li: ({ ...props }) => <li className={styles.mdLi} {...props} />,
                                                code: ({ node, ...props }) => (
                                                    <pre className={styles.codeBlock}>
                                                        <code {...props} />
                                                    </pre>
                                                ),
                                            }}
                                        >
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
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
