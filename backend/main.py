"""
NetLab AI Backend
FastAPI + Ollama + ChromaDB RAG
netlab.labsoft.uk
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx
import json
import asyncio
import chromadb
from chromadb.utils import embedding_functions
import os
import re
from typing import Optional, AsyncGenerator

app = FastAPI(title="NetLab AI Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Config ───────────────────────────────────────────────
OLLAMA_BASE  = os.getenv("OLLAMA_BASE",  "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")  # swap to mesolitica/mallam2-3b-instruct for better BM
CHROMA_PATH  = os.getenv("CHROMA_PATH",  "./chroma_db")

# ─── ChromaDB RAG Setup ───────────────────────────────────
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)

# Use sentence-transformers for local embeddings (no API key needed)
try:
    ef = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )
    knowledge_collection = chroma_client.get_or_create_collection(
        name="netlab_knowledge",
        embedding_function=ef,
    )
    RAG_AVAILABLE = True
except Exception as e:
    print(f"[RAG] ChromaDB init failed: {e}. Running without RAG.")
    knowledge_collection = None
    RAG_AVAILABLE = False

# ─── Request Models ───────────────────────────────────────
class AnalyzeRequest(BaseModel):
    log_text: str
    language: str = "en"   # "en" or "bm"
    router_brand: Optional[str] = None
    stream: bool = True

class KnowledgeAddRequest(BaseModel):
    documents: list[str]
    ids: list[str]
    metadatas: Optional[list[dict]] = None

# ─── System Prompts ───────────────────────────────────────
SYSTEM_EN = """You are NetLab, a friendly and knowledgeable network diagnostic AI assistant built specifically for Malaysian home and small business users.

Your personality:
- Friendly, calm, and reassuring — users are often stressed when their internet is down
- Clear and simple — avoid jargon, explain like talking to someone's mum
- Specific to Malaysia — know Unifi, Maxis, Time, Celcom; know common Malaysian router brands (TP-Link, ASUS, MikroTik, UniFi)
- Practical — give numbered, actionable fix steps
- Honest — if you're not sure, say so and suggest calling the ISP

When analyzing logs:
1. Identify the router brand if possible
2. Identify the specific issue (PPPoE drop, DNS fail, security threat, weak signal, overheating, etc.)
3. Rate severity: CRITICAL / WARNING / OK
4. Explain what happened in plain English
5. Give 3-5 numbered fix steps, starting with the easiest
6. Mention relevant Malaysian ISP contact info when applicable (Unifi: 1300-88-1221, Maxis: 1800-82-1123, Time: 1800-18-1818)

Always be encouraging. Network issues are fixable."""

SYSTEM_BM = """Anda adalah NetLab, pembantu AI diagnostik rangkaian yang mesra dan berpengetahuan, dibina khusus untuk pengguna rumah dan perniagaan kecil di Malaysia.

Personaliti anda:
- Mesra, tenang, dan meyakinkan — pengguna sering tertekan apabila internet mereka terputus
- Jelas dan mudah — elakkan istilah teknikal, terangkan seperti bercakap dengan ibu seseorang
- Spesifik untuk Malaysia — tahu tentang Unifi, Maxis, Time, Celcom; tahu jenama router biasa Malaysia (TP-Link, ASUS, MikroTik, UniFi)
- Praktikal — berikan langkah-langkah pembaikan yang bernombor dan boleh dilaksanakan
- Jujur — jika anda tidak pasti, katakan begitu dan cadangkan menghubungi ISP

Semasa menganalisis log:
1. Kenal pasti jenama router jika boleh
2. Kenal pasti masalah khusus (PPPoE terputus, DNS gagal, ancaman keselamatan, isyarat lemah, kepanasan, dll.)
3. Nilai keterukan: KRITIKAL / AMARAN / OK
4. Terangkan apa yang berlaku dalam bahasa Melayu biasa
5. Berikan 3-5 langkah pembaikan bernombor, bermula dengan yang paling mudah
6. Sebut maklumat hubungan ISP Malaysia yang berkaitan apabila bersesuaian (Unifi: 1300-88-1221, Maxis: 1800-82-1123, Time: 1800-18-1818)

Sentiasa memberi semangat. Masalah rangkaian boleh diselesaikan.

