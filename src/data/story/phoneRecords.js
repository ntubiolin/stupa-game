export const phoneRecords = [
  {
    id: 'dorm-memory', art: 'diary', tabs: ['photos', 'evidence'],
    titleKey: 'phone.record.dorm', sourceKey: 'phone.source.private',
    bodyKey: 'phone.record.dormBody', clipId: 'dorm-memory',
  },
  {
    id: 'blank-notebook', art: 'diary', tabs: ['diary', 'evidence'],
    titleKey: 'phone.notebook.title', sourceKey: 'phone.source.private',
    bodyKey: 'phone.notebook.blank',
  },
  {
    id: 'volunteer-photo', art: 'stupa', tabs: ['photos', 'evidence'],
    titleKey: 'phone.record.volunteers', sourceKey: 'phone.source.private',
    bodyKey: 'phone.record.volunteersBody',
  },
  {
    id: 'handover-archive', art: 'diary', tabs: ['evidence'],
    titleKey: 'phone.record.handover', sourceKey: 'phone.source.private',
    bodyKey: 'phone.record.handoverBody',
  },
  {
    id: 'train-recording',
    art: 'train',
    tabs: ['evidence'],
    titleKey: 'phone.record.train',
    sourceKey: 'phone.source.transcript',
  },
  {
    id: 'restoration-record',
    art: 'stupa',
    tabs: ['photos', 'evidence'],
    titleKey: 'phone.record.restoration',
    sourceKey: 'phone.source.restoration',
    bodyKey: 'phone.record.restorationBody',
  },
  {
    id: 'stone-record',
    art: 'stone',
    tabs: ['photos', 'evidence'],
    titleKey: 'phone.record.stone',
    sourceKey: 'phone.source.illustration',
    bodyKey: 'phone.record.stoneBody',
  },
  {
    id: 'old-map',
    art: 'map',
    tabs: ['photos', 'evidence'],
    titleKey: 'phone.record.map',
    sourceKey: 'phone.source.map',
    bodyKey: 'phone.record.mapBody',
    textKey: 'phone.record.mapNote',
  },
  {
    id: 'new-diary',
    art: 'diary',
    tabs: ['diary', 'evidence'],
    titleKey: 'phone.record.diary',
    sourceKey: 'phone.source.diary',
    bodyKey: 'phone.record.diaryBody',
    textKey: 'phone.record.diaryQuote',
  },
];

export function visiblePhoneRecords(snapshot, tab) {
  return phoneRecords.filter(({ id, tabs }) => {
    if (!tabs.includes(tab)) return false;
    if (id === 'dorm-memory') return ['memory', 'boundary', 'diary', 'complete'].includes(snapshot.journey?.chapters?.yarlung?.checkpointId);
    if (id === 'blank-notebook') return true;
    if (id === 'handover-archive') return snapshot.beat !== 'prologue';
    if (id === 'volunteer-photo') return snapshot.evidence.includes('restoration-record');
    return snapshot.evidence.includes(id);
  }).map(record => record.id === 'blank-notebook' && snapshot.journey?.chapters?.finale?.completed
    ? { ...record, bodyKey: 'phone.notebook.written' } : record);
}

export function canReadReturnDiary(snapshot, recordId) {
  return snapshot.beat === 'return' && recordId === 'new-diary'
    && snapshot.evidence.includes(recordId);
}
