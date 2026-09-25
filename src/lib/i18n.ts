import { File, Paths } from 'expo-file-system';
import { useLocales } from 'expo-localization';
import { useState } from 'react';
import { Platform } from 'react-native';

import type { ProblemCode } from './audio';

export type AppLocale = 'en' | 'zh-HK' | 'zh-Hans';

export type Copy = {
  appName: string;
  dinosaur: string;
  tiger: string;
  lion: string;
  record: string;
  mySound: string;
  rerecord: string;
  stop: string;
  recording: string;
  info: string;
  close: string;
  infoBody: readonly string[];
  problem: Record<ProblemCode, string>;
};

const table: Record<AppLocale, Copy> = {
  en: {
    appName: 'Bark Off',
    dinosaur: 'DINOSAUR',
    tiger: 'TIGER',
    lion: 'LION',
    record: 'RECORD',
    mySound: 'MY SOUND',
    rerecord: 'RE-RECORD',
    stop: 'STOP',
    recording: 'Recording. Tap to stop',
    info: 'Info',
    close: 'Close',
    infoBody: [
      '🦖 Bark Off is a dinosaur in your pocket. A dog comes at you, it loops a loud sound and invites the dog to rethink its choices.',
      'Tap 🦕 Dinosaur, 🐯 Tiger, or 🦁 Lion. Or record your own 🎤, if you can out-roar a dinosaur. Volume all the way up 🔊, phone speaker on. It still plays when the ringer is off. The dog does not get a mute button.',
      'Call 999 ☎️ if you are in danger. This app can shout. It cannot save you.',
      'This has not been scientifically proven. If a dog still attacks you, we take no responsibility.',
    ],
    problem: {
      play: 'Could not play this sound',
      prepare: 'Could not prepare sound',
      microphone: 'Allow the microphone to record',
      startRecording: 'Could not start recording',
      saveRecording: 'Could not save the recording',
      playRecording: 'Could not play the recording',
    },
  },
  'zh-HK': {
    appName: '唔好吠',
    dinosaur: '恐龍',
    tiger: '老虎',
    lion: '獅子',
    record: '錄音',
    mySound: '我段聲',
    rerecord: '再錄',
    stop: '停',
    recording: '錄音緊，再撳一下停',
    info: '說明',
    close: '關閉',
    infoBody: [
      '🦖「唔好吠」係你袋入面隻恐龍。有狗衝埋嚟，佢會循環播一段大聲，等隻狗自己反省下。',
      '撳 🦕「恐龍」、🐯「老虎」或者 🦁「獅子」。覺得自己更勁，就錄一段自己嘅聲 🎤。音量開到最大 🔊，用手機喇叭。靜音都照播，隻狗冇得靜音。',
      '有危險就打999 ☎️。呢個app識得嘈，唔識救人。',
      '呢個做法未經科學證實。如果隻狗仍然襲擊你，我哋唔會承擔任何責任。',
    ],
    problem: {
      play: '播唔到呢個聲',
      prepare: '準備唔到個聲',
      microphone: '要准許個咪先錄到',
      startRecording: '開始唔到錄音',
      saveRecording: '儲存唔到段錄音',
      playRecording: '播唔到段錄音',
    },
  },
  'zh-Hans': {
    appName: '不要吠',
    dinosaur: '恐龙',
    tiger: '老虎',
    lion: '狮子',
    record: '录音',
    mySound: '我的声音',
    rerecord: '重录',
    stop: '停止',
    recording: '正在录音，再点一下停止',
    info: '说明',
    close: '关闭',
    infoBody: [
      '🦖「不要吠」是你口袋里的一只恐龙。有狗冲过来，它会循环播放一段很响的声音，请狗自己反省一下。',
      '点 🦕「恐龙」、🐯「老虎」或 🦁「狮子」。觉得自己更厉害，就录一段自己的声音 🎤。把音量开到最大 🔊，用手机外放。静音时也会播放，狗没有静音键。',
      '有危险就打999 ☎️。这个只会吵，不会救人。',
      '这个做法未经科学证实。如果狗仍然袭击你，我们不承担任何责任。',
    ],
    problem: {
      play: '播放不了这个声音',
      prepare: '准备不了声音',
      microphone: '请允许使用麦克风录音',
      startRecording: '无法开始录音',
      saveRecording: '无法保存录音',
      playRecording: '无法播放录音',
    },
  },
};

export function localeFromTag(tag: string | undefined): AppLocale {
  const value = tag?.toLowerCase() ?? '';
  if (
    value.startsWith('zh-hans') ||
    value === 'zh-cn' ||
    value.startsWith('zh-cn-') ||
    value === 'zh-sg' ||
    value.startsWith('zh-sg-')
  ) {
    return 'zh-Hans';
  }
  if (
    value === 'zh-hk' ||
    value.startsWith('zh-hk-') ||
    value.startsWith('zh-hant') ||
    value === 'zh-tw' ||
    value.startsWith('zh-tw-')
  ) {
    return 'zh-HK';
  }
  return 'en';
}

const storageKey = 'bark-off-language';

function isLocale(value: string | null | undefined): value is AppLocale {
  return value === 'en' || value === 'zh-HK' || value === 'zh-Hans';
}

function readChoice(): AppLocale | null {
  try {
    if (Platform.OS === 'web') {
      const saved = localStorage.getItem(storageKey);
      return isLocale(saved) ? saved : null;
    }
    const file = new File(Paths.document, 'language.txt');
    if (!file.exists) return null;
    const saved = file.textSync().trim();
    return isLocale(saved) ? saved : null;
  } catch {
    return null;
  }
}

function writeChoice(choice: AppLocale) {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(storageKey, choice);
      return;
    }
    const directory = Paths.document;
    if (!directory.exists) directory.create();
    const file = new File(directory, 'language.txt');
    if (file.exists) file.delete();
    file.create();
    file.write(choice);
  } catch {
    // The tap still changes the language for this visit.
  }
}

export function useLanguage() {
  const [system] = useLocales();
  const [choice, setChoice] = useState<AppLocale | null>(readChoice);
  const locale = choice ?? localeFromTag(system?.languageTag);

  function chooseLanguage(next: AppLocale) {
    setChoice(next);
    writeChoice(next);
  }

  return { copy: table[locale], locale, chooseLanguage };
}
