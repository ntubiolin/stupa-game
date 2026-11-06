export const phoneRecords = [
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
  return phoneRecords.filter(({ id, tabs }) => (
    tabs.includes(tab) && snapshot.evidence.includes(id)
  ));
}

export function canReadReturnDiary(snapshot, recordId) {
  return snapshot.beat === 'return' && recordId === 'new-diary'
    && snapshot.evidence.includes(recordId);
}
