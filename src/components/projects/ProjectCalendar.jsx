import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, format, addMonths, subMonths, parseISO, isWithinInterval } from 'date-fns';
import ProjectCalendarModal from './ProjectCalendarModal';

const REC_PILL = {
  proceed: 'bg-success text-white',
  caution: 'bg-warning text-warning-foreground',
  postpone: 'bg-destructive text-white',
  pending: 'bg-muted-foreground/50 text-white',
};

export default function ProjectCalendar({ projects }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedProject, setSelectedProject] = useState(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  // Build days array
  const days = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  // For each day, find projects that include it
  const getProjectsForDay = (date) => {
    return projects.filter((p) => {
      const start = parseISO(p.start_date);
      const end = parseISO(p.end_date);
      return isWithinInterval(date, { start, end });
    });
  };

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border border-border overflow-hidden">
        {/* Day names */}
        <div className="grid grid-cols-7 bg-muted/50">
          {DAY_NAMES.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 divide-x divide-border border-t border-border">
            {week.map((date, di) => {
              const inMonth = isSameMonth(date, currentMonth);
              const dayProjects = getProjectsForDay(date);
              const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

              return (
                <div
                  key={di}
                  className={`min-h-[80px] p-1.5 space-y-1 ${!inMonth ? 'bg-muted/20' : 'bg-card'}`}
                >
                  <span className={`text-xs font-medium inline-flex h-5 w-5 items-center justify-center rounded-full
                    ${isToday ? 'bg-primary text-primary-foreground' : inMonth ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                    {format(date, 'd')}
                  </span>
                  {dayProjects.slice(0, 3).map((project) => (
                    <button
                      key={project.id}
                      onClick={() => setSelectedProject(project)}
                      className={`w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded truncate leading-tight
                        ${REC_PILL[project.recommendation] || REC_PILL.pending}`}
                    >
                      {project.name}
                    </button>
                  ))}
                  {dayProjects.length > 3 && (
                    <p className="text-[10px] text-muted-foreground pl-1">+{dayProjects.length - 3} more</p>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedProject && (
        <ProjectCalendarModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
}