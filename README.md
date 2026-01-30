# Offline Tiny LLM Reworder (Option B - Balanced)

This project is the **corporate-friendly** version: it runs an LLM **entirely inside the browser** with **no external AI API calls**.

Because your network blocks Hugging Face downloads (403), this package is set up for **fully local bundling**.

## What you get
- Static site that you can upload directly to **GitHub Pages** (no build, no Actions, no hidden folders).
- A rewording UI + local-only inference wiring.

## IMPORTANT: you must add runtime + model files
To keep this ZIP small (and because model binaries are large), this package includes **placeholders** only.

You need to copy these files into the repo **before it can run**:

### 1) Transformers.js UMD bundle
Place into:
- `vendor/transformers.min.js`

### 2) ONNX Runtime Web WASM binaries
Create folder:
- `vendor/ort-wasm/`

And put these files inside (names may vary by version):
- `ort-wasm.wasm`
- `ort-wasm-simd.wasm`
- `ort-wasm-threaded.wasm`
- `ort-wasm-simd-threaded.wasm`
- `ort-wasm.js` (if provided)

### 3) GPT-2 Small model exported for Transformers.js (local)
Create folder:
- `model/`

And place model + tokenizer assets. Typical set:
- `config.json`
- `tokenizer.json` OR `vocab.json` + `merges.txt`
- `tokenizer_config.json` (optional)
- `special_tokens_map.json` (optional)
- ONNX model file(s) such as `model.onnx` (exact name depends on export)

> Tip: You can prepare these files on a **non-corporate network** and then transfer them via USB to your corporate machine.

## Running on GitHub Pages (upload-only)
1. Upload everything in this folder to your GitHub repo root.
2. Settings → Pages → Deploy from branch → `main` → `/(root)`.
3. Open your Pages URL.
4. Click **Initialize Model**.

## Troubleshooting
- If you see "Initialization failed": you are missing one of the required local files.
- Open DevTools (F12) → Console for the exact missing path.

## Why this design
Your corporate proxy returns 403 for Hugging Face model URLs, so WebLLM cannot fetch model files at runtime. This version avoids that by requiring all assets to be served locally from the same GitHub Pages origin.
