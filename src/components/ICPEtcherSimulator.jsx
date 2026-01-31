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
  const [waferPattern, setWaferPattern] = useState('siOnOxide');
  const [resultView, setResultView] = useState('summary');
  const [paused, setPaused] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const processTimerRef = useRef(null);

  // Detailed wafer patterns for selectivity experiments
  const waferPatterns = {
    siOnOxide: {
      name: 'Si/SiO₂ Stack',
      desc: 'Poly-Si(500nm) on SiO₂(100nm) - Gate Etch',
      target: 'Si',
      mask: 'PR',
      stop: 'SiO2',
      stack: [
        { material: 'PR', thickness: 300, color: '#d946ef' },
        { material: 'Si', thickness: 500, color: '#6366f1' },
        { material: 'SiO2', thickness: 100, color: '#06b6d4' }
      ],
      goalSelectivity: 'Si:SiO₂ > 10:1',
      chemistry: 'Cl₂/HBr + O₂',
      cd: 100, pitch: 200, ar: 5.0,
      tips: 'HBr 비율↑ → 선택도↑, Bias↓ → 선택도↑'
    },
    oxideOnSi: {
      name: 'SiO₂/Si Stack',
      desc: 'SiO₂(300nm) on Si - Contact Etch',
      target: 'SiO2',
      mask: 'PR',
      stop: 'Si',
      stack: [
        { material: 'PR', thickness: 400, color: '#d946ef' },
        { material: 'SiO2', thickness: 300, color: '#06b6d4' },
        { material: 'Si', thickness: 100, color: '#6366f1' }
      ],
      goalSelectivity: 'SiO₂:Si > 10:1',
      chemistry: 'CF₄/CHF₃ + O₂',
      cd: 80, pitch: 160, ar: 3.75,
      tips: 'CHF₃ 비율↑ → 선택도↑ (polymer), O₂↑ → 선택도↓'
    },
    nitrideOnOxide: {
      name: 'Si₃N₄/SiO₂ Stack',
      desc: 'Si₃N₄(200nm) on SiO₂(50nm) - Spacer Etch',
      target: 'Si3N4',
      mask: 'PR',
      stop: 'SiO2',
      stack: [
        { material: 'PR', thickness: 300, color: '#d946ef' },
        { material: 'Si3N4', thickness: 200, color: '#22c55e' },
        { material: 'SiO2', thickness: 50, color: '#06b6d4' }
      ],
      goalSelectivity: 'Si₃N₄:SiO₂ > 5:1',
      chemistry: 'CHF₃/O₂ + Ar',
      cd: 120, pitch: 240, ar: 1.67,
      tips: 'O₂ 비율 조절이 핵심, 압력↑ → 선택도↑'
    }
  };

  // Optimized recipes for selectivity experiments
  const selectivityRecipes = {
    siOnOxide: {
      highSelectivity: [
        { name: 'Stabilize', time: 10, pressure: 50, sourcePower: 0, biasPower: 0, cl2: 0, hbr: 0, cf4: 0, chf3: 0, o2: 0, ar: 100, n2: 0 },
        { name: 'Strike', time: 5, pressure: 30, sourcePower: 400, biasPower: 0, cl2: 10, hbr: 30, cf4: 0, chf3: 0, o2: 0, ar: 50, n2: 0 },
        { name: 'Main Etch', time: 60, pressure: 40, sourcePower: 600, biasPower: 50, cl2: 20, hbr: 80, cf4: 0, chf3: 0, o2: 5, ar: 50, n2: 0 },
        { name: 'Over Etch', time: 15, pressure: 50, sourcePower: 400, biasPower: 30, cl2: 10, hbr: 60, cf4: 0, chf3: 0, o2: 3, ar: 50, n2: 0 },
        { name: 'Purge', time: 10, pressure: 100, sourcePower: 0, biasPower: 0, cl2: 0, hbr: 0, cf4: 0, chf3: 0, o2: 0, ar: 0, n2: 200 }
      ],
      lowSelectivity: [
        { name: 'Stabilize', time: 10, pressure: 50, sourcePower: 0, biasPower: 0, cl2: 0, hbr: 0, cf4: 0, chf3: 0, o2: 0, ar: 100, n2: 0 },
        { name: 'Strike', time: 5, pressure: 20, sourcePower: 500, biasPower: 0, cl2: 50, hbr: 10, cf4: 0, chf3: 0, o2: 0, ar: 50, n2: 0 },
        { name: 'Main Etch', time: 60, pressure: 10, sourcePower: 1000, biasPower: 200, cl2: 100, hbr: 0, cf4: 0, chf3: 0, o2: 0, ar: 50, n2: 0 },
        { name: 'Purge', time: 10, pressure: 100, sourcePower: 0, biasPower: 0, cl2: 0, hbr: 0, cf4: 0, chf3: 0, o2: 0, ar: 0, n2: 200 }
      ]
    },
    oxideOnSi: {
      highSelectivity: [
        { name: 'Stabilize', time: 10, pressure: 40, sourcePower: 0, biasPower: 0, cl2: 0, hbr: 0, cf4: 0, chf3: 0, o2: 0, ar: 100, n2: 0 },
        { name: 'Strike', time: 5, pressure: 30, sourcePower: 400, biasPower: 0, cl2: 0, hbr: 0, cf4: 10, chf3: 40, o2: 0, ar: 50, n2: 0 },
        { name: 'Main Etch', time: 90, pressure: 50, sourcePower: 800, biasPower: 100, cl2: 0, hbr: 0, cf4: 10, chf3: 80, o2: 5, ar: 30, n2: 0 },
        { name: 'Over Etch', time: 20, pressure: 60, sourcePower: 600, biasPower: 50, cl2: 0, hbr: 0, cf4: 5, chf3: 60, o2: 3, ar: 30, n2: 0 },
        { name: 'Purge', time: 10, pressure: 100, sourcePower: 0, biasPower: 0, cl2: 0, hbr: 0, cf4: 0, chf3: 0, o2: 0, ar: 0, n2: 200 }
      ],
      lowSelectivity: [
        { name: 'Stabilize', time: 10, pressure: 40, sourcePower: 0, biasPower: 0, cl2: 0, hbr: 0, cf4: 0, chf3: 0, o2: 0, ar: 100, n2: 0 },
        { name: 'Strike', time: 5, pressure: 20, sourcePower: 500, biasPower: 0, cl2: 0, hbr: 0, cf4: 50, chf3: 10, o2: 10, ar: 50, n2: 0 },
        { name: 'Main Etch', time: 90, pressure: 15, sourcePower: 1200, biasPower: 300, cl2: 0, hbr: 0, cf4: 80, chf3: 0, o2: 20, ar: 30, n2: 0 },
        { name: 'Purge', time: 10, pressure: 100, sourcePower: 0, biasPower: 0, cl2: 0, hbr: 0, cf4: 0, chf3: 0, o2: 0, ar: 0, n2: 200 }
      ]
    },
    nitrideOnOxide: {
      highSelectivity: [
        { name: 'Stabilize', time: 10, pressure: 30, sourcePower: 0, biasPower: 0, cl2: 0, hbr: 0, cf4: 0, chf3: 0, o2: 0, ar: 100, n2: 0 },
        { name: 'Strike', time: 5, pressure: 30, sourcePower: 300, biasPower: 0, cl2: 0, hbr: 0, cf4: 0, chf3: 50, o2: 20, ar: 50, n2: 0 },
        { name: 'Main Etch', time: 75, pressure: 60, sourcePower: 500, biasPower: 80, cl2: 0, hbr: 0, cf4: 0, chf3: 70, o2: 30, ar: 30, n2: 0 },
        { name: 'Over Etch', time: 15, pressure: 70, sourcePower: 400, biasPower: 50, cl2: 0, hbr: 0, cf4: 0, chf3: 60, o2: 25, ar: 30, n2: 0 },
        { name: 'Purge', time: 10, pressure: 100, sourcePower: 0, biasPower: 0, cl2: 0, hbr: 0, cf4: 0, chf3: 0, o2: 0, ar: 0, n2: 200 }
      ],
      lowSelectivity: [
        { name: 'Stabilize', time: 10, pressure: 30, sourcePower: 0, biasPower: 0, cl2: 0, hbr: 0, cf4: 0, chf3: 0, o2: 0, ar: 100, n2: 0 },
        { name: 'Strike', time: 5, pressure: 15, sourcePower: 400, biasPower: 0, cl2: 0, hbr: 0, cf4: 20, chf3: 30, o2: 5, ar: 50, n2: 0 },
        { name: 'Main Etch', time: 75, pressure: 10, sourcePower: 900, biasPower: 200, cl2: 0, hbr: 0, cf4: 40, chf3: 20, o2: 5, ar: 30, n2: 0 },
        { name: 'Purge', time: 10, pressure: 100, sourcePower: 0, biasPower: 0, cl2: 0, hbr: 0, cf4: 0, chf3: 0, o2: 0, ar: 0, n2: 200 }
      ]
    }
  };
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
    if (!equipmentState.processing || paused) { if (processTimerRef.current) clearInterval(processTimerRef.current); return; }
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
  }, [equipmentState.processing, recipeSteps, paused]);

  const calcResults = () => {
    const ms = recipeSteps.find(s => s.name.includes('Main') || s.name.includes('Ashing')); if (!ms) return;
    const wp = waferPatterns[waferPattern];

    const ionFlux = Math.sqrt(ms.sourcePower / 100) * Math.sqrt(100 / (ms.pressure + 1));
    const ionEnergy = 20 + (ms.biasPower / (ms.pressure + 1)) * 5;
    const dissociationRate = Math.min(0.9, (ms.sourcePower / 500) * (50 / (ms.pressure + 10)));

    let targetEtchRate = 0, stopEtchRate = 0, selectivity = 1, ionContrib = 0, radContrib = 0;
    let analysisText = '';

    // Calculate etch rates based on wafer pattern (target and stop layer)
    const calcMaterialRate = (material) => {
      let rate = 0, ionC = 0, radC = 0;

      if (material === 'Si') {
        const clRadical = ms.cl2 * dissociationRate * 2;
        const brRadical = ms.hbr * dissociationRate;
        radC = (clRadical * 1.5 + brRadical * 1.2) * 0.8;
        ionC = ionFlux * Math.sqrt(ionEnergy) * 0.3;
        rate = radC + ionC + (radC * ionC * 0.01);
        // HBr increases Si etch rate selectivity over oxide
        rate *= (1 + (ms.hbr / (ms.cl2 + ms.hbr + 1)) * 0.5);
      }
      else if (material === 'SiO2') {
        const fRadical = (ms.cf4 * 4 + ms.chf3 * 3) * dissociationRate * 0.3;
        const cfxPolymer = ms.chf3 * dissociationRate * 0.5;
        const ionEnhancement = Math.max(0, (ionEnergy - 30) / 20);
        radC = fRadical * 0.3;
        ionC = ionFlux * ionEnhancement * fRadical * 0.05;
        rate = radC + ionC;
        // O2 removes polymer, increases etch rate
        rate *= (1 + ms.o2 * 0.03);
        // Polymer protection reduces rate
        rate *= (1 - cfxPolymer * 0.01);
      }
      else if (material === 'Si3N4') {
        const fRadical = (ms.cf4 * 4 + ms.chf3 * 3) * dissociationRate * 0.3;
        const hRadical = ms.chf3 * dissociationRate * 0.5;
        radC = fRadical * 0.6 + hRadical * fRadical * 0.02;
        ionC = ionFlux * Math.sqrt(ionEnergy) * 0.2;
        rate = radC + ionC;
        // O2 enhances nitride etch
        rate *= (1 + ms.o2 * 0.04);
      }
      else if (material === 'PR') {
        const oRadical = ms.o2 * dissociationRate * 2;
        radC = oRadical * 1.5;
        ionC = ionFlux * Math.sqrt(ionEnergy) * 0.1;
        rate = radC + ionC;
        rate *= (1 + ms.pressure / 200);
      }

      return { rate: rate * 3, ionC: ionC * 3, radC: radC * 3 };
    };

    // Calculate target and stop layer etch rates
    const targetResult = calcMaterialRate(wp.target);
    targetEtchRate = targetResult.rate;
    ionContrib = targetResult.ionC;
    radContrib = targetResult.radC;

    const stopResult = calcMaterialRate(wp.stop);
    stopEtchRate = stopResult.rate;

    // Calculate selectivity with physical meaning
    selectivity = targetEtchRate / (stopEtchRate + 0.1);

    // Pressure effect on selectivity (higher pressure generally increases selectivity)
    selectivity *= (1 + (ms.pressure - 20) * 0.01);

    // Bias effect on selectivity (higher bias decreases selectivity due to physical sputtering)
    selectivity *= (1 - ms.biasPower * 0.001);

    // Generate analysis text based on wafer pattern
    if (waferPattern === 'siOnOxide') {
      const hbrRatio = ms.hbr / (ms.cl2 + ms.hbr + 1) * 100;
      analysisText = `Si:SiO₂ 선택도=${selectivity.toFixed(1)}:1 | HBr비율: ${hbrRatio.toFixed(0)}% | Bias: ${ms.biasPower}W → ${ms.biasPower > 100 ? '선택도↓' : '선택도↑'}`;
    }
    else if (waferPattern === 'oxideOnSi') {
      const chf3Ratio = ms.chf3 / (ms.cf4 + ms.chf3 + 1) * 100;
      const cfxPolymer = ms.chf3 * dissociationRate * 0.5;
      analysisText = `SiO₂:Si 선택도=${selectivity.toFixed(1)}:1 | CHF₃비율: ${chf3Ratio.toFixed(0)}% | Polymer: ${cfxPolymer.toFixed(1)} → ${cfxPolymer > 10 ? '보호막↑' : '보호막↓'}`;
    }
    else if (waferPattern === 'nitrideOnOxide') {
      const o2Effect = ms.o2 / (ms.chf3 + ms.o2 + 1) * 100;
      analysisText = `Si₃N₄:SiO₂ 선택도=${selectivity.toFixed(1)}:1 | O₂비율: ${o2Effect.toFixed(0)}% | 압력: ${ms.pressure}mT → ${ms.pressure > 40 ? '선택도↑' : '선택도↓'}`;
    }

    const uni = 95 - Math.abs(ms.pressure - 30) * 0.1 - Math.abs(ms.sourcePower - 600) * 0.005;
    const pa = 85 + (ms.biasPower / 200) * 5 - (ms.pressure / 100) * 3;
    const ed = targetEtchRate * (ms.time / 60);

    setResults({
      etchRate: Math.max(0, targetEtchRate).toFixed(1),
      selectivity: Math.max(0.5, Math.min(50, selectivity)).toFixed(1),
      uniformity: Math.min(99, Math.max(80, uni)).toFixed(1),
      profileAngle: Math.min(90, Math.max(75, pa)).toFixed(1),
      etchDepth: ed.toFixed(0),
      totalTime: recipeSteps.reduce((s, r) => s + r.time, 0),
      ionFlux: ionFlux.toFixed(2),
      ionEnergy: ionEnergy.toFixed(1),
      dissociationRate: (dissociationRate * 100).toFixed(0),
      ionContrib: ionContrib.toFixed(1),
      radContrib: radContrib.toFixed(1),
      targetMaterial: wp.target,
      stopMaterial: wp.stop,
      targetRate: targetEtchRate.toFixed(1),
      stopRate: stopEtchRate.toFixed(1),
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
    if (equipmentState.processing && paused) return 'paused';
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
          <button onClick={() => setShowGuide(true)} className="text-xs bg-blue-600 hover:bg-blue-500 px-2 py-0.5 rounded flex items-center gap-1">📖 Guide</button>
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
              {getMissionStatus() === 'paused' && (<div className="space-y-2"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"/><span className="text-yellow-400 text-xs font-bold tracking-wider">⏸ PAUSED</span></div><span className="text-cyan-400 font-mono text-lg font-bold">{formatTime(elapsedTime)}</span></div><div className="bg-gradient-to-r from-yellow-900/50 to-transparent rounded p-2 border-l-2 border-yellow-400"><div className="text-xs text-yellow-500">PAUSED AT STEP</div><div className="text-xl font-bold text-white flex items-center gap-2"><span className="text-yellow-400">[{activeStepIndex + 1}/{recipeSteps.length}]</span>{cs?.name}</div><div className="flex items-center gap-2 mt-1"><div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-yellow-500" style={{ width: `${cs ? (stepElapsedTime / cs.time) * 100 : 0}%` }}/></div><span className="text-xs text-slate-400 font-mono w-16 text-right">{stepElapsedTime}s / {cs?.time}s</span></div></div><div className="mt-2 pt-2 border-t border-slate-700/50"><div className="text-xs text-yellow-400 flex items-center gap-1">⏸ <span className="font-semibold">일시정지됨</span></div><div className="text-xs text-slate-300 mt-1">현재 상태를 천천히 확인하세요. <span className="text-yellow-400 font-bold">▶ RESUME</span> 버튼으로 재개합니다.</div></div></div>)}
              {getMissionStatus() === 'complete' && (<div className="text-center space-y-2"><div className="text-3xl">🎉</div><div className="text-green-400 font-bold text-lg">MISSION COMPLETE</div><div className="text-slate-300 text-sm">{targetMaterial} 식각 공정 완료!</div><div className="mt-2 pt-2 border-t border-slate-700/50"><div className="text-xs text-yellow-400 flex items-center gap-1 justify-center">💡 <span className="font-semibold">CHECK:</span></div><div className="text-xs text-slate-300 mt-1">우측 <span className="text-cyan-400 font-bold">📈 Results</span> 탭에서 공정 결과를 확인하세요!</div></div></div>)}
            </div>
          </div>

          {/* Controls */}
          <div className="p-3 border-t border-slate-700 space-y-2">
            <button onClick={togglePower} disabled={equipmentState.processing} className={`w-full py-2 rounded font-bold text-sm transition-all ${equipmentState.power ? 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-900/50' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50`}>{equipmentState.power ? '⚡ POWER ON' : '○ POWER OFF'}</button>
            {/* Pattern Selection */}
            <div className="bg-slate-700/50 rounded p-2">
              <div className="text-xs text-slate-400 mb-1">Wafer Pattern:</div>
              <select
                value={waferPattern}
                onChange={(e) => setWaferPattern(e.target.value)}
                disabled={equipmentState.waferLoaded || !equipmentState.power}
                className="w-full bg-slate-700 text-white text-xs rounded px-2 py-1 disabled:opacity-50"
              >
                {Object.entries(waferPatterns).map(([key, pat]) => (
                  <option key={key} value={key}>{pat.name}</option>
                ))}
              </select>
              <div className="text-xs text-slate-500 mt-1">{waferPatterns[waferPattern].desc}</div>
              {/* Film Stack Visualization */}
              <div className="mt-2 flex items-center gap-1">
                {waferPatterns[waferPattern].stack.map((layer, i) => (
                  <div key={i} className="flex-1 text-center">
                    <div className="h-4 rounded-sm text-[8px] text-white flex items-center justify-center" style={{backgroundColor: layer.color}}>
                      {layer.material}
                    </div>
                    <div className="text-[8px] text-slate-500">{layer.thickness}nm</div>
                  </div>
                ))}
              </div>
              <div className="mt-1 text-[10px] text-cyan-400">🎯 {waferPatterns[waferPattern].goalSelectivity}</div>
              <div className="text-[10px] text-slate-500">💡 {waferPatterns[waferPattern].tips}</div>
            </div>
            {/* Recipe Preset Buttons */}
            <div className="flex gap-1">
              <button
                onClick={() => { setRecipeSteps([...selectivityRecipes[waferPattern].highSelectivity]); addLog(`High selectivity recipe loaded for ${waferPatterns[waferPattern].name}`, 'info'); }}
                disabled={equipmentState.processing}
                className="flex-1 py-1 bg-green-700 hover:bg-green-600 rounded text-[10px] disabled:opacity-50"
              >📗 High Sel.</button>
              <button
                onClick={() => { setRecipeSteps([...selectivityRecipes[waferPattern].lowSelectivity]); addLog(`Low selectivity recipe loaded for ${waferPatterns[waferPattern].name}`, 'info'); }}
                disabled={equipmentState.processing}
                className="flex-1 py-1 bg-orange-700 hover:bg-orange-600 rounded text-[10px] disabled:opacity-50"
              >📙 Low Sel.</button>
            </div>
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

              <div className="flex flex-wrap gap-2">
                <button onClick={loadDefaultRecipe} disabled={equipmentState.processing} className="px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded text-sm disabled:opacity-50">🔄 Reset</button>
                <button onClick={addNewStep} disabled={equipmentState.processing} className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded text-sm disabled:opacity-50">➕ Add</button>
                <button onClick={startProcess} disabled={!interlockStatus.passed || !equipmentState.power || !equipmentState.waferLoaded || equipmentState.processing || recipeSteps.length === 0} className="flex-1 min-w-[80px] py-2 bg-green-600 hover:bg-green-700 rounded font-bold text-sm disabled:opacity-50">▶ START</button>
                <button onClick={() => setPaused(!paused)} disabled={!equipmentState.processing} className={`px-3 py-2 rounded font-bold text-sm disabled:opacity-50 ${paused ? 'bg-yellow-500 hover:bg-yellow-400 animate-pulse' : 'bg-yellow-600 hover:bg-yellow-500'}`}>{paused ? '▶️ RESUME' : '⏸️ PAUSE'}</button>
                <button onClick={abortProcess} disabled={!equipmentState.processing} className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded font-bold text-sm disabled:opacity-50">⏹ ABORT</button>
              </div>
            </div>)}

            {activeTab === 'monitor' && (<div className="space-y-3">
              {/* Pause/Resume Button */}
              {equipmentState.processing && (
                <button onClick={() => setPaused(!paused)} className={`w-full py-2 rounded font-bold text-sm transition-all ${paused ? 'bg-green-500 hover:bg-green-400 animate-pulse text-white' : 'bg-yellow-500 hover:bg-yellow-400 text-black'}`}>
                  {paused ? '▶️ RESUME' : '⏸️ PAUSE'}
                </button>
              )}
              <div className="grid grid-cols-3 gap-3"><div className="bg-slate-800 rounded-lg p-3 border border-slate-700"><div className="text-xs text-slate-400 mb-1">⏱ Elapsed Time</div><div className="text-3xl font-mono text-cyan-400 font-bold">{formatTime(elapsedTime)}</div><div className="text-xs text-slate-500">Total: {formatTime(totalTime)}</div></div><div className="bg-slate-800 rounded-lg p-3 border border-slate-700 col-span-2"><div className="text-xs text-slate-400 mb-1">📍 Current Step</div>{cs ? (<div><div className="text-xl font-bold text-yellow-400">{cs.name}</div><div className="flex items-center gap-2 mt-1"><div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-yellow-500 transition-all" style={{ width: `${(stepElapsedTime / cs.time) * 100}%` }}/></div><span className="text-xs text-slate-400">{stepElapsedTime}/{cs.time}s</span></div></div>) : (<div className="text-xl text-slate-500">Idle</div>)}</div></div>
              {cs && (<div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-lg p-3 border border-cyan-700"><div className="text-xs text-cyan-400 mb-2 font-semibold">📋 Current Recipe Parameters</div><div className="grid grid-cols-5 gap-2 text-center text-xs"><div className="bg-slate-800/50 rounded p-2"><div className="text-slate-400">Pressure</div><div className="text-lg font-mono text-green-400">{cs.pressure}</div><div className="text-slate-500">mTorr</div></div><div className="bg-slate-800/50 rounded p-2"><div className="text-slate-400">Source</div><div className="text-lg font-mono text-purple-400">{cs.sourcePower}</div><div className="text-slate-500">W</div></div><div className="bg-slate-800/50 rounded p-2"><div className="text-slate-400">Bias</div><div className="text-lg font-mono text-blue-400">{cs.biasPower}</div><div className="text-slate-500">W</div></div><div className="bg-slate-800/50 rounded p-2 col-span-2"><div className="text-slate-400 mb-1">Gas Flow (sccm)</div><div className="flex flex-wrap gap-1 justify-center text-xs">{cs.cl2 > 0 && <span className="bg-green-700 px-1 rounded">Cl₂:{cs.cl2}</span>}{cs.hbr > 0 && <span className="bg-yellow-700 px-1 rounded">HBr:{cs.hbr}</span>}{cs.cf4 > 0 && <span className="bg-cyan-700 px-1 rounded">CF₄:{cs.cf4}</span>}{cs.chf3 > 0 && <span className="bg-blue-700 px-1 rounded">CHF₃:{cs.chf3}</span>}{cs.o2 > 0 && <span className="bg-orange-700 px-1 rounded">O₂:{cs.o2}</span>}{cs.ar > 0 && <span className="bg-purple-700 px-1 rounded">Ar:{cs.ar}</span>}{cs.n2 > 0 && <span className="bg-slate-600 px-1 rounded">N₂:{cs.n2}</span>}</div></div></div></div>)}
              <div className="bg-slate-800 rounded-lg p-3"><div className="flex justify-between items-center mb-2"><span className="text-sm text-slate-400">Overall Progress</span><span className="text-cyan-400 font-mono">{processProgress.toFixed(1)}%</span></div><div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all" style={{ width: `${processProgress}%` }}/></div><div className="flex mt-2 text-xs">{recipeSteps.map((step, idx) => (<div key={idx} className={`flex-1 text-center py-1 ${idx === activeStepIndex ? 'bg-cyan-600 text-white' : idx < activeStepIndex ? 'bg-green-800 text-green-300' : 'bg-slate-700 text-slate-500'} ${idx === 0 ? 'rounded-l' : ''} ${idx === recipeSteps.length - 1 ? 'rounded-r' : ''}`}>{step.name.substring(0, 5)}</div>))}</div></div>
              <div className="bg-slate-800 rounded-lg p-3"><div className="text-xs text-slate-400 mb-2">📡 OES Spectrum (Real-time)</div><OESSpectrum data={oesData} currentStep={cs}/></div>
              <div className="grid grid-cols-4 gap-2"><div className="bg-slate-800 rounded-lg p-2 text-center"><div className="text-xs text-slate-400">Pressure</div><div className="text-lg font-mono text-green-400">{realTimeParams.pressure < 1000 ? realTimeParams.pressure.toFixed(1) : 'ATM'}</div><div className="text-xs text-slate-500">mTorr</div></div><div className="bg-slate-800 rounded-lg p-2 text-center"><div className="text-xs text-slate-400">Source RF</div><div className="text-lg font-mono text-purple-400">{realTimeParams.sourcePower.toFixed(0)}</div><div className="text-xs text-slate-500">W</div></div><div className="bg-slate-800 rounded-lg p-2 text-center"><div className="text-xs text-slate-400">Bias RF</div><div className="text-lg font-mono text-blue-400">{realTimeParams.biasPower.toFixed(0)}</div><div className="text-xs text-slate-500">W</div></div><div className="bg-slate-800 rounded-lg p-2 text-center"><div className="text-xs text-slate-400">Temp</div><div className="text-lg font-mono text-orange-400">{realTimeParams.temperature.toFixed(1)}</div><div className="text-xs text-slate-500">°C</div></div></div>
            </div>)}

            {activeTab === 'results' && (<div className="space-y-3">
              {results ? (<>
                {/* View Selector */}
                <div className="flex items-center justify-between">
                  <select value={resultView} onChange={(e) => setResultView(e.target.value)} className="bg-slate-700 text-white text-sm rounded px-3 py-1.5 border border-slate-600">
                    <option value="summary">📊 Summary</option>
                    <option value="uniformity">🗺️ Uniformity Map</option>
                    <option value="profile">🔬 Profile (SEM)</option>
                  </select>
                  <div className="text-xs text-slate-400">Pattern: <span className="text-cyan-400">{waferPatterns[waferPattern].name}</span></div>
                </div>

                {/* Summary View */}
                {resultView === 'summary' && (<>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 rounded-lg p-3 border border-green-700">
                      <div className="text-xs text-green-400">{results.targetMaterial} Etch Rate</div>
                      <div className="text-2xl font-bold text-green-300">{results.etchRate}</div>
                      <div className="text-xs text-green-500">nm/min</div>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/30 rounded-lg p-3 border border-yellow-700">
                      <div className="text-xs text-yellow-400">Selectivity ({results.targetMaterial}:{results.stopMaterial})</div>
                      <div className="text-2xl font-bold text-yellow-300">{results.selectivity}:1</div>
                      <div className="text-xs text-yellow-500">{results.stopMaterial} rate: {results.stopRate} nm/min</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 rounded-lg p-3 border border-purple-700"><div className="text-xs text-purple-400">Uniformity</div><div className="text-2xl font-bold text-purple-300">{results.uniformity}%</div><div className="text-xs text-purple-500">across wafer</div></div>
                    <div className="bg-gradient-to-br from-orange-900/50 to-orange-800/30 rounded-lg p-3 border border-orange-700"><div className="text-xs text-orange-400">Profile Angle</div><div className="text-2xl font-bold text-orange-300">{results.profileAngle}°</div><div className="text-xs text-orange-500">sidewall</div></div>
                  </div>
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
                          <div className="bg-yellow-500 h-full" style={{width: `${(parseFloat(results.ionContrib) / parseFloat(results.etchRate)) * 100}%`}}/>
                          <div className="bg-green-500 h-full" style={{width: `${(parseFloat(results.radContrib) / parseFloat(results.etchRate)) * 100}%`}}/>
                        </div>
                        <div className="flex justify-between text-xs mt-0.5"><span className="text-yellow-400">Ion</span><span className="text-green-400">Radical</span></div>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-700 text-xs text-slate-400"><span className="text-cyan-400">💡 </span>{results.analysisText}</div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between"><span className="text-slate-400">Etch Depth:</span><span className="text-cyan-400 font-mono">{results.etchDepth} nm</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Total Time:</span><span className="text-cyan-400 font-mono">{results.totalTime} sec</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Material:</span><span className="text-cyan-400">{targetMaterial}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Pattern:</span><span className="text-cyan-400">{waferPatterns[waferPattern].name}</span></div>
                    </div>
                  </div>
                </>)}

                {/* Uniformity View */}
                {resultView === 'uniformity' && (() => {
                  const baseDepth = parseFloat(results.etchDepth);
                  const minUnif = Math.min(...uniformityMap);
                  const maxUnif = Math.max(...uniformityMap);
                  const minDepth = (baseDepth * minUnif / 100).toFixed(1);
                  const maxDepth = (baseDepth * maxUnif / 100).toFixed(1);
                  const depthRange = (maxDepth - minDepth).toFixed(1);
                  // Calculate etch rate (nm/min)
                  const etchRate = parseFloat(results.etchRate);
                  const minRate = (etchRate * minUnif / 100).toFixed(1);
                  const maxRate = (etchRate * maxUnif / 100).toFixed(1);
                  return (
                  <div className="bg-slate-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-slate-300 font-medium">Etch Depth Uniformity Map (49-point)</div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">3D Scale:</span>
                        <input type="range" min="1" max="20" value={uniformityScale} onChange={(e) => setUniformityScale(Number(e.target.value))} className="w-16 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"/>
                        <span className="text-xs text-cyan-400 font-mono w-6">{uniformityScale}x</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs mb-3 bg-slate-700/50 rounded px-3 py-1.5">
                      <span className="text-slate-400">Min: <span className="text-cyan-400 font-mono">{minDepth}nm</span></span>
                      <span className="text-slate-400">Max: <span className="text-green-400 font-mono">{maxDepth}nm</span></span>
                      <span className="text-slate-400">Range: <span className="text-yellow-400 font-mono">Δ{depthRange}nm</span></span>
                      <span className="text-slate-400">Rate: <span className="text-purple-400 font-mono">{etchRate}nm/min</span></span>
                    </div>

                    {/* 2D + 3D Side by Side - Expanded */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* 2D Contour Map - Real data-driven from 49 points */}
                      <div className="bg-slate-900 rounded-lg p-3">
                        <div className="text-xs text-slate-400 text-center mb-2">2D Contour Map</div>
                        <div className="flex">
                          <svg viewBox="0 0 200 210" className="flex-1" style={{height: '320px'}}>
                            <defs>
                              <clipPath id="waferClip2d">
                                <circle cx="100" cy="100" r="88"/>
                              </clipPath>
                              <filter id="contourBlur">
                                <feGaussianBlur stdDeviation="6"/>
                              </filter>
                            </defs>
                            {/* Base layer */}
                            <circle cx="100" cy="100" r="88" fill="#555"/>
                            {/* 49-point data - each point as blurred circle for smooth interpolation */}
                            <g clipPath="url(#waferClip2d)" filter="url(#contourBlur)">
                              {uniformityMap.map((val, i) => {
                                const row = Math.floor(i / 7);
                                const col = i % 7;
                                const x = 100 + (col - 3) * 26;
                                const y = 100 + (row - 3) * 26;
                                const normalized = (val - minUnif) / (maxUnif - minUnif + 0.01);
                                const gray = Math.round(normalized * 180 + 50);
                                return <circle key={i} cx={x} cy={y} r="35" fill={`rgb(${gray},${gray},${gray})`}/>;
                              })}
                            </g>
                            {/* Contour lines based on actual threshold crossings */}
                            <g clipPath="url(#waferClip2d)">
                              {[0.1, 0.25, 0.4, 0.55, 0.7, 0.85].map((threshold, ti) => {
                                const points = [];
                                // Sample around the wafer to find contour crossings
                                for (let a = 0; a < 360; a += 8) {
                                  const rad = a * Math.PI / 180;
                                  for (let r = 15; r <= 85; r += 4) {
                                    const sx = 100 + r * Math.cos(rad);
                                    const sy = 100 + r * Math.sin(rad);
                                    // Bilinear interpolation from nearest grid points
                                    const gx = (sx - 100) / 26 + 3;
                                    const gy = (sy - 100) / 26 + 3;
                                    const c0 = Math.floor(gx), r0 = Math.floor(gy);
                                    const c1 = Math.min(6, c0 + 1), r1 = Math.min(6, r0 + 1);
                                    if (c0 >= 0 && c0 < 7 && r0 >= 0 && r0 < 7) {
                                      const fx = gx - c0, fy = gy - r0;
                                      const v00 = uniformityMap[r0 * 7 + c0];
                                      const v10 = uniformityMap[r0 * 7 + c1];
                                      const v01 = uniformityMap[r1 * 7 + c0];
                                      const v11 = uniformityMap[r1 * 7 + c1];
                                      const interp = v00*(1-fx)*(1-fy) + v10*fx*(1-fy) + v01*(1-fx)*fy + v11*fx*fy;
                                      const norm = (interp - minUnif) / (maxUnif - minUnif + 0.01);
                                      if (Math.abs(norm - threshold) < 0.08) {
                                        points.push({x: sx, y: sy, a});
                                        break;
                                      }
                                    }
                                  }
                                }
                                if (points.length > 6) {
                                  points.sort((a,b) => a.a - b.a);
                                  const d = points.map((p,j) => (j===0?'M':'L')+p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ')+'Z';
                                  return <path key={ti} d={d} fill="none" stroke="rgba(40,40,40,0.7)" strokeWidth="1.5"/>;
                                }
                                return null;
                              })}
                            </g>
                            {/* Wafer outline */}
                            <circle cx="100" cy="100" r="88" fill="none" stroke="#333" strokeWidth="2.5"/>
                            {/* Notch */}
                            <path d="M100,188 L95,198 L105,198 Z" fill="#222"/>
                          </svg>
                          {/* Vertical scale bar with nm/min values */}
                          <div className="flex flex-col items-center ml-2 py-2">
                            <div className="text-[9px] text-white font-mono">{maxRate}</div>
                            <div className="w-4 flex-1 rounded-sm relative" style={{background: 'linear-gradient(to bottom, #e8e8e8, #888, #323232)', minHeight: '200px'}}>
                              {[0,0.2,0.4,0.6,0.8,1].map((t,i) => (
                                <div key={i} className="absolute w-full flex items-center" style={{top: `${t*100}%`}}>
                                  <div className="w-1 h-px bg-black/50"/>
                                  <span className="text-[6px] text-slate-400 ml-0.5">
                                    {(parseFloat(maxRate) - (parseFloat(maxRate)-parseFloat(minRate))*t).toFixed(0)}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="text-[8px] text-slate-500 font-mono">{minRate}</div>
                            <div className="text-[6px] text-slate-600 mt-0.5">nm/min</div>
                          </div>
                        </div>
                      </div>

                      {/* 3D Isometric View */}
                      <div className="bg-slate-900 rounded-lg p-3">
                        <div className="text-xs text-slate-400 text-center mb-2">3D Depth View</div>
                        <svg viewBox="0 0 280 240" className="w-full" style={{height: '320px'}}>
                          <g transform="translate(140, 170)">
                            {uniformityMap.map((val, i) => {
                              const row = Math.floor(i / 7);
                              const col = i % 7;
                              const baseVal = results ? parseFloat(results.uniformity) : 95;
                              const diff = (val - baseVal) * uniformityScale;
                              const height = Math.max(3, 28 + diff * 2.5);
                              const isoX = (col - row) * 18;
                              const isoY = (col + row) * 9 - 54;
                              const gray = Math.round(((val - minUnif) / (maxUnif - minUnif)) * 200 + 55);
                              const color = `rgb(${gray},${gray},${gray})`;
                              const darkColor = `rgb(${Math.max(0,gray-40)},${Math.max(0,gray-40)},${Math.max(0,gray-40)})`;
                              const lightColor = `rgb(${Math.min(255,gray+30)},${Math.min(255,gray+30)},${Math.min(255,gray+30)})`;
                              return (
                                <g key={i} transform={`translate(${isoX}, ${isoY})`}>
                                  <polygon points={`0,${-height} 13,${-height-6.5} 26,${-height} 13,${-height+6.5}`} fill={lightColor} stroke={color} strokeWidth="0.4"/>
                                  <polygon points={`0,${-height} 13,${-height+6.5} 13,6.5 0,0`} fill={color} stroke={darkColor} strokeWidth="0.4"/>
                                  <polygon points={`13,${-height+6.5} 26,${-height} 26,0 13,6.5`} fill={darkColor} stroke={darkColor} strokeWidth="0.4"/>
                                </g>
                              );
                            })}
                          </g>
                          {/* Scale indicator */}
                          <text x="140" y="230" fill="#64748b" fontSize="9" textAnchor="middle">↑ Height = Etch Depth</text>
                        </svg>
                        {/* Depth scale bar */}
                        <div className="flex items-center justify-center gap-3 mt-2">
                          <div className="w-32 h-4 rounded" style={{background: 'linear-gradient(to right, #333, #fff)'}}/>
                          <div className="text-sm text-slate-400">
                            <span className="text-slate-500">{minDepth}</span>
                            <span className="mx-1">-</span>
                            <span className="text-white">{maxDepth}</span>
                            <span className="text-slate-500 ml-1">nm</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 text-center mt-1">💡 밝을수록 식각량이 많음 | Scale 조절로 미세 차이 확대</div>
                  </div>
                );})()}

                {/* Profile (SEM) View */}
                {resultView === 'profile' && (
                  <div className="bg-slate-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm text-slate-300 font-medium">🔬 Cross-Section Profile (SEM Style)</div>
                      <div className="text-xs text-slate-400">Sidewall Angle: <span className="text-cyan-400">{results.profileAngle}°</span></div>
                    </div>
                    <div className="bg-black rounded-lg p-2 border border-slate-600">
                      <svg viewBox="0 0 500 300" className="w-full h-64">
                        {/* SEM noise background */}
                        <defs>
                          <filter id="semNoise">
                            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise"/>
                            <feColorMatrix type="saturate" values="0"/>
                            <feBlend in="SourceGraphic" in2="noise" mode="multiply"/>
                          </filter>
                        </defs>
                        <rect x="0" y="0" width="500" height="300" fill="#1a1a1a"/>

                        {/* Depth scale markers on left side */}
                        <g>
                          <line x1="45" y1="70" x2="45" y2="250" stroke="#fff" strokeWidth="1"/>
                          <line x1="40" y1="70" x2="50" y2="70" stroke="#fff" strokeWidth="1"/>
                          <text x="38" y="74" fill="#fff" fontSize="8" textAnchor="end" fontFamily="monospace">0</text>
                          <line x1="40" y1="115" x2="50" y2="115" stroke="#fff" strokeWidth="1"/>
                          <text x="38" y="119" fill="#fff" fontSize="8" textAnchor="end" fontFamily="monospace">{Math.round(parseFloat(results.etchDepth) * 0.25)}</text>
                          <line x1="40" y1="160" x2="50" y2="160" stroke="#fff" strokeWidth="1"/>
                          <text x="38" y="164" fill="#fff" fontSize="8" textAnchor="end" fontFamily="monospace">{Math.round(parseFloat(results.etchDepth) * 0.5)}</text>
                          <line x1="40" y1="205" x2="50" y2="205" stroke="#fff" strokeWidth="1"/>
                          <text x="38" y="209" fill="#fff" fontSize="8" textAnchor="end" fontFamily="monospace">{Math.round(parseFloat(results.etchDepth) * 0.75)}</text>
                          <line x1="40" y1="250" x2="50" y2="250" stroke="#fff" strokeWidth="1"/>
                          <text x="38" y="254" fill="#fff" fontSize="8" textAnchor="end" fontFamily="monospace">{results.etchDepth}</text>
                          <text x="25" y="160" fill="#fff" fontSize="8" textAnchor="middle" fontFamily="monospace" transform="rotate(-90, 25, 160)">nm</text>
                        </g>

                        {/* Horizontal scale bar */}
                        <g>
                          <line x1="400" y1="280" x2="480" y2="280" stroke="#fff" strokeWidth="2"/>
                          <line x1="400" y1="276" x2="400" y2="284" stroke="#fff" strokeWidth="1"/>
                          <line x1="480" y1="276" x2="480" y2="284" stroke="#fff" strokeWidth="1"/>
                          <text x="440" y="273" fill="#fff" fontSize="9" textAnchor="middle" fontFamily="monospace">{Math.round(parseFloat(results.etchDepth) * 0.5)} nm</text>
                        </g>

                        {/* Magnification info */}
                        <text x="400" y="20" fill="#00ff00" fontSize="9" textAnchor="end" fontFamily="monospace">MAG: 50,000x</text>
                        <text x="400" y="32" fill="#00ff00" fontSize="9" textAnchor="end" fontFamily="monospace">HV: 5.0kV</text>
                        <text x="400" y="44" fill="#00ff00" fontSize="9" textAnchor="end" fontFamily="monospace">WD: 5mm</text>

                        {/* Draw profile based on pattern - Si/SiO2 Stack (Gate Etch) */}
                        {waferPattern === 'siOnOxide' && (
                          <g filter="url(#semNoise)">
                            {[0,1,2,3,4].map(i => {
                              const x = 70 + i * 90;
                              const angle = parseFloat(results.profileAngle);
                              const depth = parseFloat(results.etchDepth) * 0.6;
                              const tanAngle = Math.tan((90 - angle) * Math.PI / 180);
                              const bottomOffset = depth * tanAngle * 0.25;
                              return (
                                <g key={i}>
                                  {/* PR mask (magenta) */}
                                  <rect x={x} y="60" width="45" height="20" fill="#a855f7"/>
                                  {/* Si layer (purple-blue) - etched */}
                                  <rect x={x} y="80" width="45" height="35" fill="#6366f1"/>
                                  {/* Etched trench in Si */}
                                  <polygon points={`${x+45},80 ${x+90-bottomOffset},${80+depth*0.5} ${x+90},${80+depth*0.5} ${x+90},80`} fill="#333"/>
                                  <polygon points={`${x},80 ${x-45+bottomOffset},${80+depth*0.5} ${x-45},${80+depth*0.5} ${x-45},80`} fill="#222"/>
                                  {/* SiO2 stop layer (cyan) */}
                                  <rect x={x-45} y={80+depth*0.5} width="135" height="15" fill="#06b6d4"/>
                                  {/* Si substrate */}
                                  <rect x={x-45} y={95+depth*0.5} width="135" height="60" fill="#444"/>
                                  {/* Sidewall highlight */}
                                  <line x1={x} y1="80" x2={x-bottomOffset*0.5} y2={80+depth*0.5} stroke="#888" strokeWidth="1"/>
                                  <line x1={x+45} y1="80" x2={x+45+bottomOffset*0.5} y2={80+depth*0.5} stroke="#555" strokeWidth="1"/>
                                </g>
                              );
                            })}
                            <text x="250" y="280" fill="#00ff00" fontSize="9" textAnchor="middle" fontFamily="monospace">Si/SiO₂ Gate | Selectivity: {results.selectivity}:1 | Angle: {results.profileAngle}°</text>
                          </g>
                        )}

                        {/* SiO2/Si Stack (Contact Etch) */}
                        {waferPattern === 'oxideOnSi' && (
                          <g filter="url(#semNoise)">
                            {[0,1,2,3].map(i => {
                              const x = 90 + i * 100;
                              const angle = parseFloat(results.profileAngle);
                              const depth = parseFloat(results.etchDepth) * 0.5;
                              const topWidth = 40;
                              const bottomWidth = topWidth - (depth * Math.tan((90 - angle) * Math.PI / 180) * 0.3);
                              return (
                                <g key={i}>
                                  {/* PR mask */}
                                  <rect x={x-30} y="55" width="95" height="25" fill="#a855f7"/>
                                  {/* SiO2 layer (cyan) with contact hole */}
                                  <rect x={x-30} y="80" width="95" height="50" fill="#06b6d4"/>
                                  {/* Contact hole etched through oxide */}
                                  <ellipse cx={x+17} cy="80" rx={topWidth/2} ry="6" fill="#333"/>
                                  <path d={`M${x-3},80 L${x-3+(topWidth-bottomWidth)/2},${80+depth*0.6} L${x+37-(topWidth-bottomWidth)/2},${80+depth*0.6} L${x+37},80`} fill="#222"/>
                                  {/* Si stop layer at bottom */}
                                  <rect x={x-30} y="130" width="95" height="40" fill="#6366f1"/>
                                  <ellipse cx={x+17} cy={80+depth*0.6} rx={bottomWidth/2} ry="4" fill="#6366f1"/>
                                </g>
                              );
                            })}
                            <text x="250" y="280" fill="#00ff00" fontSize="9" textAnchor="middle" fontFamily="monospace">SiO₂/Si Contact | Selectivity: {results.selectivity}:1 | Angle: {results.profileAngle}°</text>
                          </g>
                        )}

                        {/* Si3N4/SiO2 Stack (Spacer Etch) */}
                        {waferPattern === 'nitrideOnOxide' && (
                          <g filter="url(#semNoise)">
                            {[0,1,2,3,4,5].map(i => {
                              const x = 55 + i * 70;
                              const angle = parseFloat(results.profileAngle);
                              const depth = parseFloat(results.etchDepth) * 0.5;
                              return (
                                <g key={i}>
                                  {/* PR mask */}
                                  <rect x={x} y="65" width="30" height="15" fill="#a855f7"/>
                                  {/* Si3N4 spacer (green) */}
                                  <rect x={x} y="80" width="30" height="40" fill="#22c55e"/>
                                  {/* Etched spacer profile */}
                                  <polygon points={`${x+30},80 ${x+50},${80+depth*0.4} ${x+50},120 ${x+30},120`} fill="#333"/>
                                  <polygon points={`${x},80 ${x-20},${80+depth*0.4} ${x-20},120 ${x},120`} fill="#222"/>
                                  {/* SiO2 stop layer (cyan) */}
                                  <rect x={x-20} y="120" width="70" height="15" fill="#06b6d4"/>
                                  {/* Si substrate */}
                                  <rect x={x-20} y="135" width="70" height="50" fill="#444"/>
                                </g>
                              );
                            })}
                            <text x="250" y="280" fill="#00ff00" fontSize="9" textAnchor="middle" fontFamily="monospace">Si₃N₄/SiO₂ Spacer | Selectivity: {results.selectivity}:1 | Angle: {results.profileAngle}°</text>
                          </g>
                        )}
                      </svg>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
                      <div className="bg-slate-700/50 rounded p-2"><span className="text-slate-400">Target:</span><span className="text-cyan-400 ml-1">{results.targetMaterial}</span></div>
                      <div className="bg-slate-700/50 rounded p-2"><span className="text-slate-400">Stop:</span><span className="text-green-400 ml-1">{results.stopMaterial}</span></div>
                      <div className="bg-slate-700/50 rounded p-2"><span className="text-slate-400">Depth:</span><span className="text-cyan-400 ml-1">{results.etchDepth}nm</span></div>
                      <div className="bg-slate-700/50 rounded p-2"><span className="text-slate-400">Selectivity:</span><span className="text-yellow-400 ml-1">{results.selectivity}:1</span></div>
                    </div>
                  </div>
                )}
              </>) : (<div className="flex flex-col items-center justify-center h-64 text-slate-500"><div className="text-4xl mb-3">📊</div><div>Run a process to see results</div></div>)}
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

      {/* Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-4xl max-h-[90vh] overflow-auto border border-slate-600 shadow-2xl">
            <div className="sticky top-0 bg-slate-800 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-cyan-400">📖 ICP Etcher 실험 가이드</h2>
              <button onClick={() => setShowGuide(false)} className="text-slate-400 hover:text-white text-2xl">&times;</button>
            </div>
            <div className="p-6 space-y-6">
              {/* Equipment Overview */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-2">🔬 장비 소개</h3>
                <p className="text-sm text-slate-300">ICP (Inductively Coupled Plasma) Etcher는 고밀도 플라즈마를 이용한 건식 식각 장비입니다. Source RF로 플라즈마를 생성하고, Bias RF로 이온 에너지를 제어합니다.</p>
                <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-800 rounded p-2"><span className="text-purple-400">Source RF:</span> 0-2000W (플라즈마 밀도)</div>
                  <div className="bg-slate-800 rounded p-2"><span className="text-blue-400">Bias RF:</span> 0-500W (이온 에너지)</div>
                  <div className="bg-slate-800 rounded p-2"><span className="text-green-400">Pressure:</span> 1-200 mTorr</div>
                </div>
              </div>

              {/* Selectivity Experiments */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-3">🎯 선택도(Selectivity) 실험</h3>
                <p className="text-sm text-slate-400 mb-3">선택도란 목표 물질과 정지층의 식각 속도 비율입니다. 높은 선택도 = 정지층 손상 최소화</p>

                <div className="space-y-4">
                  {Object.entries(waferPatterns).map(([key, wp]) => (
                    <div key={key} className="bg-slate-800 rounded-lg p-3 border border-slate-600">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-bold text-cyan-400">{wp.name}</div>
                        <div className="text-xs bg-green-700 px-2 py-0.5 rounded">{wp.goalSelectivity}</div>
                      </div>
                      <div className="text-xs text-slate-400 mb-2">{wp.desc}</div>
                      <div className="flex gap-2 mb-2">
                        {wp.stack.map((layer, i) => (
                          <div key={i} className="flex items-center gap-1 text-xs">
                            <div className="w-3 h-3 rounded" style={{backgroundColor: layer.color}}/>
                            <span className="text-slate-300">{layer.material} ({layer.thickness}nm)</span>
                          </div>
                        ))}
                      </div>
                      <div className="text-xs">
                        <span className="text-slate-500">Chemistry: </span>
                        <span className="text-yellow-400">{wp.chemistry}</span>
                      </div>
                      <div className="mt-2 text-xs text-emerald-400">💡 {wp.tips}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Parameters */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-3">⚙️ 선택도에 영향을 주는 파라미터</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-800 rounded p-3">
                    <div className="text-yellow-400 font-bold mb-1">가스 조성</div>
                    <ul className="text-xs text-slate-400 space-y-1">
                      <li>• <span className="text-green-400">HBr↑</span> → Si:SiO₂ 선택도↑</li>
                      <li>• <span className="text-cyan-400">CHF₃↑</span> → SiO₂:Si 선택도↑ (polymer)</li>
                      <li>• <span className="text-orange-400">O₂↑</span> → polymer 제거, 선택도↓</li>
                    </ul>
                  </div>
                  <div className="bg-slate-800 rounded p-3">
                    <div className="text-blue-400 font-bold mb-1">RF Power & Pressure</div>
                    <ul className="text-xs text-slate-400 space-y-1">
                      <li>• <span className="text-blue-400">Bias↑</span> → 이온에너지↑ → 선택도↓</li>
                      <li>• <span className="text-purple-400">Source↑</span> → 라디칼↑ → 화학반응↑</li>
                      <li>• <span className="text-green-400">Pressure↑</span> → 평균자유행로↓ → 선택도↑</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* How to Use */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-2">📋 사용 방법</h3>
                <ol className="text-sm text-slate-300 space-y-2">
                  <li><span className="text-cyan-400">1.</span> 웨이퍼 패턴 선택 (Si/SiO₂, SiO₂/Si, Si₃N₄/SiO₂)</li>
                  <li><span className="text-cyan-400">2.</span> High/Low Selectivity 레시피 프리셋 로드 또는 직접 설정</li>
                  <li><span className="text-cyan-400">3.</span> Power ON → Wafer Load → Interlock Check</li>
                  <li><span className="text-cyan-400">4.</span> START → Monitor 탭에서 실시간 모니터링 (Pause 가능)</li>
                  <li><span className="text-cyan-400">5.</span> Results 탭에서 선택도, Uniformity, Profile 확인</li>
                </ol>
              </div>

              {/* Quick Tips */}
              <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-lg p-4 border border-cyan-700">
                <h3 className="text-lg font-bold text-cyan-400 mb-2">💡 Quick Tips</h3>
                <ul className="text-sm text-slate-300 space-y-1">
                  <li>• 선택도를 높이려면: <span className="text-green-400">HBr/CHF₃ 비율↑, Bias↓, Pressure↑</span></li>
                  <li>• 식각 속도를 높이려면: <span className="text-yellow-400">Source Power↑, Cl₂/CF₄ 비율↑</span></li>
                  <li>• Profile 수직도: <span className="text-blue-400">Bias↑로 이온 수직 입사 강화</span></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ICPEtcherSimulator;
