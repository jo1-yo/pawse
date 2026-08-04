/**
 * Reads the attached timetable photo into editable class rows via the
 * backend's parse-classes endpoint (the one job AI has; placement stays
 * deterministic on-device). Returns how many class rows were added.
 *
 * The outcome is recorded on the store as well as toasted: a toast is gone in
 * seconds, and a photo that turned out not to be a timetable has to keep
 * saying so until the student swaps it — otherwise the card reads "attached"
 * and they wait for classes that are never coming.
 */

import { parseClassesRemote } from '@/lib/api';
import { courseToEntryText } from '@/lib/parseClasses';
import { toast } from '@/lib/toast';
import { usePlanStore } from '@/store/usePlanStore';

/** What the photo card says when a read didn't produce classes. */
export const PHOTO_FAIL = {
  unreadable: {
    title: "Couldn't read a timetable",
    hint: 'Make sure course names and times are visible — or type them below.',
  },
  error: {
    title: "Couldn't reach Pawse",
    hint: 'Check your connection and try again — or type your classes below.',
  },
} as const;

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
      usePlanStore.getState().setScheduleImageStatus('unreadable');
      if (!opts.quiet) toast("That photo doesn't look like a timetable 🐱");
      return 0;
    }
    const store = usePlanStore.getState();
    store.setScheduleImageStatus('read');
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
    usePlanStore.getState().setScheduleImageStatus('error');
    if (!opts.quiet) toast("Couldn't reach Pawse to read that photo. Try again 🐱");
    return 0;
  } finally {
    usePlanStore.getState().setParsingClasses(false);
  }
}
