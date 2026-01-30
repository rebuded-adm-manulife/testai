// Offline Tiny LLM Reworder (Option B)
// This project is designed for *no external calls*. Therefore, it expects you to bundle runtime + model files locally.
//
// Required local files (see README.md):
//  - ./vendor/transformers.min.js  (Transformers.js UMD build)
//  - ./vendor/ort-wasm/           (ONNX Runtime Web WASM binaries)
//  - ./model/                     (GPT-2 small ONNX + tokenizer files)
//
// NOTE: We avoid npm/bundlers to keep GitHub Pages "upload-only" friendly.

const elInput = document.getElementById('input');
const elOutput = document.getElementById('output');
const elStyle = document.getElementById('style');
const btnInit = document.getElementById('btnInit');
const btnReword = document.getElementById('btnReword');
const btnClear = document.getElementById('btnClear');
const btnCopy = document.getElementById('btnCopy');
const progressLabel = document.getElementById('progressLabel');
const progressFill = document.getElementById('progressFill');
const status = document.getElementById('status');

let pipeline = null;

function setProgress(text, ratio) {
  progressLabel.textContent = text;
  progressFill.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}

async function init() {
  btnInit.disabled = true;
  btnReword.disabled = true;
  status.textContent = '';

  try {
    setProgress('Loading runtime…', 0.1);

    // Load Transformers.js UMD build locally
    await loadScript('./vendor/transformers.min.js');

    if (!window.transformers) {
      throw new Error('transformers.js did not attach window.transformers');
    }

    // Configure local paths so it doesn't try to fetch anything remotely
    const { env, pipeline: makePipeline } = window.transformers;

    // Ensure all fetching is local-only
    env.allowRemoteModels = false;
    env.allowLocalModels = true;

    // Point to your local model folder
    env.localModelPath = './model/';

    // Tell ONNX runtime where WASM binaries are
    env.backends.onnx.wasm.wasmPaths = './vendor/ort-wasm/';

    setProgress('Initializing model (local)…', 0.35);

    // Text-generation pipeline using GPT-2 small exported to ONNX.
    // The model folder must contain a supported ONNX model + tokenizer files.
    pipeline = await makePipeline('text-generation', 'gpt2', {
      // Force local usage
      local_files_only: true,
      // Reduce overhead
      quantized: true,
      progress_callback: (p) => {
        // p can be string or object depending on version
        if (typeof p === 'string') {
          setProgress(p, 0.5);
        }
      }
    });

    setProgress('Ready ✓', 1);
    status.textContent = 'Model initialized locally.';
    btnReword.disabled = false;
  } catch (e) {
    console.error(e);
    setProgress('Initialization failed', 0);
    status.textContent = 'Initialization failed. Verify required files exist under /vendor and /model (see README).';
  } finally {
    btnInit.disabled = false;
  }
}

function buildPrompt(style, sentence) {
  const map = {
    professional: 'Rewrite professionally: ',
    concise: 'Rewrite concisely: ',
    friendly: 'Rewrite in a friendly tone: ',
    formal: 'Rewrite formally: '
  };
  return (map[style] || map.professional) + sentence.trim() + '\nRewritten:';
}

async function reword() {
  if (!pipeline) {
    status.textContent = 'Please initialize the model first.';
    return;
  }

  const sentence = (elInput.value || '').trim();
  if (!sentence) {
    status.textContent = 'Please type a sentence.';
    return;
  }

  btnReword.disabled = true;
  status.textContent = 'Generating…';
  elOutput.value = '';

  try {
    const prompt = buildPrompt(elStyle.value, sentence);

    // Generate a short continuation.
    const out = await pipeline(prompt, {
      max_new_tokens: 40,
      temperature: 0.7,
      top_p: 0.9,
      repetition_penalty: 1.12,
      do_sample: true,
    });

    const text = Array.isArray(out) ? (out[0]?.generated_text || '') : (out?.generated_text || '');

    // Extract after "Rewritten:" if present
    const cleaned = text.includes('Rewritten:') ? text.split('Rewritten:').slice(1).join('Rewritten:') : text;
    elOutput.value = cleaned.trim();

    status.textContent = 'Done.';
  } catch (e) {
    console.error(e);
    status.textContent = 'Generation failed. Open DevTools (F12) for details.';
  } finally {
    btnReword.disabled = false;
  }
}

btnInit.addEventListener('click', init);
btnReword.addEventListener('click', reword);
btnClear.addEventListener('click', () => {
  elInput.value = '';
  elOutput.value = '';
  status.textContent = '';
});
btnCopy.addEventListener('click', async () => {
  const text = elOutput.value || '';
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    status.textContent = 'Copied.';
  } catch {
    status.textContent = 'Copy failed (browser permission).';
  }
});

setProgress('Click “Initialize Model”.', 0);
