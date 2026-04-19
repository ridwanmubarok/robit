# ROBIT Agentic Research Guide

ROBIT is not just a chatbot; it is a **Research Agent**. It is capable of interacting with the physical world (via the internet) and your local environment (via the file system). This guide explains how to effectively use these capabilities.

---

## 1. The Recursive Thought Loop

ROBIT operates on a "recursive loop" principle. When you ask a complex question, the agent follows this flow:
1.  **Analyze**: Determine what information is missing.
2.  **Tool Call**: Execute a command (e.g., `<search>` or `<read>`).
3.  **Synthesize**: Receive the "TOOL RESULT" from the server.
4.  **Loop**: If more info is needed, it repeats the process.
5.  **Deliver**: Provide the final answer once all data is gathered.

---

## 2. Using the Tools (Syntax)

While ROBIT is trained to use these tools automatically, you can also trigger them manually or guide the agent's behavior.

### Internet Search
Use this to get real-time news, documentation, or fact-check information.
-   **Syntax**: `<search query="your search topic" />`
-   **Example**: "Search for the latest NVIDIA driver version for Windows."

### Reading Files & PDFs
ROBIT can analyze local files. If you provide a PDF path, it will automatically extract the text.
-   **Syntax**: `<read path="C:/Users/Documents/report.pdf" />`
-   **Note**: In the Web UI, you can also use the **Paperclip icon** to upload files directly.

### Writing Files
ROBIT can generate and save code, articles, or data logs directly to your machine.
-   **Syntax**:
    ```xml
    <write path="project/app.py">
    print("Hello from ROBIT")
    </write>
    ```

### Listing Directories
If you're unsure where a file is, ask ROBIT to list the contents.
-   **Syntax**: `<ls path="." />`

---

## 3. Best Practices for 1-Bit Models

ROBIT is optimized for 1-bit models like **Bonsai 8B**. These models are extremely fast but require precise instruction following:

1.  **Be Direct**: Use clear, technical language.
2.  **Use Context**: Use the "Attach" feature in the UI for large datasets instead of pasting everything in the chat.
3.  **Verify Code**: While ROBIT is an excellent coder, always use the **Preview Tab** in the UI to test HTML/CSS/SVG designs before saving them.

---

## 4. Live Previews
When ROBIT generates web code (HTML/CSS), a **Preview** button will appear in the UI. 
-   **Code Tab**: View the source.
-   **Preview Tab**: See the rendered version instantly.
-   **Tip**: You can ask "Optimize this UI to look like Glassmorphism" and ROBIT will update the code for you.

---
Developed by **Rogatekno Labs**
"Researching the future, 1 bit at a time."
