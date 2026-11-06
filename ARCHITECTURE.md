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
| `src/i18n.js`, `src/i18n/*.js` | Gameplay | `zh-Hant` / `en` strings (`1,580` keys), `i18n.register(dict)`, dynamic substitution (`maps`, `quests`, `items`, `skills`, `codex`, `murals`, `prologue`, `ch1`–`ch5`) |
| `src/world/sky.js` | World | sky dome, sun/moon, stars, lights, fog, exposure — writes `state.time.sunDir/nightFactor` |
| `src/world/stupa.js` | World | stupa, wall, prayer wheels, night string lights; exports `flagAnchors` |
| `src/world/prayerFlags.js` | World | wind-animated five-color flags (vertex shader) |
| `src/world/environment.js` | World | plaza ground, surrounding buildings, hills, pigeons, lit windows at night, north monastery gate |
| `src/world/mapBase.js` | World | shared terrain heightfield, InstancedMesh rock scatter, mountain rim, seeded RNG, collider helper |
| `src/world/wilderness.js` | World | highland steppe terrain, chorten, mani stones, boulders, peaks, return gate (lazy-loaded) |
| `src/world/maps/pharping.js` | World | Chapter 1 map: Pharping terrace, Yangleshö & Asura caves, drought-to-rain state transition (lazy-loaded) |
| `src/world/maps/mangyul.js` | World | Chapter 2 map: Mangyul snow pass, wind gust physics, wind-shelter cairns, Tenma arena (lazy-loaded) |
| `src/world/maps/yarlung.js` | World | Chapter 3 map: Yarlung valley, Yumbulagang fortress, Sheldrak crystal cave, Shampo glacier (lazy-loaded) |
| `src/world/maps/samye.js` | World | Chapter 4 map: Mount Hepo Ri, Samye 5-stage construction (1,008 InstancedMesh mini-stupas), day/night defense (lazy-loaded) |
| `src/world/maps/chimphu.js` | World | Chapter 5 hub map: Chimphu hermitage caves, butter-lamp alcoves, Terma Realm portal (lazy-loaded) |
| `src/world/maps/terma.js` | World | Chapter 5 endgame dungeon: seeded 3-floor procedural layout (Cave / Snow / Mandala themes) (lazy-loaded) |
| `src/world/maps/sandbox.js` | World | debug sandbox arena with flat ground, scattered rocks, trial stone circle, Mani cairn (lazy-loaded) |
| `src/data/maps.js`, `src/data/maps/*.js` | Data | data-driven map registry (`MAPS`: `stupa`, `wild`, `pharping`, `mangyul`, `yarlung`, `samye`, `chimphu`, `terma`, `sandbox`) |
| `src/data/npcs.js` | Data | data-driven NPC registry (`NPCS`) and 8 procedural look definitions (`NPC_LOOKS`) |
| `src/data/itemBases.js`, `affixes.js`, `legendaries.js` | Data | 22 base equipment types across 8 slots, 16 affixes (T1–T4), 9 Terma legendary items (`powerId`) |
| `src/data/eliteAffixes.js` | Data | 6 elite monster affixes (`molten`, `frozen`, `swift`, `armored`, `shielding`, `teleporter`) |
| `src/data/skills.js` | Data | 7 player skills (`humBolt`, `mantra`, `phurba`, `lotusShield`, `vajraBell`, `protector`, `vajraGuru`) & Rank 1–5 / A-B enhancements |
| `src/data/enemies/*.js` | Data | chapter enemy definitions (`pharping`, `mangyul`, `yarlung`, `samye`), auto-discovered via `import.meta.glob` |
| `src/data/quests/*.js`, `src/data/dialogues/*.js` | Data | Prologue + Ch1–Ch5 quest chains (`22` main quests) and conditional branching dialogue trees |
| `src/data/codex.js`, `src/data/codex/*.js` | Data | 38 Dharma Codex entries (`place`, `person`, `deity`, `concept`, `practice`) with `[史實]`/`[傳說]` tags & 59 external URLs |
| `src/data/murals.js`, `public/murals/*.webp` | Data / Art | 20 offline Tibetan mural cutout sprites & 6 chapter mural scroll layouts (`prologue`, `ch1`–`ch5`, 22 quest episodes) |
| `src/player/player.js` | Gameplay | pilgrim mesh, movement, collision, prostration animation, kora tracking |
| `src/player/cameraRig.js` | Gameplay | third-person follow camera + intro orbit + cutscene camera override |
| `src/gameplay/mantra.js` | Gameplay | Six-Syllable Mantra (六字大明咒) area wave, syllables pool, cooldown & MP handling |
| `src/gameplay/skills/activeSkills.js` | Gameplay | execution & 3D VFX for `humBolt`, `phurba`, `lotusShield`, `vajraBell`, and `vajraGuru` ultimate |
| `src/gameplay/targeting.js` | Gameplay | soft auto-aim target selection within forward cone & golden ground target reticle |
| `src/gameplay/allies.js` | Gameplay | 3 oath-bound Dharma Protectors (`tenma`, `whiteYak`, `pehar`) 3D procedural models, AI, and summons |
| `src/gameplay/enemies.js`, `src/gameplay/enemyModels/*.js` | Gameplay | enemy models, AI state machine, elite packs & affixes, telegraphs, status effects (`root`/`stun`/`slow`/`vuln`), liberation VFX |
| `src/gameplay/bosses/index.js`, `bossBase.js`, `patterns.js`, `<boss>.js` | Gameplay | multi-phase Boss framework, arena barriers, telegraphed patterns, and 6 Bosses (`migoiKing`, `droughtLord`, `tenmaStorm`, `yarlhaShampo`, `pehar`, `termaGuardian`) |
| `src/gameplay/dungeon.js` | Gameplay | Terma procedural 3-floor dungeon generator (`mulberry32` PRNG), tier selector (Tier 1–10), floor gates, Terma crystals |
| `src/gameplay/projectiles.js` | Gameplay | object-pooled projectiles (`ghostfire`, `redArrow`, `boulder`, `frostRoar`), parabolic/homing flight, mantra dispel |
| `src/gameplay/items.js`, `groundLoot.js` | Gameplay | monkey sacred artifacts + Diablo-style ground loot drops, rarity light beams, `Alt` label plate layout, auto-pickup |
| `src/gameplay/potions.js`, `shrines.js`, `waypoints.js` | Gameplay | Amrita potion charges (`X`), 4 blessing shrine types, lotus waypoints & Recall portal (`B`) |
| `src/gameplay/lamps.js`, `monkeys.js`, `npcs.js` | Gameplay | butter-lamp stations, monkey wander/feeding, procedural 3D NPC builder (8 looks) & overhead quest markers (`!`/`?`) |
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
state.player.action   // 'idle'|'walk'|'run'|'prostrate'|'light'|'feed'|'chant'|'hurt'|'faint'
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
| `terma:entered` / `terma:floor` / `terma:cleared` | `{ tier, floor, seed }` | dungeon → quests / UI |
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
  | `vitals` | `src/systems/vitals.js` | `{ level, exp, hp, mp, permanent: { atk, def } }` |
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
