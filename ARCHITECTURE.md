# Architecture — Boudhanath Stupa 3D

Vite + Three.js, vanilla JS (ES modules), no external 3D/audio assets — everything procedural.

## Directory & ownership

| Path | Owner | Purpose |
|---|---|---|
| `index.html` | Gameplay | SEO head (keep), inline SVG favicon, `#app` canvas container, `#ui` overlay root |
| `src/main.js` | **Architect** | renderer, ctx/state, module wiring, game loop (performance.now delta), bloom |
| `src/config.js` | **Architect** | layout constants & balance tuning — read-only for subagents |
| `src/core/events.js` | **Architect** | event bus |
| `src/core/debug.js` | **Architect** | console inspection & debug API (`window.__stupa`) |
| `src/world/sky.js` | World | sky dome, sun/moon, stars, lights, fog, exposure — writes `state.time.sunDir/nightFactor` |
| `src/world/stupa.js` | World | stupa, wall, prayer wheels, night string lights; exports `flagAnchors` |
| `src/world/prayerFlags.js` | World | wind-animated five-color flags (vertex shader) |
| `src/world/environment.js` | World | plaza ground, surrounding buildings, hills, pigeons, lit windows at night, north monastery gate |
| `src/world/mapBase.js` | World | shared terrain heightfield, InstancedMesh rock scatter, mountain rim, seeded RNG, collider helper |
| `src/world/wilderness.js` | World | highland steppe terrain, chorten, mani stones, boulders, peaks, return gate (lazy-loaded) |
| `src/world/maps/sandbox.js` | World | debug sandbox arena with flat ground, scattered rocks, trial stone circle, Mani cairn, and return gate (lazy-loaded) |
| `src/data/maps.js` | Data | data-driven map registry (`MAPS`: `stupa`, `wild`, `sandbox`, ...) |
| `src/data/npcs.js` | Data | data-driven NPC registry (`NPCS`) and look definitions (`NPC_LOOKS`) |
| `src/data/dialogues/debug.js` | Data | debug & sandbox NPC dialogue trees (`DEBUG_DIALOGUES`) |
| `src/data/quests/debug.js` | Data | debug & sandbox trial quests (`DEBUG_QUESTS`) |
| `src/core/input.js` | Gameplay | keyboard / mouse-drag / touch virtual joystick + multi-touch action buttons → action state |
| `src/i18n.js`, `src/i18n/maps.js`, `src/i18n/quests.js` | Gameplay | zh-Hant / en strings, `i18n.register(dict)`, dynamic substitution, tutorial, map & quest strings |
| `src/player/player.js` | Gameplay | pilgrim mesh, movement, collision, prostration animation, kora tracking |
| `src/player/cameraRig.js` | Gameplay | third-person follow camera + intro orbit |
| `src/gameplay/mantra.js` | Gameplay | Six-Syllable Mantra (六字大明咒) area wave, syllables pool, cooldown & MP handling |
| `src/gameplay/enemies.js` | Gameplay | enemy models (preta, tsen, migoi), AI state machine, melee/ranged/magic attacks, telegraphs, liberation VFX, forceAttack API |
| `src/gameplay/projectiles.js` | Gameplay | object-pooled projectiles (ghostfire, redArrow, boulder, frostRoar), parabolic/homing flight, collision, mantra dispel |
| `src/gameplay/items.js` | Gameplay | dropped items, procedural 3D models, pickup detection, pity system |
| `src/gameplay/lamps.js` | Gameplay | butter-lamp stations (interactable), flames + lights (PointLights disabled when out of stupa) |
| `src/gameplay/monkeys.js` | Gameplay | monkey meshes, wander AI, feeding (interactable) |
| `src/gameplay/npcs.js` | Gameplay | procedural 3D NPC builder (8 looks), idle animations, smooth player-facing turn, overhead quest markers (`!`/`?`), showcase helper |
| `src/systems/zones.js` | Gameplay | data-driven zone manager (`MAPS`), lazy `import()` loading, gate transitions, `ctx.world` API |
| `src/systems/save.js` | Gameplay | unified v2 save system (`stupa.save.v2`), v1 migration, per-section fault tolerance, throttled writes |
| `src/systems/vitals.js` | Gameplay | vitals system (HP/MP/EXP/ATK/DEF), level curve, damage mitigation, buffs |
| `src/systems/quests.js` | Gameplay | data-driven quest system (9 step types), collectible quest props, 3D diamond world marker, reward distribution |
| `src/systems/interaction.js` | Gameplay | nearest-interactable selection (NPC highest priority), prompt, dispatch |
| `src/systems/merit.js` | Gameplay | counters, achievements, persistence (localStorage) |
| `src/systems/audio.js` | Gameplay | Web Audio synthesized singing bowl, wind crossfade, bells, chant drone, raptor eagle cry; adaptive score glue (track selection, stingers) |
| `src/systems/music.js` | Gameplay | procedural music engine: synthesized Himalayan instruments, bar look-ahead sequencer, crossfades, stingers, ducking, reverb |
| `src/data/music.js` | Data | score: leitmotifs, per-map / chapter-variant / boss tracks and stingers (A4 = 432 Hz) |
| `src/ui/hud.js`, `src/style.css` | Gameplay | title screen, HUD, prompts, toasts, time slider, language toggle, mobile 2x2 action buttons |
| `src/ui/dialogue.js` | Gameplay | bottom glassmorphic dialogue box, 2D canvas speaker portrait, typewriter text, codex link parser, choices & actions |
| `src/ui/quests.js` | Gameplay | right-side Quest Tracker (up to 3), Quest Journal modal (`J`), projected diamond & edge directional arrow, completion banner |

