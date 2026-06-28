import { z } from 'zod';

export const PriorityZ = z.enum(['low', 'medium', 'high']);
export const EventTypeZ = z.enum(['class', 'study', 'break', 'deadline', 'other']);

export const TaskInputZ = z.object({
  id: z.string(),
  title: z.string(),
  estimatedHours: z.number().positive().max(100),
  deadline: z.string(),
  priority: PriorityZ,
  notes: z.string().optional(),
});

export const PreferencesZ = z.object({
  timezone: z.string(),
  wakeTime: z.string(),
  sleepTime: z.string(),
  studyBlockMinutes: z.number().int().positive(),
  breakMinutes: z.number().int().nonnegative(),
  maxStudyMinutesPerDay: z.number().int().positive(),
});

export const PlanRequestZ = z.object({
  scheduleText: z.string().optional(),
  scheduleImageBase64: z.string().optional(),
  scheduleImageMime: z.string().optional(),
  tasks: z.array(TaskInputZ).min(1, 'Add at least one task.'),
  preferences: PreferencesZ,
  nowISO: z.string(),
  rangeStart: z.string().optional(),
  rangeEnd: z.string().optional(),
});

export const CourseZ = z.object({
  title: z.string(),
  days: z.array(z.number().int().min(0).max(6)),
  start: z.string(),
  end: z.string(),
  location: z.string().optional(),
});

export const PlanEventZ = z.object({
  id: z.string(),
  title: z.string(),
  type: EventTypeZ,
  date: z.string(), // YYYY-MM-DD
  start: z.string(), // HH:mm
  end: z.string(), // HH:mm
  taskId: z.string().optional(),
  notes: z.string().optional(),
});

/** Shape the LLM must return for a plan. */
export const PlanDraftZ = z.object({
  courses: z.array(CourseZ),
  events: z.array(PlanEventZ),
  summary: z.string(),
  warnings: z.array(z.string()),
});

/** Shape the vision OCR step must return. */
export const CourseExtractionZ = z.object({
  courses: z.array(CourseZ),
});

export const ChatRequestZ = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() }))
    .min(1),
});

export const FeedbackRequestZ = z.object({
  message: z.string().min(1).max(4000),
  email: z.string().max(200).optional(),
  platform: z.string().max(40).optional(),
  appVersion: z.string().max(40).optional(),
});

export type FeedbackRequest = z.infer<typeof FeedbackRequestZ>;

export type PlanRequest = z.infer<typeof PlanRequestZ>;
export type PlanDraft = z.infer<typeof PlanDraftZ>;
export type PlanEvent = z.infer<typeof PlanEventZ>;
export type Course = z.infer<typeof CourseZ>;
export type TaskInput = z.infer<typeof TaskInputZ>;
