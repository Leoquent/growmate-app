/* ===== LeafDoc Inferenz-Engine =====
 * Vollständig portiert aus grow-guide-app (main.js):
 * - 3 spezialisierte TFLite-Modelle (Top / Lower / Insects), Input 299×299 float32
 * - Canvas Pre-Scaling (Performance auf Mid-Range-Geräten)
 * - Qualitäts-Check (Helligkeit) + Schärfe-Guard (Edge-Energy)
 * - Vital-Tissue-Validierung (Chlorophyll/Anthocyan-Pixelanalyse)
 * - Magnesium-vs-Kalium-Override (Interkostalchlorose-Signatur)
 * Läuft 100 % on-device – kein Cloud-Upload.
 */

declare global {
  interface Window {
    tf: any;
    tflite: any;
  }
}

export type ModelType = 'Top' | 'Lower' | 'Insects';

export interface Prediction {
  label: string;
  probability: number;
}

export type InferenceResult =
  | { ok: true; predictions: Prediction[]; leafDetected: boolean; sharp: boolean }
  | { ok: false; message: string };

const modelCache: Partial<Record<ModelType, { model: any; labels: string[] }>> = {};
let wasmPathSet = false;

export function tfliteAvailable(): boolean {
  return typeof window.tflite !== 'undefined' && typeof window.tf !== 'undefined';
}

export async function loadModel(type: ModelType): Promise<{ model: any; labels: string[] }> {
  if (modelCache[type]) return modelCache[type]!;
  if (!tfliteAvailable()) throw new Error('KI-Bibliothek nicht geladen.');
  if (!wasmPathSet) {
    // Absoluter Pfad ist Pflicht: Der TFLite-Loader löst relative Pfade gegen
    // location.href auf – mit HashRouter ('#/…') entstünde eine kaputte URL.
    // BASE_URL ist '/' lokal und '/grow-guide-app/' auf GitHub Pages
    try { window.tflite.setWasmPath(import.meta.env.BASE_URL + 'vendor/tflite/'); } catch { /* default path */ }
    wasmPathSet = true;
  }
  const base = import.meta.env.BASE_URL;
  const labelRes = await fetch(`${base}models/plant_labels_${type}.txt`);
  if (!labelRes.ok) throw new Error('Modelle nicht verfügbar (nur in der mobilen App enthalten).');
  const labels = (await labelRes.text()).split('\n').map((l) => l.trim()).filter(Boolean);
  const model = await window.tflite.loadTFLiteModel(`${base}models/plant_disease_model_${type}.tflite`);
  modelCache[type] = { model, labels };
  return modelCache[type]!;
}

/** Frames vor der Tensor-Erzeugung ressourcenschonend auf 299×299 skalieren */
function resizeToCanvas(source: CanvasImageSource, w = 299, h = 299): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(source, 0, 0, w, h);
  return canvas;
}

/** Helligkeits-Check: zu dunkel/überbelichtet → keine Diagnose */
function checkQuality(tfImg: any): { ok: boolean; msg?: string } {
  const mean = tfImg.mean().dataSync()[0];
  if (mean < 40) return { ok: false, msg: 'Das Bild ist zu dunkel. Schalte den Blitz ein oder sorge für mehr Licht.' };
  if (mean > 220) return { ok: false, msg: 'Das Bild ist überbelichtet. Sorge für indirektes Licht.' };
  return { ok: true };
}

/** Schärfe-Guard: mittlere horizontale Gradientenergie (verhindert verwackelte Diagnosen) */
export function checkSharpness(canvas: HTMLCanvasElement, threshold = 5.0): boolean {
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let edgeSum = 0;
  let samples = 0;
  for (let y = 0; y < height; y += 3) {
    for (let x = 1; x < width; x += 3) {
      const i = (y * width + x) * 4;
      const iPrev = (y * width + x - 1) * 4;
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const grayPrev = 0.299 * data[iPrev] + 0.587 * data[iPrev + 1] + 0.114 * data[iPrev + 2];
      edgeSum += Math.abs(gray - grayPrev);
      samples++;
    }
  }
  return edgeSum / samples >= threshold;
}

