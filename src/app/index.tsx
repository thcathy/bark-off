import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useScareBoard, type AnimalId, type Problem, type TileId } from '../lib/audio';
import { useLanguage, type AppLocale, type Copy } from '../lib/i18n';

const mineColor = '#3A6BFF';
const recordColor = '#E4374B';
const skyGradient = ['#F7FCFF', '#9AD7F8', '#4EA4E6'] as const;
const mineGradient = ['#8EBEFF', '#3A6BFF', '#243FBE'] as const;
const recordGradient = ['#FF8B96', '#E4374B', '#B41D36'] as const;
const ink = '#17324A';

const art = {
  dinosaur: require('../../assets/animals/dinosaur.png'),
  tiger: require('../../assets/animals/tiger.png'),
  lion: require('../../assets/animals/lion.png'),
} as const;

const fill = {
  dinosaur: '#2F9E5A',
  tiger: '#F08A2A',
  lion: '#E2A317',
} as const;

const gap = 12;
const pad = 12;

export default function HomeScreen() {
  const board = useScareBoard();
  const { copy, locale, chooseLanguage } = useLanguage();
  const [box, setBox] = useState({ width: 0, height: 0 });
  const side = tileSide(box.width, box.height);

  useEffect(() => {
    if (Platform.OS === 'web') document.title = copy.appName;
  }, [copy.appName]);

  return (
    <LinearGradient colors={skyGradient} style={styles.screen}>
      <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ title: copy.appName }} />
      <View style={styles.header}>
        <Image source={require('../../assets/icon.png')} style={styles.mark} />
        <Text style={styles.title}>{copy.appName}</Text>
      </View>
      <View
        style={styles.grid}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setBox((current) =>
            current.width === width && current.height === height ? current : { width, height },
          );
        }}
      >
        {side > 0 ? (
          <View style={[styles.board, { width: side * 2 + gap, gap }]}>
            <View style={[styles.row, { gap }]}>
              <AnimalTile
                id="dinosaur"
                label={copy.dinosaur}
                side={side}
                playing={board.active === 'dinosaur'}
                message={messageFor(board.problem, 'dinosaur', copy)}
                onPress={() => board.toggleAnimal('dinosaur')}
              />
              <AnimalTile
                id="tiger"
                label={copy.tiger}
                side={side}
                playing={board.active === 'tiger'}
                message={messageFor(board.problem, 'tiger', copy)}
                onPress={() => board.toggleAnimal('tiger')}
              />
            </View>
            <View style={[styles.row, { gap }]}>
              <AnimalTile
                id="lion"
                label={copy.lion}
                side={side}
                playing={board.active === 'lion'}
                message={messageFor(board.problem, 'lion', copy)}
                onPress={() => board.toggleAnimal('lion')}
              />
              <MineTile
                copy={copy}
                side={side}
                playing={board.active === 'mine'}
                recording={board.recording}
                hasMine={board.hasMine}
                message={messageFor(board.problem, 'mine', copy)}
                onPress={board.pressMine}
                onRerecord={board.rerecord}
              />
            </View>
          </View>
        ) : null}
      </View>
      {board.problem?.tile == null && board.problem ? (
        <Text style={styles.banner}>{copy.problem[board.problem.code]}</Text>
      ) : null}
      <LanguageSwitch locale={locale} onChoose={chooseLanguage} />
      <Text style={styles.credit}>© 2026 Timmy Wong</Text>
      </SafeAreaView>
    </LinearGradient>
  );
}

const languages = [
  { id: 'en', label: 'EN', name: 'English' },
  { id: 'zh-HK', label: '繁', name: '繁體中文' },
  { id: 'zh-Hans', label: '简', name: '简体中文' },
] as const satisfies ReadonlyArray<{ id: AppLocale; label: string; name: string }>;

