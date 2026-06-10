import os
import json
import numpy as np
import pypdf
from turbovec import IdMapIndex
from sentence_transformers import SentenceTransformer

# Paths
INDEX_FILE = "robit_docs.tvim"
MAP_FILE = "robit_docs_map.json"

class RobitRAG:
    def __init__(self):
        print("[RAG] Initializing Embedding Model (MiniLM)...")
        # Load the embedding model (only once)
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.dim = 384
        
        # Load or initialize the vector index and chunk map
        if os.path.exists(INDEX_FILE) and os.path.exists(MAP_FILE):
            print("[RAG] Loading existing TurboVec index...")
            self.index = IdMapIndex.load(INDEX_FILE)
            with open(MAP_FILE, "r") as f:
                self.chunk_map = json.load(f)
            self.next_id = max([int(k) for k in self.chunk_map.keys()] + [-1]) + 1
        else:
            print("[RAG] Creating new TurboVec index...")
            # TurboVec supports max bit_width=4
            self.index = IdMapIndex(dim=self.dim, bit_width=4)
            self.chunk_map = {}
            self.next_id = 0

    def _chunk_text(self, text, chunk_size=300, overlap=50):
        words = text.split()
        chunks = []
        for i in range(0, len(words), chunk_size - overlap):
            chunk = " ".join(words[i:i + chunk_size])
            if chunk:
                chunks.append(chunk)
        return chunks

    def ingest_file(self, filepath):
        if not os.path.exists(filepath):
            return f"Error: File {filepath} not found."
            
        print(f"[RAG] Reading {filepath}...")
        ext = filepath.split('.')[-1].lower()
        text = ""
        
        try:
            if ext == "pdf":
                with open(filepath, "rb") as f:
                    reader = pypdf.PdfReader(f)
                    for page in reader.pages:
                        t = page.extract_text()
                        if t: text += t + "\n"
            else:
                with open(filepath, "r", encoding="utf-8") as f:
                    text = f.read()
        except Exception as e:
            return f"Error reading file: {e}"
            
        if not text.strip():
            return "File is empty or no text could be extracted."
            
        print(f"[RAG] Chunking text...")
        chunks = self._chunk_text(text)
        if not chunks:
            return "No chunks generated."
            
        print(f"[RAG] Generating embeddings for {len(chunks)} chunks...")
        embeddings = self.model.encode(chunks, convert_to_numpy=True)
        
        # Prepare IDs
        ids = np.array(range(self.next_id, self.next_id + len(chunks)), dtype=np.uint64)
        
        print(f"[RAG] Adding to TurboVec index...")
        self.index.add_with_ids(embeddings, ids)
        
        # Update map
        for i, chunk in zip(ids, chunks):
            self.chunk_map[str(i)] = f"[Source: {os.path.basename(filepath)}] {chunk}"
            
        self.next_id += len(chunks)
        
        # Save
        self.index.write(INDEX_FILE)
        with open(MAP_FILE, "w") as f:
            json.dump(self.chunk_map, f)
            
        return f"Successfully ingested {os.path.basename(filepath)}. Added {len(chunks)} chunks to vector database."

    def search(self, query, k=3):
        if not self.chunk_map:
            return "Database is empty. Please ingest documents first."
            
        query_vec = self.model.encode([query], convert_to_numpy=True)
        # We assume k results, but if map is smaller, adjust k
        actual_k = min(k, len(self.chunk_map))
        
        scores, ids = self.index.search(query_vec, k=actual_k)
        
        results = []
        for i in ids[0]:
            chunk_text = self.chunk_map.get(str(i), "")
            if chunk_text:
                results.append(chunk_text)
                
        return "\n\n---\n\n".join(results)

    def list_documents(self):
        docs = set()
        for text in self.chunk_map.values():
            if text.startswith("[Source: "):
                end_idx = text.find("]")
                if end_idx != -1:
                    docs.add(text[9:end_idx])
        return sorted(list(docs))

    def delete_document(self, filename):
        keys_to_delete = []
        prefix = f"[Source: {filename}]"
        for k, v in self.chunk_map.items():
            if v.startswith(prefix):
                keys_to_delete.append(k)
        
        if not keys_to_delete:
            return 0
            
        for k in keys_to_delete:
            del self.chunk_map[k]
            
        with open(MAP_FILE, "w") as f:
            json.dump(self.chunk_map, f)
            
        return len(keys_to_delete)

# Global instance
rag_engine = None

def get_rag_engine():
    global rag_engine
    if rag_engine is None:
        rag_engine = RobitRAG()
    return rag_engine
