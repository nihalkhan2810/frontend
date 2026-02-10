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
                        ←
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