function LanguageSwitch({
  locale,
  onChoose,
}: {
  locale: AppLocale;
  onChoose: (locale: AppLocale) => void;
}) {
  return (
    <View style={styles.languages}>
      {languages.map((language) => {
        const selected = locale === language.id;
        return (
          <Pressable
            key={language.id}
            accessibilityRole="button"
            accessibilityLabel={language.name}
            accessibilityState={{ selected }}
            onPress={() => onChoose(language.id)}
            style={[styles.language, selected && styles.languageOn]}
          >
            <Text style={[styles.languageText, selected && styles.languageTextOn]}>{language.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function tileSide(width: number, height: number) {
  const innerW = Math.max(0, width - pad * 2);
  const innerH = Math.max(0, height - pad * 2);
  return Math.floor(Math.min((innerW - gap) / 2, (innerH - gap) / 2));
}

function messageFor(problem: Problem | null, tile: TileId, copy: Copy) {
  return problem?.tile === tile ? copy.problem[problem.code] : null;
}

function AnimalTile({
  id,
  label,
  side,
  playing,
  message,
  onPress,
}: {
  id: AnimalId;
  label: string;
  side: number;
  playing: boolean;
  message: string | null;
  onPress: () => void;
}) {
  return (
    <View style={[styles.tile, tileFrame(side, playing), { backgroundColor: fill[id] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: playing }}
        onPress={onPress}
        style={({ pressed }) => [styles.fill, pressed && !playing ? styles.pressed : null]}
      >
        <Image source={art[id]} style={styles.art} />
        <Text style={[styles.label, styles.lightLabel, { fontSize: labelSize(side) }]}>{label}</Text>
        {message ? <ErrorLine text={message} /> : null}
      </Pressable>
    </View>
  );
}

function MineTile({
  copy,
  side,
  playing,
  recording,
  hasMine,
  message,
  onPress,
  onRerecord,
}: {
  copy: Copy;
  side: number;
  playing: boolean;
  recording: boolean;
  hasMine: boolean;
  message: string | null;
  onPress: () => void;
  onRerecord: () => void;
}) {
  const label = hasMine ? copy.mySound : copy.record;
  const saved = hasMine && !recording;

  if (recording) {
    return (
      <LinearGradient
        colors={recordGradient}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.tile, tileFrame(side, true)]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.recording}
          accessibilityState={{ selected: true }}
          onPress={onPress}
          style={styles.fill}
        >
          <RecordingFace side={side} stop={copy.stop} />
          {message ? <ErrorLine text={message} /> : null}
        </Pressable>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={mineGradient}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.tile, tileFrame(side, playing)]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={saved ? copy.mySound : label}
        accessibilityState={{ selected: playing || recording }}
        onPress={onPress}
        style={({ pressed }) => [styles.fill, pressed && !playing ? styles.pressed : null]}
      >
        <View style={styles.mineArt}>
          {saved ? <PlayDisc side={side} playing={playing} /> : <Mic size={side * 0.34} color="#FFFFFF" />}
        </View>
        <Text style={[styles.label, styles.lightLabel, { fontSize: labelSize(side) }]}>{label}</Text>
        {message ? <ErrorLine text={message} /> : null}
      </Pressable>
      {saved ? (
        <View style={[styles.chipSlot, { top: side * 0.09 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.rerecord}
            onPress={onRerecord}
            style={styles.chip}
          >
            <Mic size={15} color={mineColor} />
            <Text style={styles.chipText}>{copy.rerecord}</Text>
          </Pressable>
        </View>
      ) : null}
    </LinearGradient>
  );
}

function RecordingFace({ side, stop }: { side: number; stop: string }) {
  const seconds = useElapsed(true);
  const ringSize = side * 0.62;
  const first = usePulse(0);
  const second = usePulse(700);

  return (
    <View style={styles.recordingFace}>
      <View style={[styles.chipSlot, { top: side * 0.09 }]}>
        <View style={styles.chip}>
          <View style={styles.stopSquare} />
          <Text style={styles.stopText}>{stop}</Text>
        </View>
      </View>
      <View style={[styles.recordingCenter, { width: ringSize, height: ringSize }]}>
        <PulseRing progress={first} size={ringSize} />
        <PulseRing progress={second} size={ringSize} />
        <Mic size={side * 0.26} color="#FFFFFF" />
      </View>
      <Text style={[styles.timer, { fontSize: labelSize(side) }]}>{formatClock(seconds)}</Text>
    </View>
  );
}

function PulseRing({ progress, size }: { progress: Animated.Value; size: number }) {
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });
  const opacity = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.7, 0] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 3,
        borderColor: '#FFFFFF',
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

function usePulse(delay: number) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(progress, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, progress]);

  return progress;
}

function useElapsed(active: boolean) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) return;
    const started = Date.now();
    const id = setInterval(() => {
      setSeconds(Math.floor((Date.now() - started) / 1000));
    }, 200);
    return () => clearInterval(id);
  }, [active]);

  return seconds;
}

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

