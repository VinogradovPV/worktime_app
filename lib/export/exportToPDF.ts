import { ReportPeriodStats, ReportDayStats } from '@/lib/storage/reportStatsService';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

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
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 13px;
            color: #222;
            background: #fff;
            padding: 24px;
        }
        h1 {
            font-size: 20px;
            color: #0a7ea4;
            border-bottom: 2px solid #0a7ea4;
            padding-bottom: 8px;
            margin-bottom: 16px;
        }
        h2 {
            font-size: 14px;
            color: #0a7ea4;
            margin: 18px 0 8px 0;
        }
        .info-section {
            background: #f7fbfd;
            border-left: 4px solid #0a7ea4;
            padding: 10px 14px;
            margin-bottom: 12px;
            border-radius: 0 6px 6px 0;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            border-bottom: 1px solid #e8f4f8;
        }
        .info-row:last-child { border-bottom: none; }
        .label { font-weight: bold; color: #333; }
        .value { color: #555; }
        .warning { color: #e65100; font-weight: bold; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 11px;
        }
        th {
            background: #0a7ea4;
            color: #fff;
            padding: 7px 8px;
            text-align: left;
            font-weight: bold;
        }
        td { padding: 6px 8px; border-bottom: 1px solid #e0e0e0; }
        tr:nth-child(even) td { background: #f9f9f9; }
        .workday td { background: #e8f5e9 !important; }
        .weekend td { background: #f3e5f5 !important; }
        .holiday td { background: #ffebee !important; }
        .vacation td { background: #e3f2fd !important; }
        .footer {
            margin-top: 24px;
            padding-top: 12px;
            border-top: 1px solid #ddd;
            color: #999;
            font-size: 11px;
            text-align: center;
        }
    </style>
</head>
<body>
    <h1>📊 Отчёт о рабочем времени</h1>

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
            <span class="label">Рабочих дней по календарю:</span>
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
            <span class="label">Всего временных выходов:</span>
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
                <th>День</th>
                <th>Тип</th>
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
                const rowClass = day.dayType === 'shortened_workday' ? 'workday' : day.dayType.replace(/_/g, '');
                const status = day.requiresCheck ? '<span class="warning">⚠️</span>' : '✓';

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
        <p>Отчёт сгенерирован: ${new Date().toLocaleString('ru-RU')}</p>
        <p>Worktime — Система учёта рабочего времени</p>
    </div>
</body>
</html>
  `;

  return htmlContent;
}

/**
 * Экспортирует отчёт в настоящий PDF через expo-print
 */
export async function exportReportToPDF(
  stats: ExportStats,
  dayStats: ReportDayStats[],
  fileName: string = 'report.pdf'
): Promise<string> {
  try {
    const htmlContent = generateHTMLContent(stats, dayStats);

    // Генерируем PDF через expo-print (работает на iOS и Android)
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    // Перемещаем в documentDirectory с нужным именем
    const destPath = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.moveAsync({ from: uri, to: destPath });

    return destPath;
  } catch (error) {
    console.error('Ошибка при экспорте в PDF:', error);
    throw error;
  }
}

/**
 * Делится PDF-файлом через системный share sheet
 */
export async function sharePDFFile(filePath: string, fileName: string = 'report.pdf'): Promise<void> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();

    if (isAvailable) {
      // Используем expo-sharing для нативного share sheet (iOS + Android)
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/pdf',
        dialogTitle: 'Поделиться отчётом',
        UTI: 'com.adobe.pdf', // iOS UTI для PDF
      });
    } else {
      // Fallback для web/simulator
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
    case 'workday': return 'Рабочий';
    case 'weekend': return 'Выходной';
    case 'holiday': return 'Праздник';
    case 'vacation': return 'Отпуск';
    case 'shortened_workday': return 'Сокращённый';
    default: return dayType;
  }
}
