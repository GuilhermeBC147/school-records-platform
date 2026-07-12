# Class Management Notes

Admins manage classes from:

```text
http://localhost:3000/admin/classes
```

Admins can:

- create classes
- edit class name
- set the class book, such as `Book 1`, `Book 2`, or `Junior 1`
- choose whether a class is regular, VIP, or personal
- set semester and year
- set an optional start time and duration for schedule conflict checks
- assign an active teacher
- search by student name and add active students while creating a class
- mark a class active or inactive
- manage the class roster by checking active students

Teacher dashboards only show active assigned classes. Admins can still see inactive classes so historical submitted records remain reviewable.

Removing a student from a class roster marks that enrollment inactive instead of deleting history.

## Class Types and Scheduling

- Regular classes can have multiple students.
- VIP classes may have zero or one active roster student.
- Personal classes may have zero or one active roster student.
- A teacher cannot have overlapping regular or VIP classes.
- Personal classes may overlap other personal classes for the same teacher only when the overlapping group has no more than three distinct students.
- Schedule conflict checks require a start time, duration, and at least one shared weekday.
