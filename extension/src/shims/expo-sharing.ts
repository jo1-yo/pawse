// Stub so ics.ts bundles in the browser; never invoked by the extension.
export async function isAvailableAsync(): Promise<boolean> {
  return false;
}

export async function shareAsync(_uri: string, _opts?: unknown): Promise<void> {}
