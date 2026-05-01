function toZonedParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  return Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
}

function buildIsoString(datePart, hour, minute = 0) {
  const normalizedHour = String(hour).padStart(2, "0");
  const normalizedMinute = String(minute).padStart(2, "0");
  return `${datePart}T${normalizedHour}:${normalizedMinute}:00-03:00`;
}

function shiftDate(datePart, days) {
  const base = new Date(`${datePart}T12:00:00-03:00`);
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

export function overlapsPeriod(itemStart, itemEnd, periodStart, periodEnd) {
  const start = new Date(itemStart).getTime();
  const end = itemEnd ? new Date(itemEnd).getTime() : Number.POSITIVE_INFINITY;
  const pStart = new Date(periodStart).getTime();
  const pEnd = new Date(periodEnd).getTime();

  if (![start, pStart, pEnd].every(Number.isFinite)) {
    return false;
  }

  return start <= pEnd && end >= pStart;
}

export function timestampInPeriod(value, periodStart, periodEnd) {
  const timestamp = new Date(value).getTime();
  const pStart = new Date(periodStart).getTime();
  const pEnd = new Date(periodEnd).getTime();

  if (![timestamp, pStart, pEnd].every(Number.isFinite)) {
    return false;
  }

  return timestamp >= pStart && timestamp <= pEnd;
}

export function occurredInPeriod(item = {}, periodStart, periodEnd) {
  return [
    item.startedAt,
    item.endedAt,
    item.resolvedAt,
    item.recoveryAt,
    item.createdAt,
    item.generatedAt,
    item.eventTime,
    item.eventClock,
    item.lastChangedAt,
  ]
    .filter(Boolean)
    .some((value) => timestampInPeriod(value, periodStart, periodEnd));
}

export function isCarryOverActive(item = {}, periodStart) {
  const startTs = new Date(item.startedAt || item.createdAt || item.generatedAt || "").getTime();
  const periodStartTs = new Date(periodStart).getTime();
  const endValue = item.endedAt || item.resolvedAt || item.recoveryAt || null;
  const endTs = endValue ? new Date(endValue).getTime() : Number.POSITIVE_INFINITY;

  if (![startTs, periodStartTs].every(Number.isFinite)) {
    return false;
  }

  return startTs < periodStartTs && endTs === Number.POSITIVE_INFINITY;
}

function createShiftWindow(datePart, startHour, endHour) {
  const start = buildIsoString(datePart, startHour);
  const endDate = endHour <= startHour ? shiftDate(datePart, 1) : datePart;
  const end = buildIsoString(endDate, endHour);
  return { start, end };
}

export function resolveShiftPeriod(input = {}, options = {}) {
  if (input.start && input.end) {
    return {
      start: input.start,
      end: input.end,
      mode: "manual",
    };
  }

  const timeZone = options.timeZone || "America/Sao_Paulo";
  const now = options.now ? new Date(options.now) : new Date();
  const dayShiftStartHour = Number(options.dayShiftStartHour ?? 7);
  const dayShiftEndHour = Number(options.dayShiftEndHour ?? 19);
  const nightShiftStartHour = Number(options.nightShiftStartHour ?? 19);
  const nightShiftEndHour = Number(options.nightShiftEndHour ?? 7);
  const parts = toZonedParts(now, timeZone);
  const currentDate = `${parts.year}-${parts.month}-${parts.day}`;
  const currentHour = Number(parts.hour);
  const currentMinute = Number(parts.minute);
  const nowIso = `${currentDate}T${parts.hour}:${parts.minute}:${parts.second}-03:00`;
  const mode = input.mode || "last_completed";

  const currentDayShift = createShiftWindow(
    currentDate,
    dayShiftStartHour,
    dayShiftEndHour,
  );
  const currentNightShift = createShiftWindow(
    currentDate,
    nightShiftStartHour,
    nightShiftEndHour,
  );
  const previousDate = shiftDate(currentDate, -1);
  const previousDayShift = createShiftWindow(
    previousDate,
    dayShiftStartHour,
    dayShiftEndHour,
  );
  const previousNightShift = createShiftWindow(
    previousDate,
    nightShiftStartHour,
    nightShiftEndHour,
  );

  const isDuringDayShift =
    currentHour > dayShiftStartHour &&
    currentHour < dayShiftEndHour ||
    (currentHour === dayShiftStartHour && currentMinute >= 0);
  const isDuringNightShift = !isDuringDayShift;

  if (mode === "current") {
    if (currentHour >= nightShiftStartHour) {
      return {
        start: currentNightShift.start,
        end: nowIso,
        mode,
      };
    }

    if (currentHour < nightShiftEndHour) {
      return {
        start: previousNightShift.start,
        end: nowIso,
        mode,
      };
    }

    return {
      start: currentDayShift.start,
      end: nowIso,
      mode,
    };
  }

  if (mode === "previous_day") {
    const completedDayShift = currentHour >= dayShiftEndHour
      ? currentDayShift
      : previousDayShift;
    return {
      ...completedDayShift,
      mode,
    };
  }

  if (mode === "previous_night") {
    const completedNightShift = currentHour >= nightShiftEndHour
      ? previousNightShift
      : createShiftWindow(shiftDate(currentDate, -2), nightShiftStartHour, nightShiftEndHour);
    return {
      ...completedNightShift,
      mode,
    };
  }

  if (currentHour >= nightShiftStartHour) {
    return {
      start: currentDayShift.start,
      end: currentDayShift.end,
      mode,
    };
  }

  if (currentHour >= nightShiftEndHour) {
    return {
      start: previousNightShift.start,
      end: previousNightShift.end,
      mode,
    };
  }

  return {
    start: previousDayShift.start,
    end: previousDayShift.end,
    mode,
  };
}

export function filterItemsByPeriod(items = [], period = {}) {
  return items.filter((item) => {
    const startedAt =
      item.startedAt || item.startedAtTs || item.createdAt || item.generatedAt;
    const endedAt =
      item.endedAt || item.recoveryAt || item.recoveryAtTs || item.resolvedAt || null;

    if (!startedAt) {
      return false;
    }

    const normalizedStart =
      typeof startedAt === "number" ? new Date(startedAt).toISOString() : startedAt;
    const normalizedEnd =
      typeof endedAt === "number" ? new Date(endedAt).toISOString() : endedAt;

    return overlapsPeriod(normalizedStart, normalizedEnd, period.start, period.end);
  });
}
