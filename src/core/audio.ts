/**
 * Bruits du cœur synthétisés (Web Audio) : B1, B2, souffles des valvulopathies,
 * B3 (surcharge de volume, FE basse) et B4 (ventricule rigide), écoutés « au stéthoscope ».
 */
import type { Instant } from './clock.ts';
import type { Etat } from './types.ts';

export interface Auscultation { b3: boolean; b4: boolean; souffles: string[] }

/** Ce qu'on entendrait : utilisé pour le son et pour l'affichage. */
export function ausculter(e: Etat): Auscultation {
  const t = e.terrain;
  const souffles: string[] = [];
  if (t.ra > 0.25) souffles.push('Souffle systolique éjectionnel (foyer aortique), irradiant vers le cou');
  if (t.im > 0.2) souffles.push('Souffle holosystolique en jet de vapeur (foyer mitral), irradiant vers l\'aisselle');
  if (t.ia > 0.2) souffles.push('Souffle diastolique doux et décroissant (bord gauche du sternum)');
  if (t.rm > 0.25) souffles.push('Roulement diastolique (foyer mitral)');
  if (t.it > 0.25) souffles.push('Souffle systolique au foyer tricuspide, augmenté à l\'inspiration');
  const b3 = t.im < 0.3 && (e.fe < 0.42 || e.pog >= 16);
  const b4 = t.rythme === 'sinus' && (t.hvg >= 0.4 || t.ra > 0.5 || t.ischemie > 0.2);
  return { b3, b4, souffles };
}

export class Son {
  private ctx: AudioContext | null = null;
  private sortie: GainNode | null = null;
  private bruit: AudioBuffer | null = null;
  private vol: GainNode | null = null;
  private lim: DynamicsCompressorNode | null = null;
  private dest: MediaStreamAudioDestinationNode | null = null;
  actif = false;
  volume = 1.2; // +50 % (les haut-parleurs de téléphone sont petits) ; un limiteur évite la saturation

