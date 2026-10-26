/*
 * PC1616 / PC1832 / PC1864 menu data.
 * Source: DSC PowerSeries PC1616/PC1832/PC1864 v4.2 NA Installation Guide (29007359R003).
 * Section numbers and defaults are the same across v4.x. Check your panel version with [*][8][installer code][900].
 */

const ZONE_TYPES = {
  '00': 'Null zone (not used)',
  '01': 'Delay 1 (entry/exit door, follows Entry Delay 1)',
  '02': 'Delay 2 (follows Entry Delay 2)',
  '03': 'Instant',
  '04': 'Interior',
  '05': 'Interior Stay/Away (bypassed when armed Stay)',
  '06': 'Delay Stay/Away (bypassed when armed Stay)',
  '07': 'Delayed 24-hour fire (hardwired)',
  '08': 'Standard 24-hour fire (hardwired)',
  '09': '24-hour supervisory',
  '10': '24-hour supervisory buzzer',
  '11': '24-hour burglary',
  '12': '24-hour hold-up (silent)',
  '13': '24-hour gas',
  '14': '24-hour heat',
  '15': '24-hour medical (silent)',
  '16': '24-hour panic',
  '17': '24-hour emergency',
  '18': '24-hour sprinkler',
  '19': '24-hour water',
  '20': '24-hour freeze',
  '21': '24-hour latching tamper',
  '22': 'Momentary keyswitch arm',
  '23': 'Maintained keyswitch arm',
  '24': 'For future use',
  '25': 'Interior/Delay',
  '26': '24-hour non-alarm',
  '29': 'Auto-verified fire',
  '30': 'Fire supervisory',
  '31': 'Day zone',
  '32': 'Instant Stay/Away',
  '35': '24-hour bell/buzzer',
  '36': '24-hour non-latching tamper',
  '37': 'Night zone',
  '87': 'Delayed 24-hour fire (wireless/addressable)',
  '88': 'Standard 24-hour fire (wireless/addressable)',
};

const PGM_TYPES = {
  '01': 'Burglary and fire bell output',
  '02': 'For future use',
  '03': 'Sensor reset [*][7][2]',
  '04': '2-wire smoke (PGM2 only)',
  '05': 'System armed status',
  '06': 'Ready to arm',
  '07': 'Keypad buzzer follow',
  '08': 'Courtesy pulse',
  '09': 'System trouble output',
  '10': 'System event (strobe)',
  '11': 'System tamper',
  '12': 'TLM and alarm',
  '13': 'Kissoff',
  '14': 'Ground start pulse',
  '15': 'Remote operation (DLS)',
  '16': 'For future use',
  '17': 'Away armed status',
  '18': 'Stay armed status',
  '19': 'Command output 1 [*][7][1]',
  '20': 'Command output 2 [*][7][2]',
  '21': 'Command output 3 [*][7][3]',
  '22': 'Command output 4 [*][7][4]',
  '23': '24-hour silent input (PGM2 only)',
  '24': '24-hour audible input (PGM2 only)',
  '25': 'Delayed fire and burglary',
  '26': 'Battery test output',
  '28': 'Hold-up output',
  '29': 'Zone follower (zones 1-8)',
  '30': 'Partition status alarm memory',
  '31': 'Alternate communicator',
  '32': 'Open after alarm',
  '33': 'Bell status and programming access',
  '34': 'Away armed with no zone bypassed',
  '35': 'Zone follower (zones 9-16)',
  '36': 'Zone follower (zones 17-24)',
  '37': 'Zone follower (zones 25-32)',
  '38': 'Zone follower (zones 33-40)',
  '39': 'Zone follower (zones 41-48)',
  '40': 'Zone follower (zones 49-56)',
  '41': 'Zone follower (zones 57-64)',
};

const FUNCTION_KEY_TYPES = {
  '00': 'Not used', '01': 'Select partition 1', '02': 'Select partition 2', '03': 'Stay arm', '04': 'Away arm',
  '05': '[*][9] No-entry arm', '06': '[*][4] Chime on/off', '07': '[*][6][code][4] System test', '08': '[*][1] Bypass mode',
  '09': '[*][2] Trouble display', '10': '[*][3] Alarm memory', '11': '[*][5] Access code programming', '12': '[*][6] User functions',
  '13': 'Command output 1 [*][7][1]', '14': 'Command output 2 [*][7][2] / sensor reset', '15': 'Global stay arming',
  '16': '[*][0] Quick exit', '17': '[*][1] Reactivate Stay/Away zones', '18': 'Global away arming', '19': 'Command output 3 [*][7][3]',
  '20': 'For future use', '21': 'Command output 4 [*][7][4]', '22': 'Global disarming', '23': 'Bypass recall',
  '24': 'Recall bypass group', '25': 'For future use', '26': 'Time and date', '27': 'Select partition 3', '28': 'Select partition 4',
  '29': 'Select partition 5', '30': 'Select partition 6', '31': 'Select partition 7', '32': 'Select partition 8', '33': 'Activate local PGM',
};

const COMM_FORMATS = {
  '01': '20 BPS, 1400 Hz handshake', '02': '20 BPS, 2300 Hz handshake', '03': 'DTMF Contact ID', '04': 'SIA FSK',
  '05': 'Pager', '06': 'Residential dial', '07': '10 BPS, 1400 Hz handshake', '08': '10 BPS, 2300 Hz handshake',
  '09': 'Private line', '10': 'Scantronics', '11': 'For future use', '12': 'For future use', '13': 'CESA 200',
};