Subagents edit **only** files they own. If a contract change is needed, report it to the architect instead of editing shared files.

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

## Module contract

```js
export function createX(ctx, ...extra) {
  // build meshes, ctx.scene.add(group), push colliders/interactables
  return { update(dt) { /* read ctx.state */ }, /* optional API */ };
}
```

`ctx` fields:

| Field | Description |
|---|---|
| `THREE, scene, camera, renderer` | Three.js objects (camera is moved only by `cameraRig`) |
| `zoneGroups` | `{ [mapId]: THREE.Group }` toggled by active zone (`stupaGroup` & `wildGroup` kept as aliases) |
| `world` | `{ getMap(id?), getHeight(x, z), isCombatZone(), isHub(), sampleSpawnPoint(areaId, opts?) }` |
| `bus` | `{ on(type, fn) → unsubscribe, emit(type, payload) }` |
| `state` | shared mutable game state (below) |
| `config` | `CONFIG` |
| `i18n` | `{ t(key, params?), lang, setLang(lang), onChange(fn), register(dict) }` |
| `colliders` | array; push `{type:'circle',x,z,r,zone:mapId}` or `{type:'box',minX,maxX,minZ,maxZ,zone:mapId}` |
| `interactables` | array of Interactable (below) |
| `input` | input module (created first) |
| `save` | `{ version: 2, get(section, fallback), set(section, data), markDirty(section), flush(), reset(), exportString(), importString(str) }` |
| `debug` | `{ enabled, register(name, api) }` |
| `mantra` | `{ update(dt), cast(), showRadius(bool), getCooldownFraction() }` |
| `enemies` | `{ update(dt), spawn(kind?, distance?), clear(), list(), freeze(bool), forceAttack(id?, attackId) }` |
| `projectiles` | `{ update(dt), spawn(type, params?), clear(), count(), showHitboxes(bool) }` |
| `items` | `{ update(dt), drop(id?), forceNext(), pityCount(), activeItems }` |
| `vitals` | `{ update(dt), addExp, spendMp, addBuff, addPermanent, getStats, set, damage, faint, god(bool) }` |
| `zones` | `{ update(dt), teleport(mapId, options?), startTransition(mapId, spawnId?), isTransitioning(), list() }` |
| `quests` | `{ update(dt), start(id), complete(id), completeStep(id, step?), reset(id?), setFlag(flag), clearFlag(flag), hasFlag(flag), getTrackedTargets(), state() }` |
| `npcs` | `{ update(dt), buildNpc(look), spawnNpc(def), spawnAllLooks(opts?), clearShowcase(), getNpc(id), list() }` |
| `dialogue` | `{ update(dt), open(id, opts?), close(), advance(), selectChoice(idx), register(defs), isOpen(), state() }` |
| `questUi` | `{ update(dt), openJournal(), closeJournal(), toggleJournal(), isOpen() }` |
| `merit` | `{ update(dt), reset, getStats, getAchievementsList }` |
| `audio` | `{ update(dt), isMuted, setMuted, toggleMute, getVolume, setVolume, isMusicEnabled, setMusicEnabled, toggleMusic, getMusicVolume, setMusicVolume, getMusicTrack, forceMusic(id, vars), playMusicStinger(id), playEagleCry, playDistantBell }` |

