import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { getProductionCalendar, getVacationPeriods, addVacationPeriod, removeVacationPeriod } from "@/lib/storage/notificationSettings";
import { AddVacationModal } from "@/components/AddVacationModal";
import { EditVacationModal } from "@/components/EditVacationModal";
import { DayDetailModal } from "@/components/DayDetailModal";
import { WeekCalendarView } from "@/components/WeekCalendarView";
import { YearCalendarView } from "@/components/YearCalendarView";
import { QuarterCalendarView } from "@/components/QuarterCalendarView";

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

  useEffect(() => {
    loadCalendarData();
  }, [currentDate]);

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

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (year: number, month: number, day: number): string => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const isWeekend = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0 = воскресенье, 6 = суббота
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

  const monthName = currentDate.toLocaleString("ru-RU", { month: "long", year: "numeric" });

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const previousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const previousQuarter = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() - 3);
    setCurrentDate(newDate);
  };

  const nextQuarter = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + 3);
    setCurrentDate(newDate);
  };

  const previousYear = () => {
    setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth()));
  };

  const nextYear = () => {
    setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth()));
  };

  const getCurrentQuarter = () => {
    return Math.floor(currentDate.getMonth() / 3) + 1;
  };

  const handleDayPress = (day: number | Date) => {
    let date: Date;

    if (typeof day === "number") {
      date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    } else {
      date = day;
    }

    // Показываем детали дня
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
    } catch (error) {
      console.error("Ошибка при обновлении периода:", error);
      throw error;
    }
  };

  const handleDeleteVacation = async (periodId: string) => {
    try {
      await removeVacationPeriod(periodId);
      await loadCalendarData();
    } catch (error) {
      console.error("Ошибка при удалении периода:", error);
      throw error;
    }
  };

  const getModeButtonStyle = (mode: CalendarMode) => {
    const isActive = calendarMode === mode;
    return {
      backgroundColor: isActive ? colors.primary : colors.surface,
      borderColor: isActive ? colors.primary : colors.border,
    };
  };

  const getModeButtonTextStyle = (mode: CalendarMode) => {
    const isActive = calendarMode === mode;
    return {
      color: isActive ? colors.background : colors.foreground,
    };
  };

  return (
    <ScreenContainer className="p-0">
      {/* Переключатель режимов */}
      <View className="flex-row px-4 pt-4 pb-2 gap-2 justify-center">
        <TouchableOpacity
          onPress={() => setCalendarMode("week")}
          className="px-4 py-2 rounded-lg border"
          style={getModeButtonStyle("week")}
        >
          <Text className="text-xs font-semibold" style={getModeButtonTextStyle("week")}>
            Неделя
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setCalendarMode("month")}
          className="px-4 py-2 rounded-lg border"
          style={getModeButtonStyle("month")}
        >
          <Text className="text-xs font-semibold" style={getModeButtonTextStyle("month")}>
            Месяц
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setCalendarMode("quarter")}
          className="px-4 py-2 rounded-lg border"
          style={getModeButtonStyle("quarter")}
        >
          <Text className="text-xs font-semibold" style={getModeButtonTextStyle("quarter")}>
            Квартал
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setCalendarMode("year")}
          className="px-4 py-2 rounded-lg border"
          style={getModeButtonStyle("year")}
        >
          <Text className="text-xs font-semibold" style={getModeButtonTextStyle("year")}>
            Год
          </Text>
        </TouchableOpacity>
      </View>

      {/* Содержимое календаря */}
      <View className="flex-1">
        {calendarMode === "month" && (
          <ScrollView showsVerticalScrollIndicator={false} className="px-4">
            {/* Навигация по месяцам */}
            <View className="flex-row justify-between items-center mb-6 pt-4">
              <TouchableOpacity onPress={previousMonth}>
                <Text className="text-2xl text-primary font-bold">←</Text>
              </TouchableOpacity>
              <Text className="text-2xl font-bold text-foreground capitalize">{monthName}</Text>
              <TouchableOpacity onPress={nextMonth}>
                <Text className="text-2xl text-primary font-bold">→</Text>
              </TouchableOpacity>
            </View>

            {/* День недели */}
            <View className="flex-row mb-2">
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day, index) => (
                <View key={index} className="flex-1 items-center py-2">
                  <Text className="text-xs font-semibold text-muted">{day}</Text>
                </View>
              ))}
            </View>

            {/* Календарь */}
            <View className="flex-row flex-wrap">
              {/* Пустые дни в начале месяца */}
              {emptyDays.map((_, index) => (
                <View key={`empty-${index}`} className="w-1/7 aspect-square" />
              ))}

              {/* Дни месяца */}
              {days.map((day) => {
                const dayInfo = getDayType(day);
                const colors_info = getTypeColor(dayInfo);

                return (
                  <TouchableOpacity
                    key={day}
                    className="w-1/7 aspect-square items-center justify-center rounded-lg mb-1 mx-0.5"
                    style={{
                      backgroundColor: colors_info.bg,
                      borderWidth: 1.5,
                      borderColor: colors_info.border,
                    }}
                    onPress={() => handleDayPress(day)}
                    onLongPress={() => handleDayLongPress(day)}
                  >
                    <View className="items-center justify-center">
                      <Text className="text-sm font-semibold text-foreground">{day}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Легенда */}
            <View className="mt-8 p-4 rounded-lg border border-border mb-6" style={{ backgroundColor: colors.surface }}>
              <Text className="text-sm font-semibold text-foreground mb-4">Легенда</Text>

              {/* Рабочий день */}
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

              {/* Выходной */}
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

              {/* Праздничный день */}
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

              {/* Отпуск */}
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

              {/* Больничный */}
              <View className="flex-row items-center">
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
            </View>

            {/* Информация */}
            <View className="mt-6 p-4 rounded-lg mb-6" style={{ backgroundColor: colors.surface }}>
              <Text className="text-xs text-muted">
                Календарь показывает выходные дни (суббота и воскресенье), праздничные дни из загруженного производственного календаря и ваши периоды отпусков.
              </Text>
            </View>
          </ScrollView>
        )}

        {calendarMode === "week" && (
          <WeekCalendarView
            currentDate={currentDate}
            onPreviousWeek={previousWeek}
            onNextWeek={nextWeek}
            holidays={holidays}
            vacationPeriods={vacationPeriods}
            onDayPress={handleDayPress}
          />
        )}

        {calendarMode === "quarter" && (
          <QuarterCalendarView
            currentYear={currentDate.getFullYear()}
            currentQuarter={getCurrentQuarter()}
            onPreviousQuarter={previousQuarter}
            onNextQuarter={nextQuarter}
            holidays={holidays}
            vacationPeriods={vacationPeriods}
            onDayPress={handleDayPress}
          />
        )}

        {calendarMode === "year" && (
          <YearCalendarView
            currentYear={currentDate.getFullYear()}
            onPreviousYear={previousYear}
            onNextYear={nextYear}
            holidays={holidays}
            vacationPeriods={vacationPeriods}
            onMonthPress={(month) => {
              setCurrentDate(new Date(currentDate.getFullYear(), month - 1));
              setCalendarMode("month");
            }}
          />
        )}
      </View>

      {/* Модальное окно для добавления отпуска */}
      <AddVacationModal
        visible={modalVisible}
        selectedDate={selectedDate}
        onClose={() => setModalVisible(false)}
        onAddVacation={handleAddVacation}
      />

      {/* Модальное окно для редактирования отпуска */}
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

      {/* Модальное окно с деталями дня */}
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
    </ScreenContainer>
  );
}
