// Demo data so the live site looks alive. Every person here is fictional.
//   npm run seed         -> seeds only when the database is empty
//   npm run seed:reset   -> wipes everything and seeds again
import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { pool, withTransaction } from './pool.js';
import { migrate } from './migrate.js';

export const DEMO_PASSWORD = 'demo1234';

const SUBJECTS = [
  ['מתמטיקה', '📐'], ['אנגלית', '🔤'], ['פיזיקה', '🪐'], ['תכנות', '💻'],
  ['כימיה', '🧪'], ['ביולוגיה', '🧬'], ['היסטוריה', '🏛️'], ['פסיכומטרי', '📝'],
  ['גיטרה', '🎸'], ['פסנתר', '🎹'], ['ספרות', '📚'], ['ערבית', '🗣️'],
];

const WEEKDAYS = [0, 1, 2, 3, 4];

const TUTORS = [
  {
    name: 'דניאל כהן', email: 'tutor@demo.com', city: 'תל אביב', rate: 160, years: 9,
    online: true, inPerson: true, subjects: ['מתמטיקה', 'פיזיקה'],
    headline: 'מתמטיקה ופיזיקה ל-5 יחידות, בגובה העיניים',
    bio: 'בוגר הטכניון בהנדסת חשמל. מלמד כבר תשע שנים תלמידי תיכון לקראת בגרות ב-4 ו-5 יחידות. אני מאמין שכל אחד יכול להבין מתמטיקה כשמסבירים לו נכון: מתחילים מהאינטואיציה ורק אחר כך עוברים לנוסחאות. בכל שיעור יש סיכום כתוב ותרגול לבית.',
    hours: WEEKDAYS.map((d) => [d, 16, 21]),
  },
  {
    name: 'מיכל לוי', email: 'michal@demo.com', city: 'חיפה', rate: 140, years: 6,
    online: true, inPerson: false, subjects: ['אנגלית', 'ספרות'],
    headline: 'אנגלית מדוברת, בגרות וכתיבה אקדמית',
    bio: 'גדלתי בלונדון ועברתי לארץ בגיל 15. אני עוזרת לתלמידים ולמבוגרים לדבר אנגלית בביטחון, ומכינה לבגרות ולמבחני אמי"ר. השיעורים מבוססים על שיחה, הרבה פחות על שינון.',
    hours: [[0, 9, 13], [1, 17, 21], [3, 17, 21], [5, 9, 12]],
  },
  {
    name: 'יונתן אברהם', email: 'yonatan@demo.com', city: 'רמת גן', rate: 220, years: 7,
    online: true, inPerson: false, subjects: ['תכנות', 'מתמטיקה'],
    headline: 'Python, JavaScript והכנה לראיונות טכניים',
    bio: 'מפתח Full-Stack בחברת סטארטאפ. מלמד תכנות מאפס ועד רמת ראיון עבודה: מבני נתונים, אלגוריתמים, React ו-Node. בונים יחד פרויקט אמיתי לתיק העבודות.',
    hours: [[0, 19, 23], [2, 19, 23], [4, 19, 23], [6, 10, 14]],
  },
  {
    name: 'רותם פרץ', email: 'rotem@demo.com', city: 'ירושלים', rate: 150, years: 5,
    online: true, inPerson: true, subjects: ['כימיה', 'ביולוגיה'],
    headline: 'כימיה וביולוגיה, עם המון סבלנות',
    bio: 'דוקטורנטית לביוכימיה באוניברסיטה העברית. אני אוהבת לפרק נושאים מסובכים לחלקים קטנים וברורים. מתמחה בבגרות 5 יחידות ובקורסי מבוא באקדמיה.',
    hours: [[1, 14, 19], [2, 14, 19], [3, 14, 19]],
  },
  {
    name: 'אורי שמעוני', email: 'uri@demo.com', city: 'באר שבע', rate: 130, years: 12,
    online: false, inPerson: true, subjects: ['גיטרה'],
    headline: 'גיטרה אקוסטית וחשמלית לכל הגילאים',
    bio: 'מוזיקאי ומורה לגיטרה כבר 12 שנה. מנגנים מהשיעור הראשון את השירים שאתם אוהבים, ולומדים תיאוריה בדרך. יש לי סטודיו מאובזר בבית.',
    hours: [[0, 15, 20], [1, 15, 20], [2, 15, 20], [3, 15, 20], [4, 15, 20]],
  },
  {
    name: 'הדס מזרחי', email: 'hadas@demo.com', city: 'מודיעין', rate: 170, years: 15,
    online: true, inPerson: true, subjects: ['פסנתר'],
    headline: 'פסנתר קלאסי ופופ, מגיל 6 ועד 99',
    bio: 'בוגרת האקדמיה למוזיקה. מלמדת ילדים ומבוגרים, בונה תוכנית אישית לכל תלמיד ומכינה לרסיטלים ולבחינות.',
    hours: [[0, 13, 18], [2, 13, 18], [4, 13, 18]],
  },
  {
    name: 'עידו גבאי', email: 'ido@demo.com', city: 'רחובות', rate: 190, years: 8,
    online: true, inPerson: false, subjects: ['פסיכומטרי', 'מתמטיקה'],
    headline: 'פסיכומטרי: חשיבה כמותית ומילולית, ממוצע שיפור של 90 נקודות',
    bio: 'קיבלתי 780 בפסיכומטרי ומאז אני מלמד בעיקר את הפרק הכמותי. נבנה יחד אסטרטגיה, ניהול זמן ומאגר תרגול שמותאם לנקודות החולשה שלך.',
    hours: [[0, 18, 22], [1, 18, 22], [3, 18, 22], [5, 8, 13]],
  },
  {
    name: 'ליאת בן דוד', email: 'liat@demo.com', city: 'נתניה', rate: 120, years: 4,
    online: true, inPerson: true, subjects: ['היסטוריה', 'ערבית'],
    headline: 'היסטוריה וערבית, בגרות בלי לחץ',
    bio: 'מורה בתיכון בנתניה. אני עוזרת לארגן את החומר בטבלאות ובצירי זמן שקל לזכור, ומלמדת ערבית מדוברת וספרותית.',
    hours: [[1, 16, 20], [2, 16, 20], [4, 16, 20]],
  },
];

