import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, format, addMonths, subMonths,
  parseISO, isWithinInterval
} from 'date-fns';
import ProjectCalendarModal from './ProjectCalendarModal';

function getDayPillClass(project, dateStr) {
  const forecast = project.weather_forecast?.daily_forecasts?.find(f => f.date === dateStr);
  if (forecast?.meets_requirements === true) return 'bg-success text-white';
  if (forecast?.meets_requirements === false) return 'bg-destructive text-white';
  return 'bg-muted-foreground/50 text-white';
}

// Assign each project a stable slot index for a given week
function assignSlots(week, projects) {
  const slots = []; // slots[slotIndex] = projectId or null per day

  const weekStart = week[0];
  const weekEnd = week[week.length - 1];

  // Find all projects active in this week
  const activeProjects = projects.filter(p => {
    const start = parseISO(p.start_date);
    const end = parseISO(p.end_date);
    return isWithinInterval(weekStart, { start, end }) ||
           isWithinInterval(weekEnd, { start, end }) ||
           (start >= weekStart && start <= weekEnd);
  });

  // Sort by start date for stable ordering
  activeProjects.sort((a, b) => parseISO(a.start_date) - parseISO(b.start_date));

  const slotAssignments = {}; // projectId -> slotIndex

  activeProjects.forEach(project => {
    // Find the first slot where this project doesn't conflict
    let slotIdx = 0;
    while (true) {
      if (!slots[slotIdx]) slots[slotIdx] = {};
      // Check if any day this project occupies in this week is taken
      let conflict = false;
      week.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const start = parseISO(project.start_date);
        const end = parseISO(project.end_date);
        if (isWithinInterval(day, { start, end }) && slots[slotIdx][dateStr]) {
          conflict = true;
        }
      });
      if (!conflict) break;
      slotIdx++;
    }
    // Assign project to this slot for all its days in this week
    week.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const start = parseISO(project.start_date);
      const end = parseISO(project.end_date);
      if (isWithinInterval(day, { start, end })) {
        if (!slots[slotIdx]) slots[slotIdx] = {};
        slots[slotIdx][dateStr] = project.id;
      }
    });
    slotAssignments[project.id] = slotIdx;
  });

  return { slots, slotAssignments, activeProjects };
}

export default function ProjectCalendar({ projects }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedProject, setSelectedProject] = useState(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

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
        {weeks.map((week, wi) => {
          const { slots, slotAssignments, activeProjects } = assignSlots(week, projects);
          const numSlots = slots.length;

          return (
            <div key={wi} className="border-t border-border">
              {/* Date numbers row */}
              <div className="grid grid-cols-7 divide-x divide-border">
                {week.map((date, di) => {
                  const inMonth = isSameMonth(date, currentMonth);
                  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  return (
                    <div
                      key={di}
                      className={`px-1.5 pt-2 pb-1 ${!inMonth ? 'bg-muted/20' : 'bg-card'}`}
                    >
                      <span className={`text-xs font-medium inline-flex h-5 w-5 items-center justify-center rounded-full
                        ${isToday ? 'bg-primary text-primary-foreground' : inMonth ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                        {format(date, 'd')}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Project bars - one row per slot */}
              {numSlots === 0 ? (
                <div className="grid grid-cols-7 divide-x divide-border">
                  {week.map((date, di) => {
                    const inMonth = isSameMonth(date, currentMonth);
                    return (
                      <div key={di} className={`h-7 ${!inMonth ? 'bg-muted/20' : 'bg-card'}`} />
                    );
                  })}
                </div>
              ) : (
                Array.from({ length: numSlots }).map((_, slotIdx) => (
                  <div key={slotIdx} className="grid grid-cols-7 divide-x divide-border">
                    {week.map((date, di) => {
                      const inMonth = isSameMonth(date, currentMonth);
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const projectId = slots[slotIdx]?.[dateStr];
                      const project = projectId ? activeProjects.find(p => p.id === projectId) : null;

                      if (!project) {
                        return (
                          <div key={di} className={`h-7 ${!inMonth ? 'bg-muted/20' : 'bg-card'}`} />
                        );
                      }

                      const projectStart = parseISO(project.start_date);
                      const projectEnd = parseISO(project.end_date);
                      const isFirstDayOfWeek = di === 0;
                      const isLastDayOfWeek = di === 6;
                      const isProjectStart = format(date, 'yyyy-MM-dd') === format(projectStart, 'yyyy-MM-dd');
                      const isProjectEnd = format(date, 'yyyy-MM-dd') === format(projectEnd, 'yyyy-MM-dd');

                      const roundLeft = isProjectStart || isFirstDayOfWeek;
                      const roundRight = isProjectEnd || isLastDayOfWeek;

                      const pillClass = getDayPillClass(project, dateStr);

                      return (
                        <div key={di} className={`h-7 flex items-center ${!inMonth ? 'bg-muted/20' : 'bg-card'} ${roundLeft ? 'pl-1' : ''} ${roundRight ? 'pr-1' : ''}`}>
                          <button
                            onClick={() => setSelectedProject(project)}
                            className={`h-6 w-full text-left text-xs font-semibold leading-none truncate px-1.5
                              ${pillClass}
                              ${roundLeft ? 'rounded-l-md' : 'rounded-l-none'}
                              ${roundRight ? 'rounded-r-md' : 'rounded-r-none'}
                            `}
                          >
                            {(isProjectStart || isFirstDayOfWeek) ? project.name : ''}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}

              {/* Bottom padding row */}
              <div className="grid grid-cols-7 divide-x divide-border">
                {week.map((date, di) => {
                  const inMonth = isSameMonth(date, currentMonth);
                  return (
                    <div key={di} className={`h-3 ${!inMonth ? 'bg-muted/20' : 'bg-card'}`} />
                  );
                })}
              </div>
            </div>
          );
        })}
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