/** Vital-Tissue-Check: genug Chlorophyll/Anthocyan im Bild? (filtert Tische, Wände, Haut) */
function checkLeafPixels(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d')!;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let leafPixels = 0;
  let vitalPixels = 0;
  const total = canvas.width * canvas.height;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const isGreen = g > 35 && g > r + 2 && g > b + 2;
    const isYellow = g > 50 && r > 50 && Math.abs(r - g) < 30 && g > b + 15;
    const isBrown = r > 60 && g > 45 && r > g + 10 && g > b + 10 && b < 120;
    const isPurple = r > 40 && b > 40 && r > g && Math.abs(r - b) < 60;
    if (isGreen || isPurple) vitalPixels++;
    if (isGreen || isYellow || isBrown || isPurple) leafPixels++;
  }
  const leafPct = (leafPixels / total) * 100;
  const vitalPct = (vitalPixels / total) * 100;
  return leafPct >= 10.0 && vitalPct >= 3.0;
}

/** Mg-vs-K-Signatur: Interkostalchlorose-Gelb erkennen und ggf. Wahrscheinlichkeiten tauschen */
function magnesiumSignature(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d')!;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let yellowPixels = 0;
  let greenPixels = 0;
  const total = canvas.width * canvas.height;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r > 110 && g > 110 && r - b > 20 && g - b > 20 && Math.abs(r - g) < 55) yellowPixels++;
    if (g > 50 && g > r + 5 && g > b + 10) greenPixels++;
  }
  const leafPixels = greenPixels + yellowPixels;
  const yellowPct = (yellowPixels / total) * 100;
  const yellowRatio = leafPixels > 0 ? yellowPixels / leafPixels : 0;
  return yellowPixels > 150 && (yellowPct > 1.5 || yellowRatio > 0.10);
}

export async function runInference(source: CanvasImageSource, type: ModelType): Promise<InferenceResult> {
  if (!tfliteAvailable()) return { ok: false, message: 'TensorFlow Lite ist nicht geladen.' };
  const { model, labels } = await loadModel(type);
  const tf = window.tf;

  const smallCanvas = resizeToCanvas(source);
  const tfImg = tf.browser.fromPixels(smallCanvas);

  try {
    const quality = checkQuality(tfImg);
    if (!quality.ok) return { ok: false, message: quality.msg! };

    const inputDetails = model.inputs[0];
    let inputTensor: any;
    if (inputDetails.dtype === 'float32') {
      inputTensor = tfImg.toFloat().div(tf.scalar(255)).expandDims(0);
    } else {
      inputTensor = tfImg.cast('int32').expandDims(0);
    }
    const outputTensor = model.predict(inputTensor);
    const raw = outputTensor.dataSync();
    inputTensor.dispose();
    outputTensor.dispose();

    let results: Prediction[] = [];
    for (let i = 0; i < raw.length; i++) {
      let val = raw[i];
      if (inputDetails.dtype !== 'float32' && val > 1) val = val / 255.0;
      results.push({ label: labels[i] ?? `Class ${i}`, probability: val });
    }
    results.sort((a, b) => b.probability - a.probability);

    // Smart Deficiency Signature Override (Mg vs. K) – nur beim Lower-Modell
    if (type === 'Lower' && magnesiumSignature(smallCanvas)) {
      const mgIdx = results.findIndex((r) => r.label.toLowerCase() === 'magnesium');
      const kIdx = results.findIndex((r) => r.label.toLowerCase() === 'potassium');
      if (mgIdx !== -1 && kIdx !== -1) {
        const tmp = results[mgIdx].probability;
        results[mgIdx].probability = results[kIdx].probability;
        results[kIdx].probability = tmp;
        results.sort((a, b) => b.probability - a.probability);
      }
    }

    // Blatt-Erkennung
    let leafDetected = true;
    const top = results[0];
    if (!top || top.label.toLowerCase() === 'misc' || top.probability < 0.30) leafDetected = false;
    if (leafDetected && !checkLeafPixels(smallCanvas)) leafDetected = false;

    return { ok: true, predictions: results, leafDetected, sharp: checkSharpness(smallCanvas) };
  } finally {
    tfImg.dispose();
  }
}
