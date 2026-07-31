/**
 * Reads the attached timetable photo into editable class rows via the
 * backend's parse-classes endpoint (the one job AI has; placement stays
 * deterministic on-device). Best-effort: any failure leaves the typed-classes
 * path untouched. Returns how many class rows were added.
 */

import { parseClassesRemote } from '@/lib/api';
import { courseToEntryText } from '@/lib/parseClasses';
import { toast } from '@/lib/toast';
import { usePlanStore } from '@/store/usePlanStore';

export async function readScheduleImage(opts: { quiet?: boolean } = {}): Promise<number> {
  const s = usePlanStore.getState();
  if (!s.scheduleImageBase64 || s.parsingClasses) return 0;
  s.setParsingClasses(true);
  try {
    const courses = await parseClassesRemote(
      s.backendUrl,
      s.scheduleImageBase64,
      s.scheduleImageMime ?? 'image/jpeg',
    );
    if (courses.length === 0) {
      if (!opts.quiet) toast('Could not read classes in that photo. Type them below 🐱');
      return 0;
    }
    const store = usePlanStore.getState();
    store.setScheduleImageRead(true);
    const seen = new Set(store.classEntries.map((e) => `${e.name}|${e.time}`.toLowerCase()));
    let added = 0;
    for (const course of courses) {
      const { name, time } = courseToEntryText(course);
      const key = `${name}|${time}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      store.addClassEntry(name, time);
      added++;
    }
    if (!opts.quiet) {
      toast(
        added > 0
          ? `Found ${added} ${added === 1 ? 'class' : 'classes'} in your photo 🐱`
          : 'Those classes are already in your list 🐱',
      );
    }
    return added;
  } catch {
    if (!opts.quiet) {
      toast('Photo saved, but Pawse could not read it yet. Check the server in Settings.');
    }
    return 0;
  } finally {
    usePlanStore.getState().setParsingClasses(false);
  }
}
