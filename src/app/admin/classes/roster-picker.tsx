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
  students: RosterStudent[];
};

export function RosterPicker({ emptyMessage, students }: RosterPickerProps) {
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
      return students;
    }

    return students.filter((student) =>
      student.fullName.toLowerCase().includes(normalizedQuery),
    );
  }, [normalizedQuery, students]);

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((currentStudentIds) => {
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
        <input key={studentId} name="studentIds" type="hidden" value={studentId} />
      ))}

      <label>
        <span>Search students</span>
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Type a student name"
          type="search"
          value={query}
        />
      </label>

      <div className="roster-summary">
        {selectedStudentIds.size} selected
      </div>

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
                {student.isActive ? "" : " - inactive"}
              </span>
            </label>
          );
        })}
      </div>

      {students.length === 0 ? (
        <p className="muted-copy">{emptyMessage}</p>
      ) : null}
      {students.length > 0 && visibleStudents.length === 0 ? (
        <p className="muted-copy">No students match that search.</p>
      ) : null}
    </div>
  );
}
