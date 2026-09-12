import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { character as characterApi } from '../api/endpoints.js';
import './settings.css';

const RECORDS = [
  {
    key: 'daylight',
    name: 'Daylight',
    blurb: 'Cream paper, terracotta and sage. The default.',
    swatch: ['#fbf6ee', '#c97b5a', '#7d8f69'],
    free: true,
  },
  {
    key: 'dusk',
    name: 'Dusk Sessions',
    blurb: 'Amber and long shadows. Late afternoon.',
    swatch: ['#f6ece0', '#c26a44', '#d99a2b'],
    slug: 'record-dusk',
  },
  {
    key: 'rain',
    name: 'Rain On The Window',
    blurb: 'Slate, sage and wet stone.',
    swatch: ['#eef1ef', '#7f94a3', '#6c8a7a'],
    slug: 'record-rain',
  },
  {
    key: 'midnight',
    name: 'Midnight Oil',
    blurb: 'The lamp is the only thing still on.',
    swatch: ['#1c1a18', '#d98b64', '#e0b155'],
    slug: 'record-midnight',
  },
];

/**
 * Settings — records, motion, and the rules of the game.
 *
 * The rules table is fetched from the API rather than duplicated here on
 * purpose: it is the same data the server scores with, so what a player reads
 * is what actually happens.
 */
