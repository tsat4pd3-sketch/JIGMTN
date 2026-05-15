export const JIG_CONFIG_CACHE_KEY = 'pm_jig_fixture_config_v1';

export const SECTION_TYPE_OPTIONS = [
  { value: 'locatepin_simple', label: 'Dimension / Diameter — 3 shots' },
  { value: 'locatepin_xy', label: 'Dimension X/Y — 3 shots each axis' },
  { value: 'feeler', label: 'Range — Feeler gauge < limit' },
  { value: 'checklist', label: 'Attribute — OK/NG' },
  { value: 'su', label: 'Attribute — Service unit' },
  { value: 'normal', label: 'Attribute — Bolt/Nut/Knock pin' },
  { value: 'uni', label: 'Attribute — Unipaint mark' },
  { value: 'grip', label: 'Attribute — Robot gripper bolt' },
];

export const STANDARD_TYPE_OPTIONS = [
  { value: 'dimension', label: 'Dimension' },
  { value: 'diameter', label: 'Diameter' },
  { value: 'range', label: 'Range' },
  { value: 'attribute', label: 'Attribute' },
];

export function makeConfigId(prefix = 'CFG') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function cloneJig(jig) {
  return JSON.parse(JSON.stringify(jig));
}

export function normalizeSection(section = {}) {
  const type = section.type || 'checklist';
  const standardType = section.standardType || inferStandardType(type);
  return {
    id: section.id || makeConfigId('SEC'),
    title: section.title || 'New Check Section',
    type,
    standardType,
    standardText: section.standardText || defaultStandardText(type),
    items: (section.items || []).map(item => normalizePoint(item, type, standardType)),
  };
}

const numberOrBlank = value => {
  if (value === '' || value === null || value === undefined) return '';
  const n = Number(value);
  return Number.isFinite(n) ? n : '';
};

export function normalizePoint(point = {}, sectionType = 'checklist', standardType = inferStandardType(sectionType)) {
  const isMeasured = ['locatepin_simple', 'locatepin_xy', 'feeler'].includes(sectionType) || ['dimension', 'diameter', 'range'].includes(standardType);
  return {
    id: point.id || makeConfigId('CP'),
    label: point.label || point.id || 'Check point',
    standardType: point.standardType || standardType,
    nom: numberOrBlank(point.nom),
    min: numberOrBlank(point.min),
    max: numberOrBlank(point.max),
    diameter: numberOrBlank(point.diameter ?? point.nom),
    unit: point.unit || (isMeasured ? 'mm' : ''),
    standardText: point.standardText || '',
  };
}

export function normalizeJigConfig(jig = {}) {
  return {
    id: (jig.id || '').trim().toUpperCase(),
    name: jig.name || '',
    process: jig.process || '',
    partName: jig.partName || '',
    model: jig.model || '',
    partNo: jig.partNo || '',
    revision: jig.revision || 'A',
    isActive: jig.isActive !== false,
    updatedAt: jig.updatedAt || Date.now(),
    sections: (jig.sections || []).map(normalizeSection),
  };
}

export function makeBlankJig() {
  return normalizeJigConfig({
    id: '',
    name: '',
    process: 'ASSEMBLY',
    partName: '',
    model: '',
    partNo: '',
    sections: [makeBlankSection('locatepin_simple'), makeBlankSection('checklist')],
  });
}

export function makeBlankSection(type = 'checklist') {
  return normalizeSection({
    id: defaultSectionId(type),
    title: defaultSectionTitle(type),
    type,
    standardType: inferStandardType(type),
    standardText: defaultStandardText(type),
    items: [makeBlankPoint(type)],
  });
}

export function makeBlankPoint(sectionType = 'checklist') {
  const standardType = inferStandardType(sectionType);
  if (['locatepin_simple', 'locatepin_xy'].includes(sectionType)) {
    return normalizePoint({ id: 'LP1', label: 'Locate Pin LP1', nom: 10, max: 10, min: 9.8, diameter: 10 }, sectionType, 'diameter');
  }
  if (sectionType === 'feeler') {
    return normalizePoint({ id: 'SD1', label: 'Support Datum SD1', min: 0, max: 0.3, standardText: '< 0.30 mm' }, sectionType, 'range');
  }
  return normalizePoint({ id: 'CP1', label: 'Visual / Function check', standardText: defaultStandardText(sectionType) }, sectionType, standardType);
}

export function inferStandardType(sectionType = 'checklist') {
  if (['locatepin_simple', 'locatepin_xy'].includes(sectionType)) return 'diameter';
  if (sectionType === 'feeler') return 'range';
  return 'attribute';
}

export function defaultSectionId(type) {
  return ({ locatepin_simple:'lp', locatepin_xy:'lp', feeler:'sd', checklist:'cp', su:'su', normal:'bolt', uni:'bolt', grip:'bolt' }[type] || 'cp');
}

export function defaultSectionTitle(type) {
  return ({
    locatepin_simple:'Locate Pin (Ø -0.20) — Vernier',
    locatepin_xy:'Locate Pin (Ø -0.20) — Vernier X/Y',
    feeler:'Support Datum — Feeler Gauge < 0.30 mm',
    checklist:'Attribute Check — OK/NG',
    su:'Service Units (SU)',
    normal:'Bolt, Nut, Knock Pin',
    uni:'Bolt, Nut — Unipaint',
    grip:'Bolt, Nut — Unipaint + Robot',
  }[type] || 'Check Section');
}

export function defaultStandardText(type) {
  return ({
    locatepin_simple:'Measure 3 shots and judge between min/max',
    locatepin_xy:'Measure X/Y 3 shots and judge between min/max',
    feeler:'Feeler gauge actual value must be less than max range',
    checklist:'OK = normal, NG = abnormal and requires action',
    su:'Oil/water/leak/damage condition must be OK',
    normal:'Bolt / nut / knock pin tight and not loose',
    uni:'Unipaint mark aligned / not moved',
    grip:'Unipaint + robot bolt not loose',
  }[type] || 'OK/NG standard');
}

export function mergeJigConfigs(defaultJigs, configuredJigs = []) {
  const map = new Map(defaultJigs.map(j => [j.id, cloneJig(j)]));
  configuredJigs.forEach(j => {
    const normalized = normalizeJigConfig(j);
    if (normalized.id && normalized.isActive) map.set(normalized.id, normalized);
    if (normalized.id && !normalized.isActive) map.delete(normalized.id);
  });
  return Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id));
}

export function sectionTypeSummary(section = {}) {
  const std = section.standardType || inferStandardType(section.type);
  if (std === 'attribute') return 'Attribute OK/NG';
  if (std === 'range') return 'Range min/max';
  if (std === 'diameter') return 'Diameter Ø min/max';
  return 'Dimension min/max';
}
