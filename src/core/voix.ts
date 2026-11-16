/**
 * Voix off : choix de la meilleure voix française de l'appareil et texte rendu prononçable
 * (abréviations, unités, chiffres). Sans dépendance : synthèse vocale du navigateur.
 */

/** Note une voix : les voix « naturelles » (neuronales) et françaises de France d'abord. */
export function noterVoix(v: { name: string; lang: string; localService?: boolean }): number {
  const lang = (v.lang || '').toLowerCase().replace('_', '-');
  if (!lang.startsWith('fr')) return -1;
  const n = v.name.toLowerCase();
  let s = lang === 'fr-fr' ? 10 : 6;
  if (/natural|neural|online/.test(n)) s += 8; // Edge, Windows 11 : voix neuronales
  if (/premium|enhanced|amélioré|amelioree|qualité supérieure/.test(n)) s += 7; // iPhone, Mac : voix téléchargées
  if (/google/.test(n)) s += 5; // Chrome Android et ordinateur
  if (/denise|vivienne|henri|remy|eloise|amélie|amelie|thomas|audrey|aurélie|marie|daniel/.test(n)) s += 2;
  if (/compact|espeak|robot/.test(n)) s -= 6;
  return s;
}

export function choisirVoix(voix: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  let meilleure: SpeechSynthesisVoice | null = null, note = -1;
  for (const v of voix) { const s = noterVoix(v); if (s > note) { note = s; meilleure = v; } }
  return meilleure;
}

const nombre = (x: string) => x.replace('.', ',');

/** Rend un texte de l'application prononçable par une synthèse vocale française. */
export function textePrononcable(t: string): string {
  return t
    .replace(/[®™]/g, '')
    .replace(/\bPA (\d{2,3})\/(\d{2,3}) mmHg/g, 'tension $1 sur $2')
    .replace(/(\d{2,3})\/(\d{2,3})(?= mmHg)/g, '$1 sur $2')
    .replace(/(\d{2,3})\/(\d{2,3})/g, '$1 sur $2')
    .replace(/\bmmHg\b/g, 'millimètres de mercure')
    .replace(/\bmmol\/L\b/g, 'millimoles par litre')
    .replace(/\bg\/L\b/g, 'grammes par litre')
    .replace(/\bL\/min\b/g, 'litres par minute')
    .replace(/\/min\b/g, ' par minute')
    .replace(/×\s?(\d+(?:\.\d+)?)/g, (_, x) => `multiplié par ${nombre(x)}`)
    .replace(/[−–]\s?(\d)/g, 'moins $1')
    .replace(/(\d+(?:[.,]\d+)?)\s?%/g, (_, x) => `${nombre(x)} pour cent`)
    .replace(/(\d)\.(\d)/g, '$1,$2')
    .replace(/\s*→\s*/g, ', puis ')
    .replace(/\bIEC\b/g, 'I.E.C.')
    .replace(/\bAOD\b/g, 'anticoagulant oral direct')
    .replace(/\bHTA\b/g, 'hypertension')
    .replace(/\bESH\b/g, 'E.S.H.')
    .replace(/\bECG\b/g, 'électrocardiogramme')
    .replace(/\biSGLT2\b/g, 'gliflozine')
    .replace(/\bVG\b/g, 'ventricule gauche')
    .replace(/\bFE\b/g, 'fraction d\'éjection')
    .replace(/\s*·\s*/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Lance `fn` après `ms` millisecondes, mais attend que la voix off ait fini sa phrase
 * (au plus 30 s de plus), pour qu'une étape ne coupe jamais la lecture. Renvoie l'annulation.
 */
export function apresDelaiEtVoix(ms: number, fn: () => void): () => void {
  let t: ReturnType<typeof setTimeout>;
  const parle = () => typeof speechSynthesis !== 'undefined' && (speechSynthesis.speaking || speechSynthesis.pending);
  const debut = Date.now();
  const verifier = () => {
    if (parle() && Date.now() - debut < ms + 30000) t = setTimeout(verifier, 250);
    else fn();
  };
  t = setTimeout(() => { if (parle()) verifier(); else fn(); }, ms);
  return () => clearTimeout(t);
}
