// Stub so ics.ts bundles in the browser. The extension only calls buildIcs();
// the native share path (exportPlanAsIcs) is never invoked here.
export const Paths = { cache: '' };

export class File {
  uri = '';
  constructor(..._args: unknown[]) {}
  create(): void {}
  write(_data: string): void {}
}
