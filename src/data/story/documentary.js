export const DOCUMENTARY_CLIPS = {
  'vision-cutaway': {
    titleKey: 'story.documentary.vision.title',
    cues: [{ duration: 10, image: '/story/video/V4.jpg', frame: 'full',
      video: { src: '/story/video/V4.mp4', poster: '/story/video/V4.jpg' },
      sourceKey: 'story.documentary.source.novel', subtitleKey: 'story.documentary.vision.caption' }],
  },
  restoration: {
    titleKey: 'story.documentary.restoration.title',
    cues: [
      {
        duration: 9,
        image: '/story/restoration/A.webp',
        video: { src: '/story/video/V1.mp4', poster: '/story/video/V1.jpg' },
        frame: 'full',
        sourceKey: 'story.documentary.source.history',
        subtitleKey: 'story.documentary.restoration.earthquake',
      },
      {
        duration: 11,
        image: '/story/restoration/B.webp',
        video: { src: '/story/video/V2.mp4', poster: '/story/video/V2.jpg' },
        frame: 'full',
        sourceKey: 'story.documentary.source.novel',
        subtitleKey: 'story.documentary.restoration.volunteer',
      },
      {
        duration: 9,
        image: '/story/restoration/C.webp',
        video: { src: '/story/video/V3.mp4', poster: '/story/video/V3.jpg' },
        frame: 'full',
        sourceKey: 'story.documentary.source.novel',
        subtitleKey: 'story.documentary.restoration.reply',
      },
      {
        duration: 13,
        image: '/story/restoration/D.webp',
        frame: 'full',
        sourceKey: 'story.documentary.source.novel',
        subtitleKey: 'story.documentary.restoration.stone',
      },
    ],
  },
};
