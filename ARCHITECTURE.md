# Architecture — Boudhanath Stupa 3D

Vite + Three.js, vanilla JS (ES modules), no external 3D/audio assets — everything procedural.

## Directory & ownership

| Path | Owner | Purpose |
|---|---|---|
| `index.html` | Gameplay | SEO head (keep), `#app` canvas container, `#ui` overlay root |
| `src/main.js` | **Architect** | renderer, ctx/state, module wiring, game loop, bloom |
| `src/config.js` | **Architect** | layout constants — read-only for subagents |
| `src/core/events.js` | **Architect** | event bus |
| `src/core/debug.js` | **Architect** | console inspection & debug API (`window.__stupa`) |
| `src/world/sky.js` | World | sky dome, sun/moon, stars, lights, fog, exposure — writes `state.time.sunDir/nightFactor` |
| `src/world/stupa.js` | World | stupa, wall, prayer wheels, night string lights; exports `flagAnchors` |
| `src/world/prayerFlags.js` | World | wind-animated five-color flags (vertex shader) |
| `src/world/environment.js` | World | plaza ground, surrounding buildings, hills, pigeons, lit windows at night, north monastery gate |
| `src/world/wilderness.js` | World | highland steppe terrain, chorten, mani stones, boulders, peaks, return gate |
| `src/core/input.js` | Gameplay | keyboard / mouse-drag / touch joystick → action state |
| `src/i18n.js` | Gameplay | zh-Hant / en strings |
| `src/player/player.js` | Gameplay | pilgrim mesh, movement, collision, prostration animation, kora tracking |
| `src/player/cameraRig.js` | Gameplay | third-person follow camera + intro orbit |
| `src/gameplay/mantra.js` | Gameplay | Six-Syllable Mantra (六字大明咒) area wave, syllables pool, cooldown & MP handling |
| `src/gameplay/enemies.js` | Gameplay | enemy models (preta, tsen, migoi), AI state machine, melee/ranged/magic attacks, telegraphs, liberation VFX, forceAttack API |
| `src/gameplay/projectiles.js` | Gameplay | object-pooled projectiles (ghostfire, redArrow, boulder, frostRoar), parabolic/homing flight, collision, mantra dispel |
| `src/gameplay/items.js` | Gameplay | dropped items, procedural 3D models, pickup detection, pity system |
| `src/gameplay/lamps.js` | Gameplay | butter-lamp stations (interactable), flames + lights |
| `src/gameplay/monkeys.js` | Gameplay | monkey meshes, wander AI, feeding (interactable) |
| `src/systems/zones.js` | Gameplay | zone manager ('stupa' | 'wild'), gate transitions, teleport API |
| `src/systems/vitals.js` | Gameplay | vitals system (HP/MP/EXP/ATK/DEF), level curve, damage mitigation, buffs |
| `src/systems/interaction.js` | Gameplay | nearest-interactable selection, prompt, dispatch |
| `src/systems/merit.js` | Gameplay | counters, achievements, persistence (localStorage) |
| `src/systems/audio.js` | Gameplay | Web Audio synthesized singing bowl, wind, bells, chant drone |
| `src/ui/hud.js`, `src/style.css` | Gameplay | title screen, HUD, prompts, toasts, time slider, language toggle |

Subagents edit **only** files they own. If a contract change is needed, report it to the architect instead of editing shared files.

## Coordinates

- Meters, +Y up, origin = stupa center on the ground. North = −Z, East = +X.
- `θ = Math.atan2(z, x)`. **Clockwise kora (stupa on the right shoulder) ⇔ θ increasing.**
- `state.player.heading`: yaw, 0 faces −Z, positive = counter-clockwise rotation about +Y (Three.js `rotation.y`).
- Walkable plaza: ring `WORLD.stupaColliderRadius (19.9) < r < WORLD.walkRadius (38)`, ground y = 0.
- Wilderness zone: centered at `CONFIG.WILD.origin` (`x = 1000, z = 0`), walkable radius 70m, terrain height $y = \text{getHeight}(x, z)$.
- Layout numbers live in `src/config.js` (`CONFIG.STUPA`, `WALL`, `WORLD`, `LAMPS`, `WILD`, …). Never hardcode duplicates.

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
| `stupaGroup, wildGroup` | Three.js Groups toggled by active zone for culling |
| `bus` | `{ on(type, fn) → unsubscribe, emit(type, payload) }` |
| `state` | shared mutable game state (below) |
| `config` | `CONFIG` |
| `i18n` | `{ t(key, params?), lang, setLang(lang), onChange(fn) }` |
| `colliders` | array; push `{type:'circle',x,z,r,zone?:'stupa'\|'wild'}` or `{type:'box',minX,maxX,minZ,maxZ,zone?:'stupa'\|'wild'}` |
| `interactables` | array of Interactable (below) |
| `input` | input module (created first) |
| `debug` | `{ enabled, register(name, api) }` |
| `mantra` | `{ update(dt), cast(), showRadius(bool), getCooldownFraction() }` |
| `enemies` | `{ update(dt), spawn(kind?, distance?), clear(), list(), freeze(bool), forceAttack(id?, attackId) }` |
| `projectiles` | `{ update(dt), spawn(type, params?), clear(), count(), showHitboxes(bool) }` |
| `items` | `{ update(dt), drop(id?), forceNext(), pityCount(), activeItems }` |
| `vitals` | `{ update(dt), addExp, spendMp, addBuff, addPermanent, getStats, set, damage, faint, god(bool) }` |
| `merit` | `{ update(dt), reset, getStats, getAchievementsList }` |

