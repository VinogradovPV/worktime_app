import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type CalendarMode = "month" | "week" | "quarter" | "year";

interface CalendarHeaderProps {
  mode: CalendarMode;
  onModeChange: (mode: CalendarMode) => void;
  currentDate: Date;
  onPreviousPeriod: () => void;
  onNextPeriod: () => void;
  onToday: () => void;
}

export function CalendarHeader({
  mode,
  onModeChange,
  currentDate,
  onPreviousPeriod,
  onNextPeriod,
  onToday,
}: CalendarHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const getPeriodLabel = (): string => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = [
      "Январь",
      "Февраль",
      "Март",
      "Апрель",
      "Май",
      "Июнь",
      "Июль",
      "Август",
      "Сентябрь",
      "Октябрь",
      "Ноябрь",
      "Декабрь",
    ];

    switch (mode) {
      case "year":
        return year.toString();

      case "quarter": {
        const quarter = Math.floor(month / 3) + 1;
        return `Q${quarter} ${year}`;
      }

      case "month":
        return `${monthNames[month]} ${year}`;

      case "week": {
        // Найти начало недели (понедельник)
        const date = new Date(currentDate);
        const dayOfWeek = date.getDay();
        const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const startOfWeek = new Date(date.setDate(diff));

        // Конец недели (воскресенье)
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const startMonth = monthNames[startOfWeek.getMonth()];
        const endMonth = monthNames[endOfWeek.getMonth()];
        const startDay = startOfWeek.getDate();
        const endDay = endOfWeek.getDate();

        if (startMonth === endMonth) {
          return `${startDay} – ${endDay} ${startMonth.toLowerCase()}`;
        } else {
          return `${startDay} ${startMonth.toLowerCase()} – ${endDay} ${endMonth.toLowerCase()}`;
        }
      }

      default:
        return "";
    }
  };

  const getModeButtonStyle = (buttonMode: CalendarMode) => {
    const isActive = mode === buttonMode;
    return {
      backgroundColor: isActive ? colors.primary : colors.surface,
      borderColor: isActive ? colors.primary : colors.border,
    };
  };

  const getModeButtonTextStyle = (buttonMode: CalendarMode) => {
    const isActive = mode === buttonMode;
    return {
      color: isActive ? colors.background : colors.foreground,
    };
  };

  return (
    <View style={{ paddingTop: insets.top }}>
      {/* Заголовок */}
      <View className="px-4 py-3">
        <Text className="text-lg font-bold text-foreground">Календарь</Text>
      </View>

      {/* Переключатель режимов */}
      <View className="px-4 pb-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => onModeChange("year")}
            className="px-4 py-2 rounded-lg border"
            style={getModeButtonStyle("year")}
          >
            <Text className="text-sm font-semibold" style={getModeButtonTextStyle("year")}>
              Год
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onModeChange("quarter")}
            className="px-4 py-2 rounded-lg border"
            style={getModeButtonStyle("quarter")}
          >
            <Text className="text-sm font-semibold" style={getModeButtonTextStyle("quarter")}>
              Квартал
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onModeChange("month")}
            className="px-4 py-2 rounded-lg border"
            style={getModeButtonStyle("month")}
          >
            <Text className="text-sm font-semibold" style={getModeButtonTextStyle("month")}>
              Месяц
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onModeChange("week")}
            className="px-4 py-2 rounded-lg border"
            style={getModeButtonStyle("week")}
          >
            <Text className="text-sm font-semibold" style={getModeButtonTextStyle("week")}>
              Неделя
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Навигация и период */}
      <View className="px-4 pb-4 flex-row justify-between items-center gap-3">
        <TouchableOpacity onPress={onPreviousPeriod} className="p-2">
          <Text className="text-2xl text-primary font-bold">←</Text>
        </TouchableOpacity>

        <View className="flex-1 items-center">
          <Text className="text-lg font-semibold text-foreground capitalize">{getPeriodLabel()}</Text>
        </View>

        <TouchableOpacity onPress={onNextPeriod} className="p-2">
          <Text className="text-2xl text-primary font-bold">→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onToday}
          className="px-3 py-2 rounded-lg"
          style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
        >
          <Text className="text-xs font-semibold text-foreground">Сегодня</Text>
        </TouchableOpacity>
      </View>

      {/* Разделитель */}
      <View style={{ height: 1, backgroundColor: colors.border }} />
    </View>
  );
}
