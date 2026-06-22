import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ProductionCalendarDay {
  date: string; // YYYY-MM-DD
  dayType: 'workday' | 'weekend' | 'holiday' | 'shortened_workday';
  isShortened: boolean;
  isTransferred: boolean;
  holidayName?: string;
}

export interface ProductionCalendar {
  year: number;
  days: ProductionCalendarDay[];
  totalWorkdays: number;
  totalHolidays: number;
  importedAt: string;
}

const STORAGE_KEY = 'production_calendar_2026';

/**
 * Преобразует CSV данные производственного календаря в структурированный формат
 */
export function parseProductionCalendarCSV(csvData: string): ProductionCalendar {
  const lines = csvData.trim().split('\n');
  const header = lines[0].split(',');
  const data = lines[1].split(',');

  const days: ProductionCalendarDay[] = [];

  // Месяцы и их количество дней в 2026 году
  const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  // Парсим рабочие дни для каждого месяца
  const workdaysByMonth: Set<number>[] = [];
  for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
    const daysStr = data[monthIdx + 1];
    const workdays = new Set<number>();

    if (daysStr) {
      const dayStrings = daysStr.split(';');
      for (const dayStr of dayStrings) {
        const cleanDay = dayStr.trim().replace(/[+*]/g, '');
        if (cleanDay) {
          workdays.add(parseInt(cleanDay, 10));
        }
      }
    }

    workdaysByMonth.push(workdays);
  }

  // Создаем записи для каждого дня года
  for (let month = 1; month <= 12; month++) {
    const daysInMonth = monthDays[month - 1];
    const workdaysInMonth = workdaysByMonth[month - 1];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

      // Определяем тип дня
      let dayType: 'workday' | 'weekend' | 'holiday' | 'shortened_workday' = 'workday';
      let isShortened = false;
      let isTransferred = false;

      // Проверяем, является ли день выходным (суббота или воскресенье)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        dayType = 'weekend';
      } else if (workdaysInMonth.has(day)) {
        // День в списке рабочих дней
        dayType = 'workday';
      } else {
        // День не в списке рабочих дней и не выходной - это праздник
        dayType = 'holiday';
      }

      days.push({
        date: dateStr,
        dayType,
        isShortened,
        isTransferred,
      });
    }
  }

  const totalWorkdays = parseInt(data[13], 10);
  const totalHolidays = parseInt(data[14], 10);

  return {
    year: 2026,
    days,
    totalWorkdays,
    totalHolidays,
    importedAt: new Date().toISOString(),
  };
}

/**
 * Сохраняет производственный календарь в локальное хранилище
 */
export async function saveProductionCalendar(calendar: ProductionCalendar): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(calendar));
  } catch (error) {
    console.error('Ошибка при сохранении производственного календаря:', error);
    throw error;
  }
}

/**
 * Получает производственный календарь из локального хранилища
 */
export async function getProductionCalendar(): Promise<ProductionCalendar | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Ошибка при получении производственного календаря:', error);
    return null;
  }
}

/**
 * Получает тип дня по дате
 */
export async function getDayType(date: Date): Promise<'workday' | 'weekend' | 'holiday' | 'shortened_workday' | null> {
  const calendar = await getProductionCalendar();
  if (!calendar) return null;

  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const day = calendar.days.find(d => d.date === dateStr);

  return day ? day.dayType : null;
}

/**
 * Проверяет, является ли день рабочим
 */
export async function isWorkday(date: Date): Promise<boolean> {
  const dayType = await getDayType(date);
  return dayType === 'workday' || dayType === 'shortened_workday';
}

/**
 * Получает количество рабочих дней в диапазоне дат
 */
export async function getWorkdaysInRange(startDate: Date, endDate: Date): Promise<number> {
  const calendar = await getProductionCalendar();
  if (!calendar) return 0;

  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
    const day = calendar.days.find(d => d.date === dateStr);

    if (day && (day.dayType === 'workday' || day.dayType === 'shortened_workday')) {
      count++;
    }

    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Получает все дни определенного типа в диапазоне дат
 */
export async function getDaysOfTypeInRange(
  startDate: Date,
  endDate: Date,
  dayType: 'workday' | 'weekend' | 'holiday' | 'shortened_workday'
): Promise<Date[]> {
  const calendar = await getProductionCalendar();
  if (!calendar) return [];

  const result: Date[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
    const day = calendar.days.find(d => d.date === dateStr);

    if (day && day.dayType === dayType) {
      result.push(new Date(current));
    }

    current.setDate(current.getDate() + 1);
  }

  return result;
}
