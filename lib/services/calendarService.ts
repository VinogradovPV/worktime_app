import { Platform } from 'react-native';
import { WorkDay } from '@/shared/types/workday';

let Calendar: any = null;
try {
  Calendar = require('expo-calendar');
} catch (e) {
  console.warn('expo-calendar not available');
}

export interface CalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  notes: string;
}

class CalendarService {
  private calendarId: string | null = null;

  async initialize(): Promise<void> {
    try {
      // Календарь недоступен на web
      if (Platform.OS === 'web' || !Calendar) {
        console.warn('Calendar not available');
        return;
      }

      // Запросить разрешение на доступ к календарю
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Calendar permissions not granted');
        return;
      }

      // Получить или создать календарь для рабочего времени
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const workCalendar = calendars.find((cal: any) => cal.title === 'Worktime');

      if (workCalendar) {
        this.calendarId = workCalendar.id;
      } else {
        // Создать новый календарь
        const newCalendarId = await Calendar.createCalendarAsync({
          title: 'Worktime',
          color: '#3b82f6',
          entityType: Calendar.EntityTypes.EVENT,
          sourceId: calendars[0]?.sourceId,
          name: 'worktime_calendar',
          ownerAccount: 'local',
          accessLevel: Calendar.CalendarAccessLevel.OWNER,
        });
        this.calendarId = newCalendarId;
      }
    } catch (error) {
      console.error('Error initializing calendar:', error);
    }
  }

  async addWorkDayEvent(workDay: WorkDay): Promise<string | null> {
    if (!this.calendarId) {
      console.warn('Calendar not initialized');
      return null;
    }

    try {
      if (!workDay.workStartAt || !workDay.workEndAt) {
        console.warn('Work day does not have start or end time');
        return null;
      }

      const startDate = new Date(workDay.workStartAt);
      const endDate = new Date(workDay.workEndAt);

      const eventId = await Calendar.createEventAsync(this.calendarId, {
        title: 'Рабочее время',
        startDate,
        endDate,
        notes: `Рабочее время: ${workDay.workStartAt} - ${workDay.workEndAt}`,
        color: '#3b82f6',
      });

      return eventId;
    } catch (error) {
      console.error('Error adding work day event:', error);
      return null;
    }
  }

  async updateWorkDayEvent(eventId: string, workDay: WorkDay): Promise<boolean> {
    if (!this.calendarId) {
      console.warn('Calendar not initialized');
      return false;
    }

    try {
      if (!workDay.workStartAt || !workDay.workEndAt) {
        console.warn('Work day does not have start or end time');
        return false;
      }

      const startDate = new Date(workDay.workStartAt);
      const endDate = new Date(workDay.workEndAt);

      await Calendar.updateEventAsync(eventId, {
        title: 'Рабочее время',
        startDate,
        endDate,
        notes: `Рабочее время: ${workDay.workStartAt} - ${workDay.workEndAt}`,
        color: '#3b82f6',
      });

      return true;
    } catch (error) {
      console.error('Error updating work day event:', error);
      return false;
    }
  }

  async deleteWorkDayEvent(eventId: string): Promise<boolean> {
    try {
      await Calendar.deleteEventAsync(eventId);
      return true;
    } catch (error) {
      console.error('Error deleting work day event:', error);
      return false;
    }
  }

  async getCalendarId(): Promise<string | null> {
    return this.calendarId;
  }
}

export const calendarService = new CalendarService();