function ErrorLine({ text }: { text: string }) {
  return (
    <View style={styles.error}>
      <Text style={styles.errorText}>{text}</Text>
    </View>
  );
}

function Mic({ size, color }: { size: number; color: string }) {
  const head = size * 0.38;
  const stroke = Math.max(2, size * 0.08);
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View
        style={{
          width: head,
          height: head * 1.35,
          borderRadius: head / 2,
          backgroundColor: color,
          marginTop: size * 0.08,
        }}
      />
      <View
        style={{
          width: head * 1.7,
          height: head * 0.95,
          marginTop: -head * 0.5,
          borderBottomLeftRadius: head,
          borderBottomRightRadius: head,
          borderWidth: stroke,
          borderTopWidth: 0,
          borderColor: color,
        }}
      />
      <View style={{ width: stroke, height: size * 0.14, backgroundColor: color }} />
      <View
        style={{
          width: head * 0.9,
          height: stroke,
          borderRadius: stroke / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

function PlayDisc({ side, playing }: { side: number; playing: boolean }) {
  const disc = side * 0.4;
  return (
    <View
      style={[
        styles.playDisc,
        { width: disc, height: disc, borderRadius: disc / 2 },
        playing ? styles.playDiscOn : null,
      ]}
    >
      {playing ? (
        <View style={[styles.stopMark, { width: disc * 0.28, height: disc * 0.28 }]} />
      ) : (
        <PlayMark size={disc * 0.34} />
      )}
    </View>
  );
}

function PlayMark({ size }: { size: number }) {
  return (
    <View
      style={{
        width: 0,
        height: 0,
        marginLeft: size * 0.14,
        borderTopWidth: size * 0.42,
        borderBottomWidth: size * 0.42,
        borderLeftWidth: size * 0.66,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: mineColor,
      }}
    />
  );
}

function tileFrame(side: number, playing: boolean) {
  return {
    width: side,
    height: side,
    borderRadius: side * 0.16,
    transform: [{ scale: playing ? 1.045 : 1 }],
    zIndex: playing ? 1 : 0,
  };
}

function labelSize(side: number) {
  return Math.max(15, Math.min(28, Math.round(side * 0.078)));
}

const rounded = Platform.select({ ios: 'ui-rounded', default: undefined });

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 8,
    paddingBottom: 2,
  },
  mark: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  title: {
    color: ink,
    fontFamily: rounded,
    fontWeight: '800',
    fontSize: 22,
  },
  languages: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 6,
  },
  language: {
    minWidth: 44,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageOn: {
    backgroundColor: '#FFFFFF',
  },
  languageText: {
    color: ink,
    fontFamily: rounded,
    fontWeight: '700',
    fontSize: 14,
  },
  languageTextOn: {
    fontWeight: '800',
  },
  credit: {
    textAlign: 'center',
    color: ink,
    fontFamily: rounded,
    fontWeight: '600',
    fontSize: 13,
    paddingBottom: 8,
  },
  grid: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: pad,
  },
  board: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  tile: {
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
  },
  pressed: {
    opacity: 0.92,
  },
  art: {
    width: '100%',
    height: '100%',
  },
  label: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 12,
    textAlign: 'center',
    fontFamily: rounded,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  lightLabel: {
    color: '#FFFFFF',
  },
  mineArt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 18,
  },
  playDisc: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  playDiscOn: {
    transform: [{ scale: 0.94 }],
  },
  stopMark: {
    borderRadius: 4,
    backgroundColor: mineColor,
  },
  chipSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  chipText: {
    color: mineColor,
    fontFamily: rounded,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.4,
  },
  recordingFace: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopSquare: {
    width: 11,
    height: 11,
    borderRadius: 3,
    backgroundColor: recordColor,
  },
  stopText: {
    color: recordColor,
    fontFamily: rounded,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.6,
  },
  timer: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 14,
    textAlign: 'center',
    color: '#FFFFFF',
    fontFamily: rounded,
    fontWeight: '800',
    letterSpacing: 1,
  },
  error: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 46,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(20, 24, 28, 0.78)',
  },
  errorText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
  },
  banner: {
    marginHorizontal: 16,
    marginBottom: 10,
    textAlign: 'center',
    color: ink,
    fontWeight: '700',
  },
});
