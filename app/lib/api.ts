const API_BASE = "http://localhost:8000";

export interface UploadResponse {
    filename: string;
    size: number;
    message: string;
}

export interface DocumentItem {
    filename: string;
    size: number;
    extension: string;
}

export interface DocumentsResponse {
    documents: DocumentItem[];
    has_embeddings: boolean;
}

export interface IngestResponse {
    status: string;
    documents_loaded?: number;
    chunks_created?: number;
    message: string;
}

export interface ChatResponse {
    answer: string;
    sources: string[];
}

export interface StatusResponse {
    api: string;
    uploads: number;
    embeddings_ready: boolean;
    google_api_key_set: boolean;
    openai_api_key_set: boolean;
}

export interface PipelineDetailsResponse {
    chunking: {
        strategy: string;
        size: number;
        overlap: number;
        total_chunks: number;
    };
    models: {
        embeddings: string;
        llm: string;
    };
    database: {
        type: string;
        persist_directory: string;
        collection_name: string;
    };
    status: {
        openai_api_key: boolean;
        openrouter_api_key: boolean;
    };
}

// ── Upload multiple files ───────────────────────────────────────────
export async function uploadFiles(files: File[]): Promise<{
    uploaded: { filename: string; size: number }[];
    errors: string[];
    message: string;
}> {
    const formData = new FormData();
    files.forEach((file) => {
        formData.append("files", file);
    });

    const res = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
    }
    return res.json();
}

// ── Trigger ingestion ────────────────────────────────────────────────
export async function triggerIngest(): Promise<IngestResponse> {
    const res = await fetch(`${API_BASE}/api/ingest`, { method: "POST" });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Ingestion failed");
    }
    return res.json();
}

// ── Send a chat message ──────────────────────────────────────────────
export async function sendChat(
    question: string,
    tone: string,
    history: { role: "user" | "bot"; content: string }[] = []
): Promise<ChatResponse> {
    const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, tone, history }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Chat failed");
    }
    return res.json();
}

// ── List documents ───────────────────────────────────────────────────
export async function getDocuments(): Promise<DocumentsResponse> {
    const res = await fetch(`${API_BASE}/api/documents`);
    if (!res.ok) throw new Error("Failed to fetch documents");
    return res.json();
}

// ── Delete a document ────────────────────────────────────────────────
export async function deleteDocument(filename: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/documents/${filename}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete document");
}

// ── Check API status ─────────────────────────────────────────────────
export async function getStatus(): Promise<StatusResponse> {
    const res = await fetch(`${API_BASE}/api/status`);
    if (!res.ok) throw new Error("Backend not reachable");
    return res.json();
}

// ── Get Pipeline Details ─────────────────────────────────────────────
export async function getPipelineDetails(): Promise<PipelineDetailsResponse> {
    const res = await fetch(`${API_BASE}/api/pipeline/details`);
    if (!res.ok) throw new Error("Failed to fetch pipeline details");
    return res.json();
}
