/**
 * Web class-photo zone: drag a timetable image onto it, click Upload, or
 * click Paste and hit ⌘V/Ctrl+V with a screenshot on the clipboard.
 * (Drag-and-drop is wired via DOM listeners on the underlying element, which
 * react-native-web exposes through the View ref.)
 */

import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { C, Text } from '@/components/ui';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { PHOTO_FAIL, readScheduleImage } from '@/lib/classPhoto';
import { usePlanStore } from '@/store/usePlanStore';

const PASTE_KEYS =
  typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform) ? '⌘V' : 'Ctrl+V';

export function ClassPhotoZone() {
  const scheduleImageBase64 = usePlanStore((s) => s.scheduleImageBase64);
  const setScheduleImage = usePlanStore((s) => s.setScheduleImage);
  const parsingClasses = usePlanStore((s) => s.parsingClasses);
  const status = usePlanStore((s) => s.scheduleImageStatus);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pasteArmed, setPasteArmed] = useState(false);
  const ref = useRef<View>(null);

  const readFile = useCallback(
    (file: Blob) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result);
        const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
        const mime = dataUrl.slice(5, dataUrl.indexOf(';'));
        setScheduleImage(base64, mime || 'image/jpeg');
        setPreviewUri(dataUrl);
        void readScheduleImage();
      };
      reader.readAsDataURL(file);
    },
    [setScheduleImage],
  );

  useEffect(() => {
    const node = ref.current as unknown as HTMLElement | null;
    if (!node) return;

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
  }, [readFile]);

  // While armed, the next ⌘V/Ctrl+V anywhere on the page attaches the image.
  // Escape or 30s of silence disarms.
  useEffect(() => {
    if (!pasteArmed) return;
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith('image/'),
      );
      const file = item?.getAsFile();
      if (file) {
        e.preventDefault();
        readFile(file);
        setPasteArmed(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPasteArmed(false);
    };
    document.addEventListener('paste', onPaste);
    document.addEventListener('keydown', onKey);
    const timeout = setTimeout(() => setPasteArmed(false), 30000);
    return () => {
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('keydown', onKey);
      clearTimeout(timeout);
    };
  }, [pasteArmed, readFile]);

  async function pasteFromClipboard() {
    // Instant path: read the clipboard directly when the browser allows it.
    // Racing a short timeout keeps a stuck permission prompt from eating the
    // click; either failure falls back to listening for a real ⌘V.
    try {
      const read = navigator.clipboard?.read?.();
      if (read) {
        const items = await Promise.race([
          read,
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('slow')), 1200)),
        ]);
        for (const item of items) {
          const type = item.types.find((t) => t.startsWith('image/'));
          if (type) {
            readFile(await item.getType(type));
            return;
          }
        }
      }
    } catch {
      // Permission denied or unsupported: fall through to the armed path.
    }
    setPasteArmed(true);
  }

  async function upload() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, base64: true });
    const asset = res.canceled ? null : res.assets[0];
    if (asset?.base64) {
      setScheduleImage(asset.base64, asset.mimeType ?? 'image/jpeg');
      setPreviewUri(asset.uri);
      void readScheduleImage();
    }
  }

  if (scheduleImageBase64) {
    const failed = !parsingClasses && (status === 'unreadable' || status === 'error');
    const fail = failed ? PHOTO_FAIL[status as 'unreadable' | 'error'] : null;
    return (
      <View style={[styles.attached, failed && styles.attachedFailed]}>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={styles.thumbFallback}>
            <Text style={{ fontSize: 22 }}>🗓️</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text variant="label" color={fail ? Brand.deadline : C.text}>
            {fail ? fail.title : 'Timetable attached'}
          </Text>
          <Text variant="caption" color={parsingClasses ? C.tint : C.textMuted}>
            {parsingClasses
              ? 'Reading your classes…'
              : (fail?.hint ?? 'Classes it finds appear in your list')}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            setScheduleImage(null, null);
            setPreviewUri(null);
            if (failed) void upload();
          }}
          hitSlop={8}
        >
          <Text variant="caption" color={C.tint}>
            {failed ? 'Try another' : 'Remove'}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View ref={ref} style={[styles.zone, (dragging || pasteArmed) && styles.zoneActive]}>
      <Text variant="label" color={C.text}>
        Upload a photo of your timetable
      </Text>
      <Text variant="caption" color={C.textMuted} center>
        Drag one here, upload, or paste. Pawse reads it and keeps your classes fixed.
      </Text>
      <View style={styles.row}>
        <Pressable onPress={upload} style={styles.zbtn}>
          <Text variant="label" color={C.text}>
            Upload
          </Text>
        </Pressable>
        <Pressable onPress={pasteFromClipboard} style={styles.zbtn}>
          <Text variant="label" color={C.text}>
            Paste
          </Text>
        </Pressable>
      </View>
      {pasteArmed && (
        <Text variant="caption" color={Brand.pink} center>
          Now press {PASTE_KEYS} to paste your screenshot.
        </Text>
      )}
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
  row: { flexDirection: 'row', gap: Spacing.five, marginTop: Spacing.two },
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
  attachedFailed: { borderColor: Brand.deadline },
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
