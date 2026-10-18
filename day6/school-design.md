# School Database Design

## Tables

### students
Stores one row per student: `student_id` (primary key), `name` and `email`. The email is `NOT NULL` and `UNIQUE`, so two students cannot share one.

### courses
Stores one row per course: `course_id` (primary key), `title` and `credits`.

### enrolments
Records the fact that a student is taking a course. It has its own `enrolment_id`, a `student_id` and a `course_id` (both foreign keys), and the `grade`. A `UNIQUE (student_id, course_id)` rule stops the same student enrolling on the same course twice.

## Relationships

- **One-to-many:** one student has many enrolments, and one course has many enrolments. Each enrolment belongs to exactly one student and one course.
- **Many-to-many:** students and courses. A student can take many courses, and a course can have many students.
- **Why a join table is needed:** a relational table cannot store a list of courses inside one student row without breaking the rules of good design. The `enrolments` table turns the many-to-many relationship into two one-to-many relationships. It is also the natural place for data about the link itself, such as the grade.

## Index

I would add an index on `enrolments(course_id)`. The unique rule on `(student_id, course_id)` already makes lookups by student fast, but finding all students on a course (and counting students per course) searches by `course_id`. Without the index the database scans the whole table; with it, the lookup stays fast as enrolments grow.

## SQL or NoSQL?

I would choose SQL for this system. The data is highly structured and connected: students, courses and enrolments always link to each other, and queries such as "all courses for a student" and "students per course" need joins. SQL also enforces rules like unique emails, foreign keys and one enrolment per student per course, which protects the data. A NoSQL document database would suit flexible, changing data better, but here the structure is stable and the integrity rules matter more.