const TINTS = ['#e8b04b', '#d9663f', '#2f7a6c', '#5a6fb3', '#b65a8b', '#7c8b3a'];

function initials(name = '') {
  const words = name.trim().split(/\s+/);
  return (words[0]?.[0] ?? '') + (words[1]?.[0] ?? '');
}

export function Avatar({ person, size = 44 }) {
  const style = { width: size, height: size, fontSize: size * 0.38 };
  if (person?.avatarUrl) {
    return <img className="avatar" src={person.avatarUrl} alt="" style={style} />;
  }
  return (
    <span
      className="avatar avatar--initials"
      style={{ ...style, background: TINTS[(person?.id ?? 0) % TINTS.length] }}
      aria-hidden="true"
    >
      {initials(person?.fullName)}
    </span>
  );
}
