import React, { useState, useEffect, useRef } from 'react';

const ICPEtcherSimulator = () => {
  const [activeTab, setActiveTab] = useState('recipe');
  const [equipmentState, setEquipmentState] = useState({ power: false, doorLocked: false, vacuumReady: false, waferLoaded: false, processing: false, processComplete: false });
  const [targetMaterial, setTargetMaterial] = useState('Si');
  const [recipeSteps, setRecipeSteps] = useState([]);
  const [activeStepIndex, setActiveStepIndex] = useState(-1);
  const [stepElapsedTime, setStepElapsedTime] = useState(0);
  const [realTimeParams, setRealTimeParams] = useState({ pressure: 760000, sourcePower: 0, biasPower: 0, temperature: 25, cl2Flow: 0, hbrFlow: 0, cf4Flow: 0, chf3Flow: 0, o2Flow: 0, arFlow: 0, n2Flow: 0 });
  const [processProgress, setProcessProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [results, setResults] = useState(null);
  const [oesData, setOesData] = useState([]);
  const [uniformityMap, setUniformityMap] = useState([]);
  const [logs, setLogs] = useState([]);
  const [alarms, setAlarms] = useState([]);
  const [plasmaOn, setPlasmaOn] = useState(false);
  const [plasmaColor, setPlasmaColor] = useState('#8b5cf6');
  const [interlockStatus, setInterlockStatus] = useState({ checked: false, checking: false, passed: false, items: { power: false, vacuum: false, door: false, wafer: false, temp: false, pressure: false, gasLine: false, rf: false } });
  const [uniformityScale, setUniformityScale] = useState(1);
  const processTimerRef = useRef(null);
  const stateRef = useRef({ idx: 0, stepE: 0, totalE: 0 });
  const logRef = useRef(null);
  const SPEED = 2;

  const defaultRecipes = {
    Si: [{ name: 'Stabilize', time: 10, pressure: 50, sourcePower: 0, biasPower: 0, cl2: 0, hbr: 0, cf4: 0, chf3: 0, o2: 0, ar: 100, n2: 0 }, { name: 'Strike', time: 5, pressure: 50, sourcePower: 300, biasPower: 0, cl2: 30, hbr: 0, cf4: 0, chf3: 0, o2: 0, ar: 100, n2: 0 }, { name: 'Main Etch', time: 60, pressure: 20, sourcePower: 800, biasPower: 100, cl2: 50, hbr: 20, cf4: 0, chf3: 0, o2: 0, ar: 100, n2: 0 }, { name: 'Over Etch', time: 15, pressure: 30, sourcePower: 600, biasPower: 50, cl2: 30, hbr: 30, cf4: 0, chf3: 0, o2: 0, ar: 100, n2: 0 }, { name: 'Purge', time: 10, pressure: 100, sourcePower: 0, biasPower: 0, cl2: 0, hbr: 0, cf4: 0, chf3: 0, o2: 0, ar: 0, n2: 200 }],
    SiO2: [{ name: 'Stabilize', time: 10, pressure: 30, sourcePower: 0, biasPower: 0, cl2: 0, hbr: 0, cf4: 0, chf3: 0, o2: 0, ar: 100, n2: 0 }, { name: 'Strike', time: 5, pressure: 30, sourcePower: 400, biasPower: 0, cl2: 0, hbr: 0, cf4: 20, chf3: 30, o2: 0, ar: 50, n2: 0 }, { name: 'Main Etch', time: 90, pressure: 15, sourcePower: 1000, biasPower: 200, cl2: 0, hbr: 0, cf4: 30, chf3: 50, o2: 5, ar: 50, n2: 0 }, { name: 'Over Etch', time: 20, pressure: 20, sourcePower: 800, biasPower: 100, cl2: 0, hbr: 0, cf4: 20, chf3: 40, o2: 10, ar: 50, n2: 0 }, { name: 'Purge', time: 10, pressure: 100, sourcePower: 0, biasPower: 0, cl2: 0, hbr: 0, cf4: 0, chf3: 0, o2: 0, ar: 0, n2: 200 }],
    Si3N4: [{ name: 'Stabilize', time: 10, pressure: 20, sourcePower: 0, biasPower: 0, cl2: 0, hbr: 0, cf4: 0, chf3: 0, o2: 0, ar: 100, n2: 0 }, { name: 'Strike', time: 5, pressure: 20, sourcePower: 300, biasPower: 0, cl2: 0, hbr: 0, cf4: 0, chf3: 40, o2: 10, ar: 50, n2: 0 }, { name: 'Main Etch', time: 75, pressure: 10, sourcePower: 700, biasPower: 150, cl2: 0, hbr: 0, cf4: 10, chf3: 60, o2: 15, ar: 50, n2: 0 }, { name: 'Over Etch', time: 15, pressure: 15, sourcePower: 500, biasPower: 80, cl2: 0, hbr: 0, cf4: 5, chf3: 50, o2: 20, ar: 50, n2: 0 }, { name: 'Purge', time: 10, pressure: 100, sourcePower: 0, biasPower: 0, cl2: 0, hbr: 0, cf4: 0, chf3: 0, o2: 0, ar: 0, n2: 200 }],
    PR: [{ name: 'Stabilize', time: 5, pressure: 100, sourcePower: 0, biasPower: 0, cl2: 0, hbr: 0, cf4: 0, chf3: 0, o2: 0, ar: 50, n2: 0 }, { name: 'Strike', time: 3, pressure: 100, sourcePower: 200, biasPower: 0, cl2: 0, hbr: 0, cf4: 0, chf3: 0, o2: 100, ar: 20, n2: 0 }, { name: 'Ashing', time: 120, pressure: 200, sourcePower: 400, biasPower: 20, cl2: 0, hbr: 0, cf4: 0, chf3: 0, o2: 200, ar: 30, n2: 10 }, { name: 'Purge', time: 10, pressure: 100, sourcePower: 0, biasPower: 0, cl2: 0, hbr: 0, cf4: 0, chf3: 0, o2: 0, ar: 0, n2: 200 }]
  };

  const addLog = (msg, type = 'info') => setLogs(p => [...p.slice(-100), { timestamp: new Date().toLocaleTimeString(), message: msg, type }]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);
  const addAlarm = (msg, sev = 'warning') => setAlarms(p => [...p, { id: Date.now(), message: msg, severity: sev, time: new Date().toLocaleTimeString() }]);

  const togglePower = () => {
    if (equipmentState.processing) return;
    const np = !equipmentState.power;
    setEquipmentState(p => ({ ...p, power: np, vacuumReady: false, doorLocked: false }));
    setInterlockStatus(p => ({ ...p, checked: false, passed: false, items: { ...p.items, power: false, vacuum: false } }));
    if (np) {
      addLog('Equipment power ON', 'info');
      setRealTimeParams(p => ({ ...p, pressure: 760000 }));
      setTimeout(() => {
        setEquipmentState(p => ({ ...p, vacuumReady: true }));
        addLog('Vacuum system initialized - Ready for pump down', 'success');
        setRealTimeParams(p => ({ ...p, pressure: 50 }));
      }, 2000);
    } else {
      addLog('Equipment power OFF', 'info');
      setPlasmaOn(false);
      setRealTimeParams(p => ({ ...p, pressure: 760000, temperature: 25 }));
    }
  };

  const toggleWaferLoad = () => {
    if (equipmentState.processing || !equipmentState.power) return;
    const nl = !equipmentState.waferLoaded;
    setEquipmentState(p => ({ ...p, waferLoaded: nl, doorLocked: nl }));
    setInterlockStatus(p => ({ ...p, checked: false, passed: false }));
    addLog(nl ? 'Wafer loaded - Chamber door locked' : 'Wafer unloaded - Chamber door unlocked', 'info');
  };

  const loadDefaultRecipe = () => {
    setRecipeSteps([...defaultRecipes[targetMaterial]]);
    addLog(`Default recipe loaded for ${targetMaterial}`, 'info');
    setTotalTime(defaultRecipes[targetMaterial].reduce((s, st) => s + st.time, 0));
    setInterlockStatus(p => ({ ...p, checked: false, passed: false }));
  };

  const updateStep = (i, f, v) => setRecipeSteps(p => { const n = [...p]; n[i] = { ...n[i], [f]: Number(v) }; return n; });
  const deleteStep = (i) => { setRecipeSteps(p => p.filter((_, idx) => idx !== i)); setInterlockStatus(p => ({ ...p, checked: false, passed: false })); };
  const addNewStep = () => { setRecipeSteps(p => [...p, { name: `Step ${p.length + 1}`, time: 10, pressure: 50, sourcePower: 0, biasPower: 0, cl2: 0, hbr: 0, cf4: 0, chf3: 0, o2: 0, ar: 50, n2: 0 }]); setInterlockStatus(p => ({ ...p, checked: false, passed: false })); };
  const updateStepName = (i, name) => setRecipeSteps(p => { const n = [...p]; n[i] = { ...n[i], name }; return n; });

  const runInterlockCheck = async () => {
    if (interlockStatus.checking) return;
    setInterlockStatus(p => ({ ...p, checking: true, checked: false, passed: false, items: { power: false, vacuum: false, door: false, wafer: false, temp: false, pressure: false, gasLine: false, rf: false } }));
    addLog('========== INTERLOCK CHECK START ==========', 'info');

    const checks = [
      { key: 'power', name: 'Main Power Supply', condition: equipmentState.power, log: 'Checking main power supply...' },
      { key: 'vacuum', name: 'Vacuum System', condition: equipmentState.vacuumReady, log: 'Checking vacuum pump status...' },
      { key: 'door', name: 'Chamber Door Lock', condition: equipmentState.doorLocked, log: 'Checking chamber door interlock...' },
      { key: 'wafer', name: 'Wafer Presence', condition: equipmentState.waferLoaded, log: 'Checking wafer presence sensor...' },
      { key: 'temp', name: 'Substrate Temperature', condition: realTimeParams.temperature >= 20 && realTimeParams.temperature <= 80, log: `Checking substrate temperature (${realTimeParams.temperature.toFixed(1)}°C)...` },
      { key: 'pressure', name: 'Base Pressure', condition: realTimeParams.pressure < 100, log: `Checking base pressure (${realTimeParams.pressure.toFixed(1)} mTorr)...` },
      { key: 'gasLine', name: 'Gas Line Integrity', condition: true, log: 'Checking gas line integrity...' },
      { key: 'rf', name: 'RF Generator Ready', condition: equipmentState.power, log: 'Checking RF generator status...' },
    ];

    let allPassed = true;
    for (const check of checks) {
      addLog(check.log, 'info');
      await new Promise(r => setTimeout(r, 400 / SPEED));
      const passed = check.condition;
      setInterlockStatus(p => ({ ...p, items: { ...p.items, [check.key]: passed } }));
      if (passed) {
        addLog(`  ✓ ${check.name}: PASS`, 'success');
      } else {
        addLog(`  ✗ ${check.name}: FAIL`, 'error');
        allPassed = false;
      }
      await new Promise(r => setTimeout(r, 200 / SPEED));
    }

    await new Promise(r => setTimeout(r, 300 / SPEED));
    if (allPassed) {
      addLog('========== ALL INTERLOCKS PASSED ==========', 'success');
      addLog('System ready for process start', 'success');
    } else {
      addLog('========== INTERLOCK CHECK FAILED ==========', 'error');
      addLog('Resolve failed items before starting process', 'warning');
      addAlarm('Interlock check failed - Process blocked', 'error');
    }
    setInterlockStatus(p => ({ ...p, checking: false, checked: true, passed: allPassed }));
  };

  const calcPlasmaColor = (s) => { if (!s || s.sourcePower === 0) return '#8b5cf6'; const { cl2, hbr, cf4, chf3, o2 } = s, t = cl2 + hbr + cf4 + chf3 + o2 + 1; if (o2 / t > 0.5) return '#f97316'; if ((cf4 + chf3) / t > 0.4) return '#06b6d4'; if ((cl2 + hbr) / t > 0.3) return '#22c55e'; return '#8b5cf6'; };

  const calcOESSpectrum = (s) => {
    if (!s || s.sourcePower === 0) return [];
    const spectrum = new Array(400).fill(0);
    const addPeak = (center, intensity, width) => { for (let i = 0; i < 400; i++) { const wl = 400 + i, dist = Math.abs(wl - center); if (dist < width * 3) spectrum[i] += intensity * Math.exp(-0.5 * Math.pow(dist / width, 2)); } };
    if (s.cl2 > 0) { addPeak(837, s.cl2 * 0.8, 8); addPeak(725, s.cl2 * 0.3, 6); }
    if (s.hbr > 0) { addPeak(827, s.hbr * 0.7, 7); addPeak(750, s.hbr * 0.25, 5); }
    if (s.cf4 > 0) { addPeak(703, s.cf4 * 0.9, 10); addPeak(685, s.cf4 * 0.4, 6); }
    if (s.chf3 > 0) { addPeak(685, s.chf3 * 0.85, 8); addPeak(516, s.chf3 * 0.3, 5); }
    if (s.o2 > 0) { addPeak(777, s.o2 * 0.6, 6); addPeak(844, s.o2 * 0.3, 5); }
    if (s.ar > 0) { addPeak(750, s.ar * 0.4, 5); addPeak(811, s.ar * 0.35, 4); addPeak(763, s.ar * 0.25, 4); }
    if (s.n2 > 0) { addPeak(580, s.n2 * 0.2, 15); addPeak(654, s.n2 * 0.15, 10); }
    for (let i = 0; i < 400; i++) spectrum[i] += Math.random() * 2;
    return spectrum;
  };

  const wavelengthToColor = (wl) => { let r = 0, g = 0, b = 0; if (wl >= 380 && wl < 440) { r = -(wl - 440) / 60; b = 1; } else if (wl >= 440 && wl < 490) { g = (wl - 440) / 50; b = 1; } else if (wl >= 490 && wl < 510) { g = 1; b = -(wl - 510) / 20; } else if (wl >= 510 && wl < 580) { r = (wl - 510) / 70; g = 1; } else if (wl >= 580 && wl < 645) { r = 1; g = -(wl - 645) / 65; } else if (wl >= 645 && wl <= 800) { r = 1; } return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`; };
  const formatTime = (sec) => `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`;

  const finishProcess = () => { setEquipmentState(p => ({ ...p, processing: false, processComplete: true })); setPlasmaOn(false); setActiveStepIndex(-1); addLog('Process completed successfully', 'success'); calcResults(); };

  const startProcess = () => {
    if (!interlockStatus.passed) { addAlarm('Interlock check required before process start', 'error'); return; }
    if (!equipmentState.power || !equipmentState.waferLoaded || recipeSteps.length === 0) { addAlarm('Cannot start: Check equipment state and recipe', 'error'); return; }
    setEquipmentState(p => ({ ...p, processing: true, processComplete: false })); setActiveStepIndex(0); setElapsedTime(0); setStepElapsedTime(0); setProcessProgress(0); setResults(null); setOesData([]);
    addLog('========== PROCESS START ==========', 'success');
    addLog(`Recipe: ${targetMaterial} Etch (${recipeSteps.length} steps)`, 'info');
    setTotalTime(recipeSteps.reduce((s, st) => s + st.time, 0)); stateRef.current = { idx: 0, stepE: 0, totalE: 0 };
  };

  useEffect(() => {
    if (!equipmentState.processing) { if (processTimerRef.current) clearInterval(processTimerRef.current); return; }
    processTimerRef.current = setInterval(() => {
      const st = stateRef.current, total = recipeSteps.reduce((s, r) => s + r.time, 0);
      if (st.idx >= recipeSteps.length) { clearInterval(processTimerRef.current); finishProcess(); return; }
      const cs = recipeSteps[st.idx]; st.stepE++; st.totalE++;
      setRealTimeParams({ pressure: cs.pressure * (0.95 + Math.random() * 0.1), sourcePower: cs.sourcePower * (0.98 + Math.random() * 0.04), biasPower: cs.biasPower * (0.98 + Math.random() * 0.04), temperature: 25 + (cs.sourcePower / 50) * (0.9 + Math.random() * 0.2), cl2Flow: cs.cl2, hbrFlow: cs.hbr, cf4Flow: cs.cf4, chf3Flow: cs.chf3, o2Flow: cs.o2, arFlow: cs.ar, n2Flow: cs.n2 });
      setPlasmaOn(cs.sourcePower > 0); setPlasmaColor(calcPlasmaColor(cs));
      if (cs.sourcePower > 0) setOesData(calcOESSpectrum(cs)); else setOesData([]);
      setElapsedTime(st.totalE); setStepElapsedTime(st.stepE); setProcessProgress((st.totalE / total) * 100); setActiveStepIndex(st.idx);
      if (st.stepE >= cs.time) { addLog(`Step "${cs.name}" completed`, 'info'); st.idx++; st.stepE = 0; setStepElapsedTime(0); if (st.idx < recipeSteps.length) addLog(`Starting step: ${recipeSteps[st.idx].name}`, 'info'); }
    }, 1000 / SPEED);
    return () => { if (processTimerRef.current) clearInterval(processTimerRef.current); };
  }, [equipmentState.processing, recipeSteps]);

  const calcResults = () => {
    const ms = recipeSteps.find(s => s.name.includes('Main') || s.name.includes('Ashing')); if (!ms) return;

    const totalGasFlow = ms.cl2 + ms.hbr + ms.cf4 + ms.chf3 + ms.o2 + ms.ar + (ms.n2 || 0) + 1;
    const ionFlux = Math.sqrt(ms.sourcePower / 100) * Math.sqrt(100 / (ms.pressure + 1));
    const ionEnergy = 20 + (ms.biasPower / (ms.pressure + 1)) * 5;
    const dissociationRate = Math.min(0.9, (ms.sourcePower / 500) * (50 / (ms.pressure + 10)));

    let etchRate = 0, selectivity = 1, ionContrib = 0, radContrib = 0;
    let analysisText = '';

    if (targetMaterial === 'Si') {
      const clRadical = ms.cl2 * dissociationRate * 2;
      const brRadical = ms.hbr * dissociationRate;
      radContrib = (clRadical * 1.5 + brRadical * 1.2) * 0.8;
      ionContrib = ionFlux * Math.sqrt(ionEnergy) * 0.3;
      etchRate = radContrib + ionContrib + (radContrib * ionContrib * 0.01);
      const prEtchRate = ms.o2 * 0.5 + ionEnergy * 0.1 + clRadical * 0.05;
      selectivity = etchRate / (prEtchRate + 1);
      selectivity *= (1 + (ms.hbr / (ms.cl2 + ms.hbr + 1)) * 2);
      analysisText = `Cl* 라디칼: ${clRadical.toFixed(1)}, Br* 라디칼: ${brRadical.toFixed(1)}, 이온에너지: ${ionEnergy.toFixed(0)}eV`;
    }
    else if (targetMaterial === 'SiO2') {
      const fRadical = (ms.cf4 * 4 + ms.chf3 * 3) * dissociationRate * 0.3;
      const cfxPolymer = ms.chf3 * dissociationRate * 0.5;
      const ionEnhancement = Math.max(0, (ionEnergy - 30) / 20);
      radContrib = fRadical * 0.3;
      ionContrib = ionFlux * ionEnhancement * fRadical * 0.05;
      etchRate = radContrib + ionContrib;
      etchRate *= (1 + ms.o2 * 0.02);
      const siEtchRate = fRadical * 0.5 - cfxPolymer * 0.3;
      selectivity = etchRate / (Math.max(1, siEtchRate));
      selectivity *= (1 + cfxPolymer * 0.1);
      analysisText = `F* 라디칼: ${fRadical.toFixed(1)}, CFx polymer: ${cfxPolymer.toFixed(1)}, 이온강화: ${ionEnhancement.toFixed(2)}`;
    }
    else if (targetMaterial === 'Si3N4') {
      const fRadical = (ms.cf4 * 4 + ms.chf3 * 3) * dissociationRate * 0.3;
      const hRadical = ms.chf3 * dissociationRate * 0.5;
      radContrib = fRadical * 0.6 + hRadical * fRadical * 0.02;
      ionContrib = ionFlux * Math.sqrt(ionEnergy) * 0.2;
      etchRate = radContrib + ionContrib;
      etchRate *= (1 + ms.o2 * 0.03);
      const sio2EtchRate = fRadical * 0.3 * (1 + ms.o2 * 0.05);
      selectivity = etchRate / (sio2EtchRate + 1);
      analysisText = `F* 라디칼: ${fRadical.toFixed(1)}, H* 라디칼: ${hRadical.toFixed(1)}, 해리율: ${(dissociationRate*100).toFixed(0)}%`;
    }
    else if (targetMaterial === 'PR') {
      const oRadical = ms.o2 * dissociationRate * 2;
      radContrib = oRadical * 1.5;
      ionContrib = ionFlux * Math.sqrt(ionEnergy) * 0.1;
      etchRate = radContrib + ionContrib;
      etchRate *= (1 + ms.pressure / 200);
      selectivity = 100;
      analysisText = `O* 라디칼: ${oRadical.toFixed(1)}, 압력효과: ${(1 + ms.pressure/200).toFixed(2)}x`;
    }

    etchRate = etchRate * 3;
    const uni = 95 - Math.abs(ms.pressure - 30) * 0.1 - Math.abs(ms.sourcePower - 600) * 0.005;
    const pa = 85 + (ms.biasPower / 200) * 5 - (ms.pressure / 100) * 3;
    const ed = etchRate * (ms.time / 60);

    setResults({
      etchRate: Math.max(0, etchRate).toFixed(1),
      selectivity: Math.max(1, Math.min(100, selectivity)).toFixed(1),
      uniformity: Math.min(99, Math.max(80, uni)).toFixed(1),
      profileAngle: Math.min(90, Math.max(75, pa)).toFixed(1),
      etchDepth: ed.toFixed(0),
      totalTime: recipeSteps.reduce((s, r) => s + r.time, 0),
      ionFlux: ionFlux.toFixed(2),
      ionEnergy: ionEnergy.toFixed(1),
      dissociationRate: (dissociationRate * 100).toFixed(0),
      ionContrib: (ionContrib * 3).toFixed(1),
      radContrib: (radContrib * 3).toFixed(1),
      analysisText
    });
    const map = []; for (let i = 0; i < 49; i++) { const r = Math.floor(i / 7), c = i % 7, d = Math.sqrt(Math.pow(r - 3, 2) + Math.pow(c - 3, 2)), v = uni - d * (Math.random() * 0.5 + 0.3); map.push(Math.min(100, Math.max(85, v))); } setUniformityMap(map);
  };

  const abortProcess = () => { if (processTimerRef.current) clearInterval(processTimerRef.current); setEquipmentState(p => ({ ...p, processing: false })); setPlasmaOn(false); setActiveStepIndex(-1); addLog('Process aborted by user', 'warning'); addAlarm('Process aborted', 'warning'); setInterlockStatus(p => ({ ...p, checked: false, passed: false })); };

  useEffect(() => { loadDefaultRecipe(); }, [targetMaterial]);
  const cs = activeStepIndex >= 0 ? recipeSteps[activeStepIndex] : null;

  const OESSpectrum = ({ data, currentStep }) => {
    const maxVal = Math.max(...data, 1);
    const peakLabels = [];
    if (currentStep) {
      if (currentStep.cl2 > 0) peakLabels.push({ wl: 837, label: 'Cl*', color: '#22c55e' }, { wl: 725, label: 'Cl₂*', color: '#16a34a' });
      if (currentStep.hbr > 0) peakLabels.push({ wl: 827, label: 'Br*', color: '#eab308' });
      if (currentStep.cf4 > 0) peakLabels.push({ wl: 703, label: 'F*', color: '#06b6d4' });
      if (currentStep.chf3 > 0) peakLabels.push({ wl: 685, label: 'CF*', color: '#0ea5e9' }, { wl: 516, label: 'C₂*', color: '#14b8a6' });
      if (currentStep.o2 > 0) peakLabels.push({ wl: 777, label: 'O*', color: '#f97316' }, { wl: 844, label: 'O*', color: '#ea580c' });
      if (currentStep.ar > 0) peakLabels.push({ wl: 750, label: 'Ar*', color: '#a855f7' }, { wl: 811, label: 'Ar*', color: '#9333ea' });
      if (currentStep.n2 > 0) peakLabels.push({ wl: 580, label: 'N₂*', color: '#84cc16' }, { wl: 654, label: 'N₂⁺', color: '#65a30d' });
    }
    return (
      <div className="flex gap-3">
        <div className="relative flex-1 h-44 bg-black rounded border border-slate-600 overflow-hidden">
          <div className="absolute inset-0 flex items-end">{data.map((val, i) => (<div key={i} className="flex-1 flex flex-col justify-end" style={{ height: '100%' }}><div style={{ height: `${(val / maxVal) * 100}%`, backgroundColor: wavelengthToColor(400 + i), opacity: 0.9 }}/></div>))}</div>
          {data.length > 0 && peakLabels.map((p, i) => {
            const x = ((p.wl - 400) / 400) * 100;
            const idx = p.wl - 400;
            const intensity = data[idx] || 0;
            const y = 100 - (intensity / maxVal) * 100;
            return (<div key={i} className="absolute text-xs font-bold" style={{ left: `${x}%`, top: `${Math.max(5, y - 12)}%`, transform: 'translateX(-50%)', color: p.color, textShadow: '0 0 3px black, 0 0 3px black' }}>{p.label}</div>);
          })}
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/90 to-transparent flex items-end justify-between px-2 text-xs text-slate-400"><span>400nm</span><span>500</span><span>600</span><span>700</span><span>800nm</span></div>
          <div className="absolute top-1 left-2 text-xs text-green-400 font-mono">OES Spectrum</div>
          <div className="absolute top-1 right-2 text-xs text-slate-400">Max: {maxVal.toFixed(0)}</div>
          {data.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-slate-500">No plasma - Start process</div>}
        </div>
        <div className="w-32 bg-slate-800 rounded border border-slate-600 p-2">
          <div className="text-xs text-slate-400 font-bold mb-2 border-b border-slate-600 pb-1">Peak Legend</div>
          <div className="space-y-1 text-xs max-h-36 overflow-auto">
            {peakLabels.length > 0 ? peakLabels.map((p, i) => (
              <div key={i} className="flex items-center justify-between">
                <span style={{ color: p.color }} className="font-bold">{p.label}</span>
                <span className="text-slate-500">{p.wl}nm</span>
              </div>
            )) : <div className="text-slate-600 text-center py-2">No peaks</div>}
          </div>
        </div>
      </div>
    );
  };

  const InterlockItem = ({ name, passed, checked }) => (
    <div className={`flex items-center justify-between px-2 py-1 rounded text-xs ${checked ? (passed ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700') : 'bg-slate-700/50 border border-slate-600'}`}>
      <span className="text-slate-300">{name}</span>
      <span className={checked ? (passed ? 'text-green-400' : 'text-red-400') : 'text-slate-500'}>{checked ? (passed ? '✓ PASS' : '✗ FAIL') : '○'}</span>
    </div>
  );

  const getMissionStatus = () => {
    if (!equipmentState.power) return 'power';
    if (!equipmentState.waferLoaded) return 'wafer';
    if (!interlockStatus.checked) return 'interlock_ready';
    if (interlockStatus.checking) return 'interlock_checking';
    if (!interlockStatus.passed) return 'interlock_failed';
    if (!equipmentState.processing && !equipmentState.processComplete) return 'ready';
    if (equipmentState.processing) return 'processing';
    if (equipmentState.processComplete) return 'complete';
    return 'unknown';
  };

  return (
    <div className="w-full min-h-screen bg-slate-900 text-white flex flex-col">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-2 flex items-center justify-between border-b border-slate-600">
        <div className="flex items-center gap-3">
          <div className="text-xl font-bold text-cyan-400">⚡ ICP Etcher</div>
          <div className="text-sm text-slate-400">Virtual Lab v2.0</div>
          <div className="text-xs bg-yellow-600 px-2 py-0.5 rounded">×{SPEED} Speed</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs"><div className={`w-2 h-2 rounded-full ${equipmentState.power ? 'bg-green-500' : 'bg-red-500'}`}/><span>PWR</span></div>
          <div className="flex items-center gap-2 text-xs"><div className={`w-2 h-2 rounded-full ${equipmentState.vacuumReady ? 'bg-green-500' : 'bg-yellow-500'}`}/><span>VAC</span></div>
          <div className="flex items-center gap-2 text-xs"><div className={`w-2 h-2 rounded-full ${equipmentState.doorLocked ? 'bg-green-500' : 'bg-gray-500'}`}/><span>DOOR</span></div>
          <div className="flex items-center gap-2 text-xs"><div className={`w-2 h-2 rounded-full ${interlockStatus.passed ? 'bg-green-500' : interlockStatus.checked ? 'bg-red-500' : 'bg-gray-500'}`}/><span>INTLK</span></div>
          <div className="flex items-center gap-2 text-xs"><div className={`w-2 h-2 rounded-full ${plasmaOn ? 'bg-purple-500 animate-pulse' : 'bg-gray-500'}`}/><span>RF</span></div>
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 flex">
        {/* 좌측: 챔버 */}
        <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col">
          <div className="flex-1 p-2">
            <svg viewBox="0 0 280 320" className="w-full h-full">
              <rect x="0" y="0" width="280" height="320" fill="#1e293b" rx="8"/>
              <g><circle cx="45" cy="35" r="18" fill="none" stroke={plasmaOn ? "#22c55e" : "#4b5563"} strokeWidth="2"/><path d="M33,35 Q39,26 45,35 Q51,44 57,35" fill="none" stroke={plasmaOn ? "#22c55e" : "#4b5563"} strokeWidth="2"/><text x="45" y="12" textAnchor="middle" fill="#22c55e" fontSize="9" fontWeight="bold">Source RF</text><text x="45" y="65" textAnchor="middle" fill={plasmaOn ? "#4ade80" : "#6b7280"} fontSize="8" fontWeight="bold">{realTimeParams.sourcePower.toFixed(0)}W</text></g>
              <line x1="45" y1="53" x2="45" y2="78" stroke={plasmaOn ? "#22c55e" : "#4b5563"} strokeWidth="2"/><line x1="45" y1="78" x2="95" y2="78" stroke={plasmaOn ? "#22c55e" : "#4b5563"} strokeWidth="2"/><line x1="95" y1="78" x2="95" y2="88" stroke={plasmaOn ? "#22c55e" : "#4b5563"} strokeWidth="2"/>
              <text x="165" y="82" textAnchor="middle" fill="#f59e0b" fontSize="8" fontWeight="bold">Inductive Coils</text>
              <g><circle cx="95" cy="95" r="5" fill={plasmaOn ? "#f59e0b" : "#6b7280"} stroke="#fbbf24" strokeWidth="1"/><circle cx="115" cy="95" r="5" fill={plasmaOn ? "#f59e0b" : "#6b7280"} stroke="#fbbf24" strokeWidth="1"/><circle cx="140" cy="95" r="6" fill={plasmaOn ? "#fbbf24" : "#9ca3af"} stroke="#fbbf24" strokeWidth="2"/><circle cx="165" cy="95" r="5" fill={plasmaOn ? "#f59e0b" : "#6b7280"} stroke="#fbbf24" strokeWidth="1"/><circle cx="185" cy="95" r="5" fill={plasmaOn ? "#f59e0b" : "#6b7280"} stroke="#fbbf24" strokeWidth="1"/></g>
              {plasmaOn && <g><circle cx="140" cy="95" r="8" fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.5"><animate attributeName="r" values="8;12;8" dur="1s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.5;0.2;0.5" dur="1s" repeatCount="indefinite"/></circle></g>}
              <rect x="75" y="105" width="130" height="12" fill="#93c5fd" stroke="#3b82f6" strokeWidth="2" rx="3"/><text x="230" y="108" fill="#60a5fa" fontSize="7" fontWeight="bold">Quartz</text><text x="230" y="118" fill="#60a5fa" fontSize="7" fontWeight="bold">Window</text>
              <g><rect x="55" y="125" width="18" height="8" fill="#3b82f6" rx="2"/><line x1="55" y1="129" x2="75" y2="129" stroke="#3b82f6" strokeWidth="2"/><text x="35" y="132" textAnchor="middle" fill="#60a5fa" fontSize="6">Gas In</text></g>
              <rect x="75" y="117" width="130" height="130" fill="#334155" stroke="#64748b" strokeWidth="3"/><text x="25" y="180" fill="#94a3b8" fontSize="8" fontWeight="bold">Chamber</text><text x="25" y="192" fill="#94a3b8" fontSize="8" fontWeight="bold">Body</text>
              {plasmaOn && <g><ellipse cx="140" cy="160" rx="50" ry="22" fill={plasmaColor} opacity="0.5"><animate attributeName="opacity" values="0.4;0.6;0.4" dur="0.5s" repeatCount="indefinite"/></ellipse><ellipse cx="140" cy="160" rx="35" ry="15" fill={plasmaColor} opacity="0.7"><animate attributeName="opacity" values="0.6;0.8;0.6" dur="0.3s" repeatCount="indefinite"/></ellipse><text x="140" y="164" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">Plasma</text></g>}
              {equipmentState.waferLoaded && <g><rect x="105" y="205" width="70" height="6" fill="#6366f1" stroke="#818cf8" strokeWidth="1" rx="1"/><text x="140" y="211" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">{targetMaterial}</text></g>}
              <text x="230" y="210" fill="#818cf8" fontSize="7" fontWeight="bold">Wafer</text>
              <rect x="95" y="215" width="90" height="18" fill="#475569" stroke="#64748b" strokeWidth="2"/><text x="140" y="227" textAnchor="middle" fill="#94a3b8" fontSize="7">E-chuck</text><text x="25" y="227" fill="#94a3b8" fontSize="8" fontWeight="bold">ESC</text>
              <line x1="140" y1="233" x2="140" y2="255" stroke="#10b981" strokeWidth="2" strokeDasharray="3,2"/><text x="140" y="268" textAnchor="middle" fill="#10b981" fontSize="7" fontWeight="bold">He Backside</text>
              <g><circle cx="235" cy="280" r="18" fill="none" stroke={realTimeParams.biasPower > 0 ? "#ef4444" : "#4b5563"} strokeWidth="2"/><path d="M223,280 Q229,271 235,280 Q241,289 247,280" fill="none" stroke={realTimeParams.biasPower > 0 ? "#ef4444" : "#4b5563"} strokeWidth="2"/><text x="235" y="308" textAnchor="middle" fill="#ef4444" fontSize="9" fontWeight="bold">Bias RF</text><text x="235" y="260" textAnchor="middle" fill={realTimeParams.biasPower > 0 ? "#f87171" : "#6b7280"} fontSize="8" fontWeight="bold">{realTimeParams.biasPower.toFixed(0)}W</text></g>
              <line x1="217" y1="280" x2="185" y2="280" stroke={realTimeParams.biasPower > 0 ? "#ef4444" : "#4b5563"} strokeWidth="2"/><line x1="185" y1="280" x2="185" y2="233" stroke={realTimeParams.biasPower > 0 ? "#ef4444" : "#4b5563"} strokeWidth="2"/>
              <rect x="125" y="247" width="30" height="15" fill="#1e293b" stroke="#64748b" strokeWidth="1"/><path d="M135 262 L140 275 L145 262" fill="none" stroke="#64748b" strokeWidth="1"/><text x="140" y="290" textAnchor="middle" fill="#64748b" fontSize="7">To TMP</text>
              <g><circle cx="245" cy="150" r="20" fill="#1e293b" stroke="#64748b" strokeWidth="2"/><text x="245" y="145" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="bold">{realTimeParams.pressure < 1000 ? realTimeParams.pressure.toFixed(0) : '---'}</text><text x="245" y="158" textAnchor="middle" fill="#64748b" fontSize="7">mTorr</text></g>
              <g><rect x="220" y="180" width="50" height="25" rx="4" fill="#1e293b" stroke="#64748b" strokeWidth="1"/><text x="245" y="192" textAnchor="middle" fill="#64748b" fontSize="6">TEMP</text><text x="245" y="202" textAnchor="middle" fill="#f97316" fontSize="9" fontWeight="bold">{realTimeParams.temperature.toFixed(0)}°C</text></g>
            </svg>
          </div>

          {/* Mission Panel */}
          <div className="mx-2 mb-2 bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg border border-cyan-900 overflow-hidden">
            <div className="bg-cyan-900/50 px-3 py-1 flex items-center justify-between border-b border-cyan-800"><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${equipmentState.processing ? 'bg-green-400 animate-pulse' : 'bg-cyan-400'}`}/><span className="text-xs font-bold text-cyan-300 tracking-wider">MISSION STATUS</span></div><span className="text-xs text-cyan-500 font-mono">{new Date().toLocaleTimeString()}</span></div>
            <div className="p-3 min-h-[80px]">
              {getMissionStatus() === 'power' && (<div className="text-center"><div className="text-yellow-500 text-lg mb-1">⚠ SYSTEM OFFLINE</div><div className="text-slate-400 text-xs mb-2">장비가 꺼져 있습니다</div><div className="mt-2 pt-2 border-t border-slate-700/50"><div className="text-xs text-yellow-400 flex items-center gap-1 justify-center">💡 <span className="font-semibold">NEXT:</span></div><div className="text-xs text-slate-300 mt-1 text-center">아래 <span className="text-red-400 font-bold">○ POWER OFF</span> 버튼을 눌러 장비 전원을 켜세요!</div></div></div>)}
              {getMissionStatus() === 'wafer' && (<div className="space-y-2"><div className="flex items-center gap-2"><span className="text-green-400">✓</span><span className="text-slate-300 text-sm">시스템 온라인</span></div><div className="flex items-center gap-2"><span className="text-yellow-400 animate-pulse">→</span><span className="text-yellow-300 text-sm">웨이퍼 로딩 대기 중...</span></div><div className="mt-2 pt-2 border-t border-slate-700/50"><div className="text-xs text-yellow-400 flex items-center gap-1">💡 <span className="font-semibold">NEXT:</span></div><div className="text-xs text-slate-300 mt-1">아래 <span className="text-blue-400 font-bold">○ LOAD WAFER</span> 버튼을 눌러 웨이퍼를 챔버에 로딩하세요!</div></div></div>)}
              {getMissionStatus() === 'interlock_ready' && (<div className="space-y-2"><div className="flex items-center gap-2"><span className="text-green-400">✓</span><span className="text-slate-300 text-sm">웨이퍼 로딩 완료</span></div><div className="flex items-center gap-2"><span className="text-yellow-400 animate-pulse">→</span><span className="text-yellow-300 text-sm">인터락 체크 필요</span></div><div className="mt-2 pt-2 border-t border-slate-700/50"><div className="text-xs text-yellow-400 flex items-center gap-1">💡 <span className="font-semibold">NEXT:</span></div><div className="text-xs text-slate-300 mt-1">우측 <span className="text-cyan-400 font-bold">📋 Recipe</span> 탭에서 <span className="text-orange-400 font-bold">🔍 INTERLOCK CHECK</span> 버튼을 눌러 안전 점검을 수행하세요!</div></div></div>)}
              {getMissionStatus() === 'interlock_checking' && (<div className="space-y-2"><div className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"/><span className="text-yellow-400 text-sm font-bold">인터락 체크 중...</span></div><div className="text-xs text-slate-400 mt-2">시스템 안전 상태를 확인하고 있습니다. 하단 로그를 확인하세요!</div></div>)}
              {getMissionStatus() === 'interlock_failed' && (<div className="space-y-2"><div className="flex items-center gap-2"><span className="text-red-400">✗</span><span className="text-red-300 text-sm font-bold">인터락 체크 실패</span></div><div className="text-xs text-slate-400 mt-1">일부 안전 조건이 충족되지 않았습니다.</div><div className="mt-2 pt-2 border-t border-slate-700/50"><div className="text-xs text-yellow-400 flex items-center gap-1">💡 <span className="font-semibold">FIX:</span></div><div className="text-xs text-slate-300 mt-1">실패한 항목을 확인하고 조건을 충족한 후 다시 <span className="text-orange-400 font-bold">🔍 INTERLOCK CHECK</span>를 수행하세요.</div></div></div>)}
              {getMissionStatus() === 'ready' && (<div className="space-y-2"><div className="flex items-center gap-2"><span className="text-green-400">✓</span><span className="text-green-300 text-sm font-bold">모든 인터락 통과!</span></div><div className="bg-slate-700/50 rounded p-2 mt-2"><div className="text-xs text-cyan-400 mb-1">📋 LOADED RECIPE</div><div className="text-sm font-bold text-white">{targetMaterial} Etch Process</div><div className="text-xs text-slate-400 mt-1">{recipeSteps.length} Steps • Total {formatTime(totalTime)}</div></div><div className="mt-2 pt-2 border-t border-slate-700/50"><div className="text-xs text-yellow-400 flex items-center gap-1">💡 <span className="font-semibold">NEXT:</span></div><div className="text-xs text-slate-300 mt-1"><span className="text-green-400 font-bold">▶ START PROCESS</span> 버튼을 눌러 공정을 시작하세요!</div></div></div>)}
              {getMissionStatus() === 'processing' && (<div className="space-y-2"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"/><span className="text-green-400 text-xs font-bold tracking-wider">PROCESSING</span></div><span className="text-cyan-400 font-mono text-lg font-bold">{formatTime(elapsedTime)}</span></div><div className="bg-gradient-to-r from-cyan-900/50 to-transparent rounded p-2 border-l-2 border-cyan-400"><div className="text-xs text-cyan-500">CURRENT STEP</div><div className="text-xl font-bold text-white flex items-center gap-2"><span className="text-cyan-400">[{activeStepIndex + 1}/{recipeSteps.length}]</span>{cs?.name}</div><div className="flex items-center gap-2 mt-1"><div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-400 to-green-400 transition-all duration-300" style={{ width: `${cs ? (stepElapsedTime / cs.time) * 100 : 0}%` }}/></div><span className="text-xs text-slate-400 font-mono w-16 text-right">{stepElapsedTime}s / {cs?.time}s</span></div></div>{cs && cs.sourcePower > 0 && (<div className="flex flex-wrap gap-1 mt-1">{cs.cl2 > 0 && <span className="text-xs bg-green-600/50 text-green-300 px-1.5 py-0.5 rounded">Cl₂</span>}{cs.hbr > 0 && <span className="text-xs bg-yellow-600/50 text-yellow-300 px-1.5 py-0.5 rounded">HBr</span>}{cs.cf4 > 0 && <span className="text-xs bg-cyan-600/50 text-cyan-300 px-1.5 py-0.5 rounded">CF₄</span>}{cs.chf3 > 0 && <span className="text-xs bg-blue-600/50 text-blue-300 px-1.5 py-0.5 rounded">CHF₃</span>}{cs.o2 > 0 && <span className="text-xs bg-orange-600/50 text-orange-300 px-1.5 py-0.5 rounded">O₂</span>}{cs.ar > 0 && <span className="text-xs bg-purple-600/50 text-purple-300 px-1.5 py-0.5 rounded">Ar</span>}{plasmaOn && <span className="text-xs bg-pink-600/50 text-pink-300 px-1.5 py-0.5 rounded animate-pulse">⚡RF ON</span>}</div>)}<div className="mt-2 pt-2 border-t border-slate-700/50"><div className="text-xs text-yellow-400 flex items-center gap-1 animate-pulse">💡 <span className="font-semibold">TIP:</span></div><div className="text-xs text-slate-300 mt-1">{cs?.name === 'Stabilize' ? '가스가 안정화되는 중입니다. 챔버 내 압력 변화를 확인하세요!' : cs?.name === 'Strike' ? '플라즈마가 점화됩니다! 챔버의 플라즈마 색상을 관찰하세요.' : cs?.name === 'Main Etch' || cs?.name === 'Ashing' ? '📊 Monitor 탭을 눌러 OES 스펙트럼을 확인하세요!' : cs?.name === 'Over Etch' ? 'Over etch로 잔여물을 제거 중. RF 파워 감소를 확인하세요.' : cs?.name === 'Purge' ? '퍼지 중입니다. N₂로 챔버를 정화합니다.' : '공정이 진행 중입니다.'}</div></div></div>)}
              {getMissionStatus() === 'complete' && (<div className="text-center space-y-2"><div className="text-3xl">🎉</div><div className="text-green-400 font-bold text-lg">MISSION COMPLETE</div><div className="text-slate-300 text-sm">{targetMaterial} 식각 공정 완료!</div><div className="mt-2 pt-2 border-t border-slate-700/50"><div className="text-xs text-yellow-400 flex items-center gap-1 justify-center">💡 <span className="font-semibold">CHECK:</span></div><div className="text-xs text-slate-300 mt-1">우측 <span className="text-cyan-400 font-bold">📈 Results</span> 탭에서 공정 결과를 확인하세요!</div></div></div>)}
            </div>
          </div>

          {/* Controls */}
          <div className="p-3 border-t border-slate-700 space-y-2">
            <button onClick={togglePower} disabled={equipmentState.processing} className={`w-full py-2 rounded font-bold text-sm transition-all ${equipmentState.power ? 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-900/50' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50`}>{equipmentState.power ? '⚡ POWER ON' : '○ POWER OFF'}</button>
            <button onClick={toggleWaferLoad} disabled={!equipmentState.power || equipmentState.processing} className={`w-full py-2 rounded font-bold text-sm transition-all ${equipmentState.waferLoaded ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-900/50' : 'bg-slate-600 hover:bg-slate-500'} disabled:opacity-50`}>{equipmentState.waferLoaded ? '📀 WAFER LOADED' : '○ LOAD WAFER'}</button>
          </div>
        </div>

        {/* 우측: 탭 영역 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex bg-slate-800 border-b border-slate-700">{['recipe', 'monitor', 'results'].map(tab => (<button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium ${activeTab === tab ? 'bg-slate-700 text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-white'}`}>{tab === 'recipe' && '📋 Recipe'}{tab === 'monitor' && '📊 Monitor'}{tab === 'results' && '📈 Results'}</button>))}</div>
          <div className="flex-1 overflow-auto p-3">
            {activeTab === 'recipe' && (<div className="space-y-3">
              <div className="flex items-center gap-3"><span className="text-sm text-slate-400">Target:</span><div className="flex gap-2">{['Si', 'SiO2', 'Si3N4', 'PR'].map(mat => (<button key={mat} onClick={() => setTargetMaterial(mat)} disabled={equipmentState.processing} className={`px-3 py-1 rounded text-sm font-medium ${targetMaterial === mat ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'} disabled:opacity-50`}>{mat}</button>))}</div></div>
              <div className="bg-slate-800 rounded-lg overflow-hidden"><table className="w-full text-xs"><thead className="bg-slate-700"><tr><th className="px-2 py-1 text-left">Step</th><th className="px-2 py-1">Time</th><th className="px-2 py-1">Press</th><th className="px-2 py-1">Src</th><th className="px-2 py-1">Bias</th><th className="px-2 py-1">Cl₂</th><th className="px-2 py-1">HBr</th><th className="px-2 py-1">CF₄</th><th className="px-2 py-1">CHF₃</th><th className="px-2 py-1">O₂</th><th className="px-2 py-1">Ar</th><th className="px-2 py-1">Del</th></tr></thead><tbody>{recipeSteps.map((step, idx) => (<tr key={idx} className={`border-t border-slate-700 ${activeStepIndex === idx ? 'bg-cyan-900/40 ring-1 ring-cyan-500' : ''}`}><td className="px-2 py-1 font-medium flex items-center gap-1">{activeStepIndex === idx && <span className="text-cyan-400 animate-pulse">▶</span>}<input type="text" value={step.name} onChange={e => updateStepName(idx, e.target.value)} disabled={equipmentState.processing} className="w-20 bg-slate-700 rounded px-1 py-0.5 text-xs"/></td><td className="px-1 py-1"><input type="number" value={step.time} onChange={e => updateStep(idx, 'time', e.target.value)} disabled={equipmentState.processing} className="w-12 bg-slate-700 rounded px-1 py-0.5 text-center"/></td><td className="px-1 py-1"><input type="number" value={step.pressure} onChange={e => updateStep(idx, 'pressure', e.target.value)} disabled={equipmentState.processing} className="w-12 bg-slate-700 rounded px-1 py-0.5 text-center"/></td><td className="px-1 py-1"><input type="number" value={step.sourcePower} onChange={e => updateStep(idx, 'sourcePower', e.target.value)} disabled={equipmentState.processing} className="w-12 bg-slate-700 rounded px-1 py-0.5 text-center"/></td><td className="px-1 py-1"><input type="number" value={step.biasPower} onChange={e => updateStep(idx, 'biasPower', e.target.value)} disabled={equipmentState.processing} className="w-12 bg-slate-700 rounded px-1 py-0.5 text-center"/></td><td className="px-1 py-1"><input type="number" value={step.cl2} onChange={e => updateStep(idx, 'cl2', e.target.value)} disabled={equipmentState.processing} className="w-10 bg-slate-700 rounded px-1 py-0.5 text-center"/></td><td className="px-1 py-1"><input type="number" value={step.hbr} onChange={e => updateStep(idx, 'hbr', e.target.value)} disabled={equipmentState.processing} className="w-10 bg-slate-700 rounded px-1 py-0.5 text-center"/></td><td className="px-1 py-1"><input type="number" value={step.cf4} onChange={e => updateStep(idx, 'cf4', e.target.value)} disabled={equipmentState.processing} className="w-10 bg-slate-700 rounded px-1 py-0.5 text-center"/></td><td className="px-1 py-1"><input type="number" value={step.chf3} onChange={e => updateStep(idx, 'chf3', e.target.value)} disabled={equipmentState.processing} className="w-10 bg-slate-700 rounded px-1 py-0.5 text-center"/></td><td className="px-1 py-1"><input type="number" value={step.o2} onChange={e => updateStep(idx, 'o2', e.target.value)} disabled={equipmentState.processing} className="w-10 bg-slate-700 rounded px-1 py-0.5 text-center"/></td><td className="px-1 py-1"><input type="number" value={step.ar} onChange={e => updateStep(idx, 'ar', e.target.value)} disabled={equipmentState.processing} className="w-10 bg-slate-700 rounded px-1 py-0.5 text-center"/></td><td className="px-1 py-1"><button onClick={() => deleteStep(idx)} disabled={equipmentState.processing} className="text-red-400 hover:text-red-300 disabled:opacity-50 px-1">✕</button></td></tr>))}</tbody></table></div>

              {/* Interlock Check Panel */}
              <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-bold text-orange-400 flex items-center gap-2">🔒 INTERLOCK STATUS</div>
                  <div className={`text-xs px-2 py-0.5 rounded ${interlockStatus.passed ? 'bg-green-600 text-white' : interlockStatus.checked ? 'bg-red-600 text-white' : 'bg-slate-600 text-slate-300'}`}>{interlockStatus.passed ? '✓ ALL PASS' : interlockStatus.checked ? '✗ FAILED' : 'NOT CHECKED'}</div>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  <InterlockItem name="Main Power" passed={interlockStatus.items.power} checked={interlockStatus.checked || interlockStatus.checking} />
                  <InterlockItem name="Vacuum System" passed={interlockStatus.items.vacuum} checked={interlockStatus.checked || interlockStatus.checking} />
                  <InterlockItem name="Door Lock" passed={interlockStatus.items.door} checked={interlockStatus.checked || interlockStatus.checking} />
                  <InterlockItem name="Wafer Sensor" passed={interlockStatus.items.wafer} checked={interlockStatus.checked || interlockStatus.checking} />
                  <InterlockItem name="Substrate Temp" passed={interlockStatus.items.temp} checked={interlockStatus.checked || interlockStatus.checking} />
                  <InterlockItem name="Base Pressure" passed={interlockStatus.items.pressure} checked={interlockStatus.checked || interlockStatus.checking} />
                  <InterlockItem name="Gas Line" passed={interlockStatus.items.gasLine} checked={interlockStatus.checked || interlockStatus.checking} />
                  <InterlockItem name="RF Generator" passed={interlockStatus.items.rf} checked={interlockStatus.checked || interlockStatus.checking} />
                </div>
                <button onClick={runInterlockCheck} disabled={equipmentState.processing || interlockStatus.checking || !equipmentState.waferLoaded} className={`w-full py-2 rounded font-bold text-sm ${interlockStatus.checking ? 'bg-yellow-600 animate-pulse' : 'bg-orange-600 hover:bg-orange-500'} disabled:opacity-50`}>{interlockStatus.checking ? '🔄 CHECKING...' : '🔍 INTERLOCK CHECK'}</button>
              </div>

              <div className="flex gap-2"><button onClick={loadDefaultRecipe} disabled={equipmentState.processing} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded text-sm disabled:opacity-50">🔄 Reset</button><button onClick={addNewStep} disabled={equipmentState.processing} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded text-sm disabled:opacity-50">➕ Add Step</button><button onClick={startProcess} disabled={!interlockStatus.passed || !equipmentState.power || !equipmentState.waferLoaded || equipmentState.processing || recipeSteps.length === 0} className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded font-bold text-sm disabled:opacity-50">▶ START PROCESS</button><button onClick={abortProcess} disabled={!equipmentState.processing} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-bold text-sm disabled:opacity-50">⏹ ABORT</button></div>
            </div>)}

            {activeTab === 'monitor' && (<div className="space-y-3">
              <div className="grid grid-cols-3 gap-3"><div className="bg-slate-800 rounded-lg p-3 border border-slate-700"><div className="text-xs text-slate-400 mb-1">⏱ Elapsed Time</div><div className="text-3xl font-mono text-cyan-400 font-bold">{formatTime(elapsedTime)}</div><div className="text-xs text-slate-500">Total: {formatTime(totalTime)}</div></div><div className="bg-slate-800 rounded-lg p-3 border border-slate-700 col-span-2"><div className="text-xs text-slate-400 mb-1">📍 Current Step</div>{cs ? (<div><div className="text-xl font-bold text-yellow-400">{cs.name}</div><div className="flex items-center gap-2 mt-1"><div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-yellow-500 transition-all" style={{ width: `${(stepElapsedTime / cs.time) * 100}%` }}/></div><span className="text-xs text-slate-400">{stepElapsedTime}/{cs.time}s</span></div></div>) : (<div className="text-xl text-slate-500">Idle</div>)}</div></div>
              {cs && (<div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-lg p-3 border border-cyan-700"><div className="text-xs text-cyan-400 mb-2 font-semibold">📋 Current Recipe Parameters</div><div className="grid grid-cols-5 gap-2 text-center text-xs"><div className="bg-slate-800/50 rounded p-2"><div className="text-slate-400">Pressure</div><div className="text-lg font-mono text-green-400">{cs.pressure}</div><div className="text-slate-500">mTorr</div></div><div className="bg-slate-800/50 rounded p-2"><div className="text-slate-400">Source</div><div className="text-lg font-mono text-purple-400">{cs.sourcePower}</div><div className="text-slate-500">W</div></div><div className="bg-slate-800/50 rounded p-2"><div className="text-slate-400">Bias</div><div className="text-lg font-mono text-blue-400">{cs.biasPower}</div><div className="text-slate-500">W</div></div><div className="bg-slate-800/50 rounded p-2 col-span-2"><div className="text-slate-400 mb-1">Gas Flow (sccm)</div><div className="flex flex-wrap gap-1 justify-center text-xs">{cs.cl2 > 0 && <span className="bg-green-700 px-1 rounded">Cl₂:{cs.cl2}</span>}{cs.hbr > 0 && <span className="bg-yellow-700 px-1 rounded">HBr:{cs.hbr}</span>}{cs.cf4 > 0 && <span className="bg-cyan-700 px-1 rounded">CF₄:{cs.cf4}</span>}{cs.chf3 > 0 && <span className="bg-blue-700 px-1 rounded">CHF₃:{cs.chf3}</span>}{cs.o2 > 0 && <span className="bg-orange-700 px-1 rounded">O₂:{cs.o2}</span>}{cs.ar > 0 && <span className="bg-purple-700 px-1 rounded">Ar:{cs.ar}</span>}{cs.n2 > 0 && <span className="bg-slate-600 px-1 rounded">N₂:{cs.n2}</span>}</div></div></div></div>)}
              <div className="bg-slate-800 rounded-lg p-3"><div className="flex justify-between items-center mb-2"><span className="text-sm text-slate-400">Overall Progress</span><span className="text-cyan-400 font-mono">{processProgress.toFixed(1)}%</span></div><div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all" style={{ width: `${processProgress}%` }}/></div><div className="flex mt-2 text-xs">{recipeSteps.map((step, idx) => (<div key={idx} className={`flex-1 text-center py-1 ${idx === activeStepIndex ? 'bg-cyan-600 text-white' : idx < activeStepIndex ? 'bg-green-800 text-green-300' : 'bg-slate-700 text-slate-500'} ${idx === 0 ? 'rounded-l' : ''} ${idx === recipeSteps.length - 1 ? 'rounded-r' : ''}`}>{step.name.substring(0, 5)}</div>))}</div></div>
              <div className="bg-slate-800 rounded-lg p-3"><div className="text-xs text-slate-400 mb-2">📡 OES Spectrum (Real-time)</div><OESSpectrum data={oesData} currentStep={cs}/></div>
              <div className="grid grid-cols-4 gap-2"><div className="bg-slate-800 rounded-lg p-2 text-center"><div className="text-xs text-slate-400">Pressure</div><div className="text-lg font-mono text-green-400">{realTimeParams.pressure < 1000 ? realTimeParams.pressure.toFixed(1) : 'ATM'}</div><div className="text-xs text-slate-500">mTorr</div></div><div className="bg-slate-800 rounded-lg p-2 text-center"><div className="text-xs text-slate-400">Source RF</div><div className="text-lg font-mono text-purple-400">{realTimeParams.sourcePower.toFixed(0)}</div><div className="text-xs text-slate-500">W</div></div><div className="bg-slate-800 rounded-lg p-2 text-center"><div className="text-xs text-slate-400">Bias RF</div><div className="text-lg font-mono text-blue-400">{realTimeParams.biasPower.toFixed(0)}</div><div className="text-xs text-slate-500">W</div></div><div className="bg-slate-800 rounded-lg p-2 text-center"><div className="text-xs text-slate-400">Temp</div><div className="text-lg font-mono text-orange-400">{realTimeParams.temperature.toFixed(1)}</div><div className="text-xs text-slate-500">°C</div></div></div>
            </div>)}

            {activeTab === 'results' && (<div className="space-y-3">
              {results ? (<><div className="grid grid-cols-2 gap-3"><div className="bg-gradient-to-br from-green-900/50 to-green-800/30 rounded-lg p-3 border border-green-700"><div className="text-xs text-green-400">Etch Rate</div><div className="text-2xl font-bold text-green-300">{results.etchRate}</div><div className="text-xs text-green-500">nm/min</div></div><div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 rounded-lg p-3 border border-blue-700"><div className="text-xs text-blue-400">Selectivity</div><div className="text-2xl font-bold text-blue-300">{results.selectivity}:1</div><div className="text-xs text-blue-500">vs underlayer</div></div><div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 rounded-lg p-3 border border-purple-700"><div className="text-xs text-purple-400">Uniformity</div><div className="text-2xl font-bold text-purple-300">{results.uniformity}%</div><div className="text-xs text-purple-500">across wafer</div></div><div className="bg-gradient-to-br from-orange-900/50 to-orange-800/30 rounded-lg p-3 border border-orange-700"><div className="text-xs text-orange-400">Profile Angle</div><div className="text-2xl font-bold text-orange-300">{results.profileAngle}°</div><div className="text-xs text-orange-500">sidewall</div></div></div>

              {/* 물리 분석 패널 */}
              <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-lg p-3 border border-cyan-700">
                <div className="text-xs text-cyan-400 font-bold mb-2">📊 Physics Analysis</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Plasma Parameters</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-slate-500">Ion Flux:</span><span className="text-cyan-300 font-mono">{results.ionFlux} a.u.</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Ion Energy:</span><span className="text-cyan-300 font-mono">{results.ionEnergy} eV</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Dissociation:</span><span className="text-cyan-300 font-mono">{results.dissociationRate}%</span></div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Etch Mechanism</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-slate-500">Ion Contrib:</span><span className="text-yellow-300 font-mono">{results.ionContrib} nm/min</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Radical Contrib:</span><span className="text-green-300 font-mono">{results.radContrib} nm/min</span></div>
                    </div>
                    <div className="mt-2 h-3 bg-slate-700 rounded-full overflow-hidden flex">
                      <div className="bg-yellow-500 h-full" style={{width: `${(parseFloat(results.ionContrib) / parseFloat(results.etchRate)) * 100}%`}} title="Ion"/>
                      <div className="bg-green-500 h-full" style={{width: `${(parseFloat(results.radContrib) / parseFloat(results.etchRate)) * 100}%`}} title="Radical"/>
                    </div>
                    <div className="flex justify-between text-xs mt-0.5"><span className="text-yellow-400">Ion</span><span className="text-green-400">Radical</span></div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-700 text-xs text-slate-400">
                  <span className="text-cyan-400">💡 </span>{results.analysisText}
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-3"><div className="grid grid-cols-2 gap-2 text-sm"><div className="flex justify-between"><span className="text-slate-400">Etch Depth:</span><span className="text-cyan-400 font-mono">{results.etchDepth} nm</span></div><div className="flex justify-between"><span className="text-slate-400">Total Time:</span><span className="text-cyan-400 font-mono">{results.totalTime} sec</span></div><div className="flex justify-between"><span className="text-slate-400">Material:</span><span className="text-cyan-400">{targetMaterial}</span></div><div className="flex justify-between"><span className="text-slate-400">Status:</span><span className="text-green-400">✓ Complete</span></div></div></div><div className="bg-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-slate-400">Uniformity Map (49-point) - 3D View</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Scale:</span>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={uniformityScale}
                      onChange={(e) => setUniformityScale(Number(e.target.value))}
                      className="w-20 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-xs text-cyan-400 font-mono w-8">{uniformityScale}x</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  {/* 3D Isometric View */}
                  <div className="flex-1">
                    <svg viewBox="0 0 280 200" className="w-full h-48">
                      <g transform="translate(140, 170)">
                        {/* Draw 3D bars */}
                        {uniformityMap.map((val, i) => {
                          const row = Math.floor(i / 7);
                          const col = i % 7;
                          const baseVal = results ? parseFloat(results.uniformity) : 95;
                          const diff = (val - baseVal) * uniformityScale;
                          const height = Math.max(2, 20 + diff * 2);

                          // Isometric projection
                          const isoX = (col - row) * 16;
                          const isoY = (col + row) * 8 - 56;

                          const hue = ((val - 85) / 15) * 120;
                          const color = `hsl(${hue}, 70%, 50%)`;
                          const darkColor = `hsl(${hue}, 70%, 35%)`;
                          const lightColor = `hsl(${hue}, 70%, 60%)`;

                          return (
                            <g key={i} transform={`translate(${isoX}, ${isoY})`}>
                              {/* Top face */}
                              <polygon
                                points={`0,${-height} 12,${-height-6} 24,${-height} 12,${-height+6}`}
                                fill={lightColor}
                                stroke={color}
                                strokeWidth="0.5"
                              />
                              {/* Left face */}
                              <polygon
                                points={`0,${-height} 12,${-height+6} 12,6 0,0`}
                                fill={color}
                                stroke={darkColor}
                                strokeWidth="0.5"
                              />
                              {/* Right face */}
                              <polygon
                                points={`12,${-height+6} 24,${-height} 24,0 12,6`}
                                fill={darkColor}
                                stroke={darkColor}
                                strokeWidth="0.5"
                              />
                              {/* Center marker for middle point */}
                              {row === 3 && col === 3 && (
                                <circle cx="12" cy={-height-6} r="3" fill="#fff" opacity="0.8"/>
                              )}
                            </g>
                          );
                        })}
                        {/* Axis labels */}
                        <text x="-100" y="20" fill="#64748b" fontSize="8" textAnchor="middle">Edge</text>
                        <text x="100" y="20" fill="#64748b" fontSize="8" textAnchor="middle">Edge</text>
                        <text x="0" y="-80" fill="#64748b" fontSize="8" textAnchor="middle">Center</text>
                      </g>
                    </svg>
                  </div>
                  {/* Legend & Stats */}
                  <div className="w-24 space-y-2">
                    <div className="text-xs text-slate-400">Color Scale</div>
                    <div className="h-24 w-4 rounded" style={{background: 'linear-gradient(to bottom, hsl(120,70%,50%), hsl(60,70%,50%), hsl(0,70%,50%))'}}/>
                    <div className="flex justify-between text-xs">
                      <span className="text-green-400">High</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-red-400">Low</span>
                    </div>
                    <div className="pt-2 border-t border-slate-700 space-y-1">
                      <div className="text-xs text-slate-500">Min: <span className="text-cyan-400">{Math.min(...uniformityMap).toFixed(1)}%</span></div>
                      <div className="text-xs text-slate-500">Max: <span className="text-cyan-400">{Math.max(...uniformityMap).toFixed(1)}%</span></div>
                      <div className="text-xs text-slate-500">Range: <span className="text-yellow-400">{(Math.max(...uniformityMap) - Math.min(...uniformityMap)).toFixed(2)}%</span></div>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-500 text-center">
                  💡 스케일을 높이면 미세한 차이도 크게 보입니다. 실제 Range: {(Math.max(...uniformityMap) - Math.min(...uniformityMap)).toFixed(2)}%
                </div>
              </div></>) : (<div className="flex flex-col items-center justify-center h-64 text-slate-500"><div className="text-4xl mb-3">📊</div><div>Run a process to see results</div></div>)}
            </div>)}
          </div>
        </div>
      </div>

      {/* 하단 로그 영역 */}
      <div className="bg-slate-800 border-t border-slate-700">
        <div className="px-4 py-1 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2"><span className="text-sm font-medium text-slate-400">📜 Process Log</span>{alarms.length > 0 && <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">{alarms.length} Alarms</span>}</div>
          <div className="flex items-center gap-4 text-xs text-slate-500"><span>Target: {targetMaterial}</span><span>|</span><span>Steps: {recipeSteps.length}</span><span>|</span><span>Interlock: {interlockStatus.passed ? '✓' : '✗'}</span><span className={equipmentState.processing ? 'text-green-400 animate-pulse' : ''}>{equipmentState.processing ? '● PROCESSING' : equipmentState.processComplete ? '✓ COMPLETE' : '○ IDLE'}</span></div>
        </div>
        <div ref={logRef} className="h-28 overflow-auto p-2 space-y-0.5 text-xs font-mono bg-slate-900">
          {logs.map((log, i) => (<div key={i} className={`${log.type === 'success' ? 'text-green-400' : log.type === 'warning' ? 'text-yellow-400' : log.type === 'error' ? 'text-red-400' : 'text-slate-400'}`}><span className="text-slate-600">[{log.timestamp}]</span> {log.message}</div>))}
          {logs.length === 0 && <div className="text-slate-600 text-center py-4">No logs yet - Start a process to see activity</div>}
        </div>
      </div>
    </div>
  );
};

export default ICPEtcherSimulator;
