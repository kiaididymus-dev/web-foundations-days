PRAGMA foreign_keys = ON;

-- ---------- Tables ----------
CREATE TABLE students (
  student_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
  course_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title     TEXT NOT NULL,
  credits   INTEGER NOT NULL
);

CREATE TABLE enrolments (
  enrolment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id   INTEGER NOT NULL,
  course_id    INTEGER NOT NULL,
  grade        INTEGER,
  FOREIGN KEY (student_id) REFERENCES students(student_id),
  FOREIGN KEY (course_id)  REFERENCES courses(course_id),
  UNIQUE (student_id, course_id)  -- same student cannot enrol on the same course twice
);

-- Index for finding all students on a course
CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);

-- ---------- Sample data ----------
INSERT INTO students (name, email) VALUES
  ('Amina Wanjiru', 'amina@example.com'),
  ('Brian Otieno',  'brian@example.com'),
  ('Carol Njeri',   'carol@example.com'),
  ('David Kamau',   'david@example.com');

INSERT INTO courses (title, credits) VALUES
  ('Mathematics',      3),
  ('Computer Science', 4),
  ('English Literature', 2);

INSERT INTO enrolments (student_id, course_id, grade) VALUES
  (1, 1, 78),
  (1, 2, 85),
  (2, 2, 72),
  (3, 1, 90),
  (3, 3, 66);

-- ---------- Queries ----------

-- 1. All courses for one student (by name)
SELECT c.title, c.credits, e.grade
FROM students s
JOIN enrolments e ON s.student_id = e.student_id
JOIN courses c ON e.course_id = c.course_id
WHERE s.name = 'Amina Wanjiru';
-- Expected: Mathematics | 3 | 78, Computer Science | 4 | 85

-- 2. All students on one course
SELECT s.name, s.email, e.grade
FROM courses c
JOIN enrolments e ON c.course_id = e.course_id
JOIN students s ON e.student_id = s.student_id
WHERE c.title = 'Computer Science';
-- Expected: Amina Wanjiru | 85, Brian Otieno | 72

-- 3. Number of students per course
SELECT c.title, COUNT(e.enrolment_id) AS student_count
FROM courses c
LEFT JOIN enrolments e ON c.course_id = e.course_id
GROUP BY c.course_id, c.title;
-- Expected: Mathematics 2, Computer Science 2, English Literature 1

-- 4. Students with no enrolments
SELECT s.name, s.email
FROM students s
LEFT JOIN enrolments e ON s.student_id = e.student_id
WHERE e.enrolment_id IS NULL;
-- Expected: David Kamau

-- 5. Update one enrolment's grade (Brian, Computer Science: 72 -> 88)
UPDATE enrolments
SET grade = 88
WHERE student_id = (SELECT student_id FROM students WHERE name = 'Brian Otieno')
  AND course_id  = (SELECT course_id FROM courses WHERE title = 'Computer Science');

-- Check the update
SELECT s.name, c.title, e.grade
FROM enrolments e
JOIN students s ON e.student_id = s.student_id
JOIN courses c ON e.course_id = c.course_id
WHERE s.name = 'Brian Otieno';
-- Expected: Brian Otieno | Computer Science | 88