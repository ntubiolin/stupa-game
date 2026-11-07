import { CHAPTERS } from './chapters.js';

// Fixed authored exchanges. Prologue keeps its existing choice contract.
export const phoneThreads = Object.freeze([
  {
    "id": "hotel",
    "titleKey": "phone.thread.hotel.title",
    "signal": "online",
    "chapterId": null,
    "checkpointId": null,
    "turns": [
      {
        "id": "0",
        "replyKey": "phone.thread.hotel.0.reply",
        "messages": [
          "phone.thread.hotel.0.0"
        ]
      },
      {
        "id": "1",
        "replyKey": "phone.thread.hotel.1.reply",
        "messages": [
          "phone.thread.hotel.1.0"
        ]
      }
    ]
  },
  {
    "id": "pharping",
    "titleKey": "phone.thread.pharping.title",
    "signal": "delayed",
    "chapterId": "pharping",
    "checkpointId": "phone",
    "turns": [
      {
        "id": "0",
        "replyKey": "phone.thread.pharping.0.reply",
        "messages": [
          "phone.thread.pharping.0.0",
          "phone.thread.pharping.0.1"
        ]
      },
      {
        "id": "1",
        "replyKey": "phone.thread.pharping.1.reply",
        "messages": [
          "phone.thread.pharping.1.0",
          "phone.thread.pharping.1.1"
        ]
      }
    ]
  },
  {
    "id": "mangyul",
    "titleKey": "phone.thread.mangyul.title",
    "signal": "weak",
    "chapterId": "mangyul",
    "checkpointId": "message",
    "turns": [
      {
        "id": "0",
        "replyKey": "phone.thread.mangyul.0.reply",
        "messages": [
          "phone.thread.mangyul.0.0"
        ]
      },
      {
        "id": "1",
        "replyKey": "phone.thread.mangyul.1.reply",
        "messages": [
          "phone.thread.mangyul.1.0"
        ]
      },
      {
        "id": "2",
        "replyKey": "phone.thread.mangyul.2.reply",
        "messages": [
          "phone.thread.mangyul.2.0"
        ]
      }
    ]
  },
  {
    "id": "mangyul-snow",
    "titleKey": "phone.thread.mangyul-snow.title",
    "signal": "sending",
    "chapterId": "mangyul",
    "checkpointId": "phone",
    "turns": [
      {
        "id": "0",
        "replyKey": "phone.thread.mangyul-snow.0.reply",
        "messages": []
      }
    ]
  },
  {
    "id": "yarlung",
    "titleKey": "phone.thread.yarlung.title",
    "signal": "delayed",
    "chapterId": "yarlung",
    "checkpointId": "boundary",
    "turns": [
      {
        "id": "0",
        "replyKey": "phone.thread.yarlung.0.reply",
        "messages": [
          "phone.thread.yarlung.0.0"
        ]
      },
      {
        "id": "1",
        "replyKey": "phone.thread.yarlung.1.reply",
        "messages": [
          "phone.thread.yarlung.1.0",
          "phone.thread.yarlung.1.1"
        ]
      }
    ]
  },
  {
    "id": "samye",
    "titleKey": "phone.thread.samye.title",
    "signal": "weak",
    "chapterId": "samye",
    "checkpointId": "rebuild",
    "turns": [
      {
        "id": "0",
        "replyKey": "phone.thread.samye.0.reply",
        "messages": [
          "phone.thread.samye.0.0"
        ]
      },
      {
        "id": "1",
        "replyKey": "phone.thread.samye.1.reply",
        "messages": [
          "phone.thread.samye.1.0"
        ]
      }
    ]
  },
  {
    "id": "chimphu",
    "titleKey": "phone.thread.chimphu.title",
    "signal": "weak",
    "chapterId": "chimphu",
    "checkpointId": "descent",
    "turns": [
      {
        "id": "0",
        "replyKey": "phone.thread.chimphu.0.reply",
        "messages": [
          "phone.thread.chimphu.0.0"
        ]
      },
      {
        "id": "1",
        "replyKey": "phone.thread.chimphu.1.reply",
        "messages": [
          "phone.thread.chimphu.1.0"
        ]
      },
      {
        "id": "2",
        "replyKey": "phone.thread.chimphu.2.reply",
        "messages": [
          "phone.thread.chimphu.2.0"
        ]
      }
    ]
  }
].map(thread => Object.freeze(thread)));