  /** À appeler depuis un geste de l'utilisateur (exigence des navigateurs, iOS compris). */
  activer(): boolean {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC();
        const nav = navigator as Navigator & { audioSession?: { type: string } };
        if (nav.audioSession) nav.audioSession.type = 'playback';
        // Chaîne « stéthoscope » : coupe les basses parasites et les aigus, compresse doucement.
        const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 22;
        const pk = this.ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 110; pk.gain.value = 4; pk.Q.value = 0.8;
        const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
        const comp = this.ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
        const vol = this.ctx.createGain(); vol.gain.value = this.volume; this.vol = vol;
        // Limiteur final : le volume plus fort ne sature pas, même avec plusieurs souffles à la fois.
        const lim = this.ctx.createDynamicsCompressor(); lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.12;
        hp.connect(pk).connect(lp).connect(comp).connect(vol).connect(lim).connect(this.ctx.destination);
        this.lim = lim;
        this.sortie = this.ctx.createGain();
        this.sortie.connect(hp);
        const n = this.ctx.sampleRate;
        this.bruit = this.ctx.createBuffer(1, n, n);
        const d = this.bruit.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        // Déverrouillage iOS : un son silencieux joué pendant le geste.
        const s = this.ctx.createBufferSource(); s.buffer = this.ctx.createBuffer(1, 1, 22050); s.connect(this.ctx.destination); s.start();
      }
      void this.ctx.resume();
      this.actif = true;
      return true;
    } catch {
      return false;
    }
  }
  couper() { this.actif = false; }

  /** Flux audio pour l'enregistrement vidéo (null si le son n'est pas activé). */
  flux(): MediaStream | null {
    if (!this.ctx || !this.vol || !this.actif) return null;
    if (!this.dest) { this.dest = this.ctx.createMediaStreamDestination(); (this.lim ?? this.vol).connect(this.dest); }
    return this.dest.stream;
  }

  private choc(t0: number, freqs: number[], duree: number, gain: number) {
    const c = this.ctx!;
    for (const [k, f] of freqs.entries()) {
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(f * 1.15, t0); o.frequency.exponentialRampToValueAtTime(f, t0 + duree * 0.4);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain / (k + 1), t0 + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + duree);
      o.connect(g).connect(this.sortie!); o.start(t0); o.stop(t0 + duree + 0.02);
    }
  }

  private souffle(t0: number, duree: number, f: number, q: number, gain: number, forme: 'losange' | 'plateau' | 'decroissant', rugueux = false) {
    const c = this.ctx!;
    const src = c.createBufferSource(); src.buffer = this.bruit; src.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
    const g = c.createGain();
    const a = gain * 1.4; // souffles +40 % pour qu'on les distingue bien des bruits B1 et B2
    g.gain.setValueAtTime(0.0001, t0);
    if (forme === 'losange') { g.gain.linearRampToValueAtTime(a, t0 + duree * 0.45); g.gain.linearRampToValueAtTime(0.0001, t0 + duree); }
    else if (forme === 'plateau') { g.gain.linearRampToValueAtTime(a, t0 + 0.03); g.gain.setValueAtTime(a, t0 + duree - 0.03); g.gain.linearRampToValueAtTime(0.0001, t0 + duree); }
    else { g.gain.linearRampToValueAtTime(a, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + duree); }
    let chaine: AudioNode = src.connect(bp).connect(g);
    if (rugueux) {
      const am = c.createGain(); am.gain.value = 0.6;
      const lfo = c.createOscillator(); lfo.type = 'sawtooth'; lfo.frequency.value = 42;
      const prof = c.createGain(); prof.gain.value = 0.4; lfo.connect(prof).connect(am.gain);
      lfo.start(t0); lfo.stop(t0 + duree + 0.05);
      chaine = chaine.connect(am);
    }
    chaine.connect(this.sortie!);
    src.start(t0, Math.random()); src.stop(t0 + duree + 0.05);
  }

  /** Appelé à chaque image : déclenche les bruits au bon moment du cycle. */
  tick(i: Instant, e: Etat | null) {
    if (!this.actif || !this.ctx || !e || this.ctx.state !== 'running') return;
    const t = e.terrain;
    const now = this.ctx.currentTime + 0.01;
    const periode = 60 / Math.max(30, e.fc);
    const systole = periode * 0.3 / Math.max(0.6, Math.min(1.2, e.fc / 70) ** 0.5);
    if (i.b1) {
      const fort = t.rm > 0.3 ? 1.5 : 1;
      this.choc(now, [48, 92, 140], 0.11, 0.55 * fort);
      if (t.ra > 0.25) this.souffle(now + 0.05, systole * 0.85, 260, 1.4, 0.16 * t.ra, 'losange', true);
      if (t.im > 0.2) this.souffle(now + 0.01, systole, 380, 1.1, 0.12 * t.im, 'plateau');
      if (t.it > 0.25) this.souffle(now + 0.01, systole, 300, 1.2, 0.07 * t.it, 'plateau');
      const aus = ausculter(e);
      if (aus.b4) this.choc(now - 0.09, [28, 44], 0.07, 0.25);
    }
    if (i.b2) {
      const amorti = t.ra > 0.6 ? 0.45 : 1;
      this.choc(now, [70, 130, 190], 0.08, 0.42 * amorti);
      const diast = periode - systole - 0.05;
      if (t.ia > 0.2) this.souffle(now + 0.01, Math.min(diast * 0.75, 0.5), 520, 1.5, 0.08 * t.ia, 'decroissant');
      if (t.rm > 0.25) this.souffle(now + 0.1, Math.max(0.12, diast * 0.7), 70, 2.2, 0.22 * t.rm, 'plateau', true);
      if (ausculter(e).b3) this.choc(now + 0.14, [26, 40], 0.08, 0.3);
    }
  }
}
