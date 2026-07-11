"use client";

import { useMemo, useState } from "react";

type RosterStudent = {
  id: string;
  fullName: string;
  isActive: boolean;
  isEnrolled?: boolean;
};

type RosterPickerProps = {
  emptyMessage: string;
  labels: {
    inactive: string;
    noMatches: string;
    search: string;
    searchHint: string;
    searchPlaceholder: string;
    selected: string;
    shown: string;
  };
  students: RosterStudent[];
  selectionName?: string;
  singleSelection?: boolean;
};

export function RosterPicker({
  emptyMessage,
  labels,
  selectionName = "studentIds",
  singleSelection = false,
  students,
}: RosterPickerProps) {
  const [query, setQuery] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState(
    () =>
      new Set(
        students
          .filter((student) => student.isEnrolled)
          .map((student) => student.id),
      ),
  );

  const normalizedQuery = query.trim().toLowerCase();
  const visibleStudents = useMemo(() => {
    if (!normalizedQuery) {
      return students.filter((student) => selectedStudentIds.has(student.id));
    }

    return students.filter((student) =>
      selectedStudentIds.has(student.id) ||
      student.fullName.toLowerCase().includes(normalizedQuery),
    );
  }, [normalizedQuery, selectedStudentIds, students]);

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((currentStudentIds) => {
      if (singleSelection && !currentStudentIds.has(studentId)) {
        return new Set([studentId]);
      }

      const nextStudentIds = new Set(currentStudentIds);

      if (nextStudentIds.has(studentId)) {
        nextStudentIds.delete(studentId);
      } else {
        nextStudentIds.add(studentId);
      }

      return nextStudentIds;
    });
  }

  return (
    <div className="roster-picker">
      {Array.from(selectedStudentIds).map((studentId) => (
        <input key={studentId} name={selectionName} type="hidden" value={studentId} />
      ))}

      <label>
        <span>{labels.search}</span>
        <input
          list="roster-student-options"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={labels.searchPlaceholder}
          type="search"
          value={query}
        />
        <datalist id="roster-student-options">
          {students.map((student) => (
            <option key={student.id} value={student.fullName} />
          ))}
        </datalist>
      </label>

      <div className="roster-summary">
        {selectedStudentIds.size} {labels.selected}
        {normalizedQuery ? `, ${visibleStudents.length} ${labels.shown}` : ""}
      </div>

      {normalizedQuery ? (
        <div className="roster-list">
          {visibleStudents.map((student) => {
            const isSelected = selectedStudentIds.has(student.id);
            const isDisabled = !student.isActive && !isSelected;

            return (
              <label className="checkbox-label roster-student" key={student.id}>
                <input
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={() => toggleStudent(student.id)}
                  type="checkbox"
                />
                <span>
                  {student.fullName}
                  {student.isActive ? "" : ` - ${labels.inactive}`}
                </span>
              </label>
            );
          })}
        </div>
      ) : visibleStudents.length > 0 ? (
        <div className="roster-list">
          {visibleStudents.map((student) => (
            <label className="checkbox-label roster-student" key={student.id}>
              <input
                checked
                onChange={() => toggleStudent(student.id)}
                type="checkbox"
              />
              <span>
                {student.fullName}
                {student.isActive ? "" : ` - ${labels.inactive}`}
              </span>
            </label>
          ))}
        </div>
      ) : students.length > 0 ? (
        <p className="muted-copy">{labels.searchHint}</p>
      ) : null}

      {students.length === 0 ? (
        <p className="muted-copy">{emptyMessage}</p>
      ) : null}
      {students.length > 0 && normalizedQuery && visibleStudents.length === 0 ? (
        <p className="muted-copy">{labels.noMatches}</p>
      ) : null}
    </div>
  );
}
