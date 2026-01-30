import * as webllm from "https://esm.run/@mlc-ai/web-llm";

// -----------------------------
// 1) Local appConfig (no remote mlc-chat-config.json)
// -----------------------------
const appConfig = {
  // Keep cache enabled (IndexedDB)
  useIndexedDBCache: true,

  // Minimal model list (you can add more later)
  model_list: [
    {
      model_id: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
      // Model weights location (HuggingFace)
      model: "https://huggingface.co/mlc-ai/Llama-3.2-3B-Instruct-q4f32_1-MLC",
      // WebLLM runtime library (WASM) location
      model_lib:
        webllm.modelLibURLPrefix +
        webllm.modelVersion +
        "/Llama-3.2-3B-Instruct-q4f32_1-ctx4k_cs1k-webgpu.wasm",
    },
    {
      model_id: "Phi-3.5-mini-instruct-q4f32_1-MLC",
      model: "https://huggingface.co/mlc-ai/Phi-3.5-mini-instruct-q4f32_1-MLC",
      model_lib:
        webllm.modelLibURLPrefix +
        webllm.modelVersion +
        "/Phi-3.5-mini-instruct-q4f32_1-ctx4k_cs1k-webgpu.wasm",
    },
  ],
};

// -----------------------------
// UI elements
// -----------------------------
const elInput = document.getElementById("input");
const elOutput = document.getElementById("output");
const elStyle = document.getElementById("style");
const elModel = document.getElementById("model");
const btnLoad = document.getElementById("btnLoad");
const btnReword = document.getElementById("btnReword");
const btnClear = document.getElementById("btnClear");
const btnCopy = document.getElementById("btnCopy");
const progressLabel = document.getElementById("progressLabel");
const progressFill = document.getElementById("progressFill");
const status = document.getElementById("status");

let engine = null;

function setProgress(text, ratio) {
  progressLabel.textContent = text;
  progressFill.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
}

// 2) Populate dropdown using OUR local appConfig list
function populateModels() {
  elModel.innerHTML = "";
  for (const m of appConfig.model_list) {
    const opt = document.createElement("option");
    opt.value = m.model_id;
    opt.textContent = m.model_id;
    elModel.appendChild(opt);
  }
  elModel.value = appConfig.model_list[0]?.model_id || "";
}

async function loadSelectedModel() {
  const selectedModel = elModel.value;

  btnLoad.disabled = true;
  btnReword.disabled = true;
  status.textContent = "";

  const initProgressCallback = (p) => {
    const ratio = typeof p.progress === "number" ? p.progress : 0;
    setProgress(p.text || "Loading…", ratio);
  };

  try {
    setProgress("Initializing engine…", 0);

    // 3) Pass appConfig so WebLLM won’t fetch mlc-chat-config.json
    engine = await webllm.CreateMLCEngine(selectedModel, {
      appConfig,
      initProgressCallback,
    });

    setProgress("Model loaded ✓", 1);
    btnReword.disabled = false;
    status.textContent = `Loaded: ${selectedModel}`;
  } catch (err) {
    console.error(err);
    setProgress("Failed to load model", 0);
    status.textContent =
      "Model load failed. If your network blocks HuggingFace/model files, it will fail here.";
  } finally {
    btnLoad.disabled = false;
  }
}

function buildMessages(style, sentence) {
  const map = {
    professional:
      "Reword the sentence professionally while keeping the meaning. Output only the rewritten sentence.",
    concise:
      "Rewrite the sentence to be concise and clear while keeping the meaning. Output only the rewritten sentence.",
    friendly:
      "Rewrite the sentence in a friendly and approachable tone while keeping the meaning. Output only the rewritten sentence.",
    formal:
      "Rewrite the sentence in a formal tone while keeping the meaning. Output only the rewritten sentence.",
  };

  return [
    { role: "system", content: map[style] || map.professional },
    { role: "user", content: sentence },
  ];
}

async function reword() {
  if (!engine) {
    status.textContent = "Please load a model first.";
    return;
  }

  const sentence = (elInput.value || "").trim();
  if (!sentence) {
    status.textContent = "Please type a sentence.";
    return;
  }

  btnReword.disabled = true;
  status.textContent = "Rewording…";
  elOutput.value = "";

  try {
    const messages = buildMessages(elStyle.value, sentence);

    const reply = await engine.chat.completions.create({
      messages,
      temperature: 0.6,
      top_p: 0.9,
      max_tokens: 200,
    });

    elOutput.value = (reply.choices?.[0]?.message?.content || "").trim();
    status.textContent = "Done.";
  } catch (err) {
    console.error(err);
    status.textContent = "Failed to generate output.";
  } finally {
    btnReword.disabled = false;
  }
}

btnLoad.addEventListener("click", loadSelectedModel);
btnReword.addEventListener("click", reword);
btnClear.addEventListener("click", () => {
  elInput.value = "";
  elOutput.value = "";
  status.textContent = "";
});
btnCopy.addEventListener("click", async () => {
  const text = elOutput.value || "";
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    status.textContent = "Copied.";
  } catch {
    status.textContent = "Copy failed (browser permission).";
  }
});

populateModels();
setProgress("Select a model then click “Load Model”.", 0);
