"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import {
    uploadFile,
    triggerIngest,
    getDocuments,
    deleteDocument,
    type DocumentItem,
} from "../lib/api";
import styles from "./admin.module.css";

export default function AdminPage() {
    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [hasEmbeddings, setHasEmbeddings] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [ingesting, setIngesting] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [statusType, setStatusType] = useState<"success" | "error" | "info">("info");

    const router = useRouter();

    const fetchDocuments = useCallback(async () => {
        try {
            const data = await getDocuments();
            setDocuments(data.documents);
            setHasEmbeddings(data.has_embeddings);
        } catch {
            setStatusMessage("Backend not reachable. Make sure the server is running on port 8000.");
            setStatusType("error");
        }
    }, []);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleFiles = async (files: FileList | File[]) => {
        setUploading(true);
        setStatusMessage("");
        const fileArray = Array.from(files);

        for (const file of fileArray) {
            try {
                const res = await uploadFile(file);
                setStatusMessage(res.message);
                setStatusType("success");
            } catch (err) {
                setStatusMessage(`Failed to upload ${file.name}: ${err instanceof Error ? err.message : "Unknown error"}`);
                setStatusType("error");
            }
        }

        setUploading(false);
        fetchDocuments();
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    };

    const handleDelete = async (filename: string) => {
        try {
            await deleteDocument(filename);
            setStatusMessage(`Deleted ${filename}`);
            setStatusType("info");
            fetchDocuments();
        } catch {
            setStatusMessage(`Failed to delete ${filename}`);
            setStatusType("error");
        }
    };

    const handleIngest = async () => {
        setIngesting(true);
        setStatusMessage("Processing documents... This may take a moment.");
        setStatusType("info");

        try {
            const res = await triggerIngest();
            setStatusMessage(res.message);
            setStatusType(res.status === "success" ? "success" : "error");
            fetchDocuments();
        } catch (err) {
            setStatusMessage(`Ingestion failed: ${err instanceof Error ? err.message : "Unknown error"}`);
            setStatusType("error");
        }

        setIngesting(false);
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getFileIcon = (ext: string) => {
        switch (ext) {
            case ".pdf": return "📄";
            case ".md":
            case ".markdown": return "📝";
            default: return "📃";
        }
    };

    return (
        <div className={styles.page}>
            <Navbar showBack />

            <main className={styles.main}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Admin Panel</h1>
                    <p className={styles.subtitle}>
                        Upload your documents and process them for the RAG pipeline
                    </p>
                </div>

                {/* ── Upload Area ────────────────────────────────────── */}
                <div
                    className={`${styles.dropZone} ${dragActive ? styles.active : ""}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById("fileInput")?.click()}
                >
                    <div className={styles.uploadIcon}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                    </div>
                    <p>Drag & drop files here, or click to select</p>
                    <span className={styles.subtext}>Supports PDF, TXT, MD (Max 70KB total)</span>
                    <input
                        id="fileInput"
                        type="file"
                        multiple
                        accept=".pdf,.txt,.md,.markdown"
                        onChange={handleFileSelect}
                        className={styles.hiddenInput}
                    />
                </div>

                {/* ── Status Message ─────────────────────────────────── */}
                {statusMessage && (
                    <div className={`${styles.status} ${styles[statusType]}`}>
                        {statusMessage}
                    </div>
                )}

                {/* ── Documents List ─────────────────────────────────── */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            Uploaded Documents
                            <span className={styles.count}>{documents.length}</span>
                        </h2>

                        <div className={styles.sectionActions}>
                            {hasEmbeddings && (
                                <span className={styles.badge}>✅ Embeddings Ready</span>
                            )}
                        </div>
                    </div>

                    {documents.length === 0 ? (
                        <div className={styles.empty}>
                            <p>No documents uploaded yet</p>
                        </div>
                    ) : (
                        <div className={styles.docList}>
                            {documents.map((doc) => (
                                <li key={doc.filename} className={styles.docItem}>
                                    <div className={styles.docIcon}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                            <polyline points="14 2 14 8 20 8"></polyline>
                                            <line x1="16" y1="13" x2="8" y2="13"></line>
                                            <line x1="16" y1="17" x2="8" y2="17"></line>
                                            <polyline points="10 9 9 9 8 9"></polyline>
                                        </svg>
                                    </div>
                                    <div className={styles.docInfo}>
                                        <span className={styles.docName}>{doc.filename}</span>
                                        <span className={styles.docSize}>
                                            {(doc.size / 1024).toFixed(1)} KB
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(doc.filename)}
                                        className={styles.deleteBtn}
                                        title="Delete"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            <line x1="10" y1="11" x2="10" y2="17"></line>
                                            <line x1="14" y1="11" x2="14" y2="17"></line>
                                        </svg>
                                    </button>
                                </li>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Ingest Button ──────────────────────────────────── */}
                <div className={styles.actions}>
                    <button
                        className={styles.ingestBtn}
                        onClick={handleIngest}
                        disabled={ingesting || uploading || documents.length === 0}
                    >
                        {ingesting ? (
                            <>
                                <span className={styles.spinner}></span> Processing...
                            </>
                        ) : (
                            <>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                                </svg>
                                Process & Ingest
                            </>
                        )}
                    </button>

                    <button
                        className={styles.chatBtn}
                        onClick={() => router.push("/chat")}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                        </svg>
                        Go to Chat
                    </button>
                </div>


            </main>
        </div>
    );
}
