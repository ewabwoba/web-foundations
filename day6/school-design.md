# School Database Design

## Students

The `students` table stores information about each student. Each student has a unique ID, name and email address. The email must be unique so that two students cannot have the same email address.

## Courses

The `courses` table stores the courses offered by the school. Each course has a unique ID and a name.

## Enrolments

The `enrolments` table records which students are enrolled in which courses. It also stores the student's grade for that course.

## Relationships

There is a one-to-many relationship between a student and their enrolments because one student can have many enrolments, while each enrolment belongs to one student.

There is also a one-to-many relationship between a course and its enrolments because one course can have many enrolments, while each enrolment belongs to one course.

Students and courses have a many-to-many relationship because one student can take many courses and one course can have many students. The `enrolments` table is needed as a join table to represent this relationship. It connects students and courses and also stores information specific to the relationship, such as the student's grade.

## Index

I would add an index on `enrolments.course_id` because the database will frequently search for all students enrolled in a particular course. An index would make these lookups faster as the number of enrolments grows.

Example:

```sql
CREATE INDEX idx_enrolments_course_id
ON enrolments(course_id);