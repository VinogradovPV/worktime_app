import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect } from "react";
import { getPeriodStats } from "@/lib/storage/reportStatsService";

interface MonthData {
  month: number;
  monthName: string;
  workdays: number;
  holidays: number;
  weekends: number;
  vacationDays: number;
  workedDays: number;
  workedHours: number;
  requiresCheck: number;
}

interface YearCalendarViewProps {
  currentYear: number;
  onPreviousYear: () => void;
  onNextYear: () => void;
  holidays: string[];
  vacationPeriods: any[];
  onMonthPress?: (month: number) => void;
}

const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export function YearCalendarView({
  currentYear,
  onPreviousYear,
  onNextYear,
  holidays,
  vacationPeriods,
  onMonthPress,
}: YearCalendarViewProps) {
  const colors = useColors();
  const [monthStats, setMonthStats] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMonthStats();
  }, [currentYear, holidays, vacationPeriods]);

  const loadMonthStats = async () => {
    setLoading(true);
    try {
      const results: MonthData[] = [];
      for (let month = 0; month < 12; month++) {
        const startDate = new Date(currentYear, month, 1);
        const endDate = new Date(currentYear, month + 1, 0);
        const stats = await getPeriodStats(startDate, endDate, currentYear);
        results.push({
          month: month + 1,
          monthName: MONTH_NAMES[month],
          workdays: stats.workdaysInCalendar,
          holidays: stats.holidays,
          weekends: stats.weekends,
          vacationDays: stats.vacationDays,
          workedDays: stats.workedDays,
          workedHours: Math.round(stats.totalWorkedMs / 3_600_000 * 10) / 10,
          requiresCheck: stats.requiresCheckDays,
        });
      }
      setMonthStats(results);
    } catch (err) {
      console.error("YearCalendarView: ошибка загрузки", err);
    } finally {
      setLoading(false);
    }
  };

  const totalStats = monthStats.reduce(
    (acc, m) => ({
      workdays: acc.workdays + m.workdays,
      holidays: acc.holidays + m.holidays,
      weekends: acc.weekends + m.weekends,
      vacationDays: acc.vacationDays + m.vacationDays,
      workedDays: acc.workedDays + m.workedDays,
      workedHours: acc.workedHours + m.workedHours,
      requiresCheck: acc.requiresCheck + m.requiresCheck,
    }),
    { workdays: 0, holidays: 0, weekends: 0, vacationDays: 0, workedDays: 0, workedHours: 0, requiresCheck: 0 }
  );

  const today = new Date();
  const isCurrentYear = today.getFullYear() === currentYear;
  const currentMonth = today.getMonth() + 1;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Навигация */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, marginBottom: 16 }}>
        <TouchableOpacity onPress={onPreviousYear} style={{ padding: 8 }}>
          <Text style={{ fontSize: 22, color: colors.primary, fontWeight: "700" }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground }}>{currentYear}</Text>
        <TouchableOpacity onPress={onNextYear} style={{ padding: 8 }}>
          <Text style={{ fontSize: 22, color: colors.primary, fontWeight: "700" }}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Общая статистика года */}
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 16,
          padding: 16,
          borderRadius: 12,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
          Статистика {currentYear}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <View style={{ alignItems: "center", minWidth: 60 }}>
            <Text style={{ fontSize: 10, color: colors.muted, marginBottom: 2 }}>Рабочих</Text>
            <Text style={{ fontSize: 20, fontWeight: "700", color: colors.success }}>{totalStats.workdays}</Text>
          </View>
          <View style={{ alignItems: "center", minWidth: 60 }}>
            <Text style={{ fontSize: 10, color: colors.muted, marginBottom: 2 }}>Выходных</Text>
            <Text style={{ fontSize: 20, fontWeight: "700", color: colors.muted }}>{totalStats.weekends}</Text>
          </View>
          <View style={{ alignItems: "center", minWidth: 60 }}>
            <Text style={{ fontSize: 10, color: colors.muted, marginBottom: 2 }}>Праздников</Text>
            <Text style={{ fontSize: 20, fontWeight: "700", color: colors.error }}>{totalStats.holidays}</Text>
          </View>
          <View style={{ alignItems: "center", minWidth: 60 }}>
            <Text style={{ fontSize: 10, color: colors.muted, marginBottom: 2 }}>Отработано</Text>
            <Text style={{ fontSize: 20, fontWeight: "700", color: colors.primary }}>{totalStats.workedDays}</Text>
          </View>
          {totalStats.workedHours > 0 && (
            <View style={{ alignItems: "center", minWidth: 60 }}>
              <Text style={{ fontSize: 10, color: colors.muted, marginBottom: 2 }}>Часов</Text>
              <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>{totalStats.workedHours}ч</Text>
            </View>
          )}
          {totalStats.requiresCheck > 0 && (
            <View style={{ alignItems: "center", minWidth: 60 }}>
              <Text style={{ fontSize: 10, color: colors.muted, marginBottom: 2 }}>Проверка</Text>
              <Text style={{ fontSize: 20, fontWeight: "700", color: colors.warning }}>{totalStats.requiresCheck}</Text>
            </View>
          )}
        </View>

        {/* Прогресс-бар года */}
        {totalStats.workdays > 0 && (
          <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ fontSize: 11, color: colors.muted }}>
                {totalStats.workedDays} из {totalStats.workdays} рабочих дней
              </Text>
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary }}>
                {Math.round((totalStats.workedDays / totalStats.workdays) * 100)}%
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: "hidden" }}>
              <View
                style={{
                  height: "100%",
                  width: `${Math.min((totalStats.workedDays / totalStats.workdays) * 100, 100)}%`,
                  backgroundColor: colors.primary,
                  borderRadius: 3,
                }}
              />
            </View>
          </View>
        )}
      </View>

      {/* Месячные карточки */}
      <View style={{ paddingHorizontal: 16, gap: 10, paddingBottom: 24 }}>
        {loading ? (
          <View style={{ padding: 32, alignItems: "center" }}>
            <Text style={{ color: colors.muted, fontSize: 13 }}>Загрузка данных...</Text>
          </View>
        ) : (
          monthStats.map((stat) => {
            const isCurrentMon = isCurrentYear && stat.month === currentMonth;
            const isPastMonth = isCurrentYear
              ? stat.month < currentMonth
              : currentYear < today.getFullYear();
            const progressPct = stat.workdays > 0
              ? Math.min(Math.round((stat.workedDays / stat.workdays) * 100), 100)
              : 0;
            const progressColor = progressPct >= 100 ? colors.success
              : progressPct >= 75 ? colors.primary
              : progressPct >= 50 ? colors.warning
              : colors.muted;

            return (
              <TouchableOpacity
                key={stat.month}
                onPress={() => onMonthPress?.(stat.month)}
                style={{
                  backgroundColor: colors.surface,
                  borderColor: isCurrentMon ? colors.primary : colors.border,
                  borderWidth: isCurrentMon ? 2 : 1,
                  borderRadius: 12,
                  padding: 14,
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: isCurrentMon ? colors.primary : colors.foreground }}>
                      {stat.monthName}
                    </Text>
                    {isCurrentMon && (
                      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: colors.primary + "20" }}>
                        <Text style={{ fontSize: 10, fontWeight: "600", color: colors.primary }}>Текущий</Text>
                      </View>
                    )}
                    {stat.requiresCheck > 0 && (
                      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: colors.warning + "20" }}>
                        <Text style={{ fontSize: 10, fontWeight: "600", color: colors.warning }}>⚠ {stat.requiresCheck}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 12, color: colors.muted }}>{stat.workdays} раб. дн.</Text>
                </View>

                {/* Строка статистики */}
                <View style={{ flexDirection: "row", gap: 12, marginBottom: 8 }}>
                  <Text style={{ fontSize: 11, color: colors.muted }}>
                    <Text style={{ color: colors.success, fontWeight: "600" }}>{stat.workdays}</Text> раб.
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.muted }}>
                    <Text style={{ color: colors.muted, fontWeight: "600" }}>{stat.weekends}</Text> вых.
                  </Text>
                  {stat.holidays > 0 && (
                    <Text style={{ fontSize: 11, color: colors.muted }}>
                      <Text style={{ color: colors.error, fontWeight: "600" }}>{stat.holidays}</Text> праздн.
                    </Text>
                  )}
                  {stat.vacationDays > 0 && (
                    <Text style={{ fontSize: 11, color: colors.muted }}>
                      <Text style={{ color: colors.primary, fontWeight: "600" }}>{stat.vacationDays}</Text> отп.
                    </Text>
                  )}
                </View>

                {/* Прогресс-бар */}
                {(stat.workedDays > 0 || isPastMonth) && stat.workdays > 0 && (
                  <View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                      <Text style={{ fontSize: 10, color: colors.muted }}>
                        Отработано {stat.workedDays}/{stat.workdays} дн.
                        {stat.workedHours > 0 ? ` · ${stat.workedHours}ч` : ""}
                      </Text>
                      {progressPct > 0 && (
                        <Text style={{ fontSize: 10, fontWeight: "700", color: progressColor }}>
                          {progressPct}%
                        </Text>
                      )}
                    </View>
                    <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: "hidden" }}>
                      <View
                        style={{
                          height: "100%",
                          width: `${progressPct}%`,
                          backgroundColor: progressColor,
                          borderRadius: 2,
                        }}
                      />
                    </View>
                  </View>
                )}

                <Text style={{ fontSize: 11, color: colors.primary, fontWeight: "600", marginTop: 8 }}>
                  Открыть месяц →
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
