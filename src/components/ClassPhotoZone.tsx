/**
 * Always-visible class-timetable photo zone: upload or take a photo right here
 * (no expanding). On web a drag-and-drop variant is used (ClassPhotoZone.web).
 */

import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { C, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { toast } from '@/lib/toast';
import { usePlanStore } from '@/store/usePlanStore';

export function ClassPhotoZone() {
  const scheduleImageBase64 = usePlanStore((s) => s.scheduleImageBase64);
  const setScheduleImage = usePlanStore((s) => s.setScheduleImage);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  async function pick(fromCamera: boolean) {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast('Allow photo access, or type your classes below 🐱');
      return;
    }
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.5, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.5, base64: true });
    const asset = res.canceled ? null : res.assets[0];
    if (asset?.base64) {
      setScheduleImage(asset.base64, asset.mimeType ?? 'image/jpeg');
      setPreviewUri(asset.uri);
    }
  }

  if (scheduleImageBase64) {
    return (
      <View style={styles.attached}>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={styles.thumbFallback}>
            <Text style={{ fontSize: 22 }}>🗓️</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text variant="label" color={C.text}>
            Timetable attached
          </Text>
          <Text variant="caption" color={C.textMuted}>
            Pawse will read your classes
          </Text>
        </View>
        <Pressable onPress={() => { setScheduleImage(null, null); setPreviewUri(null); }} hitSlop={8}>
          <Text variant="caption" color={C.tint}>
            Remove
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.zone}>
      <Text variant="label" color={C.text}>
        Upload a photo of your timetable
      </Text>
      <Text variant="caption" color={C.textMuted} center>
        Pawse reads it and keeps your classes fixed.
      </Text>
      <View style={styles.btns}>
        <Pressable onPress={() => pick(false)} style={styles.zbtn}>
          <Text variant="label" color={C.text}>
            Upload
          </Text>
        </Pressable>
        {Platform.OS !== 'web' && (
          <Pressable onPress={() => pick(true)} style={styles.zbtn}>
            <Text variant="label" color={C.text}>
              Take photo
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  zone: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  btns: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.two },
  zbtn: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Radius.sm,
    backgroundColor: C.backgroundSelected,
  },
  attached: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  thumb: { width: 48, height: 48, borderRadius: Radius.sm },
  thumbFallback: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    backgroundColor: C.backgroundSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
