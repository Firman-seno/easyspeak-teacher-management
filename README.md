# English Class Hub

Buatkan aplikasi web Student Attendance, Learning Progress & Reporting System khusus untuk Guru/Admin.

Aplikasi ini digunakan oleh guru/admin kursus Bahasa Inggris untuk mengelola data siswa, kehadiran, materi pembelajaran, tugas/project, progress belajar, level CEFR, dan laporan bulanan yang dapat dicetak dalam bentuk PDF.

1. ROLE & ACCESS

Aplikasi hanya memiliki satu role utama:

Admin / Teacher

Admin/Guru dapat:

Melihat seluruh data siswa

Menambah siswa

Mengedit data siswa

Menghapus siswa

Mencatat kehadiran

Mencatat materi yang telah diajarkan

Mencatat tugas/project

Mencatat project yang telah diselesaikan

Mengatur level siswa

Mengupdate progress belajar

Melihat riwayat pembelajaran

Membuat laporan bulanan

Mencetak/download laporan dalam PDF

Melihat statistik seluruh siswa

Tidak perlu membuat dashboard siswa/login siswa pada versi ini.

2. MODERN UI DESIGN

Gunakan desain yang:

Modern

Profesional

Clean

Minimalist

Educational technology style

Responsive

Nyaman digunakan dalam desktop dan tablet

Color Palette

Gunakan kombinasi:

Primary: Deep Navy / Dark Blue

Secondary: Royal Blue

Accent: Teal

Success: Green

Warning: Orange

Danger: Red

Background: Very Light Gray / White

Text: Dark Gray / Navy

Gunakan warna secara konsisten dan jangan terlalu banyak menggunakan warna.

Gunakan:

Rounded cards

Soft shadows

Clean tables

Modern buttons

Status badges

Progress bars

Charts

Icons

Responsive sidebar

Modern typography

Gunakan font seperti:
Inter, Poppins, atau Manrope.

3. MAIN DASHBOARD

Buat halaman utama:

Dashboard

Tampilkan summary cards:

Total Students

Jumlah seluruh siswa aktif.

Today's Attendance

Jumlah siswa yang hadir hari ini.

Attendance Rate

Persentase kehadiran bulan berjalan.

Active Projects

Jumlah project yang sedang dikerjakan.

Completed Projects

Jumlah project yang sudah selesai.

Average Progress

Rata-rata progress seluruh siswa.

Students Needing Attention

Jumlah siswa yang progress-nya rendah atau kehadirannya kurang.

Dashboard Charts

Tambahkan grafik:

Attendance Overview

Line/bar chart yang menunjukkan kehadiran siswa berdasarkan tanggal/bulan.

Student Progress

Bar chart atau progress chart berdasarkan progress belajar.

Students by Level

Donut/pie chart:

Pre-A1

A1

A2

B1

B2

C1

C2

Project Completion

Chart yang menunjukkan:

Assigned

In Progress

Completed

4. SIDEBAR NAVIGATION

Buat sidebar:

Dashboard

Students

Attendance

Lessons / Materials

Assignments & Projects

Learning Progress

Levels

Monthly Reports

Settings

Sidebar dapat collapse pada desktop dan menjadi mobile menu pada layar kecil.

5. STUDENT MANAGEMENT

Students

Buat halaman daftar seluruh siswa.

Table:

| Student | Student ID | Program | Level | Attendance | Progress | Status | Actions |

Kolom:

Foto

Nama siswa

Student ID

Program

Level

Total meetings

Attendance rate

Learning progress

Project completion

Status

Actions

Actions:

View

Edit

Delete

Tambahkan:

Search

Cari berdasarkan:

Nama

Student ID

Filter

Filter berdasarkan:

Program

Level

Status

Attendance

Progress

Add Student

Form:

Full Name

Student ID

Gender

Date of Birth

Phone Number

Email

Address

Program

Current Level

Enrollment Date

Target Level

Teacher

Status

Profile Photo

Notes

Status:

Active

Inactive

Completed

Suspended

6. STUDENT DETAIL PAGE

Ketika guru membuka seorang siswa, tampilkan halaman detail.

Header:

Profile photo
Student name
Student ID
Program
Current Level
Enrollment Date
Status

Kemudian buat tab:

Overview

Menampilkan:

Attendance rate

Total meetings

Completed lessons

Completed projects

Overall progress

Current level

Target level

Attendance

Riwayat kehadiran siswa.

Lessons

Semua materi yang sudah diajarkan.

Assignments / Projects

Semua project siswa.

Progress

Progress berdasarkan skill.

Reports

Laporan siswa.

7. ATTENDANCE SYSTEM

Buat halaman:

Attendance

Guru dapat memilih:

Date

Program

Class / Group

Meeting

Kemudian tampilkan daftar siswa.

Setiap siswa memiliki status:

Present

Late

Excused

Absent

Tambahkan notes.

Contoh:

| Student | Date | Status | Time | Notes |

Guru dapat melakukan:

Add attendance

Edit attendance

Delete attendance

Tambahkan tombol:

Save Attendance

8. ATTENDANCE SUMMARY

