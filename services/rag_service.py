import os
import json
import numpy as np
import pypdf
from turbovec import IdMapIndex
from sentence_transformers import SentenceTransformer

# Paths
INDEX_FILE = "robit_docs.tvim"
MAP_FILE = "robit_docs_map.json"
STATUS_FILE = "robit_docs_status.json"

class RobitRAG:
    def __init__(self, index_file=INDEX_FILE, map_file=MAP_FILE, status_file=STATUS_FILE):
        self.index_file = index_file
        self.map_file = map_file
        self.status_file = status_file
        
        print(f"[RAG] Initializing Embedding Model (MiniLM) for {self.index_file}...")
        # Load the embedding model (only once)
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.dim = 384
        
        # Load or initialize the vector index and chunk map
        if os.path.exists(self.index_file) and os.path.exists(self.map_file):
            print(f"[RAG] Loading existing TurboVec index from {self.index_file}...")
            self.index = IdMapIndex.load(self.index_file)
            with open(self.map_file, "r") as f:
                self.chunk_map = json.load(f)
        else:
            print(f"[RAG] Creating new TurboVec index for {self.index_file}...")
            # TurboVec supports max bit_width=4
            self.index = IdMapIndex(dim=self.dim, bit_width=4)
            self.chunk_map = {}
            
        if os.path.exists(self.status_file):
            with open(self.status_file, "r") as f:
                self.doc_status = json.load(f)
        else:
            self.doc_status = {}

    def clear(self):
        print(f"[RAG] Clearing vector index for {self.index_file}...")
        self.index = IdMapIndex(dim=self.dim, bit_width=4)
        self.chunk_map = {}
        self.doc_status = {}
        
        # Remove files from disk
        for path in [self.index_file, self.map_file, self.status_file]:
            if os.path.exists(path):
                try:
                    os.remove(path)
                except Exception as e:
                    print(f"[RAG] Error removing {path}: {e}")

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
        
        # Prepare IDs using time to prevent collisions
        import time
        start_id = int(time.time() * 1000)
        ids = np.array(range(start_id, start_id + len(chunks)), dtype=np.uint64)
        
        print(f"[RAG] Adding to TurboVec index...")
        self.index.add_with_ids(embeddings, ids)
        
        # Update map
        for i, chunk in zip(ids, chunks):
            self.chunk_map[str(i)] = f"[Source: {os.path.basename(filepath)}] {chunk}"
        
        # Save
        self.index.write(self.index_file)
        with open(self.map_file, "w") as f:
            json.dump(self.chunk_map, f)
            
        # Update doc status
        import datetime
        self.doc_status[os.path.basename(filepath)] = {
            "active": True,
            "upload_time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        with open(self.status_file, "w") as f:
            json.dump(self.doc_status, f)
            
        return f"Successfully ingested {os.path.basename(filepath)}. Added {len(chunks)} chunks to vector database."

    def ingest_workspace(self, workspace_path):
        if not os.path.isdir(workspace_path):
            return f"Error: Directory {workspace_path} not found."
            
        print(f"[RAG] Scanning workspace: {workspace_path}")
        allowed_exts = {".py", ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".md", ".json", ".go", ".rs", ".cpp", ".c", ".h", ".java"}
        ignore_dirs = {".git", "node_modules", "venv", ".venv", "dist", "build", "__pycache__", ".astro", ".next"}
        ignore_dirs_lower = {d.lower() for d in ignore_dirs}
        
        import time
        current_id = int(time.time() * 1000)
        
        total_files = 0
        total_chunks = 0
        
        for root, dirs, files in os.walk(workspace_path):
            # In-place modify dirs to skip ignored directories (case-insensitive)
            dirs[:] = [d for d in dirs if d.lower() not in ignore_dirs_lower]
            
            # Additional double-insurance check: skip if any part of the root path is an ignored directory
            root_parts = {p.lower() for p in os.path.normpath(root).split(os.sep)}
            if root_parts.intersection(ignore_dirs_lower):
                continue
            
            for file in files:
                if file.endswith(".d.ts"):
                    continue
                ext = os.path.splitext(file)[1].lower()
                if ext in allowed_exts:
                    filepath = os.path.join(root, file)
                    try:
                        with open(filepath, "r", encoding="utf-8") as f:
                            text = f.read()
                        
                        if text.strip():
                            chunks = self._chunk_text(text)
                            if chunks:
                                embeddings = self.model.encode(chunks, convert_to_numpy=True)
                                ids = np.array(range(current_id, current_id + len(chunks)), dtype=np.uint64)
                                current_id += len(chunks)
                                
                                self.index.add_with_ids(embeddings, ids)
                                
                                # Store the absolute path in the source information
                                for i, chunk in zip(ids, chunks):
                                    self.chunk_map[str(i)] = f"[Source: {filepath}] {chunk}"
                                total_files += 1
                                total_chunks += len(chunks)
                    except Exception as e:
                         print(f"[RAG] Failed to read {filepath}: {e}")
                        
        if total_files > 0:
            self.index.write(self.index_file)
            with open(self.map_file, "w") as f:
                json.dump(self.chunk_map, f)
                
            import datetime
            now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            # For workspace scan, update doc_status for all new files
            docs = set()
            for text in self.chunk_map.values():
                if text.startswith("[Source: "):
                    end_idx = text.find("]")
                    if end_idx != -1:
                        docs.add(text[9:end_idx])
            for d in docs:
                if d not in self.doc_status:
                    self.doc_status[d] = {"active": True, "upload_time": now_str}
            with open(self.status_file, "w") as f:
                json.dump(self.doc_status, f)
                
        return f"Workspace Indexed: {total_files} files, {total_chunks} chunks."

    def search(self, query, k=3):
        if not self.chunk_map:
            return "Database is empty. Please ingest documents first."
            
        query_vec = self.model.encode([query], convert_to_numpy=True)
        # Fetch more candidates to filter by active status
        actual_k = min(k * 5, len(self.chunk_map))
        
        scores, ids = self.index.search(query_vec, k=actual_k)
        
        results = []
        for i in ids[0]:
            chunk_text = self.chunk_map.get(str(i), "")
            if chunk_text:
                # Determine source document
                source = ""
                if chunk_text.startswith("[Source: "):
                    end_idx = chunk_text.find("]")
                    if end_idx != -1:
                        source = chunk_text[9:end_idx]
                
                # Check active status
                is_active = True
                if source and source in self.doc_status:
                    is_active = self.doc_status[source].get("active", True)
                
                if is_active:
                    results.append(chunk_text)
                    if len(results) >= k:
                        break
                
        return "\n\n---\n\n".join(results)

    def list_documents(self):
        docs = set()
        for text in self.chunk_map.values():
            if text.startswith("[Source: "):
                end_idx = text.find("]")
                if end_idx != -1:
                    docs.add(text[9:end_idx])
        
        doc_list = []
        for doc in sorted(list(docs)):
            status = self.doc_status.get(doc, {"active": True, "upload_time": ""})
            doc_list.append({
                "filename": doc,
                "active": status.get("active", True),
                "upload_time": status.get("upload_time", "")
            })
        return doc_list

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
            
        with open(self.map_file, "w") as f:
            json.dump(self.chunk_map, f)
            
        if filename in self.doc_status:
            del self.doc_status[filename]
            with open(self.status_file, "w") as f:
                json.dump(self.doc_status, f)
            
        return len(keys_to_delete)

    def toggle_document(self, filename, active_state):
        if filename in self.doc_status:
            self.doc_status[filename]["active"] = active_state
        else:
            self.doc_status[filename] = {"active": active_state, "upload_time": ""}
            
        with open(self.status_file, "w") as f:
            json.dump(self.doc_status, f)
        return True

# Global instances
rag_engine = None
codebase_rag_engine = None

def get_rag_engine():
    global rag_engine
    if rag_engine is None:
        rag_engine = RobitRAG()
    return rag_engine

def get_codebase_rag_engine():
    global codebase_rag_engine
    if codebase_rag_engine is None:
        codebase_rag_engine = RobitRAG(
            index_file="robit_codebase.tvim",
            map_file="robit_codebase_map.json",
            status_file="robit_codebase_status.json"
        )
    return codebase_rag_engine
