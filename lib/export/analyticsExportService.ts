import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
let Sharing: any = null;

try {
  Sharing = require('expo-sharing');
} catch (e) {
  console.warn('expo-sharing не доступен');
}
import { TrendData, WeeklyDistribution, PeriodComparison, Recommendation, formatWorkHours } from '@/lib/services/analyticsService';

interface AnalyticsReportData {
  period: string;
  trendData: TrendData[];
  weeklyDistribution: WeeklyDistribution[];
  comparison: PeriodComparison | null;
  recommendations: Recommendation[];
  generatedAt: string;
}

/**
 * Генерирует HTML для PDF отчета аналитики
 */
function generateAnalyticsHTML(data: AnalyticsReportData): string {
  const trendChartHTML = generateTrendChartHTML(data.trendData);
  const weeklyChartHTML = generateWeeklyChartHTML(data.weeklyDistribution);
  const comparisonChartHTML = data.comparison ? generateComparisonChartHTML(data.comparison) : '';
  const recommendationsHTML = generateRecommendationsHTML(data.recommendations);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          color: #11181C;
          background: #ffffff;
          padding: 40px;
          line-height: 1.6;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 2px solid #0a7ea4;
          padding-bottom: 20px;
        }
        .header h1 {
          font-size: 32px;
          color: #0a7ea4;
          margin-bottom: 10px;
        }
        .header p {
          color: #687076;
          font-size: 14px;
        }
        .section {
          margin-bottom: 40px;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 20px;
          font-weight: 600;
          color: #0a7ea4;
          margin-bottom: 20px;
          border-left: 4px solid #0a7ea4;
          padding-left: 12px;
        }
        .chart-container {
          background: #f5f5f5;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          text-align: center;
        }
        .chart-title {
          font-size: 14px;
          font-weight: 600;
          color: #11181C;
          margin-bottom: 10px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
        }
        .stat-card {
          background: #f5f5f5;
          border-radius: 8px;
          padding: 15px;
          border-left: 4px solid #0a7ea4;
        }
        .stat-label {
          font-size: 12px;
          color: #687076;
          margin-bottom: 5px;
        }
        .stat-value {
          font-size: 18px;
          font-weight: 600;
          color: #0a7ea4;
        }
        .recommendation {
          background: #f5f5f5;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 12px;
          border-left: 4px solid #0a7ea4;
        }
        .recommendation.high {
          border-left-color: #EF4444;
        }
        .recommendation.medium {
          border-left-color: #F59E0B;
        }
        .recommendation.low {
          border-left-color: #22C55E;
        }
        .recommendation-title {
          font-weight: 600;
          color: #11181C;
          margin-bottom: 5px;
          font-size: 14px;
        }
        .recommendation-priority {
          font-size: 11px;
          color: #687076;
          margin-bottom: 8px;
        }
        .recommendation-description {
          font-size: 12px;
          color: #687076;
          line-height: 1.5;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #E5E7EB;
          text-align: center;
          font-size: 12px;
          color: #687076;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #E5E7EB;
        }
        th {
          background: #f5f5f5;
          font-weight: 600;
          color: #11181C;
        }
        @media print {
          body {
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 Отчет об аналитике рабочего времени</h1>
        <p>Период: ${data.period}</p>
        <p>Создано: ${data.generatedAt}</p>
      </div>

      <div class="section">
        <div class="section-title">📈 Тренд рабочего времени</div>
        ${trendChartHTML}
      </div>

      <div class="section">
        <div class="section-title">📅 Распределение по дням недели</div>
        ${weeklyChartHTML}
      </div>

      ${comparisonChartHTML ? `
        <div class="section">
          <div class="section-title">📊 Сравнение периодов</div>
          ${comparisonChartHTML}
        </div>
      ` : ''}

      <div class="section">
        <div class="section-title">💡 Рекомендации по оптимизации</div>
        ${recommendationsHTML}
      </div>

      <div class="footer">
        <p>Этот отчет был автоматически создан приложением Worktime</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Генерирует HTML таблицы для тренда
 */
function generateTrendChartHTML(data: TrendData[]): string {
  if (data.length === 0) {
    return '<p style="color: #687076;">Нет данных для отображения</p>';
  }

  const tableRows = data.map(item => `
    <tr>
      <td>${item.date}</td>
      <td>${formatWorkHours(item.workedMs)}ч</td>
      <td>-</td>
      <td>-</td>
    </tr>
  `).join('');

  return `
    <table>
      <thead>
        <tr>
          <th>Дата</th>
          <th>Рабочее время</th>
          <th>Статус</th>
          <th>Примечание</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;
}

/**
 * Генерирует HTML таблицы для распределения по дням
 */
function generateWeeklyChartHTML(data: WeeklyDistribution[]): string {
  if (data.length === 0) {
    return '<p style="color: #687076;">Нет данных для отображения</p>';
  }

  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const tableRows = data.map((item, index) => `
    <tr>
      <td>${dayNames[index] || 'День'}</td>
      <td>${formatWorkHours(item.avgWorkedMs)}ч</td>
      <td>${item.dayCount} дней</td>
    </tr>
  `).join('');

  return `
    <table>
      <thead>
        <tr>
          <th>День недели</th>
          <th>Среднее время</th>
          <th>Дней</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;
}

/**
 * Генерирует HTML для сравнения периодов
 */
function generateComparisonChartHTML(data: PeriodComparison): string {
  const trendEmoji = data.trend === 'up' ? '📈' : data.trend === 'down' ? '📉' : '➡️';
  const trendText = data.trend === 'up' ? 'Рост' : data.trend === 'down' ? 'Снижение' : 'Стабильно';

  return `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Период 1: ${data.period1}</div>
        <div class="stat-value">${formatWorkHours(data.avgWork1)}ч</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Период 2: ${data.period2}</div>
        <div class="stat-value">${formatWorkHours(data.avgWork2)}ч</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Разница</div>
        <div class="stat-value">${data.difference >= 0 ? '+' : ''}${formatWorkHours(data.difference)}ч</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Тренд ${trendEmoji}</div>
        <div class="stat-value">${trendText} (${data.percentChange.toFixed(1)}%)</div>
      </div>
    </div>
  `;
}

/**
 * Генерирует HTML для рекомендаций
 */
function generateRecommendationsHTML(data: Recommendation[]): string {
  if (data.length === 0) {
    return '<p style="color: #687076;">✨ У вас нет рекомендаций. Ваш рабочий график оптимален!</p>';
  }

  const recommendationsHTML = data.map(rec => `
    <div class="recommendation ${rec.priority}">
      <div class="recommendation-title">${rec.icon} ${rec.title}</div>
      <div class="recommendation-priority">
        Приоритет: ${rec.priority === 'high' ? 'Высокий' : rec.priority === 'medium' ? 'Средний' : 'Низкий'}
      </div>
      <div class="recommendation-description">${rec.description}</div>
    </div>
  `).join('');

  return recommendationsHTML;
}

/**
 * Экспортирует аналитику в PDF
 */
export async function exportAnalyticsToPDF(data: AnalyticsReportData): Promise<void> {
  try {
    const html = generateAnalyticsHTML(data);
    const fileName = `analytics-${Date.now()}.pdf`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;

    // На веб-платформе используем встроенный механизм
    if (Platform.OS === 'web') {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName.replace('.pdf', '.html');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    // На нативных платформах сохраняем файл
    await FileSystem.writeAsStringAsync(filePath, html);

    // Делимся файлом
    try {
      if (Sharing && Sharing.isAvailableAsync) {
        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(filePath, {
            mimeType: 'application/pdf',
            dialogTitle: 'Поделиться отчетом аналитики',
          });
        }
      }
    } catch (error) {
      console.warn('Ошибка при поделении файла:', error);
    }
  } catch (error) {
    console.error('Ошибка при экспорте аналитики в PDF:', error);
    throw error;
  }
}

/**
 * Экспортирует аналитику в CSV
 */
export async function exportAnalyticsToCSV(data: AnalyticsReportData): Promise<void> {
  try {
    let csv = 'Отчет об аналитике рабочего времени\n';
    csv += `Период: ${data.period}\n`;
    csv += `Создано: ${data.generatedAt}\n\n`;

    // Тренд
    csv += 'Тренд рабочего времени\n';
    csv += 'Дата,Рабочее время (часы),Перерывы (часы),Эффективность (%)\n';
    data.trendData.forEach(item => {
      csv += `${item.date},${(item.workedMs / 3600000).toFixed(2)},0,0\n`;
    });

    csv += '\n\nРаспределение по дням недели\n';
    csv += 'День,Среднее время (часы),Количество дней\n';
    const dayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    data.weeklyDistribution.forEach((item, index) => {
      csv += `${dayNames[index]},${(item.avgWorkedMs / 3600000).toFixed(2)},${item.dayCount}\n`;
    });

    // Сохраняем файл
    const fileName = `analytics-${Date.now()}.csv`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(filePath, csv);

    // Делимся файлом
    try {
      if (Sharing && Sharing.isAvailableAsync) {
        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(filePath, {
            mimeType: 'text/csv',
            dialogTitle: 'Поделиться отчетом аналитики',
          });
        }
      }
    } catch (error) {
      console.warn('Ошибка при поделении файла:', error);
    }
  } catch (error) {
    console.error('Ошибка при экспорте аналитики в CSV:', error);
    throw error;
  }
}
