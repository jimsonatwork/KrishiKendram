#!/usr/bin/env node
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import os from 'node:os';
import { promisify } from 'node:util';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '../..');
const registryPath = resolve(projectRoot, 'ai/providers/model-link-registry.json');
const suitePath = resolve(projectRoot, 'ai/evaluations/KK-EVAL-LLM-001.json');
const outputDir = resolve(projectRoot, 'ai/evaluations/results');
const args = new Set(process.argv.slice(2));
const preflightOnly = args.has('--preflight');
const baseUrl = process.env.KK_AI_OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const parsedUrl = new URL(baseUrl);
if (parsedUrl.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(parsedUrl.hostname) || parsedUrl.username || parsedUrl.password) {
  throw new Error('Benchmark only permits a loopback Ollama URL.');
}
if (!preflightOnly && !args.has('--maintenance-window')) {
  console.error('Refusing to run: candidate inference competes for CPU/RAM with the live app.');
  console.error('Run only during an explicitly scheduled quiet/maintenance window with --maintenance-window.');
  console.error('Use --preflight for read-only checks that never run inference.');
  process.exit(2);
}

const registry = JSON.parse(await readFile(registryPath, 'utf8'));
const suite = JSON.parse(await readFile(suitePath, 'utf8'));
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

// Best-effort Linux/WSL sampling of the Ollama server and its llama.cpp runner.
// This runs only after the explicit maintenance-window guard above.
async function sampleOllamaRssBytes() {
  if (process.platform !== 'linux') return null;
  try {
    const { stdout } = await execFileAsync('ps', ['-eo', 'rss=,args='], {
      timeout: 2000,
      maxBuffer: 1024 * 1024,
    });
    let totalBytes = 0;
    for (const line of stdout.split('\n')) {
      const match = line.trim().match(/^(\d+)\s+(.+)$/);
      if (!match) continue;
      const command = match[2];
      if (command.includes('llama-server --model') || /(?:^|\/)ollama serve(?:\s|$)/.test(command)) {
        totalBytes += Number(match[1]) * 1024;
      }
    }
    return totalBytes || null;
  } catch {
    return null;
  }
}

function startOllamaRssSampler() {
  let peakBytes = null;
  let sampling = false;
  const sample = async () => {
    if (sampling) return;
    sampling = true;
    try {
      const rssBytes = await sampleOllamaRssBytes();
      if (rssBytes !== null) peakBytes = Math.max(peakBytes ?? 0, rssBytes);
    } finally {
      sampling = false;
    }
  };
  const timer = setInterval(() => { void sample(); }, 1000);
  timer.unref();
  void sample();
  return async () => {
    clearInterval(timer);
    await sample();
    return peakBytes;
  };
}

const tags = await getJson('/api/tags');
const runtimeInfo = await getJson('/api/version').catch(() => ({ version: null }));

