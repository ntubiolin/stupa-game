# Architecture — Boudhanath Stupa 3D: Footsteps of Padmasambhava

Vite + Three.js, vanilla JS (ES modules), no external 3D/audio assets — everything procedural.

## Directory & ownership

| Path | Owner | Purpose |
|---|---|---|
| `index.html` | Gameplay | SEO head (keep), inline SVG favicon, `#app` canvas container, `#ui` overlay root |
| `vite.config.js` | **Architect** | Rolldown `codeSplitting.groups` (`vendor-three`, `game-combat`, `game-ui`, `game-data`, lazy map chunks) |
| `src/main.js` | **Architect** | renderer, ctx/state, module wiring, game loop (performance.now delta), bloom |
| `src/config.js` | **Architect** | layout constants & balance tuning (`VITALS`, `MANTRA`, `ENEMIES`, `WILD`, `MUSIC`, …) |
| `src/core/events.js` | **Architect** | event bus (`on`, `off`, `emit`) |
| `src/core/debug.js` | **Architect** | console inspection & debug API (`window.__stupa`) |
| `src/core/input.js` | Gameplay | keyboard / mouse-drag / touch virtual joystick (`JOY_RADIUS = 60`) + mobile arc skill pad → action state |
| `src/i18n.js`, `src/i18n/*.js` | Gameplay | `zh-Hant` / `en` strings (`1,827` keys), `i18n.register(dict)`, dynamic substitution (`maps`, `quests`, `items`, `skills`, `codex`, `murals`, `community`, `stupaBuild`, `coop`, `prologue`, `ch1`–`ch5`) |
| `src/world/sky.js` | World | sky dome, sun/moon, stars, lights, fog, exposure — writes `state.time.sunDir/nightFactor` |
| `src/world/stupa.js` | World | stupa, wall, prayer wheels, night string lights; exports `flagAnchors` |
| `src/world/prayerFlags.js` | World | wind-animated five-color flags (vertex shader) |
| `src/world/environment.js` | World | plaza ground, surrounding buildings, hills, pigeons, lit windows at night, north monastery gate & south grove gate |
| `src/world/mapBase.js` | World | shared terrain heightfield, InstancedMesh rock scatter, mountain rim, seeded RNG, collider helper |
| `src/world/wilderness.js` | World | highland steppe terrain, chorten, mani stones, boulders, peaks, return gate (lazy-loaded) |
| `src/world/maps/grove.js` | World | Outer Sanctuary Hub map: Pilgrim Stupa Grove outside South Gate (`origin = (-1000, 0)`), mandala courtyard & lotus terrace (lazy-loaded) |
| `src/world/maps/pharping.js` | World | Chapter 1 map: Pharping terrace, Yangleshö & Asura caves, drought-to-rain state transition (lazy-loaded) |
| `src/world/maps/mangyul.js` | World | Chapter 2 map: Mangyul snow pass, wind gust physics, wind-shelter cairns, Tenma arena (lazy-loaded) |
| `src/world/maps/yarlung.js` | World | Chapter 3 map: Yarlung valley, Yumbulagang fortress, Sheldrak crystal cave, Shampo glacier (lazy-loaded) |
| `src/world/maps/samye.js` | World | Chapter 4 map: Mount Hepo Ri, Samye 5-stage construction (1,008 InstancedMesh mini-stupas), day/night defense (lazy-loaded) |
| `src/world/maps/chimphu.js` | World | Chapter 5 hub map: Chimphu hermitage caves, butter-lamp alcoves, Terma Realm portal (lazy-loaded) |
| `src/world/maps/terma.js` | World | Chapter 5 endgame dungeon: seeded 3-floor procedural layout (Cave / Snow / Mandala themes) (lazy-loaded) |
| `src/world/maps/sandbox.js` | World | debug sandbox arena with flat ground, scattered rocks, trial stone circle, Mani cairn (lazy-loaded) |
| `src/data/maps.js`, `src/data/maps/*.js` | Data | data-driven map registry (`MAPS`: `stupa`, `grove`, `wild`, `pharping`, `mangyul`, `yarlung`, `samye`, `chimphu`, `terma`, `sandbox`) |
| `src/data/npcs.js` | Data | data-driven NPC registry (`NPCS`) and 8 procedural look definitions (`NPC_LOOKS`) |
| `src/data/itemBases.js`, `affixes.js`, `legendaries.js` | Data | 22 base equipment types across 8 slots, 16 affixes (T1–T4), 12 Terma legendary items (`powerId`) |
| `src/data/eliteAffixes.js` | Data | 6 elite monster affixes (`molten`, `frozen`, `swift`, `armored`, `shielding`, `teleporter`) |
| `src/data/skills.js` | Data | 7 player skills (`humBolt`, `mantra`, `phurba`, `lotusShield`, `vajraBell`, `protector`, `vajraGuru`) & Rank 1–5 / A-B enhancements |
| `src/data/enemies/*.js` | Data | chapter enemy definitions (`pharping`, `mangyul`, `yarlung`, `samye`), auto-discovered via `import.meta.glob` |
| `src/data/quests/*.js`, `src/data/dialogues/*.js` | Data | Prologue + Ch1–Ch5 quest chains (`22` main quests) and conditional branching dialogue trees |
| `src/data/codex.js`, `src/data/codex/*.js` | Data | 38 Dharma Codex entries (`place`, `person`, `deity`, `concept`, `practice`) with `[史實]`/`[傳說]` tags & 59 external URLs |
| `src/data/murals.js`, `public/murals/*.webp` | Data / Art | 20 offline Tibetan mural cutout sprites & 6 chapter mural scroll layouts (`prologue`, `ch1`–`ch5`, 22 quest episodes) |
| `src/data/stupaMaterials.js` | Data | Kora/Prostration-unlocked votive stupa parts (`plinth`, `dome`, `spire`, `ornament`) & Samye 1,008-stupa global milestones |
| `src/player/player.js` | Gameplay | pilgrim mesh, movement, collision, prostration animation, kora tracking |
| `src/player/cameraRig.js` | Gameplay | third-person follow camera + intro orbit + cutscene camera override |
| `src/gameplay/mantra.js` | Gameplay | Six-Syllable Mantra (六字大明咒) area wave, syllables pool, cooldown & MP handling |
| `src/gameplay/skills/activeSkills.js` | Gameplay | execution & 3D VFX for `humBolt`, `phurba`, `lotusShield`, `vajraBell`, and `vajraGuru` ultimate |
| `src/gameplay/targeting.js` | Gameplay | soft auto-aim target selection within forward cone & golden ground target reticle |
| `src/gameplay/allies.js` | Gameplay | 3 oath-bound Dharma Protectors (`tenma`, `whiteYak`, `pehar`) 3D procedural models, AI, and summons |
| `src/gameplay/enemies.js`, `src/gameplay/enemyModels/*.js` | Gameplay | enemy models, AI state machine, elite packs & affixes, telegraphs, status effects (`root`/`stun`/`slow`/`vuln`), liberation VFX |
| `src/gameplay/bosses/index.js`, `bossBase.js`, `patterns.js`, `<boss>.js` | Gameplay | multi-phase Boss framework, arena barriers, telegraphed patterns, and 6 Bosses (`migoiKing`, `droughtLord`, `tenmaStorm`, `yarlhaShampo`, `pehar`, `termaGuardian`) |
| `src/gameplay/dungeon.js` | Gameplay | Terma procedural 3-floor dungeon generator (`mulberry32` PRNG), tier selector (Tier 1–10), floor gates, Terma crystals, Vault Room reliquary & Floor 3 Terma Chest |
| `src/gameplay/termaCaves.js` | Gameplay | Ch1–Ch5 Terma Cave grottoes, cave guardian ambush trials, interactive Terma Caskets, Shogser scrolls, Mendrup pills, Tertön's Compass & Grand Empowerment |
| `src/gameplay/projectiles.js` | Gameplay | object-pooled projectiles (`ghostfire`, `redArrow`, `boulder`, `frostRoar`), parabolic/homing flight, mantra dispel |
| `src/gameplay/items.js`, `groundLoot.js` | Gameplay | monkey sacred artifacts + Diablo-style ground loot drops, rarity light beams, `Alt` label plate layout, auto-pickup |
| `src/gameplay/potions.js`, `shrines.js`, `waypoints.js` | Gameplay | Amrita potion charges (`X`), 4 blessing shrine types, lotus waypoints & Recall portal (`B`) |
| `src/gameplay/lamps.js`, `monkeys.js`, `npcs.js` | Gameplay | butter-lamp stations + floating prayer plaques, monkey wander/feeding, procedural 3D NPC builder (8 looks) & overhead quest markers (`!`/`?`) |
| `src/gameplay/personalStupa.js`, `remotePilgrims.js` | Gameplay | procedural 3D Pilgrim Votive Stupa groves (`grove` & `samye`), Samye 1,008 perimeter consecration crowns, and 3D Co-op party teammates + ambient online pilgrims + Dharma Emote bubbles + Mantra Resonance VFX |
| `src/systems/community.js`, `coop.js` | Gameplay | async social sync (`BroadcastChannel` + `/api/community` + WS relay + offline write queue + share codes) & real-time Zone Presence / 2–4 player Co-op room / AI companion system |
| `server/store.js`, `handler.js`, `ws.js`, `index.js`, `api/*.js` | **Architect** | persistent JSON/in-memory community store (`.data/stupa-backend.json`), 12-player Zone Sharding (`stupa#1`, `wild#1`, …), public/private Co-op rooms, RFC 6455 WebSocket (`/ws/multiplayer`) & HTTP REST (`/api/community`, `/api/coop`, `/api/presence`) |
| `src/systems/zones.js` | Gameplay | data-driven zone manager (`MAPS`), lazy `import()` loading, gate transitions, `ctx.world` API |
| `src/systems/save.js` | Gameplay | unified v2 save system (`stupa.save.v2`), v1 migration, per-section fault tolerance, throttled writes |
| `src/systems/vitals.js` | Gameplay | vitals system (HP/MP/EXP/ATK/DEF/Crit/Subdue/CDR/Find), Lv 1–40 curve, equipment stat aggregation |
| `src/systems/loot.js`, `inventory.js`, `powers.js` | Gameplay | item generator, 30-slot bag & 8-slot equipment manager, Terma legendary passive power hooks |
| `src/systems/skills.js` | Gameplay | skill cooldowns, MP cost, Rank 1–5 point allocation, Rank 3 A/B enhancement, ultimate charge (`0..30`), hub respec |
| `src/systems/quests.js`, `codex.js` | Gameplay | 9-step-type quest engine, `skipTo('ch1'..'ch5')`, 3D diamond target marker, and 38-entry Codex unlock tracker |
| `src/systems/interaction.js`, `merit.js` | Gameplay | nearest-interactable selection (NPC highest priority), prompt dispatch, merit counters & achievements |
| `src/systems/audio.js` | Gameplay | Web Audio synthesized singing bowl, wind crossfade, bells, chant drone, raptor eagle cry; adaptive score glue (track selection, stingers) |
| `src/systems/music.js` | Gameplay | procedural music engine: synthesized Himalayan instruments, bar look-ahead sequencer, crossfades, stingers, ducking, reverb |
| `src/data/music.js` | Data | score: leitmotifs, per-map / chapter-variant / boss tracks and stingers (A4 = 432 Hz) |
| `src/ui/hud.js`, `skillbar.js`, `style.css` | Gameplay | title screen, HUD, bottom 7-slot skillbar + mobile arc skill pad, prompts, toasts, time slider, language toggle |
| `src/ui/inventory.js`, `shop.js`, `crafting.js` | Gameplay | `I`/`C` Inventory & Character modal, tooltip comparison, mobile action bar, Merchant shop, Artisan reforge/consecrate/salvage |
| `src/ui/mural/scroll.js` | Gameplay | `MuralScrollCanvas` (`1600×900`): Sobel sepia-ink `白描粉本` (`sketch`) extractor, procedural mineral-green mountains/rivers/cloud borders, pan tour, and wet-brush coloring reveal (`playColoringReveal`) |
| `src/ui/dialogue.js`, `src/ui/quests.js` | Gameplay | bottom glassmorphic dialogue box with `[codex:id|text]` links, right-side Quest Tracker, `J` Quest Journal, Chapter Intro Mural Scroll & Quest Completion Wet-Brush Coloring Reveal |
| `src/ui/worldmap.js`, `src/ui/minimap.js`, `src/ui/credits.js` | Gameplay | `M`/`L` 4-tab World Map / Zone Map / Dharma Codex / Mural Scrolls (`壁畫長卷`) modal, top-right circular radar minimap (`Tab`), Finale Ending Credits |
| `src/ui/lampOffering.js`, `stupaBuilder.js`, `coopLobby.js` | Gameplay | Pilgrim Butter-Lamp Offering & Prayer Wall (`🪔`), Personal Votive Stupa Builder & Samye 1,008 Co-op Monument (`🏛️`), Co-op Party HUD & Terma Room Lobby (`🤝`) |
| `scripts/balance-report.mjs`, `check-i18n.mjs`, `check-links.mjs` | Tooling | Lv 1–40 TTK & economy balance simulator, bilingual i18n key verifier, and Codex URL link checker |

