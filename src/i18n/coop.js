/**
 * Co-op Party, Zone Presence & Terma Dungeon Co-op i18n Strings (`src/i18n/coop.js`) — Issue #61 / #176
 *
 * Registers Traditional Chinese (`zh-Hant` / `zh`) and English (`en`) translations for:
 *   - Co-op Lobby Modal (`#coop-lobby-modal`)
 *   - Live Zone Presence (`stupa`, `grove`, `wild`) & Ambient Pilgrims toggle
 *   - Public Room Matchmaking Browser (`#coop-public-rooms-list`)
 *   - Dharma Emotes / Prayer Bubbles (`#coop-emote-bar`) & Shared Kora Communion
 *   - AI Dharma Companions (`蓮華行者・扎西`, `普巴行者・卓瑪`, `金剛行者・貢噶`)
 *   - Top-Left Party & Zone Presence HUD Frame (`#coop-party-hud`)
 *   - Six-Syllable Mantra Resonance & Teammate Revive prompts/toasts
 *   - Co-op Terma Dungeon scaling & find bonus badges in Tier Select
 */
import { i18n } from '../i18n.js';

const ZH_HANT = {
  // ---------------------------------------------------------------- Lobby Modal
  'coop.title': '金剛道友・十方共修與伏藏組隊',
  'coop.subtitle': '於博達哈大佛塔與雪域原野同分流共修，或建立 2–4 人金剛道友小隊（支援 WebSocket 即時同步、跨分頁共處與護法道友幻身）',
  'coop.btn.toggleTitle': '金剛道友組隊與十方共修 (Co-op)',
  'coop.pilgrimName.label': '你的法號 / 行者名號',
  'coop.pilgrimName.placeholder': '輸入行者名號…',
  'coop.pilgrimName.default': '雪域行者',
  'coop.room.label': '組隊房間密印（Room Code）',
  'coop.room.none': '尚未組隊（十方自由共修）',
  'coop.room.createBtn': '✨ 開啟組隊壇城（建立房間）',
  'coop.room.joinPlaceholder': '輸入房間代碼，例如 PADMA-108',
  'coop.room.joinBtn': '🔗 結緣加入',
  'coop.room.copyBtn': '📋 複製代碼',
  'coop.room.copied': '已複製房間代碼：{code}',
  'coop.room.leaveBtn': '🚪 離開隊伍',
  'coop.room.hostBadge': '隊長',
  'coop.room.aiBadge': '護法道友',
  'coop.room.peerBadge': '連線行者',
  'coop.room.ambientBadge': '十方行者',
  'coop.room.youBadge': '你',

  // ---------------------------------------------------------------- Online Zone Presence
  'coop.presence.title': '🌐 十方行者區域分流狀態',
  'coop.presence.banner': '線上行者 {total} 人 · 當前分流 {shard}（同區共修 {here} 人）',
  'coop.presence.zoneCount': '博達哈大佛塔 {stupa} 人 · 祈願塔林 {grove} 人 · 北郊原野 {wild} 人',
  'coop.presence.toggle': '在佛塔與原野顯示十方線上行者（無須房號即刻共修與原野共鬥）',
  'coop.presence.hudTitle': '🌐 十方共修（同區 {count} 人）',
  'coop.presence.hudSub': '同行繞塔可獲「☸ 十方共修加持」· 原野可合力降魔',
  'coop.presence.ambientTag': '同區共修',

  // ---------------------------------------------------------------- Public Room Browser
  'coop.publicRooms.title': '🔓 公開招募隊伍列表',
  'coop.publicRooms.empty': '目前尚無公開招募房間 — 可直接建立公開房間，或在佛塔與十方行者自由繞塔共修',
  'coop.publicRooms.joinBtn': '🔗 一鍵加入',
  'coop.publicRooms.refreshBtn': '🔄 重新整理',
  'coop.publicRooms.publicToggle': '公開招募此房間（允許十方線上行者於列表一鍵加入）',
  'coop.publicRooms.roomItem': '{code} · 隊長 {host}（{zone} · {size}/{max} 人）',

  // ---------------------------------------------------------------- Dharma Emotes / Prayer Bubbles
  'coop.emote.title': '🙏 法語祈願氣泡快捷列',
  'coop.emote.prostrate': '🙏 頂禮隨喜',
  'coop.emote.mantra': '☸ 嗡嘛呢唄美吽',
  'coop.emote.lamp': '🪔 供燈祈願',
  'coop.emote.protect': '⚔️ 護法除障',

  // ---------------------------------------------------------------- AI Dharma Companions
  'coop.ai.sectionTitle': '同行道友幻身（AI Dharma Companions）',
  'coop.ai.sectionDesc': '單人或雙人皆可召喚金剛道友幻身補滿 4 人小隊，一同跟隨巡禮、施放六字大明咒共鳴並勇闖伏藏秘境。',
  'coop.ai.summonBtn': '➕ 召喚同行道友幻身',
  'coop.ai.summonSpecific': '➕ 召喚 {name}',
  'coop.ai.dismissBtn': '遣散',
  'coop.ai.name.0': '蓮華行者・扎西',
  'coop.ai.name.1': '普巴行者・卓瑪',
  'coop.ai.name.2': '金剛行者・貢噶',
  'coop.ai.title.0': '寧瑪持明行者',
  'coop.ai.title.1': '空行瑜伽女',
  'coop.ai.title.2': '雪山苦行僧',

  // ---------------------------------------------------------------- Party Roster & Actions
  'coop.party.header': '當前金剛道友小隊（{count} / 4 人）',
  'coop.party.emptySlot': '空位（可等待連線道友加入或召喚同行幻身）',
  'coop.party.bonusBadge': '+{bonus}% 伏藏尋寶 · ☸ 真言共鳴（{resonances} 次）',
  'coop.party.launchTermaBtn': '⚔️ 全隊進入伏藏秘境',
  'coop.party.teleportLeaderBtn': '⚡ 傳送至隊長',
  'coop.party.joinLeaderTermaBtn': '⚔️ 進入隊長秘境',
  'coop.party.reviveBtn': '💧 甘露救援',
  'coop.party.closeBtn': '關閉 [Esc]',

  // ---------------------------------------------------------------- Top-Left Party HUD Frame
  'coop.hud.title': '金剛道友',
  'coop.hud.room': '密印 {code}',
  'coop.hud.bonus': '+{bonus}% 尋寶 · ☸ 共鳴 {count}',
  'coop.hud.fainted': '力竭待援',
  'coop.hud.reviveHint': '靠近按 [E] 甘露救援',
  'coop.hud.teleportLeader': '傳送至隊長',
  'coop.hud.joinTerma': '進入隊長秘境',
  'coop.hud.openLobby': '組隊大廳',
  'coop.hud.meetup': '⚡ 會合',

  // ---------------------------------------------------------------- 3D Nameplate & Prompts
  'coop.prompt.revive': '按 [E] 施予甘露救援 {name}（恢復 60% 氣血）',
  'coop.nameplate.fainted': '[按 E 甘露救援]',
  'coop.nameplate.ambient': '🌐 十方共修行者',

  // ---------------------------------------------------------------- Toasts & Combat Resonance
  'toast.coopCreated': '已開啟金剛道友組隊壇城！房間代碼：{code}',
  'toast.coopJoined': '已加入金剛道友房間：{code}',
  'toast.coopLeft': '已離開金剛道友隊伍',
  'toast.coopAiSummoned': '同行道友「{name}」已化現加入隊伍（小隊 {size}/4 人）',
  'toast.coopAiDismissed': '同行道友「{name}」已合十辭別',
  'toast.coopPartyFull': '金剛道友小隊已滿員（最多 4 人）',
  'toast.mantraResonance': '☸ 六字真言共鳴！範圍擴大並恢復全隊氣血',
  'toast.allyRevived': '以青朴甘露救援了道友「{name}」（恢復 60% 氣血）！',
  'toast.coopTeleported': '已隨順緣起傳送至隊長所在區域',
  'toast.coopTermaSynced': '隊長已開啟伏藏秘境（Tier {tier} · 第 {floor} 層），全隊同步踏入！',
  'toast.sharedKoraCommunion': '☸ 十方共修繞塔加持！與行者「{name}」同行繞塔，恢復氣血氣力並增上功德',
  'toast.emoteSent': '已發送法語祈願：{text}',

  // ---------------------------------------------------------------- Terma Tier Select Co-op Banner
  'dungeon.coop.bannerTitle': '🤝 金剛道友組隊共鬥（{size} / 4 人）',
  'dungeon.coop.soloHint': '目前為單人挑戰 — 可開啟組隊大廳或立即召喚護法道友同行！',
  'dungeon.coop.stats': '魔障氣血 ×{hpMult} · 隊伍尋寶加成 +{findBonus}% · ☸ 真言共鳴已啟用',
  'dungeon.coop.openLobbyBtn': '🤝 組隊大廳',
  'dungeon.coop.summonAiBtn': '➕ 召喚同行道友',
};