Setiap siswa memiliki:

Total Meetings

Present

Late

Excused

Absent

Attendance Percentage

Formula:

Attendance Percentage =
(Present + Late) / Total Meetings × 100

Tampilkan dengan progress bar.

Status:

90–100% = Excellent

80–89% = Good

70–79% = Needs Attention

Below 70% = Poor

9. LESSON / MATERIAL MANAGEMENT

Buat halaman:

Lessons / Materials

Guru dapat mencatat materi yang sudah diajarkan.

Form:

Lesson Title

Date

Program

Level

Unit

Topic

Grammar

Vocabulary

Speaking Practice

Learning Objective

Notes

Homework

Duration

Contoh:

Level:
A1

Topic:
Daily Activities

Grammar:
Simple Present

Vocabulary:
Wake up, take a shower, have breakfast, go to work, etc.

Speaking Practice:
Students describe their daily routine.

Tambahkan CRUD:

Create
Read
Update
Delete

10. ASSIGNMENTS & PROJECTS

Buat halaman:

Assignments & Projects

Guru dapat membuat tugas/project.

Form:

Project Title

Description

Program

Level

Student

Assigned Date

Due Date

Project Type

Instructions

Status

Score

Teacher Feedback

Project Type:

Speaking

Writing

Reading

Listening

Presentation

Video Project

Vocabulary

Grammar

Other

Status:

Assigned

In Progress

Submitted

Reviewed

Completed

Overdue

11. PROJECT TRACKING

Setiap siswa memiliki project statistics:

Total Projects

Jumlah seluruh project.

Assigned

Project yang diberikan.

In Progress

Project sedang dikerjakan.

Submitted

Project sudah dikumpulkan.

Completed

Project sudah selesai dinilai.

Completion Rate

Persentase project yang selesai.

Tampilkan:

Progress bar

Example:

Completed Projects
8 / 10

80%

12. LEARNING PROGRESS

Buat halaman:

Learning Progress

Guru dapat mengupdate progress siswa.

Gunakan skill-based progress:

Speaking

0–100%

Listening

0–100%

Reading

0–100%

Writing

0–100%

Vocabulary

0–100%

Grammar

0–100%

Tampilkan:

Overall Progress

dengan formula rata-rata seluruh skill.

Contoh:

Speaking 85%
Listening 75%
Reading 80%
Writing 70%
Vocabulary 90%
Grammar 75%

Overall Progress = 79%

Guru dapat mengubah nilai progress kapan saja.

Tambahkan:

Progress History

Simpan histori perubahan progress:

Date
Skill
Previous Score
New Score
Teacher Notes

13. CEFR LEVEL SYSTEM

Gunakan sistem level berdasarkan CEFR:

Pre-A1

Absolute Beginner

A1

Beginner

Target:
Basic everyday communication.

A2

Elementary

Target:
Simple conversations and familiar situations.

B1

Intermediate

Target:
Independent everyday communication.

B2

Upper Intermediate

Target:
Confident communication and discussion.

C1

Advanced

Target:
Fluent and sophisticated communication.

C2

Proficient

Target:
Near-native proficiency.

Untuk setiap siswa simpan:

Current Level

Target Level

Level Start Date

Level Completion %

Level Status

Status:

Not Started

In Progress

Completed

14. LEVEL PROGRESSION

Buat sistem progression.

Contoh:

Pre-A1 → A1 → A2 → B1 → B2 → C1 → C2

Guru dapat mengubah level siswa.

Tetapi sistem harus memberikan warning jika guru mencoba menaikkan level sementara progress level sebelumnya belum 100%.

Contoh:

"Student has not completed the current level yet. Are you sure you want to move this student to the next level?"

Tambahkan confirmation modal.

15. MONTHLY REPORT

Buat halaman:

Monthly Reports

Guru dapat memilih:

Month

Year

Student

Program

Level

Generate laporan otomatis.

Isi laporan:

Student Information

Name

Student ID

Program

Level

Teacher

Reporting Period

Attendance Summary

Total Meetings:
10

Present:
9

Late:
1

Absent:
0

Attendance Rate:
95%

Learning Summary

Lessons Completed:
8

Projects Assigned:
6

Projects Completed:
5

Project Completion:
83%

Skill Progress

Speaking: 85%
Listening: 80%
Reading: 75%
Writing: 70%
Vocabulary: 90%
Grammar: 80%

Overall Progress:
80%

Materials Covered

Tampilkan daftar materi yang sudah diajarkan selama bulan tersebut.

Projects Completed

Tampilkan daftar project yang telah diselesaikan.

Teacher's Evaluation

Text area untuk komentar guru.

Contoh:

"Student has shown significant improvement in speaking confidence and vocabulary. The student is recommended to continue practicing spontaneous speaking."

Recommendations

Text area.

16. PDF REPORT

Tambahkan tombol:

Generate PDF

dan

Print Report

PDF harus memiliki desain profesional.

Header:

COURSE / SCHOOL LOGO

Student Progress Report

Reporting Period

Kemudian:

Student Information
Attendance
Lessons
Projects
Learning Progress
Skill Analysis
Teacher Evaluation
Recommendations

