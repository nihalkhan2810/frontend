"use client";

import { useRouter } from "next/navigation";
import styles from "./Navbar.module.css";

interface NavbarProps {
    showBack?: boolean;
}

export default function Navbar({ showBack }: NavbarProps) {
    const router = useRouter();

    const handleLogout = () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem("nihal-rag-role");
        }
        router.push("/");
    };

    return (
        <nav className={styles.navbar}>
            <div className={styles.left}>
                {showBack && (
                    <button className={styles.backBtn} onClick={() => router.back()}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                    </button>
                )}
                <span className={styles.brand}>NIHAL RAG BOT</span>
            </div>
            <div className={styles.right}>
                <button className={styles.avatar} onClick={handleLogout} title="Logout">
                    NR
                </button>
            </div>
        </nav>
    );
}