if (preflightOnly) {
  const installedModels = Array.isArray(tags.models) ? tags.models : [];
  const catalog = registry.models.map((item) => {
    const installed = installedModels.find((candidate) => candidate.name === item.modelId || candidate.name?.startsWith(item.modelId + ':'));
    return {
      modelId: item.modelId,
      linked: item.linked,
      active: item.modelId === registry.activeModelId,
      selectedForEvaluation: item.modelId === registry.evaluationModelId,
      productionReady: item.productionReady === true,
      installed: Boolean(installed),
      installedSizeBytes: installed?.size ?? null,
      digest: installed?.digest ?? null,
      quantization: installed?.details?.quantization_level ?? null,
      parameterSize: installed?.details?.parameter_size ?? null,
    };
  });
  const selected = catalog.find((item) => item.modelId === registry.evaluationModelId);
  const blockers = [];
  if (!tags.models || !Array.isArray(tags.models)) blockers.push('Ollama did not return a valid model inventory.');
  if (!selected) blockers.push('No evaluation candidate is selected; use God Mode to link and select an installed model.');
  else {
    if (!selected.linked) blockers.push('Selected evaluation candidate is not linked.');
    if (!selected.installed) blockers.push('Selected evaluation candidate is not installed in local Ollama.');
    if (selected.active) blockers.push('The live model cannot be its own evaluation candidate.');
    if (selected.productionReady) blockers.push('Production-approved models are not evaluation candidates.');
  }
  console.log(JSON.stringify({
    mode: 'READ_ONLY_PREFLIGHT',
    inferenceExecuted: false,
    liveModelChanged: false,
    cloudFallbackAllowed: false,
    runtime: 'OLLAMA_LOCAL',
    runtimeVersion: runtimeInfo.version ?? null,
    registryVersion: registry.version,
    activeModelId: registry.activeModelId,
    evaluationModelId: registry.evaluationModelId ?? null,
    benchmarkCases: suite.cases.length,
    catalog,
    status: blockers.length ? 'BLOCKED' : 'READY_FOR_MAINTENANCE_WINDOW',
    blockers,
    nextStep: blockers.length
      ? 'Resolve blockers through the authorized God Mode model-connection workflow; do not edit the registry directly.'
      : 'Run the benchmark only during an explicitly authorized maintenance window with --maintenance-window.',
  }, null, 2));
  process.exit(0);
}

const modelId = registry.evaluationModelId;
if (!modelId || modelId === registry.activeModelId) throw new Error('Select a separate evaluation model in God Mode before benchmarking.');
const model = registry.models.find((item) => item.modelId === modelId);
if (!model || !model.linked || model.productionReady === true) throw new Error('Evaluation model must be a linked, non-production-approved catalogue candidate.');
const installedModel = Array.isArray(tags.models)
  ? tags.models.find((item) => item.name === modelId || item.name?.startsWith(modelId + ':'))
  : undefined;
if (!installedModel) {
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
    const conversationMessages = Array.isArray(testCase.messages)
      ? testCase.messages
      : [{ role: 'user', content: testCase.prompt }];
    if (!conversationMessages.length || conversationMessages.some((message) =>
      !message || !['user', 'assistant'].includes(message.role)
      || typeof message.content !== 'string' || !message.content.trim()
    )) {
      throw new Error('Benchmark case ' + testCase.id + ' has invalid conversation messages.');
    }
    const stopMemorySampler = startOllamaRssSampler();
    const started = performance.now();
    let firstTokenMs = null;
    let content = '';
    let final = null;
    const response = await post('/api/chat', {
      model: modelId,
      messages: [
        { role: 'system', content: 'You are KrishiKendram, a concise Indian farm assistant. Be accurate, practical, and cautious. Do not invent user records, current facts, or treatment doses. If important information is missing, ask a short clarifying question. Respond in the requested language.' },
        ...conversationMessages,
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
    const peakOllamaRssBytes = await stopMemorySampler();
    const evalCount = final?.eval_count ?? null;
    const evalDurationMs = final?.eval_duration ? Math.round(final.eval_duration / 1e6) : null;
    results.push({
      id: testCase.id,
      language: testCase.language,
      elapsedMs,
      peakOllamaRssBytes,
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
  modelArtifact: {
    digest: installedModel.digest ?? null,
    sizeBytes: installedModel.size ?? null,
    details: installedModel.details ?? null,
    licenseReview: 'MANUAL_REVIEW_REQUIRED',
  },
  runtime: 'OLLAMA_LOCAL',
  runtimeVersion: runtimeInfo.version ?? null,
  system: {
    platform: process.platform,
    architecture: process.arch,
    release: os.release(),
    cpuCount: os.cpus().length,
    totalMemoryBytes: os.totalmem(),
    freeMemoryAtStartBytes: os.freemem(),
    memoryMeasurement: process.platform === 'linux'
      ? 'best-effort sampled RSS of Ollama serve plus llama-server'
      : 'not available on this platform',
  },
  liveModelId,
  liveModelChanged: false,
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
