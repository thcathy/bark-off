import {
  RecordingPresets,
  preload,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  type AudioPlayer,
} from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

export const clips = {
  dinosaur: require('../../assets/sounds/dinosaur.m4a'),
  tiger: require('../../assets/sounds/tiger.m4a'),
  lion: require('../../assets/sounds/lion.m4a'),
} as const;

export const animals = ['dinosaur', 'tiger', 'lion'] as const;
export type AnimalId = (typeof animals)[number];
export type TileId = AnimalId | 'mine';

export const problemCodes = [
  'play',
  'prepare',
  'microphone',
  'startRecording',
  'saveRecording',
  'playRecording',
] as const;
export type ProblemCode = (typeof problemCodes)[number];

export type Problem = {
  tile: TileId | null;
  code: ProblemCode;
};

const tileIds: TileId[] = ['dinosaur', 'tiger', 'lion', 'mine'];

const playbackMode = {
  playsInSilentMode: true,
  interruptionMode: 'doNotMix' as const,
  shouldRouteThroughEarpiece: false,
  allowsRecording: false,
};

const recordingMode = {
  ...playbackMode,
  allowsRecording: true,
};

function extensionFrom(uri: string): string {
  const match = uri.split('?')[0]?.match(/\.([a-z0-9]+)$/i);
  if (match?.[1]) return `.${match[1].toLowerCase()}`;
  return Platform.OS === 'web' ? '.webm' : '.m4a';
}

function documents() {
  const directory = Paths.document;
  if (!directory.exists) directory.create();
  return directory;
}

export function findMineUri(): string | null {
  if (Platform.OS === 'web') return null;
  try {
    for (const entry of documents().list()) {
      if (entry instanceof File && entry.name.startsWith('mine.') && entry.exists) {
        return entry.uri;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function encodeWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const samples = buffer.length;
  const blockAlign = channels * 2;
  const dataSize = samples * blockAlign;
  const bytes = new ArrayBuffer(44 + dataSize);
  const view = new DataView(bytes);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, dataSize, true);
  const channelData = Array.from({ length: channels }, (_, index) => buffer.getChannelData(index));
  let offset = 44;
  for (let i = 0; i < samples; i += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][i] ?? 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([bytes], { type: 'audio/wav' });
}

async function loopableRecording(uri: string): Promise<string> {
  if (Platform.OS !== 'web') return uri;
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await (await fetch(uri)).arrayBuffer());
    const loopable = URL.createObjectURL(encodeWav(decoded));
    if (uri.startsWith('blob:')) URL.revokeObjectURL(uri);
    return loopable;
  } catch {
    return uri;
  } finally {
    await context.close();
  }
}

export async function persistMine(sourceUri: string): Promise<string> {
  if (Platform.OS === 'web') return loopableRecording(sourceUri);
  try {
    const dest = new File(documents(), `mine${extensionFrom(sourceUri)}`);
    if (dest.exists) dest.delete();
    if (sourceUri.startsWith('blob:') || sourceUri.startsWith('data:')) {
      const bytes = new Uint8Array(await (await fetch(sourceUri)).arrayBuffer());
      dest.create();
      dest.write(bytes);
    } else {
      await new File(sourceUri).copy(dest);
    }
    for (const entry of documents().list()) {
      if (entry instanceof File && entry.name.startsWith('mine.') && entry.uri !== dest.uri) {
        entry.delete();
      }
    }
    return dest.uri;
  } catch {
    return sourceUri;
  }
}

