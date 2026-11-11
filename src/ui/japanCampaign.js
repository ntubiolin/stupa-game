import { Vector3 } from 'three';

export function createJapanCampaignTracker(ctx) {
  const mount = document.getElementById('play-hud');
  if (!mount) return () => {};
  const panel = document.createElement('aside');
  panel.id = 'japan-campaign-tracker';
  panel.className = 'quest-tracker glass-panel';
  panel.hidden = true;
  const heading = document.createElement('strong');
  heading.className = 'japan-campaign-title';
  const detail = document.createElement('div');
  detail.className = 'japan-campaign-detail';
  detail.setAttribute('aria-live', 'polite');
  const navigation = document.createElement('span');
  navigation.className = 'japan-campaign-navigation';
  const arrow = document.createElement('span');
  arrow.className = 'japan-campaign-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '↑';
  const distance = document.createElement('span');
  navigation.append(arrow, distance);
  panel.append(heading, detail, navigation);
  mount.append(panel);
  const forward = new Vector3();

  return function render({ chapter, detailKey, detailParams, target, progress }) {
    panel.hidden = !chapter;
    if (panel.hidden) return;
    const { camera, i18n, state } = ctx;
    panel.setAttribute('aria-label', i18n.t('japan.campaign.title'));
    const title = `${i18n.t(chapter.titleKey)} · ${progress}/${chapter.steps.length}`;
    if (heading.textContent !== title) heading.textContent = title;
    const hint = i18n.t(detailKey, detailParams);
    if (detail.textContent !== hint) detail.textContent = hint;
    navigation.hidden = !target;
    if (!target) return;
    const dx = target.x - state.player.position.x;
    const dz = target.z - state.player.position.z;
    const meters = Math.round(Math.hypot(dx, dz));
    distance.textContent = i18n.t('japan.campaign.distance', { distance: meters });
    if (camera && meters > 0) {
      camera.getWorldDirection(forward);
      const angle = Math.atan2(dx, -dz) - Math.atan2(forward.x, -forward.z);
      arrow.style.transform = `rotate(${angle}rad)`;
    }
  };
}
