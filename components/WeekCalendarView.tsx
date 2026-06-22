import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect } from "react";
import { getDayStatsForPeriod, ReportDayStats } from "@/lib/storage/reportStatsService";

interface WeekCalendarViewProps {
  currentDate: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  holidays: string[];
  vacationPeriods: any[];
  onDayPress?: (date: Date) => void;
}

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const FULL_DAY_NAMES = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
const MONTH_NAMES_SHORT = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

function formatMs(ms: number): string {
  if (ms <= 0) return "—";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h === 0) return `${m}м`;
  if (m === 0) return `${h}ч`;
  return `${h}ч ${m}м`;
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

export function WeekCalendarView({
  currentDate,
  onPreviousWeek,
  onNextWeek,
  holidays,
  vacationPeriods,
  onDayPress,
}: WeekCalendarViewProps) {
  const colors = useColors();
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [dayStats, setDayStats] = useState<ReportDayStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dates = getWeekDates(currentDate);
    setWeekDates(dates);
    loadStats(dates);
  }, [currentDate]);

  const getWeekDates = (date: Date): Date[] => {
    const dow = date.getDay();
    const monday = new Date(date);
    monday.setDate(date.getDate() - (dow === 0 ? 6 : dow - 1));
    monday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  };

  const loadStats = async (dates: Date[]) => {
    setLoading(true);
    try {
      const start = dates[0];
      const end = dates[6];
      const year = start.getFullYear();
      const stats = await getDayStatsForPeriod(start, end, year);
      setDayStats(stats);
    } catch (err) {
      console.error("WeekCalendarView: ошибка загрузки", err);
    } finally {
      setLoading(false);
    }
  };

  const getWeekRange = (): string => {
    if (weekDates.length < 7) return "";
    const s = weekDates[0];
    const e = weekDates[6];
    return `${s.getDate()} ${MONTH_NAMES_SHORT[s.getMonth()]} — ${e.getDate()} ${MONTH_NAMES_SHORT[e.getMonth()]}`;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDayColor = (stat: ReportDayStats | undefined, date: Date) => {
    if (!stat) return { bg: colors.surface, border: colors.border, label: "Рабочий день" };
    switch (stat.dayType) {
      case "weekend":
        return { bg: colors.muted + "15", border: colors.muted + "60", label: "Выходной" };
      case "holiday":
        return { bg: colors.error + "15", border: colors.error + "60", label: "Праздник" };
      case "vacation":
        return { bg: colors.primary + "15", border: colors.primary + "60", label: "Отпуск" };
      default:
        if (stat.requiresCheck) {
          return { bg: colors.warning + "15", border: colors.warning + "60", label: "Требует проверки" };
        }
        if (stat.hasData) {
          return { bg: colors.success + "15", border: colors.success + "60", label: "Отработан" };
        }
        return { bg: colors.surface, border: colors.border, label: "Рабочий день" };
    }
  };

  const weekWorkdays = dayStats.filter(d => d.dayType === "workday" || d.dayType === "shortened_workday");
  const weekWorked = dayStats.filter(d => d.hasData);
  const totalWorkedMs = weekWorked.reduce((sum, d) => sum + d.workedMs, 0);
  const requiresCheckCount = dayStats.filter(d => d.requiresCheck).length;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Навигация */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, marginBottom: 16 }}>
        <TouchableOpacity onPress={onPreviousWeek} style={{ padding: 8 }}>
          <Text style={{ fontSize: 22, color: colors.primary, fontWeight: "700" }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>{getWeekRange()}</Text>
        <TouchableOpacity onPress={onNextWeek} style={{ padding: 8 }}>
          <Text style={{ fontSize: 22, color: colors.primary, fontWeight: "700" }}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Дни недели */}
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {weekDates.map((date, i) => {
          const dateStr = formatDateStr(date);
          const stat = dayStats.find(d => d.date === dateStr);
          const typeColor = getDayColor(stat, date);
          const isToday = date.getTime() === today.getTime();
          const isPast = date < today;

          return (
            <TouchableOpacity
              key={i}
              onPress={() => onDayPress?.(date)}
              style={{
                backgroundColor: typeColor.bg,
                borderColor: isToday ? colors.primary : typeColor.border,
                borderWidth: isToday ? 2 : 1,
                borderRadius: 12,
                padding: 14,
              }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                {/* Левая часть: день недели + число */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ alignItems: "center", minWidth: 32 }}>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: colors.muted }}>{DAY_NAMES[i]}</Text>
                    <Text style={{
                      fontSize: 22,
                      fontWeight: "700",
                      color: isToday ? colors.primary : colors.foreground,
                    }}>
                      {date.getDate()}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>
                      {FULL_DAY_NAMES[i]}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.muted, marginTop: 1 }}>
                      {typeColor.label}
                    </Text>
                  </View>
                </View>

                {/* Правая часть: отработанное время */}
                <View style={{ alignItems: "flex-end" }}>
                  {stat?.hasData ? (
                    <>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: colors.success }}>
                        {formatMs(stat.workedMs)}
                      </Text>
                      {stat.breakMs > 0 && (
                        <Text style={{ fontSize: 10, color: colors.muted, marginTop: 1 }}>
                          перерыв {formatMs(stat.breakMs)}
                        </Text>
                      )}
                    </>
                  ) : stat?.requiresCheck ? (
                    <Text style={{ fontSize: 12, fontWeight: "600", color: colors.warning }}>⚠ нет данных</Text>
                  ) : (stat?.dayType === "workday" && !isPast) ? (
                    <Text style={{ fontSize: 11, color: colors.muted }}>—</Text>
                  ) : null}
                  {isToday && (
                    <View style={{ marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: colors.primary + "20" }}>
                      <Text style={{ fontSize: 10, fontWeight: "600", color: colors.primary }}>Сегодня</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Статистика недели */}
      <View
        style={{
          marginTop: 16,
          marginHorizontal: 16,
          padding: 16,
          borderRadius: 12,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 24,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
          Статистика недели
        </Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 10, color: colors.muted, marginBottom: 2 }}>Рабочих</Text>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.success }}>{weekWorkdays.length}</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 10, color: colors.muted, marginBottom: 2 }}>Отработано</Text>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.primary }}>{weekWorked.length}</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 10, color: colors.muted, marginBottom: 2 }}>Часов</Text>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>{formatMs(totalWorkedMs)}</Text>
          </View>
          {requiresCheckCount > 0 && (
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 10, color: colors.muted, marginBottom: 2 }}>Проверка</Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.warning }}>{requiresCheckCount}</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
