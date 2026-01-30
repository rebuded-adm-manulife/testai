// WebLLM via ESM CDN (no bundler). 
// NOTE: This is NOT an external AI API call; it's only downloading the JS library.
import * as webllm from 'https://esm.run/@mlc-ai/web-llm';

const elInput = document.getElementById('input');
const elOutput = document.getElementById('output');
const elStyle = document.getElementById('style');
const elModel = document.getElementById('model');
const btnLoad = document.getElementById('btnLoad');
const btnReword = document.getElementById('btnReword');
const btnClear = document.getElementById('btnClear');
const btnCopy = document.getElementById('btnCopy');
const progressLabel = document.getElementById('progressLabel');
const progressFill = document.getElementById('progressFill');
const status = document.getElementById('status');

let engine = null;

function setProgress(text, ratio) {
  progressLabel.textContent = text;
  progressFill.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
}

function populateModels() {
  const models = webllm.prebuiltAppConfig.model_list;
  const preferred = [
    'Llama-3.2-3B-Instruct-q4f32_1-MLC',
    'Phi-3.5-mini-instruct-q4f32_1-MLC',
    'Mistral-7B-Instruct-v0.3-q4f32_1-MLC',
    'Llama-3.1-8B-Instruct-q4f32_1-MLC',
  ];

  const sorted = [...models].sort((a, b) => {
    const ai = preferred.indexOf(a.model_id);
    const bi = preferred.indexOf(b.model_id);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  for (const m of sorted) {
    const opt = document.createElement('option');
    opt.value = m.model_id;
    opt.textContent = m.model_id;
    elModel.appendChild(opt);
  }

  for (const id of preferred) {
    if ([...elModel.options].some(o => o.value === id)) {
      elModel.value = id;
      break;
    }
  }
}

async function loadSelectedModel() {
  const selectedModel = elModel.value;
  btnLoad.disabled = true;
  btnReword.disabled = true;
  status.textContent = '';

  const initProgressCallback = (p) => {
    const ratio = typeof p.progress === 'number' ? p.progress : 0;
    setProgress(p.text || 'Loading model…', ratio);
  };

  try {
    setProgress('Initializing engine…', 0);
    engine = await webllm.CreateMLCEngine(selectedModel, { initProgressCallback });
    setProgress('Model loaded ✓', 1);
    btnReword.disabled = false;
    status.textContent = `Loaded: ${selectedModel}`;
  } catch (err) {
    console.error(err);
    setProgress('Failed to load model', 0);
    status.textContent = 'Model load failed. WebGPU may be unavailable, or model downloads are blocked.';
  } finally {
    btnLoad.disabled = false;
  }
}

function buildMessages(style, sentence) {
  const map = {
    professional: 'Reword the sentence professionally while keeping the meaning. Output only the rewritten sentence.',
    concise: 'Rewrite the sentence to be concise and clear while keeping the meaning. Output only the rewritten sentence.',
    friendly: 'Rewrite the sentence in a friendly and approachable tone while keeping the meaning. Output only the rewritten sentence.',
    formal: 'Rewrite the sentence in a formal tone while keeping the meaning. Output only the rewritten sentence.'
  };
  return [
    { role: 'system', content: map[style] || map.professional },
    { role: 'user', content: sentence }
  ];
}

async function reword() {
  if (!engine) {
    status.textContent = 'Please load a model first.';
    return;
  }
  const sentence = (elInput.value || '').trim();
  if (!sentence) {
    status.textContent = 'Please type a sentence.';
    return;
  }

  btnReword.disabled = true;
  status.textContent = 'Rewording…';
  elOutput.value = '';

  try {
    const messages = buildMessages(elStyle.value, sentence);
    const reply = await engine.chat.completions.create({
      messages,
      temperature: 0.6,
      top_p: 0.9,
      max_tokens: 200,
    });

    elOutput.value = (reply.choices?.[0]?.message?.content || '').trim();
    status.textContent = 'Done.';
  } catch (err) {
    console.error(err);
    status.textContent = 'Failed to generate output.';
  } finally {
    btnReword.disabled = false;
  }
}

btnLoad.addEventListener('click', loadSelectedModel);
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

populateModels();
setProgress('Select a model then click “Load Model”.', 0);
