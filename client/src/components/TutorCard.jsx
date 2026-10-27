import { Link } from 'react-router-dom';
import { Avatar } from './Avatar.jsx';
import { Stars } from './Stars.jsx';
import { fmtPrice } from '../lib/format.js';

export function TutorCard({ tutor }) {
  return (
    <Link to={`/tutors/${tutor.id}`} className="tutor-card">
      <div className="tutor-card__top">
        <Avatar person={tutor} size={64} />
        <div className="tutor-card__price">
          <strong>{fmtPrice(tutor.hourlyRate)}</strong>
          <span>לשעה</span>
        </div>
      </div>
      <h3 className="tutor-card__name">{tutor.fullName}</h3>
      <p className="tutor-card__headline">{tutor.headline}</p>
      <ul className="tags">
        {tutor.subjects.map((s) => <li key={s}>{s}</li>)}
      </ul>
      <div className="tutor-card__foot">
        <Stars value={tutor.rating} count={tutor.reviewCount} />
        <span className="tutor-card__meta">
          {tutor.city && <span>{tutor.city}</span>}
          {tutor.teachesOnline && <span>אונליין</span>}
        </span>
      </div>
    </Link>
  );
}
