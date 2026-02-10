"use client";

import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function Home() {
  const router = useRouter();

  const handleLogin = (role: "admin" | "viewer") => {
    if (typeof window !== "undefined") {
      localStorage.setItem("nihal-rag-role", role);
    }
    if (role === "admin") {
      router.push("/admin");
    } else {
      router.push("/chat");
    }
  };

  return (
    <div className={styles.container}>
      {/* Background glow effects */}
      <div className={styles.bgGlow1} />
      <div className={styles.bgGlow2} />

      <div className={styles.content}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>N</div>
        </div>

        <h1 className={styles.title}>
          Nihal <span className={styles.titleAccent}>RAG Bot</span>
        </h1>

        <p className={styles.subtitle}>
          Personal AI assistant powered by your documents.
          <br />
          Ask anything — get intelligent, context-aware answers.
        </p>

        <div className={styles.cards}>
          <button
            className={styles.card}
            onClick={() => handleLogin("admin")}
          >
            <div className={styles.cardIcon}>⚙️</div>
            <h2 className={styles.cardTitle}>Login as Admin</h2>
            <p className={styles.cardDesc}>
              Upload documents, manage data, and configure the RAG pipeline
            </p>
            <span className={styles.cardArrow}>→</span>
          </button>

          <button
            className={styles.card}
            onClick={() => handleLogin("viewer")}
          >
            <div className={styles.cardIcon}>💬</div>
            <h2 className={styles.cardTitle}>Login as Viewer</h2>
            <p className={styles.cardDesc}>
              Chat with the AI and ask questions about Nihal
            </p>
            <span className={styles.cardArrow}>→</span>
          </button>
        </div>

        <p className={styles.footer}>
          POWERED BY NIHAL PERSONAL RAG ENGINE
        </p>
      </div>
    </div>
  );
}
