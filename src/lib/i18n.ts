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