const EN = {
  // ---------------------------------------------------------------- Lobby Modal
  'coop.title': 'Vajra Sangha · Zone Presence & Co-op Party',
  'coop.subtitle': 'Share live Stupa & Wilderness zones with online pilgrims, or form a 2–4 player Vajra Sangha party (WebSocket sync, multi-tab presence & AI Dharma Companions)',
  'coop.btn.toggleTitle': 'Vajra Sangha Co-op & Zone Presence',
  'coop.pilgrimName.label': 'Your Pilgrim Dharma Name',
  'coop.pilgrimName.placeholder': 'Enter pilgrim name…',
  'coop.pilgrimName.default': 'Snowland Pilgrim',
  'coop.room.label': 'Sangha Room Code',
  'coop.room.none': 'Open Zone Pilgrimage (Not in a private party)',
  'coop.room.createBtn': '✨ Create Sangha Room',
  'coop.room.joinPlaceholder': 'Enter room code, e.g. PADMA-108',
  'coop.room.joinBtn': '🔗 Join Room',
  'coop.room.copyBtn': '📋 Copy Code',
  'coop.room.copied': 'Copied room code: {code}',
  'coop.room.leaveBtn': '🚪 Leave Party',
  'coop.room.hostBadge': 'Leader',
  'coop.room.aiBadge': 'Dharma Ally',
  'coop.room.peerBadge': 'Peer Pilgrim',
  'coop.room.ambientBadge': 'Zone Pilgrim',
  'coop.room.youBadge': 'You',

  // ---------------------------------------------------------------- Online Zone Presence
  'coop.presence.title': '🌐 Live Zone Presence & Shards',
  'coop.presence.banner': '{total} Pilgrims Online · Shard {shard} ({here} in this zone)',
  'coop.presence.zoneCount': 'Boudhanath Stupa {stupa} · Stupa Grove {grove} · North Wilderness {wild}',
  'coop.presence.toggle': 'Show ambient online pilgrims in Stupa & Wilderness (shared Kora & combat without room code)',
  'coop.presence.hudTitle': '🌐 Zone Pilgrims ({count} nearby)',
  'coop.presence.hudSub': 'Walk Kora together for Shared Blessing · Co-fight in Wilderness',
  'coop.presence.ambientTag': 'In Zone',

  // ---------------------------------------------------------------- Public Room Browser
  'coop.publicRooms.title': '🔓 Public Sangha Rooms',
  'coop.publicRooms.empty': 'No public rooms open right now — create a public room or walk Kora freely with zone pilgrims',
  'coop.publicRooms.joinBtn': '🔗 Join 1-Click',
  'coop.publicRooms.refreshBtn': '🔄 Refresh',
  'coop.publicRooms.publicToggle': 'Publicly list this room (allow online pilgrims to join with 1 click)',
  'coop.publicRooms.roomItem': '{code} · Leader {host} ({zone} · {size}/{max})',

  // ---------------------------------------------------------------- Dharma Emotes / Prayer Bubbles
  'coop.emote.title': '🙏 Dharma Emotes & Prayer Bubbles',
  'coop.emote.prostrate': '🙏 Prostrate & Rejoice',
  'coop.emote.mantra': '☸ Om Mani Padme Hum',
  'coop.emote.lamp': '🪔 Butter Lamp Prayer',
  'coop.emote.protect': '⚔️ Dharma Protector',

  // ---------------------------------------------------------------- AI Dharma Companions
  'coop.ai.sectionTitle': 'AI Dharma Companions',
  'coop.ai.sectionDesc': 'Summon AI Dharma Companions anytime to fill up to 4 party slots — they follow across zones, chant the Six-Syllable Mantra for Resonance, and fight in Terma Dungeons.',
  'coop.ai.summonBtn': '➕ Summon Dharma Companion',
  'coop.ai.summonSpecific': '➕ Summon {name}',
  'coop.ai.dismissBtn': 'Dismiss',
  'coop.ai.name.0': 'Padma Pilgrim · Tashi',
  'coop.ai.name.1': 'Phurba Yogini · Drolma',
  'coop.ai.name.2': 'Vajra Ascetic · Kunga',
  'coop.ai.title.0': 'Nyingma Vidyadhara',
  'coop.ai.title.1': 'Dakini Mantrika',
  'coop.ai.title.2': 'Snow Mountain Ascetic',

  // ---------------------------------------------------------------- Party Roster & Actions
  'coop.party.header': 'Vajra Sangha Party ({count} / 4)',
  'coop.party.emptySlot': 'Open Slot (Invite a peer by code or summon a Dharma Companion)',
  'coop.party.bonusBadge': '+{bonus}% Terma Find · ☸ Resonance ({resonances})',
  'coop.party.launchTermaBtn': '⚔️ Launch Co-op Terma Run',
  'coop.party.teleportLeaderBtn': '⚡ Teleport to Leader',
  'coop.party.joinLeaderTermaBtn': "⚔️ Join Leader's Terma",
  'coop.party.reviveBtn': '💧 Amrita Revive',
  'coop.party.closeBtn': 'Close [Esc]',

  // ---------------------------------------------------------------- Top-Left Party HUD Frame
  'coop.hud.title': 'Vajra Sangha',
  'coop.hud.room': 'Room {code}',
  'coop.hud.bonus': '+{bonus}% Find · ☸ Resonance {count}',
  'coop.hud.fainted': 'Fainted',
  'coop.hud.reviveHint': 'Press [E] nearby to Revive',
  'coop.hud.teleportLeader': 'Teleport to Leader',
  'coop.hud.joinTerma': "Join Leader's Terma",
  'coop.hud.openLobby': 'Co-op Lobby',
  'coop.hud.meetup': '⚡ Meet Up',

  // ---------------------------------------------------------------- 3D Nameplate & Prompts
  'coop.prompt.revive': 'Press [E] to revive {name} with Amrita (Restores 60% HP)',
  'coop.nameplate.fainted': '[Press E to Revive]',
  'coop.nameplate.ambient': '🌐 Fellow Pilgrim',

  // ---------------------------------------------------------------- Toasts & Combat Resonance
  'toast.coopCreated': 'Vajra Sangha room created! Code: {code}',
  'toast.coopJoined': 'Joined Vajra Sangha room: {code}',
  'toast.coopLeft': 'Left the Vajra Sangha party',
  'toast.coopAiSummoned': 'Dharma Companion "{name}" joined the party ({size}/4)',
  'toast.coopAiDismissed': 'Dharma Companion "{name}" departed with palms joined',
  'toast.coopPartyFull': 'Party is already full (max 4 pilgrims)',
  'toast.mantraResonance': '☸ Six-Syllable Mantra Resonance! Expanded wave & restored party HP/MP',
  'toast.allyRevived': 'Revived companion "{name}" with Amrita (60% HP restored)!',
  'toast.coopTeleported': "Teleported to Party Leader's zone",
  'toast.coopTermaSynced': 'Party Leader entered Terma Realm (Tier {tier} · Floor {floor}) — syncing party!',
  'toast.sharedKoraCommunion': '☸ Shared Kora Communion with "{name}"! Restored 5% HP, 8% MP & gained Kora merit',
  'toast.emoteSent': 'Sent Dharma prayer: {text}',

  // ---------------------------------------------------------------- Terma Tier Select Co-op Banner
  'dungeon.coop.bannerTitle': '🤝 Vajra Sangha Co-op ({size} / 4 Pilgrims)',
  'dungeon.coop.soloHint': 'Currently solo — open the Co-op Lobby or summon a Dharma Companion to join your run!',
  'dungeon.coop.stats': 'Monster HP ×{hpMult} · Party Find Bonus +{findBonus}% · ☸ Mantra Resonance Active',
  'dungeon.coop.openLobbyBtn': '🤝 Co-op Lobby',
  'dungeon.coop.summonAiBtn': '➕ Summon Companion',
};

i18n.register({
  'zh-Hant': ZH_HANT,
  en: EN,
});

export { ZH_HANT, EN };
