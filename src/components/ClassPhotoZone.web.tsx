/**
 * Web class-photo zone: drag a timetable image onto it, or click Upload.
 * (Drag-and-drop is wired via DOM listeners on the underlying element, which
 * react-native-web exposes through the View ref.)
 */

import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { C, Text } from '@/components/ui';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { usePlanStore } from '@/store/usePlanStore';

export function ClassPhotoZone() {
  const scheduleImageBase64 = usePlanStore((s) => s.scheduleImageBase64);
  const setScheduleImage = usePlanStore((s) => s.setScheduleImage);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const ref = useRef<View>(null);

  useEffect(() => {
    const node = ref.current as unknown as HTMLElement | null;
    if (!node) return;

    const readFile = (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result);
        const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
        const mime = dataUrl.slice(5, dataUrl.indexOf(';'));
        setScheduleImage(base64, mime || 'image/jpeg');
        setPreviewUri(dataUrl);
      };
      reader.readAsDataURL(file);
    };

    const onOver = (e: Event) => {
      e.preventDefault();
      setDragging(true);
    };
    const onLeave = () => setDragging(false);
    const onDrop = (e: Event) => {
      e.preventDefault();
      setDragging(false);
      const file = (e as DragEvent).dataTransfer?.files?.[0];
      if (file && file.type.startsWith('image/')) readFile(file);
    };

    node.addEventListener('dragover', onOver);
    node.addEventListener('dragleave', onLeave);
    node.addEventListener('drop', onDrop);
    return () => {
      node.removeEventListener('dragover', onOver);
      node.removeEventListener('dragleave', onLeave);
      node.removeEventListener('drop', onDrop);
    };
  }, [setScheduleImage]);

  async function upload() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, base64: true });
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
    <View ref={ref} style={[styles.zone, dragging && styles.zoneActive]}>
      <Text variant="label" color={C.text}>
        Upload a photo of your timetable
      </Text>
      <Text variant="caption" color={C.textMuted} center>
        Drag one here or upload — Pawse reads it and keeps your classes fixed.
      </Text>
      <Pressable onPress={upload} style={styles.zbtn}>
        <Text variant="label" color={C.text}>
          Upload
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  zone: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  zoneActive: { borderColor: Brand.pink, backgroundColor: 'rgba(245,160,184,0.06)' },
  zbtn: {
    marginTop: Spacing.two,
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
