import os
import sys
import time
import json
import httpx
import click
import subprocess
from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.live import Live
from rich.table import Table
from dotenv import load_dotenv

# Load configuration
load_dotenv()
WEB_HOST = "127.0.0.1"
WEB_PORT = int(os.getenv("WEB_PORT", 8000))

console = Console()

def get_server_url():
    return f"http://{WEB_HOST}:{WEB_PORT}"

@click.group()
def cli():
    """ROBIT: High-Performance Local AI Research CLI."""
    pass

@cli.command()
def status():
    """Check the health status of the ROBIT AI Engine."""
    console.print("[bold indigo]Checking ROBIT Status...[/bold indigo]")
    try:
        response = httpx.get(f"{get_server_url()}/v1/models", timeout=5.0)
        data = response.json()
        
        table = Table(title="ROBIT Engine Status")
        table.add_column("Property", style="cyan")
        table.add_column("Value", style="magenta")
        
        table.add_row("Server", "ONLINE" if response.status_code == 200 else "OFFLINE")
        table.add_row("Engine Ready", "YES" if data.get("is_ready") else "NO")
        table.add_row("Status", data.get("status", "Unknown"))
        
        console.print(table)
    except Exception as e:
        console.print(f"[bold red]Error:[/bold red] Could not connect to ROBIT server. Is it running? (Use 'robit serve')")

@cli.command()
@click.argument('path')
def ingest(path):
    """Ingest a PDF or Text file into the local RAG Vector Database."""
    console.print(f"[bold green]Starting Ingestion for:[/bold green] {path}")
    from rag import get_rag_engine
    engine = get_rag_engine()
    result = engine.ingest_file(path)
    console.print(f"[bold cyan]Result:[/bold cyan] {result}")

@cli.command()
def serve():
    """Start the ROBIT FastAPI Web Server."""
    console.print(Panel("[bold green]Starting ROBIT Web Server...[/bold green]\nAccess at http://127.0.0.1:8000", title="ROBIT Labs"))
    try:
        # We use uvicorn directly to avoid recursion or just call the script
        subprocess.run([sys.executable, "main.py"], check=True)
    except KeyboardInterrupt:
        console.print("\n[yellow]Server stopped by user.[/yellow]")

import re

