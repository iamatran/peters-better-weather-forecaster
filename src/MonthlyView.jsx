import { useEffect, useMemo, useState } from "react";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import KeyboardDoubleArrowLeftRounded from "@mui/icons-material/KeyboardDoubleArrowLeftRounded";
import KeyboardDoubleArrowRightRounded from "@mui/icons-material/KeyboardDoubleArrowRightRounded";
import LocationOnRounded from "@mui/icons-material/LocationOnRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import WeatherIcon from "./WeatherIcon";
import { fetchArchiveDaily, localDateISO } from "./weather";

const WEEKDAYS = Array.from({ length: 7 }, (_, index) =>
  new Intl.DateTimeFormat(undefined, { weekday: "narrow" }).format(
    new Date(2024, 0, 7 + index),
  ),
);

function monthKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function cursorFromDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month: month - 1, day };
}

function shiftMonth(cursor, delta) {
  const date = new Date(cursor.year, cursor.month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

function isoDate(year, month, day) {
  return `${monthKey(year, month)}-${String(day).padStart(2, "0")}`;
}

function isRealDate(year, month, day) {
  const date = new Date(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month;
}

function monthOptions() {
  return Array.from({ length: 12 }, (_, month) => ({
    month,
    label: new Intl.DateTimeFormat(undefined, { month: "long" }).format(
      new Date(2024, month, 1),
    ),
  }));
}

function average(values) {
  const numbers = values.filter(
    (value) => value != null && !Number.isNaN(value),
  );
  if (numbers.length === 0) return null;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function buildMonthCells(year, month, days) {
  const byDate = new Map(days.map((day) => [day.date, day]));
  const startPad = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: startPad }, () => null);

  for (let day = 1; day <= count; day += 1) {
    const iso = `${monthKey(year, month)}-${String(day).padStart(2, "0")}`;
    const data = byDate.get(iso);
    cells.push({
      iso,
      day,
      data: data && data.weatherCode != null ? data : null,
    });
  }

  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function formatMonth(year, month) {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));
}

function formatDayHeading(iso) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${iso}T12:00:00`));
}

function formatShortDate(iso) {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
  }).format(new Date(`${iso}T12:00:00`));
}

function selectInitialDate(days, today) {
  return (
    days.find((day) => day.date === today && day.weatherCode != null)?.date ??
    days.find((day) => day.date >= today && day.weatherCode != null)?.date ??
    days.find((day) => day.weatherCode != null)?.date ??
    days[0]?.date ??
    today
  );
}

function clampDay(year, month, day) {
  const count = new Date(year, month + 1, 0).getDate();
  return Math.min(day, count);
}

function tempPair(day) {
  if (day?.high == null || day?.low == null) return "—";
  return `${Math.round(day.high)}°/${Math.round(day.low)}°`;
}

function precipLabel(day) {
  if (day?.precipitation == null || Number.isNaN(day.precipitation)) return "—";
  return `${Math.round(day.precipitation)}%`;
}

function TileLine({ label, day, emphasize }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        columnGap: 0.75,
        rowGap: 0.15,
        fontWeight: emphasize ? 700 : 500,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, whiteSpace: "nowrap" }}>
        {day?.weatherCode != null ? (
          <WeatherIcon code={day.weatherCode} sx={{ fontSize: 18 }} />
        ) : (
          <Box sx={{ width: 18 }} />
        )}
        <Box component="span" sx={{ color: "text.secondary" }}>
          {label}
        </Box>
        <Box component="span">{tempPair(day)}</Box>
      </Box>
      <Box component="span" sx={{ ml: "auto", color: "text.secondary" }}>
        {precipLabel(day)}
      </Box>
    </Box>
  );
}

export default function MonthlyView({
  days,
  timezone,
  unit,
  latitude,
  longitude,
  placeLabel,
}) {
  const today = localDateISO(timezone);
  const todayCursor = cursorFromDate(today);
  const initialDate = selectInitialDate(days, today);
  const [cursor, setCursor] = useState(() => cursorFromDate(initialDate));
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [sourceDays, setSourceDays] = useState(days);
  const [archiveDays, setArchiveDays] = useState([]);
  const [historyDays, setHistoryDays] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  if (sourceDays !== days) {
    setSourceDays(days);
    setCursor(cursorFromDate(initialDate));
    setSelectedDate(initialDate);
    setArchiveDays([]);
  }

  const years = useMemo(() => {
    const latest = days.reduce(
      (max, day) => (day.date > max ? day.date : max),
      today,
    );
    const endYear = Math.max(todayCursor.year + 5, cursorFromDate(latest).year);
    const list = [];
    for (let year = todayCursor.year - 3; year <= endYear; year += 1)
      list.push(year);
    return list;
  }, [days, today, todayCursor.year]);

  const mergedDays = useMemo(() => {
    const byDate = new Map(archiveDays.map((day) => [day.date, day]));
    days.forEach((day) => byDate.set(day.date, day));
    return [...byDate.values()];
  }, [archiveDays, days]);

  const historyByDate = useMemo(
    () => new Map(historyDays.map((day) => [day.date, day])),
    [historyDays],
  );
  const cells = useMemo(
    () => buildMonthCells(cursor.year, cursor.month, mergedDays),
    [cursor, mergedDays],
  );
  const weekCount = Math.max(1, cells.length / 7);
  const lastForecast = [...days].reverse().find((day) => day.date >= today);
  const selectedParts = cursorFromDate(selectedDate);
  const previous = shiftMonth(cursor, -1);
  const next = shiftMonth(cursor, 1);
  const canPrev = years.includes(previous.year);
  const canNext = years.includes(next.year);
  const canPrevYear = years.includes(cursor.year - 1);
  const canNextYear = years.includes(cursor.year + 1);
  const historyYears = [3, 2, 1].map((offset) => cursor.year - offset);

  useEffect(() => {
    const count = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const known = new Set(days.map((day) => day.date));
    let start = null;
    let end = null;
    for (let day = 1; day <= count; day += 1) {
      const iso = isoDate(cursor.year, cursor.month, day);
      if (iso >= today || known.has(iso)) continue;
      if (!start) start = iso;
      end = iso;
    }
    if (!start) return undefined;

    let cancelled = false;
    fetchArchiveDaily(latitude, longitude, unit, start, end)
      .then((rows) => {
        if (!cancelled) {
          setArchiveDays((current) => {
            const byDate = new Map(current.map((day) => [day.date, day]));
            rows.forEach((day) => byDate.set(day.date, day));
            return [...byDate.values()];
          });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [cursor, days, latitude, longitude, today, unit]);

  useEffect(() => {
    const yearsToLoad = [3, 2, 1].map((offset) => cursor.year - offset);
    const requests = yearsToLoad.map((year) => {
      const count = new Date(year, cursor.month + 1, 0).getDate();
      const start = isoDate(year, cursor.month, 1);
      const end = isoDate(year, cursor.month, count);
      return fetchArchiveDaily(latitude, longitude, unit, start, end).catch(
        () => [],
      );
    });

    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError("");
    Promise.all(requests)
      .then((groups) => {
        if (cancelled) return;
        const rows = groups.flat();
        setHistoryDays(rows);
        if (rows.length === 0) {
          setHistoryError("Historical weather is not available for this month.");
        }
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cursor.month, cursor.year, latitude, longitude, unit]);

  function showDate(year, month, day) {
    const nextDay = clampDay(year, month, day);
    setCursor({ year, month });
    setSelectedDate(isoDate(year, month, nextDay));
  }

  function moveMonth(delta) {
    const target = shiftMonth(cursor, delta);
    if (!years.includes(target.year)) return;
    showDate(target.year, target.month, selectedParts.day);
  }

  function moveYear(delta) {
    const year = cursor.year + delta;
    if (!years.includes(year)) return;
    showDate(year, cursor.month, selectedParts.day);
  }

  return (
    <Stack
      spacing={2}
      component="section"
      aria-label="Monthly Forecast"
      sx={{ flex: 1, minHeight: 0, width: "100%" }}
    >
      <Box>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: "center", flexWrap: "wrap", mb: 0.5 }}
        >
          <Typography variant="h2" sx={{ fontSize: { xs: 28, sm: 36 } }}>
            Monthly Forecast in
          </Typography>
          <Chip icon={<LocationOnRounded />} label={placeLabel} size="small" />
        </Stack>
        <Typography color="text.secondary">
          {lastForecast
            ? `Each day shows the last 3 years and their average. The forecast line fills in through ${formatShortDate(lastForecast.date)}. Future years keep those earlier conditions.`
            : "Each day shows the last 3 years, their average, and the forecast."}
        </Typography>
      </Box>

      <Card
        variant="outlined"
        sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
      >
        <CardContent
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            p: { xs: 1.25, sm: 2 },
            "&:last-child": { pb: { xs: 1.25, sm: 2 } },
          }}
        >
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
            <IconButton
              aria-label="Previous year"
              onClick={() => moveYear(-1)}
              disabled={!canPrevYear}
            >
              <KeyboardDoubleArrowLeftRounded />
            </IconButton>
            <IconButton
              aria-label="Previous month"
              onClick={() => moveMonth(-1)}
              disabled={!canPrev}
            >
              <ChevronLeftRounded />
            </IconButton>
            <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
              <InputLabel id="month-label">Month</InputLabel>
              <Select
                labelId="month-label"
                label="Month"
                value={cursor.month}
                onChange={(event) =>
                  showDate(
                    cursor.year,
                    Number(event.target.value),
                    selectedParts.day,
                  )
                }
              >
                {monthOptions().map((option) => (
                  <MenuItem key={option.month} value={option.month}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 96 }}>
              <InputLabel id="year-label">Year</InputLabel>
              <Select
                labelId="year-label"
                label="Year"
                value={cursor.year}
                onChange={(event) =>
                  showDate(
                    Number(event.target.value),
                    cursor.month,
                    selectedParts.day,
                  )
                }
              >
                {years.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              size="small"
              disabled={
                cursor.year === todayCursor.year &&
                cursor.month === todayCursor.month &&
                selectedDate === today
              }
              onClick={() =>
                showDate(todayCursor.year, todayCursor.month, todayCursor.day)
              }
              sx={{ flexShrink: 0, whiteSpace: "nowrap", height: 40 }}
            >
              Current Month
            </Button>
            <IconButton
              aria-label="Next month"
              onClick={() => moveMonth(1)}
              disabled={!canNext}
            >
              <ChevronRightRounded />
            </IconButton>
            <IconButton
              aria-label="Next year"
              onClick={() => moveYear(1)}
              disabled={!canNextYear}
            >
              <KeyboardDoubleArrowRightRounded />
            </IconButton>
          </Stack>

          <Box
            aria-label={`${formatMonth(cursor.year, cursor.month)} calendar`}
            sx={{
              flex: 1,
              minHeight: 0,
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gridTemplateRows: `auto repeat(${weekCount}, minmax(200px, 1fr))`,
              gap: { xs: 0.5, sm: 0.75 },
            }}
          >
            {WEEKDAYS.map((label, index) => (
              <Typography
                key={`${label}-${index}`}
                variant="caption"
                color="text.secondary"
                sx={{ textAlign: "center", fontWeight: 700, pb: 0.5 }}
              >
                {label}
              </Typography>
            ))}

            {cells.map((cell, index) => {
              if (!cell) {
                return <Box key={`empty-${index}`} aria-hidden="true" />;
              }

              const isToday = cell.iso === today;
              const priorYears = historyYears.map((year) => {
                if (!isRealDate(year, cursor.month, cell.day)) return null;
                return historyByDate.get(isoDate(year, cursor.month, cell.day)) ?? null;
              });
              const averageDay = {
                high: average(priorYears.map((day) => day?.high)),
                low: average(priorYears.map((day) => day?.low)),
                precipitation: average(priorYears.map((day) => day?.precipitation)),
              };
              const forecastIso =
                cursor.year > todayCursor.year
                  ? isoDate(todayCursor.year, cursor.month, cell.day)
                  : cell.iso;
              const forecastDay =
                cursor.year > todayCursor.year
                  ? (days.find((day) => day.date === forecastIso && day.date >= today) ?? null)
                  : cell.data;

              return (
                <Box
                  key={cell.iso}
                  aria-current={isToday ? "date" : undefined}
                  aria-label={formatDayHeading(cell.iso)}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "stretch",
                    borderRadius: 2,
                    border: isToday ? 2 : 1,
                    borderColor: isToday ? "primary.main" : "divider",
                    bgcolor: "background.paper",
                    minHeight: 0,
                    overflow: "hidden",
                    px: 1.25,
                    py: 1.25,
                    fontSize: { xs: 12, sm: 13 },
                    lineHeight: 1.45,
                  }}
                >
                  <Typography
                    component="div"
                    color={isToday ? "primary" : "text.primary"}
                    sx={{ fontWeight: 700, fontSize: { xs: 16, sm: 20 }, lineHeight: 1.2, mb: 0.75 }}
                  >
                    {cell.day}
                  </Typography>
                  {historyLoading && historyDays.length === 0 ? (
                    <CircularProgress size={14} sx={{ alignSelf: "center", my: "auto" }} />
                  ) : (
                    <>
                      {historyYears.map((year, yearIndex) => (
                        <TileLine
                          key={year}
                          label={String(year)}
                          day={priorYears[yearIndex]}
                        />
                      ))}
                      <TileLine label="Avg" day={averageDay} emphasize />
                      <TileLine label={String(cursor.year)} day={forecastDay} emphasize />
                    </>
                  )}
                </Box>
              );
            })}
          </Box>
          {historyError && (
            <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
              {historyError}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
