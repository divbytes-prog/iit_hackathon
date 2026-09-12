import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import Icon from '../components/Icon.jsx';
import AttributeBars from '../components/AttributeBars.jsx';
import { EmptyState, ErrorState, LoadingRegion, Skeleton } from '../components/Feedback.jsx';
import { stats as statsApi } from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js';
import { ATTRIBUTES, attributeColor, formatDayKey, timeAgo } from '../utils/domain.js';
import './logbook.css';

const ENTRY_ICON = {
  task_completed: 'check',
  task_created: 'plus',
  task_reopened: 'undo',
  task_deleted: 'trash',
  level_up: 'sparkle',
  attribute_level_up: 'sparkle',
  streak_extended: 'flame',
  streak_broken: 'flame',
  streak_frozen: 'thermos',
  purchase: 'bean',
  badge_earned: 'sparkle',
  account_created: 'hearth',
};

/**
 * The Logbook — the historical record.
 *
 * This page is the visible proof that progression is auditable: every level,
 * purchase and completion has a dated receipt. The 30-day ribbon is drawn with
 * plain divs rather than a charting library, which keeps the bundle honest for
 * what is, in the end, thirty rectangles.
 */
const Logbook = () => {
  const { snapshot } = useAuth();
  const reduced = usePrefersReducedMotion();

  useDocumentTitle('Logbook', 'Your history: every completion, level and purchase, dated.');

  const [summary, setSummary] = useState(null);
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, activityData] = await Promise.all([
        statsApi.summary(),
        statsApi.activity(1, 25),
      ]);
      setSummary(summaryData);
      setEntries(activityData.entries);
      setPages(activityData.meta?.pages ?? 1);
      setPage(1);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    if (loadingMore || page >= pages) return;
    setLoadingMore(true);
    try {
      const data = await statsApi.activity(page + 1, 25);
      setEntries((current) => [...current, ...data.entries]);
      setPage((current) => current + 1);
    } catch {
      // A failed "load more" leaves what is already there — no destructive retry.
    } finally {
      setLoadingMore(false);
    }
  };

  const peak = useMemo(
    () => Math.max(1, ...(summary?.ribbon ?? []).map((day) => day.count)),
    [summary]
  );

  /** Group the feed by day, so the list reads as a diary rather than a log file. */
  const grouped = useMemo(() => {
    const map = new Map();
    entries.forEach((entry) => {
      const key = entry.day ?? entry.createdAt.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(entry);
    });
    return [...map.entries()];
  }, [entries]);

  if (loading) {
    return (
      <div className="logbook shell">
        <LoadingRegion label="Loading your logbook">
          <Skeleton width={220} height={32} />
          <div style={{ marginTop: 'var(--s-6)', display: 'grid', gap: 'var(--s-4)' }}>
            <Skeleton height={120} radius="var(--r-lg)" />
            <Skeleton height={200} radius="var(--r-lg)" />
            <Skeleton height={320} radius="var(--r-lg)" />
          </div>
        </LoadingRegion>
      </div>
    );
  }

  if (error) {
    return (
      <div className="logbook shell">
        <ErrorState title="We could not open your logbook" onRetry={load}>
          {error.message}
        </ErrorState>
      </div>
    );
  }

  const totals = summary?.totals ?? {};

  return (
    <div className="logbook shell">
      <header className="logbook__head">
        <p className="eyebrow">Everything that has happened</p>
        <h1 className="logbook__title">Logbook</h1>
      </header>

      {/* --- headline numbers ------------------------------------------- */}
      <dl className="logbook__stats">
        {[
          { label: 'Finished', value: totals.completed ?? 0, icon: 'check' },
          { label: 'Experience', value: totals.xpEarned ?? 0, icon: 'sparkle' },
          { label: 'Beans earned', value: totals.beansEarned ?? 0, icon: 'bean' },
          { label: 'Active days', value: `${totals.activeDays ?? 0}/30`, icon: 'flame' },
        ].map((stat) => (
          <div key={stat.label} className="logstat">
            <dt>
              <span className="logstat__icon" aria-hidden="true">
                <Icon name={stat.icon} size={15} />
              </span>
              {stat.label}
            </dt>
            <dd className="numeral">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div className="logbook__grid">
        <div className="logbook__col">
          {/* --- 30-day ribbon ---------------------------------------- */}
          <section className="ribbon" aria-labelledby="ribbon-heading">
            <div className="ribbon__head">
              <h2 id="ribbon-heading" className="ribbon__title">
                The last thirty days
              </h2>
              <p className="eyebrow">
                {totals.busiestDay
                  ? `busiest: ${totals.busiestDay.count} on ${formatDayKey(totals.busiestDay.day)}`
                  : 'no completions yet'}
              </p>
            </div>

            <div className="ribbon__chart" role="img" aria-label={ribbonSummary(summary?.ribbon)}>
              {(summary?.ribbon ?? []).map((day, index) => (
                <div key={day.day} className="ribbon__col" title={`${formatDayKey(day.day)} — ${day.count} finished, ${day.xp} xp`}>
                  <motion.span
                    className={`ribbon__bar ${day.count === 0 ? 'is-empty' : ''}`}
                    initial={reduced ? false : { height: 0 }}
                    animate={{
                      height: day.count === 0 ? 3 : `${Math.max(8, (day.count / peak) * 100)}%`,
                    }}
                    transition={{
                      duration: reduced ? 0 : 0.5,
                      delay: reduced ? 0 : index * 0.012,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="ribbon__axis" aria-hidden="true">
              <span>30 days ago</span>
              <span>today</span>
            </div>
          </section>

          {/* --- the feed ---------------------------------------------- */}
          <section className="feed" aria-labelledby="feed-heading">
            <h2 id="feed-heading" className="feed__title">
              History
            </h2>

            {grouped.length === 0 ? (
              <EmptyState icon="clock" title="Nothing recorded yet">
                Finish an intention and it will appear here, with exactly what it was
                worth and when.
              </EmptyState>
            ) : (
              <>
                {grouped.map(([day, dayEntries]) => (
                  <div key={day} className="feed__day">
                    <h3 className="feed__date">{formatDayKey(day)}</h3>

                    <ul className="feed__list">
                      {dayEntries.map((entry) => (
                        <li key={entry.id} className={`feed__item feed__item--${entry.type}`}>
                          <span
                            className="feed__icon"
                            style={
                              entry.attribute
                                ? { '--attr-hue': attributeColor(entry.attribute) }
                                : undefined
                            }
                            aria-hidden="true"
                          >
                            <Icon name={ENTRY_ICON[entry.type] ?? 'info'} size={13} />
                          </span>

                          <span className="feed__text">{entry.message}</span>

                          <span className="feed__deltas">
                            {entry.xpDelta ? (
                              <span className={entry.xpDelta > 0 ? 'is-gain' : 'is-loss'}>
                                {entry.xpDelta > 0 ? '+' : ''}
                                {entry.xpDelta} xp
                              </span>
                            ) : null}
                            {entry.beansDelta ? (
                              <span className={entry.beansDelta > 0 ? 'is-gain' : 'is-loss'}>
                                {entry.beansDelta > 0 ? '+' : ''}
                                {entry.beansDelta}
                                <Icon name="bean" size={11} />
                              </span>
                            ) : null}
                          </span>

                          <time className="feed__time" dateTime={entry.createdAt}>
                            {timeAgo(entry.createdAt)}
                          </time>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {page < pages ? (
                  <button
                    type="button"
                    className="btn feed__more"
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Fetching…' : 'Load older entries'}
                  </button>
                ) : (
                  <p className="feed__end">That is the whole record.</p>
                )}
              </>
            )}
          </section>
        </div>

        {/* --- sidebar --------------------------------------------------- */}
        <aside className="logbook__side">
          <AttributeBars attributes={snapshot?.attributes} heading="Where it went" />

          <section className="breakdown" aria-labelledby="breakdown-heading">
            <h2 id="breakdown-heading" className="breakdown__title">
              By attribute
            </h2>

            <ul className="breakdown__list">
              {(summary?.attributes ?? []).map((row) => (
                <li
                  key={row.key}
                  className="breakdown__row"
                  style={{ '--attr-hue': attributeColor(row.key) }}
                >
                  <span className="breakdown__dot" aria-hidden="true" />
                  <span className="breakdown__label">
                    {ATTRIBUTES[row.key]?.label ?? row.label}
                  </span>
                  <span className="breakdown__count numeral">{row.completed}</span>
                  <span className="breakdown__xp numeral">{row.xpFromTasks} xp</span>
                </li>
              ))}
            </ul>

            {totals.created > 0 ? (
              <p className="breakdown__rate">
                <strong className="numeral">{totals.completionRate}%</strong> of everything
                you have written down is finished.
              </p>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
};

/** A one-sentence description of the chart, for screen readers. */
const ribbonSummary = (ribbon = []) => {
  const total = ribbon.reduce((sum, day) => sum + day.count, 0);
  const active = ribbon.filter((day) => day.count > 0).length;
  return `Activity over the last 30 days: ${total} intentions finished across ${active} active days.`;
};

export default Logbook;
