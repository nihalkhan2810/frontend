"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import {
    uploadFiles,
    triggerIngest,
    getDocuments,
    deleteDocument,
    type DocumentItem,
    getPipelineDetails,
    type PipelineDetailsResponse,
} from "../lib/api";
import styles from "./admin.module.css";

export default function AdminPage() {
    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [hasEmbeddings, setHasEmbeddings] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [ingesting, setIngesting] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [statusType, setStatusType] = useState<"success" | "error" | "info">("info");

    // Auth state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [authError, setAuthError] = useState("");

    // Pipeline details
    const [pipelineDetails, setPipelineDetails] = useState<PipelineDetailsResponse | null>(null);

    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const fetchPipelineDetails = useCallback(async () => {
        try {
            const data = await getPipelineDetails();
            setPipelineDetails(data);
        } catch (error) {
            console.error("Failed to fetch pipeline details:", error);
        }
    }, []);

    useEffect(() => {
        const auth = sessionStorage.getItem("nihal-admin-auth");
        if (auth === "true") {
            setIsAuthenticated(true);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            fetchDocuments();
            fetchPipelineDetails();
        }
    }, [fetchDocuments, fetchPipelineDetails, isAuthenticated]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // For now using a hardcoded password, can be moved to env later
        if (password === "Bluerock28#") {
            setIsAuthenticated(true);
            sessionStorage.setItem("nihal-admin-auth", "true");
            setAuthError("");
        } else {
            setAuthError("Invalid password. Please try again.");
        }
    };

    if (!isAuthenticated) {
        return (
            <div className={styles.page}>
                <Navbar showBack />
                <main className={styles.loginContainer}>
                    <div className={styles.loginCard}>
                        <h1 className={styles.loginTitle}>Admin Access</h1>
                        <p className={styles.loginSubtitle}>Please enter the administrator password to continue.</p>

                        <form onSubmit={handleLogin} className={styles.loginForm}>
                            <input
                                type="password"
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={styles.passwordInput}
                                autoFocus
                            />
                            <button type="submit" className={styles.loginSubmit}>
                                Login
                            </button>
                        </form>

                        {authError && (
                            <p className={styles.loginErrorMessage}>{authError}</p>
                        )}
                    </div>
                </main>
            </div>
        );
    }

    const handleFiles = (files: FileList | File[]) => {
        const fileArray = Array.from(files);
        setPendingFiles((prev) => [...prev, ...fileArray]);
        setStatusMessage("");
    };

    const removePendingFile = (index: number) => {
        setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUploadAll = async () => {
        if (pendingFiles.length === 0) return;

        setUploading(true);
        setStatusMessage("Uploading files...");
        setStatusType("info");

        try {
            const res = await uploadFiles(pendingFiles);
            if (res.errors.length > 0) {
                setStatusMessage(`Uploaded with issues: ${res.errors.join(", ")}`);
                setStatusType("error");
            } else {
                setStatusMessage(res.message);
                setStatusType("success");
                setPendingFiles([]);
            }
            fetchDocuments();
        } catch (err) {
            setStatusMessage(`Upload failed: ${err instanceof Error ? err.message : "Unknown error"}`);
            setStatusType("error");
        } finally {
            setUploading(false);
        }
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
        setStatusMessage("Ingesting documents into the vector store...");
        setStatusType("info");
        try {
            const result = await triggerIngest();
            setStatusMessage(result.message);
            setStatusType("success");
            setHasEmbeddings(true);
            fetchPipelineDetails(); // Refresh blueprint stats
            fetchDocuments(); // Refresh doc list
        } catch (error: any) {
            setStatusMessage(error.message);
            setStatusType("error");
        } finally {
            setIngesting(false);
        }
    };

    return (
        <div className={styles.page}>
            <Navbar showBack />

            <main className={styles.main}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Admin Dashboard</h1>
                        <p className={styles.subtitle}>Manage your knowledge base and pipeline settings.</p>
                    </div>
                </div>

                {statusMessage && (
                    <div className={`${styles.status} ${styles[statusType]}`}>
                        <div className={styles.statusIcon}>
                            {statusType === "success" && "✓"}
                            {statusType === "error" && "⚠"}
                            {statusType === "info" && "ℹ"}
                        </div>
                        <p>{statusMessage}</p>
                    </div>
                )}

                <div className={styles.grid}>
                    {/* ── Document Management ── */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>Knowledge Base</h2>
                            <span className={styles.badge}>{documents.length} Files</span>
                        </div>

                        <div
                            className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ""}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={(e) => e.target.files && handleFiles(e.target.files)}
                                multiple
                                style={{ display: "none" }}
                            />
                            <div className={styles.dropzoneIcon}>
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                            </div>
                            <p>Click or drag documents here to upload</p>
                            <span className={styles.supportText}>Supports PDF, TXT, MD</span>
                        </div>

                        {pendingFiles.length > 0 && (
                            <div className={styles.pendingList}>
                                {pendingFiles.map((file, idx) => (
                                    <div key={idx} className={styles.pendingItem}>
                                        <div className={styles.fileInfo}>
                                            <span className={styles.docName}>{file.name}</span>
                                            <span className={styles.docSize}>({(file.size / 1024).toFixed(1)} KB)</span>
                                        </div>
                                        <button
                                            className={styles.removeBtn}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPendingFiles(prev => prev.filter((_, i) => i !== idx));
                                            }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                                <button
                                    className={styles.uploadBtn}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleUploadAll();
                                    }}
                                    disabled={uploading}
                                >
                                    {uploading ? "Uploading..." : "Confirm Uploads"}
                                </button>
                            </div>
                        )}

                        <div className={styles.docList}>
                            {documents.length === 0 ? (
                                <p className={styles.empty}>No documents uploaded yet.</p>
                            ) : (
                                documents.map((doc) => (
                                    <div key={doc.filename} className={styles.docItem}>
                                        <div className={styles.docInfo}>
                                            <div className={styles.docIcon}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                                                    <polyline points="13 2 13 9 20 9" />
                                                </svg>
                                            </div>
                                            <div>
                                                <div className={styles.docName}>{doc.filename}</div>
                                                <div className={styles.docMeta}>
                                                    {(doc.size / 1024).toFixed(1)} KB • {doc.extension}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={() => handleDelete(doc.filename)}
                                            title="Delete file"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M3 6h18" />
                                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                            </svg>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* ── Pipeline Control ── */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>Pipeline Control</h2>
                        </div>

                        <div className={styles.controlCard}>
                            <div className={styles.controlHeader}>
                                <div className={styles.pulseIcon} style={{ background: hasEmbeddings ? "#10b981" : "#f59e0b" }} />
                                <div>
                                    <div className={styles.controlTitle}>Vector Store Status</div>
                                    <div className={styles.controlStatus}>
                                        {hasEmbeddings ? "Ingested & Ready" : "Pending Ingestion"}
                                    </div>
                                </div>
                            </div>
                            <p className={styles.controlDesc}>
                                Processing docs extracts text, creates semantic chunks, and calculates embeddings for retrieval.
                            </p>
                            <button
                                className={styles.ingestBtn}
                                onClick={handleIngest}
                                disabled={ingesting || documents.length === 0}
                            >
                                {ingesting ? (
                                    <>
                                        <div className={styles.spinner} />
                                        Processing...
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

                        <div className={styles.tipCard}>
                            <h3>Admin Tip</h3>
                            <p>Always re-ingest if you delete or add large volumes of data for optimal chat accuracy.</p>
                        </div>
                    </div>
                </div>

                {/* ── System Blueprints ── */}
                {pipelineDetails && (
                    <div className={styles.blueprintSection}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>System Blueprints</h2>
                            <span className={styles.blueprintTag}>Live Pipeline Data</span>
                        </div>

                        <div className={styles.blueprintGrid}>
                            <div className={styles.blueprintCard}>
                                <div className={styles.blueprintHeader}>
                                    <div className={styles.blueprintIcon}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3b82f6' }}>
                                            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                                            <rect x="9" y="9" width="6" height="6" rx="1" />
                                        </svg>
                                    </div>
                                    <h3 className={styles.blueprintName}>Chunking Logic</h3>
                                </div>
                                <div className={styles.blueprintBody}>
                                    <div className={styles.statLine}>
                                        <span className={styles.statLabel}>Strategy</span>
                                        <span className={styles.statValue}>{pipelineDetails.chunking.strategy}</span>
                                    </div>
                                    <div className={styles.statLine}>
                                        <span className={styles.statLabel}>Chunk Size</span>
                                        <span className={styles.statValue}>{pipelineDetails.chunking.size} chars</span>
                                    </div>
                                    <div className={styles.statLine}>
                                        <span className={styles.statLabel}>Overlap</span>
                                        <span className={styles.statValue}>{pipelineDetails.chunking.overlap} chars</span>
                                    </div>
                                    <div className={styles.statDivider} />
                                    <div className={styles.statLine}>
                                        <span className={styles.statLabel}>Total Chunks</span>
                                        <span className={`${styles.statValue} ${styles.highlight}`}>{pipelineDetails.chunking.total_chunks}</span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.blueprintCard}>
                                <div className={styles.blueprintHeader}>
                                    <div className={styles.blueprintIcon}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ec4899' }}>
                                            <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
                                            <path d="M12 12L2.1 14.9" />
                                            <path d="M12 12L15 21.9" />
                                            <circle cx="12" cy="12" r="2" />
                                        </svg>
                                    </div>
                                    <h3 className={styles.blueprintName}>Intelligence</h3>
                                </div>
                                <div className={styles.blueprintBody}>
                                    <div className={styles.statLine}>
                                        <span className={styles.statLabel}>Embeddings</span>
                                        <span className={styles.statValue}>{pipelineDetails.models.embeddings}</span>
                                    </div>
                                    <div className={styles.statLine}>
                                        <span className={styles.statLabel}>LLM Engine</span>
                                        <span className={styles.statValue}>{pipelineDetails.models.llm}</span>
                                    </div>
                                    <div className={styles.statLine}>
                                        <span className={styles.statLabel}>Grounding</span>
                                        <span className={styles.statValue}>Strict Document-Only</span>
                                    </div>
                                    <div className={styles.statDivider} />
                                    <div className={styles.statLine}>
                                        <span className={styles.statLabel}>Keys Status</span>
                                        <span className={styles.statValue}>
                                            <span className={pipelineDetails.status.openai_api_key ? styles.secure : styles.insecure} style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                                OpenAI: {pipelineDetails.status.openai_api_key ? (
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                ) : (
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                        <line x1="18" y1="6" x2="6" y2="18" />
                                                        <line x1="6" y1="6" x2="18" y2="18" />
                                                    </svg>
                                                )}
                                            </span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.blueprintCard}>
                                <div className={styles.blueprintHeader}>
                                    <div className={styles.blueprintIcon}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#10b981' }}>
                                            <rect x="2" y="2" width="20" height="8" rx="2" />
                                            <rect x="2" y="14" width="20" height="8" rx="2" />
                                            <line x1="6" y1="6" x2="6" y2="6" />
                                            <line x1="6" y1="18" x2="6" y2="18" />
                                        </svg>
                                    </div>
                                    <h3 className={styles.blueprintName}>Infrastructure</h3>
                                </div>
                                <div className={styles.blueprintBody}>
                                    <div className={styles.statLine}>
                                        <span className={styles.statLabel}>Vector Store</span>
                                        <span className={styles.statValue}>{pipelineDetails.database.type}</span>
                                    </div>
                                    <div className={styles.statLine}>
                                        <span className={styles.statLabel}>Collection</span>
                                        <span className={styles.statValue}>{pipelineDetails.database.collection_name}</span>
                                    </div>
                                    <div className={styles.statLine}>
                                        <span className={styles.statLabel}>Persistence</span>
                                        <span className={styles.statValue}>Local Persistence</span>
                                    </div>
                                    <div className={styles.statDivider} />
                                    <div className={`${styles.statLine} ${styles.blueprintPath}`}>
                                        <span>{pipelineDetails.database.persist_directory.split(/[\\/]/).pop()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
