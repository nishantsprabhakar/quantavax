const els = {
  sequence: document.getElementById("sequenceInput"),
  qubits: document.getElementById("qubits"),
  mitigation: document.getElementById("mitigation"),
  labCapacity: document.getElementById("labCapacity"),
  baseWeeks: document.getElementById("baseWeeks"),
  baseCost: document.getElementById("baseCost"),
  run: document.getElementById("runButton"),
  mutate: document.getElementById("mutateButton"),
  qubitReadout: document.getElementById("qubitReadout"),
  timeSaved: document.getElementById("timeSaved"),
  costSaved: document.getElementById("costSaved"),
  confidence: document.getElementById("confidence"),
  candidateCount: document.getElementById("candidateCount"),
  energyReadout: document.getElementById("energyReadout"),
  riskLabel: document.getElementById("riskLabel"),
  compressionReadout: document.getElementById("compressionReadout"),
  timeline: document.getElementById("timeline"),
  foldCanvas: document.getElementById("foldCanvas"),
  radarCanvas: document.getElementById("radarCanvas"),
  quantumCanvas: document.getElementById("quantumCanvas"),
  moleculeCanvas: document.getElementById("moleculeCanvas"),
  quantumStage: document.getElementById("quantumStage"),
  hotspotReadout: document.getElementById("hotspotReadout"),
  foldHint: document.getElementById("foldHint")
};

const pairEnergy = {
  AU: -2.1,
  UA: -2.1,
  GC: -3.4,
  CG: -3.4,
  GU: -1.1,
  UG: -1.1
};

const phaseModel = [
  { name: "Sequence optimization", share: 0.22 },
  { name: "Structure prediction", share: 0.24 },
  { name: "Antigen triage", share: 0.21 },
  { name: "Wet-lab confirmation", share: 0.33 }
];

const vizState = {
  sequence: "",
  fold: { pairs: [], energy: 0, seed: 1 },
  metrics: {},
  foldHover: -1,
  moleculeHover: -1,
  selectedHotspot: -1,
  hotspots: [],
  particles: []
};

function cleanSequence(value) {
  return value.toUpperCase().replace(/T/g, "U").replace(/[^AUGC]/g, "");
}

