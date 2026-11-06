// Adapted from the opening of 《鏡中之人》. All replies lead to the same handover.
export const openingMessage = 'phone.line.opening';
export const identityStep = 3;

export const prologueTurns = [
  {
    id: 'opening',
    replies: [
      { id: 'scam', textKey: 'phone.reply.scam' },
      { id: 'hello', textKey: 'phone.reply.hello' },
    ],
    messages: ['phone.line.report'],
    memoryKey: 'phone.memory.report',
  },
  {
    id: 'report',
    replies: [
      { id: 'who', textKey: 'phone.reply.who' },
      { id: 'how', textKey: 'phone.reply.how' },
    ],
    messages: ['phone.line.kyoto'],
    memoryKey: 'phone.memory.kyoto',
  },
  {
    id: 'kyoto',
    replies: [
      { id: 'stop', textKey: 'phone.reply.stop' },
      { id: 'private', textKey: 'phone.reply.private' },
    ],
    messages: ['phone.line.sorry', 'phone.line.identity', 'phone.line.proxy'],
  },
  {
    id: 'identity',
    replies: [{ id: 'now', textKey: 'phone.reply.now' }],
    messages: ['phone.line.now'],
  },
  {
    id: 'handover',
    replies: [{ id: 'task', textKey: 'phone.reply.task' }],
    messages: ['phone.line.nepal'],
  },
  {
    id: 'journey',
    replies: [{ id: 'why', textKey: 'phone.reply.why' }],
    messages: ['phone.line.stupa', 'phone.line.letter', 'phone.line.condition'],
  },
  {
    id: 'recording',
    replies: [{ id: 'voice', textKey: 'phone.reply.voice' }],
    messages: [],
  },
];

export function selectPrologueReply(replies, replyId) {
  const turn = prologueTurns[replies.length];
  const reply = turn?.replies.find(({ id }) => id === replyId);
  return reply ? [...replies, reply] : replies;
}

export function prologueChoices(replies) {
  if (replies.length !== prologueTurns.length) return null;
  return Object.fromEntries(prologueTurns.map((turn, index) => [
    `prologue.${turn.id}`, replies[index].id,
  ]));
}
