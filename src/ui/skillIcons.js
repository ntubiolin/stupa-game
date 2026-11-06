/**
 * Custom SVG Icon Illustrations for the 7 Skills and 3 Dharma Protectors.
 *
 * Replaces raw Tibetan script glyphs on HUD buttons, the mobile arc skill pad,
 * and the Skills modal (K) with distinct, color-coded, high-contrast vector icons:
 *   1. humBolt     (Space) : Radiant Comet / Vajra Bolt (Cyan + Solar Gold)
 *   2. mantra      (R)     : Expanding Sonic Lotus Mandala Wave (Saffron + Turquoise)
 *   3. phurba      (1)     : Three-Edged Ritual Dagger & Root Seal (Crimson + Steel/Gold)
 *   4. vajraBell   (2)     : Ringing Ritual Ghanta Bell + Soundwaves (Azure + Bronze/Gold)
 *   5. lotusShield (3)     : Emerald Ward Shield + Blooming Pink Lotus (Jade + Rose/Gold)
 *   6. protector   (4)     : Crowned Dharmapala Guardian Mask & Wisdom Eyes (Amethyst + Gold/Turquoise)
 *   7. vajraGuru   (T)     : Supreme 8-Spoked Golden Dharma Wheel on Lotus Base (Solar Gold + Rainbow Halo)
 */