function hashSequence(sequence) {
  let hash = 2166136261;
  for (let i = 0; i < sequence.length; i += 1) {
    hash ^= sequence.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededNoise(seed, index) {
  const x = Math.sin(seed * 0.0001 + index * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function computeFold(sequence, qubits, mitigation) {
  const seed = hashSequence(sequence);
  const maxPairs = Math.min(Math.floor(sequence.length / 2), Math.floor(qubits / 2));
  const pairs = [];
  const used = new Set();
  for (let distance = sequence.length - 1; distance > 5 && pairs.length < maxPairs; distance -= 1) {
    for (let i = 0; i + distance < sequence.length && pairs.length < maxPairs; i += 1) {
      const j = i + distance;
      const key = sequence[i] + sequence[j];
      const fit = pairEnergy[key];
      const jitter = seededNoise(seed, i * 97 + j);
      if (fit && !used.has(i) && !used.has(j) && jitter > 0.34) {
        used.add(i);
        used.add(j);
        pairs.push({ i, j, energy: fit - mitigation * 0.035 + jitter * 0.25 });
      }
    }
  }
  const energy = pairs.reduce((sum, pair) => sum + pair.energy, 0);
  return { pairs, energy, seed };
}

function simulate() {
  const sequence = cleanSequence(els.sequence.value);
  if (sequence !== els.sequence.value) {
    els.sequence.value = sequence;
  }

  const qubits = Number(els.qubits.value);
  const mitigation = Number(els.mitigation.value);
  const labCapacity = Number(els.labCapacity.value);
  const baseWeeks = Math.max(4, Number(els.baseWeeks.value));
  const baseCost = Math.max(1, Number(els.baseCost.value));
  const fold = computeFold(sequence, qubits, mitigation);

  const gc = sequence.length ? (sequence.match(/[GC]/g) || []).length / sequence.length : 0;
  const pairDensity = sequence.length ? fold.pairs.length / sequence.length : 0;
  const quantumPower = (qubits - 48) / (156 - 48);
  const noiseControl = mitigation / 10;
  const validationLift = Math.min(1, labCapacity / 24);
  const foldGain = clamp(0.18 + quantumPower * 0.28 + noiseControl * 0.12 + pairDensity * 0.45, 0.18, 0.74);
  const triageGain = clamp(0.08 + quantumPower * 0.16 + validationLift * 0.14 + (1 - Math.abs(gc - 0.52)) * 0.1, 0.08, 0.46);
  const timeSaved = baseWeeks * (foldGain * 0.52 + triageGain * 0.28);
  const costSaved = baseCost * (foldGain * 0.34 + triageGain * 0.44 + validationLift * 0.08);
  const confidence = clamp(58 + foldGain * 22 + triageGain * 18 + noiseControl * 8 - Math.abs(gc - 0.52) * 18, 52, 96);
  const candidates = Math.max(2, Math.round(28 - triageGain * 20 + validationLift * 4));
  const compression = clamp((timeSaved / baseWeeks) * 100, 0, 82);
  vizState.sequence = sequence;
  vizState.fold = fold;
  vizState.metrics = { confidence, foldGain, triageGain, gc, validationLift, noiseControl, quantumPower, compression };
  vizState.hotspots = buildHotspots(fold.seed, confidence, triageGain, gc);
  vizState.particles = buildParticles(fold.seed, qubits, confidence);

  els.qubitReadout.textContent = `${qubits} qubits`;
  els.timeSaved.textContent = `${timeSaved.toFixed(1)} w`;
  els.costSaved.textContent = `$${costSaved.toFixed(2)}M`;
  els.confidence.textContent = `${confidence.toFixed(1)}%`;
  els.candidateCount.textContent = String(candidates);
  els.energyReadout.textContent = `${fold.energy.toFixed(2)} kcal/mol`;
  els.riskLabel.textContent = confidence > 84 ? "high confidence" : confidence > 72 ? "balanced" : "needs review";
  els.compressionReadout.textContent = `${compression.toFixed(1)}% shorter pathway`;

  drawFold(sequence, fold);
  drawRadar({ confidence, foldGain, triageGain, gc, validationLift, noiseControl });
  drawQuantumFlow(0);
  drawMolecule(0);
  renderTimeline(baseWeeks, compression);
}

function renderTimeline(baseWeeks, compression) {
  const maxWeeks = baseWeeks * 0.36;
  els.timeline.innerHTML = "";
  phaseModel.forEach((phase, index) => {
    const base = baseWeeks * phase.share;
    const quantum = base * (1 - compression / 100 * (0.65 + index * 0.08));
    const row = document.createElement("div");
    row.className = "timeline-row";
    row.innerHTML = `
      <strong>${phase.name}</strong>
      <div class="bar-track" aria-hidden="true">
        <span class="bar-base" style="width:${(base / maxWeeks) * 100}%"></span>
        <span class="bar-quantum" style="width:${(quantum / maxWeeks) * 100}%"></span>
      </div>
      <span>${quantum.toFixed(1)} w</span>
    `;
    els.timeline.appendChild(row);
  });
}

function drawFold(sequence, fold, tick = 0) {
  const canvas = els.foldCanvas;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#061112";
  ctx.fillRect(0, 0, width, height);

  const count = Math.max(1, sequence.length);
  const left = 54;
  const right = width - 54;
  const baseline = height * 0.64;
  const step = (right - left) / Math.max(1, count - 1);

  ctx.strokeStyle = "rgba(101,214,255,0.12)";
  ctx.lineWidth = 1;
  for (let g = 0; g < 8; g += 1) {
    const y = 44 + g * 54;
    ctx.beginPath();
    ctx.moveTo(34, y);
    ctx.lineTo(width - 34, y);
    ctx.stroke();
  }

  fold.pairs.forEach((pair, index) => {
    const x1 = left + pair.i * step;
    const x2 = left + pair.j * step;
    const arc = Math.max(34, (x2 - x1) * 0.38);
    const glow = index === vizState.foldHover ? 1 : 0;
    const shimmer = Math.sin(tick * 0.004 + index * 0.7) * 0.5 + 0.5;
    ctx.beginPath();
    ctx.moveTo(x1, baseline);
    ctx.bezierCurveTo(x1, baseline - arc, x2, baseline - arc, x2, baseline);
    ctx.strokeStyle = glow ? "rgba(185,70,103,0.96)" : index % 3 === 0 ? `rgba(15,123,99,${0.58 + shimmer * 0.24})` : index % 3 === 1 ? `rgba(35,104,162,${0.52 + shimmer * 0.22})` : `rgba(185,70,103,${0.44 + shimmer * 0.18})`;
    ctx.lineWidth = (glow ? 6 : 2) + Math.min(3, Math.abs(pair.energy) / 2);
    ctx.stroke();
  });

  for (let i = 0; i < count; i += 1) {
    const x = left + i * step;
    const base = sequence[i] || "A";
    ctx.beginPath();
    ctx.arc(x, baseline, 8, 0, Math.PI * 2);
    ctx.fillStyle = base === "G" || base === "C" ? "#39f5b6" : base === "A" ? "#65d6ff" : "#ffd37c";
    ctx.fill();
    if (step > 12) {
      ctx.fillStyle = "#effffa";
      ctx.font = "11px Consolas, monospace";
      ctx.textAlign = "center";
      ctx.fillText(base, x, baseline + 25);
    }
  }

  ctx.fillStyle = "rgba(239,255,250,0.78)";
  ctx.font = "700 14px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("CVaR-selected low-energy pairings", 34, 30);
}

function drawQuantumFlow(tick) {
  const canvas = els.quantumCanvas;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const metrics = vizState.metrics;
  const stages = [
    { x: width * 0.13, y: height * 0.5, label: "QUBO encode" },
    { x: width * 0.36, y: height * 0.5, label: "VQA sample" },
    { x: width * 0.61, y: height * 0.5, label: "CVaR select" },
    { x: width * 0.84, y: height * 0.5, label: "Antigen confirm" }
  ];
  ctx.clearRect(0, 0, width, height);
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#0d2028");
  gradient.addColorStop(0.55, "#123941");
  gradient.addColorStop(1, "#0d2e35");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 13; i += 1) {
    const y = 36 + i * 34;
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(width - 30, y + Math.sin(tick * 0.002 + i) * 12);
    ctx.stroke();
  }

  stages.forEach((stage, index) => {
    if (index < stages.length - 1) {
      const next = stages[index + 1];
      ctx.strokeStyle = "rgba(139,215,255,0.36)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(stage.x + 56, stage.y);
      ctx.bezierCurveTo(stage.x + 100, stage.y - 82, next.x - 100, next.y + 82, next.x - 56, next.y);
      ctx.stroke();
    }
  });

  vizState.particles.forEach((particle, index) => {
    const progress = (particle.phase + tick * particle.speed) % 1;
    const pathIndex = Math.min(stages.length - 2, Math.floor(progress * (stages.length - 1)));
    const local = progress * (stages.length - 1) - pathIndex;
    const a = stages[pathIndex];
    const b = stages[pathIndex + 1];
    const wave = Math.sin(local * Math.PI) * (particle.lane * 24);
    const x = a.x + (b.x - a.x) * local;
    const y = a.y + (b.y - a.y) * local + wave;
    const pass = particle.score < (metrics.confidence || 70) / 100;
    ctx.beginPath();
    ctx.arc(x, y, pass ? 5.6 : 3.8, 0, Math.PI * 2);
    ctx.fillStyle = pass ? "rgba(114,226,184,0.9)" : "rgba(255,211,124,0.78)";
    ctx.shadowColor = pass ? "rgba(114,226,184,0.85)" : "rgba(255,211,124,0.7)";
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;
    if (index % 9 === 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.beginPath();
      ctx.arc(x, y, 12 + Math.sin(tick * 0.006 + index) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  stages.forEach((stage, index) => {
    const active = Math.floor((tick * 0.0012) % stages.length) === index;
    ctx.beginPath();
    ctx.arc(stage.x, stage.y, active ? 62 : 52, 0, Math.PI * 2);
    ctx.fillStyle = active ? "rgba(139,215,255,0.2)" : "rgba(255,255,255,0.08)";
    ctx.fill();
    ctx.strokeStyle = active ? "#8bd7ff" : "rgba(255,255,255,0.22)";
    ctx.lineWidth = active ? 3 : 2;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "850 15px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(stage.label, stage.x, stage.y + 5);
  });

  const stageNames = ["encoding constraints", "sampling states", "selecting low-risk tail", "confirming antigen"];
  els.quantumStage.textContent = stageNames[Math.floor((tick * 0.0012) % stageNames.length)];
}

function drawMolecule(tick) {
  const canvas = els.moleculeCanvas;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const cx = width * 0.5;
  const cy = height * 0.52;
  const points = [];
  const sequence = vizState.sequence || "AUGC";
  const seed = vizState.fold.seed || 1;
  const count = 72;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#061112";
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const angle = t * Math.PI * 5.6 + tick * 0.00065;
    const radius = 72 + Math.sin(t * Math.PI * 7 + seed) * 24;
    const x = cx + Math.cos(angle) * radius + (t - 0.5) * width * 0.62;
    const y = cy + Math.sin(angle) * radius * 0.58 + Math.sin(t * Math.PI * 3 + tick * 0.001) * 32;
    const z = Math.cos(angle) * 0.5 + 0.5;
    points.push({ x, y, z, base: sequence[i % sequence.length] });
  }

  ctx.strokeStyle = "rgba(239,255,250,0.16)";
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.beginPath();
  points.forEach((point, i) => {
    if (i === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();

  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(35,104,162,0.72)";
  ctx.beginPath();
  points.forEach((point, i) => {
    if (i === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();

  points.forEach((point, i) => {
    if (i % 3 !== 0) return;
    const size = 4 + point.z * 5;
    ctx.beginPath();
    ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
    ctx.fillStyle = point.base === "G" || point.base === "C" ? "#39f5b6" : point.base === "A" ? "#65d6ff" : "#ffd37c";
    ctx.fill();
  });

  const projectedHotspots = vizState.hotspots.map((hotspot, index) => {
    const point = points[hotspot.point % points.length];
    const pulse = Math.sin(tick * 0.005 + index) * 0.5 + 0.5;
    const selected = index === vizState.selectedHotspot;
    const hover = index === vizState.moleculeHover;
    const r = (selected ? 26 : hover ? 23 : 18) + pulse * 4;
    ctx.beginPath();
    ctx.arc(point.x, point.y, r, 0, Math.PI * 2);
    ctx.fillStyle = hotspot.kind === "binding" ? "rgba(185,70,103,0.28)" : "rgba(15,123,99,0.24)";
    ctx.fill();
    ctx.strokeStyle = hotspot.kind === "binding" ? "#ff5e87" : "#39f5b6";
    ctx.lineWidth = selected || hover ? 4 : 2;
    ctx.stroke();
    ctx.fillStyle = "#effffa";
    ctx.font = "850 12px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.round(hotspot.score)}%`, point.x, point.y + 4);
    return { ...hotspot, x: point.x, y: point.y, r };
  });
  vizState.projectedHotspots = projectedHotspots;

  const receptorX = width * 0.76;
  const receptorY = height * 0.36 + Math.sin(tick * 0.0018) * 8;
  ctx.strokeStyle = "rgba(185,70,103,0.7)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(receptorX - 80, receptorY - 35);
  ctx.bezierCurveTo(receptorX - 20, receptorY - 88, receptorX + 60, receptorY - 45, receptorX + 84, receptorY + 10);
  ctx.bezierCurveTo(receptorX + 48, receptorY + 62, receptorX - 18, receptorY + 74, receptorX - 78, receptorY + 30);
  ctx.stroke();
  ctx.fillStyle = "rgba(185,70,103,0.08)";
  ctx.fill();

  const selected = projectedHotspots[vizState.selectedHotspot] || projectedHotspots[0];
  if (selected) {
    ctx.strokeStyle = "rgba(185,70,103,0.3)";
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(selected.x, selected.y);
    ctx.lineTo(receptorX - 38, receptorY + 4);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.fillStyle = "rgba(239,255,250,0.76)";
  ctx.font = "800 14px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Rotating antigen conformer with predicted epitope hotspots", 28, 32);
}

function buildHotspots(seed, confidence, triageGain, gc) {
  return Array.from({ length: 5 }, (_, index) => {
    const score = clamp(confidence - index * 4 + seededNoise(seed, index * 43) * 16 - Math.abs(gc - 0.52) * 8, 48, 97);
    return {
      point: Math.floor(seededNoise(seed, index * 59 + 17) * 66) + 2,
      score,
      kind: index === 1 || index === 4 ? "binding" : "epitope",
      label: `${index === 1 || index === 4 ? "Binding pocket" : "Epitope"} ${index + 1}`,
      exposure: clamp(52 + triageGain * 80 + seededNoise(seed, index * 31) * 18, 35, 98)
    };
  });
}

function buildParticles(seed, qubits, confidence) {
  const amount = Math.round(clamp(qubits / 3, 18, 52));
  return Array.from({ length: amount }, (_, index) => ({
    phase: seededNoise(seed, index * 13),
    speed: 0.00007 + seededNoise(seed, index * 23) * 0.00008,
    lane: Math.floor(seededNoise(seed, index * 37) * 7) - 3,
    score: clamp(seededNoise(seed, index * 71) * 0.8 + (100 - confidence) / 250, 0, 1)
  }));
}

function drawRadar(values) {
  const canvas = els.radarCanvas;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.36;
  const axes = [
    ["Stability", values.foldGain],
    ["Epitope", values.triageGain + 0.34],
    ["Manufacture", 1 - Math.abs(values.gc - 0.5)],
    ["Binding", values.confidence / 100],
    ["Noise", values.noiseControl],
    ["Validation", values.validationLift]
  ];

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#061112";
  ctx.fillRect(0, 0, width, height);

  for (let ring = 1; ring <= 4; ring += 1) {
    ctx.beginPath();
    axes.forEach((_, i) => {
      const p = pointFor(i, axes.length, radius * ring / 4, cx, cy);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.strokeStyle = "rgba(101,214,255,0.14)";
    ctx.stroke();
  }

  axes.forEach((axis, i) => {
    const p = pointFor(i, axes.length, radius, cx, cy);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = "rgba(101,214,255,0.14)";
    ctx.stroke();
    ctx.fillStyle = "#9bb4b3";
    ctx.font = "700 12px Inter, sans-serif";
    ctx.textAlign = p.x < cx - 10 ? "right" : p.x > cx + 10 ? "left" : "center";
    const labelX = clamp(p.x + (p.x < cx ? -10 : 10), 64, width - 64);
    ctx.fillText(axis[0], labelX, p.y + 4);
  });

  ctx.beginPath();
  axes.forEach((axis, i) => {
    const p = pointFor(i, axes.length, radius * clamp(axis[1], 0.1, 1), cx, cy);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(15,123,99,0.22)";
  ctx.fill();
  ctx.strokeStyle = "#39f5b6";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#effffa";
  ctx.font = "850 34px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${values.confidence.toFixed(0)}%`, cx, cy + 9);
}

function pointFor(index, total, radius, cx, cy) {
  const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius
  };
}

function mutateSequence() {
  const source = cleanSequence(els.sequence.value);
  const bases = ["A", "U", "G", "C"];
  const chars = source.split("");
  const seed = hashSequence(source) || 11;
  for (let i = 0; i < Math.max(2, Math.floor(chars.length * 0.06)); i += 1) {
    const index = Math.floor(seededNoise(seed, i * 19) * chars.length);
    chars[index] = bases[Math.floor(seededNoise(seed, i * 29) * bases.length)];
  }
  els.sequence.value = chars.join("");
  simulate();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

[els.sequence, els.qubits, els.mitigation, els.labCapacity, els.baseWeeks, els.baseCost].forEach((el) => {
  el.addEventListener("input", simulate);
});
els.run.addEventListener("click", simulate);
els.mutate.addEventListener("click", mutateSequence);
els.foldCanvas.addEventListener("mousemove", handleFoldHover);
els.foldCanvas.addEventListener("mouseleave", () => {
  vizState.foldHover = -1;
  els.foldHint.textContent = "Move the pointer across the fold map to inspect candidate pairings.";
});
els.moleculeCanvas.addEventListener("mousemove", handleMoleculeHover);
els.moleculeCanvas.addEventListener("mouseleave", () => {
  vizState.moleculeHover = -1;
});
els.moleculeCanvas.addEventListener("click", (event) => {
  const nearest = findNearestHotspot(event, false);
  if (nearest >= 0) {
    vizState.selectedHotspot = nearest;
    updateHotspotReadout();
  }
});

function handleFoldHover(event) {
  const rect = els.foldCanvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width * els.foldCanvas.width;
  const y = (event.clientY - rect.top) / rect.height * els.foldCanvas.height;
  const sequence = vizState.sequence;
  const step = (els.foldCanvas.width - 108) / Math.max(1, sequence.length - 1);
  const baseline = els.foldCanvas.height * 0.64;
  let best = -1;
  let bestDistance = Infinity;
  vizState.fold.pairs.forEach((pair, index) => {
    const x1 = 54 + pair.i * step;
    const x2 = 54 + pair.j * step;
    const mid = (x1 + x2) / 2;
    const arc = Math.max(34, (x2 - x1) * 0.38);
    const ay = baseline - arc * 0.74;
    const distance = Math.hypot(x - mid, y - ay);
    if (distance < bestDistance && distance < 58) {
      best = index;
      bestDistance = distance;
    }
  });
  vizState.foldHover = best;
  if (best >= 0) {
    const pair = vizState.fold.pairs[best];
    els.foldHint.textContent = `Pair ${pair.i + 1}-${pair.j + 1}: ${sequence[pair.i]}:${sequence[pair.j]}, energy ${pair.energy.toFixed(2)} kcal/mol`;
  } else {
    els.foldHint.textContent = "Move the pointer across the fold map to inspect candidate pairings.";
  }
}

function handleMoleculeHover(event) {
  vizState.moleculeHover = findNearestHotspot(event, true);
  updateHotspotReadout();
}

function findNearestHotspot(event, requireClose) {
  const rect = els.moleculeCanvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width * els.moleculeCanvas.width;
  const y = (event.clientY - rect.top) / rect.height * els.moleculeCanvas.height;
  let best = -1;
  let bestDistance = Infinity;
  (vizState.projectedHotspots || []).forEach((hotspot, index) => {
    const distance = Math.hypot(x - hotspot.x, y - hotspot.y);
    if (distance < hotspot.r + 22 && distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  if (best < 0 && !requireClose) {
    (vizState.projectedHotspots || []).forEach((hotspot, index) => {
      const distance = Math.hypot(x - hotspot.x, y - hotspot.y);
      if (distance < bestDistance) {
        best = index;
        bestDistance = distance;
      }
    });
  }
  return best;
}

function updateHotspotReadout() {
  const hotspot = vizState.hotspots[vizState.moleculeHover] || vizState.hotspots[vizState.selectedHotspot];
  if (!hotspot) {
    els.hotspotReadout.textContent = "click a hotspot";
    return;
  }
  els.hotspotReadout.textContent = `${hotspot.label}: ${Math.round(hotspot.score)}% confidence`;
}

simulate();
requestAnimationFrame(function animate(tick) {
  drawFold(vizState.sequence, vizState.fold, tick);
  drawQuantumFlow(tick);
  drawMolecule(tick);
  requestAnimationFrame(animate);
});
window.addEventListener("load", () => {
  els.sequence.setSelectionRange(0, 0);
  els.sequence.blur();
});
