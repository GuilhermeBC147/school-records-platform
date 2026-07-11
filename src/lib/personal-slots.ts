import { getCalendarWeekday } from "@/lib/calendar";
import { hasTimeOverlap, readTimeMinutes } from "@/lib/class-schedule";
import { prisma } from "@/lib/prisma";

export async function hasPersonalSlotCapacityConflict(input: {
  date: Date; durationMinutes: number; startTime: string; teacherId: string;
}) {
  const weekday = getCalendarWeekday(input.date);
  const [classes, bookings] = await Promise.all([
    prisma.class.findMany({ where: { classType: "PERSONAL", isActive: true, teacherId: input.teacherId, startTime: { not: null }, weekDays: { has: weekday } }, select: { durationMinutes: true, startTime: true } }),
    prisma.personalSlotBooking.findMany({ where: { teacherId: input.teacherId, scheduledDate: input.date, status: { not: "CANCELED" } }, select: { durationMinutes: true, startTime: true } }),
  ]);
  const intervals = [...classes, ...bookings].filter((item) => item.startTime).map((item) => ({ start: readTimeMinutes(item.startTime!), end: readTimeMinutes(item.startTime!)! + item.durationMinutes })).filter((item): item is {start:number;end:number} => item.start !== null);
  const start = readTimeMinutes(input.startTime)!;
  const boundaries = new Set([start, start + input.durationMinutes, ...intervals.flatMap((item) => [item.start, item.end])]);
  return [...boundaries].some((point) => point >= start && point < start + input.durationMinutes && 1 + intervals.filter((item) => item.start <= point && item.end > point).length > 3);
}

export function mergedIntervalMinutes(intervals: Array<{ durationMinutes: number; startTime: string }>) {
  const sorted = intervals.map((item) => { const start = readTimeMinutes(item.startTime); return start === null ? null : { start, end: start + item.durationMinutes }; }).filter((item): item is {start:number;end:number} => item !== null).sort((a,b) => a.start-b.start);
  let total = 0; let start: number | null = null; let end = 0;
  for (const item of sorted) { if (start === null) { start=item.start; end=item.end; } else if (item.start <= end) end=Math.max(end,item.end); else { total += end-start; start=item.start; end=item.end; } }
  return start === null ? 0 : total + end-start;
}
