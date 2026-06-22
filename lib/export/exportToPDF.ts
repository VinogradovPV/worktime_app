import { ReportPeriodStats, ReportDayStats } from '@/lib/storage/reportStatsService';
import * as FileSystem from 'expo-file-system/legacy';
import { Share } from 'react-native';

// Расширенный интерфейс для экспорта с датами
interface ExportStats extends ReportPeriodStats {
  startDate?: string;
  endDate?: string;
}

/**
 * Генерирует HTML содержимое для PDF
 */
function generateHTMLContent(stats: ExportStats, dayStats: ReportDayStats[]): string {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Отчет о рабочем времени</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            border-bottom: 2px solid #0a7ea4;
            padding-bottom: 10px;
        }
        h2 {
            color: #0a7ea4;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        .info-section {
            background-color: #f9f9f9;
            padding: 15px;
            border-left: 4px solid #0a7ea4;
            margin-bottom: 20px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #eee;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .label {
            font-weight: bold;
            color: #333;
        }
        .value {
            color: #666;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        th {
            background-color: #0a7ea4;
            color: white;
            padding: 10px;
            text-align: left;
            font-weight: bold;
        }
        td {
            padding: 8px 10px;
            border-bottom: 1px solid #ddd;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .workday { background-color: #e8f5e9; }
        .weekend { background-color: #f3e5f5; }
        .holiday { background-color: #ffebee; }
        .vacation { background-color: #e3f2fd; }
        .warning {
            color: #ff9800;
            font-weight: bold;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #999;
            font-size: 12px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Отчет о рабочем времени</h1>
        
        <div class="info-section">
            <div class="info-row">
                <span class="label">Период:</span>
                <span class="value">${formatDateRange(stats)}</span>
            </div>
            <div class="info-row">
                <span class="label">Всего дней:</span>
                <span class="value">${stats.totalDays}</span>
            </div>
            <div class="info-row">
                <span class="label">Рабочих дней:</span>
                <span class="value">${stats.workdaysInCalendar}</span>
            </div>
            <div class="info-row">
                <span class="label">Дней с данными:</span>
                <span class="value">${stats.workedDays}</span>
            </div>
            <div class="info-row">
                <span class="label">Требуют проверки:</span>
                <span class="value warning">${stats.requiresCheckDays}</span>
            </div>
        </div>

        <h2>⏱️ Статистика времени</h2>
        <div class="info-section">
            <div class="info-row">
                <span class="label">Всего отработано:</span>
                <span class="value">${formatTime(stats.totalWorkedMs)}</span>
            </div>
            <div class="info-row">
                <span class="label">Среднее в день:</span>
                <span class="value">${formatTime(stats.averageWorkedMs)}</span>
            </div>
            <div class="info-row">
                <span class="label">Всего перерывов:</span>
                <span class="value">${formatTime(stats.totalBreakMs)}</span>
            </div>
            <div class="info-row">
                <span class="label">Всего выходов:</span>
                <span class="value">${formatTime(stats.totalTemporaryExitMs)}</span>
            </div>
            <div class="info-row">
                <span class="label">95% норма:</span>
                <span class="value">${formatTime(stats.totalWork95Ms)}</span>
            </div>
        </div>

        <h2>📅 Статистика по типам дней</h2>
        <div class="info-section">
            <div class="info-row">
                <span class="label">Выходные:</span>
                <span class="value">${stats.weekends}</span>
            </div>
            <div class="info-row">
                <span class="label">Праздники:</span>
                <span class="value">${stats.holidays}</span>
            </div>
            <div class="info-row">
                <span class="label">Отпуск:</span>
                <span class="value">${stats.vacationDays}</span>
            </div>
        </div>

        <h2>📋 Детальная статистика по дням</h2>
        <table>
            <thead>
                <tr>
                    <th>Дата</th>
                    <th>День недели</th>
                    <th>Тип дня</th>
                    <th>Отработано</th>
                    <th>Перерывы</th>
                    <th>Выходы</th>
                    <th>95% норма</th>
                    <th>Статус</th>
                </tr>
            </thead>
            <tbody>
                ${dayStats
                  .map((day) => {
                    const date = new Date(day.date);
                    const dayName = getDayName(date.getDay());
                    const dayType = getDayTypeLabel(day.dayType);
                    const rowClass = day.dayType.replace(/_/g, '');
                    const status = day.requiresCheck ? '<span class="warning">⚠️ Требует проверки</span>' : '✓';

                    return `
                    <tr class="${rowClass}">
                        <td>${day.date}</td>
                        <td>${dayName}</td>
                        <td>${dayType}</td>
                        <td>${formatTime(day.workedMs)}</td>
                        <td>${formatTime(day.breakMs)}</td>
                        <td>${formatTime(day.temporaryExitMs)}</td>
                        <td>${formatTime(day.work95Ms)}</td>
                        <td>${status}</td>
                    </tr>
                    `;
                  })
                  .join('')}
            </tbody>
        </table>

        <div class="footer">
            <p>Отчет сгенерирован: ${new Date().toLocaleString('ru-RU')}</p>
            <p>Приложение Worktime - Система учета рабочего времени</p>
        </div>
    </div>
</body>
</html>
  `;

  return htmlContent;
}

/**
 * Экспортирует отчет в PDF формат (через HTML)
 */
export async function exportReportToPDF(
  stats: ExportStats,
  dayStats: ReportDayStats[],
  fileName: string = 'report.pdf'
): Promise<string> {
  try {
    // Генерируем HTML содержимое
    const htmlContent = generateHTMLContent(stats, dayStats);

    // Сохраняем как HTML файл (можно открыть и сохранить как PDF)
    const filePath = `${FileSystem.documentDirectory}${fileName.replace('.pdf', '.html')}`;
    await FileSystem.writeAsStringAsync(filePath, htmlContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return filePath;
  } catch (error) {
    console.error('Ошибка при экспорте в PDF:', error);
    throw error;
  }
}

/**
 * Делится файлом через систему
 */
export async function sharePDFFile(filePath: string, fileName: string = 'report.pdf'): Promise<void> {
  try {
    // Открываем диалог расположения
    await Share.share({
      title: 'Отчет о рабочем времени',
      message: 'Отчет о рабочем времени',
      url: filePath,
    });
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
    await FileSystem.deleteAsync(filePath);
  } catch (error) {
    console.error('Ошибка при удалении файла:', error);
  }
}

/**
 * Форматирует диапазон дат
 */
function formatDateRange(stats: ExportStats): string {
  const start = new Date(stats.startDate || new Date());
  const end = new Date(stats.endDate || new Date());

  const startStr = start.toLocaleDateString('ru-RU');
  const endStr = end.toLocaleDateString('ru-RU');

  return `${startStr} - ${endStr}`;
}

/**
 * Форматирует время в строку
 */
function formatTime(ms: number): string {
  const hours = Math.floor(ms / (1000 * 3600));
  const minutes = Math.floor((ms % (1000 * 3600)) / (1000 * 60));
  return `${hours}ч ${minutes}м`;
}

/**
 * Получает название дня недели
 */
function getDayName(dayOfWeek: number): string {
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  return days[dayOfWeek];
}

/**
 * Получает название типа дня
 */
function getDayTypeLabel(dayType: string): string {
  switch (dayType) {
    case 'workday':
      return 'Рабочий день';
    case 'weekend':
      return 'Выходной';
    case 'holiday':
      return 'Праздник';
    case 'vacation':
      return 'Отпуск';
    case 'shortened_workday':
      return 'Сокращенный день';
    default:
      return dayType;
  }
}
