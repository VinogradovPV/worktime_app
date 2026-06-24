import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect } from "react";
import { getProductionCalendar, getVacationPeriods, addVacationPeriod, removeVacationPeriod } from "@/lib/storage/notificationSettings";
import { AddVacationModal } from "@/components/AddVacationModal";
import { EditVacationModal } from "@/components/EditVacationModal";
import { DayDetailModal } from "@/components/DayDetailModal";
import { CalendarHeader } from "@/components/CalendarHeader";
import { CalendarStatsCards } from "@/components/CalendarStatsCards";
import { WeekCalendarView } from "@/components/WeekCalendarView";
import { YearCalendarView } from "@/components/YearCalendarView";
import { QuarterCalendarView } from "@/components/QuarterCalendarView";
import { getPeriodStats, getPeriodStart, getPeriodEnd, ReportPeriodStats } from "@/lib/storage/reportStatsService";
import { SyncConflictHandler, useSyncConflictHandler } from "@/components/sync-conflict-handler";

type CalendarMode = "month" | "week" | "quarter" | "year";

interface DayInfo {
  date: string; // YYYY-MM-DD
  dayOfMonth: number;
  type: "weekend" | "holiday" | "vacation" | "workday";
  vacationType?: "vacation" | "sick_leave" | "unpaid_leave";
}

