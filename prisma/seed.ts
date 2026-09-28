/**
 * Демо-данные: 1 админ, 3 учителя, 30 учеников, 6 групп, расписание,
 * уроки за последние 30 дней с посещаемостью, оценками и ДЗ.
 * Запуск: npm run db:seed (сид полностью пересоздаёт данные).
 */
import { PrismaClient, type AttendanceStatus, type HomeworkStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, today } from "../src/lib/dates";
import { ensureLessons } from "../src/lib/lessons";

const db = new PrismaClient();

// Детерминированный генератор, чтобы демо-данные были одинаковыми при каждом запуске
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260928);
const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)];

const FIRST_NAMES = [
  "Алина", "Тимур", "Мадина", "Азиз", "Камила", "Руслан", "Дилноза", "Артём", "Севара", "Жасур",
  "Полина", "Бекзод", "Лола", "Даниил", "Нигора", "Иван", "Малика", "Шахзод", "Анна", "Санжар",
  "Ева", "Отабек", "Зарина", "Максим", "Гульнара", "Алексей", "Шахноза", "Фаррух", "Мария", "Ильдар",
];
const LAST_NAMES = [
  "Каримова", "Юсупов", "Рахимова", "Ахмедов", "Исмоилова", "Смирнов", "Турсунова", "Кузнецов", "Назарова", "Алиев",
  "Попова", "Махмудов", "Хасанова", "Волков", "Мирзаева", "Соколов", "Ибрагимова", "Норматов", "Морозова", "Усмонов",
  "Лебедева", "Бакиров", "Абдуллаева", "Новиков", "Шарипова", "Фёдоров", "Кадырова", "Раджабов", "Орлова", "Саидов",
];

const MATH_TOPICS = [
  "Дроби и действия с ними", "Линейные уравнения", "Проценты", "Квадратные уравнения", "Системы уравнений",
  "Степени и корни", "Функции и графики", "Геометрия: треугольники", "Площади фигур", "Неравенства",
  "Текстовые задачи", "Вероятность",
];
const ENGLISH_TOPICS = [
  "Present Simple", "Past Simple", "Present Continuous", "Future forms", "Vocabulary: Travel",
  "Reading practice", "Listening practice", "Speaking: Describing people", "Modal verbs", "Present Perfect",
  "Writing an email", "Articles",
];