const STUDENTS = [
  ['נועה ישראלי', 'student@demo.com'],
  ['איתי רוזן', 'itai@demo.com'],
  ['תמר אזולאי', 'tamar@demo.com'],
  ['עומר חדד', 'omer@demo.com'],
  ['יעל קפלן', 'yael@demo.com'],
  ['אביב סלע', 'aviv@demo.com'],
];

const REVIEWS = [
  [5, 'שיעור מעולה! סוף סוף הבנתי את החומר. סבלנות אין-סופית והסברים ברורים.'],
  [5, 'ממליצה בחום, הגעתי לבגרות הרבה יותר בטוחה בעצמי.'],
  [4, 'מאוד מקצועי, ההסברים עזרו לי מאוד. הייתי שמח לקבל עוד תרגילים לבית.'],
  [5, 'פשוט הכי טוב/ה שיש. השיעורים עוברים מהר ותמיד יוצאים עם משהו חדש.'],
  [5, 'גמישות בשעות, יחס אישי והרבה ידע. אין מה להוסיף.'],
  [4, 'שיעור טוב מאוד, התחלנו קצת באיחור אבל השלמנו בסוף.'],
  [5, 'אחרי שלושה שיעורים הציון שלי עלה בעשרים נקודות!'],
];

async function seed(db) {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const subjectIds = {};
  for (const [name, emoji] of SUBJECTS) {
    const { rows } = await db.query(
      'INSERT INTO subjects (name, emoji) VALUES ($1, $2) RETURNING id',
      [name, emoji],
    );
    subjectIds[name] = rows[0].id;
  }

  const studentIds = [];
  for (const [name, email] of STUDENTS) {
    const { rows } = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, created_at)
       VALUES ($1, $2, $3, 'student', now() - interval '60 days') RETURNING id`,
      [name, email, hash],
    );
    studentIds.push(rows[0].id);
  }

  const tutorIds = [];
  for (const [i, t] of TUTORS.entries()) {
    const { rows } = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, created_at)
       VALUES ($1, $2, $3, 'tutor', now() - make_interval(days => $4)) RETURNING id`,
      [t.name, t.email, hash, 90 - i * 7],
    );
    const id = rows[0].id;
    tutorIds.push(id);

    await db.query(
      `INSERT INTO tutor_profiles (user_id, headline, bio, city, hourly_rate,
         teaches_online, teaches_in_person, years_experience, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)`,
      [id, t.headline, t.bio, t.city, t.rate, t.online, t.inPerson, t.years],
    );
    for (const s of t.subjects) {
      await db.query('INSERT INTO tutor_subjects (tutor_id, subject_id) VALUES ($1, $2)', [id, subjectIds[s]]);
    }
    for (const [weekday, start, end] of t.hours) {
      await db.query(
        'INSERT INTO availability (tutor_id, weekday, start_hour, end_hour) VALUES ($1, $2, $3, $4)',
        [id, weekday, start, end],
      );
    }

    // A few past lessons with reviews, so ratings aren't empty.
    const reviewCount = 2 + ((i * 3) % 5);
    for (let r = 0; r < reviewCount; r++) {
      const studentId = studentIds[(i + r) % studentIds.length];
      const [rating, comment] = REVIEWS[(i + r * 2) % REVIEWS.length];
      const { rows: lesson } = await db.query(
        `INSERT INTO lessons (tutor_id, student_id, subject_id, starts_at, mode, price, status, created_at)
         VALUES ($1, $2, $3,
           date_trunc('hour', now()) - make_interval(days => $4, hours => $5),
           $6, $7, 'confirmed', now() - make_interval(days => $4 + 3))
         RETURNING id, starts_at`,
        [id, studentId, subjectIds[t.subjects[r % t.subjects.length]], 3 + r * 6, r,
          t.online ? 'online' : 'in_person', t.rate],
      );
      await db.query(
        `INSERT INTO reviews (lesson_id, tutor_id, student_id, rating, comment, created_at)
         VALUES ($1, $2, $3, $4, $5, $6::timestamptz + interval '2 hours')`,
        [lesson[0].id, id, studentId, rating, comment, lesson[0].starts_at],
      );
    }
  }

  // The demo tutor and demo student get a lively dashboard.
  const [demoTutor] = tutorIds;
  const [demoStudent, secondStudent] = studentIds;
  const futureLesson = (dayOffset, hour) =>
    `((now() AT TIME ZONE 'Asia/Jerusalem')::date + ${dayOffset} + make_time(${hour}, 0, 0)) AT TIME ZONE 'Asia/Jerusalem'`;

  await db.query(
    `INSERT INTO lessons (tutor_id, student_id, subject_id, starts_at, mode, note, price, status) VALUES
       ($1, $2, $4, ${futureLesson(2, 17)}, 'online', 'אשמח לעבור על אינטגרלים לקראת הבגרות', 160, 'confirmed'),
       ($1, $3, $4, ${futureLesson(3, 18)}, 'in_person', 'יש לי מבחן ביום ראשון', 160, 'pending'),
       ($1, $2, $5, ${futureLesson(6, 19)}, 'online', '', 160, 'pending'),
       ($1, $2, $4, date_trunc('hour', now()) - interval '1 day', 'online', '', 160, 'confirmed')`,
    [demoTutor, demoStudent, secondStudent, subjectIds['מתמטיקה'], subjectIds['פיזיקה']],
  );

  const conversation = [
    [demoStudent, demoTutor, 'היי דניאל! ראיתי את הפרופיל שלך. יש לך זמן לשיעור לפני הבגרות?'],
    [demoTutor, demoStudent, 'היי נועה, בשמחה! על איזה נושא תרצי לעבוד?'],
    [demoStudent, demoTutor, 'בעיקר אינטגרלים וחקירת פונקציות. קבעתי שיעור ליום שלישי.'],
    [demoTutor, demoStudent, 'מעולה, ראיתי. תביאי איתך את המבחן האחרון ונתחיל ממנו 👍'],
  ];
  for (const [i, [from, to, body]] of conversation.entries()) {
    await db.query(
      `INSERT INTO messages (sender_id, recipient_id, body, read_at, created_at)
       VALUES ($1, $2, $3, now(), now() - make_interval(mins => $4))`,
      [from, to, body, (conversation.length - i) * 45],
    );
  }
  await db.query(
    `INSERT INTO messages (sender_id, recipient_id, body, created_at)
     VALUES ($1, $2, 'שלום, אפשר לקבוע שיעור פרונטלי השבוע?', now() - interval '20 minutes')`,
    [secondStudent, demoTutor],
  );

  if (config.seedAdminPassword) {
    await db.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ('מנהל המערכת', 'admin@mentora.dev', $1, 'admin')`,
      [await bcrypt.hash(config.seedAdminPassword, 10)],
    );
  }
}

export async function seedIfEmpty() {
  const { rows } = await pool.query('SELECT EXISTS (SELECT 1 FROM users) AS has_users');
  if (rows[0].has_users) return false;
  await withTransaction(seed);
  console.log('Seeded demo data');
  return true;
}

async function main() {
  if (process.argv.includes('--reset')) {
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  }
  await migrate();
  const seeded = await seedIfEmpty();
  if (!seeded) console.log('Database already has data. Use "npm run seed:reset" to start over.');
  await pool.end();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
