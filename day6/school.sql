-- CREATE TABLES
CREATE TABLE students (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE enrolments (
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade TEXT,
    PRIMARY KEY (student_id, course_id),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

INSERT INTO students (id, name, email) VALUES
(1, 'Amina Otieno', 'amina@mailinator.com'),
(2, 'Brian Mwangi', 'brian@mailinator.com'),
(3, 'Carol Wanjiku', 'carol@mailinator.com');

INSERT INTO courses (id, name) VALUES
(1, 'Database Systems'),
(2, 'Web Development'),
(3, 'Machine learning');

INSERT INTO enrolments (student_id, course_id, grade) VALUES
(1, 1, 'A'),
(1, 2, 'B'),
(2, 1, 'B'),
(2, 3, 'A'),
(3, 2, 'A');

-- QUERY 1
SELECT courses.name
FROM courses
JOIN enrolments
    ON courses.id = enrolments.course_id
JOIN students
    ON students.id = enrolments.student_id
WHERE students.name = 'Amina Otieno';

-- QUERY 2

SELECT students.name
FROM students
JOIN enrolments
    ON students.id = enrolments.student_id
JOIN courses
    ON courses.id = enrolments.course_id
WHERE courses.name = 'Database Systems';

-- QUERY 3

SELECT
    courses.name,
    COUNT(enrolments.student_id) AS student_count
FROM courses
LEFT JOIN enrolments
    ON courses.id = enrolments.course_id
GROUP BY courses.id, courses.name;

-- QUERY 4

SELECT students.name
FROM students
LEFT JOIN enrolments
    ON students.id = enrolments.student_id
WHERE enrolments.student_id IS NULL;

-- QUERY 5

UPDATE enrolments
SET grade = 'A+'
WHERE student_id = 1
  AND course_id = 2;