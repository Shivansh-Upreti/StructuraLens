# StructuraLens 🚀

> **Live Production URL:** [https://structuralens.netlify.app](https://structuralens.netlify.app)

**StructuraLens** is a client-side DS & DAA visual learning platform for computer science students. It makes the concepts that are hardest to picture (recursion, sorting, searching, two pointers, backtracking, greedy, dynamic programming and graph traversals) visible, step by step, with code and animation moving in lock-step. It grew out of the original *Recursio* recursion visualizer, which lives on unchanged as the **Recursion** topic.

---

## 💡 The Problem
Recursion is notoriously difficult for students mastering data structures and algorithms. Because call stacks, stack frames, and recursive branching happen invisibly in memory, learners struggle to map abstract code to conceptual execution trees. Furthermore, building client-side code execution tools in the browser exposes applications to severe risks—such as infinite loops that freeze the main thread and cross-site scripting vulnerabilities.

---

## 🛠️ The Solution & Architecture
**StructuraLens** bridges the gap between theoretical data structures and practical browser-based execution through a robust, secure, multi-frontend architecture:

* **Line-by-Line Code & Recursion Visualization:** Dynamically highlights active code lines in lock-step with real-time stack frame growth, variable states, and recursive tree branches.
* **Non-Blocking Execution Sandbox:** Utilizes isolated HTML5 Web Workers (`trace.worker.js` for the Recursion topic's custom code, `frames.worker.js` for the other topics) with strict hardware-level execution timeouts to safely intercept and handle infinite loops without crashing the browser main thread.
* **Real-Time Step-by-Step State Synchronization:** Maps learner code execution directly into animations, visualizing stack depth, frame states, and tree transformations dynamically.
* **Enterprise-Grade Security:** Implements strict Content Security Policy (CSP) headers and input sanitization to ensure a safe learning environment.

---

## ⚙️ How It Was Built (AI-Assisted Engineering Workflow)
This project was designed, architected, and shipped by **Shivansh Upreti** as a 3rd-semester Computer Science undergraduate leveraging an advanced **AI-assisted development workflow**. 

Instead of getting bogged down by raw boilerplate syntax, the engineering process focused on high-level system design and product leadership:
1. **Architectural Direction:** Defined the core requirements—specifying the need for line-by-line tracing, Web Worker sandboxing, non-blocking execution, and zero-runtime network calls.
2. **AI-Powered Code Generation:** Used cutting-edge LLM coding agents (like Claude Code) to scaffold complex React components, custom hooks, and worker threads.
3. **Rigorous Review & Integration:** Handled debugging, component integration, Tailwind CSS styling, and deployment pipelines to production-ready environments (Netlify).

---

## 🚀 Getting Started Locally

Because heavy dependency and build folders (`node_modules/` and `dist/`) are intentionally excluded via `.gitignore` to keep the repository lightweight, follow these steps to set up and build the project locally on your machine:

```bash
# 1. Clone the repository
git clone [https://github.com/Shivansh-Upreti/RECURSIO.git](https://github.com/Shivansh-Upreti/RECURSIO.git)

# 2. Navigate into the project directory
cd RECURSIO

# 3. Install dependencies (This automatically generates your local 'node_modules/' folder)
npm install

# 4. Start the local development server with hot-reloading
npm run dev

# 5. Build for production (This generates your local 'dist/' production output folder)
npm run build

---