export function phoneReplyKey(threadId, turnId) {
  return `phone.${threadId}.${turnId}`;
}
export function phoneReadFlag(threadId) {
  return `phone.read.${threadId}`;
}
export function readThreadReplies(snapshot, threadId) {
  const thread = phoneThreads.find(entry => entry.id === threadId);
  const replies = [];
  for (const turn of thread?.turns ?? []) {
    if (snapshot.choices?.[phoneReplyKey(threadId, turn.id)] !== turn.id) break;
    replies.push(turn);
  }
  return replies;
}
export function isThreadUnlocked(snapshot, thread) {
  if (!thread.chapterId) return ['map', 'vision', 'return', 'complete'].includes(snapshot.beat);
  const chapter = CHAPTERS.find(entry => entry.id === thread.chapterId);
  const record = snapshot.journey?.chapters?.[thread.chapterId];
  if (!chapter || !record) return false;
  const current = chapter.checkpoints.findIndex(step => step.id === record.checkpointId);
  const unlocked = chapter.checkpoints.findIndex(step => step.id === thread.checkpointId);
  return current >= 0 && unlocked >= 0 && current >= unlocked;
}
export function visiblePhoneThreads(snapshot) {
  return phoneThreads.filter(thread => isThreadUnlocked(snapshot, thread));
}
export function unreadPhoneThreads(snapshot) {
  if (snapshot.journey?.chapters?.finale?.choices?.decision) return [];
  return visiblePhoneThreads(snapshot).filter(thread => !snapshot.flags?.[phoneReadFlag(thread.id)]);
}
export function phoneSignal(snapshot, threadId) {
  if (snapshot.journey?.chapters?.finale?.choices?.decision) return 'completed';
  const thread = phoneThreads.find(entry => entry.id === threadId);
  if (thread && isThreadUnlocked(snapshot, thread)) {
    if (thread.id === 'mangyul' && readThreadReplies(snapshot, thread.id).length === thread.turns.length) return 'offline';
    return thread.signal;
  }
  const chapterId = snapshot.journey?.activeChapterId;
  if (chapterId === 'chimphu' || chapterId === 'finale') return 'offline';
  if (chapterId === 'mangyul' || chapterId === 'samye') return 'weak';
  if (chapterId === 'pharping' || chapterId === 'yarlung') return 'delayed';
  return 'online';
}