Footer:

Teacher Name
Date
Signature

Gunakan format A4 dan pastikan PDF siap untuk dicetak.

17. REPORT HISTORY

Simpan seluruh laporan yang pernah dibuat.

Table:

| Period | Student | Level | Progress | Attendance | Generated Date | Actions |

Actions:

View

Download PDF

Print

Delete

18. CRUD SYSTEM

Semua data harus menggunakan CRUD lengkap.

Students

Create
Read
Update
Delete

Attendance

Create
Read
Update
Delete

Lessons

Create
Read
Update
Delete

Projects

Create
Read
Update
Delete

Progress

Create
Read
Update
Delete

Monthly Reports

Create
Read
Update
Delete

Gunakan confirmation modal sebelum Delete.

Contoh:

"Are you sure you want to delete this student?"

Jangan langsung menghapus data tanpa konfirmasi.

19. DATABASE STRUCTURE

Gunakan database relational.

Buat tabel:

users

id

name

email

password

role

created_at

students

id

student_id

name

gender

date_of_birth

phone

email

address

program

current_level

target_level

enrollment_date

status

photo

notes

created_at

updated_at

attendance

id

student_id

date

status

check_in_time

notes

created_at

lessons

id

title

date

program

level

unit

topic

grammar

vocabulary

speaking_practice

objective

homework

notes

duration

created_at

projects

id

student_id

title

description

type

assigned_date

due_date

status

score

feedback

completed_date

created_at

progress

id

student_id

speaking

listening

reading

writing

vocabulary

grammar

overall_progress

teacher_notes

updated_at

progress_history

id

student_id

skill

previous_score

new_score

notes

created_at

levels

id

name

code

description

order_number

monthly_reports

id

student_id

month

year

attendance_rate

lessons_completed

projects_assigned

projects_completed

overall_progress

teacher_evaluation

recommendations

created_at

20. SEARCH & FILTER

Semua data utama harus memiliki:

Search
Filter
Sort
Pagination

Students:
Search by name / ID.

Attendance:
Filter by date / month / student / status.

Lessons:
Filter by date / level / program.

Projects:
Filter by student / status / project type / level.

Reports:
Filter by month / year / student.

21. NOTIFICATIONS

Tambahkan notification/toast:

Success:
"Student successfully added."

Success:
"Attendance successfully saved."

Success:
"Project successfully updated."

Success:
"Monthly report generated."

Error:
"Something went wrong."

Delete:
"Data successfully deleted."

22. EMPTY STATES

Jika belum ada data, jangan tampilkan tabel kosong.

Gunakan empty state seperti:

"No students found."

"No attendance records yet."

"No projects available."

"No monthly reports generated yet."

Dengan tombol:

Add Student

Add Project

Create Report

23. RESPONSIVE DESIGN

Aplikasi harus responsive.

Desktop:
Sidebar + main content.

Tablet:
Collapsible sidebar.

Mobile:
Mobile navigation / drawer.

Table harus dapat di-scroll secara horizontal pada layar kecil.

24. DATA VALIDATION

Tambahkan validasi form.

Required fields:

Student Name
Student ID
Program
Level
Attendance Date
Lesson Title
Project Title

Email harus valid.

Progress hanya boleh:
0–100.

Score hanya boleh:
0–100.

Jangan izinkan data invalid masuk database.

25. DASHBOARD QUICK ACTIONS

Di dashboard tambahkan tombol:

Add Student

Record Attendance

Add Lesson

Add Project

Update Progress

Generate Report

26. IMPORTANT UX REQUIREMENTS

Aplikasi harus terasa seperti aplikasi profesional, bukan sekadar CRUD sederhana.

Prioritaskan:

Easy navigation

Fast data entry

Clear statistics

Professional reports

Simple workflow

Minimal clicks

Responsive design

Guru harus bisa mencatat kehadiran, materi, project, dan progress dengan cepat.

27. RECOMMENDED WORKFLOW

Guru login.

↓

Dashboard

↓

Select Student

↓

View Student Profile

↓

Record Attendance

↓

Add Lesson / Material

↓

Assign Project

↓

Update Project Status

↓

Update Learning Progress

↓

End of Month

↓

Generate Monthly Report

↓

Preview Report

↓

Download / Print PDF

28. FINAL REQUIREMENT

Buat aplikasi yang benar-benar functional.

Jangan hanya membuat UI mockup.

Semua button harus bekerja.

Semua CRUD harus terhubung dengan database.

Data harus persistent setelah refresh.

Gunakan reusable components.

Gunakan clean architecture.

Pastikan tidak ada dummy button yang tidak memiliki fungsi.

Pastikan PDF report dapat benar-benar dibuat dan di-download.

Buat sample/demo data agar dashboard tidak terlihat kosong saat pertama kali dibuka.

Nama aplikasi:

EasySpeak Teacher Management

Subtitle:

Student Attendance • Learning Progress • Project Tracking • Monthly Reports

Gunakan logo EasySpeak jika tersedia di project assets.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://teachflow-progress.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5b32cd8b-f12d-4075-b737-382acb64f667).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
