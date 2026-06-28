import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CatMascot } from '@/components/CatMascot';
import { DateField } from '@/components/DateField';
import { Button, C, Chip, Screen, SectionLabel, Text } from '@/components/ui';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { usePlanStore } from '@/store/usePlanStore';
import type { Preferences } from '@/types/plan';

type Opt = { label: string; value: string | number };
type Question = { key: 'wakeTime' | 'sleepTime' | 'studyBlockMinutes' | 'breakMinutes'; label: string; options: Opt[] };

const QUESTIONS: Question[] = [
  { key: 'wakeTime', label: 'When does your day start?', options: [
    { label: '7:00 AM', value: '07:00' }, { label: '8:00 AM', value: '08:00' }, { label: '9:00 AM', value: '09:00' },
  ] },
  { key: 'sleepTime', label: 'When do you wind down?', options: [
    { label: '9 PM', value: '21:00' }, { label: '10 PM', value: '22:00' }, { label: '11 PM', value: '23:00' },
  ] },
  { key: 'studyBlockMinutes', label: 'How long is one focus block?', options: [
    { label: '25 min', value: 25 }, { label: '50 min', value: 50 }, { label: '90 min', value: 90 },
  ] },
  { key: 'breakMinutes', label: 'Break between blocks?', options: [
    { label: '5 min', value: 5 }, { label: '10 min', value: 10 }, { label: '15 min', value: 15 },
  ] },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const preferences = usePlanStore((s) => s.preferences);
  const setPreferences = usePlanStore((s) => s.setPreferences);
  const planRange = usePlanStore((s) => s.planRange);
  const setPlanRange = usePlanStore((s) => s.setPlanRange);
  const setOnboarded = usePlanStore((s) => s.setOnboarded);

  const [deferred, setDeferred] = useState<Record<string, boolean>>({});

  function finish() {
    setOnboarded(true);
    router.replace('/');
  }

  return (
    <Screen scroll>
      <View style={styles.hero}>
        <CatMascot size={72} />
        <Text variant="title" center style={{ marginTop: Spacing.three }}>
          Let&apos;s set up your week
        </Text>
        <Text variant="body" color={C.textSecondary} center style={{ marginTop: Spacing.two }}>
          A few quick questions — pick &quot;Later&quot; for anything you&apos;re unsure about.
        </Text>
      </View>

      {QUESTIONS.map((q) => {
        const current = preferences[q.key];
        const isLater = deferred[q.key];
        return (
          <View key={q.key} style={styles.q}>
            <Text variant="label" style={{ marginBottom: Spacing.three }}>
              {q.label}
            </Text>
            <View style={styles.chips}>
              {q.options.map((o) => (
                <Chip
                  key={String(o.value)}
                  label={o.label}
                  selected={!isLater && current === o.value}
                  onPress={() => {
                    setDeferred((d) => ({ ...d, [q.key]: false }));
                    setPreferences({ [q.key]: o.value } as Partial<Preferences>);
                  }}
                />
              ))}
              <Chip
                label="Later"
                selected={!!isLater}
                onPress={() => setDeferred((d) => ({ ...d, [q.key]: true }))}
              />
            </View>
          </View>
        );
      })}

      <View style={styles.rangeCard}>
        <SectionLabel>Plan these dates · required</SectionLabel>
        <View style={styles.rangeRow}>
          <DateField value={planRange.start} onChange={(start) => setPlanRange({ start })} />
          <Text variant="label" color={C.textMuted}>
            →
          </Text>
          <DateField value={planRange.end} onChange={(end) => setPlanRange({ end })} />
        </View>
        <Text variant="caption" color={C.textMuted} style={{ marginTop: Spacing.three }}>
          Pawse will build your schedule across this window. You can change it anytime.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button title="Start planning" onPress={finish} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: Spacing.six, marginBottom: Spacing.six },
  q: { marginBottom: Spacing.five },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  rangeCard: {
    marginTop: Spacing.two,
    marginBottom: Spacing.five,
    padding: Spacing.five,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Brand.pink,
    backgroundColor: 'rgba(245,160,184,0.06)',
  },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  actions: { marginBottom: Spacing.seven },
});