Update order per frame: `input → save → sky → stupa → flags → environment → zones → player → mantra → enemies → projectiles → items → lamps → monkeys → vitals → quests → npcs → cameraRig → merit → interaction → audio → hud → dialogue → questUi`.

### `state`

```js
state.mode            // 'intro' | 'play'   (main sets 'play' on bus 'game:start')
state.zone            // active mapId string ('stupa' | 'wild' | 'sandbox' | ...)
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
state.player.level    // 1..30
state.player.exp      // 0..maxExp
state.player.hp       // 0..maxHp
state.player.maxHp    // derived
state.player.mp       // 0..maxMp
state.player.maxMp    // derived
state.player.atk      // derived
state.player.def      // derived
state.player.buffs    // array of { id, remaining, duration, stats }
state.player.permanent// { atk, def }
state.player.invulnUntil // seconds timestamp
state.player.slowUntil   // seconds timestamp
state.quests          // { active: { [id]: { step, progress, tracked } }, done: string[], flags: { [flag]: true } }
state.interactionTarget  // currently targeted interactable or null
```

### Interactable

```js
{
  id: 'lamp-0',
  kind: 'lamp' | 'monkey' | 'wheel' | 'gate' | string,
  zone: 'stupa' | 'wild',          // only scored/triggered in matching state.zone
  getPosition(): THREE.Vector3,    // world position
  radius: number,                  // max interaction distance
  action: 'interact' | 'feed',     // which input action triggers it (E / F)
  labelKey: 'prompt.lightLamp',    // i18n key for the on-screen prompt
  isAvailable(): boolean,
  onInteract(): void,
}
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
| `toast` | `{ key, params? }` | anyone → HUD |
| `prompt` | `{ labelKey, keyHint } \| null` | interaction → HUD |
| `sfx` | `{ name: 'bowl'\|'bell'\|'light'\|'monkey'\|'wheel'\|'step'\|'pickup'\|'chant'\|'hit'\|'hurt'\|'liberate'\|'arrow'\|'fireball'\|'boulder'\|'frost'\|'dispel'\|'levelup'\|'faint'\|'eagle' }` | anyone → audio |
| `audio:change`| `{ muted, volume }` | audio → HUD |
| `merit:reset` | – | merit → systems / HUD |
| `vitals:restore` | `{ hp?, mp?, source }` | player / lamps / monkeys / wilderness |
| `vitals:damage` | `{ amount, type = 'physical'\|'magic', sourcePos?, slow?, ignoreInvuln? }` | anyone → vitals |
| `vitals:changed` | `{ hp, maxHp, mp, maxMp, exp, maxExp, level, atk, def, buffs, deltaHp, deltaMp, source }` | vitals → HUD |
| `level:up` | `{ level, prevLevel, maxHp, maxMp, atk, deltaMaxHp, deltaMaxMp, deltaAtk }` | vitals → HUD / merit |
| `monkey:fed` | `{ position }` | monkeys |
| `item:pickup` | `{ id, permanent }` | items |
| `player:faint` | `{}` | vitals → player / HUD |
| `player:wake` | `{}` | vitals → player / HUD |
| `player:hurt` | `{ amount, type, sourcePos }` | vitals |
| `player:damaged` | `{ amount, type, sourcePos }` | vitals |
| `player:chant` | `{ duration }` | mantra |
| `mantra:cast` | `{ origin, radius, power }` | mantra |
| `mantra:nomp` | – | mantra |
| `enemy:hit` | `{ id, kind, damage, type, position }` | enemies |
| `enemy:liberated` | `{ id, kind, exp, position }` | enemies |
| `npc:talk` | `{ npcId, dialogueId }` | npcs |
| `dialogue:open` / `dialogue:close` | `{ id, npcId }` | dialogue |
| `quest:start` / `quest:progress` / `quest:complete` | `{ id, step?, stepId?, progress?, goal?, rewards? }` | quests |
| `quest:item` | `{ item, count }` | quests (collectible prop) / maps |
| `quest:interact` | `{ target, count? }` | maps / props |
| `flag:set` | `{ flag, value }` | quests |
| `codex:open` / `codex:unlock` | `{ id }` | dialogue / quests |

---

## Combat & Wilderness Architecture

### 1. Data-Driven Zone Registry, Lazy Loading & Scene Graph Culling
Maps are registered in `src/data/maps.js` (`MAPS`):
- Each map entry defines `id`, `type` (`'hub' | 'combat' | 'dungeon'`), `nameKey`, `origin`, `level`, `walkRadius`, `safeZones`, `gates`, `spawns`, `spawnTable`, `spawnAreas`, `ambience`, `debugOnly`, and `load: () => import(...)`.
- **Lazy Construction**: Non-hub maps are only imported and constructed the first time the player enters them (`zones.ensureMapLoaded(mapId)`), emitting `map:loaded`. During `startTransition`, the black fade screen stays active until `load()` resolves.
- **Scene Graph Culling**: Each map owns a `THREE.Group` in `ctx.zoneGroups[mapId]` (`ctx.stupaGroup` and `ctx.wildGroup` are preserved as aliases). Switching maps hides inactive groups (`visible = false`).
- **`ctx.world` Helpers**: Systems query `ctx.world.isCombatZone()`, `ctx.world.isHub()`, `ctx.world.getHeight(x, z)`, `ctx.world.getMap(id)`, and `ctx.world.sampleSpawnPoint(areaId, opts)` instead of hardcoding `'wild'`.

### 2. Vitals & Progression Formulas
- **Vitals Base & Scaling**:
  - HP: `baseHp = 100`, `+10 HP` per level (`maxHp = 100 + 10 * (lvl - 1)`).
  - MP: `baseMp = 60`, `+5 MP` per level (`maxMp = 60 + 5 * (lvl - 1)`).
  - ATK: `baseAtk = 10`, `+4 ATK` per level (`baseAtk = 10 + 4 * (lvl - 1)`).
  - EXP Curve: $\text{maxExp}(L) = \lfloor 20 \cdot L^{1.5} \rfloor$ (Lv1 $\rightarrow$ 20, Lv2 $\rightarrow$ 56, Lv3 $\rightarrow$ 103, Lv4 $\rightarrow$ 160).
  - Max Level: 30.
- **Derived Stats Recalculation**:
  $$\text{ATK} = \text{round}\big((\text{baseAtk} + \text{perm.atk}) \cdot \text{atkMult} + \text{atkAdd}\big)$$
  $$\text{DEF} = \text{round}\big((\text{baseDef} + \text{perm.def}) \cdot \text{defMult} + \text{defAdd}\big)$$
- **Damage Mitigation Formula**:
  $$\text{Mitigation Factor} = \frac{\text{defConstant}}{\text{defConstant} + \text{effectiveDef}}$$
  Where `defConstant = 50`. For physical damage, `effectiveDef = DEF`. For magical damage, `effectiveDef = DEF * 0.5`.
  Final damage applied: $\text{damage} = \max(1, \text{round}(\text{rawDamage} \cdot \text{factor}))$.
- **Sacred Artifacts (Monkey Drops & Buffs)**:
  - `sungdu` (加持繩): Temporary DEF +15 for 120s.
  - `dungkar` (法螺): Temporary ATK $\times 1.5$ for 90s.
  - `gau` (嘎烏盒): Permanent DEF +2 (cap +20).
  - `dorje` (金剛杵): Permanent ATK +2 (cap +20).

### 3. Six-Syllable Mantra (六字大明咒) & Magic Dispelling
- **Mechanics**:
  - Hotkeys: `R` or `Space` (desktop) / Bottom-Right action button (mobile).
  - Cost: 8 MP (Lv1 has 60 MP $\rightarrow$ 7 casts before exhaustion).
  - Cooldown: 0.85s (0.45s in Stupa zone).
  - Effect: Unfolds an expanding golden lotus mandala wave ($r = 6.0\text{m}$, duration 0.5s) displaying the six Tibetan syllables (`ཨོཾ`, `མ`, `ཎི`, `པ`, `དྨེ`, `ཧཱུྃ`).
  - Deals $\text{damage} = \text{player.atk}$ to all enemies within radius.
  - Dispels active hostile magical projectiles (`ghostfire`, `frostRoar`), bursting them into golden sparkle particles with `sfx: 'dispel'`.
  - Zero-allocation object pool: 6 pre-allocated wave hierarchies with shared RingGeometries and CanvasTextures.

### 4. Enemy AI State Machine & Telegraphs
Enemies operate on a 7-state machine:
$$\text{Wander} \longleftrightarrow \text{Notice} \longrightarrow \text{Chase} \longrightarrow \text{Windup (Telegraph)} \longrightarrow \text{Attack} \longrightarrow \text{Recover} \longrightarrow \text{Chase}$$
- **Telegraph Indicators**:
  - Melee / AoE: Red radial ground decal circle showing exact damage area and windup duration.
  - Ranged / Charge: Red directional straight-line strip showing line of attack.
- **Three Enemy Archetypes**:
  1. **Preta (餓鬼)**: Near ring ($8 < r < 26$), 20 HP, 5 EXP. Melee `claw` (6 dmg) + homing `ghostfire` magic ball (8 dmg, dispellable). Spawns in clusters of 3–4.
  2. **Tsen (贊)**: Mid ring ($26 < r < 46$), 45 HP, 15 EXP. Fast red-armored mounted warrior. Straight `spearCharge` dash (14 dmg) + long-range `redArrow` shot (10 dmg).
  3. **Migoi (雪人)**: Deep ring ($46 < r < 65$), 120 HP, 40 EXP. Massive Himalayan yeti. Close `groundSlam` shockwave (20 dmg), long-range parabolic `boulder` lob (16 dmg), and tracking `frostRoar` ground ice fissure (12 dmg + slow, dispellable).
- **Liberation (超度)**:
  - Defeated enemies dissolve into five-color Tibetan prayer aura particles (blue $\rightarrow$ space, white $\rightarrow$ air, red $\rightarrow$ fire, green $\rightarrow$ water, yellow $\rightarrow$ earth).
  - Ascends into the sky with peaceful liberation chime, granting EXP and contributing to merit achievements.

### 5. Projectiles Object Pool
- Fixed pool capped at `maxActive = 20`.
- 4 projectile types:
  - `ghostfire`: Homing tracking sphere with green fire trail.
  - `redArrow`: High-speed ballistic projectile with wooden shaft and glowing tip.
  - `boulder`: High-arc parabolic lob with rotating rock mesh and ground dust impact.
  - `frostRoar`: Ground eruption hazard with glowing ice crystals and lingering slow zone.
- Zero runtime allocations: Geometries and materials are instantiated once at startup and reused.

### 6. Faint & Recovery Loop
- **0.0s**: HP reaches 0 $\rightarrow$ `isFainting = true`, pilgrim collapses, full-screen `#faint-overlay` fades in, plays `sfx: 'faint'`.
- **1.2s**: Player teleports to Stupa south plaza spawn `(0, 0, 30)`, HP restored to 50% maxHp, 10% current EXP lost (`floor(exp * 0.9)`), debuffs cleared.
- **1.8s**: Overlay fades out, player regains control with 3.0s invulnerability period.

