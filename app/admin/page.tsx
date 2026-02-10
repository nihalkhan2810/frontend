"use client";

import { useEffect, useState, useCallback } from "react";
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
    const [dragOver, setDragOver] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [statusType, setStatusType] = useState<"success" | "error" | "info">("info");

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

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
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
                    className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ""}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById("file-input")?.click()}
                >
                    <input
                        id="file-input"
                        type="file"
                        multiple
                        accept=".pdf,.txt,.md,.text,.markdown"
                        onChange={handleFileInput}
                        className={styles.fileInput}
                    />
                    <div className={styles.dropIcon}>
                        {uploading ? "⏳" : "📁"}
                    </div>
                    <p className={styles.dropTitle}>
                        {uploading ? "Uploading..." : "Drop files here or click to browse"}
                    </p>
                    <p className={styles.dropHint}>
                        Supports PDF, TXT, MD files
                    </p>
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
                                <div key={doc.filename} className={styles.docItem}>
                                    <div className={styles.docInfo}>
                                        <span className={styles.docIcon}>{getFileIcon(doc.extension)}</span>
                                        <div>
                                            <span className={styles.docName}>{doc.filename}</span>
                                            <span className={styles.docSize}>{formatSize(doc.size)}</span>
                                        </div>
                                    </div>
                                    <button
                                        className={`btn btn-danger btn-sm`}
                                        onClick={() => handleDelete(doc.filename)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Ingest Button ──────────────────────────────────── */}
                <div className={styles.ingestSection}>
                    <button
                        className={`btn btn-primary ${styles.ingestBtn}`}
                        onClick={handleIngest}
                        disabled={ingesting || documents.length === 0}
                    >
                        {ingesting ? (
                            <>
                                <span className={styles.spinner} />
                                Processing...
                            </>
                        ) : (
                            <>🚀 Process &amp; Ingest Documents</>
                        )}
                    </button>
                    <p className={styles.ingestHint}>
                        This will embed all uploaded documents into the vector store for querying
                    </p>
                </div>

                {/* ── Go to Chat ─────────────────────────────────────── */}
                {hasEmbeddings && (
                    <div className={styles.chatLink}>
                        <a href="/chat" className="btn btn-secondary">
                            💬 Go to Chat Interface →
                        </a>
                    </div>
                )}
            </main>
        </div>
    );
}
