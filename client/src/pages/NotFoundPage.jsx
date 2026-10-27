import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="not-found">
      <p className="not-found__code">404</p>
      <h1 className="title title--xl">הדף הזה הבריז מהשיעור</h1>
      <p className="lede">אולי הקישור שגוי, או שהדף עבר למקום אחר.</p>
      <Link to="/" className="btn btn--ink">חזרה לדף הבית</Link>
    </div>
  );
}