Subagents edit **only** files they own. If a contract change is needed, report it to the architect instead of editing shared files.

---

## Coordinates

- Meters, +Y up, origin = stupa center on the ground. North = −Z, East = +X.
- `θ = Math.atan2(z, x)`. **Clockwise kora (stupa on the right shoulder) ⇔ θ increasing.**
- `state.player.heading`: yaw, 0 faces −Z, positive = counter-clockwise rotation about +Y (Three.js `rotation.y`).
- Walkable plaza: ring `WORLD.stupaColliderRadius (19.9) < r < WORLD.walkRadius (38)`, ground y = 0.
- Map Origins (`src/data/maps.js`):
  - `stupa` (博達哈大佛塔): `type: 'hub'`, `origin = (0, 0)`
  - `grove` (祈願塔林): `type: 'hub'`, `origin = (-1000, 0)`, level 1–40
  - `wild` (北郊原野): `type: 'combat'`, `origin = (1000, 0)`, level 1–5
  - `pharping` (帕平・揚列雪): `type: 'combat'`, `origin = (2000, 0)`, level 5–10
  - `mangyul` (芒域山口): `type: 'combat'`, `origin = (3000, 0)`, level 10–16
  - `yarlung` (雅隆河谷): `type: 'combat'`, `origin = (4000, 0)`, level 16–23
  - `samye` (海波日山・桑耶): `type: 'combat'`, `origin = (5000, 0)`, level 23–30
  - `chimphu` (青朴修行地): `type: 'hub'`, `origin = (6000, 0)`, level 28–32
  - `terma` (伏藏秘境): `type: 'dungeon'`, `origin = (7000, 0)`, level 30–40+
  - `sandbox` (測試場, debug only): `type: 'combat'`, `origin = (9000, 0)`
- Layout numbers live in `src/config.js` (`CONFIG.STUPA`, `WALL`, `WORLD`, `LAMPS`, `WILD`, …) and `src/data/maps.js`. Never hardcode duplicates.

---

## Module contract

```js
export function createX(ctx, ...extra) {
  // build meshes, ctx.scene.add(group), push colliders/interactables
  return { update(dt) { /* read ctx.state */ }, /* optional API */ };
}
```

### `ctx` fields

