const restorationImage = '/story/restoration-memory.jpg';

export const DOCUMENTARY_CLIPS = {
  restoration: {
    titleKey: 'story.documentary.restoration.title',
    cues: [
      {
        duration: 9,
        image: restorationImage,
        frame: 'square',
        sourceKey: 'story.documentary.source.history',
        subtitleKey: 'story.documentary.restoration.earthquake',
      },
      {
        duration: 11,
        image: restorationImage,
        frame: 'work',
        sourceKey: 'story.documentary.source.novel',
        subtitleKey: 'story.documentary.restoration.volunteer',
      },
      {
        duration: 9,
        image: restorationImage,
        frame: 'spire',
        sourceKey: 'story.documentary.source.novel',
        subtitleKey: 'story.documentary.restoration.reply',
      },
      {
        duration: 13,
        frame: 'slate',
        sourceKey: 'story.documentary.source.novel',
        subtitleKey: 'story.documentary.restoration.stone',
      },
    ],
  },
};
