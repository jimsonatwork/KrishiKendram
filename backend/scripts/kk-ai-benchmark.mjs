#!/usr/bin/env node
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '../..');
const registryPath = resolve(projectRoot, 'ai/providers/model-link-registry.json');
const suitePath = resolve(projectRoot, 'ai/evaluations/KK-EVAL-LLM-001.json');
const outputDir = resolve(projectRoot, 'ai/evaluations/results');
const args = new Set(process.argv.slice(2));
const baseUrl = process.env.KK_AI_OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const parsedUrl = new URL(baseUrl);
if (parsedUrl.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(parsedUrl.hostname) || parsedUrl.username || parsedUrl.password) {
  throw new Error('Benchmark only permits a loopback Ollama URL.');
}
if (!args.has('--maintenance-window')) {
  console.error('Refusing to run: candidate inference competes for CPU/RAM with the live app.');
  console.error('Run only during an explicitly scheduled quiet/maintenance window with --maintenance-window.');
  process.exit(2);
}

const registry = JSON.parse(await readFile(registryPath, 'utf8'));
const suite = JSON.parse(await readFile(suitePath, 'utf8'));
const modelId = registry.evaluationModelId;
if (!modelId || modelId === registry.activeModelId) throw new Error('Select a separate evaluation model in God Mode before benchmarking.');
const model = registry.models.find((item) => item.modelId === modelId);
if (!model || !model.linked || model.productionReady === true) throw new Error('Evaluation model must be a linked, non-production-approved catalogue candidate.');
const endpoint = (path) => baseUrl.replace(/\/$/, '') + path;
async function post(path, body, timeoutMs = 180000) {
  const response = await fetch(endpoint(path), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error('Ollama ' + path + ' failed with HTTP ' + response.status);
  return response;
}
async function getJson(path) {
  const response = await fetch(endpoint(path), { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('Ollama ' + path + ' failed with HTTP ' + response.status);
  return response.json();
}
const tags = await getJson('/api/tags');
if (!Array.isArray(tags.models) || !tags.models.some((item) => item.name === modelId || item.name?.startsWith(modelId + ':'))) {
  throw new Error('Selected evaluation model is not installed in the local Ollama runtime.');
}
const liveModelId = registry.activeModelId;
const startedAt = new Date().toISOString();
const results = [];
let restoreError = null;
try {
  // Release the live model first to avoid holding two model weights in limited WSL RAM.
  await post('/api/generate', { model: liveModelId, prompt: '', stream: false, keep_alive: 0 }, 30000);
  for (const testCase of suite.cases) {
    const started = performance.now();
    let firstTokenMs = null;
    let content = '';
    let final = null;
    const response = await post('/api/chat', {
      model: modelId,
      messages: [
        { role: 'system', content: 'You are KrishiKendram, a concise Indian farm assistant. Be accurate, practical, and cautious. Do not invent user records, current facts, or treatment doses. If important information is missing, ask a short clarifying question. Respond in the requested language.' },
        { role: 'user', content: testCase.prompt },
      ],
      stream: true,
      think: false,
      keep_alive: '30m',
      options: { temperature: suite.defaultSettings.temperature, num_predict: suite.defaultSettings.outputTokens, num_ctx: suite.defaultSettings.contextTokens, num_thread: 2 },
    });
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      const lines = pending.split('\n');
      pending = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        const chunk = JSON.parse(line);
        const piece = chunk.message?.content || '';
        if (piece && firstTokenMs === null) firstTokenMs = Math.round(performance.now() - started);
        content += piece;
        if (chunk.done) final = chunk;
      }
    }
    if (pending.trim()) {
      const chunk = JSON.parse(pending);
      content += chunk.message?.content || '';
      if (chunk.done) final = chunk;
    }
    const elapsedMs = Math.round(performance.now() - started);
    const evalCount = final?.eval_count ?? null;
    const evalDurationMs = final?.eval_duration ? Math.round(final.eval_duration / 1e6) : null;
    results.push({
      id: testCase.id,
      language: testCase.language,
      elapsedMs,
      timeToFirstTokenMs: firstTokenMs,
      modelLoadMs: final?.load_duration ? Math.round(final.load_duration / 1e6) : null,
      promptTokens: final?.prompt_eval_count ?? null,
      promptEvalMs: final?.prompt_eval_duration ? Math.round(final.prompt_eval_duration / 1e6) : null,
      outputTokens: evalCount,
      generationMs: evalDurationMs,
      tokensPerSecond: evalCount && evalDurationMs ? Number((evalCount / (evalDurationMs / 1000)).toFixed(2)) : null,
      answer: content.trim(),
      manualReviewCriteria: testCase.review,
    });
  }
} finally {
  try {
    await post('/api/generate', { model: modelId, prompt: '', stream: false, keep_alive: 0 }, 30000);
    await post('/api/chat', {
      model: liveModelId,
      messages: [{ role: 'user', content: 'Reply with OK.' }],
      stream: false,
      think: false,
      keep_alive: '4h',
      options: { temperature: 0, num_predict: 2, num_ctx: 2048, num_thread: 2 },
    }, 180000);
  } catch (error) {
    restoreError = error instanceof Error ? error.message : String(error);
  }
}
const report = {
  suiteId: suite.suiteId,
  suiteVersion: suite.version,
  registryId: registry.registryId,
  modelId,
  liveModelId,
  liveModelChanged: false,
  runtime: 'OLLAMA_LOCAL',
  startedAt,
  completedAt: new Date().toISOString(),
  settings: suite.defaultSettings,
  results,
  promotionDecision: 'MANUAL_REVIEW_REQUIRED',
  restoreError,
};
await mkdir(outputDir, { recursive: true });
const stamp = startedAt.replace(/[:.]/g, '-');
const outputPath = resolve(outputDir, stamp + '-' + modelId.replace(/[^a-zA-Z0-9.-]/g, '_') + '.json');
await writeFile(outputPath, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
console.log(JSON.stringify({ outputPath, modelId, liveModelId, liveModelChanged: false, cases: results.length, avgElapsedMs: results.length ? Math.round(results.reduce((sum, item) => sum + item.elapsedMs, 0) / results.length) : null, restoreError }, null, 2));
if (restoreError) process.exitCode = 3;