| Field | Description |
|---|---|
| `THREE, scene, camera, renderer` | Three.js objects (camera is moved only by `cameraRig`) |
| `zoneGroups` | `{ [mapId]: THREE.Group }` toggled by active zone (`stupaGroup` & `wildGroup` kept as aliases) |
| `world` | `{ getMap(id?), getHeight(x, z, mapId?), isCombatZone(id?), isHub(id?), sampleSpawnPoint(areaId, opts?) }` |
| `bus` | `{ on(type, fn) → unsubscribe, emit(type, payload) }` |
| `state` | shared mutable game state (below) |
| `config` | `CONFIG` |
| `i18n` | `{ t(key, params?), lang, getLang(), setLang(lang), onChange(fn), register(dict), getStrings(lang?) }` |
| `colliders` | array; push `{type:'circle',x,z,r,zone:mapId}` or `{type:'box',minX,maxX,minZ,maxZ,zone:mapId}` |
| `interactables` | array of Interactable (below) |
| `input` | `{ update(), isDown(action), pressed(action), moveVec(), isTouch, setTouchMode(bool) }` |
| `save` | `{ version: 2, get(section, fallback), set(section, data), markDirty(section), flush(), reset(), exportString(), importString(str) }` |
| `debug` | `{ enabled, register(name, api) }` |
| `mantra` | `{ update(dt), cast(), showRadius(bool), getCooldownFraction() }` |
| `skills` | `{ update(dt), cast(slotOrId), unlock(id), unlockAll(), spendPoint(id), chooseEnhancement(id, enh), setRank(id, rank, enh), respec(), list(), getPoints() }` |
| `activeSkills` | `{ update(dt), castHumBolt, castPhurba, castLotusShield, castVajraBell, castVajraGuru }` |
| `powers` | `{ update(dt), has(powerId), listActive(), set(powerId, enabled) }` |
| `protectors` / `allies` | `{ update(dt), unlock(id), unlockAll(), summon(id?), setActive(id), getActive(), list() }` |
| `enemies` | `{ update(dt), spawn(kind?, distOrOpts?), spawnElite(kind, rank, affixes?), damage(id, amt, opts?), applyStatus(id, kind, dur, extra?), queryCircle, queryCone, queryLine, nearest, clear(), list(), freeze(bool), forceAttack(id?, attackId) }` |
| `bosses` | `{ update(dt), register(def), start(id), spawn(id), setHp(frac, id?), subdue(id?), reset(id?), getState(id?), getActiveBoss() }` |
| `dungeon` | `{ update(dt), enter(tier, seed?), nextFloor(), loadFloor(n), exitToChimphu(), breakCrystal(id?), showLayout(bool), openTierSelect(), getState() }` |
| `projectiles` | `{ update(dt), spawn(type, params?), clear(), count(), showHitboxes(bool) }` |
| `loot` | `{ update(dt), generate(opts?), drop(rarityOrOpts, opts?), simulate(n, opts?), rollReforgeCandidates(item, idx), formatItemName(item, lang?) }` |
| `inventory` | `{ update(dt), add(item), pickup(item), equip(uid), unequip(slot), sell(uid), salvage(uid), drop(uid), sort(), getBag(), getEquipped(), compareWithEquipped(item), addTurquoise(n), addMaterial(id, n) }` |
| `groundLoot` | `{ update(dt), dropItem(item, pos), clear(), list() }` |
| `potions` | `{ update(dt), use(), refill(n?), getCharges(), getMaxCharges() }` |
| `shrines` | `{ update(dt), spawnShrine(def), activate(id), list() }` |
| `waypoints` | `{ update(dt), unlock(mapId), unlockAll(), isUnlocked(mapId), teleportTo(mapId), startRecall(), useReturnPortal(), list() }` |
| `items` | `{ update(dt), drop(id?), forceNext(), pityCount(), activeItems }` |
| `vitals` | `{ update(dt), addExp, spendMp, addBuff, addPermanent, getStats, set, setLevel, damage, faint, god(bool) }` |
| `zones` | `{ update(dt), teleport(mapId, options?), startTransition(mapId, spawnId?), isTransitioning(), list(), ensureMapLoaded(mapId) }` |
| `quests` | `{ update(dt), register(defs), start(id), complete(id), completeStep(id, step?), reset(id?), skipTo(chId), setFlag(flag), clearFlag(flag), hasFlag(flag), getTrackedTargets(), state() }` |
| `codex` | `{ update(dt), unlock(id), unlockAll(), isUnlocked(id), getEntry(id), getEntries(cat?), count() }` |
| `npcs` | `{ update(dt), buildNpc(look), spawnNpc(def), spawnAllLooks(opts?), clearShowcase(), getNpc(id), list() }` |
| `dialogue` | `{ update(dt), open(id, opts?), close(), advance(), selectChoice(idx), register(defs), isOpen(), state() }` |
| `questUi` | `{ update(dt), openJournal(), closeJournal(), toggleJournal(), isOpen() }` |
| `inventoryUi` | `{ update(dt), open(tab?), close(), toggle(tab?), select(uidOrSlot), isOpen() }` |
| `worldmap` | `{ update(dt), open(tab?, opts?), close(), toggle(tab?), switchTab(tab), isOpen() }` |
| `minimap` | `{ update(dt), toggleZoom(), getZoom(), render() }` |
| `skillbar` | `{ update(dt), openSkillsModal(), closeSkillsModal(), toggleSkillsModal() }` |
| `shop` / `crafting` | `{ update(dt), open(), close(), isOpen() }` |
| `credits` | `{ update(dt), play(), hide(), isOpen() }` |
| `community` | `{ update(dt), getPilgrimName(), setPilgrimName(name), getLamps(), offerLamp(opts), rejoiceLamp(id), getStupas(), getOwnStupa(), saveOwnStupa(opts), rejoiceStupa(id), getSamyeProgress(), contributeSamye(opts), exportShareCode(), importShareCode(code), syncFromServer(), flushPendingActions(), getBackendStatus() }` |
| `personalStupa` | `{ update(dt), rebuildGrove(), buildVotiveStupaMesh(THREE, spec, opts), getGroveStupas() }` |
| `coop` | `{ update(dt), getState(), getPartySize(), getMembers(), getActiveCompanions(), getZonePilgrims(), getAllVisiblePilgrims(), getZoneCounts(), getTotalOnline(), getShowAmbientPilgrims(), setShowAmbientPilgrims(bool), createRoom(code?), joinRoom(code), leaveRoom(), isRoomPublic(), setRoomPublic(bool), getPublicRooms(), refreshPublicRooms(), addAiCompanion(idx?), removeAiCompanion(id?), broadcastEvent(type, payload), sendEmote(emoteId), getLocalEmote(), getExpBonusPct(), reviveMember(id), damageCompanion(id, amt, opts?), damageCompanionsInRadius(cx, cz, r, amt, opts?), damageCompanionsInLine(sx, sz, dx, dz, len, hw, amt, opts?), teleportToLeader() }` |
| `remotePilgrims` | `{ update(dt), getMeshes(), getCount(), spawnResonanceMandalaVfx(pos) }` |
| `lampOfferingUi` / `stupaBuilderUi` / `coopLobbyUi` | `{ update(dt), open(tab?), close(), toggle(), isOpen() }` |
| `merit` | `{ update(dt), reset, getStats, getAchievementsList }` |
| `audio` | `{ update(dt), isMuted, setMuted, toggleMute, getVolume, setVolume, isMusicEnabled, setMusicEnabled, toggleMusic, getMusicVolume, setMusicVolume, getMusicTrack, forceMusic(id, vars), playMusicStinger(id), playEagleCry, playDistantBell }` |

### `state`