const SKILL_ICON_SVGS = {
  // 1. Hum Seed Bolt (Space) — Diagonal streaking magic comet bolt with star flare
  humBolt: `
    <svg class="skill-svg skill-svg--humBolt" viewBox="0 0 48 48" aria-hidden="true">
      <!-- Ambient cyan-gold energy glow -->
      <circle cx="30" cy="18" r="13" fill="#38bdf8" fill-opacity="0.18" />
      <circle cx="33" cy="15" r="8" fill="#f59e0b" fill-opacity="0.25" />
      <!-- Comet energy trails -->
      <path d="M6 42 L31 17" stroke="#0284c7" stroke-width="6.5" stroke-linecap="round" stroke-opacity="0.55" />
      <path d="M8 40 L32 16" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" />
      <path d="M9 29 L24 14" stroke="#7dd3fc" stroke-width="2.2" stroke-linecap="round" stroke-opacity="0.9" />
      <path d="M19 39 L34 24" stroke="#fbbf24" stroke-width="2.2" stroke-linecap="round" stroke-opacity="0.9" />
      <path d="M12 36 L33 15" stroke="#fef08a" stroke-width="2.4" stroke-linecap="round" />
      <!-- Faceted diamond spearhead -->
      <path d="M42 6 L35 25 L29 19 L23 13 Z" fill="#f59e0b" stroke="#fef08a" stroke-width="1.3" stroke-linejoin="round" />
      <path d="M42 6 L29 19 L23 13 Z" fill="#fde047" />
      <path d="M40 8 L33 20 L30 18 L28 15 Z" fill="#e0f2fe" />
      <!-- Tip star flare -->
      <path d="M37 4 L38.4 9.6 L44 11 L38.4 12.4 L37 18 L35.6 12.4 L30 11 L35.6 9.6 Z" fill="#ffffff" />
      <!-- Trailing sparks -->
      <circle cx="14" cy="23" r="1.9" fill="#bae6fd" />
      <circle cx="25" cy="35" r="1.7" fill="#fde047" />
      <circle cx="11" cy="34" r="1.5" fill="#fef08a" />
    </svg>
  `,

  // 2. Six-Syllable Mantra (R) — 360° expanding sonic lotus mandala shockwave
  mantra: `
    <svg class="skill-svg skill-svg--mantra" viewBox="0 0 48 48" aria-hidden="true">
      <!-- Outer expanding turquoise shockwave arcs -->
      <path d="M14 7.5 A19 19 0 0 1 34 7.5" fill="none" stroke="#2dd4bf" stroke-width="2.3" stroke-linecap="round" />
      <path d="M34 40.5 A19 19 0 0 1 14 40.5" fill="none" stroke="#2dd4bf" stroke-width="2.3" stroke-linecap="round" />
      <path d="M7.5 34 A19 19 0 0 1 7.5 14" fill="none" stroke="#2dd4bf" stroke-width="2.3" stroke-linecap="round" />
      <path d="M40.5 14 A19 19 0 0 1 40.5 34" fill="none" stroke="#2dd4bf" stroke-width="2.3" stroke-linecap="round" />
      <!-- 4 Cardinal outward expansion chevrons -->
      <path d="M21 5.5 L24 2.5 L27 5.5" fill="none" stroke="#99f6e4" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M21 42.5 L24 45.5 L27 42.5" fill="none" stroke="#99f6e4" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M5.5 21 L2.5 24 L5.5 27" fill="none" stroke="#99f6e4" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M42.5 21 L45.5 24 L42.5 27" fill="none" stroke="#99f6e4" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
      <!-- Middle golden ripple ring -->
      <circle cx="24" cy="24" r="14" fill="#fb923c" fill-opacity="0.16" stroke="#fb923c" stroke-width="1.8" stroke-dasharray="4.5 2.8" />
      <!-- 8-Petal Golden Lotus Mandala -->
      <g fill="#f59e0b" stroke="#fef08a" stroke-width="0.95">
        <path d="M24 10.5 C26.6 14.8 26.6 19 24 22 C21.4 19 21.4 14.8 24 10.5 Z" />
        <path d="M24 37.5 C26.6 33.2 26.6 29 24 26 C21.4 29 21.4 33.2 24 37.5 Z" />
        <path d="M10.5 24 C14.8 21.4 19 21.4 22 24 C19 26.6 14.8 26.6 10.5 24 Z" />
        <path d="M37.5 24 C33.2 21.4 29 21.4 26 24 C29 26.6 33.2 26.6 37.5 24 Z" />
        <path d="M14.5 14.5 C18.4 15.8 21 18.4 22 22 C18.4 21 15.8 18.4 14.5 14.5 Z" fill="#fbbf24" />
        <path d="M33.5 14.5 C29.6 15.8 27 18.4 26 22 C29.6 21 32.2 18.4 33.5 14.5 Z" fill="#fbbf24" />
        <path d="M14.5 33.5 C18.4 32.2 21 29.6 22 26 C18.4 27 15.8 29.6 14.5 33.5 Z" fill="#fbbf24" />
        <path d="M33.5 33.5 C29.6 32.2 27 29.6 26 26 C29.6 27 32.2 29.6 33.5 33.5 Z" fill="#fbbf24" />
      </g>
      <!-- Central glowing jewel -->
      <circle cx="24" cy="24" r="5.2" fill="#fde047" stroke="#ea580c" stroke-width="1.4" />
      <circle cx="24" cy="24" r="2.3" fill="#ffffff" />
    </svg>
  `,

  // 3. Vajra Phurba (1) — 3-Edged Ritual Dagger plunging into a crimson root seal
  phurba: `
    <svg class="skill-svg skill-svg--phurba" viewBox="0 0 48 48" aria-hidden="true">
      <!-- Ground root / binding seal at tip -->
      <ellipse cx="24" cy="40" rx="14.5" ry="4.2" fill="#ef4444" fill-opacity="0.26" stroke="#f87171" stroke-width="1.8" />
      <ellipse cx="24" cy="40" rx="8.2" ry="2.2" fill="none" stroke="#fde047" stroke-width="1.2" />
      <!-- Root lightning spikes -->
      <path d="M12 39.5 L9 32.5 L15 36.2" fill="none" stroke="#fca5a5" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M36 39.5 L39 32.5 L33 36.2" fill="none" stroke="#fca5a5" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
      <!-- Top Vajra Pommel -->
      <path d="M24 3.5 L28.5 8 L24 12.5 L19.5 8 Z" fill="#fde047" stroke="#f59e0b" stroke-width="1.2" />
      <circle cx="24" cy="8" r="1.8" fill="#ffffff" />
      <!-- Endless knot grip & ruby node -->
      <rect x="21.2" y="11.5" width="5.6" height="5.5" rx="2" fill="#d97706" stroke="#fef08a" stroke-width="1" />
      <circle cx="24" cy="14.2" r="2.4" fill="#ef4444" stroke="#fef08a" stroke-width="0.9" />
      <!-- Makara Cross-guard -->
      <path d="M11.5 16.5 Q18 20.5 24 20.5 Q30 20.5 36.5 16.5 L33.8 21.5 Q24 23.5 14.2 21.5 Z" fill="#fbbf24" stroke="#fef08a" stroke-width="1.2" stroke-linejoin="round" />
      <!-- Three-faceted triangular Phurba blade -->
      <path d="M18.2 21.5 L24 21.5 L24 40.5 Z" fill="#f8fafc" />
      <path d="M24 21.5 L29.8 21.5 L24 40.5 Z" fill="#94a3b8" />
      <path d="M18.2 21.5 L24 40.5 L29.8 21.5 Z" fill="none" stroke="#fef08a" stroke-width="1.2" stroke-linejoin="round" />
      <!-- Central blade ridge -->
      <line x1="24" y1="21.5" x2="24" y2="39.8" stroke="#fde047" stroke-width="1.3" />
      <!-- Tip impact spark -->
      <circle cx="24" cy="40" r="2.2" fill="#ffffff" />
    </svg>
  `,

  // 4. Vajra Bell (2) — Ringing Tibetan Ghanta hand-bell with sonic shockwaves
  vajraBell: `
    <svg class="skill-svg skill-svg--vajraBell" viewBox="0 0 48 48" aria-hidden="true">
      <!-- Left & Right Sonic Wave Arcs -->
      <path d="M11.5 19 A11.5 11.5 0 0 0 11.5 34" fill="none" stroke="#7dd3fc" stroke-width="2.4" stroke-linecap="round" />
      <path d="M6.5 15 A16.5 16.5 0 0 0 6.5 38" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" />
      <path d="M36.5 19 A11.5 11.5 0 0 1 36.5 34" fill="none" stroke="#7dd3fc" stroke-width="2.4" stroke-linecap="round" />
      <path d="M41.5 15 A16.5 16.5 0 0 1 41.5 38" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" />
      <!-- Tilted ringing bell group -->
      <g transform="rotate(-8 24 24)">
        <!-- Half-vajra top handle -->
        <path d="M24 4.5 L24 13.5" stroke="#fef08a" stroke-width="2.4" stroke-linecap="round" />
        <path d="M24 6 C19 6 19 12.5 24 13.5" fill="none" stroke="#fbbf24" stroke-width="1.6" />
        <path d="M24 6 C29 6 29 12.5 24 13.5" fill="none" stroke="#fbbf24" stroke-width="1.6" />
        <ellipse cx="24" cy="14.5" rx="3.8" ry="1.7" fill="#fde047" stroke="#b45309" stroke-width="0.9" />
        <!-- Bell dome & flared skirt -->
        <path d="M18.5 16 C17.5 22.5 15.5 28.5 12.5 33.5 L35.5 33.5 C32.5 28.5 30.5 22.5 29.5 16 C28 14.5 20 14.5 18.5 16 Z"
          fill="#f59e0b" stroke="#fef08a" stroke-width="1.4" stroke-linejoin="round" />
        <!-- Left highlight facet on bell dome -->
        <path d="M19.5 16.5 C18.8 22 17.2 27.5 14.8 32.5 L23 32.5 L23 15.8 Z" fill="#fde047" fill-opacity="0.45" />
        <!-- Decorative lotus waist band -->
        <path d="M16.2 27 Q24 29.2 31.8 27" fill="none" stroke="#fef9c3" stroke-width="1.5" />
        <!-- Flared bell rim -->
        <path d="M11.5 33.5 Q24 36 36.5 33.5" fill="none" stroke="#fef08a" stroke-width="2.8" stroke-linecap="round" />
        <!-- Glowing sonic clapper -->
        <circle cx="25" cy="37.2" r="3.2" fill="#e0f2fe" stroke="#38bdf8" stroke-width="1.6" />
      </g>
    </svg>
  `,

  // 5. Lotus Shield (3) — Emerald-Gold Ward Shield emblazoned with a blooming Pink Lotus
  lotusShield: `
    <svg class="skill-svg skill-svg--lotusShield" viewBox="0 0 48 48" aria-hidden="true">
      <!-- Outer Ward Shield Crest -->
      <path d="M24 4.5 L39.5 10.5 V22.5 C39.5 33 32.5 40.2 24 43.5 C15.5 40.2 8.5 33 8.5 22.5 V10.5 Z"
        fill="#065f46" fill-opacity="0.78" stroke="#6ee7b7" stroke-width="2.2" stroke-linejoin="round" />
      <!-- Shield glossy upper sheen -->
      <path d="M24 6 L37.5 11.2 V21.5 C31 23.5 17 23.5 10.5 21.5 V11.2 Z"
        fill="#34d399" fill-opacity="0.22" />
      <!-- Inner golden shield trim -->
      <path d="M24 7.8 L36.2 12.5 V22 C36.2 30.5 30.5 36.6 24 39.6 C17.5 36.6 11.8 30.5 11.8 22 V12.5 Z"
        fill="none" stroke="#fde68a" stroke-width="1.1" stroke-opacity="0.85" />
      <!-- Blooming Sacred Lotus in Center -->
      <!-- Outer petals -->
      <path d="M24 32 C15.5 32 12 26.8 13.2 21 C17 22.2 20.5 25.8 24 32 Z" fill="#f472b6" stroke="#fbcfe8" stroke-width="1" />
      <path d="M24 32 C32.5 32 36 26.8 34.8 21 C31 22.2 27.5 25.8 24 32 Z" fill="#f472b6" stroke="#fbcfe8" stroke-width="1" />
      <!-- Mid petals -->
      <path d="M24 32 C17.8 29.8 15.2 23 17.5 16.2 C20.8 18.8 22.6 24 24 32 Z" fill="#f9a8d4" stroke="#fce7f3" stroke-width="1" />
      <path d="M24 32 C30.2 29.8 32.8 23 30.5 16.2 C27.2 18.8 25.4 24 24 32 Z" fill="#f9a8d4" stroke="#fce7f3" stroke-width="1" />
      <!-- Center upright petal -->
      <path d="M24 32 C19.2 26.5 19.2 18.5 24 13 C28.8 18.5 28.8 26.5 24 32 Z" fill="#fdf2f8" stroke="#fde047" stroke-width="1.2" />
      <!-- Golden lotus base & glowing heart -->
      <path d="M16.5 32.2 Q24 35.8 31.5 32.2" fill="none" stroke="#fde047" stroke-width="2.2" stroke-linecap="round" />
      <circle cx="24" cy="24.5" r="2.4" fill="#fef08a" />
    </svg>
  `,

  // 6. Dharma Protector (4) — Wrathful Dharmapala Guardian Mask with Crown, Horns & 3 Wisdom Eyes
  protector: `
    <svg class="skill-svg skill-svg--protector" viewBox="0 0 48 48" aria-hidden="true">
      <!-- Ethereal violet-gold spirit flames -->
      <path d="M11 29 C7 20 10 10 16 6 C16 11 19.5 9.5 24 3.5 C28.5 9.5 32 11 32 6 C38 10 41 20 37 29 Z"
        fill="#a855f7" fill-opacity="0.34" stroke="#c084fc" stroke-width="1.4" stroke-linejoin="round" />
      <!-- Sweeping Golden Guardian Horns -->
      <path d="M15 18 C8.5 16 5.5 10.5 7.8 5.5 C10 10 13 13 17.5 15 Z" fill="#fde047" stroke="#f59e0b" stroke-width="1.1" />
      <path d="M33 18 C39.5 16 42.5 10.5 40.2 5.5 C38 10 35 13 30.5 15 Z" fill="#fde047" stroke="#f59e0b" stroke-width="1.1" />
      <!-- Five-Pointed Golden Crown -->
      <path d="M13.5 18.5 L14.8 11 L19.8 15.2 L24 9 L28.2 15.2 L33.2 11 L34.5 18.5 Z"
        fill="#fbbf24" stroke="#fef08a" stroke-width="1.2" stroke-linejoin="round" />
      <!-- Guardian Mask Visage -->
      <path d="M13 18.5 H35 L33.2 33.5 C31.2 38.8 27.8 41.5 24 41.5 C20.2 41.5 16.8 38.8 14.8 33.5 Z"
        fill="#3b1d5e" stroke="#fbbf24" stroke-width="1.6" stroke-linejoin="round" />
      <!-- Three Glowing Turquoise Wisdom Eyes -->
      <path d="M24 19.8 C25.8 21.8 25.8 24.4 24 26.4 C22.2 24.4 22.2 21.8 24 19.8 Z" fill="#2dd4bf" stroke="#ecfeff" stroke-width="1" />
      <path d="M15.2 25.5 Q18.5 23.2 21.5 26.8 Q18.5 29 15.2 25.5 Z" fill="#2dd4bf" stroke="#ecfeff" stroke-width="1" />
      <path d="M32.8 25.5 Q29.5 23.2 26.5 26.8 Q29.5 29 32.8 25.5 Z" fill="#2dd4bf" stroke="#ecfeff" stroke-width="1" />
      <!-- Wrathful Golden Jaw & White Fangs -->
      <path d="M16.8 33.5 Q24 37 31.2 33.5" fill="none" stroke="#fde047" stroke-width="1.8" stroke-linecap="round" />
      <path d="M17.8 33.5 L19.4 38.2 L21.2 34.4 Z" fill="#ffffff" />
      <path d="M30.2 33.5 L28.6 38.2 L26.8 34.4 Z" fill="#ffffff" />
    </svg>
  `,

  // 7. Vajra Guru Mantra (T) — Supreme 8-Spoked Golden Dharma Wheel on Lotus Pedestal
  vajraGuru: `
    <svg class="skill-svg skill-svg--vajraGuru" viewBox="0 0 48 48" aria-hidden="true">
      <!-- Rainbow body outer halo arcs -->
      <circle cx="24" cy="21.5" r="18.5" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="7 5" stroke-opacity="0.9" />
      <circle cx="24" cy="21.5" r="17" fill="#fbbf24" fill-opacity="0.16" stroke="#f472b6" stroke-width="1.2" stroke-dasharray="5 7" stroke-opacity="0.85" />
      <!-- 8-Spoked Golden Dharma Wheel (Dharmachakra) -->
      <g stroke="#fef08a" stroke-width="2.1" stroke-linecap="round">
        <line x1="24" y1="3.5" x2="24" y2="39.5" />
        <line x1="6" y1="21.5" x2="42" y2="21.5" />
        <line x1="11.3" y1="8.8" x2="36.7" y2="34.2" />
        <line x1="36.7" y1="8.8" x2="11.3" y2="34.2" />
      </g>
      <!-- Wheel Rim -->
      <circle cx="24" cy="21.5" r="13.8" fill="none" stroke="#f59e0b" stroke-width="3.4" />
      <circle cx="24" cy="21.5" r="13.8" fill="none" stroke="#fef08a" stroke-width="1.3" />
      <!-- Central Hub -->
      <circle cx="24" cy="21.5" r="5.2" fill="#fde047" stroke="#d97706" stroke-width="1.5" />
      <circle cx="24" cy="21.5" r="2.2" fill="#ffffff" />
      <!-- Golden Lotus Pedestal at base -->
      <path d="M12.5 40 Q24 45.5 35.5 40 Q30 37 24 38.2 Q18 37 12.5 40 Z" fill="#fbbf24" stroke="#fef08a" stroke-width="1.2" stroke-linejoin="round" />
    </svg>
  `,
};

