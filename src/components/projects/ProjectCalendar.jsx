import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, format, addMonths, subMonths,
  parseISO, isWithinInterval, isBefore, isAfter
} from 'date-fns';
import ProjectCalendarModal from './ProjectCalendarModal';

function getDayPillClass(project, dateStr) {
  const forecast = project.weather_forecast?.daily_forecasts?.find(f => f.date === dateStr);
  if (forecast?.meets_requirements === true) return 'bg-success text-white';
  if (forecast?.meets_requirements === false) return 'bg-destructive text-white';
  return 'bg-muted-foreground/50 text-white';
}

// For a spanning bar, we pick the color based on the majority of days in the span
function getSpanPillClass(project, week) {
  const forecasts = project.weather_forecast?.daily_forecasts || [];
  let good = 0, bad = 0;
  week.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const start = parseISO(project.start_date);
    const end = parseISO(project.end_date);
    if (isWithinInterval(day, { start, end })) {
      const f = forecasts.find(fc => fc.date === dateStr);
      if (f?.meets_requirements === true) good++;
      else if (f?.meets_requirements === false) bad++;
    }
  });
  if (bad > 0) return 'bg-destructive text-white hover:bg-destructive/90';
  if (good > 0) return 'bg-success text-white hover:bg-success/90';
  return 'bg-muted-foreground/50 text-white hover:bg-muted-foreground/60';
}

// Assign each project a stable slot (row) index for a given week
function assignSlots(week, projects) {
  const weekStart = week[0];
  const weekEnd = week[week.length - 1];

  const activeProjects = projects.filter(p => {
    if (!p.start_date || !p.end_date) return false;
    const start = parseISO(p.start_date);
    const end = parseISO(p.end_date);
    return !isAfter(start, weekEnd) && !isBefore(end, weekStart);
  });

  activeProjects.sort((a, b) => parseISO(a.start_date) - parseISO(b.start_date));

  // slots[slotIdx][dateStr] = projectId
  const slots = [];
  const slotAssignments = {};

  activeProjects.forEach(project => {
    let slotIdx = 0;
    while (true) {
      if (!slots[slotIdx]) slots[slotIdx] = {};
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

// Build spanning segments for a slot row within a week
// Returns array of { project, colStart (1-based), colSpan, isStart, isEnd }
function buildSegments(slotRow, week, activeProjects) {
  const segments = [];
  let i = 0;
  while (i < week.length) {
    const dateStr = format(week[i], 'yyyy-MM-dd');
    const projectId = slotRow[dateStr];
    if (!projectId) {
      i++;
      continue;
    }
    const project = activeProjects.find(p => p.id === projectId);
    // Find how many consecutive days this project occupies from i
    let span = 0;
    while (i + span < week.length) {
      const ds = format(week[i + span], 'yyyy-MM-dd');
      if (slotRow[ds] !== projectId) break;
      span++;
    }
    const projectStart = format(parseISO(project.start_date), 'yyyy-MM-dd');
    const projectEnd = format(parseISO(project.end_date), 'yyyy-MM-dd');
    const firstDayStr = format(week[i], 'yyyy-MM-dd');
    const lastDayStr = format(week[i + span - 1], 'yyyy-MM-dd');

    segments.push({
      project,
      colStart: i + 1,
      colSpan: span,
      isStart: firstDayStr === projectStart,
      isEnd: lastDayStr === projectEnd,
    });
    i += span;
  }
  return segments;
}

export default function ProjectCalendar({ projects }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedProject, setSelectedProject] = useState(null);
  const [hoveredProjectId, setHoveredProjectId] = useState(null);

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
          const { slots, activeProjects } = assignSlots(week, projects);
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

              {/* Project spanning bars — one grid row per slot */}
              {numSlots === 0 ? (
                <div className="grid grid-cols-7 divide-x divide-border h-7">
                  {week.map((_, di) => <div key={di} className="bg-card" />)}
                </div>
              ) : (
                Array.from({ length: numSlots }).map((_, slotIdx) => {
                  const slotRow = slots[slotIdx] || {};
                  const segments = buildSegments(slotRow, week, activeProjects);

                  return (
                    <div key={slotIdx} className="relative py-0.5">
                      {/* Day divider lines behind the bars */}
                      <div className="absolute inset-0 grid grid-cols-7 divide-x divide-border pointer-events-none">
                        {week.map((_, di) => <div key={di} />)}
                      </div>
                      {/* Bars */}
                      <div className="relative grid grid-cols-7 px-0.5">
                      {/* We use absolute positioning via CSS grid column placement */}
                      {(() => {
                        // Build a list of all 7 columns — each either a segment or an empty cell
                        const cells = [];
                        const segmentsByCol = {};
                        segments.forEach(seg => { segmentsByCol[seg.colStart] = seg; });

                        let col = 1;
                        while (col <= 7) {
                          const seg = segmentsByCol[col];
                          if (seg) {
                            const pillClass = getSpanPillClass(seg.project, week);
                            cells.push(
                              <button
                                key={`seg-${col}`}
                                onClick={() => setSelectedProject(seg.project)}
                                onMouseEnter={() => setHoveredProjectId(seg.project.id)}
                                onMouseLeave={() => setHoveredProjectId(null)}
                                title={seg.project.name}
                                style={{
                                  gridColumnStart: seg.colStart,
                                  gridColumnEnd: seg.colStart + seg.colSpan,
                                }}
                                className={`h-6 min-w-0 text-left text-xs font-semibold leading-none px-2 truncate flex items-center transition-all duration-150
                                  ${pillClass}
                                  ${seg.isStart ? 'rounded-l-md ml-0.5' : 'rounded-l-none -ml-px'}
                                  ${seg.isEnd ? 'rounded-r-md mr-0.5' : 'rounded-r-none -mr-px'}
                                  ${hoveredProjectId === seg.project.id ? 'brightness-110 ring-2 ring-white/60 ring-inset scale-y-105 shadow-lg z-10' : hoveredProjectId !== null ? 'opacity-40' : ''}
                                `}
                              >
                                {seg.project.name}
                              </button>
                            );
                            col += seg.colSpan;
                          } else {
                            cells.push(
                              <div key={`empty-${col}`} style={{ gridColumnStart: col, gridColumnEnd: col + 1 }} />
                            );
                            col++;
                          }
                        }
                        return cells;
                      })()}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Bottom padding row */}
              <div className="grid grid-cols-7 divide-x divide-border h-2">
                {week.map((_, di) => <div key={di} className="bg-card" />)}
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