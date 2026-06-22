import { ReportPeriodStats, ReportDayStats } from '@/lib/storage/reportStatsService';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

// Расширенный интерфейс для экспорта с датами
interface ExportStats extends ReportPeriodStats {
  startDate?: string;
  endDate?: string;
}

/**
 * Экспортирует отчёт в CSV формат
 */
export async function exportReportToCSV(
  stats: ExportStats,
  dayStats: ReportDayStats[],
  fileName: string = 'report.csv'
): Promise<string> {
  try {
    const csvContent = generateCSVContent(stats, dayStats);

    // Добавляем BOM для корректного отображения кириллицы в Excel
    const bom = '\uFEFF';
    const filePath = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, bom + csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return filePath;
  } catch (error) {
    console.error('Ошибка при экспорте в CSV:', error);
    throw error;
  }
}

/**
 * Генерирует содержимое CSV файла
 */
function generateCSVContent(stats: ExportStats, dayStats: ReportDayStats[]): string {
  const lines: string[] = [];

  // Заголовок
  lines.push('Отчёт о рабочем времени');
  lines.push('');

  // Информация о периоде
  lines.push(`Период;${formatDateRange(stats)}`);
  lines.push(`Всего дней;${stats.totalDays}`);
  lines.push(`Рабочих дней по календарю;${stats.workdaysInCalendar}`);
  lines.push(`Дней с данными;${stats.workedDays}`);
  lines.push(`Требуют проверки;${stats.requiresCheckDays}`);
  lines.push('');

  // Статистика времени
  lines.push('СТАТИСТИКА ВРЕМЕНИ');
  lines.push(`Всего отработано;${formatTime(stats.totalWorkedMs)}`);
  lines.push(`Среднее в день;${formatTime(stats.averageWorkedMs)}`);
  lines.push(`Всего перерывов;${formatTime(stats.totalBreakMs)}`);
  lines.push(`Всего временных выходов;${formatTime(stats.totalTemporaryExitMs)}`);
  lines.push(`95% норма;${formatTime(stats.totalWork95Ms)}`);
  lines.push('');

  // Статистика по типам дней
  lines.push('СТАТИСТИКА ПО ТИПАМ ДНЕЙ');
  lines.push(`Выходные;${stats.weekends}`);
  lines.push(`Праздники;${stats.holidays}`);
  lines.push(`Отпуск;${stats.vacationDays}`);
  lines.push('');

  // Детальная таблица
  lines.push('ДЕТАЛЬНАЯ СТАТИСТИКА ПО ДНЯМ');
  lines.push('Дата;День недели;Тип дня;Отработано;Перерывы;Временные выходы;95% норма;Требует проверки');

  for (const day of dayStats) {
    const date = new Date(day.date);
    const dayName = getDayName(date.getDay());
    const dayType = getDayTypeLabel(day.dayType);
    const requiresCheck = day.requiresCheck ? 'Да' : 'Нет';

    lines.push(
      [
        day.date,
        dayName,
        dayType,
        formatTime(day.workedMs),
        formatTime(day.breakMs),
        formatTime(day.temporaryExitMs),
        formatTime(day.work95Ms),
        requiresCheck,
      ].join(';')
    );
  }

  lines.push('');
  lines.push(`Отчёт сгенерирован;${new Date().toLocaleString('ru-RU')}`);

  return lines.join('\r\n');
}

/**
 * Делится CSV-файлом через системный share sheet
 */
export async function shareCSVFile(filePath: string, fileName: string = 'report.csv'): Promise<void> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();

    if (isAvailable) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/csv',
        dialogTitle: 'Поделиться отчётом',
        UTI: 'public.comma-separated-values-text', // iOS UTI для CSV
      });
    } else {
      // Fallback для web/simulator — выводим содержимое в консоль
      console.warn('Sharing недоступен на этой платформе');
    }
  } catch (error) {
    console.error('Ошибка при попытке поделиться файлом:', error);
    throw error;
  }
}

/**
 * Удаляет файл экспорта
 */
export async function deleteExportFile(filePath: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(filePath, { idempotent: true });
  } catch (error) {
    console.error('Ошибка при удалении файла:', error);
  }
}

/**
 * Получает список всех экспортированных CSV-файлов
 */
export async function getExportedFiles(): Promise<string[]> {
  try {
    const docDir = FileSystem.documentDirectory;
    if (!docDir) return [];
    const files = await FileSystem.readDirectoryAsync(docDir);
    return files.filter((file) => file.endsWith('.csv'));
  } catch (error) {
    console.error('Ошибка при получении списка файлов:', error);
    return [];
  }
}

// ─── Вспомогательные функции ──────────────────────────────────────────────────

function formatDateRange(stats: ExportStats): string {
  const start = new Date(stats.startDate || new Date());
  const end = new Date(stats.endDate || new Date());
  return `${start.toLocaleDateString('ru-RU')} — ${end.toLocaleDateString('ru-RU')}`;
}

function formatTime(ms: number): string {
  const hours = Math.floor(ms / (1000 * 3600));
  const minutes = Math.floor((ms % (1000 * 3600)) / (1000 * 60));
  return `${hours}ч ${minutes}м`;
}

function getDayName(dayOfWeek: number): string {
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  return days[dayOfWeek];
}

function getDayTypeLabel(dayType: string): string {
  switch (dayType) {
    case 'workday': return 'Рабочий день';
    case 'weekend': return 'Выходной';
    case 'holiday': return 'Праздник';
    case 'vacation': return 'Отпуск';
    case 'shortened_workday': return 'Сокращённый день';
    default: return dayType;
  }
}