// Original offline handover code, encoded with qrcode 8.2 (MIT), payload stupa:task-handover.
export const HANDOVER_QR_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 33 33" aria-hidden="true" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><path d="M4 4h1v1h-1z M5 4h1v1h-1z M6 4h1v1h-1z M7 4h1v1h-1z M8 4h1v1h-1z M9 4h1v1h-1z M10 4h1v1h-1z M12 4h1v1h-1z M13 4h1v1h-1z M17 4h1v1h-1z M18 4h1v1h-1z M19 4h1v1h-1z M20 4h1v1h-1z M22 4h1v1h-1z M23 4h1v1h-1z M24 4h1v1h-1z M25 4h1v1h-1z M26 4h1v1h-1z M27 4h1v1h-1z M28 4h1v1h-1z M4 5h1v1h-1z M10 5h1v1h-1z M14 5h1v1h-1z M17 5h1v1h-1z M22 5h1v1h-1z M28 5h1v1h-1z M4 6h1v1h-1z M6 6h1v1h-1z M7 6h1v1h-1z M8 6h1v1h-1z M10 6h1v1h-1z M13 6h1v1h-1z M18 6h1v1h-1z M22 6h1v1h-1z M24 6h1v1h-1z M25 6h1v1h-1z M26 6h1v1h-1z M28 6h1v1h-1z M4 7h1v1h-1z M6 7h1v1h-1z M7 7h1v1h-1z M8 7h1v1h-1z M10 7h1v1h-1z M12 7h1v1h-1z M13 7h1v1h-1z M14 7h1v1h-1z M15 7h1v1h-1z M16 7h1v1h-1z M17 7h1v1h-1z M18 7h1v1h-1z M19 7h1v1h-1z M22 7h1v1h-1z M24 7h1v1h-1z M25 7h1v1h-1z M26 7h1v1h-1z M28 7h1v1h-1z M4 8h1v1h-1z M6 8h1v1h-1z M7 8h1v1h-1z M8 8h1v1h-1z M10 8h1v1h-1z M12 8h1v1h-1z M13 8h1v1h-1z M16 8h1v1h-1z M17 8h1v1h-1z M19 8h1v1h-1z M20 8h1v1h-1z M22 8h1v1h-1z M24 8h1v1h-1z M25 8h1v1h-1z M26 8h1v1h-1z M28 8h1v1h-1z M4 9h1v1h-1z M10 9h1v1h-1z M12 9h1v1h-1z M13 9h1v1h-1z M15 9h1v1h-1z M18 9h1v1h-1z M20 9h1v1h-1z M22 9h1v1h-1z M28 9h1v1h-1z M4 10h1v1h-1z M5 10h1v1h-1z M6 10h1v1h-1z M7 10h1v1h-1z M8 10h1v1h-1z M9 10h1v1h-1z M10 10h1v1h-1z M12 10h1v1h-1z M14 10h1v1h-1z M16 10h1v1h-1z M18 10h1v1h-1z M20 10h1v1h-1z M22 10h1v1h-1z M23 10h1v1h-1z M24 10h1v1h-1z M25 10h1v1h-1z M26 10h1v1h-1z M27 10h1v1h-1z M28 10h1v1h-1z M12 11h1v1h-1z M13 11h1v1h-1z M15 11h1v1h-1z M16 11h1v1h-1z M4 12h1v1h-1z M8 12h1v1h-1z M10 12h1v1h-1z M11 12h1v1h-1z M12 12h1v1h-1z M14 12h1v1h-1z M16 12h1v1h-1z M17 12h1v1h-1z M18 12h1v1h-1z M19 12h1v1h-1z M21 12h1v1h-1z M22 12h1v1h-1z M23 12h1v1h-1z M24 12h1v1h-1z M25 12h1v1h-1z M28 12h1v1h-1z M7 13h1v1h-1z M8 13h1v1h-1z M9 13h1v1h-1z M15 13h1v1h-1z M16 13h1v1h-1z M18 13h1v1h-1z M19 13h1v1h-1z M20 13h1v1h-1z M24 13h1v1h-1z M25 13h1v1h-1z M27 13h1v1h-1z M4 14h1v1h-1z M5 14h1v1h-1z M6 14h1v1h-1z M7 14h1v1h-1z M8 14h1v1h-1z M10 14h1v1h-1z M14 14h1v1h-1z M17 14h1v1h-1z M18 14h1v1h-1z M19 14h1v1h-1z M20 14h1v1h-1z M21 14h1v1h-1z M22 14h1v1h-1z M23 14h1v1h-1z M24 14h1v1h-1z M26 14h1v1h-1z M5 15h1v1h-1z M13 15h1v1h-1z M14 15h1v1h-1z M16 15h1v1h-1z M17 15h1v1h-1z M19 15h1v1h-1z M22 15h1v1h-1z M26 15h1v1h-1z M27 15h1v1h-1z M5 16h1v1h-1z M6 16h1v1h-1z M8 16h1v1h-1z M9 16h1v1h-1z M10 16h1v1h-1z M11 16h1v1h-1z M12 16h1v1h-1z M16 16h1v1h-1z M17 16h1v1h-1z M22 16h1v1h-1z M25 16h1v1h-1z M26 16h1v1h-1z M27 16h1v1h-1z M28 16h1v1h-1z M4 17h1v1h-1z M6 17h1v1h-1z M7 17h1v1h-1z M9 17h1v1h-1z M13 17h1v1h-1z M14 17h1v1h-1z M17 17h1v1h-1z M18 17h1v1h-1z M19 17h1v1h-1z M20 17h1v1h-1z M24 17h1v1h-1z M27 17h1v1h-1z M7 18h1v1h-1z M10 18h1v1h-1z M13 18h1v1h-1z M19 18h1v1h-1z M20 18h1v1h-1z M22 18h1v1h-1z M23 18h1v1h-1z M25 18h1v1h-1z M26 18h1v1h-1z M12 19h1v1h-1z M16 19h1v1h-1z M18 19h1v1h-1z M26 19h1v1h-1z M28 19h1v1h-1z M4 20h1v1h-1z M5 20h1v1h-1z M6 20h1v1h-1z M7 20h1v1h-1z M10 20h1v1h-1z M13 20h1v1h-1z M15 20h1v1h-1z M17 20h1v1h-1z M18 20h1v1h-1z M19 20h1v1h-1z M20 20h1v1h-1z M21 20h1v1h-1z M22 20h1v1h-1z M23 20h1v1h-1z M24 20h1v1h-1z M26 20h1v1h-1z M28 20h1v1h-1z M12 21h1v1h-1z M13 21h1v1h-1z M16 21h1v1h-1z M20 21h1v1h-1z M24 21h1v1h-1z M27 21h1v1h-1z M4 22h1v1h-1z M5 22h1v1h-1z M6 22h1v1h-1z M7 22h1v1h-1z M8 22h1v1h-1z M9 22h1v1h-1z M10 22h1v1h-1z M12 22h1v1h-1z M15 22h1v1h-1z M16 22h1v1h-1z M17 22h1v1h-1z M18 22h1v1h-1z M20 22h1v1h-1z M22 22h1v1h-1z M24 22h1v1h-1z M26 22h1v1h-1z M4 23h1v1h-1z M10 23h1v1h-1z M13 23h1v1h-1z M15 23h1v1h-1z M17 23h1v1h-1z M20 23h1v1h-1z M24 23h1v1h-1z M25 23h1v1h-1z M26 23h1v1h-1z M28 23h1v1h-1z M4 24h1v1h-1z M6 24h1v1h-1z M7 24h1v1h-1z M8 24h1v1h-1z M10 24h1v1h-1z M12 24h1v1h-1z M16 24h1v1h-1z M17 24h1v1h-1z M20 24h1v1h-1z M21 24h1v1h-1z M22 24h1v1h-1z M23 24h1v1h-1z M24 24h1v1h-1z M25 24h1v1h-1z M26 24h1v1h-1z M28 24h1v1h-1z M4 25h1v1h-1z M6 25h1v1h-1z M7 25h1v1h-1z M8 25h1v1h-1z M10 25h1v1h-1z M13 25h1v1h-1z M14 25h1v1h-1z M17 25h1v1h-1z M18 25h1v1h-1z M19 25h1v1h-1z M21 25h1v1h-1z M22 25h1v1h-1z M23 25h1v1h-1z M26 25h1v1h-1z M27 25h1v1h-1z M28 25h1v1h-1z M4 26h1v1h-1z M6 26h1v1h-1z M7 26h1v1h-1z M8 26h1v1h-1z M10 26h1v1h-1z M13 26h1v1h-1z M19 26h1v1h-1z M20 26h1v1h-1z M21 26h1v1h-1z M22 26h1v1h-1z M23 26h1v1h-1z M25 26h1v1h-1z M27 26h1v1h-1z M4 27h1v1h-1z M10 27h1v1h-1z M13 27h1v1h-1z M16 27h1v1h-1z M18 27h1v1h-1z M19 27h1v1h-1z M21 27h1v1h-1z M22 27h1v1h-1z M26 27h1v1h-1z M27 27h1v1h-1z M4 28h1v1h-1z M5 28h1v1h-1z M6 28h1v1h-1z M7 28h1v1h-1z M8 28h1v1h-1z M9 28h1v1h-1z M10 28h1v1h-1z M12 28h1v1h-1z M15 28h1v1h-1z M17 28h1v1h-1z M18 28h1v1h-1z M19 28h1v1h-1z M22 28h1v1h-1z M24 28h1v1h-1z M25 28h1v1h-1z M26 28h1v1h-1z M27 28h1v1h-1z M28 28h1v1h-1z" fill="black"/></svg>';