const LOOKUPS = {
  zoneTypes: { title: 'Zone types', values: ZONE_TYPES },
  pgmTypes: { title: 'PGM output types', values: PGM_TYPES },
  functionKeys: { title: 'Function key options', values: FUNCTION_KEY_TYPES },
  commFormats: { title: 'Communicator formats', values: COMM_FORMATS },
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* ---------- helpers that build entry lists ---------- */

function buildNumberedEntries(prefix, from, to, digits, def, lookup) {
  const result = [];
  for (let n = from; n <= to; n += 1) {
    result.push({ label: `${prefix} ${n}`, digits, def, lookup });
  }
  return result;
}

function buildNamedEntries(names, digits, def) {
  const result = names.map((label) => ({ label, digits, def }));
  return result;
}

function buildFutureOptions(numbers) {
  const result = numbers.map((n) => ({ n, on: 'For future use', off: '', def: false, future: true }));
  return result;
}

function sortOptions(options) {
  const result = options.slice().sort((a, b) => a.n - b.n);
  return result;
}

const ZONE_DEF_DEFAULTS = { 1: '01', 2: '03', 3: '03', 4: '03', 5: '04', 6: '04', 7: '04', 8: '04' };

function buildZoneDefinitionEntries(section) {
  const first = (section - 1) * 16 + 1;
  const result = [];
  for (let zone = first; zone < first + 16; zone += 1) {
    result.push({ label: `Zone ${zone}`, digits: 2, def: ZONE_DEF_DEFAULTS[zone] || '00', lookup: 'zoneTypes' });
  }
  return result;
}

function buildPartitionTimeEntries() {
  const result = [
    { label: 'Entry Delay 1 (seconds)', digits: 3, def: '030' },
    { label: 'Entry Delay 2 (seconds)', digits: 3, def: '045' },
    { label: 'Exit Delay (seconds)', digits: 3, def: '120' },
  ];
  return result;
}

const CALL_DIRECTION_OPTIONS = [
  { n: 1, on: '1st telephone number', off: '', def: true },
  { n: 2, on: '2nd telephone number', off: '', def: false },
  { n: 3, on: 'Not used', off: '', def: false },
  { n: 4, on: 'Not used', off: '', def: false },
  { n: 5, on: 'Alternate communicator', off: '', def: true },
  ...buildFutureOptions([6, 7, 8]),
];

function buildCallDirectionOptions(defaultsOn) {
  const result = CALL_DIRECTION_OPTIONS.map((o) => ({ ...o, def: defaultsOn ? o.def : false }));
  return result;
}

/* ---------- the menu ---------- */

const KEYPAD_COMMANDS = [
  {
    id: 'k1', keys: ['*', '1'], label: 'Bypass zones',
    desc: 'When disarmed, opens bypass mode: enter a 2-digit zone number to bypass or unbypass it, then [#] to finish. When armed Stay, [*][1] re-activates the Stay/Away zones (switches to Away).',
    entries: [
      { label: '[zone 01-64]', note: 'Toggle bypass on that zone' },
      { label: '[99]', note: 'Bypass recall: recall the last group of bypassed zones' },
      { label: '[00]', note: 'Clear all bypasses' },
      { label: '[95]', note: 'Save the current bypass group' },
      { label: '[91]', note: 'Recall the saved bypass group' },
    ],
    tips: ['If [015] option 5 is ON, a user code is required after [*][1].', 'Hold-up zones cannot be in a bypass group.'],
    related: ['s013'],
  },
  {
    id: 'k2', keys: ['*', '2'], label: 'Trouble display',
    desc: 'Shows which trouble conditions are present. On an LED keypad the zone lights 1-8 show the trouble type. Press the number to drill into that trouble.',
    entries: [
      { label: '[1] Service required', note: 'Press [1] again for detail: 1 low battery, 2 bell circuit, 3 general system trouble, 4 general system tamper, 5 module supervision, 6 RF jam, 7 PC5204 low battery, 8 PC5204 AC failure' },
      { label: '[2] AC failure', note: 'No AC power at the panel' },
      { label: '[3] Telephone line trouble', note: 'TLM. Turn off [015] option 7 if no phone line is connected' },
      { label: '[4] Failure to communicate', note: 'Panel could not reach the central station' },
      { label: '[5] Zone fault', note: 'Press [5] to see which zones' },
      { label: '[6] Zone tamper', note: 'Press [6] to see which zones' },
      { label: '[7] Wireless low battery', note: 'Press [7] repeatedly: zones, handheld keypads, wireless keys' },
      { label: '[8] Loss of clock', note: 'Set time with [*][6][master code][1]' },
    ],
    related: ['s015', 'k6'],
  },
  { id: 'k3', keys: ['*', '3'], label: 'Alarm memory', desc: 'Shows the zones that went into alarm during the last armed period. To clear the Memory light, arm then disarm.' },
  { id: 'k4', keys: ['*', '4'], label: 'Door chime on/off', desc: 'Toggles door chime. Three quick beeps means chime is now ON; one long 2-second tone means it is now OFF.', related: ['s101'] },
  {
    id: 'k5', keys: ['*', '5', 'Master code'], label: 'User codes',
    desc: 'Program user access codes. After the master code, enter the 2-digit user number, then the new 4-digit code (6 digits if [701] option 5 is ON). Press [*] instead of a code to delete it.',
    entries: [
      { label: '[01]-[39], [41]-[95]', note: 'General user codes (arm/disarm)' },
      { label: '[40]', note: 'Master code (all functions). Default 1234' },
      { label: '[98] + user number', note: 'Partition assignment: press 1-8 to toggle partitions' },
      { label: '[99] + user number', note: 'User attributes: press 1-8 to toggle' },
    ],
    attributes: [
      { n: 1, on: 'Can enter user code programming (supervisor)' },
      { n: 2, on: 'Duress code: sends a duress report when used' },
      { n: 3, on: 'Can manually bypass zones' },
      { n: 4, on: 'Escort5580 remote access' },
      { n: 5, on: 'For future use' },
      { n: 6, on: 'For future use' },
      { n: 7, on: 'Bell squawk on arm/disarm' },
      { n: 8, on: 'One-time use code (resets at midnight)' },
    ],
    related: ['s007', 's015'],
  },
  {
    id: 'k6', keys: ['*', '6', 'Master code'], label: 'User functions',
    desc: 'After the master code, press the number for the function. On LCD keypads you can also scroll with the arrow keys and press [*].',
    entries: [
      { label: '[1] Time and date', note: 'Enter HH MM MM DD YY in 24-hour time. 6:00 pm on 29 June 2025 = 18 00 06 29 25' },
      { label: '[2] Auto-arm/disarm on/off', note: 'Three beeps = enabled, long tone = disabled' },
      { label: '[3] Auto-arm time', note: 'Press day (1=Sunday ... 7=Saturday) then HH MM' },
      { label: '[4] System test', note: 'Bell, buzzer and lights for 2 seconds, battery test, test report' },
      { label: '[5] Enable DLS window', note: 'Opens a 1 or 6 hour downloading window ([702] option 7)' },
      { label: '[6] User-initiated DLS call', note: 'Panel calls the DLS computer' },
      { label: '[7]-[8]', note: 'For future use' },
      { label: 'LCD extras', note: 'Event buffer, brightness, contrast and buzzer level by scrolling' },
    ],
    tips: ['If [019] option 7 is ON, every user code can open this menu, not only the master code.'],
    related: ['s019', 's401'],
  },
  {
    id: 'k7', keys: ['*', '7', '1-4'], label: 'Command outputs',
    desc: 'Activates PGM outputs set to command output 1-4. [*][7][2] is normally fire/smoke sensor reset.',
    entries: [
      { label: '[1]', note: 'Command output 1 (PGM type 19)' },
      { label: '[2]', note: 'Command output 2 / sensor reset (PGM type 20 or 03)' },
      { label: '[3]', note: 'Command output 3 (PGM type 21)' },
      { label: '[4]', note: 'Command output 4 (PGM type 22)' },
    ],
    related: ['s009', 's501'],
  },
  {
    id: 'k8', keys: ['*', '8', 'Installer code'], label: 'Installer programming',
    desc: 'Enter installer programming. The default installer code is 5555. The Armed light ON means the panel is waiting for a 3-digit section number. The Ready light ON means it is waiting for data inside a section.',
    tips: ['You cannot enter installer programming while armed or in alarm.', 'Press [#] when the Armed light is on to leave installer programming.'],
    related: ['s006'],
  },
  { id: 'k9', keys: ['*', '9', 'User code'], label: 'No-entry arming', desc: 'Arms in Stay mode with no entry delay: Delay zones act as Instant zones. The Armed light flashes to show it.' },
  { id: 'k0', keys: ['*', '0'], label: 'Quick arm / quick exit', desc: 'Disarmed: arms without a code ([015] option 4). Armed: Quick Exit lets one Delay zone open once in the next 2 minutes ([015] option 3).', related: ['s015'] },
];

const INSTALLER_GROUPS = [
  {
    id: 'g-keypad', label: 'Keypads',
    sections: [
      {
        id: 's000', num: 0, label: 'Keypad enrollment', kind: 'sub', subDigits: 1,
        desc: 'Set the partition/slot and the five function keys for THIS keypad. Do it at each keypad.',
        subs: [
          { code: '0', label: 'Partition and slot', entries: [{ label: 'Partition (0-8) + slot (1-8)', digits: 2, def: '11', note: 'e.g. 31 = partition 3, slot 1' }] },
          { code: '1', label: 'Function key 1', entries: [{ label: 'Key 1 function', digits: 2, def: '03', lookup: 'functionKeys' }] },
          { code: '2', label: 'Function key 2', entries: [{ label: 'Key 2 function', digits: 2, def: '04', lookup: 'functionKeys' }] },
          { code: '3', label: 'Function key 3', entries: [{ label: 'Key 3 function', digits: 2, def: '06', lookup: 'functionKeys' }] },
          { code: '4', label: 'Function key 4', entries: [{ label: 'Key 4 function', digits: 2, def: '14', lookup: 'functionKeys' }] },
          { code: '5', label: 'Function key 5', entries: [{ label: 'Key 5 function', digits: 2, def: '16', lookup: 'functionKeys' }] },
        ],
        tips: ['Keypad defaults: partition/slot 11 on ICON/LED, 18 on full-message LCD keypads.', 'After changing slots, enter [902] so the panel rescans the modules.'],
        related: ['s020', 's902'],
      },
      { id: 's020', num: 20, label: 'Keypad zone assignment', kind: 'data', desc: 'Assign a zone number to the zone input on each keypad, by slot. Valid 00-64.', entries: buildNumberedEntries('Keypad slot', 1, 8, 2, '00') },
      {
        id: 's012', num: 12, label: 'Keypad lockout', kind: 'data', desc: 'Lock all keypads after too many wrong codes.',
        entries: [
          { label: 'Invalid codes before lockout', digits: 3, def: '000', note: '000 = feature off' },
          { label: 'Lockout duration (minutes)', digits: 3, def: '000' },
        ],
      },
    ],
  },
  {
    id: 'g-zones', label: 'Zones',
    sections: [
      {
        id: 's001', range: [1, 4], label: 'Zone definitions', kind: 'data',
        describe: (n) => `Zones ${(n - 1) * 16 + 1}-${n * 16}`,
        desc: 'Sets what TYPE each zone is. Each section holds 16 zones, 2 digits each. The keypad does not show the zone number while you type, so count carefully. After the 16th entry the panel beeps 5 times and leaves the section.',
        entriesFor: buildZoneDefinitionEntries,
        tips: ['[001] = zones 1-16, [002] = 17-32, [003] = 33-48, [004] = 49-64.', 'Changing a zone type resets that zone\'s attributes in [101]-[164]. Check them after.', 'Press [#] to leave early. Everything typed so far is saved.'],
        related: ['s101', 's202', 's013'],
      },
      {
        id: 's101', range: [101, 164], label: 'Zone attributes', kind: 'toggle', pages: 2,
        describe: (n) => `Zone ${n - 100}`,
        desc: 'Fine-tune one zone. Section number = 100 + zone number, so zone 5 is [105]. Options 1-8 show first. Press [9] to flip to options 9-16 (Ready and Armed lights both ON).',
        options: sortOptions([
          { n: 1, on: 'Audible alarm (bell)', off: 'Silent', def: true },
          { n: 2, on: 'Steady bell (burglary)', off: 'Pulsed bell (fire)', def: true },
          { n: 3, on: 'Door chime on open/close', off: 'No chime', def: true },
          { n: 4, on: 'Can be bypassed with [*][1]', off: 'Cannot be bypassed', def: true },
          { n: 5, on: 'Force arm: can arm while open', off: 'Must be closed to arm', def: false },
          { n: 6, on: 'Swinger shutdown', off: 'Always report', def: true },
          { n: 7, on: 'Transmission delay', off: 'Report immediately', def: false },
          { n: 8, on: 'Wireless/addressable zone', off: 'Hardwired zone', def: false },
          { n: 9, on: 'Cross zone', off: 'Normal', def: false },
          ...buildFutureOptions([10, 11, 12, 13]),
          { n: 14, on: 'Normally closed loop (zones 1-8 only)', off: 'Follow [013]', def: false },
          { n: 15, on: 'Single EOL resistor (zones 1-8 only)', off: 'Follow [013]', def: false },
          { n: 16, on: 'Double EOL resistor (zones 1-8 only)', off: 'Follow [013]', def: false },
        ]),
        tips: ['Defaults shown here are typical. The real defaults depend on the zone type set in [001]-[004].', 'Option 8 must be ON for a wireless zone.'],
        related: ['s001', 's013', 's030'],
      },
      {
        id: 's030', num: 30, label: 'Fast loop response', kind: 'toggle', desc: 'Per-zone loop response for zones 1-8. ON = 36 ms (fast), OFF = 400 ms (normal).',
        options: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ n, on: `Zone ${n} fast (36 ms)`, off: `Zone ${n} normal (400 ms)`, def: false })),
      },
    ],
  },
  {
    id: 'g-times', label: 'Times and codes',
    sections: [
      {
        id: 's005', num: 5, label: 'System times', kind: 'sub', subDigits: 2,
        desc: 'Entry and exit delays per partition, plus the bell cut-off. Enter the 2-digit sub-section first, then 3-digit values.',
        subs: [
          ...[1, 2, 3, 4, 5, 6, 7, 8].map((p) => ({ code: `0${p}`, label: `Partition ${p} delays`, entries: buildPartitionTimeEntries() })),
          { code: '09', label: 'Bell cut-off', entries: [{ label: 'Bell cut-off (minutes)', digits: 3, def: '004' }] },
        ],
        tips: ['A single-partition house only needs sub-section [01] and [09].', 'Valid 001-255 seconds (045-255 for SIA CP-01 panels).'],
        related: ['s001'],
      },
      { id: 's006', num: 6, label: 'Installer code', kind: 'data', desc: 'The code used in [*][8]. Default 5555 (555555 with 6-digit codes).', entries: [{ label: 'Installer code', digits: 4, def: '5555' }], tips: ['Write it down. If you forget it and installer lockout [990] is on, a hardware default will not work.'] },
      { id: 's007', num: 7, label: 'Master code', kind: 'data', desc: 'User code 40. Default 1234.', entries: [{ label: 'Master code', digits: 4, def: '1234' }], related: ['k5', 's015'] },
      { id: 's008', num: 8, label: 'Maintenance code', kind: 'data', desc: 'Can arm any partition but only disarm one that is in alarm. Default AAAA = not programmed.', entries: [{ label: 'Maintenance code', digits: 4, def: 'AAAA' }] },
    ],
  },
  {
    id: 'g-pgm', label: 'Outputs (PGM)',
    sections: [
      { id: 's009', num: 9, label: 'PGM 1-2 type', kind: 'data', desc: 'Output type for the main panel PGM1 and PGM2.', entries: [{ label: 'PGM 1', digits: 2, def: '19', lookup: 'pgmTypes' }, { label: 'PGM 2', digits: 2, def: '10', lookup: 'pgmTypes' }], related: ['s501', 's551'] },
      { id: 's010', num: 10, label: 'PGM 3-10 type', kind: 'data', desc: 'PGM3-4 are on the PC1864 board. PGM5-10 need a PC5208.', entries: buildNumberedEntries('PGM', 3, 10, 2, '01', 'pgmTypes'), related: ['s501', 's551'] },
      { id: 's011', num: 11, label: 'PGM 11-14 type', kind: 'data', desc: 'High-current outputs on a PC5204.', entries: buildNumberedEntries('PGM', 11, 14, 2, '01', 'pgmTypes'), related: ['s501', 's551'] },
      {
        id: 's501', range: [501, 514], label: 'PGM attributes', kind: 'toggle', describe: (n) => `PGM ${n - 500}`,
        desc: 'Fine-tune one PGM output. Section = 500 + PGM number. Which options apply depends on the PGM type.',
        options: [
          { n: 1, on: 'Type-specific (trouble/event types 09, 10, 31)', off: '', def: false },
          { n: 2, on: 'Type-specific (trouble/event types 09, 10, 31)', off: '', def: false },
          { n: 3, on: 'True output (switches to ground)', off: 'Inverted', def: true },
          { n: 4, on: 'Follows PGM timer [170]', off: 'Latching on/off', def: false },
          { n: 5, on: 'Code required for [*][7]', off: 'No code required', def: false },
          { n: 6, on: 'Type-specific (types 09, 10, 31)', off: '', def: false },
          { n: 7, on: 'Type-specific (types 09, 10, 31)', off: '', def: false },
          { n: 8, on: 'Type-specific: timer, or AND logic for zone followers', off: '', def: false },
        ],
        tips: ['Defaults depend on the PGM type: option 3 is ON for most types, options 4 and 5 are ON for command output 1.', 'Type 09 trouble output: options 1-8 = service, AC, phone line, FTC, zone fault, zone tamper, wireless low battery, loss of clock.', 'Type 10 event output: options 1-7 = burglary, fire, panic, medical, supervisory, priority, hold-up. Option 8 = follow timer.'],
        related: ['s009', 's170'],
      },
      { id: 's551', range: [551, 564], label: 'PGM partition assignment', kind: 'toggle', describe: (n) => `PGM ${n - 550}`, desc: 'Which partitions the PGM follows. For zone-follower types this picks the zones instead.', options: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ n, on: `Partition ${n} (or zone ${n} of the follower group)`, off: '', def: n === 1 })) },
      { id: 's170', num: 170, label: 'PGM output timer', kind: 'data', desc: 'How long timed PGM outputs stay on.', entries: [{ label: 'Seconds', digits: 3, def: '005' }] },
      { id: 's171', num: 171, label: 'Tamper PGM timer', kind: 'data', desc: 'How long a tamper latches the tamper PGM.', entries: [{ label: 'Minutes', digits: 3, def: '000' }] },
    ],
  },
  {
    id: 'g-options', label: 'System options',
    sections: [
      {
        id: 's013', num: 13, label: '1st system options', kind: 'toggle', desc: 'Wiring style, trouble display and fire signal.',
        options: [
          { n: 1, on: 'Normally closed loops (no resistors)', off: '5.6K end-of-line resistors', def: false },
          { n: 2, on: 'Double EOL resistors', off: 'Single EOL resistors', def: false },
          { n: 3, on: 'Show all troubles while armed', off: 'Only fire troubles while armed', def: true },
          { n: 4, on: 'Tamper/fault shows trouble only', off: 'Tamper/fault also shows zone open', def: false },
          { n: 5, on: 'Auto-arm schedule in [*][6]', off: 'Auto-arm in installer only', def: true },
          { n: 6, on: 'Audible exit fault', off: 'Normal entry beeps', def: true },
          { n: 7, on: 'Event buffer follows swinger shutdown', off: 'Log every alarm', def: true },
          { n: 8, on: 'Temporal three fire signal', off: 'Pulsed fire signal', def: false },
        ],
        tips: ['Option 1 ON lets you wire zones without resistors.'],
        related: ['s101'],
      },
      {
        id: 's014', num: 14, label: '2nd system options', kind: 'toggle', desc: 'Bell squawks and exit/entry beeps.',
        options: [
          { n: 1, on: 'Squawk bell on arm/disarm', off: 'No squawk', def: false },
          { n: 2, on: 'Squawk during auto-arm', off: 'No squawk', def: false },
          { n: 3, on: 'Squawk during exit delay', off: 'No squawk', def: false },
          { n: 4, on: 'Squawk during entry delay', off: 'No squawk', def: false },
          { n: 5, on: 'Squawk on trouble', off: 'No squawk', def: false },
          { n: 6, on: 'Audible exit delay with urgency', off: 'Silent exit delay', def: true },
          { n: 7, on: 'Exit delay termination', off: 'Full exit delay', def: false },
          { n: 8, on: 'Fire bell continuous', off: 'Fire bell follows cut-off', def: false },
        ],
      },
      {
        id: 's015', num: 15, label: '3rd system options', kind: 'toggle', desc: 'Keypad keys, quick arm, bypass code and phone line monitoring.',
        options: [
          { n: 1, on: '[F] fire key enabled', off: 'Fire key disabled', def: true },
          { n: 2, on: '[P] panic key audible', off: 'Panic key silent', def: false },
          { n: 3, on: 'Quick exit enabled', off: 'Quick exit disabled', def: false },
          { n: 4, on: 'Quick arm, no code needed', off: 'Code needed to arm', def: true },
          { n: 5, on: 'Code required for bypass', off: 'No code for bypass', def: false },
          { n: 6, on: 'Master code changeable only by installer', off: 'Master code changeable by user', def: false },
          { n: 7, on: 'Telephone line monitoring (TLM)', off: 'TLM off', def: true },
          { n: 8, on: 'TLM trouble sounds bell when armed', off: 'TLM trouble beeps keypad', def: false },
        ],
        tips: ['No phone line connected? Turn option 7 OFF, or trouble [3] stays on.'],
        related: ['k2'],
      },
      {
        id: 's016', num: 16, label: '4th system options', kind: 'toggle', desc: 'AC trouble display, keypad blanking and backlight.',
        options: [
          { n: 1, on: 'AC trouble displayed', off: 'AC not supervised', def: true },
          { n: 2, on: 'Trouble light flashes on AC fail', off: 'Steady trouble light', def: false },
          { n: 3, on: 'Keypad blanks after 30 s', off: 'No blanking', def: false },
          { n: 4, on: 'Code needed to un-blank', off: 'Any key un-blanks', def: false },
          { n: 5, on: 'Keypad backlight on', off: 'Backlight off', def: true },
          { n: 6, on: 'Power save (blank on AC fail)', off: 'Normal', def: false },
          { n: 7, on: 'Bypass light shown while armed', off: 'Bypass light off when armed', def: false },
          { n: 8, on: 'Keypad tampers supervised', off: 'Not supervised', def: false },
        ],
      },
      {
        id: 's017', num: 17, label: '5th system options', kind: 'toggle', desc: 'Wireless keys, RF jam, double hit, late to close, daylight saving.',
        options: [
          { n: 1, on: 'Wireless keys NOT tied to user codes', off: 'Wireless key 1 = user 17, etc.', def: true },
          { n: 2, on: 'RF jam logged after 5 min', off: 'After 30 s', def: false },
          { n: 3, on: 'RF jam beeps keypad', off: 'Silent', def: false },
          { n: 4, on: 'Double hit enabled', off: 'Disabled', def: false },
          { n: 5, on: 'Late to close report', off: 'Disabled', def: false },
          { n: 6, on: 'Daylight saving auto-adjust', off: 'Disabled', def: false },
          ...buildFutureOptions([7]),
          { n: 8, on: 'Squawk on Away arming only', off: 'Squawk on all arming', def: false },
        ],
        related: ['s168'],
      },
      {
        id: 's018', num: 18, label: '6th system options', kind: 'toggle', desc: 'Test exception, buzzer follows bell, cross zoning, exit restart.',
        options: [
          { n: 1, on: 'Test transmission exception', off: 'Always send test', def: false },
          ...buildFutureOptions([2, 3, 4]),
          { n: 5, on: 'Keypad buzzer follows bell', off: 'Bell only', def: false },
          { n: 6, on: 'Cross zoning', off: 'Police code', def: false },
          { n: 7, on: 'Exit delay restart', off: 'No restart', def: false },
          { n: 8, on: 'AC trouble beeps', off: 'No AC beeps', def: false },
        ],
      },
      {
        id: 's019', num: 19, label: '7th system options', kind: 'toggle', desc: 'Trouble latching, first alarm display, green LED meaning, [*][6] access.',
        options: [
          ...buildFutureOptions([1]),
          { n: 2, on: 'Trouble light latches', off: 'Trouble follows restore', def: false },
          { n: 3, on: 'Show first zone in alarm only', off: 'Show all alarm zones', def: false },
          ...buildFutureOptions([4, 5]),
          { n: 6, on: 'Green LED shows AC power', off: 'Green LED shows Ready', def: false },
          { n: 7, on: 'All users can use [*][6]', off: 'Master code only', def: false },
          ...buildFutureOptions([8]),
        ],
      },
      {
        id: 's021', num: 21, label: '8th system options', kind: 'toggle', desc: 'Entry delay code blocking and keyswitch disarming.',
        options: [
          { n: 1, on: 'Codes blocked during entry delay', off: 'Codes accepted', def: false },
          ...buildFutureOptions([2, 3, 4, 5]),
          { n: 6, on: 'Keyswitch disarms only in entry delay', off: 'Keyswitch disarms any time', def: false },
          ...buildFutureOptions([7, 8]),
        ],
      },
      {
        id: 's022', num: 22, label: '9th system options', kind: 'toggle', desc: 'Code for [*][1]/[2]/[3], hold-up bypass, stay exit beeps.',
        options: [
          { n: 1, on: 'Code needed for [*][1], [*][2], [*][3]', off: 'No code needed', def: false },
          ...buildFutureOptions([2, 3]),
          { n: 4, on: 'Only master code bypasses hold-up zones', off: 'Any code', def: false },
          ...buildFutureOptions([5]),
          { n: 6, on: 'RF delinquency enabled', off: 'Disabled', def: false },
          ...buildFutureOptions([7]),
          { n: 8, on: 'Stay arming beeps during exit', off: 'Stay arming silent', def: false },
        ],
      },
      {
        id: 's023', num: 23, label: '10th system options', kind: 'toggle', desc: 'Fire key, test transmissions, away-to-stay, trouble beeps, keyswitch.',
        options: [
          { n: 1, on: 'Fire key beeps only', off: 'Fire key beeps and bell', def: false },
          { n: 2, on: '200 baud open/close identifier', off: 'Off', def: false },
          { n: 3, on: 'Test transmission only when armed', off: 'Armed or disarmed', def: false },
          { n: 4, on: 'Test cycle in hours', off: 'Test cycle in days', def: false },
          { n: 5, on: 'Away to Stay switching disabled', off: 'Switching allowed', def: false },
          { n: 6, on: '2-way audio not cut by new event', off: 'New event cuts audio', def: false },
          { n: 7, on: 'Trouble beeps silent', off: 'Beeps every 10 s', def: false },
          { n: 8, on: 'Keyswitch always arms Away', off: 'Stay or Away', def: false },
        ],
      },
    ],
  },
  {
    id: 'g-sched', label: 'Clock and schedules',
    sections: [
      { id: 's168', num: 168, label: 'Daylight saving start', kind: 'data', desc: 'When the clock moves forward. Needs [017] option 6 ON.', entries: [{ label: 'Month (001-012)', digits: 3, def: '003' }, { label: 'Week (000 = use day; 001-005)', digits: 3, def: '002' }, { label: 'Day', digits: 3, def: '000' }, { label: 'Hour (000-022)', digits: 3 }, { label: 'Hours to add (001-002)', digits: 3 }], related: ['s017'] },
      { id: 's169', num: 169, label: 'Standard time start', kind: 'data', desc: 'When the clock moves back.', entries: [{ label: 'Month (001-012)', digits: 3, def: '011' }, { label: 'Week (000 = use day; 001-005)', digits: 3, def: '001' }, { label: 'Day', digits: 3 }, { label: 'Hour (000-023)', digits: 3 }, { label: 'Hours to subtract (001-002)', digits: 3 }] },
      { id: 's175', num: 175, label: 'Auto-arm postpone', kind: 'data', desc: 'Minutes to postpone auto-arming. 000 cancels instead.', entries: [{ label: 'Minutes', digits: 3, def: '000' }] },
      { id: 's176', num: 176, label: 'Cross zone / police code timer', kind: 'data', desc: 'Seconds (cross zone) or minutes (police code).', entries: [{ label: 'Time', digits: 3, def: '060' }] },
      { id: 's181', range: [181, 188], label: 'Auto-arm schedule', kind: 'data', describe: (n) => `Partition ${n - 180}`, desc: 'One HHMM per day, Sunday to Saturday. 9999 = off.', entriesFor: () => DAYS.map((d) => ({ label: d, digits: 4, def: '9999' })) },
      { id: 's190', num: 190, label: 'No-activity pre-alert', kind: 'data', desc: 'Warning tone length before no-activity arming.', entries: [{ label: 'Minutes', digits: 3, def: '001' }] },
      { id: 's191', range: [191, 198], label: 'No-activity arm timer', kind: 'data', describe: (n) => `Partition ${n - 190}`, desc: 'Arm automatically after this many minutes with no zone activity. 000 = off.', entriesFor: () => [{ label: 'Minutes', digits: 3, def: '000' }] },
      { id: 's199', num: 199, label: 'Auto-arm pre-alert', kind: 'data', desc: 'Warning time before scheduled auto-arming.', entries: [{ label: 'Minutes', digits: 3, def: '004' }] },
      { id: 's681', range: [681, 688], label: 'Auto-disarm schedule', kind: 'data', describe: (n) => `Partition ${n - 680}`, desc: 'One HHMM per day. 9999 = off.', entriesFor: () => DAYS.map((d) => ({ label: d, digits: 4, def: '9999' })) },
      { id: 's691', range: [691, 698], label: 'Auto-disarm holidays', kind: 'data', describe: (n) => `Partition ${n - 690}`, desc: 'Up to 14 dates (MMDDYY) when auto-disarm is skipped. 999999 = off.', entriesFor: () => buildNumberedEntries('Holiday', 1, 14, 6, '999999') },
      { id: 's700', num: 700, label: 'Clock adjust', kind: 'data', desc: 'Seconds in the last minute of the day. Use it to correct a drifting clock.', entries: [{ label: 'Seconds (01-99)', digits: 2, def: '60' }] },
    ],
  },
  {
    id: 'g-part', label: 'Partitions',
    sections: [
      { id: 's201', num: 201, label: 'Partition enable', kind: 'toggle', desc: 'Turn on partitions 1-8. Partition 1 is always on.', options: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ n, on: `Partition ${n} enabled`, off: 'Disabled', def: n === 1 })) },
      {
        id: 's202', range: [202, 265], label: 'Partition zone assignment', kind: 'toggle',
        describe: (n) => {
          const i = n - 202;
          const part = Math.floor(i / 8) + 1;
          const first = (i % 8) * 8 + 1;
          const result = `Partition ${part}, zones ${first}-${first + 7}`;
          return result;
        },
        optionsFor: (n) => {
          const first = ((n - 202) % 8) * 8 + 1;
          const result = [1, 2, 3, 4, 5, 6, 7, 8].map((k) => ({ n: k, on: `Zone ${first + k - 1} on this partition`, off: 'Not on this partition', def: n === 202 }));
          return result;
        },
        desc: 'Which zones belong to which partition. 8 sections per partition, 8 zones per section. [202]-[209] = partition 1, [210]-[217] = partition 2, and so on.',
        tips: ['Formula: section = 202 + (partition - 1) x 8 + (zone - 1) / 8, rounded down.', 'Default: zones 1-8 on partition 1.', 'A zone on two partitions only arms when both are armed.'],
        related: ['s001', 's201'],
      },
    ],
  },
  {
    id: 'g-comm', label: 'Communicator',
    sections: [
      { id: 's301', range: [301, 303], label: 'Telephone numbers', kind: 'phone', describe: (n) => ['1st number', '2nd number', '3rd number (backup for 1st)'][n - 301], desc: 'Up to 32 digits. Press [#] when done. HEX D = extra dial-tone search, E = 2 s pause, F = end.', entriesFor: () => [{ label: 'Phone number', digits: 32, variable: true }], tips: ['Start with D to wait for dial tone.', 'With T-Link program DCAA.'] },
      { id: 's304', num: 304, label: 'Call waiting cancel', kind: 'data', desc: 'Dialled first to disable call waiting. Enable in [382] option 4.', entries: [{ label: 'Cancel string (6 digits, F = unused)', digits: 6, def: 'DB70EF' }] },
      { id: 's310', num: 310, label: 'System account number', kind: 'data', desc: 'Account number for non-partition events. Use HEX A for any 0 (except in SIA). 4-digit account: end with FF.', entries: [{ label: 'Account', digits: 6, def: 'FFFFFF' }] },
      { id: 's311', range: [311, 318], label: 'Partition account numbers', kind: 'data', describe: (n) => `Partition ${n - 310}`, desc: '4-digit account per partition.', entriesFor: () => [{ label: 'Account', digits: 4 }] },
      { id: 's165', num: 165, label: 'Max dialing attempts', kind: 'data', desc: 'Attempts before a Failure to Communicate trouble.', entries: [{ label: 'Attempts (001-005)', digits: 3, def: '005' }] },
      { id: 's166', num: 166, label: 'Wait for handshake', kind: 'data', desc: 'Seconds to wait for the receiver after dialing.', entries: [{ label: 'Seconds', digits: 3, def: '040' }] },
      { id: 's167', num: 167, label: 'T-Link wait for ack', kind: 'data', desc: 'Seconds to wait for a T-Link acknowledgement.', entries: [{ label: 'Seconds', digits: 3, def: '020' }] },
      { id: 's350', num: 350, label: 'Communicator format', kind: 'data', desc: 'Format for phone number 1 and 2. Number 3 uses number 1\'s format.', entries: [{ label: 'Phone 1 format', digits: 2, lookup: 'commFormats' }, { label: 'Phone 2 format', digits: 2, lookup: 'commFormats' }], tips: ['03 = Contact ID (most monitoring stations).', '09 = Private line: calls a phone and beeps the zone number.'] },
      { id: 's351', range: [351, 358], label: 'Call direction: alarms', kind: 'toggle', describe: (n) => `Partition ${n - 350}`, desc: 'Which phone number gets alarm/restore reports.', optionsFor: () => buildCallDirectionOptions(true) },
      { id: 's359', range: [359, 366], label: 'Call direction: tampers', kind: 'toggle', describe: (n) => `Partition ${n - 358}`, desc: 'Which phone number gets tamper/restore reports.', optionsFor: () => buildCallDirectionOptions(true) },
      { id: 's367', range: [367, 374], label: 'Call direction: open/close', kind: 'toggle', describe: (n) => `Partition ${n - 366}`, desc: 'Which phone number gets opening/closing reports. All OFF by default.', optionsFor: () => buildCallDirectionOptions(false) },
      { id: 's375', num: 375, label: 'Call direction: maintenance', kind: 'toggle', desc: 'Which phone number gets system maintenance reports.', options: buildCallDirectionOptions(true) },
      { id: 's376', num: 376, label: 'Call direction: test', kind: 'toggle', desc: 'Which phone number gets test transmissions.', options: buildCallDirectionOptions(true) },
      {
        id: 's377', num: 377, label: 'Communicator variables', kind: 'data', desc: 'Eleven 3-digit values.',
        entries: [
          { label: 'Swinger shutdown: alarms', digits: 3, def: '003' },
          { label: 'Swinger shutdown: tampers', digits: 3, def: '003' },
          { label: 'Swinger shutdown: maintenance', digits: 3, def: '003' },
          { label: 'Communication delay (s)', digits: 3, def: '000' },
          { label: 'AC failure report delay (min)', digits: 3, def: '030' },
          { label: 'TLM trouble delay (checks)', digits: 3, def: '010' },
          { label: 'Test transmission cycle (days)', digits: 3, def: '030' },
          { label: 'For future use', digits: 3, def: '030' },
          { label: 'Wireless low battery delay (days)', digits: 3, def: '007' },
          { label: 'Delinquency cycle', digits: 3, def: '030' },
          { label: 'Communication cancel window', digits: 3, def: '000' },
        ],
      },
      { id: 's378', num: 378, label: 'Test transmission time', kind: 'data', desc: 'Time of day for the test report. 9999 = off.', entries: [{ label: 'HHMM', digits: 4, def: '9999' }] },
      { id: 's379', num: 379, label: 'Periodic DLS time', kind: 'data', desc: 'Time to auto-call DLS. 9999 = random, FFFF = off.', entries: [{ label: 'HHMM', digits: 4, def: '9999' }] },
      {
        id: 's380', num: 380, label: '1st communicator options', kind: 'toggle', desc: 'Turns the dialer on and sets dialing behaviour.',
        options: [
          { n: 1, on: 'Communicator enabled', off: 'Communicator disabled', def: true },
          { n: 2, on: 'Restorals on bell time-out', off: 'Restorals follow zones', def: false },
          { n: 3, on: 'Pulse dialing', off: 'DTMF dialing', def: false },
          { n: 4, on: 'Switch to pulse after failed attempts', off: 'DTMF always', def: false },
          { n: 5, on: '3rd phone number enabled', off: 'Disabled', def: false },
          { n: 6, on: 'Alternate 1st and 3rd numbers', off: 'Call 1st, back up to 3rd', def: false },
          ...buildFutureOptions([7]),
          { n: 8, on: 'Delinquency follows zone activity', off: 'Delinquency follows arming', def: false },
        ],
        tips: ['Self-monitored with no phone line? Turn option 1 OFF.'],
      },
      {
        id: 's381', num: 381, label: '2nd communicator options', kind: 'toggle', desc: 'Ringback, SIA/Contact ID code source, listen-in.',
        options: [
          { n: 1, on: 'Keypad ringback after open-after-alarm', off: 'Off', def: false },
          { n: 2, on: 'Bell ringback after open-after-alarm', off: 'Off', def: false },
          { n: 3, on: 'SIA uses programmed codes', off: 'SIA automatic codes', def: false },
          { n: 4, on: 'Closing confirmation beeps', off: 'Off', def: false },
          { n: 5, on: 'Talk/listen on phone 1/3', off: 'Off', def: true },
          { n: 6, on: 'Talk/listen on phone 2', off: 'Off', def: true },
          { n: 7, on: 'Contact ID uses programmed codes', off: 'Contact ID automatic codes', def: false },
          { n: 8, on: 'ULC communication priority', off: 'Standard priority', def: false },
        ],
      },
      {
        id: 's382', num: 382, label: '3rd communicator options', kind: 'toggle', desc: 'Walk test reports, call waiting, T-Link.',
        options: [
          { n: 1, on: 'Contact ID partial closing uses 5', off: 'Uses 4', def: false },
          { n: 2, on: 'Report alarms during walk test', off: 'Off', def: false },
          { n: 3, on: 'Show "Communications cancelled"', off: 'Off', def: false },
          { n: 4, on: 'Dial call waiting cancel [304]', off: 'Off', def: false },
          { n: 5, on: 'T-Link enabled', off: 'Disabled', def: false },
          { n: 6, on: 'AC fail delay in hours', off: 'In minutes', def: false },
          { n: 7, on: 'Residential dial: 1 attempt', off: 'Follows [165]', def: false },
          ...buildFutureOptions([8]),
        ],
      },
      { id: 's383', num: 383, label: '4th communicator options', kind: 'toggle', desc: 'Account code source.', options: [{ n: 1, on: 'Account code follows phone number', off: 'Follows partition', def: false }, ...buildFutureOptions([2, 3, 4, 5, 6, 7, 8])] },
      { id: 's389', num: 389, label: 'T-Link fault check', kind: 'data', desc: 'Time between T-Link presence checks.', entries: [{ label: 'Value', digits: 3, def: '003' }] },
      { id: 's703', num: 703, label: 'Delay between dial attempts', kind: 'data', desc: 'Seconds between attempts.', entries: [{ label: 'Seconds', digits: 3, def: '003' }] },
    ],
  },
  {
    id: 'g-report', label: 'Reporting codes',
    sections: [
      { id: 's320', range: [320, 323], label: 'Zone alarm codes', kind: 'data', describe: (n) => `Zones ${(n - 320) * 16 + 1}-${(n - 319) * 16}`, desc: '2-digit code per zone. With automatic Contact ID or SIA, any value except 00 sends the right code. 00 = do not report.', entriesFor: (n) => buildNumberedEntries('Zone', (n - 320) * 16 + 1, (n - 319) * 16, 2) },
      { id: 's324', range: [324, 327], label: 'Zone restore codes', kind: 'data', describe: (n) => `Zones ${(n - 324) * 16 + 1}-${(n - 323) * 16}`, desc: 'Alarm restoral code per zone.', entriesFor: (n) => buildNumberedEntries('Zone', (n - 324) * 16 + 1, (n - 323) * 16, 2) },
      { id: 's328', num: 328, label: 'Misc alarm codes', kind: 'data', desc: 'Duress, open after alarm and others.', entries: buildNamedEntries(['Duress alarm', 'Opening after alarm', 'Recent closing', 'Zone expander supervisory alarm', 'Zone expander supervisory restore', 'Cross zone police code alarm', 'Burglary not verified', 'Alarm cancelled'], 2) },
      { id: 's329', num: 329, label: 'Priority alarm codes', kind: 'data', desc: 'Keypad F/A/P keys.', entries: buildNamedEntries(['Keypad fire alarm', 'Keypad auxiliary alarm', 'Keypad panic alarm', 'Auxiliary input alarm', 'Keypad fire restore', 'Keypad auxiliary restore', 'Keypad panic restore', 'Auxiliary input restore'], 2) },
      { id: 's330', range: [330, 333], label: 'Zone tamper codes', kind: 'data', describe: (n) => `Zones ${(n - 330) * 16 + 1}-${(n - 329) * 16}`, desc: 'Tamper code per zone.', entriesFor: (n) => buildNumberedEntries('Zone', (n - 330) * 16 + 1, (n - 329) * 16, 2) },
      { id: 's334', range: [334, 337], label: 'Zone tamper restore codes', kind: 'data', describe: (n) => `Zones ${(n - 334) * 16 + 1}-${(n - 333) * 16}`, desc: 'Tamper restoral code per zone.', entriesFor: (n) => buildNumberedEntries('Zone', (n - 334) * 16 + 1, (n - 333) * 16, 2) },
      { id: 's338', num: 338, label: 'Misc tamper codes', kind: 'data', desc: 'System tamper and keypad lockout.', entries: buildNamedEntries(['General system tamper', 'General system tamper restore', 'Keypad lockout'], 2) },
      { id: 's339', range: [339, 340], label: 'Closing codes, users 1-32', kind: 'data', describe: (n) => (n === 339 ? 'Users 1-16' : 'Users 17-32'), desc: 'Arming report per access code.', entriesFor: (n) => buildNumberedEntries('Code', (n - 339) * 16 + 1, (n - 338) * 16, 2) },
      { id: 's341', num: 341, label: 'Misc closing codes', kind: 'data', desc: 'Special arming events.', entries: buildNamedEntries(['For future use', 'For future use', 'For future use', 'For future use', 'Automatic zone bypass', 'Partial closing', 'Special closing', 'Late to close', 'Exit fault'], 2) },
      { id: 's342', range: [342, 343], label: 'Opening codes, users 1-32', kind: 'data', describe: (n) => (n === 342 ? 'Users 1-16' : 'Users 17-32'), desc: 'Disarming report per access code.', entriesFor: (n) => buildNumberedEntries('Code', (n - 342) * 16 + 1, (n - 341) * 16, 2) },
      { id: 's344', num: 344, label: 'Misc opening codes', kind: 'data', desc: 'Special disarming events.', entries: buildNamedEntries(['For future use', 'For future use', 'For future use', 'For future use', 'For future use', 'Auto-arm cancel/postpone', 'Special opening'], 2) },
      { id: 's345', num: 345, label: 'Maintenance alarm codes', kind: 'data', desc: 'Trouble reports.', entries: buildNamedEntries(['Battery trouble', 'AC failure', 'Bell circuit trouble', 'Fire trouble', 'Auxiliary power trouble', 'TLM trouble', 'General system trouble', 'General system supervisory'], 2) },
      { id: 's346', num: 346, label: 'Maintenance restore codes', kind: 'data', desc: 'Trouble restore reports.', entries: buildNamedEntries(['Battery restore', 'AC restore', 'Bell circuit restore', 'Fire trouble restore', 'Auxiliary power restore', 'TLM restore', 'General system trouble restore', 'General system supervisory restore'], 2) },
      { id: 's347', num: 347, label: 'Misc maintenance codes', kind: 'data', desc: 'FTC restore, DLS, zone fault, delinquency, installer lead in/out.', entries: buildNamedEntries(['Phone 1 FTC restore', 'Phone 2 FTC restore', 'Event buffer 75% full', 'DLS lead in', 'DLS lead out', 'Zone fault alarm', 'Zone fault restore', 'Delinquency', 'Zone low battery alarm', 'Zone low battery restore', 'Installer lead out', 'Installer lead in'], 2) },
      { id: 's348', num: 348, label: 'Test transmission codes', kind: 'data', desc: 'Walk test and periodic tests.', entries: buildNamedEntries(['Walk test end', 'Walk test begin', 'Periodic test with trouble', 'Periodic test', 'System test', 'For future use'], 2) },
      { id: 's349', num: 349, label: 'PC5700 maintenance codes', kind: 'module', desc: 'Only for the PC5700 (Canada).' },
      { id: 's601', range: [601, 604], label: 'Closing codes, users 33-95', kind: 'data', describe: (n) => `Users ${33 + (n - 601) * 16}-${Math.min(95, 48 + (n - 601) * 16)}`, desc: 'Arming report per access code.', entriesFor: (n) => buildNumberedEntries('Code', 33 + (n - 601) * 16, Math.min(95, 48 + (n - 601) * 16), 2) },
      { id: 's605', range: [605, 608], label: 'Opening codes, users 33-95', kind: 'data', describe: (n) => `Users ${33 + (n - 605) * 16}-${Math.min(95, 48 + (n - 605) * 16)}`, desc: 'Disarming report per access code.', entriesFor: (n) => buildNumberedEntries('Code', 33 + (n - 605) * 16, Math.min(95, 48 + (n - 605) * 16), 2) },
    ],
  },
  {
    id: 'g-dls', label: 'Downloading (DLS)',
    sections: [
      {
        id: 's401', num: 401, label: 'DLS options', kind: 'toggle', desc: 'How the panel answers and calls the DLS software.',
        options: [
          { n: 1, on: 'Answer (rings or double call)', off: 'Do not answer', def: false },
          { n: 2, on: 'User can open DLS window', off: 'Cannot', def: false },
          { n: 3, on: 'Call back', off: 'Stay connected', def: false },
          { n: 4, on: 'User-initiated call-up', off: 'Disabled', def: false },
          { n: 5, on: 'Auto upload at 75% buffer', off: 'Disabled', def: false },
          { n: 6, on: '300 baud', off: '110 baud', def: false },
          ...buildFutureOptions([7, 8]),
        ],
      },
      { id: 's402', num: 402, label: 'DLS phone number', kind: 'phone', desc: 'Number the panel calls for DLS. Up to 32 digits, [#] to finish.', entries: [{ label: 'Phone number', digits: 32, variable: true }] },
      { id: 's403', num: 403, label: 'DLS access code', kind: 'data', desc: 'Must match the DLS account file.', entries: [{ label: 'Access code', digits: 6, def: '186400' }] },
      { id: 's404', num: 404, label: 'Panel ID code', kind: 'data', desc: 'Identifies this panel to DLS.', entries: [{ label: 'Panel ID', digits: 6, def: '186400' }] },
      { id: 's405', num: 405, label: 'Double-call timer', kind: 'data', desc: 'Max seconds between calls for double-call answer.', entries: [{ label: 'Seconds', digits: 3, def: '060' }] },
      { id: 's406', num: 406, label: 'Rings to answer', kind: 'data', desc: 'Rings before the panel answers for DLS.', entries: [{ label: 'Rings (000-010)', digits: 3, def: '000' }] },
      { id: 's499', num: 499, label: 'PC-Link session', kind: 'action', confirm: true, desc: 'Starts local DLS via the PC-Link cable. Enter [499][installer code][499].' },
    ],
  },
  {
    id: 'g-intl', label: 'International',
    sections: [
      {
        id: 's701', num: 701, label: '1st international options', kind: 'toggle', desc: 'Mains frequency, code length, arming inhibit.',
        options: [
          { n: 1, on: '50 Hz AC', off: '60 Hz AC', def: false },
          { n: 2, on: 'Clock uses internal crystal', off: 'Clock uses AC line', def: false },
          { n: 3, on: 'Block arming on low battery/AC fail', off: 'Allow arming', def: false },
          { n: 4, on: 'Tampers need installer reset', off: 'Tampers follow restore', def: false },
          { n: 5, on: '6-digit access codes', off: '4-digit access codes', def: false },
          { n: 6, on: 'Busy tone detection', off: 'Off', def: false },
          { n: 7, on: 'High current battery charge', off: 'Standard charge', def: false },
          { n: 8, on: 'DLS/audio has no priority', off: 'DLS/audio has priority', def: false },
        ],
        tips: ['In 50 Hz countries (South Africa, UK, Europe, Australia) turn option 1 ON, or the clock runs slow.'],
      },
      {
        id: 's702', num: 702, label: '2nd international options', kind: 'toggle', desc: 'Dialing, handshake, DLS window, bell on FTC.',
        options: [
          { n: 1, on: 'Pulse ratio 33/67', off: 'Pulse ratio 40/60', def: false },
          { n: 2, on: 'Force dialing (no dial tone needed)', off: 'Wait for dial tone', def: true },
          { n: 3, on: 'Test cycle in minutes', off: 'In days', def: false },
          { n: 4, on: '1600 Hz handshake', off: 'Standard handshake', def: false },
          { n: 5, on: 'ID tone', off: 'Off', def: false },
          { n: 6, on: 'ID tone 2100 Hz', off: '1300 Hz', def: false },
          { n: 7, on: 'One-time 1-hour DLS window', off: '6-hour DLS window', def: false },
          { n: 8, on: 'Bell on FTC when armed', off: 'FTC trouble only', def: false },
        ],
      },
    ],
  },
  {
    id: 'g-modules', label: 'Modules',
    sections: [
      { id: 's801', num: 801, label: 'PC5400 printer', kind: 'module', desc: 'Opens the PC5400 module menu. See the PC5400 manual.' },
      { id: 's802', num: 802, label: 'PC59xx audio', kind: 'module', desc: 'Opens the audio/VOX module menu. See the module manual.' },
      { id: 's803', num: 803, label: 'Alternate communicator', kind: 'module', desc: 'Opens the alternate communicator menu. See its manual.' },
      { id: 's804', num: 804, label: 'Wireless (PC5132 / RF keypad)', kind: 'module', desc: 'Opens the wireless receiver menu: enrolling device serial numbers, supervision and so on. Inside it the panel waits for another sub-section number. The sub-sections are in the PC5132 or RF keypad manual.', tips: ['Remember to also set the zone type in [001]-[004] and turn on attribute 8 (wireless) in [101]-[164].'], related: ['s001', 's101', 's904'] },
      { id: 's805', num: 805, label: 'PC5100 addressable', kind: 'module', desc: 'Opens the addressable loop menu. See the PC5100 manual.' },
      { id: 's851', num: 851, label: 'T-Link', kind: 'module', desc: 'Opens the T-Link network module menu. See its manual.' },
    ],
  },
  {
    id: 'g-special', label: 'Special functions',
    sections: [
      { id: 's899', num: 899, label: 'Template programming', kind: 'action', desc: 'Shows and enters a 5-digit template code for quick setup (needs a PK55xx/RFK55xx keypad).' },
      { id: 's900', num: 900, label: 'Panel version', kind: 'action', desc: 'Shows the firmware version on an LCD keypad, e.g. 0410 = v4.10.' },
      { id: 's901', num: 901, label: 'Walk test on/off', kind: 'action', desc: 'Each zone you trip sounds the bell for 2 seconds. Enter [901] again to stop. Stops by itself after 15 minutes of no activity.' },
      { id: 's902', num: 902, label: 'Module supervision reset', kind: 'action', desc: 'Clears and rescans connected modules. Use after removing a module or changing keypad slots.' },
      { id: 's903', num: 903, label: 'View modules', kind: 'action', desc: 'Lights show detected modules: 01-08 keypads, 09-14 and 16 PC5108 expanders, 17 wireless receiver, 18 PC5208, 19 PC5204, 20 PC5400.' },
      { id: 's904', num: 904, label: 'Wireless placement test', kind: 'action', desc: 'Enter a 2-digit wireless zone, then trip the device. 1 beep = good location, 3 beeps = bad.' },
      { id: 's990', num: 990, label: 'Installer lockout ON', kind: 'action', confirm: true, danger: true, desc: 'Enter [990][installer code][990]. Blocks hardware defaulting. Do not use on your own panel unless you are sure.' },
      { id: 's991', num: 991, label: 'Installer lockout OFF', kind: 'action', confirm: true, desc: 'Enter [991][installer code][991].' },
      { id: 's993', num: 993, label: 'Default alternate communicator', kind: 'action', confirm: true, danger: true, desc: 'Factory default the alternate communicator. Enter [993][installer code][993].' },
      { id: 's995', num: 995, label: 'Default Escort5580', kind: 'action', confirm: true, danger: true, desc: 'Factory default the Escort module.' },
      { id: 's996', num: 996, label: 'Default wireless receiver', kind: 'action', confirm: true, danger: true, desc: 'Factory default the PC5132. All enrolled wireless devices are lost.' },
      { id: 's997', num: 997, label: 'Default PC5400', kind: 'action', confirm: true, danger: true, desc: 'Factory default the printer module.' },
      { id: 's998', num: 998, label: 'Default PC59xx', kind: 'action', confirm: true, danger: true, desc: 'Factory default the audio module.' },
      { id: 's999', num: 999, label: 'Default main panel', kind: 'action', confirm: true, danger: true, desc: 'Factory default the whole panel. ALL programming is erased. Enter [999][installer code][999].' },
    ],
  },
];
