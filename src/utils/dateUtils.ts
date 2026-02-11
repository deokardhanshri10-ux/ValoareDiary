import { Payment } from '../types';

export const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

export const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
};

export const calculateRecurringDates = (payment: Payment, targetMonth: number, targetYear: number): Date[] => {
    const recurringDates: Date[] = [];

    payment.due_dates.forEach((dateStr) => {
        const originalDate = new Date(dateStr);
        const originalDay = originalDate.getDate();
        const originalMonth = originalDate.getMonth();
        const originalYear = originalDate.getFullYear();

        if (payment.frequency === 'one-time') {
            if (originalMonth === targetMonth && originalYear === targetYear) {
                recurringDates.push(new Date(targetYear, targetMonth, originalDay));
            }
        } else if (payment.frequency === 'quarterly') {
            let currentDate = new Date(originalYear, originalMonth, originalDay);
            const targetDate = new Date(targetYear, targetMonth, 1);
            const futureLimit = new Date(targetYear + 10, 11, 31);

            while (currentDate <= futureLimit) {
                if (currentDate.getMonth() === targetMonth && currentDate.getFullYear() === targetYear) {
                    recurringDates.push(new Date(currentDate));
                    break;
                }
                currentDate.setMonth(currentDate.getMonth() + 3);
            }
        } else if (payment.frequency === 'half-yearly') {
            let currentDate = new Date(originalYear, originalMonth, originalDay);
            const targetDate = new Date(targetYear, targetMonth, 1);
            const futureLimit = new Date(targetYear + 10, 11, 31);

            while (currentDate <= futureLimit) {
                if (currentDate.getMonth() === targetMonth && currentDate.getFullYear() === targetYear) {
                    recurringDates.push(new Date(currentDate));
                    break;
                }
                currentDate.setMonth(currentDate.getMonth() + 6);
            }
        } else if (payment.frequency === 'annual') {
            if (originalMonth === targetMonth && targetYear >= originalYear) {
                recurringDates.push(new Date(targetYear, targetMonth, originalDay));
            }
        }
    });

    return recurringDates;
};
