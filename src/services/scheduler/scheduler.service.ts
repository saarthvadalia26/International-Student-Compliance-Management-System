export interface ISchedulerService {
  /**
   * Determine if a specific date is a working day, checking weekends & the holiday calendar
   */
  isWorkingDay(date: Date, holidayList: string[]): boolean;

  /**
   * Compute the actual dispatch target date (Section 5 of DDS: shifts weekends/holidays to preceding working day)
   */
  calculateDispatchDate(targetDate: Date, holidayList: string[]): Date;
}

export class NotificationSchedulerService implements ISchedulerService {
  isWorkingDay(date: Date, holidayList: string[]): boolean {
    const day = date.getDay();
    // 0 = Sunday, 6 = Saturday
    if (day === 0 || day === 6) {
      return false;
    }

    // Check holiday string match (formatted as YYYY-MM-DD)
    const formattedDate = date.toISOString().split("T")[0];
    if (holidayList.includes(formattedDate)) {
      return false;
    }

    return true;
  }

  calculateDispatchDate(targetDate: Date, holidayList: string[]): Date {
    const computedDate = new Date(targetDate.getTime());
    
    // Shift backward until a valid working day is found
    while (!this.isWorkingDay(computedDate, holidayList)) {
      computedDate.setDate(computedDate.getDate() - 1);
    }
    
    return computedDate;
  }
}