const Settings = () => {
  const { user, savePreferences, logout } = useAuth();
  const toast = useToast();

  useDocumentTitle('Settings', 'Choose a record, adjust motion, and read the rules.');

  const [rules, setRules] = useState(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const unlocked = user?.unlockedThemes ?? ['daylight'];
  const current = user?.preferences?.theme ?? 'daylight';

  const chooseRecord = async (record) => {
    if (saving || record.key === current) return;

    if (!unlocked.includes(record.key)) {
      toast.info(`${record.name} is still on The Shelf.`, {
        detail: 'Buy the record to unlock this look.',
      });
      return;
    }

    setSaving(true);
    try {
      await savePreferences({ theme: record.key });
      toast.success(`${record.name} is on.`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (key, value, label) => {
    try {
      await savePreferences({ [key]: value });
      toast.success(label);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const openRules = async () => {
    setRulesOpen((open) => !open);
    if (rules) return;
    try {
      setRules(await characterApi.rules());
    } catch {
      toast.error('Could not fetch the rules just now.');
    }
  };

  return (
    <div className="settings shell">
      <header className="settings__head">
        <p className="eyebrow">Your preferences</p>
        <h1 className="settings__title">Settings</h1>
      </header>

      {/* --- account ---------------------------------------------------- */}
      <section className="panel" aria-labelledby="account-heading">
        <h2 id="account-heading" className="panel__title">
          Account
        </h2>

        <dl className="settings__account">
          <div>
            <dt>Name</dt>
            <dd>{user?.username}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user?.email}</dd>
          </div>
          <div>
            <dt>Timezone</dt>
            <dd>
              {user?.timezone}
              <span className="settings__note">
                Streaks roll over at your midnight, not the server's.
              </span>
            </dd>
          </div>
          <div>
            <dt>Joined</dt>
            <dd>
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : '—'}
            </dd>
          </div>
        </dl>
      </section>

      {/* --- records ---------------------------------------------------- */}
      <section className="panel" aria-labelledby="records-heading">
        <div className="panel__head">
          <h2 id="records-heading" className="panel__title">
            Records
          </h2>
          <p className="panel__sub">
            Each one repaints the whole interface. Buy them on The Shelf.
          </p>
        </div>

        <ul className="records" role="radiogroup" aria-label="Interface record">
          {RECORDS.map((record) => {
            const isUnlocked = record.free || unlocked.includes(record.key);
            const isOn = current === record.key;

            return (
              <li key={record.key}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isOn}
                  className={`record ${isOn ? 'is-on' : ''} ${!isUnlocked ? 'is-locked' : ''}`}
                  onClick={() => chooseRecord(record)}
                  disabled={saving}
                >
                  <span className="record__swatches" aria-hidden="true">
                    {record.swatch.map((colour) => (
                      <span key={colour} style={{ background: colour }} />
                    ))}
                  </span>

                  <span className="record__body">
                    <span className="record__name">
                      {record.name}
                      {!isUnlocked ? <Icon name="lock" size={12} /> : null}
                    </span>
                    <span className="record__blurb">{record.blurb}</span>
                  </span>

                  {isOn ? (
                    <span className="record__on" aria-hidden="true">
                      <Icon name="check" size={14} />
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* --- motion ----------------------------------------------------- */}
      <section className="panel" aria-labelledby="motion-heading">
        <h2 id="motion-heading" className="panel__title">
          Comfort
        </h2>

        <div className="toggles">
          <label className="toggle">
            <input
              type="checkbox"
              checked={Boolean(user?.preferences?.reducedMotion)}
              onChange={(event) =>
                toggle(
                  'reducedMotion',
                  event.target.checked,
                  event.target.checked ? 'Animation turned down.' : 'Animation turned back on.'
                )
              }
            />
            <span className="toggle__track" aria-hidden="true">
              <span className="toggle__knob" />
            </span>
            <span className="toggle__label">
              <strong>Reduce animation</strong>
              <em>
                Turns off particles, springs and transitions. Your system setting is
                already respected — this is in addition to it.
              </em>
            </span>
          </label>
        </div>
      </section>

      {/* --- the rules -------------------------------------------------- */}
      <section className="panel" aria-labelledby="rules-heading">
        <div className="panel__head">
          <h2 id="rules-heading" className="panel__title">
            How scoring works
          </h2>
          <button
            type="button"
            className="btn btn--sm"
            onClick={openRules}
            aria-expanded={rulesOpen}
          >
            {rulesOpen ? 'Hide' : 'Show the numbers'}
            <Icon name={rulesOpen ? 'chevronDown' : 'chevronRight'} size={14} />
          </button>
        </div>

        <p className="panel__sub">
          Nothing here is hidden. These are the exact tables the server scores with — the
          app in your browser only ever asks.
        </p>

        {rulesOpen ? (
          rules ? (
            <div className="rules">
              <div className="rules__block">
                <h3>What each difficulty is worth</h3>
                <table className="rules__table">
                  <thead>
                    <tr>
                      <th scope="col">Tier</th>
                      <th scope="col">XP</th>
                      <th scope="col">Beans</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.difficulties.map((tier) => (
                      <tr key={tier.key}>
                        <th scope="row">{tier.label}</th>
                        <td className="numeral">{tier.xp}</td>
                        <td className="numeral">{tier.beans}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rules__block">
                <h3>What each chapter costs</h3>
                <p className="rules__note">{rules.curve.description}</p>
                <table className="rules__table">
                  <thead>
                    <tr>
                      <th scope="col">Chapter</th>
                      <th scope="col">XP to the next</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.curve.characterLevels.slice(0, 10).map((row) => (
                      <tr key={row.level}>
                        <th scope="row" className="numeral">
                          {row.level}
                        </th>
                        <td className="numeral">{row.xpToNext}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rules__block">
                <h3>Bonuses and brakes</h3>
                <p className="rules__note">
                  <strong>Streak.</strong> {rules.bonuses.streak}
                </p>
                <p className="rules__note">
                  <strong>Fatigue.</strong> {rules.bonuses.fatigue}
                </p>
              </div>
            </div>
          ) : (
            <p className="panel__sub">Fetching…</p>
          )
        ) : null}
      </section>

      {/* --- sign out --------------------------------------------------- */}
      <section className="panel panel--quiet">
        <div className="panel__head">
          <div>
            <h2 className="panel__title">Sign out</h2>
            <p className="panel__sub">
              Your progress stays on the server. Sign back in anywhere.
            </p>
          </div>
          <button type="button" className="btn" onClick={logout}>
            <Icon name="logout" size={15} />
            Sign out
          </button>
        </div>
      </section>
    </div>
  );
};

export default Settings;
