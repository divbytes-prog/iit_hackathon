import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import './notfound.css';

/**
 * 404. Reachable by typo or by a stale link, so it offers both doors — the
 * desk for someone signed in, the front page for everyone else.
 */
const NotFound = () => {
  const { isAuthed } = useAuth();
  useDocumentTitle('Not found', 'That page does not exist on Hearthlog.');

  return (
    <main className="notfound">
      <div className="notfound__inner">
        <span className="notfound__mark" aria-hidden="true">
          <Icon name="search" size={24} />
        </span>

        <p className="notfound__code" aria-hidden="true">
          404
        </p>

        <h1 className="notfound__title">Nothing on this shelf</h1>

        <p className="notfound__body">
          That page is not here. It may have been moved, or the link may have had a typo
          in it — either way, there is nothing to read at this address.
        </p>

        <div className="notfound__actions">
          {isAuthed ? (
            <Link to="/app" className="btn btn--primary">
              Back to the desk
            </Link>
          ) : (
            <>
              <Link to="/" className="btn btn--primary">
                Back to the front page
              </Link>
              <Link to="/login" className="btn">
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
};

export default NotFound;
