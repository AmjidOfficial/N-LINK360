/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Mini Calendar Widget
 * Modeled after the Calendar card in the attached dashboard.jpeg:
 * Provides a responsive interactive monthly calendar grid with current date highlight,
 * month switching, and operational dispatch/attendance indicators.
 */

import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

export interface MiniCalendarWidgetProps {
 className?: string;
 selectedDate?: Date;
 onSelectDate?: (date: Date) => void;
}

export const MiniCalendarWidget: React.FC<MiniCalendarWidgetProps> = ({
 className = '',
 selectedDate,
 onSelectDate,
}) => {
 const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());
 const today = new Date();

 const year = currentMonthDate.getFullYear();
 const month = currentMonthDate.getMonth();

 const monthNames = [
 'January', 'February', 'March', 'April', 'May', 'June',
 'July', 'August', 'September', 'October', 'November', 'December'
 ];

 const firstDayIndex = new Date(year, month, 1).getDay();
 const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
 const daysInPrevMonth = new Date(year, month, 0).getDate();

 const days: Array<{ day: number; isCurrentMonth: boolean; date: Date }> = [];

 // Trailing days from previous month
 for (let i = firstDayIndex - 1; i >= 0; i--) {
 const d = daysInPrevMonth - i;
 days.push({ day: d, isCurrentMonth: false, date: new Date(year, month - 1, d) });
 }

 // Days of current month
 for (let d = 1; d <= totalDaysInMonth; d++) {
 days.push({ day: d, isCurrentMonth: true, date: new Date(year, month, d) });
 }

 // Leading days for next month to complete 35 or 42 cells grid
 const remaining = (7 - (days.length % 7)) % 7;
 for (let d = 1; d <= remaining; d++) {
 days.push({ day: d, isCurrentMonth: false, date: new Date(year, month + 1, d) });
 }

 const prevMonth = () => {
 setCurrentMonthDate(new Date(year, month - 1, 1));
 };

 const nextMonth = () => {
 setCurrentMonthDate(new Date(year, month + 1, 1));
 };

 return (
 <div
 className={`rounded-lg p-5 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 shadow-xs space-y-3 ${className}`}
 >
 {/* Month & Year Navigation Header */}
 <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-800 pb-2.5">
 <div className="flex items-center gap-1.5">
 <CalendarIcon className="w-4 h-4 text-[#0D9488]" />
 <span className="text-xs font-bold uppercase tracking-wider text-[#191C1E] dark:text-slate-200">
 {monthNames[month]} {year}
 </span>
 </div>

 <div className="flex items-center gap-1">
 <button
 type="button"
 onClick={prevMonth}
 className="w-7 h-7 rounded hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 cursor-pointer"
 aria-label="Previous Month"
 >
 <ChevronLeft className="w-4 h-4" />
 </button>
 <button
 type="button"
 onClick={nextMonth}
 className="w-7 h-7 rounded hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 cursor-pointer"
 aria-label="Next Month"
 >
 <ChevronRight className="w-4 h-4" />
 </button>
 </div>
 </div>

 {/* Weekday Names */}
 <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 uppercase">
 <span>Su</span>
 <span>Mo</span>
 <span>Tu</span>
 <span>We</span>
 <span>Th</span>
 <span>Fr</span>
 <span>Sa</span>
 </div>

 {/* Calendar Days Grid */}
 <div className="grid grid-cols-7 gap-1 text-center text-xs">
 {days.map((item, idx) => {
 const isToday =
 item.isCurrentMonth &&
 item.day === today.getDate() &&
 month === today.getMonth() &&
 year === today.getFullYear();

 const isSelected =
 selectedDate &&
 item.date.toDateString() === selectedDate.toDateString();

 return (
 <button
 key={idx}
 type="button"
 onClick={() => onSelectDate && onSelectDate(item.date)}
 className={`h-7 w-7 mx-auto rounded flex items-center justify-center text-xs tabular-nums transition-all cursor-pointer ${
 isToday
 ? 'bg-[#0D9488] text-white shadow-xs font-bold'
 : isSelected
 ? 'bg-[#0B132B] dark:bg-slate-700 text-white font-bold'
 : item.isCurrentMonth
 ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
 : 'text-slate-300 dark:text-slate-600 font-normal'
 }`}
 >
 {item.day}
 </button>
 );
 })}
 </div>
 </div>
 );
};