```js
state.mode            // 'intro' | 'play'   (main sets 'play' on bus 'game:start')
state.zone            // active mapId string ('stupa' | 'wild' | 'pharping' | 'mangyul' | 'yarlung' | 'samye' | 'chimphu' | 'terma' | 'sandbox')
state.zoneType        // 'hub' | 'combat' | 'dungeon'
state.uiOpen          // true when a fullscreen UI modal is open
state.elapsed         // seconds since load
state.time.t          // 0..1 (0 midnight, .25 sunrise, .5 noon, .75 sunset) — main advances; HUD slider may set
state.time.speed      // multiplier (0 = paused) — HUD may set
state.time.sunDir     // THREE.Vector3 normalized, written by sky
state.time.nightFactor// 0 day … 1 night, written by sky (smooth through dusk/dawn)
state.wind.dir        // THREE.Vector2 normalized (x, z) — main writes
state.wind.strength   // ~0.25 … 1.1 — main writes
state.player.position // THREE.Vector3 — player writes
state.player.heading  // radians
state.player.velocity // THREE.Vector3
state.player.isMoving // bool
state.player.isJumping// bool (#210 airborne jump evasion state)
state.player.jumpHeight // vertical airborne height in meters (#210)
state.player.action   // 'idle'|'walk'|'run'|'jump'|'prostrate'|'light'|'feed'|'chant'|'hurt'|'faint'
state.player.level    // 1..40
state.player.exp      // 0..maxExp
state.player.hp       // 0..maxHp
state.player.maxHp    // derived (base + equipment + buffs)
state.player.mp       // 0..maxMp
state.player.maxMp    // derived (base + equipment + buffs)
state.player.atk      // derived
state.player.def      // derived
state.player.critChance // derived % (base 5% + affixes)
state.player.critDmg    // derived % (base 150% + affixes)
state.player.subdueBonus// derived % bonus vs elites & bosses
state.player.cdrBonus   // derived % cooldown reduction (capped at 40%)
state.player.findBonus  // derived % magic/rarity find bonus
state.player.buffs    // array of { id, remaining, duration, stats }
state.player.permanent// { atk, def }
state.player.invulnUntil // seconds timestamp
state.player.slowUntil   // seconds timestamp
state.quests          // { active: { [id]: { step, progress, tracked } }, done: string[], flags: { [flag]: true } }
state.dungeon         // { active, tier, floor, maxFloors, seed, highestClearedTier, enemiesRemaining, gateUnlocked }
state.interactionTarget  // currently targeted interactable or null
```

### Bus events

