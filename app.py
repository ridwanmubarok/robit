import subprocess
import time
import os
import sys
import signal
from openai import OpenAI

# Configuration
MODEL_PATH = os.path.join("models", "Bonsai-8B.gguf")
SERVER_PATH = os.path.join("bin", "llama-server.exe")
HOST = "127.0.0.1"
PORT = "8080"

def start_server():
    """Starts the llama-server in the background."""
    if not os.path.exists(MODEL_PATH):
        print(f"Error: Model file not found at {MODEL_PATH}")
        print("Please wait for the download to complete.")
        sys.exit(1)
        
    print(f"Starting Bonsai 8B server (CPU Optimized)...")
    
    # Command to run llama-server
    # -ngl 0 forces CPU inference
    # -t sets threads (auto-detected usually, but we can set it)
    cmd = [
        SERVER_PATH,
        "-m", MODEL_PATH,
        "--host", HOST,
        "--port", PORT,
        "-ngl", "0",  # No GPU, all on CPU
        "-c", "2048", # Context size
    ]
    
    # Start the process
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        universal_newlines=True
    )
    
    # Wait for the server to be ready
    print("Waiting for server to initialize (this may take 30-60 seconds)...")
    for line in iter(process.stdout.readline, ""):
        # print(line.strip()) # Debug: see server logs
        if "HTTP server listening" in line:
            print("Server is READY!")
            break
        if process.poll() is not None:
            print("Error: Server failed to start.")
            sys.exit(1)
            
    return process

def chat_loop():
    """Main chat interface."""
    client = OpenAI(base_url=f"http://{HOST}:{PORT}/v1", api_key="sk-no-key-required")
    
    print("\n" + "="*50)
    print("Bonsai 8B 1-Bit Chat (Local CPU)")
    print("Type 'exit' or 'quit' to stop.")
    print("="*50 + "\n")
    
    messages = [
        {"role": "system", "content": "You are a helpful and concise AI assistant."}
    ]
    
    while True:
        user_input = input("You: ")
        if user_input.lower() in ["exit", "quit"]:
            break
            
        messages.append({"role": "user", "content": user_input})
        
        try:
            print("Bonsai: ", end="", flush=True)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo", # Not actually used, just required by API
                messages=messages,
                stream=True,
            )
            
            answer = ""
            for chunk in response:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    print(content, end="", flush=True)
                    answer += content
            print("\n")
            messages.append({"role": "assistant", "content": answer})
            
        except Exception as e:
            print(f"\nError contacting server: {e}")
            break

if __name__ == "__main__":
    server_process = None
    try:
        server_process = start_server()
        chat_loop()
    except KeyboardInterrupt:
        print("\nExiting...")
    finally:
        if server_process:
            print("Shutting down server...")
            server_process.terminate()
            try:
                server_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server_process.kill()
            print("Server stopped.")