// Alias mappings
SKILL_ICON_SVGS.lotusWard = SKILL_ICON_SVGS.lotusShield;
SKILL_ICON_SVGS.guruMantra = SKILL_ICON_SVGS.vajraGuru;

const PROTECTOR_ICON_SVGS = {
  // 1. Goddess Tenma — Six-pointed Glacial Hailstone Star & Celestial Ice Orb
  tenma: `
    <svg class="protector-svg protector-svg--tenma" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="15" fill="#38bdf8" fill-opacity="0.2" stroke="#7dd3fc" stroke-width="1.2" stroke-dasharray="4 3" />
      <g stroke="#e0f2fe" stroke-width="2.2" stroke-linecap="round">
        <line x1="20" y1="5" x2="20" y2="35" />
        <line x1="7" y1="12.5" x2="33" y2="27.5" />
        <line x1="33" y1="12.5" x2="7" y2="27.5" />
      </g>
      <polygon points="20,9 24.5,15.5 31,20 24.5,24.5 20,31 15.5,24.5 9,20 15.5,15.5" fill="#38bdf8" stroke="#ffffff" stroke-width="1.2" />
      <circle cx="20" cy="20" r="4.2" fill="#ffffff" />
    </svg>
  `,

  // 2. Sacred White Yak — Snow-white Yak head with sweeping Golden Horns
  whiteYak: `
    <svg class="protector-svg protector-svg--whiteYak" viewBox="0 0 40 40" aria-hidden="true">
      <!-- Sweeping Golden Horns -->
      <path d="M14 16 C7 15 4 9 7 4.5 C9.5 8.5 12 11.5 16 13 Z" fill="#fde047" stroke="#f59e0b" stroke-width="1.2" />
      <path d="M26 16 C33 15 36 9 33 4.5 C30.5 8.5 28 11.5 24 13 Z" fill="#fde047" stroke="#f59e0b" stroke-width="1.2" />
      <!-- White Yak Head & Shaggy Cheeks -->
      <path d="M12 14 H28 L30 25 L25 33 H15 L10 25 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.4" stroke-linejoin="round" />
      <!-- Forehead Sun Jewel -->
      <polygon points="20,15.5 22.2,18.5 20,21.5 17.8,18.5" fill="#f59e0b" stroke="#fef08a" stroke-width="0.9" />
      <!-- Eyes -->
      <circle cx="15" cy="22.5" r="1.6" fill="#0f172a" />
      <circle cx="25" cy="22.5" r="1.6" fill="#0f172a" />
      <!-- Snout & Golden Nose Ring -->
      <ellipse cx="20" cy="28.5" rx="5.2" ry="3.2" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1" />
      <circle cx="20" cy="32.5" r="2.6" fill="none" stroke="#fbbf24" stroke-width="1.8" />
    </svg>
  `,

  // 3. Dharmapala Pehar — Three-Crowned Guardian Helm & Blazing Golden Dharma Wheel
  pehar: `
    <svg class="protector-svg protector-svg--pehar" viewBox="0 0 40 40" aria-hidden="true">
      <!-- Blazing Orange-Gold Halo -->
      <circle cx="20" cy="21" r="15" fill="#f59e0b" fill-opacity="0.22" stroke="#f97316" stroke-width="1.4" stroke-dasharray="3.5 2.5" />
      <!-- Three-Headed Crown Spires -->
      <path d="M8 18 L10 9 L15 14 L20 6 L25 14 L30 9 L32 18 Z" fill="#fbbf24" stroke="#fef08a" stroke-width="1.2" stroke-linejoin="round" />
      <!-- Golden Dharma War-Wheel below crown -->
      <circle cx="20" cy="24.5" r="9.5" fill="#b45309" fill-opacity="0.6" stroke="#fef08a" stroke-width="2.2" />
      <g stroke="#fde047" stroke-width="1.6">
        <line x1="20" y1="15" x2="20" y2="34" />
        <line x1="10.5" y1="24.5" x2="29.5" y2="24.5" />
        <line x1="13.3" y1="17.8" x2="26.7" y2="31.2" />
        <line x1="26.7" y1="17.8" x2="13.3" y2="31.2" />
      </g>
      <circle cx="20" cy="24.5" r="3.2" fill="#ffffff" stroke="#f59e0b" stroke-width="1.2" />
    </svg>
  `,
};

export function getSkillIconSvg(skillId) {
  return SKILL_ICON_SVGS[skillId] || SKILL_ICON_SVGS.humBolt;
}

export function getProtectorIconSvg(protectorId) {
  return PROTECTOR_ICON_SVGS[protectorId] || PROTECTOR_ICON_SVGS.tenma;
}
