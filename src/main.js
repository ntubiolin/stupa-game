/** Mode launcher. The two runtimes never share live buses or serializers. */
import { i18n } from './i18n.js';
import './i18n/storyRuntime.js';
const mode = new URLSearchParams(location.search).get('mode');
if (mode === 'adventure') {
  await import('./adventure.js');
} else if (mode === 'story') {
  await import('./story/runtime.js');
} else {
  await import('./story/launcher.css');
  const root = document.getElementById('ui');
  root.innerHTML = `<section class="mirror-launcher"><div class="mirror-launcher-shade"></div><header><span>STUPA GAME</span><button id="launch-language">EN / 繁中</button></header><article><p class="mirror-eyebrow" data-key="mirror.menu.kicker"></p><h1 data-key="mirror.title"></h1><p class="mirror-english">THE PERSON IN THE MIRROR</p><p class="mirror-description" data-key="mirror.menu.description"></p><div class="mirror-modes"><a href="?mode=story" class="mirror-primary" data-key="mirror.menu.story"></a><a href="?mode=adventure" data-key="mirror.menu.adventure"></a></div><p class="mirror-meta" data-key="mirror.menu.meta"></p></article><footer><span data-key="mirror.menu.quote"></span><small data-key="mirror.mediaLabel"></small></footer></section>`;
  const translate = () => root.querySelectorAll('[data-key]').forEach(el => { el.textContent = i18n.t(el.dataset.key); });
  translate();
  root.querySelector('#launch-language').onclick = () => i18n.setLang(i18n.lang === 'en' ? 'zh' : 'en');
  i18n.onChange(translate);
}
