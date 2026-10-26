/* PC1864 Menu Map: keypad simulator + section browser. Data lives in data.js. */
(function startApp() {
  'use strict';

  const STORAGE_KEY = 'pc1864-menu-map-v1';
  const DEFAULT_INSTALLER_CODE = '5555';
  const DEFAULT_MASTER_CODE = '1234';
  const HEX_DIGITS = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F' };
  const TROUBLES = {
    1: 'Service required', 2: 'AC failure', 3: 'Phone line', 4: 'Fail to comm.', 5: 'Zone fault', 6: 'Zone tamper', 7: 'Wls low battery', 8: 'Loss of clock',
  };
  const USER_FUNCTIONS = {
    1: 'Time and date', 2: 'Auto-arm on/off', 3: 'Auto-arm time', 4: 'System test', 5: 'Enable DLS', 6: 'User call-up', 7: 'Future use', 8: 'Future use',
  };

  /* ---------- lookups ---------- */

  function buildNodeIndex() {
    const result = new Map();
    KEYPAD_COMMANDS.forEach((node) => result.set(node.id, { node, group: null, isKeypad: true }));
    INSTALLER_GROUPS.forEach((group) => {
      group.sections.forEach((node) => result.set(node.id, { node, group, isKeypad: false }));
    });
    return result;
  }

  const NODE_INDEX = buildNodeIndex();

  function findSectionNode(num) {
    let result = null;
    INSTALLER_GROUPS.some((group) => group.sections.some((node) => {
      const matches = node.range ? num >= node.range[0] && num <= node.range[1] : node.num === num;
      if (matches) result = node;
      return matches;
    }));
    return result;
  }

  function findGroupOf(nodeId) {
    const entry = NODE_INDEX.get(nodeId);
    const result = entry ? entry.group : null;
    return result;
  }

  function formatSection(num) {
    const result = `[${String(num).padStart(3, '0')}]`;
    return result;
  }

  function formatNodeCode(node) {
    if (node.keys) {
      const result = node.keys.map((k) => `[${k}]`).join('');
      return result;
    }
    const result = node.range ? `${formatSection(node.range[0])}-${formatSection(node.range[1])}` : formatSection(node.num);
    return result;
  }

  function describeInstance(node, num) {
    const result = node.describe ? node.describe(num) : '';
    return result;
  }

  function getEntries(node, num, sub) {
    if (sub) return sub.entries;
    if (node.entriesFor) {
      const result = node.entriesFor(num);
      return result;
    }
    const result = node.entries || [];
    return result;
  }

  function getOptions(node, num) {
    const result = node.optionsFor ? node.optionsFor(num) : node.options || [];
    return result;
  }

  function findSub(node, code) {
    const result = (node.subs || []).find((s) => s.code === code) || null;
    return result;
  }

  function truncate(text, width) {
    const result = text.length > width ? text.slice(0, width) : text;
    return result;
  }

  function escapeHtml(text) {
    const result = String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    return result;
  }

  /* ---------- saved worksheet (per browser) ---------- */

  function loadSaved() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const result = raw ? JSON.parse(raw) : {};
      return result;
    } catch (e) {
      const result = {};
      return result;
    }
  }

  function saveWorksheet() {
    try {
      const toggles = {};
      Object.keys(state.toggles).forEach((k) => { toggles[k] = Array.from(state.toggles[k]); });
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ values: state.values, toggles }));
    } catch (e) { /* storage blocked: the page still works, entries just are not remembered */ }
  }

  function restoreToggles(saved) {
    const result = {};
    Object.keys(saved || {}).forEach((k) => { result[k] = new Set(saved[k]); });
    return result;
  }

  /* ---------- state ---------- */

  const saved = loadSaved();
  const state = {
    mode: 'ready',
    nodeId: null,
    section: null,
    subCode: null,
    entryIndex: 0,
    buffer: '',
    hex: false,
    page: 1,
    path: [],
    codeFor: null,
    installerCode: DEFAULT_INSTALLER_CODE,
    userTarget: null,
    userStep: null,
    confirmStep: null,
    infoLine: null,
    flash: null,
    beep: null,
    bypassed: new Set(),
    values: saved.values || {},
    toggles: restoreToggles(saved.toggles),
  };

  function readValueKey(num, subCode, index) {
    const result = `${num}|${subCode || ''}|${index}`;
    return result;
  }

  function getToggleSet(node, num) {
    const key = String(num);
    if (!state.toggles[key]) {
      const defaults = getOptions(node, num).filter((o) => o.def).map((o) => o.n);
      state.toggles[key] = new Set(defaults);
    }
    const result = state.toggles[key];
    return result;
  }

  function getCodeLength() {
    const intl = state.toggles['701'];
    const result = intl && intl.has(5) ? 6 : 4;
    return result;
  }

  function buildInstallerPath() {
    const result = [
      { key: '*', label: '' },
      { key: '8', label: 'Installer programming' },
      { key: state.installerCode, label: 'Installer code' },
    ];
    return result;
  }

  function resetToReady() {
    Object.assign(state, {
      mode: 'ready', nodeId: null, section: null, subCode: null, entryIndex: 0, buffer: '', hex: false, page: 1,
      path: [], codeFor: null, userTarget: null, userStep: null, confirmStep: null, infoLine: null,
    });
  }

  /* ---------- transitions ---------- */

  function openSectionPrompt() {
    Object.assign(state, {
      mode: 'section', nodeId: null, section: null, subCode: null, entryIndex: 0, buffer: '', hex: false, page: 1,
      path: buildInstallerPath(), confirmStep: null, infoLine: null,
    });
  }

  function enterSection(num) {
    const node = findSectionNode(num);
    if (!node) {
      state.flash = ['Invalid Section', `${formatSection(num)} not used`];
      state.beep = 'error';
      state.buffer = '';
      return;
    }
    const instance = describeInstance(node, num);
    Object.assign(state, {
      nodeId: node.id, section: num, subCode: null, entryIndex: 0, buffer: '', hex: false, page: 1, confirmStep: null, infoLine: null,
      path: [...buildInstallerPath(), { key: String(num).padStart(3, '0'), label: instance ? `${node.label}: ${instance}` : node.label }],
    });
    const modeByKind = { sub: 'sub', data: 'data', toggle: 'toggle', phone: 'phone', module: 'module', action: 'action' };
    state.mode = modeByKind[node.kind] || 'action';
    if (node.kind === 'action' && node.confirm) {
      state.mode = 'confirm';
      state.confirmStep = 'code';
    }
    if (node.kind === 'phone') {
      state.buffer = state.values[readValueKey(num, null, 0)] || '';
    }
  }

  function enterSub(code) {
    const node = NODE_INDEX.get(state.nodeId).node;
    const sub = findSub(node, code);
    if (!sub) {
      state.flash = ['Invalid entry', `Sub-section ${code}?`];
      state.beep = 'error';
      state.buffer = '';
      return;
    }
    const base = state.path.slice(0, 4);
    Object.assign(state, {
      mode: 'data', subCode: code, entryIndex: 0, buffer: '', hex: false,
      path: [...base, { key: code, label: sub.label }],
    });
  }

  function leaveData() {
    const node = NODE_INDEX.get(state.nodeId).node;
    if (node.kind === 'sub' && state.subCode !== null) {
      Object.assign(state, { mode: 'sub', subCode: null, entryIndex: 0, buffer: '', hex: false, path: state.path.slice(0, 4) });
      return;
    }
    openSectionPrompt();
  }

  function commitEntry() {
    const node = NODE_INDEX.get(state.nodeId).node;
    const sub = state.subCode ? findSub(node, state.subCode) : null;
    const entries = getEntries(node, state.section, sub);
    state.values[readValueKey(state.section, state.subCode, state.entryIndex)] = state.buffer;
    saveWorksheet();
    state.buffer = '';
    state.hex = false;
    if (state.entryIndex + 1 < entries.length) {
      state.entryIndex += 1;
      state.beep = 'double';
      return;
    }
    state.beep = 'five';
    state.flash = ['Section complete', '5 beeps, exiting'];
    leaveData();
  }

  function typeDigit(key) {
    const digit = state.hex ? HEX_DIGITS[key] : key;
    if (!digit) {
      state.beep = 'error';
      return null;
    }
    const result = digit;
    return result;
  }

  /* ---------- key handling, one function per mode ---------- */

  const KEY_HANDLERS = {
    ready(key) {
      if (key === '*') {
        state.mode = 'star';
        state.path = [{ key: '*', label: '' }];
        return;
      }
      if (/\d/.test(key)) state.flash = ['Code entry arms/', 'disarms. Try [*]'];
    },

    star(key) {
      if (key === '#') { resetToReady(); return; }
      if (!/\d/.test(key)) return;
      const node = NODE_INDEX.get(`k${key}`).node;
      state.nodeId = node.id;
      state.path.push({ key, label: node.label });
      const next = {
        1: 'bypass', 2: 'trouble', 3: 'info', 4: 'info', 7: 'cmdOut', 0: 'info',
      }[key];
      if (next) {
        state.mode = next;
        if (key === '4') state.infoLine = 'Chime toggled';
        if (key === '0') state.infoLine = 'Quick arm/exit';
        if (key === '3') state.infoLine = 'No alarms';
        return;
      }
      state.mode = 'code';
      state.codeFor = { 5: 'master', 6: 'master', 8: 'installer', 9: 'user' }[key];
      state.buffer = '';
    },

    code(key) {
      if (key === '#') { resetToReady(); return; }
      if (!/\d/.test(key)) return;
      state.buffer += key;
      if (state.buffer.length < getCodeLength()) return;
      const code = state.buffer;
      state.buffer = '';
      if (state.codeFor === 'installer') {
        state.installerCode = code;
        openSectionPrompt();
        return;
      }
      const labels = { master: 'Master code', user: 'User code' };
      state.path.push({ key: code, label: labels[state.codeFor] });
      const nextMode = { k5: 'userCodes', k6: 'userFn', k9: 'info' }[state.nodeId];
      state.mode = nextMode;
      if (state.nodeId === 'k9') state.infoLine = 'Armed, no entry';
    },

    section(key) {
      if (key === '#') {
        if (state.buffer) { state.buffer = ''; return; }
        resetToReady();
        state.flash = ['Exited installer', 'programming'];
        return;
      }
      if (!/\d/.test(key)) return;
      state.buffer += key;
      if (state.buffer.length === 3) enterSection(Number(state.buffer));
    },

    sub(key) {
      const node = NODE_INDEX.get(state.nodeId).node;
      if (key === '#') { openSectionPrompt(); return; }
      if (!/\d/.test(key)) return;
      state.buffer += key;
      if (state.buffer.length === node.subDigits) enterSub(state.buffer);
    },

    data(key) {
      const node = NODE_INDEX.get(state.nodeId).node;
      const sub = state.subCode ? findSub(node, state.subCode) : null;
      const entries = getEntries(node, state.section, sub);
      if (key === '#') { leaveData(); return; }
      if (key === '*') { state.hex = !state.hex; return; }
      if (key === '<') { state.entryIndex = Math.max(0, state.entryIndex - 1); state.buffer = ''; return; }
      if (key === '>') { state.entryIndex = Math.min(entries.length - 1, state.entryIndex + 1); state.buffer = ''; return; }
      const digit = typeDigit(key);
      if (!digit) return;
      state.buffer += digit;
      if (state.buffer.length >= entries[state.entryIndex].digits) commitEntry();
    },

    phone(key) {
      if (key === '#') {
        state.values[readValueKey(state.section, null, 0)] = state.buffer;
        saveWorksheet();
        openSectionPrompt();
        return;
      }
      if (key === '*') { state.hex = !state.hex; return; }
      if (key === '<' || key === '>') return;
      const digit = typeDigit(key);
      if (digit && state.buffer.length < 32) state.buffer += digit;
    },

    toggle(key) {
      const node = NODE_INDEX.get(state.nodeId).node;
      if (key === '#') { saveWorksheet(); openSectionPrompt(); return; }
      if (key === '9' && node.pages === 2) { state.page = state.page === 1 ? 2 : 1; return; }
      if (!/[1-8]/.test(key)) return;
      const n = Number(key) + (state.page === 2 ? 8 : 0);
      flipOption(node, state.section, n);
    },

    module(key) {
      if (key === '#') openSectionPrompt();
    },

    action(key) {
      if (key === '#') { openSectionPrompt(); return; }
      if (state.section === 901 && /\d/.test(key)) state.infoLine = 'Trip a zone';
    },

    confirm(key) {
      if (key === '#') { openSectionPrompt(); return; }
      if (!/\d/.test(key)) return;
      state.buffer += key;
      if (state.confirmStep === 'code' && state.buffer.length === getCodeLength()) {
        state.path.push({ key: state.buffer, label: 'Installer code' });
        state.buffer = '';
        state.confirmStep = 'repeat';
        return;
      }
      if (state.confirmStep === 'repeat' && state.buffer.length === 3) {
        const ok = Number(state.buffer) === state.section;
        const sectionText = formatSection(state.section);
        openSectionPrompt();
        state.flash = ok ? [`${sectionText} done`, '(simulated only)'] : ['Mismatch', 'Nothing changed'];
        state.beep = ok ? 'five' : 'error';
      }
    },

    bypass(key) {
      if (key === '#') { resetToReady(); return; }
      if (!/\d/.test(key)) return;
      state.buffer += key;
      if (state.buffer.length < 2) return;
      const zone = Number(state.buffer);
      state.buffer = '';
      if (zone >= 1 && zone <= 64) {
        if (state.bypassed.has(zone)) state.bypassed.delete(zone); else state.bypassed.add(zone);
        state.infoLine = `Zone ${String(zone).padStart(2, '0')} ${state.bypassed.has(zone) ? 'bypassed' : 'active'}`;
        return;
      }
      const special = { 0: 'All cleared', 99: 'Recalled last', 95: 'Group saved', 91: 'Group recalled' }[zone];
      if (zone === 0) state.bypassed.clear();
      state.infoLine = special || 'Invalid zone';
    },

    trouble(key) {
      if (key === '#') { resetToReady(); return; }
      if (TROUBLES[key]) state.infoLine = TROUBLES[key];
    },

    info(key) {
      if (key === '#') resetToReady();
    },

    cmdOut(key) {
      if (key === '#') { resetToReady(); return; }
      if (!/[1-4]/.test(key)) return;
      state.path.push({ key, label: `Output ${key}` });
      state.mode = 'info';
      state.infoLine = `Output ${key} active`;
    },

    userCodes(key) {
      if (key === '#') {
        if (state.userStep) { state.userStep = null; state.userTarget = null; state.buffer = ''; state.path = state.path.slice(0, 3); return; }
        resetToReady();
        return;
      }
      if (state.userStep === 'newCode') {
        if (key === '*') { state.infoLine = `User ${state.userTarget} deleted`; state.userStep = null; state.buffer = ''; state.path = state.path.slice(0, 3); return; }
        if (!/\d/.test(key)) return;
        state.buffer += key;
        if (state.buffer.length === getCodeLength()) {
          state.infoLine = `User ${state.userTarget} saved`;
          state.beep = 'double';
          state.userStep = null;
          state.buffer = '';
          state.path = state.path.slice(0, 3);
        }
        return;
      }
      if (state.userStep === 'attrUser' || state.userStep === 'partUser') {
        if (!/\d/.test(key)) return;
        state.buffer += key;
        if (state.buffer.length < 2) return;
        state.userTarget = state.buffer;
        state.buffer = '';
        state.path.push({ key: state.userTarget, label: `User ${state.userTarget}` });
        state.userStep = state.userStep === 'attrUser' ? 'attr' : 'part';
        return;
      }
      if (state.userStep === 'attr' || state.userStep === 'part') {
        if (!/[1-8]/.test(key)) return;
        const setKey = `${state.userStep}-${state.userTarget}`;
        if (!state.toggles[setKey]) state.toggles[setKey] = new Set(state.userStep === 'part' ? [1] : []);
        const set = state.toggles[setKey];
        if (set.has(Number(key))) set.delete(Number(key)); else set.add(Number(key));
        saveWorksheet();
        return;
      }
      if (!/\d/.test(key)) return;
      state.buffer += key;
      if (state.buffer.length < 2) return;
      const target = state.buffer;
      state.buffer = '';
      if (target === '98' || target === '99') {
        state.userStep = target === '99' ? 'attrUser' : 'partUser';
        state.path.push({ key: target, label: target === '99' ? 'User attributes' : 'Partition assignment' });
        return;
      }
      const num = Number(target);
      if (num < 1 || num > 95) { state.flash = ['Invalid user', 'Use 01-95']; state.beep = 'error'; return; }
      state.userTarget = target;
      state.userStep = 'newCode';
      state.path.push({ key: target, label: num === 40 ? 'Master code' : `User ${target}` });
    },

    userFn(key) {
      if (key === '#') { resetToReady(); return; }
      if (USER_FUNCTIONS[key]) {
        state.infoLine = USER_FUNCTIONS[key];
        state.path = state.path.slice(0, 3);
        state.path.push({ key, label: USER_FUNCTIONS[key] });
      }
    },
  };

  function flipOption(node, num, n) {
    const options = getOptions(node, num);
    if (!options.some((o) => o.n === n)) return;
    const set = getToggleSet(node, num);
    if (set.has(n)) set.delete(n); else set.add(n);
    saveWorksheet();
  }

  function pressKey(key) {
    state.flash = null;
    state.beep = null;
    if (!['bypass', 'trouble', 'userCodes', 'userFn', 'action', 'info'].includes(state.mode)) state.infoLine = null;
    KEY_HANDLERS[state.mode](key);
    render();
  }

  /* ---------- navigation from the tree and links ---------- */

  function navigateToNode(id, num) {
    const entry = NODE_INDEX.get(id);
    if (!entry) return;
    state.flash = null;
    state.beep = null;
    if (entry.isKeypad) {
      navigateToKeypadCommand(entry.node);
      render();
      return;
    }
    const target = num || (entry.node.range ? entry.node.range[0] : entry.node.num);
    openSectionPrompt();
    enterSection(target);
    render();
  }

  function navigateToKeypadCommand(node) {
    resetToReady();
    state.nodeId = node.id;
    const key = node.keys[1];
    state.path = [{ key: '*', label: '' }, { key, label: node.label }];
    if (key === '8') { openSectionPrompt(); return; }
    if (key === '5' || key === '6') state.path.push({ key: DEFAULT_MASTER_CODE, label: 'Master code' });
    if (key === '9') state.path.push({ key: DEFAULT_MASTER_CODE, label: 'User code' });
    state.mode = { 1: 'bypass', 2: 'trouble', 3: 'info', 4: 'info', 5: 'userCodes', 6: 'userFn', 7: 'cmdOut', 9: 'info', 0: 'info' }[key];
    state.infoLine = { 3: 'No alarms', 4: 'Chime toggled', 9: 'Armed, no entry', 0: 'Quick arm/exit' }[key] || null;
  }

  function navigateToEntry(index) {
    if (state.mode !== 'data') return;
    state.entryIndex = index;
    state.buffer = '';
    state.hex = false;
    render();
  }

  function navigateToSub(code) {
    if (state.subCode) leaveData();
    enterSub(code);
    render();
  }

  function applyLookupValue(code) {
    if (state.mode !== 'data') return;
    state.buffer = code;
    commitEntry();
    render();
  }

  /* ---------- derived views ---------- */

  function computeLeds() {
    const installerWaiting = ['section', 'module', 'action', 'confirm'].includes(state.mode);
    const dataModes = ['sub', 'data', 'phone', 'toggle'].includes(state.mode);
    const result = {
      ready: !installerWaiting,
      armed: installerWaiting || (state.mode === 'toggle' && state.page === 2) || (state.mode === 'info' && state.nodeId === 'k9'),
      readyFlash: dataModes && state.hex,
      trouble: false,
      ac: true,
    };
    return result;
  }

  function buildToggleString(node, num) {
    const set = getToggleSet(node, num);
    const offset = state.page === 2 ? 8 : 0;
    const result = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (set.has(i + offset) ? String(i) : '-')).join('');
    return result;
  }

  function computeLcd() {
    if (state.flash) return state.flash;
    const node = state.nodeId ? NODE_INDEX.get(state.nodeId).node : null;
    const sec = state.section !== null ? formatSection(state.section) : '';
    const codeMask = '*'.repeat(state.buffer.length).padEnd(getCodeLength(), '_');
    const views = {
      ready: () => ['System is Ready', 'Enter code  <>'],
      star: () => ['Press (*) for <>', 'Select 1-9 or 0'],
      code: () => [{ installer: 'Installer code', master: 'Master code', user: 'User code' }[state.codeFor], `Enter: ${codeMask}`],
      section: () => ['Enter Section', `      ${state.buffer.padEnd(3, '_')}`],
      sub: () => [`${sec} ${truncate(node.label, 10)}`, `Sub-section: ${state.buffer.padEnd(node.subDigits, '_')}`],
      data: () => computeDataLcd(node),
      phone: () => [`${sec} Phone no.${state.hex ? ' H' : ''}`, `${state.buffer.slice(-15)}_`],
      toggle: () => [`${sec} Opt ${state.page === 2 ? '9-16' : '1-8'}`, `   ${buildToggleString(node, state.section)}`],
      module: () => [`${sec} Module`, 'See module manual'],
      action: () => [`${sec} ${truncate(node.label, 10)}`, state.infoLine || 'Press # to exit'],
      confirm: () => [`${sec} ${state.confirmStep === 'code' ? 'Enter code' : 'Re-enter sect.'}`, state.confirmStep === 'code' ? `      ${codeMask}` : `      ${state.buffer.padEnd(3, '_')}`],
      bypass: () => ['Zone bypass', state.infoLine || `Zone: ${state.buffer.padEnd(2, '_')}`],
      trouble: () => ['View trouble', state.infoLine || 'Press 1-8, #'],
      info: () => [truncate(node ? node.label : '', 16), state.infoLine || 'Press # to exit'],
      cmdOut: () => ['Command output', 'Press 1-4'],
      userCodes: () => computeUserCodesLcd(),
      userFn: () => ['User functions', state.infoLine || 'Press 1-8'],
    };
    const result = views[state.mode]().map((line) => truncate(line, 16));
    return result;
  }

  function computeDataLcd(node) {
    const sub = state.subCode ? findSub(node, state.subCode) : null;
    const entries = getEntries(node, state.section, sub);
    const entry = entries[state.entryIndex];
    const current = state.values[readValueKey(state.section, state.subCode, state.entryIndex)] || entry.def || '';
    const typed = state.buffer ? state.buffer.padEnd(entry.digits, '_') : current;
    const result = [truncate(entry.label, 16), `${typed}${state.hex ? '  HEX' : ''}`];
    return result;
  }

  function computeUserCodesLcd() {
    const step = state.userStep;
    if (step === 'newCode') {
      const result = [`User ${state.userTarget}`, `New: ${'*'.repeat(state.buffer.length).padEnd(getCodeLength(), '_')}`];
      return result;
    }
    if (step === 'attrUser' || step === 'partUser') {
      const result = [step === 'attrUser' ? 'Attributes for' : 'Partitions for', `User: ${state.buffer.padEnd(2, '_')}`];
      return result;
    }
    if (step === 'attr' || step === 'part') {
      const set = state.toggles[`${step}-${state.userTarget}`] || new Set(step === 'part' ? [1] : []);
      const marks = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (set.has(i) ? String(i) : '-')).join('');
      const result = [`User ${state.userTarget} ${step === 'attr' ? 'attrib' : 'parts'}`, `   ${marks}`];
      return result;
    }
    const result = [state.infoLine || 'User codes', `User no.: ${state.buffer.padEnd(2, '_')}`];
    return result;
  }

  function describeWaiting() {
    const node = state.nodeId ? NODE_INDEX.get(state.nodeId).node : null;
    const sec = state.section !== null ? formatSection(state.section) : '';
    const instance = node && state.section !== null ? describeInstance(node, state.section) : '';
    const name = node ? `<strong>${escapeHtml(sec || formatNodeCode(node))} ${escapeHtml(node.label)}</strong>${instance ? ` (${escapeHtml(instance)})` : ''}` : '';
    const views = {
      ready: () => 'The keypad is idle. Press <strong>[*]</strong> to open the command menu.',
      star: () => 'You pressed [*]. Now press one number: <strong>1</strong> bypass, <strong>2</strong> troubles, <strong>3</strong> alarm memory, <strong>4</strong> chime, <strong>5</strong> user codes, <strong>6</strong> user functions, <strong>7</strong> outputs, <strong>8</strong> installer programming, <strong>9</strong> no-entry arm, <strong>0</strong> quick arm.',
      code: () => ({
        installer: `Type the <strong>installer code</strong> (default ${DEFAULT_INSTALLER_CODE}).`,
        master: `Type the <strong>master code</strong> (default ${DEFAULT_MASTER_CODE}).`,
        user: 'Type any valid <strong>user code</strong>.',
      }[state.codeFor]),
      section: () => 'You are at the <strong>top of installer programming</strong>. The Armed light is on: type a <strong>3-digit section number</strong>, for example 001. Press [#] here to leave installer programming.',
      sub: () => `You are in ${name}. Type a <strong>${node.subDigits}-digit sub-section</strong>: ${node.subs.map((s) => `${s.code} = ${escapeHtml(s.label)}`).join(', ')}. Press [#] to go back to Enter Section.`,
      data: () => describeDataWaiting(node, name),
      phone: () => `You are in ${name}. Type up to 32 digits, then press <strong>[#]</strong> to save. Press [*] to switch to HEX digits (D = wait for dial tone).`,
      toggle: () => `You are in ${name}. These are on/off options. Press <strong>1-8</strong> to flip one${node.pages === 2 ? ', and <strong>[9]</strong> to switch between options 1-8 and 9-16' : ''}. Press [#] to save and go back to Enter Section.`,
      module: () => `You are in ${name}. This opens a separate module menu with its own sub-sections. Press [#] to go back.`,
      action: () => `You ran ${name}. Press [#] to go back to Enter Section.`,
      confirm: () => `${name} needs confirming: type the <strong>${state.confirmStep === 'code' ? 'installer code' : `section number ${sec} again`}</strong>. Press [#] to cancel. The simulator never changes a real panel.`,
      bypass: () => `You are in ${name}. Type a <strong>2-digit zone number</strong> to bypass or unbypass it. [#] to finish.${state.bypassed.size ? ` Bypassed now: ${Array.from(state.bypassed).sort((a, b) => a - b).join(', ')}.` : ''}`,
      trouble: () => `You are in ${name}. Press a number <strong>1-8</strong> to see the trouble detail. [#] to exit.`,
      info: () => `You ran ${name}. Press [#] to go back to idle.`,
      cmdOut: () => `You are in ${name}. Press <strong>1-4</strong> for the output.`,
      userCodes: () => describeUserCodesWaiting(name),
      userFn: () => `You are in ${name}. Press <strong>1-8</strong> for a function. [#] to exit.`,
    };
    const result = views[state.mode]();
    return result;
  }

  function describeDataWaiting(node, name) {
    const sub = state.subCode ? findSub(node, state.subCode) : null;
    const entries = getEntries(node, state.section, sub);
    const entry = entries[state.entryIndex];
    const where = sub ? `${name}, sub-section <strong>[${escapeHtml(sub.code)}] ${escapeHtml(sub.label)}</strong>` : name;
    const variable = entry.variable ? 'up to 32 digits' : `${entry.digits} digits`;
    const after = state.entryIndex + 1 < entries.length
      ? `After that it double-beeps and moves to ${escapeHtml(entries[state.entryIndex + 1].label)}.`
      : `This is the last entry. After it the keypad beeps 5 times and returns to ${sub ? 'the sub-section prompt' : 'Enter Section'}.`;
    const result = `You are in ${where}. The panel wants <strong>${variable}</strong> for <strong>${escapeHtml(entry.label)}</strong> (entry ${state.entryIndex + 1} of ${entries.length}). ${after}${state.hex ? ' <strong>HEX mode is on</strong>: 1-6 type A-F, [*] turns it off.' : ''}`;
    return result;
  }

  function describeUserCodesWaiting(name) {
    const step = state.userStep;
    const texts = {
      newCode: `Type the new <strong>${getCodeLength()}-digit code</strong> for user ${state.userTarget}, or [*] to delete it.`,
      attrUser: 'Type the <strong>2-digit user number</strong> whose attributes you want.',
      partUser: 'Type the <strong>2-digit user number</strong> whose partitions you want.',
      attr: `Press <strong>1-8</strong> to flip attributes for user ${state.userTarget}. [#] to finish.`,
      part: `Press <strong>1-8</strong> to flip partitions for user ${state.userTarget}. [#] to finish.`,
    };
    const result = `You are in ${name}. ${texts[step] || 'Type a <strong>2-digit user number</strong> (01-95, 40 = master), or 98 for partitions, 99 for attributes.'}`;
    return result;
  }

  function buildCrumbs() {
    const crumbs = [{ label: 'Keypad', action: 'ready' }];
    if (state.mode === 'ready') return crumbs;
    const entry = state.nodeId ? NODE_INDEX.get(state.nodeId) : null;
    const isInstaller = ['section', 'sub', 'data', 'phone', 'toggle', 'module', 'action', 'confirm'].includes(state.mode) || (state.mode === 'code' && state.codeFor === 'installer');
    if (!isInstaller) {
      crumbs.push({ label: '[*] Commands', action: 'star' });
      if (entry) crumbs.push({ label: `${formatNodeCode(entry.node)} ${entry.node.label}`, action: `node:${entry.node.id}` });
      return crumbs;
    }
    crumbs.push({ label: 'Installer programming [*][8]', action: 'installer' });
    if (!entry || entry.isKeypad) return crumbs;
    crumbs.push({ label: entry.group.label, action: null });
    const instance = describeInstance(entry.node, state.section);
    crumbs.push({ label: `${formatSection(state.section)} ${entry.node.label}${instance ? ` (${instance})` : ''}`, action: `section:${state.section}` });
    if (state.subCode) {
      const sub = findSub(entry.node, state.subCode);
      crumbs.push({ label: `[${sub.code}] ${sub.label}`, action: `sub:${sub.code}` });
    }
    if (state.mode === 'data') {
      const sub = state.subCode ? findSub(entry.node, state.subCode) : null;
      const entries = getEntries(entry.node, state.section, sub);
      if (entries.length > 1) crumbs.push({ label: entries[state.entryIndex].label, action: null });
    }
    return crumbs;
  }

  /* ---------- rendering ---------- */

  const els = {
    treeBody: document.getElementById('tree-body'),
    tree: document.getElementById('tree'),
    treeToggle: document.getElementById('tree-toggle'),
    where: document.getElementById('where'),
    lcd: document.getElementById('lcd'),
    leds: document.getElementById('leds'),
    detail: document.getElementById('detail'),
    search: document.getElementById('search'),
    results: document.getElementById('search-results'),
  };

  function renderTree() {
    const keypadItems = KEYPAD_COMMANDS.map((node) => `<li><button type="button" data-node="${node.id}"><span class="code">${escapeHtml(formatNodeCode(node))}</span><span>${escapeHtml(node.label)}</span></button></li>`).join('');
    const groups = INSTALLER_GROUPS.map((group) => {
      const items = group.sections.map((node) => `<li><button type="button" data-node="${node.id}"><span class="code">${escapeHtml(formatNodeCode(node))}</span><span>${escapeHtml(node.label)}</span></button></li>`).join('');
      return `<details data-group="${group.id}"><summary>${escapeHtml(group.label)}</summary><ul>${items}</ul></details>`;
    }).join('');
    els.treeBody.innerHTML = `
      <h2>Keypad commands</h2>
      <details data-group="keypad" open><summary>[*] commands</summary><ul>${keypadItems}</ul></details>
      <h2>Installer programming [*][8]</h2>
      ${groups}`;
  }

  function highlightTree() {
    els.treeBody.querySelectorAll('button.is-current').forEach((b) => b.classList.remove('is-current'));
    if (!state.nodeId) return;
    const button = els.treeBody.querySelector(`button[data-node="${state.nodeId}"]`);
    if (!button) return;
    button.classList.add('is-current');
    const details = button.closest('details');
    if (details && !details.open) details.open = true;
  }

  function renderWhere() {
    const crumbs = buildCrumbs().map((c) => `<li>${c.action ? `<button type="button" data-crumb="${c.action}">${escapeHtml(c.label)}</button>` : `<span>${escapeHtml(c.label)}</span>`}</li>`).join('');
    const pending = state.buffer && ['section', 'sub', 'code', 'confirm', 'bypass', 'userCodes'].includes(state.mode)
      ? [{ key: state.buffer, label: 'typing' }]
      : [];
    const chips = [...state.path, ...pending];
    const trail = chips.length
      ? chips.map((c) => `<li><span class="keycap">${escapeHtml(c.key)}</span>${c.label ? `<small>${escapeHtml(c.label)}</small>` : ''}</li>`).join('')
      : '<li><small>Nothing pressed yet</small></li>';
    els.where.innerHTML = `
      <p class="eyebrow">You are here</p>
      <ol class="crumbs">${crumbs}</ol>
      <p class="waiting">${describeWaiting()}</p>
      <p class="trail-label">Keys pressed to get here</p>
      <ol class="trail">${trail}</ol>
      <p class="led-legend">
        <span><i class="dot armed"></i>Armed light on = waiting for a section number</span>
        <span><i class="dot ready"></i>Ready light on = waiting for data (flashing = HEX)</span>
      </p>`;
  }

  function renderKeypad() {
    const lines = computeLcd();
    els.lcd.textContent = `${lines[0] || ''}\n${lines[1] || ''}`;
    els.lcd.classList.remove('flash');
    if (state.beep) {
      void els.lcd.offsetWidth;
      els.lcd.classList.add('flash');
    }
    const leds = computeLeds();
    els.leds.querySelector('.ready').classList.toggle('on', leds.ready || leds.readyFlash);
    els.leds.querySelector('.ready').classList.toggle('flash', leds.readyFlash);
    els.leds.querySelector('.armed').classList.toggle('on', leds.armed);
    els.leds.querySelector('.trouble').classList.toggle('on', leds.trouble);
    els.leds.querySelector('.ac').classList.toggle('on', leds.ac);
  }

  function renderDetail() {
    const entry = state.nodeId ? NODE_INDEX.get(state.nodeId) : null;
    if (!entry || (entry.isKeypad && entry.node.id === 'k8')) {
      els.detail.innerHTML = ['section', 'code'].includes(state.mode) && (state.codeFor === 'installer' || state.mode === 'section')
        ? renderInstallerHelp()
        : renderKeypadOverview();
      return;
    }
    els.detail.innerHTML = entry.isKeypad ? renderKeypadDetail(entry.node) : renderSectionDetail(entry.node, entry.group);
  }

  function renderKeypadOverview() {
    const rows = KEYPAD_COMMANDS.map((node) => `<tr class="clickable" data-node="${node.id}"><td class="num">${escapeHtml(formatNodeCode(node))}</td><td>${escapeHtml(node.label)}</td></tr>`).join('');
    const result = `
      <div class="detail-head"><h2>Keypad commands</h2><span class="badge">[*] menu</span></div>
      <p class="desc">Every menu starts with the <strong>[*]</strong> key. Pick a command to see where it leads, or press the keys on the keypad.</p>
      <h3>Commands</h3>
      <div class="table-wrap"><table><thead><tr><th>Keys</th><th>What it opens</th></tr></thead><tbody>${rows}</tbody></table></div>
      ${renderSourceNote()}`;
    return result;
  }

  function renderInstallerHelp() {
    const groups = INSTALLER_GROUPS.map((g) => `<tr><td>${escapeHtml(g.label)}</td><td class="num">${g.sections.map((s) => `<button type="button" class="linklike" data-node="${s.id}">${escapeHtml(formatNodeCode(s))}</button>`).join(' ')}</td></tr>`).join('');
    const result = `
      <div class="detail-head"><h2>How installer programming works</h2><span class="badge">[*][8]</span></div>
      <p class="desc">Installer programming has two levels. At the top level the panel waits for a <strong>3-digit section number</strong> (Armed light on). Inside a section it waits for data (Ready light on). Some sections, like [000] and [005], have one more level: a sub-section number before the data.</p>
      <ul class="tips">
        <li>Press <strong>[#]</strong> to leave a section. Anything typed so far is saved.</li>
        <li>Press <strong>[#]</strong> again at "Enter Section" to leave installer programming.</li>
        <li>Data sections move on by themselves: a double beep after each entry, five beeps at the end.</li>
        <li>On/off sections: press 1-8 to flip options, then [#].</li>
        <li>HEX digits: press [*] then 1-6 for A-F, then [*] again to go back to numbers.</li>
      </ul>
      <h3>Section map</h3>
      <div class="table-wrap"><table><thead><tr><th>Area</th><th>Sections</th></tr></thead><tbody>${groups}</tbody></table></div>
      ${renderSourceNote()}`;
    return result;
  }

  function renderKeypadDetail(node) {
    const entries = node.entries ? `
      <h3>Inside this menu</h3>
      <div class="table-wrap"><table><thead><tr><th>Press</th><th>What it does</th></tr></thead><tbody>
        ${node.entries.map((e) => `<tr><td class="num">${escapeHtml(e.label)}</td><td>${escapeHtml(e.note)}</td></tr>`).join('')}
      </tbody></table></div>` : '';
    const attrs = node.attributes ? `
      <h3>User attributes ([99] + user)</h3>
      <div class="table-wrap"><table><thead><tr><th class="num">Light</th><th>When ON</th></tr></thead><tbody>
        ${node.attributes.map((a) => `<tr><td class="num">${a.n}</td><td>${escapeHtml(a.on)}</td></tr>`).join('')}
      </tbody></table></div>` : '';
    const result = `
      <div class="detail-head"><span class="big-code">${escapeHtml(formatNodeCode(node))}</span><h2>${escapeHtml(node.label)}</h2><span class="badge">Keypad command</span></div>
      <p class="desc">${escapeHtml(node.desc)}</p>
      ${renderTips(node.tips)}
      ${entries}${attrs}
      ${renderRelated(node.related)}
      ${renderSourceNote()}`;
    return result;
  }

  const KIND_BADGES = {
    sub: 'Has sub-sections', data: 'Type in values', toggle: 'On/off options', phone: 'Phone number', module: 'Module menu', action: 'Command',
  };

  function renderSectionDetail(node, group) {
    const instance = describeInstance(node, state.section);
    const head = `
      <div class="detail-head">
        <span class="big-code">${escapeHtml(formatSection(state.section))}</span>
        <h2>${escapeHtml(node.label)}${instance ? `: ${escapeHtml(instance)}` : ''}</h2>
        <span class="badge${node.danger ? ' danger' : ''}">${node.danger ? 'Erases settings' : KIND_BADGES[node.kind]}</span>
      </div>
      <p class="desc">${escapeHtml(node.desc)}</p>
      ${renderTips(node.tips)}`;
    const body = {
      sub: () => renderSubBody(node),
      data: () => renderEntriesBody(node),
      phone: () => renderPhoneBody(),
      toggle: () => renderToggleBody(node),
      module: () => '',
      action: () => '',
    }[node.kind]();
    const result = `${head}${node.range ? renderRangePicker(node) : ''}${body}${renderRelated(node.related)}<p class="source">Area: ${escapeHtml(group.label)}. ${renderSourceText()}</p>`;
    return result;
  }

  function renderRangePicker(node) {
    const buttons = [];
    for (let n = node.range[0]; n <= node.range[1]; n += 1) {
      buttons.push(`<button type="button" data-section="${n}" class="${n === state.section ? 'is-current' : ''}" title="${escapeHtml(describeInstance(node, n))}">${n}</button>`);
    }
    const result = `
      <h3>Pick which one</h3>
      <span class="picker-label">Each number below is its own section. ${escapeHtml(formatSection(state.section))} = ${escapeHtml(describeInstance(node, state.section))}.</span>
      <div class="picker">${buttons.join('')}</div>`;
    return result;
  }

  function renderSubBody(node) {
    const rows = node.subs.map((s) => {
      const isCurrent = s.code === state.subCode;
      return `<tr class="clickable${isCurrent ? ' is-current' : ''}" data-sub="${s.code}"><td class="num">[${escapeHtml(s.code)}]</td><td>${escapeHtml(s.label)}${isCurrent ? ' <span class="here">keypad is here</span>' : ''}</td><td>${s.entries.map((e) => escapeHtml(e.label)).join(', ')}</td></tr>`;
    }).join('');
    const sub = state.subCode ? findSub(node, state.subCode) : null;
    const result = `
      <h3>Sub-sections</h3>
      <div class="table-wrap"><table><thead><tr><th class="num">Sub</th><th>What it is</th><th>Entries inside</th></tr></thead><tbody>${rows}</tbody></table></div>
      ${sub ? renderEntriesTable(node, sub) : ''}`;
    return result;
  }

  function renderEntriesBody(node) {
    const result = renderEntriesTable(node, null);
    return result;
  }

  function renderEntriesTable(node, sub) {
    const entries = getEntries(node, state.section, sub);
    const subCode = sub ? sub.code : null;
    const active = state.mode === 'data';
    const lookups = new Set();
    const rows = entries.map((e, i) => {
      if (e.lookup) lookups.add(e.lookup);
      const value = state.values[readValueKey(state.section, subCode, i)];
      const meaning = (v) => (e.lookup && v && LOOKUPS[e.lookup].values[v] ? `<span class="meaning">${escapeHtml(LOOKUPS[e.lookup].values[v])}</span>` : '');
      const isCurrent = active && i === state.entryIndex;
      return `<tr class="clickable${isCurrent ? ' is-current' : ''}" data-entry="${i}">
        <td class="num">${i + 1}</td>
        <td>${escapeHtml(e.label)}${e.note ? `<span class="meaning">${escapeHtml(e.note)}</span>` : ''}${isCurrent ? ' <span class="here">keypad is here</span>' : ''}</td>
        <td class="num">${e.variable ? 'up to 32' : e.digits}</td>
        <td class="num">${escapeHtml(e.def || '')}${meaning(e.def)}</td>
        <td class="num">${value !== undefined ? `${escapeHtml(value)}${meaning(value)}` : ''}</td>
      </tr>`;
    }).join('');
    const lookupTables = Array.from(lookups).map((key) => renderLookup(key, entries[state.entryIndex], subCode)).join('');
    const result = `
      <h3>${sub ? `Entries in [${escapeHtml(sub.code)}] ${escapeHtml(sub.label)}` : 'Entries, in the order the keypad asks'}</h3>
      <div class="table-wrap"><table>
        <thead><tr><th class="num">#</th><th>Entry</th><th class="num">Digits</th><th class="num">Default</th><th class="num">Your entry</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      ${lookupTables}`;
    return result;
  }

  function renderLookup(key, currentEntry, subCode) {
    const lookup = LOOKUPS[key];
    const current = state.mode === 'data' ? (state.buffer || state.values[readValueKey(state.section, subCode, state.entryIndex)] || (currentEntry && currentEntry.def)) : null;
    const rows = Object.keys(lookup.values).map((code) => `<tr class="clickable${code === current ? ' is-current' : ''}" data-value="${code}"><td class="num">${code}</td><td>${escapeHtml(lookup.values[code])}</td></tr>`).join('');
    const result = `
      <h3>${escapeHtml(lookup.title)}: what to type</h3>
      <span class="picker-label">Click a row to type that value into the current entry.</span>
      <div class="table-wrap"><table><thead><tr><th class="num">Value</th><th>Meaning</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    return result;
  }

  function renderPhoneBody() {
    const value = state.mode === 'phone' ? state.buffer : state.values[readValueKey(state.section, null, 0)] || '';
    const result = `
      <h3>Number</h3>
      <p class="desc"><span class="code">${escapeHtml(value || '(empty)')}</span></p>
      <h3>HEX digits</h3>
      <div class="table-wrap"><table><thead><tr><th class="num">Keys</th><th class="num">Digit</th><th>Meaning in a phone number</th></tr></thead><tbody>
        <tr><td class="num">[*][1][*]</td><td class="num">A</td><td>Not used</td></tr>
        <tr><td class="num">[*][2][*]</td><td class="num">B</td><td>Simulated [*] key</td></tr>
        <tr><td class="num">[*][3][*]</td><td class="num">C</td><td>Simulated [#] key</td></tr>
        <tr><td class="num">[*][4][*]</td><td class="num">D</td><td>Wait for dial tone</td></tr>
        <tr><td class="num">[*][5][*]</td><td class="num">E</td><td>2-second pause</td></tr>
        <tr><td class="num">[*][6][*]</td><td class="num">F</td><td>End of number</td></tr>
      </tbody></table></div>`;
    return result;
  }

  function renderToggleBody(node) {
    const options = getOptions(node, state.section);
    const set = getToggleSet(node, state.section);
    const rows = options.map((o) => {
      const isOn = set.has(o.n);
      const keyHint = o.n > 8 ? `[9] then [${o.n - 8}]` : `[${o.n}]`;
      return `<tr class="clickable${o.future ? ' is-future' : ''}" data-option="${o.n}">
        <td class="num">${o.n}${node.pages === 2 ? `<span class="meaning">${keyHint}</span>` : ''}</td>
        <td>${escapeHtml(o.on)}</td>
        <td>${escapeHtml(o.off || '')}</td>
        <td><span class="pill ${o.def ? 'on' : 'off'}">${o.def ? 'ON' : 'OFF'}</span></td>
        <td><span class="pill ${isOn ? 'on' : 'off'}">${isOn ? 'ON' : 'OFF'}</span></td>
      </tr>`;
    }).join('');
    const result = `
      <h3>Options</h3>
      <span class="picker-label">Click a row, or press its number on the keypad, to flip it. The keypad screen shows the number when ON and a dash when OFF.</span>
      <div class="table-wrap"><table>
        <thead><tr><th class="num">Opt</th><th>When ON</th><th>When OFF</th><th>Default</th><th>Yours</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
    return result;
  }

  function renderTips(tips) {
    const result = tips && tips.length ? `<ul class="tips">${tips.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>` : '';
    return result;
  }

  function renderRelated(ids) {
    if (!ids || !ids.length) return '';
    const buttons = ids.map((id) => {
      const entry = NODE_INDEX.get(id);
      return entry ? `<button type="button" data-node="${id}"><span class="code">${escapeHtml(formatNodeCode(entry.node))}</span>${escapeHtml(entry.node.label)}</button>` : '';
    }).join('');
    const result = `<h3>Related</h3><div class="related">${buttons}</div>`;
    return result;
  }

  function renderSourceText() {
    const result = 'From the DSC PC1616/PC1832/PC1864 v4.2 installation guide. Check your version with [900]. The simulator never touches a real panel.';
    return result;
  }

  function renderSourceNote() {
    const result = `<p class="source">${renderSourceText()}</p>`;
    return result;
  }

  function updateHash() {
    const token = state.section !== null ? `s${String(state.section).padStart(3, '0')}` : state.nodeId || '';
    try {
      window.history.replaceState(null, '', token ? `#${token}` : window.location.pathname);
    } catch (e) { /* history blocked in some frames */ }
  }

  function render() {
    highlightTree();
    renderWhere();
    renderKeypad();
    renderDetail();
    updateHash();
  }

  /* ---------- search ---------- */

  function buildSearchItems() {
    const result = [];
    KEYPAD_COMMANDS.forEach((node) => result.push({ id: node.id, code: formatNodeCode(node), label: node.label, text: `${formatNodeCode(node)} ${node.label} ${node.desc}`.toLowerCase() }));
    INSTALLER_GROUPS.forEach((group) => group.sections.forEach((node) => {
      if (node.range) {
        for (let n = node.range[0]; n <= node.range[1]; n += 1) {
          const instance = describeInstance(node, n);
          result.push({ id: node.id, num: n, code: formatSection(n), label: `${node.label}: ${instance}`, text: `${n} ${String(n).padStart(3, '0')} ${node.label} ${instance} ${group.label}`.toLowerCase() });
        }
        return;
      }
      const inner = [...(node.subs || []).map((s) => `${s.label} ${s.entries.map((e) => e.label).join(' ')}`), ...(node.entries || []).map((e) => e.label), ...(node.options || []).map((o) => o.on)].join(' ');
      result.push({ id: node.id, num: node.num, code: formatSection(node.num), label: node.label, text: `${String(node.num).padStart(3, '0')} ${node.label} ${node.desc} ${group.label} ${inner}`.toLowerCase(), inner: inner.toLowerCase() });
    }));
    return result;
  }

  const SEARCH_ITEMS = buildSearchItems();
  let searchHits = [];
  let searchActive = 0;

  function findSearchHits(query) {
    const q = query.trim().toLowerCase().replace(/[[\]]/g, '');
    if (!q) return [];
    const isNumber = /^\d+$/.test(q);
    const hits = SEARCH_ITEMS.filter((item) => (isNumber ? item.code.includes(q.padStart(Math.min(3, q.length), '0')) || item.text.startsWith(q) : q.split(/\s+/).every((w) => item.text.includes(w))));
    const scoreHit = (h) => {
      if (isNumber && h.num === Number(q)) return 0;
      if (h.label.toLowerCase().includes(q)) return 1;
      if (h.inner && h.inner.includes(q)) return 2;
      return 3;
    };
    const result = hits.map((h, i) => ({ h, i, score: scoreHit(h) }))
      .sort((a, b) => a.score - b.score || a.i - b.i)
      .map((x) => x.h)
      .slice(0, 14);
    return result;
  }

  function renderSearch() {
    searchHits = findSearchHits(els.search.value);
    searchActive = 0;
    if (!searchHits.length) {
      els.results.hidden = !els.search.value.trim();
      els.results.innerHTML = els.search.value.trim() ? '<p class="picker-label" style="padding:8px">No match. Try a number like 013 or a word like chime.</p>' : '';
      return;
    }
    els.results.hidden = false;
    els.results.innerHTML = searchHits.map((h, i) => `<button type="button" data-hit="${i}" class="${i === 0 ? 'is-active' : ''}"><span class="code">${escapeHtml(h.code)}</span><span>${escapeHtml(h.label)}</span></button>`).join('');
  }

  function chooseSearchHit(index) {
    const hit = searchHits[index];
    if (!hit) return;
    els.search.value = '';
    els.results.hidden = true;
    navigateToNode(hit.id, hit.num);
  }

  /* ---------- events ---------- */

  function handleClick(event) {
    const target = event.target.closest('[data-node],[data-section],[data-sub],[data-entry],[data-option],[data-value],[data-crumb],[data-hit],[data-key]');
    if (!target) return;
    const d = target.dataset;
    if (d.key) { pressKey(d.key); return; }
    if (d.hit !== undefined) { chooseSearchHit(Number(d.hit)); return; }
    if (d.node) { navigateToNode(d.node); closeTreeOnPhone(); return; }
    if (d.section) { navigateToNode(state.nodeId, Number(d.section)); return; }
    if (d.sub) { navigateToSub(d.sub); return; }
    if (d.value) { applyLookupValue(d.value); return; }
    if (d.entry) { navigateToEntry(Number(d.entry)); return; }
    if (d.option) {
      const node = NODE_INDEX.get(state.nodeId).node;
      if (state.mode !== 'toggle') enterSection(state.section);
      const n = Number(d.option);
      if (node.pages === 2) state.page = n > 8 ? 2 : 1;
      flipOption(node, state.section, n);
      render();
      return;
    }
    if (d.crumb) followCrumb(d.crumb);
  }

  function followCrumb(action) {
    if (action === 'ready') { resetToReady(); render(); return; }
    if (action === 'star') { resetToReady(); state.mode = 'star'; state.path = [{ key: '*', label: '' }]; render(); return; }
    if (action === 'installer') { openSectionPrompt(); render(); return; }
    const [kind, value] = action.split(':');
    if (kind === 'node') { navigateToNode(value); return; }
    if (kind === 'section') { navigateToNode(state.nodeId, Number(value)); return; }
    if (kind === 'sub') navigateToSub(value);
  }

  function closeTreeOnPhone() {
    els.tree.classList.remove('is-open');
    els.treeToggle.setAttribute('aria-expanded', 'false');
  }

  function handleKeyboard(event) {
    if (event.target === els.search || event.metaKey || event.ctrlKey || event.altKey) return;
    const map = { ArrowLeft: '<', ArrowRight: '>', Escape: '#' };
    const key = map[event.key] || event.key;
    if (!/^[0-9*#<>]$/.test(key)) return;
    event.preventDefault();
    const button = document.querySelector(`.keys [data-key="${CSS.escape(key)}"]`);
    if (button) {
      button.classList.add('pressed');
      setTimeout(() => button.classList.remove('pressed'), 120);
    }
    pressKey(key);
  }

  function handleSearchKeys(event) {
    if (event.key === 'Enter') { event.preventDefault(); chooseSearchHit(searchActive); return; }
    if (event.key === 'Escape') { els.search.value = ''; els.results.hidden = true; return; }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    searchActive = (searchActive + (event.key === 'ArrowDown' ? 1 : -1) + searchHits.length) % Math.max(1, searchHits.length);
    els.results.querySelectorAll('button').forEach((b, i) => b.classList.toggle('is-active', i === searchActive));
  }

  function clearWorksheet() {
    state.values = {};
    state.toggles = {};
    state.bypassed.clear();
    saveWorksheet();
    state.flash = ['Entries cleared', 'Back to defaults'];
    render();
  }

  function openFromHash() {
    const hash = window.location.hash.replace('#', '');
    const sectionMatch = /^s(\d{3})$/.exec(hash);
    if (sectionMatch && findSectionNode(Number(sectionMatch[1]))) {
      const result = { section: Number(sectionMatch[1]) };
      return result;
    }
    const result = NODE_INDEX.has(hash) ? { nodeId: hash } : null;
    return result;
  }

  function bootApp() {
    renderTree();
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyboard);
    els.search.addEventListener('input', renderSearch);
    els.search.addEventListener('keydown', handleSearchKeys);
    els.search.addEventListener('blur', () => setTimeout(() => { els.results.hidden = true; }, 150));
    els.treeToggle.addEventListener('click', () => {
      const open = els.tree.classList.toggle('is-open');
      els.treeToggle.setAttribute('aria-expanded', String(open));
    });
    document.getElementById('reset-keypad').addEventListener('click', () => { resetToReady(); render(); });
    document.getElementById('clear-entries').addEventListener('click', clearWorksheet);

    const fromHash = openFromHash();
    if (fromHash && fromHash.section) {
      openSectionPrompt();
      enterSection(fromHash.section);
      render();
      return;
    }
    if (fromHash && fromHash.nodeId) {
      navigateToNode(fromHash.nodeId);
      return;
    }
    /* Open in a realistic working state: inside [001], about to program zone 1. */
    openSectionPrompt();
    enterSection(1);
    render();
  }

  bootApp();
}());
