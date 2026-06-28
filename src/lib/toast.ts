/**
 * Tiny cross-platform toast. `Alert.alert` is a no-op on react-native-web, so
 * status messages must go through this instead. The ToastHost component (mounted
 * in the root layout) registers a listener; `toast(msg)` shows a brief banner.
 */

type Listener = (message: string) => void;

let listener: Listener | null = null;

export function _setToastListener(next: Listener | null) {
  listener = next;
}

export function toast(message: string) {
  listener?.(message);
}
