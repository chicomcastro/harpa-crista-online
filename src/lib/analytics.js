import * as amplitude from '@amplitude/analytics-browser';
import { browser } from '$app/environment';

const API_KEY = 'b5c164d237348f74c9f2822da40cc1ac';
let initialized = false;

export function initAnalytics() {
  if (!browser || initialized) return;
  let userId = localStorage.getItem('hc_user_id');
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('hc_user_id', userId);
  }
  amplitude.init(API_KEY, userId, { autocapture: true });
  initialized = true;
}

export function track(event, props) {
  if (!browser) return;
  amplitude.track(event, props);
}

// Entrada vinda de fora com origem marcada no link: `?yt=<nº>-<instrumento>` nas descrições do canal
// Harpa Cristã Partituras, ou utm_* em geral. O autocapture do Amplitude só guarda o referrer, que
// no YouTube vem como youtube.com sem dizer qual vídeo.
export function trackExternalEntry() {
  if (!browser) return;
  const q = new URLSearchParams(location.search);
  const video = q.get('yt');
  const source = video ? 'youtube' : q.get('utm_source');
  if (!source) return;
  track('external_entry', {
    source,
    video: video || undefined,
    medium: q.get('utm_medium') || (video ? 'video_description' : undefined),
    campaign: q.get('utm_campaign') || undefined,
    path: location.pathname
  });
  // Tira a marcação da URL para não contar de novo num recarregar ou num link compartilhado.
  ['yt', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(k => q.delete(k));
  const resto = q.toString();
  history.replaceState(history.state, '', location.pathname + (resto ? `?${resto}` : '') + location.hash);
}