async function main() {
  // Очистка (порядок важен из-за внешних ключей)
  await db.homeworkSubmission.deleteMany();
  await db.homework.deleteMany();
  await db.grade.deleteMany();
  await db.attendance.deleteMany();
  await db.lesson.deleteMany();
  await db.scheduleSlot.deleteMany();
  await db.groupStudent.deleteMany();
  await db.group.deleteMany();
  await db.student.deleteMany();
  await db.teacher.deleteMany();
  await db.subject.deleteMany();
  await db.user.deleteMany();

  const [adminHash, teacherHash, studentHash] = await Promise.all([
    bcrypt.hash("admin123", 10),
    bcrypt.hash("teacher123", 10),
    bcrypt.hash("student123", 10),
  ]);

  const math = await db.subject.create({ data: { name: "Математика" } });
  const english = await db.subject.create({ data: { name: "Английский язык" } });

  await db.user.create({
    data: { login: "admin", passwordHash: adminHash, role: "ADMIN", fullName: "Администратор Центра", phone: "+998 90 000-00-00" },
  });

  const teacherSpecs = [
    { login: "teacher1", fullName: "Ольга Петровна Иванова", phone: "+998 90 111-11-11", subjects: [math.id] },
    { login: "teacher2", fullName: "Дилшод Анварович Каримов", phone: "+998 90 222-22-22", subjects: [english.id] },
    { login: "teacher3", fullName: "Екатерина Сергеевна Ким", phone: "+998 90 333-33-33", subjects: [math.id, english.id] },
  ];
  const teachers = [];
  for (const spec of teacherSpecs) {
    const user = await db.user.create({
      data: {
        login: spec.login,
        passwordHash: teacherHash,
        role: "TEACHER",
        fullName: spec.fullName,
        phone: spec.phone,
        teacher: { create: { subjects: { connect: spec.subjects.map((id) => ({ id })) } } },
      },
      include: { teacher: true },
    });
    teachers.push(user.teacher!);
  }

  const students = [];
  for (let i = 1; i <= 30; i++) {
    const user = await db.user.create({
      data: {
        login: `student${i}`,
        passwordHash: studentHash,
        role: "STUDENT",
        fullName: `${FIRST_NAMES[i - 1]} ${LAST_NAMES[i - 1]}`,
        phone: `+998 91 ${String(100 + i).padStart(3, "0")}-${String(10 + i).padStart(2, "0")}-${String(20 + i).padStart(2, "0")}`,
        student: {
          create: {
            parentPhone: `+998 93 ${String(200 + i).padStart(3, "0")}-${String(30 + i).padStart(2, "0")}-${String(40 + i).padStart(2, "0")}`,
            birthDate: new Date(Date.UTC(2008 + (i % 6), i % 12, 1 + (i % 27))),
          },
        },
      },
      include: { student: true },
    });
    students.push(user.student!);
  }

  const groupSpecs = [
    { name: "Математика A1", subjectId: math.id, teacherId: teachers[0].id, level: "Начальный", slots: [[1, "15:00", "16:30", "101"], [3, "15:00", "16:30", "101"]] },
    { name: "Математика B1", subjectId: math.id, teacherId: teachers[0].id, level: "Средний", slots: [[2, "16:00", "17:30", "102"], [4, "16:00", "17:30", "102"]] },
    { name: "Математика C1", subjectId: math.id, teacherId: teachers[2].id, level: "Продвинутый", slots: [[5, "14:00", "15:30", "103"], [6, "10:00", "11:30", "103"]] },
    { name: "English Beginner", subjectId: english.id, teacherId: teachers[1].id, level: "A1", slots: [[1, "17:00", "18:30", "201"], [4, "17:00", "18:30", "201"]] },
    { name: "English Intermediate", subjectId: english.id, teacherId: teachers[1].id, level: "B1", slots: [[2, "14:00", "15:30", "202"], [5, "16:00", "17:30", "202"]] },
    { name: "English Advanced", subjectId: english.id, teacherId: teachers[2].id, level: "C1", slots: [[3, "17:00", "18:30", "203"], [6, "12:00", "13:30", "203"]] },
  ] as const;

  const groups = [];
  for (const spec of groupSpecs) {
    const group = await db.group.create({
      data: {
        name: spec.name,
        subjectId: spec.subjectId,
        teacherId: spec.teacherId,
        level: spec.level,
        slots: {
          create: spec.slots.map(([dayOfWeek, startTime, endTime, room]) => ({ dayOfWeek, startTime, endTime, room })),
        },
      },
    });
    groups.push(group);
  }

  // Каждый ученик — в одной группе по математике и одной по английскому (по 10 человек в группе)
  const memberships = new Map<string, string[]>();
  for (let i = 0; i < students.length; i++) {
    const mathGroup = groups[i % 3];
    const englishGroup = groups[3 + ((i + 1) % 3)];
    for (const group of [mathGroup, englishGroup]) {
      await db.groupStudent.create({ data: { groupId: group.id, studentId: students[i].id } });
      memberships.set(group.id, [...(memberships.get(group.id) ?? []), students[i].id]);
    }
  }

  // «Способности» ученика определяют разброс рейтингов: от слабых до отличников
  const skill = new Map(students.map((s, i) => [s.id, 0.35 + ((i * 7) % 30) / 45]));

  const now = today();
  const from = addDays(now, -30);
  await ensureLessons(db, groups.map((g) => g.id), from, addDays(now, 7));

  const pastLessons = await db.lesson.findMany({
    where: { date: { gte: from, lt: now } },
    include: { group: { include: { subject: true } } },
    orderBy: { date: "asc" },
  });

  for (const lesson of pastLessons) {
    const topics = lesson.group.subjectId === math.id ? MATH_TOPICS : ENGLISH_TOPICS;
    await db.lesson.update({ where: { id: lesson.id }, data: { topic: pick(topics) } });

    const groupStudents = memberships.get(lesson.groupId) ?? [];
    const attendance: { lessonId: string; studentId: string; status: AttendanceStatus }[] = [];
    const grades: { studentId: string; groupId: string; lessonId: string; date: Date; value: number; comment: string }[] = [];
    for (const studentId of groupStudents) {
      const s = skill.get(studentId)!;
      const r = rand();
      let status: AttendanceStatus;
      if (r < 0.04) status = "EXCUSED";
      else if (r < 0.04 + (1 - s) * 0.3) status = "ABSENT";
      else if (r < 0.1 + (1 - s) * 0.4) status = "LATE";
      else status = "PRESENT";
      attendance.push({ lessonId: lesson.id, studentId, status });

      if ((status === "PRESENT" || status === "LATE") && rand() < 0.45) {
        const value = Math.max(2, Math.min(5, Math.round(2 + s * 3 + (rand() - 0.5) * 1.6)));
        grades.push({
          studentId,
          groupId: lesson.groupId,
          lessonId: lesson.id,
          date: lesson.date,
          value,
          comment: value === 5 ? "Отлично" : value <= 2 ? "Нужно повторить тему" : "",
        });
      }
    }
    await db.attendance.createMany({ data: attendance });
    if (grades.length) await db.grade.createMany({ data: grades });
  }

  // ДЗ: по одному заданию в неделю на группу, плюс одно с будущим сроком
  for (const group of groups) {
    const topics = group.subjectId === math.id ? MATH_TOPICS : ENGLISH_TOPICS;
    const dueOffsets = [-26, -19, -12, -5, 4];
    for (const [idx, offset] of dueOffsets.entries()) {
      const homework = await db.homework.create({
        data: {
          groupId: group.id,
          title: `ДЗ №${idx + 1}: ${topics[(idx * 3) % topics.length]}`,
          description:
            group.subjectId === math.id
              ? `Решить задачи из раздела «${topics[(idx * 3) % topics.length]}» (№ ${10 + idx * 5}–${15 + idx * 5}).`
              : `Выполнить упражнения по теме «${topics[(idx * 3) % topics.length]}» и выучить новые слова.`,
          dueDate: addDays(now, offset),
        },
      });
      if (offset >= 0) continue;
      const submissions: { homeworkId: string; studentId: string; status: HomeworkStatus }[] = [];
      for (const studentId of memberships.get(group.id) ?? []) {
        const s = skill.get(studentId)!;
        const r = rand();
        const status: HomeworkStatus = r < s * 0.85 ? "DONE" : r < s * 0.85 + 0.2 ? "PARTIAL" : "NOT_DONE";
        submissions.push({ homeworkId: homework.id, studentId, status });
      }
      await db.homeworkSubmission.createMany({ data: submissions });
    }
  }

  const counts = {
    users: await db.user.count(),
    groups: await db.group.count(),
    lessons: await db.lesson.count(),
    attendance: await db.attendance.count(),
    grades: await db.grade.count(),
    homework: await db.homework.count(),
  };
  console.log("Сид загружен:", counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
