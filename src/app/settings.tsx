import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { TimeField } from '@/components/TimeField';
import { Button, C, Card, Screen, SectionLabel, Text } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { sendFeedback } from '@/lib/api';
import { confirmDestructive } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { usePlanStore } from '@/store/usePlanStore';

const DEVELOPER_URL = 'https://imjane.top';

export default function SettingsScreen() {
  const router = useRouter();
  const preferences = usePlanStore((s) => s.preferences);
  const setPreferences = usePlanStore((s) => s.setPreferences);
  const backendUrl = usePlanStore((s) => s.backendUrl);
  const clearAll = usePlanStore((s) => s.clearAll);

  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  function confirmClear() {
    confirmDestructive({
      title: 'Clear all data?',
      message: 'This removes your to-dos, classes, and schedule from this device.',
      confirmLabel: 'Clear',
      onConfirm: () => {
        clearAll();
        router.back();
      },
    });
  }

  async function submitFeedback() {
    const message = feedback.trim();
    if (!message) {
      toast('Type a message first 🐱');
      return;
    }
    setSending(true);
    try {
      await sendFeedback(backendUrl, {
        message,
        email: email.trim() || undefined,
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version,
      });
      setFeedback('');
      setEmail('');
      toast('Thanks — your note reached the Pawse team 🐱');
    } catch (err) {
      toast(`Couldn't send: ${(err as Error).message}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <Text variant="title">Settings</Text>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.close}>
          <Text variant="label" color={C.textSecondary}>
            Done
          </Text>
        </Pressable>
      </View>

      <SectionLabel>Study preferences</SectionLabel>
      <Card style={styles.block}>
        <Row label="Day starts">
          <TimeField value={preferences.wakeTime} onChange={(v) => setPreferences({ wakeTime: v })} />
        </Row>
        <Divider />
        <Row label="Day ends">
          <TimeField value={preferences.sleepTime} onChange={(v) => setPreferences({ sleepTime: v })} />
        </Row>
        <Divider />
        <Row label="Focus block">
          <Stepper value={preferences.studyBlockMinutes} suffix="m" step={5} min={20} max={120} onChange={(v) => setPreferences({ studyBlockMinutes: v })} />
        </Row>
        <Divider />
        <Row label="Break length">
          <Stepper value={preferences.breakMinutes} suffix="m" step={5} min={5} max={60} onChange={(v) => setPreferences({ breakMinutes: v })} />
        </Row>
        <Divider />
        <Row label="Max study / day">
          <Stepper value={Math.round(preferences.maxStudyMinutesPerDay / 60)} suffix="h" step={1} min={1} max={14} onChange={(v) => setPreferences({ maxStudyMinutesPerDay: v * 60 })} />
        </Row>
      </Card>

      <SectionLabel>Send feedback</SectionLabel>
      <Card style={styles.block}>
        <Text variant="body" color={C.textSecondary} style={{ marginBottom: Spacing.three }}>
          Ideas, bugs, or anything — it goes straight to{' '}
          <Text
            variant="body"
            color={C.text}
            style={styles.devLink}
            onPress={() => void Linking.openURL(DEVELOPER_URL)}
            accessibilityRole="link"
          >
            Jane Zhang
          </Text>
          , the developer. 🐱
        </Text>
        <TextInput
          value={feedback}
          onChangeText={setFeedback}
          placeholder="What's on your mind?"
          placeholderTextColor={C.textMuted}
          multiline
          style={styles.textArea}
        />
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Your email (optional, if you'd like a reply)"
          placeholderTextColor={C.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          style={styles.input}
        />
        <View style={{ height: Spacing.three }} />
        <Button title="Send feedback" onPress={submitFeedback} loading={sending} disabled={sending} />
      </Card>

      <SectionLabel>About</SectionLabel>
      <Card style={styles.block}>
        <Row label="Version">
          <Text variant="label" color={C.textSecondary}>
            {Constants.expoConfig?.version ?? '1.0.0'}
          </Text>
        </Row>
        <Divider />
        <Text variant="caption" color={C.textMuted} style={{ paddingTop: Spacing.three }}>
          Pawse — your calm in college life.
        </Text>
      </Card>

      <Button title="Clear all data" variant="ghost" onPress={confirmClear} />
    </Screen>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text variant="body" color={C.text}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function Stepper({
  value,
  onChange,
  step,
  min,
  max,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max: number;
  suffix: string;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={() => onChange(Math.max(min, value - step))} hitSlop={8} style={styles.stepBtn}>
        <Text variant="subtitle">–</Text>
      </Pressable>
      <Text variant="label" style={{ minWidth: 48, textAlign: 'center' }}>
        {value}
        {suffix}
      </Text>
      <Pressable onPress={() => onChange(Math.min(max, value + step))} hitSlop={8} style={styles.stepBtn}>
        <Text variant="subtitle">+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.four,
    marginBottom: Spacing.five,
  },
  close: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.sm,
    backgroundColor: C.backgroundSelected,
  },
  block: { marginBottom: Spacing.five },
  devLink: { fontFamily: Fonts.bold, textDecorationLine: 'underline' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    minHeight: 44,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.border },
  input: {
    backgroundColor: C.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.border,
    padding: Spacing.four,
    color: C.text,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
  },
  textArea: {
    minHeight: 96,
    backgroundColor: C.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.border,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    color: C.text,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    textAlignVertical: 'top',
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    backgroundColor: C.backgroundSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