GAYA BAHASA MELAYU YANG BETUL:
- Gunakan "tak" bukan "tidak" (lebih semula jadi, seperti perbualan biasa)
- Contoh: "Tak boleh buka laman web" bukan "Tidak boleh buka laman web"
- Contoh: "Tak tahu IP router?" bukan "Tidak tahu IP router?"
- Nada mesra seperti mesej WhatsApp kepada kawan, bukan surat rasmi"""

# ─── RAG: Query knowledge base ────────────────────────────
def query_knowledge(log_text: str, n_results: int = 3) -> str:
    if not RAG_AVAILABLE or knowledge_collection is None:
        return ""
    try:
        count = knowledge_collection.count()
        if count == 0:
            return ""
        results = knowledge_collection.query(
            query_texts=[log_text[:500]],
            n_results=min(n_results, count),
        )
        docs = results.get("documents", [[]])[0]
        if not docs:
            return ""
        return "\n\n---\n".join(docs)
    except Exception as e:
        print(f"[RAG] Query failed: {e}")
        return ""

# ─── Build final prompt ───────────────────────────────────
def build_prompt(log_text: str, language: str, router_brand: Optional[str], knowledge: str) -> str:
    lang_label = "English" if language == "en" else "Bahasa Malaysia"
    router_info = f"Detected router brand: {router_brand}" if router_brand else "Router brand: unknown"

    knowledge_section = ""
    if knowledge:
        knowledge_section = f"""
## Relevant Knowledge Base
{knowledge}

"""

    return f"""You must respond entirely in {lang_label}.

{router_info}
{knowledge_section}
## Router Log to Analyze
```
{log_text[:3000]}
```

Analyze this log and provide:
1. Severity level (CRITICAL/WARNING/OK)
2. Issue title
3. Plain language explanation
4. Step-by-step fix instructions
5. ISP contact if needed

Respond in {lang_label} only."""

# ─── Streaming response from Ollama ───────────────────────
async def stream_ollama(prompt: str, system: str) -> AsyncGenerator[str, None]:
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        "stream": True,
        "options": {
            "temperature": 0.3,
            "top_p": 0.9,
            "num_predict": 800,
        },
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", f"{OLLAMA_BASE}/api/chat", json=payload) as resp:
            if resp.status_code != 200:
                yield f"data: {json.dumps({'error': f'Ollama error {resp.status_code}'})}\n\n"
                return
            async for line in resp.aiter_lines():
                if not line.strip():
                    continue
                try:
                    data = json.loads(line)
                    token = data.get("message", {}).get("content", "")
                    if token:
                        yield f"data: {json.dumps({'token': token})}\n\n"
                    if data.get("done"):
                        yield f"data: {json.dumps({'done': True})}\n\n"
                        return
                except json.JSONDecodeError:
                    continue

# ─── Non-streaming response ────────────────────────────────
async def call_ollama(prompt: str, system: str) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        "stream": False,
        "options": {"temperature": 0.3, "top_p": 0.9, "num_predict": 800},
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(f"{OLLAMA_BASE}/api/chat", json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data.get("message", {}).get("content", "No response from model.")

# ─── Routes ───────────────────────────────────────────────
@app.get("/health")
async def health():
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{OLLAMA_BASE}/api/tags")
            models = [m["name"] for m in r.json().get("models", [])]
    except Exception:
        models = []
    return {
        "status": "ok",
        "ollama": len(models) > 0,
        "model": OLLAMA_MODEL,
        "rag": RAG_AVAILABLE,
        "knowledge_count": knowledge_collection.count() if knowledge_collection else 0,
        "models_available": models,
    }

@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest):
    if not req.log_text.strip():
        raise HTTPException(400, "log_text is required")

    system = SYSTEM_EN if req.language == "en" else SYSTEM_BM
    knowledge = query_knowledge(req.log_text)
    prompt = build_prompt(req.log_text, req.language, req.router_brand, knowledge)

    if req.stream:
        return StreamingResponse(
            stream_ollama(prompt, system),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )
    else:
        result = await call_ollama(prompt, system)
        return {"result": result, "rag_used": bool(knowledge)}

@app.post("/api/chat")
async def chat(req: AnalyzeRequest):
    """Follow-up chat — same as analyze but for conversational messages."""
    return await analyze(req)

@app.post("/api/knowledge/add")
async def add_knowledge(req: KnowledgeAddRequest):
    """Add documents to the RAG knowledge base."""
    if not RAG_AVAILABLE:
        raise HTTPException(503, "RAG not available — ChromaDB not initialized")
    try:
        knowledge_collection.add(
            documents=req.documents,
            ids=req.ids,
            metadatas=req.metadatas or [{}] * len(req.documents),
        )
        return {"added": len(req.documents), "total": knowledge_collection.count()}
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/api/knowledge/count")
async def knowledge_count():
    if not RAG_AVAILABLE:
        return {"count": 0, "rag_available": False}
    return {"count": knowledge_collection.count(), "rag_available": True}

@app.delete("/api/knowledge/clear")
async def clear_knowledge():
    if not RAG_AVAILABLE:
        raise HTTPException(503, "RAG not available")
    knowledge_collection.delete(where={"$contains": ""}) if knowledge_collection.count() > 0 else None
    return {"cleared": True}