### 7. First-Time Wilderness Onboarding Tutorial
- When player enters `'wild'` for the first time, checks `ctx.save.get('tutorial')['stupa_wild_tutorial_v1']`.
- Displays 3 localized sequential tips:
  1. `0.4s`: `tutorial.wild1` — "按 R / Space 唸誦六字大明咒" / "Press R / Space to chant the Six-Syllable Mantra"
  2. `2.8s`: `tutorial.wild2` — "注意紅色預警，及時閃避" / "Watch for red telegraphs and dodge in time"
  3. `5.2s`: `tutorial.wild3` — "HP/MP 不足時，回佛塔大禮拜、點燈、餵猴" / "When low on HP/MP, return to the Stupa to prostrate, light lamps, and feed monkeys"
- Persists in the `tutorial` save section; cleared on `merit:reset`.

### 8. Unified Save System v2 (`src/systems/save.js`)
- **Storage Key**: `stupa.save.v2`, JSON format `{ version: 2, savedAt, sections: { ... } }`.
- **Rule**: All systems **must** persist data exclusively through `ctx.save` (`get`, `set`, `markDirty`). Direct `localStorage` access outside `save.js` is prohibited.
- **`get(section, fallback)`**: Returns a validated deep clone of the section data (falling back to `fallback` if missing or corrupted without crashing the game).
- **Write Throttling**: `set()` and `markDirty()` mark the store dirty; `save.update(dt)` writes to `localStorage` at most once per 1.0s, and flushes immediately on `visibilitychange` (`hidden`) and `pagehide`.
- **Migration**: On first load when `stupa.save.v2` is absent, legacy v1 keys (`stupa.vitals.v1`, `stupa.merit.v1`, `stupa.items.v1`, `stupa_wild_tutorial_v1`, `stupa.lang`, `stupa.audio.muted`, `stupa.audio.volume`) are migrated via `migrations[1]` into `stupa.save.v2` while preserving the old keys in `localStorage`.
- **Save Sections & Owners**:
  | Section | Owner | Contents |
  |---|---|---|
  | `vitals` | `src/systems/vitals.js` | `{ level, exp, hp, mp, permanent: { atk, def } }` |
  | `merit` | `src/systems/merit.js` | `{ kora, prostration, lamp, monkey, wheel, preta, tsen, migoi, totalLiberated, mantraCasts, points, achievements }` |
  | `items` | `src/gameplay/items.js` | `{ pityCount }` |
  | `tutorial` | `src/systems/zones.js` | `{ [tutorialKey]: boolean }` |
  | `settings` | `src/i18n.js`, `src/systems/audio.js` | `{ lang, muted, volume }` |
  | `inventory` | `src/systems/inventory.js` (#24) | `{ bag, equipped, turquoise, materials }` |
  | `skills` | `src/gameplay/skills.js` (#26) | `{ points, ranks, enhance, unlocked, bar, ultCharge, activeProtector }` |
  | `quests` | `src/systems/quests.js` (#28) | `{ active, done, flags }` |
  | `codex` | `src/systems/codex.js` (#29) | `{ unlocked }` |
  | `waypoints` | `src/systems/waypoints.js` (#29) | `string[]` |
  | `protectors` | `src/gameplay/bosses.js` (#30) | `string[]` |

### 9. Performance & Audio Crossfade
- **PointLight Budget**: Total active PointLights $\le 6$. Wilderness zone uses 0 PointLights; Stupa zone uses 3 (1 per lamp station, which explicitly hide when `state.zone !== 'stupa'`).
- **Audio Crossfade**:
  - Stupa Zone: Warm "Om" harmonic drone pad (108 Hz fundamental + harmonics) + serene plaza wind + periodic distant temple bells.
  - Wilderness Zone: Highland wind profile (higher gain + Q resonance) + periodic synthesized Himalayan eagle/hawk cry (`playEagleCry()`, sweeping FM warble every 12–20s).
  - Crossfade on `zone:change` smoothly interpolates over ~0.8s via AudioParam time constants.
- **Adaptive Score** (`src/systems/music.js` engine + `src/data/music.js` score, tunables in `CONFIG.MUSIC`):
  - Track resolution (`audio.js#resolveMusicTrack`): boss active → `boss.<bossId>` (live `phase` var: tempo / layers) › zone + quest flags → `stupa` (live `night` var), `wild`, `pharping.drought|rain` (`ch1.rain`), `mangyul.storm|calm` (`ch2.storm.done`), `yarlung.unrest|calm` (`ch3.yaks.done`), `samye.day|night|complete` (`samye:nightStarted/nightSurvived`, `ch4.pehar.done`). Re-resolved on `zone:change`, boss events, `flag:set`, `quest:complete`, and every `refreshInterval` seconds.
  - Different track id → crossfade (`crossfade` / `bossCrossfade`); same id → vars merged live (no restart).
  - Stingers (duck the track bus): `chapter:intro` → `vision`, `chapter:banner` → `chapterComplete`, `boss:subdued` → `subdued`, `boss:phase` → `phaseShift`, `dialogue:open` with a `guruVision.*` NPC → `guru`. Stingers are transposed into the current track's key.
  - Music shares the master gain (mute / volume) and has its own on/off + volume (`settings.music`, `settings.musicVolume`, HUD 🎵 button). When music is off, the legacy boss drum loop takes over.
  - Score authoring: phrases are strings `"NOTE:beats[:accent][^grace]"`; each track's `bar(api, vars)` runs once per bar and `api.line(phrase, startBar, instrument, vel, opts)` plays the slice that falls in the bar. Audition every track at `/music-lab.html` (dev server only).
- **Mobile Multi-Touch Controls**:
  - Virtual joystick occupies left half of the screen (`clientX < window.innerWidth * 0.5`).
  - Action buttons (Chant, Prostrate, Interact, Feed) are positioned on the bottom right in an ergonomic 2x2 cluster on screens $\le 720\text{px}$.
  - Action buttons intercept `pointerdown` with `e.stopPropagation()`, ensuring simultaneous multi-touch execution while the canvas holds pointer capture for the virtual joystick.
