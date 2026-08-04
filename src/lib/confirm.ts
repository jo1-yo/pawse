/**
 * Cross-platform confirmation for destructive actions.
 *
 * `Alert.alert` is a no-op on react-native-web (same reason toast.ts exists),
 * so an action guarded only by it silently does nothing in the browser — the
 * student taps "Clear" and nothing happens. Web routes through window.confirm;
 * native keeps the real system dialog.
 */

import { Alert, Platform } from 'react-native';

export function confirmDestructive({
  title,
  message,
  confirmLabel = 'OK',
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