def handle_tools(text):
    """Detect and execute tool calls in the AI response."""
    tools_found = False
    new_messages = []
    
    # LS Tool
    ls_matches = re.finditer(r'<ls\s+path=["\'](.*?)["\']\s*/>', text)
    for m in ls_matches:
        path = m.group(1)
        console.print(f"\n[bold yellow]🔍 AGENT: Listing files in {path}...[/bold yellow]")
        res = httpx.post(f"{get_server_url()}/api/fs/ls", json={"path": path}).json()
        result_text = f"Items in {path}: {', '.join(res.get('items', []))}" if res.get('success') else f"Error: {res.get('error')}"
        new_messages.append({"role": "user", "content": f"TOOL RESULT: {result_text}"})
        tools_found = True

    # READ Tool
    read_matches = re.finditer(r'<read\s+path=["\'](.*?)["\']\s*/>', text)
    for m in read_matches:
        path = m.group(1)
        console.print(f"\n[bold yellow]📖 AGENT: Reading {path}...[/bold yellow]")
        res = httpx.post(f"{get_server_url()}/api/fs/read", json={"path": path}).json()
        result_text = f"Content of {path}:\n{res.get('content')}" if res.get('success') else f"Error: {res.get('error')}"
        new_messages.append({"role": "user", "content": f"TOOL RESULT: {result_text}"})
        tools_found = True

    # WRITE Tool
    write_matches = re.finditer(r'<write\s+path=["\'](.*?)["\']>(.*?)</write>', text, re.DOTALL)
    for m in write_matches:
        path = m.group(1)
        content = m.group(2)
        console.print(f"\n[bold yellow]📝 AGENT: Writing to {path}...[/bold yellow]")
        res = httpx.post(f"{get_server_url()}/api/fs/write", json={"path": path, "content": content}).json()
        result_text = f"Success writing to {path}" if res.get('success') else f"Error: {res.get('error')}"
        new_messages.append({"role": "user", "content": f"TOOL RESULT: {result_text}"})
        tools_found = True

    # SEARCH Tool
    search_matches = re.finditer(r'<search\s+query=["\'](.*?)["\']\s*/>', text)
    for m in search_matches:
        query = m.group(1)
        console.print(f"\n[bold yellow]🔍 AGENT: Searching the web for '{query}'...[/bold yellow]")
        res = httpx.post(f"{get_server_url()}/api/fs/search", json={"query": query}, timeout=30.0).json()
        result_text = f"Search Results for '{query}':\n{res.get('content')}" if res.get('success') else f"Error: {res.get('error')}"
        new_messages.append({"role": "user", "content": f"TOOL RESULT: {result_text}"})
        tools_found = True

    # RAG Search Tool
    rag_matches = re.finditer(r'<ask_docs\s+query=["\'](.*?)["\']\s*/>', text)
    for m in rag_matches:
        query = m.group(1)
        console.print(f"\n[bold yellow]📚 AGENT: Searching internal documents for '{query}'...[/bold yellow]")
        try:
            from rag import get_rag_engine
            engine = get_rag_engine()
            result_text = engine.search(query, k=3)
            result_text = f"Internal Document Results for '{query}':\n{result_text}"
        except Exception as e:
            result_text = f"Error searching documents: {e}"
        new_messages.append({"role": "user", "content": f"TOOL RESULT: {result_text}"})
        tools_found = True

    return tools_found, new_messages

@cli.command()
@click.option('--persona', help='Override the system prompt for this session.')
def chat(persona):
    """Start an interactive research session in the terminal."""
    console.print(Panel("[bold indigo]Interactive Agent Session Started[/bold indigo]\nROBIT can now read/write files in this directory.\nType 'exit' or 'quit' to end.", title="ROBIT Agent Terminal"))
    
    history = []
    if persona:
        history.append({"role": "system", "content": persona})

    while True:
        try:
            query = console.input("\n[bold cyan]You > [/bold cyan]")
            if query.lower() in ("exit", "quit", "clear"):
                if query.lower() == "clear":
                    console.clear()
                    continue
                break
            
            history.append({"role": "user", "content": query})
            
            # Agent Thought Loop
            while True:
                console.print("[bold indigo]ROBIT > [/bold indigo]", end="")
                full_response = ""
                with Live("", console=console, refresh_per_second=10) as live:
                    try:
                        with httpx.stream("POST", f"{get_server_url()}/v1/chat/completions", 
                                        json={"messages": history, "stream": True}, timeout=120.0) as r:
                            if r.status_code != 200:
                                live.update(f"[red]Error: Server returned {r.status_code}[/red]")
                                break
                                
                            for line in r.iter_lines():
                                if line.startswith("data: "):
                                    try:
                                        chunk = json.loads(line[6:])
                                        if "choices" in chunk and len(chunk["choices"]) > 0:
                                            content = chunk["choices"][0].get("delta", {}).get("content", "")
                                            full_response += content
                                            live.update(Markdown(full_response))
                                    except:
                                        continue
                    except Exception as e:
                        live.update(f"[red]Connection Error: {e}[/red]")
                        break
                
                history.append({"role": "assistant", "content": full_response})
                
                # Check for tools
                has_tools, tool_results = handle_tools(full_response)
                if has_tools:
                    history.extend(tool_results)
                    # Loop back for the AI to "process" the tool results
                    continue
                else:
                    # No more tools, wait for user input
                    break
            
        except KeyboardInterrupt:
            break

    console.print("\n[bold indigo]Session Ended.[/bold indigo]")

if __name__ == "__main__":
    cli()