export function useScareBoard() {
  const dinosaur = useAudioPlayer(clips.dinosaur);
  const tiger = useAudioPlayer(clips.tiger);
  const lion = useAudioPlayer(clips.lion);
  const mine = useAudioPlayer(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const playersRef = useRef<Record<TileId, AudioPlayer>>({ dinosaur, tiger, lion, mine });
  playersRef.current = { dinosaur, tiger, lion, mine };

  const [active, setActive] = useState<TileId | null>(null);
  const [recording, setRecording] = useState(false);
  const [mineUri, setMineUri] = useState<string | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const activeRef = useRef<TileId | null>(null);
  const mineRestarting = useRef(false);
  const recordingRef = useRef(false);
  const recordingLock = useRef(false);

  function setActiveTile(id: TileId | null) {
    activeRef.current = id;
    setActive(id);
  }

  function stop(player: AudioPlayer) {
    player.loop = false;
    player.pause();
    void player.seekTo(0);
  }

  function stopAll() {
    for (const id of tileIds) stop(playersRef.current[id]);
  }

  function fail(tile: TileId) {
    if (activeRef.current !== tile) return;
    stop(playersRef.current[tile]);
    setActiveTile(null);
    setProblem({ tile, code: 'play' });
  }

  function start(tile: TileId) {
    const player = playersRef.current[tile];
    if (activeRef.current === tile) {
      stop(player);
      setActiveTile(null);
      setProblem(null);
      return;
    }
    stopAll();
    setProblem(null);
    // A recording's built-in loop stops after a few passes. Replay that one from the start.
    player.loop = tile !== 'mine';
    setActiveTile(tile);
    void player.seekTo(0);
    try {
      player.play();
    } catch {
      fail(tile);
    }
  }

  useEffect(() => {
    const subscriptions = tileIds.map((id) =>
      playersRef.current[id].addListener('playbackStatusUpdate', (status) => {
        if (
          status.didJustFinish &&
          id === 'mine' &&
          activeRef.current === 'mine' &&
          !playersRef.current.mine.loop &&
          !mineRestarting.current
        ) {
          mineRestarting.current = true;
          void (async () => {
            try {
              const player = playersRef.current.mine;
              player.loop = false;
              await player.seekTo(0);
              if (activeRef.current !== 'mine') return;
              player.play();
            } catch {
              fail('mine');
            } finally {
              mineRestarting.current = false;
            }
          })();
          return;
        }
        if (status.error) fail(id);
      }),
    );
    return () => {
      for (const subscription of subscriptions) subscription.remove();
    };
  }, [dinosaur, tiger, lion, mine]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await setAudioModeAsync(playbackMode);
        await Promise.all([preload(clips.dinosaur), preload(clips.tiger), preload(clips.lion)]);
        const saved = findMineUri();
        if (cancelled || !saved) return;
        setMineUri(saved);
        mine.replace(saved);
      } catch {
        if (!cancelled) {
          setProblem({ tile: null, code: 'prepare' });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mine]);

  useEffect(() => {
    return () => {
      dinosaur.pause();
      tiger.pause();
      lion.pause();
      mine.pause();
    };
  }, [dinosaur, tiger, lion, mine]);

  async function beginRecording() {
    if (recordingRef.current || recordingLock.current) return;
    recordingLock.current = true;
    stopAll();
    setActiveTile(null);
    setProblem(null);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setProblem({ tile: 'mine', code: 'microphone' });
        return;
      }
      await setAudioModeAsync(recordingMode);
      await recorder.prepareToRecordAsync();
      recorder.record();
      recordingRef.current = true;
      setRecording(true);
    } catch {
      recordingRef.current = false;
      setRecording(false);
      setProblem({ tile: 'mine', code: 'startRecording' });
      try {
        await setAudioModeAsync(playbackMode);
      } catch {
        setProblem({ tile: 'mine', code: 'startRecording' });
      }
    } finally {
      recordingLock.current = recordingRef.current;
    }
  }

  async function finishRecording() {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('Could not save the recording');
      const saved = await persistMine(uri);
      setMineUri(saved);
      mine.replace(saved);
    } catch {
      setProblem({ tile: 'mine', code: 'saveRecording' });
    } finally {
      recordingRef.current = false;
      recordingLock.current = false;
      setRecording(false);
      try {
        await setAudioModeAsync(playbackMode);
      } catch {
        setProblem({ tile: 'mine', code: 'playRecording' });
      }
    }
  }

  function toggleAnimal(id: AnimalId) {
    if (recordingRef.current) return;
    start(id);
  }

  function pressMine() {
    if (recordingRef.current) {
      void finishRecording();
      return;
    }
    if (!mineUri) {
      void beginRecording();
      return;
    }
    start('mine');
  }

  function rerecord() {
    if (recordingRef.current) return;
    void beginRecording();
  }

  return {
    active,
    recording,
    hasMine: mineUri != null,
    problem,
    toggleAnimal,
    pressMine,
    rerecord,
  };
}