export default function CalendarScreen() {
  const colors = useColors();
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState<string[]>([]);
  const [vacationPeriods, setVacationPeriods] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<any>(null);
  const [dayDetailVisible, setDayDetailVisible] = useState(false);
  const [selectedDayForDetail, setSelectedDayForDetail] = useState<Date | null>(null);
  const [selectedDayType, setSelectedDayType] = useState<"weekend" | "holiday" | "vacation" | "workday">("workday");
  const [selectedDayVacationType, setSelectedDayVacationType] = useState<"vacation" | "sick_leave" | "unpaid_leave" | undefined>(undefined);
  const [periodStats, setPeriodStats] = useState<ReportPeriodStats | null>(null);
  const { visible, conflicts, setVisible, checkConflicts, resolveConflict } = useSyncConflictHandler();

  useEffect(() => {
    loadCalendarData();
    loadPeriodStats();
    checkForConflicts();
  }, [currentDate, calendarMode]);

  const checkForConflicts = async () => {
    try {
      await checkConflicts('default_user');
    } catch (error) {
      console.error('[CalendarScreen] Ошибка проверки конфликтов:', error);
    }
  };

  const loadCalendarData = async () => {
    try {
      // Загрузить праздничные дни
      const calendar = await getProductionCalendar(currentDate.getFullYear());
      if (calendar?.holidays) {
        setHolidays(calendar.holidays.map((h) => h.date));
      }

      // Загрузить периоды отпусков
      const periods = await getVacationPeriods();
      setVacationPeriods(periods);
    } catch (error) {
      console.error("Ошибка при загрузке данных календаря:", error);
    }
  };

  const loadPeriodStats = async () => {
    try {
      const startDate = getPeriodStart(currentDate, calendarMode);
      const endDate = getPeriodEnd(currentDate, calendarMode);
      const stats = await getPeriodStats(startDate, endDate, currentDate.getFullYear());
      setPeriodStats(stats);
    } catch (error) {
      console.error("Ошибка при расчете статистики периода:", error);
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    // Конвертируем в Monday-first: Пн=0, Вт=1, ..., Сб=5, Вс=6
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const formatDate = (year: number, month: number, day: number): string => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const isWeekend = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  const isHoliday = (dateStr: string): boolean => {
    return holidays.includes(dateStr);
  };

  const getVacationType = (dateStr: string): string | null => {
    for (const period of vacationPeriods) {
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);
      const checkDate = new Date(dateStr);

      if (checkDate >= startDate && checkDate <= endDate) {
        return period.type;
      }
    }
    return null;
  };

  const getDayType = (day: number): DayInfo => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), day);

    let type: "weekend" | "holiday" | "vacation" | "workday" = "workday";
    let vacationType: "vacation" | "sick_leave" | "unpaid_leave" | undefined;

    if (isWeekend(date)) {
      type = "weekend";
    } else if (isHoliday(dateStr)) {
      type = "holiday";
    } else {
      const vType = getVacationType(dateStr);
      if (vType) {
        type = "vacation";
        vacationType = vType as any;
      }
    }

    return {
      date: dateStr,
      dayOfMonth: day,
      type,
      vacationType,
    };
  };

  const getDayTypeFromDate = (date: Date): DayInfo => {
    const dateStr = formatDate(date.getFullYear(), date.getMonth(), date.getDate());
    let type: "weekend" | "holiday" | "vacation" | "workday" = "workday";
    let vacationType: "vacation" | "sick_leave" | "unpaid_leave" | undefined;

    if (isWeekend(date)) {
      type = "weekend";
    } else if (isHoliday(dateStr)) {
      type = "holiday";
    } else {
      const vType = getVacationType(dateStr);
      if (vType) {
        type = "vacation";
        vacationType = vType as any;
      }
    }

    return {
      date: dateStr,
      dayOfMonth: date.getDate(),
      type,
      vacationType,
    };
  };

  const getTypeColor = (dayInfo: DayInfo) => {
    switch (dayInfo.type) {
      case "weekend":
        return { bg: colors.muted + "20", border: colors.muted, label: "Выходной" };
      case "holiday":
        return { bg: colors.error + "20", border: colors.error, label: "Праздник" };
      case "vacation":
        if (dayInfo.vacationType === "sick_leave") {
          return { bg: colors.warning + "20", border: colors.warning, label: "Больничный" };
        } else if (dayInfo.vacationType === "unpaid_leave") {
          return { bg: colors.primary + "20", border: colors.primary, label: "Неоплачиваемый отпуск" };
        }
        return { bg: colors.primary + "20", border: colors.primary, label: "Отпуск" };
      case "workday":
      default:
        return { bg: colors.success + "20", border: colors.success, label: "Рабочий день" };
    }
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const handleDayPress = (day: number | Date) => {
    let date: Date;

    if (typeof day === "number") {
      date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    } else {
      date = day;
    }

    const dayInfo = getDayTypeFromDate(date);
    setSelectedDayForDetail(date);
    setSelectedDayType(dayInfo.type);
    setSelectedDayVacationType(dayInfo.vacationType);
    setDayDetailVisible(true);
  };

  const handleAddVacation = async (startDate: string, endDate: string, type: "vacation" | "sick_leave" | "unpaid_leave") => {
    try {
      await addVacationPeriod({
        id: Date.now().toString(),
        startDate,
        endDate,
        type,
      });
      await loadCalendarData();
      await loadPeriodStats();
    } catch (error) {
      console.error("Ошибка при добавлении периода:", error);
      throw error;
    }
  };

  const getPeriodAtDate = (dateStr: string): any => {
    for (const period of vacationPeriods) {
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);
      const checkDate = new Date(dateStr);

      if (checkDate >= startDate && checkDate <= endDate) {
        return period;
      }
    }
    return null;
  };

  const handleDayLongPress = (day: number) => {
    const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), day);
    const period = getPeriodAtDate(dateStr);
    if (period) {
      setSelectedPeriod(period);
      setEditModalVisible(true);
    }
  };

  const handleUpdateVacation = async (updatedPeriod: any) => {
    try {
      await removeVacationPeriod(updatedPeriod.id);
      await addVacationPeriod(updatedPeriod);
      await loadCalendarData();
      await loadPeriodStats();
    } catch (error) {
      console.error("Ошибка при обновлении периода:", error);
      throw error;
    }
  };

  const handleDeleteVacation = async (periodId: string) => {
    try {
      await removeVacationPeriod(periodId);
      await loadCalendarData();
      await loadPeriodStats();
    } catch (error) {
      console.error("Ошибка при удалении периода:", error);
      throw error;
    }
  };

  const handlePreviousPeriod = () => {
    const newDate = new Date(currentDate);
    switch (calendarMode) {
      case "year":
        newDate.setFullYear(newDate.getFullYear() - 1);
        break;
      case "quarter":
        newDate.setMonth(newDate.getMonth() - 3);
        break;
      case "month":
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case "week":
        newDate.setDate(newDate.getDate() - 7);
        break;
    }
    setCurrentDate(newDate);
  };

  const handleNextPeriod = () => {
    const newDate = new Date(currentDate);
    switch (calendarMode) {
      case "year":
        newDate.setFullYear(newDate.getFullYear() + 1);
        break;
      case "quarter":
        newDate.setMonth(newDate.getMonth() + 3);
        break;
      case "month":
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case "week":
        newDate.setDate(newDate.getDate() + 7);
        break;
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getCurrentQuarter = () => {
    return Math.floor(currentDate.getMonth() / 3) + 1;
  };

  return (
    <ScreenContainer className="p-0 flex-1">
      <CalendarHeader
        mode={calendarMode}
        onModeChange={setCalendarMode}
        currentDate={currentDate}
        onPreviousPeriod={handlePreviousPeriod}
        onNextPeriod={handleNextPeriod}
        onToday={handleToday}
      />

      {/* Содержимое календаря */}
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {calendarMode === "month" && (
          <View className="px-2">
            {/* День недели с номерами недель */}
            <View className="flex-row mb-4 mt-4">
              <View className="w-10 items-center py-2">
                <Text className="text-xs text-muted font-semibold">Нед</Text>
              </View>
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day, index) => (
                <View key={index} className="flex-1 items-center py-2">
                  <Text className="text-sm font-bold text-foreground">{day}</Text>
                </View>
              ))}
            </View>

            {/* Календарь - распределено по неделям */}
            {Array.from({ length: Math.ceil((daysInMonth + firstDay) / 7) }).map((_, weekIndex) => {
              const weekStart = weekIndex * 7;
              const weekDays = [];
              let weekNumber = 0;
              let hasCurrentDay = false;
              const today = new Date();

              for (let i = 0; i < 7; i++) {
                const dayIndex = weekStart + i;
                if (dayIndex < firstDay) {
                  // Пустой день до начала месяца
                  weekDays.push(null);
                } else if (dayIndex - firstDay < daysInMonth) {
                  // День месяца
                  const day = dayIndex - firstDay + 1;
                  weekNumber = Math.ceil((day + firstDay) / 7);
                  
                  // Проверяем, есть ли в этой неделе сегодняшний день
                  if (day === today.getDate() && 
                      currentDate.getMonth() === today.getMonth() && 
                      currentDate.getFullYear() === today.getFullYear()) {
                    hasCurrentDay = true;
                  }
                  
                  weekDays.push(day);
                } else {
                  // Пустой день после конца месяца
                  weekDays.push(null);
                }
              }

              return (
                <View key={weekIndex} className="flex-row mb-2">
                  {/* Номер недели */}
                  <View className="w-10 items-center justify-center py-2">
                    <Text className="text-xs text-muted font-semibold">{weekNumber}</Text>
                  </View>
                  
                  {/* Дни недели с подсветкой текущей недели */}
                  <View 
                    className="flex-1 flex-row rounded-lg"
                    style={{
                      backgroundColor: hasCurrentDay ? colors.primary + "08" : "transparent",
                      paddingHorizontal: 4,
                    }}
                  >
                    {weekDays.map((day, dayIndex) => {
                    if (day === null) {
                      return <View key={`empty-${dayIndex}`} className="flex-1 aspect-square" />;
                    }

                    const dayInfo = getDayType(day);
                    const colors_info = getTypeColor(dayInfo);

                    const isToday = day === today.getDate() && 
                                   currentDate.getMonth() === today.getMonth() && 
                                   currentDate.getFullYear() === today.getFullYear();

                    return (
                      <TouchableOpacity
                        key={day}
                        className="flex-1 aspect-square items-center justify-center rounded-lg mx-0.5 mb-0.5"
                        style={{
                          backgroundColor: colors_info.bg,
                          borderWidth: isToday ? 3 : 1.5,
                          borderColor: isToday ? colors.primary : colors_info.border,
                          minHeight: 56,
                          shadowColor: isToday ? colors.primary : 'transparent',
                          shadowOffset: isToday ? { width: 0, height: 0 } : { width: 0, height: 0 },
                          shadowOpacity: isToday ? 0.3 : 0,
                          shadowRadius: isToday ? 4 : 0,
                          elevation: isToday ? 4 : 0,
                        }}
                        onPress={() => handleDayPress(day)}
                        onLongPress={() => handleDayLongPress(day)}
                      >
                        <Text className="text-base font-bold text-foreground">{day}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {calendarMode === "week" && (
          <WeekCalendarView
            currentDate={currentDate}
            onPreviousWeek={() => handlePreviousPeriod()}
            onNextWeek={() => handleNextPeriod()}
            holidays={holidays}
            vacationPeriods={vacationPeriods}
            onDayPress={handleDayPress}
          />
        )}

        {calendarMode === "quarter" && (
          <QuarterCalendarView
            currentYear={currentDate.getFullYear()}
            currentQuarter={Math.floor(currentDate.getMonth() / 3) + 1}
            onPreviousQuarter={() => handlePreviousPeriod()}
            onNextQuarter={() => handleNextPeriod()}
            holidays={holidays}
            vacationPeriods={vacationPeriods}
            onMonthPress={(month) => {
              setCurrentDate(new Date(currentDate.getFullYear(), month - 1));
              setCalendarMode("month");
            }}
          />
        )}

        {calendarMode === "year" && (
          <YearCalendarView
            currentYear={currentDate.getFullYear()}
            onPreviousYear={() => handlePreviousPeriod()}
            onNextYear={() => handleNextPeriod()}
            holidays={holidays}
            vacationPeriods={vacationPeriods}
            onMonthPress={(month) => {
              setCurrentDate(new Date(currentDate.getFullYear(), month - 1));
              setCalendarMode("month");
            }}
          />
        )}

        {/* Статистика периода */}
        {periodStats && <CalendarStatsCards stats={periodStats} mode={calendarMode} />}

        {/* Легенда */}
        <View className="mt-8 mx-4 p-4 rounded-lg border border-border mb-6" style={{ backgroundColor: colors.surface }}>
          <Text className="text-sm font-semibold text-foreground mb-4">Легенда</Text>

          <View className="flex-row items-center mb-3">
            <View
              className="w-5 h-5 rounded"
              style={{
                backgroundColor: colors.success + "20",
                borderWidth: 1.5,
                borderColor: colors.success,
              }}
            />
            <Text className="text-xs text-foreground ml-3">Рабочий день</Text>
          </View>

          <View className="flex-row items-center mb-3">
            <View
              className="w-5 h-5 rounded"
              style={{
                backgroundColor: colors.muted + "20",
                borderWidth: 1.5,
                borderColor: colors.muted,
              }}
            />
            <Text className="text-xs text-foreground ml-3">Выходной (Сб, Вс)</Text>
          </View>

          <View className="flex-row items-center mb-3">
            <View
              className="w-5 h-5 rounded"
              style={{
                backgroundColor: colors.error + "20",
                borderWidth: 1.5,
                borderColor: colors.error,
              }}
            />
            <Text className="text-xs text-foreground ml-3">Праздничный день</Text>
          </View>

          <View className="flex-row items-center mb-3">
            <View
              className="w-5 h-5 rounded"
              style={{
                backgroundColor: colors.primary + "20",
                borderWidth: 1.5,
                borderColor: colors.primary,
              }}
            />
            <Text className="text-xs text-foreground ml-3">Отпуск</Text>
          </View>

          <View className="flex-row items-center mb-3">
            <View
              className="w-5 h-5 rounded"
              style={{
                backgroundColor: colors.warning + "20",
                borderWidth: 1.5,
                borderColor: colors.warning,
              }}
            />
            <Text className="text-xs text-foreground ml-3">Больничный лист</Text>
          </View>

          <View className="flex-row items-center">
            <View
              className="w-5 h-5 rounded"
              style={{
                backgroundColor: colors.warning + "30",
                borderWidth: 2,
                borderColor: colors.warning,
                borderStyle: "dashed",
              }}
            />
            <Text className="text-xs text-foreground ml-3">Требует проверки (нет данных)</Text>
          </View>
        </View>
      </ScrollView>

      {/* Модальные окна */}
      <AddVacationModal
        visible={modalVisible}
        selectedDate={selectedDate}
        onClose={() => setModalVisible(false)}
        onAddVacation={handleAddVacation}
      />

      <EditVacationModal
        visible={editModalVisible}
        period={selectedPeriod}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedPeriod(null);
        }}
        onUpdate={handleUpdateVacation}
        onDelete={handleDeleteVacation}
      />

      <DayDetailModal
        visible={dayDetailVisible}
        date={selectedDayForDetail}
        dayType={selectedDayType}
        vacationType={selectedDayVacationType}
        onClose={() => {
          setDayDetailVisible(false);
          setSelectedDayForDetail(null);
        }}
      />

      {/* Обработчик конфликтов синхронизации */}
      <SyncConflictHandler
        visible={visible}
        conflicts={conflicts}
        onResolve={resolveConflict}
        onClose={() => setVisible(false)}
      />
    </ScreenContainer>
  );
}
