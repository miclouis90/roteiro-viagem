import { dateKey, localDate } from "./dates";

// A calendar period has no dependency on Trip or its persistence model.
export interface AgendaPeriod {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  color?: string;
  surface?: string;
}
export interface AgendaPoint {
  id: string;
  title: string;
  date: string;
  time: string;
}
export type AgendaMonthChange = string | ((month: string) => string);

export function isAgendaDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && dateKey(localDate(value)) === value;
}

export function isAgendaMonth(value: string) {
  return /^\d{4}-\d{2}$/.test(value) && isAgendaDate(`${value}-01`);
}

export function dateInAgendaMonth(month: string, date: string) {
  const first = localDate(`${month}-01`);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0, 12).getDate();
  return `${month}-${String(Math.min(localDate(date).getDate(), last)).padStart(2, "0")}`;
}

export function shiftAgendaMonth(month: string, delta: number) {
  const first = localDate(`${month}-01`);
  return dateKey(new Date(first.getFullYear(), first.getMonth() + delta, 1, 12)).slice(0, 7);
}

export function validAgendaPeriods<T extends AgendaPeriod>(periods: readonly T[]) {
  return [...new Map(periods.map(period => [period.id, period])).values()]
    .filter(period => isAgendaDate(period.startDate) && isAgendaDate(period.endDate) && period.endDate >= period.startDate)
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate) || a.id.localeCompare(b.id));
}

export function agendaPeriodsOnDate<T extends AgendaPeriod>(periods: readonly T[], date: string) {
  return validAgendaPeriods(periods).filter(period => period.startDate <= date && date <= period.endDate);
}

export function agendaMonth<T extends AgendaPeriod>(periods: readonly T[], month: string, points: readonly AgendaPoint[] = []) {
  const first = localDate(`${month}-01`);
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0, 12).getDate();
  const total = Math.ceil((first.getDay() + days) / 7) * 7;
  const entries = validAgendaPeriods(periods);
  const dates = Array.from({ length: total }, (_, index) =>
    dateKey(new Date(first.getFullYear(), first.getMonth(), index - first.getDay() + 1, 12)));
  const byDate = new Map<string, AgendaPoint[]>();
  const visiblePoints = [...new Map(points.map(point => [point.id, point])).values()]
    .filter(point => isAgendaDate(point.date) && point.date >= dates[0] && point.date <= dates[total - 1])
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.id.localeCompare(b.id));
  for (const point of visiblePoints) {
    const entries = byDate.get(point.date) || [];
    entries.push(point); byDate.set(point.date, entries);
  }
  return Array.from({ length: total / 7 }, (_, index) => {
    const week = dates.slice(index * 7, index * 7 + 7);
    const laneEnds: number[] = [];
    const segments = entries.filter(period => period.startDate <= week[6] && period.endDate >= week[0]).map(period => {
      const start = Math.max(0, week.findIndex(date => date >= period.startDate));
      const end = week.filter(date => date <= period.endDate).length - 1;
      let lane = laneEnds.findIndex(previousEnd => previousEnd < start);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = end;
      return { period, start, end, lane, continuesBefore: period.startDate < week[0], continuesAfter: period.endDate > week[6] };
    });
    const counts = Array<number>(7).fill(0);
    for (const segment of segments) for (let day = segment.start; day <= segment.end; day++) counts[day]++;
    return { dates: week, segments, lanes: laneEnds.length, counts, points: week.map(date => byDate.get(date) || []) };
  });
}
