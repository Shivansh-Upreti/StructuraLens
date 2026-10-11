# StructuraLens 🚀

> **Live Production URL:** [https://recursio.netlify.app](https://recursio.netlify.app)

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

## 🧭 Curriculum
| Tier | Topics | Status |
|---|---|---|
| 1 · Data Structures | Complexity Analysis (growth curves, Big-O/Ω/Θ), Sorting (bubble, insertion, merge, quick), Searching (linear, binary), **Recursion** (the original, untouched module), Tree Traversals (in/pre/post-order, level-order), Graph Traversals (BFS, DFS with visited set), Two Pointers | Interactive |
| 2 · Core paradigms | Backtracking (N-Queens), Greedy (interval scheduling), Dynamic Programming (0/1 knapsack, LCS, coin change) | Interactive |
| 3 · Advanced DAA | Advanced D&C (**Strassen** animated; FFT, closest pair previews); Dynamic Programming (**0/1 Knapsack**, **MCM**, LCS, coin change animated; bitmask, tree DP previews); Advanced Graphs (**Dijkstra** and **A\*** animated; Tarjan SCC, Johnson, Ford-Fulkerson, AO\* previews); String & Geometric (**KMP** animated; Rabin-Karp, convex hull previews) | Flagships interactive; the rest are annotated previews (click a line of pseudo-code to see what it does) |

**Adaptive Explanation Engine:** every topic except Recursion has a Beginner / Intermediate-Advanced toggle (remembered across visits) that swaps analogy and step-by-step text for complexity, proof sketches and trade-offs, plus a per-step hint. Content lives in `src/platform/explanations*.js`.

**Split-screen workspace:** every topic except Recursion uses a no-scroll layout (`height: calc(100vh - navbar)`): code / My code / Explain on the left, the visualizer on the right, playback controls pinned below. Verified at 1366×768 and 1280×720: the page itself never scrolls.

**My code (all topics except Recursion):** write your own implementation next to the algorithm. It runs in an isolated Web Worker (`src/platform/code/usercode.worker.js`, 3 s hard timeout) against a contract of tests per algorithm (`contracts.js`; judged by trusted reference code on the main thread). Turn on **Suggestion & Correction Mode** (default off) to also get pattern-based logic checks (`rules.js`): *incorrect logic* (e.g. missing backtrack step), *minor mistakes* with an **Accept suggestion** button that rewrites the offending line, and *optimization* hints (including a timing probe). These checks are heuristics: the tests decide correctness. Algorithms without a contract get a plain scratchpad.

Routing is hash based (`#/sorting`), so the static site needs no redirect rules. New algorithms plug into `src/platform/algorithms/*` (a `run(params)` that records frames with `F.add(line, note, kind, vizState)`), plus a viz component in `src/platform/viz/`.