| Event | Payload | Emitted by |
|---|---|---|
| `game:start` | – | HUD (title button) |
| `zone:change` | `{ from: mapId, to: mapId }` | zones |
| `map:loaded` | `{ mapId }` | zones (when a lazy-loaded map finishes building for the first time) |
| `merit` | `{ type: 'kora'\|'prostration'\|'lamp'\|'monkey'\|'wheel' }` | player / lamps / monkeys / stupa |
| `kora:progress` | `{ fraction: 0..1, laps }` | player |
| `kora:wrongway` | – | player (walking counter-clockwise for a while) |
| `player:jump` / `player:jumpDodge` | `{ x, z }` / `{ source, pos? }` | player / projectiles / enemies / boss patterns (#210) |
| `achievement` | `{ id }` | merit |
| `toast` | `{ key?, text?, params?, kind? }` | anyone → HUD |
| `prompt` | `{ labelKey, keyHint } \| null` | interaction → HUD |
| `sfx` | `{ name: 'bowl'\|'bell'\|'light'\|'monkey'\|'wheel'\|'step'\|'pickup'\|'chant'\|'hit'\|'hurt'\|'liberate'\|'arrow'\|'fireball'\|'boulder'\|'frost'\|'dispel'\|'levelup'\|'faint'\|'eagle' }` | anyone → audio |
| `audio:change`| `{ muted, volume }` | audio → HUD |
| `merit:reset` | – | merit → systems / HUD |
| `vitals:restore` | `{ hp?, mp?, source }` | player / lamps / monkeys / potions / skills |
| `vitals:damage` | `{ amount, type = 'physical'\|'magic', sourcePos?, slow?, ignoreInvuln? }` | anyone → vitals |
| `vitals:changed` | `{ hp, maxHp, mp, maxMp, exp, maxExp, level, atk, def, buffs, deltaHp, deltaMp, source }` | vitals → HUD |
| `level:up` | `{ level, prevLevel, maxHp, maxMp, atk, deltaMaxHp, deltaMaxMp, deltaAtk }` | vitals → HUD / skills / merit |
| `loot:drop` / `loot:pickup` | `{ item, position }` | loot / groundLoot / inventory |
| `inventory:changed` / `equipment:changed` | `{ bag, equipped }` | inventory → vitals / UI |
| `currency:changed` | `{ turquoise, delta, materials }` | inventory → UI |
| `skill:cast` / `skill:unlock` / `skill:rank` | `{ id, slot, rank?, enh?, points? }` | skills → activeSkills / skillbar |
| `protector:summon` / `protector:unlocked` | `{ id, duration? }` | allies |
| `enemy:hit` / `enemy:status` | `{ id, kind, damage?, type?, crit?, status? }` | enemies |
| `enemy:liberated` | `{ id, kind, rank, level, exp, position, tags }` | enemies → vitals / loot / quests / skills |
| `boss:start` / `boss:phase` / `boss:subdued` | `{ id, bossId, phase?, maxPhase? }` | bosses → HUD / quests / audio |
| `waypoint:unlocked` / `waypoint:changed` | `{ mapId }` | waypoints → worldmap |
| `npc:talk` | `{ npcId, dialogueId }` | npcs → quests |
| `dialogue:open` / `dialogue:close` | `{ id, npcId }` | dialogue |
| `quest:start` / `quest:progress` / `quest:complete` | `{ id, step?, stepId?, progress?, goal?, rewards? }` | quests |
| `quest:item` / `quest:interact` | `{ item?, target?, count? }` | quests / maps / props |
| `flag:set` | `{ flag, value }` | quests |
| `chapter:intro` / `chapter:banner` | `{ chapterId, titleKey, subKey }` | quests → questUi / audio |
| `codex:open` / `codex:unlock` / `codex:changed` | `{ id }` | codex / dialogue / worldmap |
| `terma:entered` / `terma:floor` / `terma:cleared` | `{ tier, floor, seed }` | dungeon → quests / UI / coop |
| `community:lampOffered` / `community:lampRejoiced` / `community:stupaBuilt` / `community:samyeContributed` / `community:changed` | `{ id?, type? }` | community → lamps / personalStupa / UI |
| `coop:joined` / `coop:left` / `coop:updated` / `coop:remoteSkill` / `coop:resonance` / `coop:memberHurt` / `coop:memberFainted` / `coop:revived` | `{ roomCode?, id?, x?, z? }` | coop → remotePilgrims / dungeon / UI |
| `credits:play` / `credits:opened` / `credits:closed` | `{}` | credits |

---

## Combat, Loot & Progression Architecture

### 1. Data-Driven Zone Registry, Lazy Loading & Scene Graph Culling
Maps are registered in `src/data/maps.js` (`MAPS`):
- Each map entry defines `id`, `type` (`'hub' | 'combat' | 'dungeon'`), `nameKey`, `origin`, `level`, `walkRadius`, `safeZones`, `gates`, `spawns`, `spawnTable`, `elitePacks`, `spawnAreas`, `ambience`, `chapterIntro`, and `load: () => import(...)`.
- **Lazy Construction & Code Splitting**: Non-hub maps are dynamically imported on first visit (`zones.ensureMapLoaded(mapId)`), emitting `map:loaded`. Vite/Rolldown splits each map into its own chunk (`0.5–9.5 kB` gzip).
- **Scene Graph & Disposal**: Each map owns `ctx.zoneGroups[mapId]`. When switching zones, inactive zone groups are hidden (`visible = false`), and `enemies.clear()` disposes all dynamic enemy geometries and materials so `renderer.info.memory` never leaks across map transitions.

### 2. Vitals, Equipment Aggregation & Balance Curve (Lv 1–40)
- **Vitals Base & Scaling (`src/config.js`)**:
  - HP: `baseHp = 100`, `+14 HP` per level (`maxHp = 100 + 14 * (lvl - 1)`).
  - MP: `baseMp = 60`, `+6 MP` per level (`maxMp = 60 + 6 * (lvl - 1)`).
  - ATK: `baseAtk = 10`, `+3.2 ATK` per level (`baseAtk = 10 + Math.round(3.2 * (lvl - 1))`).
  - EXP Curve: $\text{maxExp}(L) = \lfloor 25 \cdot L^{1.4} \rfloor$, Max Level: `40`.
- **Combat Balance Targets (Verified via `node scripts/balance-report.mjs`)**:
  - Normal monster at player's matching level (`Lv 5 / 10 / 16 / 23 / 30 / 35`) requires **2.0–3.7 Six-Syllable Mantra hits** (`target: 2–4`), and a single normal attack deals **2.9%–11.5% of player maxHp** (`target: <= 15%`).
  - Elite (`champion` / `rare`) TTK is **22.8s–28.5s** (`target: 15–30s`).
  - Chapter Boss TTK is **90.3s–128.8s** (`target: 90–180s`), and Boss heavy telegraphed attacks deal **23.6%–29.5% of player maxHp** (`target: <= 40%`).
  - Completing all main quests (`Prologue` → `Chapter 4`) brings the player to **Lv 30**; `Chapter 5` + `Terma Dungeon Tier 1–10` brings the player to **Lv 40**.

### 3. Unified Save System v2 (`src/systems/save.js`)
- **Storage Key**: `stupa.save.v2`, JSON format `{ version: 2, savedAt, sections: { ... } }`.
- **Rule**: All systems **must** persist data exclusively through `ctx.save` (`get`, `set`, `markDirty`). Direct `localStorage` access outside `save.js` is prohibited.
- **Migration**: Legacy v1 keys (`stupa.vitals.v1`, `stupa.merit.v1`, `stupa.items.v1`, `stupa_wild_tutorial_v1`, `stupa.lang`, `stupa.audio.muted`, `stupa.audio.volume`) are automatically migrated into `stupa.save.v2` while preserving the player's merit, kora count, and level and starting `prologue.vow`.
- **Save Sections & Owners**:
  | Section | Owner | Contents |
  |---|---|---|
  | `vitals` | `src/systems/vitals.js` | `{ level, exp, hp, mp, permanent: { atk, def, maxHp, maxMp } }` |
  | `merit` | `src/systems/merit.js` | `{ kora, prostration, lamp, monkey, wheel, preta, tsen, migoi, totalLiberated, mantraCasts, points, achievements }` |
  | `items` | `src/gameplay/items.js` | `{ pityCount }` |
  | `tutorial` | `src/systems/zones.js` | `{ [tutorialKey]: boolean }` |
  | `settings` | `src/i18n.js`, `src/systems/audio.js` | `{ lang, muted, volume, music, musicVolume }` |
  | `inventory` | `src/systems/inventory.js` | `{ bag, equipped, turquoise, materials: { shard, dust, essence } }` |
  | `skills` | `src/systems/skills.js` | `{ points, bonusPoints, spentPoints, reconciledLevel, ultCharge, skills: { [id]: { unlocked, rank, enh } } }` |
  | `quests` | `src/systems/quests.js` | `{ active, done, flags, collected }` |
  | `codex` | `src/systems/codex.js` | `{ unlocked: string[], seen: string[] }` |
  | `waypoints` | `src/gameplay/waypoints.js` | `{ unlocked: string[], returnPortal }` |
  | `protectors` | `src/gameplay/allies.js` | `{ unlocked: string[], active: string }` |
  | `dungeon` | `src/gameplay/dungeon.js` | `{ highestClearedTier: number }` |
  | `termaCaves` | `src/gameplay/termaCaves.js` | `{ extractedCaves: string[], scrolls: string[], mendrup: string[], compassUnlocked: boolean, empowermentClaimed: boolean }` |
  | `community` | `src/systems/community.js` | `{ pilgrimName, ownStupa, myLamps, rejoicedLampIds, rejoicedStupaIds, samye }` |

### 4. Performance, Code Splitting & Audio Crossfade
- **PointLight Budget**: Total active PointLights $\le 6$. All combat, chapter, and dungeon maps use **0 PointLights** (relying on emissive materials and additive meshes); Stupa zone uses 3 (1 per lamp station, disabled when `state.zone !== 'stupa'`).
- **Draw Calls & Geometry Budget**: Every map stays well below `< 400` draw calls (`80` in Samye via a single `count = 1008` `THREE.InstancedMesh` for perimeter stupas; `26` in Terma Dungeon) and `< 600k` triangles.
- **Adaptive Score** (`src/systems/music.js` engine + `src/data/music.js` score, tunables in `CONFIG.MUSIC`):
  - Track resolution (`audio.js#resolveMusicTrack`): boss active → `boss.<bossId>` (live `phase` var: tempo / layers) › zone + quest flags → `stupa` (live `night` var), `wild`, `pharping.drought|rain` (`ch1.rain`), `mangyul.storm|calm` (`ch2.storm.done`), `yarlung.unrest|calm` (`ch3.yaks.done`), `samye.day|night|complete` (`samye:nightStarted/nightSurvived`, `ch4.pehar.done`). Re-resolved on `zone:change`, boss events, `flag:set`, `quest:complete`, and every `refreshInterval` seconds.
  - Different track id → crossfade (`crossfade` / `bossCrossfade`); same id → vars merged live (no restart).
  - Stingers (duck the track bus): `chapter:intro` → `vision`, `chapter:banner` → `chapterComplete`, `boss:subdued` → `subdued`, `boss:phase` → `phaseShift`, `dialogue:open` with a `guruVision.*` NPC → `guru`. Stingers are transposed into the current track's key.
  - Music shares the master gain (mute / volume) and has its own on/off + volume (`settings.music`, `settings.musicVolume`, HUD 🎵 button). When music is off, the legacy boss drum loop takes over.
  - Score authoring: phrases are strings `"NOTE:beats[:accent][^grace]"`; each track's `bar(api, vars)` runs once per bar and `api.line(phrase, startBar, instrument, vel, opts)` plays the slice that falls in the bar. Audition every track at `/music-lab.html` (dev server only).

---

## 🛠️ How to Add a New Chapter (`如何新增一個章節`)

Because maps, enemies, bosses, quests, dialogues, codex entries, and i18n dictionaries are all data-driven or auto-discovered via `import.meta.glob`, adding a new chapter requires **zero edits to core engine files (`src/main.js`, `src/systems/*.js`)**:

1. **Register the Map (`src/data/maps/<mapId>.js` & `src/data/maps.js`)**:
   - Define `id`, `type: 'combat' | 'hub'`, `origin: { x, z }`, `level: [min, max]`, `walkRadius`, `safeZones`, `gates`, `spawns`, `spawnTable`, `elitePacks`, `chapterIntro`, and `load: () => import('../world/maps/<mapId>.js')`.
2. **Build the Procedural 3D Scene (`src/world/maps/<mapId>.js`)**:
   - Export `createMap(ctx)` using helpers from `src/world/mapBase.js` (`createHeightfieldTerrain`, `scatterRocks`, `addRimMountains`, `pushCollider`).
   - Attach all meshes to `ctx.zoneGroups['<mapId>']` and use **0 PointLights** (use `emissive` materials and `InstancedMesh` for repeated props).
3. **Add Chapter Enemies (`src/data/enemies/<mapId>.js` & `src/gameplay/enemyModels/<mapId>.js`)**:
   - Export enemy stat definitions in `src/data/enemies/<mapId>.js` and procedural model builders (`build<Kind>Model`) in `src/gameplay/enemyModels/<mapId>.js`. Both are auto-discovered by `src/gameplay/enemies.js` via `import.meta.glob`.
4. **Add the Chapter Boss (`src/gameplay/bosses/<bossId>.js`)**:
   - Define the boss using `createBossInstance` / `patterns.js` (`coneSlam`, `lineCharge`, `ringWave`, `meteorVolley`, `summonAdds`) and register it in `src/gameplay/bosses/index.js`.
5. **Author Quests, Dialogues & Codex Entries**:
   - `src/data/quests/chX.js` (auto-discovered by `src/systems/quests.js`).
   - `src/data/dialogues/chX.js` (auto-discovered by `src/ui/dialogue.js`).
   - `src/data/codex/chX.js` (auto-discovered by `src/data/codex.js`; include `tag: 'history' | 'legend'` and external `sources`).
6. **Register Bilingual Strings (`src/i18n/chX.js`) & Verify**:
   - Call `i18n.register({ 'zh-Hant': { ... }, en: { ... } })`.
   - Run `npm run check:i18n`, `npm run check:links`, `node scripts/balance-report.mjs`, and `npm run build`.

## Mirror narrative demo (Epic #68)

The launcher `src/main.js` selects exactly one dynamic entry: `src/adventure.js`
(the previous bootstrap, unchanged) or `src/story/runtime.js`. Use `?mode=story`
for the demo and `?mode=adventure` for the original game. Mode changes navigate
and rebuild the document; they do not reuse listeners or serializers.
Narrative does not construct `createZones`, quests, combat, inventory, community,
coop, adventure player, HUD, or input. Its lightweight world adapter reuses
stupa/sky/environment and lazy Pharping geometry without adventure persistence.

Public narrative APIs and ordered beat/event schemas are specified in
[docs/story/contracts.md](docs/story/contracts.md). Module ownership:

| Module | Runtime API | Purpose |
|---|---|---|
| `story/storyDirector.js` | `ctx.story` | Validated nine-beat state machine, evidence, fixed signals, replay guards |
| `story/narrativeCamera.js` | `ctx.storyCamera` | Eye-pose camera, keyboard/mouse/touch movement with collisions |
| `story/cinematicArt.js` | `ctx.storyArt` | Reversible material/light grade, three light presets, two quality settings |
| `ui/story/phone.js` | `ctx.phone` | Novel-based fixed messages, diaries, evidence, train transcript |
| `ui/story/documentary.js` | `ctx.documentary` | Lazy full-frame still/video cues, captions, next/finish, pause/seek/replay/skip/cancel and fallback |
| `ui/story/losangStill.js` | runtime-owned DOM only | Optional final-dialogue map-handoff illustration, full-frame layout, localized fallback/provenance and image cleanup (#113); no gameplay/save effects |
| `ui/story/chapterStills.js` | runtime-owned DOM only | Optional 16:9 chapter card illustrations across Mangyul, Yarlung, Samye, Chimphu and Finale, full-frame layout, localized fallback/provenance and image cleanup (#114); no gameplay/save effects |
| `story/memorySystem.js` | `ctx.memory` | Pose threshold evaluation, accessible camera assistance and explicit capture |
| `story/storyAudio.js` | `ctx.storyAudio` | 432 Hz adaptive procedural music & soundscape controller across Demo beats and Chapter checkpoints (#135) |
| `story/runtime.js` | bootstrap owner only | World exploration, Losang, map, three spring interactions, return, focus/overlay integration |

Only `ctx.save.set('story', ...)` persists narrative state in `stupa.save.v2`.
`story.version=1` contains beat, evidence, choices, flags, clipsSeen,
elapsedSeconds. Director sanitizes fields and reconstructs necessary evidence.
`ctx.story.recordPrologueReply(replyId)` validates/persists one sequential reply
in `choices["prologue.<turnId>"]`; `acknowledgePrologueRecording()` persists
`flags["prologue.recordingRead"]` only after all replies. These guarded APIs return
booleans, work only in the started prologue, and do not emit progression/evidence.
Phone resumes partial conversations and shows later read-only history; replay
uses separate transient state. Missing choices in older post-prologue saves are
shown as a labeled original-script reconstruction, without inventing saved choices.
Future story schemas remain untouched until explicit reset. Reset sets only the
story section and reloads scene state. Existing v1 migration remains in the shared
save service. Story mode never registers adventure serializers. Language uses
existing i18n settings; narrative does not bind i18n to the adventure save service.

Narrative uses original procedural maps plus local image/audio/document assets
under `public/story`, allowing attributed, authorized or generated still images.
Provenance and budgets live in `public/story/manifest.json`; no asset represents
itself as a historical photograph. The fixed photograph reference is a pose
exercise, not computer-vision evidence of historical identity. No real LLM or
synthetic impersonation of the deceased is used. New PointLights: zero.

Runtime frame order is camera → sky/world → cinematic grade → story/UI/save →
render. UI ownership is derived from actual modal visibility every frame. Scene
loading has retry and an epoch guard; delayed loads cannot replace a later beat.
Optional world navigation assistance is a visible player control. Photo assist
sets a real pose and still requires capture. Core story progress has no timed lock.

Validation: `npm test`, `npm run build`, `npm run check:i18n`, and
`npm run test:browser`. Browser evidence and hardware limitations are reported in
`docs/story/validation.md`. Source-boundary and merge decisions are in the ADR;
all #68 work stops at PRs for human acceptance, never automatic master merge.

Narrative calls `createSave(ctx, {writableSections:['story']})`. This optional
scope rejects unrelated set() writes and merges current storage's non-story
sections at flush time, preserving progression made by a simultaneously open
adventure tab. Default adventure behavior is unchanged. Scoped reset removes
only permitted sections. This is a defensive write boundary, not a distributed
transaction/locking protocol between multiple story sessions.

Narrative playtest refinements: camera speed is 4 m/s (Shift 6 m/s), with collision
substeps and its own 100 ms delta limit. Low quality disables the phone/card
backdrop blur as well as shadows; runtime mirrors quality to a body class without
changing adventure styles. Documentary manual Next/Finish uses the same guarded
completion path as automatic playback and remains available while paused.

## Narrative Losang character (#90)

`src/story/characters/losang.js` exports `createLosang(THREE)` returning
`{group, update(dt), dispose()}`. Origin is at the feet, front is +Z; the factory
creates no lights, DOM, event subscriptions or saves. It owns deduplicated
geometry/material sets and disposes them once. Narrative runtime owns placement,
a 0.35 m collision circle, visibility, update (disabled for reduced motion), and
non-bfcache pagehide disposal. The accessible guide faces the character from
3 m away. Adventure NPC builders and saves are unchanged.

This is an original procedural character study, not an approved final portrait.
Novel chapter 2 identifies Losang as an elderly lama; source-corrected reference
request #84 still owns final face/costume acceptance. No generated text/sacred
symbols or external assets are embedded in the folded map prop.
## Planned chapter expansion (ADR-002, not implemented)

User confirmed independent ARPG and exploration-first narrative on 2026-11-06.
See [chapter roadmap](docs/story/chapter-roadmap.md) (#89, #91–#98) for proposed
chapter/store/map adapter contracts and dependency gates. Existing Demo APIs and
save schema remain unchanged by this documentation PR; next chapters require
their own tested implementation PRs. Never import adventure gameplay serializers
into narrative or treat shared world factories as side-effect-free.

## Narrative chapters and mode switching (#91–#98)

The chapter preview retains the independent Adventure runtime. `createChapterDirector(ctx)`
assigns `ctx.chapters` after `ctx.story`; `getState`, `canStart`, asynchronous `start`/`resume`,
checkpoint-checked `signal`, `exit`, and `dispose` control only narrative state. The original
nine Demo beats remain intact. At the terminal Demo beat the player explicitly opens the
journey journal; no automatic chapter jump or Adventure progression requirement is added.

The root save format remains `stupa.save.v2`, version 2. The story section migrates version 1
to version 2 with `journey: {activeChapterId, chapters}`. Records hold a canonical checkpoint,
completion, bounded choices and flags. The ordered registry in `data/story/chapters.js`
rejects invalid completion and missing prerequisite records. `story.getJourney()` returns a
snapshot and `story.commitJourney()` uses `save.commitSection()`; there is no second story
serializer. `save.flush()` returns success, `getStatus()` exposes errors, and failed writes
keep dirty updates while atomic chapter commits keep the prior checkpoint. Both modes merge
latest untouched sections, and unchanged Adventure serializers do not overwrite newer data.
Stale story snapshots are rejected. This protects sequential interleaved writes; it is not
an atomic cross-tab compare-and-swap or a distributed save synchronization service. Unknown
newer root/story versions remain read-only.

Runtime owns `ctx.prepareChapter(id, checkpoint)` and stages an explicitly allowlisted lazy
scene before any durable chapter start. `story:chapter-change` carries
`{chapterId, checkpointId, replaying}` after successful commit; `story:chapter-exit` carries
`{chapterId}`. A session token rejects stale preparation. Revisit state is transient, only
available after exiting a completed chapter, and never overwrites original progress.

Each `story/world/*Scene.js` exports an async `create<Name>Scene(ctx)` with a detached `group`,
`getHeight`, `getTarget(checkpointId)`, `restore(checkpointId, {animate, reducedMotion})`,
`update(dt)`, `getSnapshot`, and `dispose`. Targets include a safe approach and `lookAt`.
The scene never writes saves or advances the story. Owned colliders/listeners/GPU resources
are removed on disposal. Existing native maps are used with private buses/state and minimal
opt-in presentation guards; their default Adventure behavior is unchanged. Cinematic grading
covers the active chapter; `storyArt.releaseRoot(group)` drops owned material references
before disposal. The short Demo vision also uses the interactive Pharping scene.

`createChapterJournal(ctx)` derives sacred-site unlocks from begun chapter records and looks
up existing `CODEX_BY_ID` records, bilingual bodies and source links. It does not write the
Adventure codex or copy/replace historical text. Fictional chapter prose is labeled separately.
The journal supports explicit start/resume/exit/revisit and durable chapter diaries.

`createModeSwitch(ctx, mode, mount?)` adds a native modal dialog in both runtimes. It flushes
before a normal page navigation, preserving runtime isolation, and blocks switching on
storage failure. Story navigation owns all its modal state; keyboard/touch controls remain
available and the active mode is visibly disabled in the menu.

A completed active chapter permits atomic handoff to the next chapter from the journal,
without an intermediate exit/save. Replay still requires an explicit exit. Finale decision
checkpoints validate allowlisted `payload.choice`, stored only after successful commit;
`chapters.getChoices(id)` exposes a copy. Replay choices are transient. Reader pages are
canonical checkpoints and remain available in the journal after completion. Missing required
choices invalidate a corrupt advanced record instead of inventing an ending.

### Story preview tools (#109)

The settings panel opens `createStoryDebugPanel(ctx)`, which uses the existing
`ctx.debug.unlock(password)` session gate. Its chapter and checkpoint selectors
call `ctx.requestChapterPreview(id, checkpointId, { choice })`, the runtime
wrapper around `ctx.chapters.preview(...)`. The director requires the password
unlock, stages the requested scene, and rejects stale or unsuccessful prepares.
It publishes `story:chapter-change` with `testing: true` and reports
`getState().testing` only for an active preview. Jumping past the finale decision
requires an explicit test choice. Signals and choices advance only the preview
record. They do not unlock durable progress or write the story section.

Exiting a preview publishes `story:chapter-exit` with `testing: true` and the
runtime restores the canonical active chapter or Demo beat. Runtime pauses
canonical elapsed time while the test panel or preview is active and disables
the underlying Demo phone, replay and reset actions during a preview. A failed
preview leaves the currently displayed scene and checkpoint intact. The separately labeled original Demo jump is
available only for an unfinished Demo without chapter progress. It requires
confirmation and uses the existing persistent `story.skipTo` debug API.

Run the GUI regression against a production preview with
`BROWSER_CHANNEL=chrome node scripts/story-debug-browser-test.mjs`. It covers
password rejection, desktop and touch previews, branch selection, load failure,
and save preservation through exit and reload.

### Optional motion cues (#84/#85)

A documentary cue accepts `video: {src, poster}` alongside its existing image and
caption/source keys. `createCueVideo` owns only the current muted inline media and
releases it on cue change/close. The documentary owns progression; media ending
does not itself complete a cue. Errors or a bounded 2.5-second unrecovered buffer
wait fall back to the high-quality still, then poster, then readable captions.
Initial decoder startup has an 8-second deadline while the still is already visible.
Brief pauses/buffering do not discard a usable clip. Reduced-motion and Data Saver
start with stills and expose an explicit Play motion button. Captions and provenance
remain outside an uncropped frame. V1–V3 augment restoration, D stays static; V4 is
an optional settings viewer after reaching the vision, with no story signal or
chapter advancement. No media is used as documentary historical evidence.

### Narrative adaptive score & soundscape (#135)

`src/story/storyAudio.js` exports `createStoryAudio(ctx)` (`ctx.storyAudio`) and pure
resolvers `resolveBeatAudio(beat)` and `resolveChapterAudio(chapterId, checkpointId)`.
It connects Chapter Mode to `createMusicEngine` (`src/systems/music.js`) and adds four
narrative tracks in `src/data/music.js` (`story.mirror`, `story.memory`, `story.terma`,
`story.finale`) alongside existing Himalayan chapter tracks (`stupa`, `pharping.drought`,
`pharping.rain`, `mangyul.storm`, `mangyul.calm`, `yarlung.unrest`, `yarlung.calm`,
`samye.day`, `samye.night`, `samye.complete`, `chimphu`, `credits`). It transitions
tracks, stingers, resonant pink-noise wind and procedural SFX (`bowl`, `phoneChime`,
`pageTurn`, `stone`, `water`, `windhorse`, `starlight`, `lamp`) on `story:chapter-change`,
`story:chapter-exit`, `story:phone-open`, and `story:clip-play`/`story:clip-end` without
external audio files or save writes.

### Three-thread narrative and offline handover (#127–#134)

`data/story/phoneThreads.js` owns fixed authored exchanges for the hotel, Pharping,
Mangyul, Yarlung, Samye and Chimphu, alongside the existing prologue conversation.
The finale uses the phone's local handover screen. No external dialogue service is
involved. `story.recordPhoneReply(threadId, replyId)` accepts only the next unlocked
turn. `story.acknowledgePhoneThread(threadId)` acknowledges a completed thread.
Both use `save.commitSection('story', snapshot)` before publishing
`story:phone-change {threadId}`. Failed writes retain the previous reply/read state.

Story save version remains 2. Replies use `choices['phone.<threadId>.<turnId>']`,
and read receipts use `flags['phone.read.<threadId>']`. Old v1/v2 fields and chapter
checkpoint IDs are retained. Orphaned phone turns are removed on resume. The new
Mangyul record marks `flags.windAnswerRequired`; its fourth wind question requires
an explicit `yes` choice. Older advanced v2 records without that marker retain
progress and do not receive an invented answer.

Chapter checkpoints can declare `phoneThreadId`. The chapter director requires
its saved read receipt before committing the normal transition. Replay and preview
keep their phone exchanges transient. The phone binds a completion callback to its
requested thread, so finishing an archived conversation cannot complete another
checkpoint. Runtime derives unread counts from canonical progress and emits
`story:phone-open {tab:'messages', threadId, notification:true}` once per newly
available thread in a session. The existing #135 controller supplies its chime.
Signal labels resolve from chapter/thread state, including delayed, weak, sending,
offline and completed states.

`phone.open('messages', {threadId, onComplete, transient})` presents a chapter
exchange. `{handover:true, scanned, onComplete}` opens the finale QR screen.
The static QR encodes `stupa:task-handover` and is generated locally with qrcode
8.2 (MIT). Its in-game scan opens bundled UI. Both allowlisted choices persist
through `chapters.signal`, then immediately show their account response. The
completed proxy does not accept more replies or publish unread notifications.
The notebook becomes written only after the finale diary is explicitly completed.

The Yarlung `dorm-memory` cue provides a 17-second subtitle recollection through
`createDocumentary`, including pause, next, skip, replay and cancel. Original
footage is unavailable. Text fallback and source labels remain readable offline.
`provenanceKey` and `fallbackKey` optionally customize these labels. Cancel keeps
the current memory checkpoint. All new chapter props use emissive meshes with
zero new PointLights. The existing #135 score implementation and score data are
preserved.

## Adventure difficulty and settings (#120 #210)

- `src/data/combatSettings.js`: shared `MIGOI_ARENA_RADIUS` (20 m) for the snow king barrier/player clamp, wilderness flattening and boulder exclusion. Difficulty presets resolve unknown/missing values to `normal`. Includes `bossArenaLock` (`false` on `easy`/`normal` so players can fight outside `arena.r` or disengage, and `true` on `hard` to seal the Boss arena barrier and lock dungeon Boss doors).
- `src/player/player.js`, `src/gameplay/targeting.js`, `src/systems/quests.js` (#210):
  - **Jump Evasion (`KeyZ` / `KeyG` / HUD & Skillbar Jump buttons)**: `ctx.player.jump()` / `ctx.player.isJumping()` launches an airborne jump (`0` PointLights) that evades ground-erupting attacks (`frostRoar`, `boulder` shockwave, `groundSlam`/`heatWave`/`rootGrasp`/`stomp`, elite ground hazards, Boss `radialAoe`/`targetedAoe`/`ringWave`, Drought Lord whirlwinds), arrows (`redArrow`, Boss `projectileVolley`), and charges (`spearCharge`/`spinDash`/`yakCharge`/`avalancheRoll`, Boss `lineCharge`).
  - **Mouse Cursor Auto-Aim**: On desktop (`ctx.input.mouse.active`), `ctx.targeting.acquire()` aims toward the 3D ground point under the mouse cursor (`getCursorWorldPoint` / `getMouseAimDirection`) with narrow-cone (`±24°`) soft-target assist and rotates `state.player.heading` toward the attack direction.
  - **Initial Quest Guidance**: `prologue.vow` (`autoStart: true, freshStartOnly: true`) auto-starts on `game:start` with an expanded Quest Tracker, onboarding guidance toast, and a `0`-PointLight 3D golden stepping-stone trail (`QuestGuidanceTrailGroup`) leading to the tracked objective.
- `src/ui/settings.js`: `ctx.settingsUi.open()`, `close()`, `isOpen()`; native modal dialog with title/HUD entries, keyboard focus containment and bilingual radio options. Restores prior `state.uiOpen` on close. No new bus events or update loop.
- Persistence: existing `settings` section gains `difficulty: 'easy' | 'normal' | 'hard'`; writes merge with existing settings via `ctx.save`, flush immediately, and preserve audio/language preferences. Old saves default to normal without migration.
- `vitals.applyDamage`: multiply mitigated incoming damage by 0.6 / 1 / 1.4 (minimum 1), once before shield absorption; invulnerability/god mode still short-circuit. Changes apply to the next hit, including active boss fights, without resetting HP or changing enemy HP, loot, experience or quest progress.
- Regression: `npm run test:combat-settings` checks actual vitals damage, defense, shields, invulnerability, live difficulty changes, invalid settings and flat terrain across the expanded arena.

## Terma Caves & Interactive Extraction (#137 #140)

- `src/gameplay/termaCaves.js`: 5 Chapter Terma Caves (`pharping`, `mangyul`, `yarlung`, `samye`, `chimphu`) with `DORMANT -> GUARDED -> UNSEALED -> EXTRACTED` state machine, Yeshe Tsogyal's Shogser Scroll Table in `chimphu`, and `0` PointLights.
- `src/gameplay/dungeon.js`: procedural Vault Room (`AncientTermaVaultReliquary`) on every floor and interactive Floor 3 `TermaTreasureChest`.
- Regression: `npm run test:terma-caves` (`scripts/terma-caves-test.mjs` and `tests/termaCaves.test.mjs`) verifies all 12 Terma Legendaries (`thokchaVajra`, `dakiniMirror`, `uddiyanaLotusHat`), Ch1–Ch5 Terma Cave trials & extraction, Mendrup permanent stats, Shogser Grand Empowerment, Tertön's Compass, Dungeon Vault Room, Floor 3 Terma Chest, `stupa.save.v2` persistence, and strict `0` PointLight budget.

## Persistent Community & Real-Time Multiplayer Backend (#173 #206)

- **Production Deployment Architecture**:
  - **Frontend CDN**: Hosted on **Vercel** (`stupa-game-prod.vercel.app`), built with `VITE_BACKEND_URL=https://168-110-4-202.sslip.io`.
  - **Real-Time Backend**: Hosted on **Oracle Cloud (Tokyo)** behind Caddy Auto-TLS (`https://168-110-4-202.sslip.io` & `wss://168-110-4-202.sslip.io/ws/multiplayer`), managed by `systemd` (`stupa-backend.service`).
  - **Persistence & Offsite Backup**: Atomic JSON file persistence at `.data/stupa-backend.json`, backed up every 6 hours to Google Drive (`stupa_game_backups/stupa-backend.json`).
- **Strict Storage, Memory & Security Bounds (`server/store.js`, `server/handler.js`, `server/ws.js`)**:
  - **Hard-Capped Database Size (`< 100 KB` typical, `MAX_DB_BYTES = 256 KB` ceiling)**: Caps `lamps <= 100`, `stupas <= 80`, `samye.contributors <= 50`, `lampRejoiceDeltas <= 120`, and `stupaRejoiceDeltas <= 100` (rejecting non-existent IDs). If serialized payload exceeds `256 KB`, arrays auto-trim (`60 / 50 / 30`) before atomic write.
  - **Field-Level Sanitization**: Strips control characters and `<`/`>`, enforces strict character limits (`pilgrimName <= 24`, `title <= 28`, `message <= 120`, `id <= 64`), rejects prototype-pollution keys (`__proto__`, `constructor`, `prototype`), clamps timestamps (`<= now + 5000ms`), and strictly whitelists pilgrim/co-op member snapshots (`sanitizeMemberSnapshot`), `dungeonState` (`sanitizeDungeonState`), and event payloads (`sanitizeEventPayload`).
  - **Network & Memory Guardrails**: `MAX_HTTP_BODY_BYTES = 64 KB` (returns `413` on oversized requests), per-IP sliding-window rate limiting on `POST /api/community` (`40 req / 10s`), `MAX_WS_FRAME_BYTES = 32 KB`, `MAX_WS_BUFFER_BYTES = 64 KB`, `MAX_WS_CLIENTS = 256`, `MAX_SHARDS_PER_ZONE = 20`, and `MAX_COOP_ROOMS = 200`.
- **Regression**: `tests/multiplayer-backend.test.mjs` verifies disk persistence, 12-pilgrim zone sharding, co-op room host migration, RFC 6455 WebSocket broadcasts, and security/size bounds.
