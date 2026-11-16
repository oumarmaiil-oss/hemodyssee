import { test } from 'node:test';
import assert from 'node:assert/strict';
import { choisirVoix, noterVoix, textePrononcable } from './voix.ts';

test('voix off : unités, chiffres et abréviations prononçables', () => {
  assert.equal(textePrononcable('PA 152/100 mmHg sous amlodipine'), 'tension 152 sur 100 sous amlodipine');
  assert.equal(textePrononcable('Post-charge ×1.32 → ×1.24.'), 'Post-charge multiplié par 1,32, puis multiplié par 1,24.');
  assert.equal(textePrononcable('Risque d\'AVC −52 %'), 'Risque d\'AVC moins 52 pour cent');
  assert.equal(textePrononcable('LDL 4.1 mmol/L (1.59 g/L)'), 'LDL 4,1 millimoles par litre (1,59 grammes par litre)');
  assert.equal(textePrononcable('Amloperin® : IEC + amlodipine'), 'Amloperin : I.E.C. + amlodipine');
  assert.equal(textePrononcable('Pouls 110/min'), 'Pouls 110 par minute');
});

test('voix off : préfère une voix française naturelle', () => {
  const v = (name: string, lang: string) => ({ name, lang, localService: true, default: false, voiceURI: name }) as SpeechSynthesisVoice;
  const liste = [v('Samantha', 'en-US'), v('Thomas', 'fr-FR'), v('Microsoft Denise Online (Natural) - French (France)', 'fr-FR'), v('Amélie', 'fr-CA')];
  assert.equal(choisirVoix(liste)?.name, 'Microsoft Denise Online (Natural) - French (France)');
  assert.ok(noterVoix(v('Samantha', 'en-US')) < 0);
  assert.equal(choisirVoix([v('Samantha', 'en-US')]), null);
});