Update order per frame: `input → sky → stupa → flags → environment → wilderness → zones → player → mantra → enemies → projectiles → items → lamps → monkeys → vitals → cameraRig → merit → interaction → audio → hud`.

### `state`

```js
state.mode            // 'intro' | 'play'   (main sets 'play' on bus 'game:start')
state.zone            // 'stupa' | 'wild'   (zones system manages)
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
| `zone:change` | `{ from: 'stupa'\|'wild', to: 'stupa'\|'wild' }` | zones |
| `merit` | `{ type: 'kora'\|'prostration'\|'lamp'\|'monkey'\|'wheel' }` | player / lamps / monkeys / stupa |
| `kora:progress` | `{ fraction: 0..1, laps }` | player |
| `kora:wrongway` | – | player (walking counter-clockwise for a while) |
| `achievement` | `{ id }` | merit |
| `toast` | `{ key, params? }` | anyone → HUD |
| `prompt` | `{ labelKey, keyHint } \| null` | interaction → HUD |
| `sfx` | `{ name: 'bowl'\|'bell'\|'light'\|'monkey'\|'wheel'\|'step'\|'pickup'\|'chant'\|'hit'\|'hurt'\|'liberate'\|'arrow'\|'fireball'\|'boulder'\|'frost'\|'dispel'\|'levelup'\|'faint' }` | anyone → audio |
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

## Progression & Faint Mechanics

### Leveling
- EXP curve: `Math.floor(20 * Math.pow(level, 1.5))` (`Lv1->2: 20`, `Lv2->3: 56`, etc.).
- Multi-leveling & EXP carryover supported in `addExp(n)`.
- Max level: 30 (`p.exp = 0`, `isMaxLevel = true`, EXP bar displays `MAX`).
- On level up: full HP/MP restore, ATK derived recalculation, emits `level:up`, plays `sfx: 'levelup'`, displays `#levelup-banner`.

### Faint Sequence (`vitals.faint()`)
1. `0.0s`: `isFainting = true`, `p.hp = 0`, `action = 'faint'`, collapse animation, full-screen `#faint-overlay` fades in, plays `sfx: 'faint'`, duplicate damage while fainting is discarded (returns 0).
2. `1.2s`: Teleport to Stupa south spawn `(0, 0, 30)` facing 0, `hp = 50% maxHp`, lose 10% current exp (`floor(exp * 0.9)`), clear buffs and slow, grant 3.0s invulnerability.
3. `1.8s`: `isFainting = false`, `action = 'idle'`, emits `player:wake`, `#faint-overlay` fades out, player retains full 3.0s invulnerability after waking.

### Combat Achievements
- `firstLiberation`: First enemy liberated (`totalLiberated >= 1`)
- `liberatePreta50`: Liberate 50 Pretass (`preta >= 50`)
- `liberateTsen`: First Tsen liberated (`tsen >= 1`)
- `liberateMigoi`: First Migoi liberated (`migoi >= 1`)
- `level10`: Reach Level 10 (`state.player.level >= 10`)
- `fullDorje`: Permanent Vajra ATK cap reached (`permanent.atk >= 20`)
- `compassion`: Chant the Six-Syllable Mantra 1008 times (`mantraCasts >= 1008`)

### Console Inspection API (`window.__stupa`)
- `__stupa.vitals.addExp(n)`: Grant EXP and trigger level checks
- `__stupa.vitals.faint()`: Trigger faint sequence
- `__stupa.vitals.damage(amount, type, extra)`: Apply damage to player
- `__stupa.vitals.god(bool)`: Toggle invincibility
- `__stupa.vitals.get()`: Snapshot stats
- `__stupa.merit.stats()`: Returns tracking stats including combat counts and achievements
- `__stupa.merit.reset()`: Reset merit progress

## Rendering notes

- ACES tone mapping + sRGB output; bloom threshold 0.85. Glowing things (flames, string lights, lit windows) should use colors > 1 or `toneMapped: false` so they bloom; keep daytime surfaces below threshold.
- Sun = `DirectionalLight` with shadows (owned by sky); shadow camera must cover radius ~45 around origin.
- Budget: aim for 60 FPS on a laptop. Prefer `InstancedMesh` / merged geometry for repeated objects (wheels, flags, bricks, lamps). Limit real `PointLight`s to ≲ 6 total (e.g. one per lamp station, intensity scaled by lit-lamp count); fake the rest with emissive + bloom.
