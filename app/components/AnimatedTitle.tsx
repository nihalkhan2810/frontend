"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";

interface AnimatedTitleProps {
    initialText: string;
    targetText: string;
    className?: string;
    accentClassName?: string;
}

export default function AnimatedTitle({
    initialText,
    targetText,
    className,
    accentClassName,
}: AnimatedTitleProps) {
    const [displayText, setDisplayText] = useState(initialText);
    const [isAnimating, setIsAnimating] = useState(false);

    const startFlutter = useCallback(() => {
        setIsAnimating(true);
        let iteration = 0;
        const interval = setInterval(() => {
            setDisplayText((prev) =>
                targetText
                    .split("")
                    .map((char, index) => {
                        if (index < iteration) {
                            return targetText[index];
                        }
                        return CHARS[Math.floor(Math.random() * CHARS.length)];
                    })
                    .join("")
            );

            if (iteration >= targetText.length) {
                clearInterval(interval);
                setIsAnimating(false);
            }

            iteration += 1 / 3;
        }, 30);
    }, [targetText]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            startFlutter();
        }, 800); // Wait a bit after mount before fluttering
        return () => clearTimeout(timeout);
    }, [startFlutter]);

    return (
        <motion.span
            className={className}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
        >
            {displayText}
        </motion.span>
    );
}
