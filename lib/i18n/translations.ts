export const translations = {
  ru: {
    // Home screen
    home: {
      title: 'Worktime',
      status: 'Статус',
      worked: 'Отработано',
      breaks: 'Перерывы',
      exits: 'Выходы',
      percent95: '95% времени',
      breakTime: 'Перерыв',
      temporaryExit: 'Временный выход',
    },
    // Calendar screen
    calendar: {
      title: 'Календарь',
      selectDate: 'Выберите дату',
      noData: 'Нет данных',
      workingTime: 'Рабочее время',
    },
    // Reports screen
    reports: {
      title: 'Отчеты',
      weekly: 'Еженедельно',
      monthly: 'Ежемесячно',
      export: 'Экспорт',
      exportPDF: 'Экспорт в PDF',
      exportCSV: 'Экспорт в CSV',
      share: 'Поделиться',
    },
    // Analytics screen
    analytics: {
      title: 'Аналитика',
      trends: 'Тренды',
      distribution: 'Распределение',
      comparison: 'Сравнение',
      recommendations: 'Рекомендации',
      averageWorkTime: 'Среднее рабочее время',
      peakHours: 'Пиковые часы',
      workTrend: 'Тренд работы',
    },
    // Settings screen
    settings: {
      title: 'Настройки',
      language: 'Язык',
      theme: 'Тема',
      light: 'Светлая',
      dark: 'Темная',
      auto: 'Автоматическая',
      notifications: 'Уведомления',
      logout: 'Выход',
    },
    // Common
    common: {
      loading: 'Загрузка...',
      error: 'Ошибка',
      success: 'Успешно',
      cancel: 'Отмена',
      save: 'Сохранить',
      delete: 'Удалить',
      edit: 'Редактировать',
      close: 'Закрыть',
      back: 'Назад',
      next: 'Далее',
      previous: 'Предыдущий',
      today: 'Сегодня',
      thisMonth: 'Этот месяц',
      thisYear: 'Этот год',
    },
  },
  en: {
    // Home screen
    home: {
      title: 'Worktime',
      status: 'Status',
      worked: 'Worked',
      breaks: 'Breaks',
      exits: 'Exits',
      percent95: '95% time',
      breakTime: 'Break',
      temporaryExit: 'Temporary Exit',
    },
    // Calendar screen
    calendar: {
      title: 'Calendar',
      selectDate: 'Select date',
      noData: 'No data',
      workingTime: 'Working time',
    },
    // Reports screen
    reports: {
      title: 'Reports',
      weekly: 'Weekly',
      monthly: 'Monthly',
      export: 'Export',
      exportPDF: 'Export to PDF',
      exportCSV: 'Export to CSV',
      share: 'Share',
    },
    // Analytics screen
    analytics: {
      title: 'Analytics',
      trends: 'Trends',
      distribution: 'Distribution',
      comparison: 'Comparison',
      recommendations: 'Recommendations',
      averageWorkTime: 'Average work time',
      peakHours: 'Peak hours',
      workTrend: 'Work trend',
    },
    // Settings screen
    settings: {
      title: 'Settings',
      language: 'Language',
      theme: 'Theme',
      light: 'Light',
      dark: 'Dark',
      auto: 'Automatic',
      notifications: 'Notifications',
      logout: 'Logout',
    },
    // Common
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      today: 'Today',
      thisMonth: 'This month',
      thisYear: 'This year',
    },
  },
};

export type Language = 'ru' | 'en';
export type Translations = typeof translations;
