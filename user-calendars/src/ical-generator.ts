import { ICalExportOptions, ScheduledEvent } from './types.js';

export class ICalGenerator {
  /**
   * Formats a JavaScript Unix timestamp (ms) into RFC 5545 UTC date string (e.g. 20260916T150000Z).
   */
  public static formatDate(timestamp: number): string {
    const d = new Date(timestamp);
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const year = d.getUTCFullYear();
    const month = pad(d.getUTCMonth() + 1);
    const day = pad(d.getUTCDate());
    const hours = pad(d.getUTCHours());
    const minutes = pad(d.getUTCMinutes());
    const seconds = pad(d.getUTCSeconds());
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  }

  /**
   * Escapes special characters per RFC 5545 Section 3.3.11 (Text).
   */
  public static escapeText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  /**
   * Generates a complete RFC 5545 .ics calendar string for a collection of events.
   */
  public static generateCalendar(
    events: ScheduledEvent[],
    options: ICalExportOptions = {}
  ): string {
    const calName = options.calendarName || 'Fluxer Calendar';
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Fluxer//User Calendars 1.0//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${this.escapeText(calName)}`,
      'X-WR-TIMEZONE:UTC',
    ];

    if (options.publishedTtlMinutes) {
      lines.push(`X-PUBLISHED-TTL:PT${options.publishedTtlMinutes}M`);
    }

    const nowStr = this.formatDate(Date.now());

    for (const event of events) {
      const startStr = this.formatDate(event.startTime);
      const endTimestamp = event.endTime || event.startTime + 60 * 60 * 1000; // 1 hr default
      const endStr = this.formatDate(endTimestamp);
      const uid = `event_${event.id}@fluxer.app`;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${nowStr}`);
      lines.push(`DTSTART:${startStr}`);
      lines.push(`DTEND:${endStr}`);
      lines.push(`SUMMARY:${this.escapeText(event.name)}`);

      if (event.description) {
        lines.push(`DESCRIPTION:${this.escapeText(event.description)}`);
      }

      if (event.location) {
        lines.push(`LOCATION:${this.escapeText(event.location)}`);
      }

      if (event.url) {
        lines.push(`URL:${event.url}`);
      }

      lines.push('STATUS:CONFIRMED');

      // Alarms / Reminders (Default: 15 minutes before)
      if (options.includeAlarms !== false) {
        lines.push('BEGIN:VALARM');
        lines.push('TRIGGER:-PT15M');
        lines.push('ACTION:DISPLAY');
        lines.push(`DESCRIPTION:Reminder: ${this.escapeText(event.name)}`);
        lines.push('END:VALARM');
      }

      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
  }

  /**
   * Generates an .ics file string for a single standalone event.
   */
  public static generateSingleEvent(event: ScheduledEvent, options?: ICalExportOptions): string {
    return this.generateCalendar([event], {
      calendarName: event.name,
      ...options,
    });
  }
}
