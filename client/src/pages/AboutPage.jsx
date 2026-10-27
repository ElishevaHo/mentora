import { Link } from 'react-router-dom';

const STACK = [
  ['React 19 + Vite', 'ממשק משתמש, React Router, Context API ו-hooks מותאמים'],
  ['Node.js + Express 5', 'REST API, JWT, הרשאות לפי תפקיד, rate limiting ו-Helmet'],
  ['PostgreSQL', 'שאילתות SQL ידניות, אינדקס ייחודי חלקי נגד הזמנה כפולה, חישוב שעות פנויות לפי אזור זמן'],
  ['Socket.IO', 'הודעות, אינדיקציית הקלדה ועדכוני סטטוס של שיעורים בזמן אמת'],
];

export default function AboutPage() {
  return (
    <article className="about">
      <p className="eyebrow">על הפרויקט</p>
      <h1 className="title title--xl">Mentora: מרקטפלייס לשיעורים פרטיים</h1>
      <p className="lede">
        פרויקט Full-Stack שבניתי מאפס: תלמידים מוצאים מורה, רואים את השעות הפנויות שלו/ה באמת,
        מזמינים שיעור ומתכתבים בזמן אמת. מורים מנהלים פרופיל, יומן שבועי ובקשות. מנהל/ת מערכת
        מנהל/ת משתמשים ומקצועות.
      </p>

      <h2 className="title">טכנולוגיות</h2>
      <dl className="stack-list">
        {STACK.map(([name, desc]) => (
          <div key={name}><dt>{name}</dt><dd>{desc}</dd></div>
        ))}
      </dl>

      <h2 className="title">רוצים לנסות?</h2>
      <p>
        בעמוד <Link to="/login">הכניסה</Link> יש כפתורי כניסה מהירה לחשבון תלמידה ולחשבון מורה לדוגמה.
        כדאי לפתוח את שניהם בשני דפדפנים, לשלוח הודעה ולראות אותה מגיעה מיד.
      </p>
    </article>
  );
}
