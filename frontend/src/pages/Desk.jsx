import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import Icon from '../components/Icon.jsx';
import CharacterCard from '../components/CharacterCard.jsx';
import StreakHearth from '../components/StreakHearth.jsx';
import AttributeBars from '../components/AttributeBars.jsx';
import IntentionCard from '../components/IntentionCard.jsx';
import IntentionComposer from '../components/IntentionComposer.jsx';
import LevelUpCurtain from '../components/LevelUpCurtain.jsx';
import XpFloat from '../components/XpFloat.jsx';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  IntentionSkeleton,
  LoadingRegion,
  Skeleton,
} from '../components/Feedback.jsx';

import { tasks as tasksApi } from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useIntentions } from '../hooks/useIntentions.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { ATTRIBUTES } from '../utils/domain.js';
import './desk.css';

const greet = () => {
  const hour = new Date().getHours();
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 22) return 'Good evening';
  return 'Late one';
};

/**
 * The Desk — where the app opens.
 *
 * Everything here comes from a single `/tasks/today` call, so first paint is
 * one round trip rather than four. While it is in flight the layout is drawn
 * in skeleton form at the right dimensions, so nothing shifts when the data
 * lands.
 */
const Desk = () => {
  const { user, snapshot, applySnapshot } = useAuth();
  const toast = useToast();

  useDocumentTitle(
    'Your desk',
    'Today’s intentions, your streak and your progress at a glance.'
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [doneToday, setDoneToday] = useState([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [levelUp, setLevelUp] = useState(null);
  const [bursts, setBursts] = useState([]);

  /** Celebrations: a floating +xp, a toast, and the curtain for a new chapter. */
  const onReward = useCallback(
    ({ reward, levelUp: gained, attributeLevelUp, streak, origin }) => {
      if (origin) {
        setBursts((current) => [
          ...current,
          { id: `${Date.now()}`, x: origin.x, y: origin.y, xp: reward.xp, beans: reward.beans },
        ]);
      }

      const bonus =
        reward.streakBonus > 1 ? ` (streak bonus ×${reward.streakBonus.toFixed(2)})` : '';

      toast.reward(`+${reward.xp} xp · +${reward.beans} beans`, { detail: `Well done${bonus}.` });

      if (attributeLevelUp) {
        const label = ATTRIBUTES[attributeLevelUp.attribute]?.label ?? 'An attribute';
        toast.success(`${label} reached level ${attributeLevelUp.to}.`);
      }

      if (streak?.outcome === 'frozen') {
        toast.info('A Dented Thermos saved your streak.', {
          detail: 'It kept the hearth warm through the day you missed.',
        });
      }

      if (gained) setLevelUp({ level: gained.to, title: snapshot?.character?.title ?? '' });
    },
    [toast, snapshot?.character?.title]
  );

  const { items, setItems, busyIds, complete, reopen, create, update, remove } = useIntentions({
    onReward,
  });

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await tasksApi.today();
      setItems(data.active);
      setDoneToday(data.completedToday);
      applySnapshot(data.snapshot);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [setItems, applySnapshot]);

  useEffect(() => {
    load();
  }, [load]);

  // The level-up curtain needs the *new* title, which lands with the snapshot.
  useEffect(() => {
    if (levelUp && snapshot?.character?.title && !levelUp.title) {
      setLevelUp((current) => ({ ...current, title: snapshot.character.title }));
    }
  }, [snapshot?.character?.title, levelUp]);

  /**
   * On the Desk the two lists are exclusive: something is either outstanding
   * or finished today, never both. So a completion moves the card between
   * them rather than just restyling it in place — including for repeating
   * intentions, which stay `active` on the server but are done for today.
   */
  const onComplete = async (task) => {
    const element = document.activeElement?.getBoundingClientRect?.();
    const origin = element ? { x: element.left, y: element.top } : null;

    const result = await complete(task, origin);
    if (!result) return;

    setItems((current) => current.filter((item) => item.id !== task.id));
    setDoneToday((current) => [result.task, ...current.filter((t) => t.id !== task.id)]);
  };

  const onReopen = async (task) => {
    const result = await reopen(task);
    if (!result) return;

    setDoneToday((current) => current.filter((t) => t.id !== task.id));
    setItems((current) =>
      current.some((item) => item.id === task.id) ? current : [result.task, ...current]
    );
  };

  const submitComposer = async (payload) => {
    setSaving(true);
    try {
      if (editing) await update(editing.id, payload);
      else await create(payload);
      setComposerOpen(false);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    const task = pendingDelete;
    setPendingDelete(null);
    await remove(task);
  };

  const completedCount = snapshot?.today?.completed ?? doneToday.length;
  const firstName = (user?.username ?? '').split(' ')[0];

  return (
    <div className="desk shell">
      {/* --- greeting -------------------------------------------------- */}
      <header className="desk__greeting">
        <div>
          <p className="eyebrow">
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
          <h1 className="desk__hello">{firstName ? `${greet()}, ${firstName}.` : `${greet()}.`}</h1>
          <p className="desk__sub">
            {!snapshot
              ? 'Fetching what you have been up to.'
              : completedCount === 0
                ? 'Nothing finished yet today. Pick the easiest thing and start there.'
                : completedCount === 1
                  ? 'One thing done. That is how it starts.'
                  : `${completedCount} things done today. The room is warmer for it.`}
          </p>
        </div>

        <button
          type="button"
          className="btn btn--primary btn--lg desk__add"
          onClick={() => {
            setEditing(null);
            setComposerOpen(true);
          }}
        >
          <Icon name="plus" size={17} />
          New intention
        </button>
      </header>

      <div className="desk__grid">
        {/* --- left column: the list ---------------------------------- */}
        <section className="desk__main" aria-labelledby="today-heading">
          <div className="desk__section-head">
            <h2 id="today-heading" className="desk__section-title">
              On the desk
            </h2>
            {!loading && items.length > 0 ? (
              <span className="desk__count numeral">{items.length}</span>
            ) : null}
          </div>

          {loading ? (
            <LoadingRegion label="Loading your intentions">
              <IntentionSkeleton count={4} />
            </LoadingRegion>
          ) : error ? (
            <ErrorState title="We could not reach your desk" onRetry={load}>
              {error.message}
            </ErrorState>
          ) : items.length === 0 ? (
            <EmptyState
              icon="scroll"
              title="The desk is clear"
              action={
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => setComposerOpen(true)}
                >
                  <Icon name="plus" size={16} />
                  Write the first one
                </button>
              }
            >
              Start with something small and genuinely doable — a page of a book, ten
              minutes of tidying. The point is to finish, not to impress.
            </EmptyState>
          ) : (
            <ul className="desk__list">
              <AnimatePresence initial={false}>
                {items.map((task, index) => (
                  <IntentionCard
                    key={task.id}
                    task={task}
                    index={index}
                    busy={busyIds.has(task.id)}
                    onComplete={onComplete}
                    onReopen={onReopen}
                    onEdit={(t) => {
                      setEditing(t);
                      setComposerOpen(true);
                    }}
                    onDelete={setPendingDelete}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}

          {/* --- finished today ------------------------------------- */}
          {doneToday.length > 0 ? (
            <section className="desk__done" aria-labelledby="done-heading">
              <div className="desk__section-head">
                <h2 id="done-heading" className="desk__section-title desk__section-title--quiet">
                  Finished today
                </h2>
                <span className="desk__count numeral">{doneToday.length}</span>
              </div>

              <ul className="desk__list">
                <AnimatePresence initial={false}>
                  {doneToday.map((task, index) => (
                    <IntentionCard
                      key={task.id}
                      task={{ ...task, status: 'completed' }}
                      index={index}
                      busy={busyIds.has(task.id)}
                      onReopen={onReopen}
                      onEdit={(t) => {
                        setEditing(t);
                        setComposerOpen(true);
                      }}
                      onDelete={setPendingDelete}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          ) : null}
        </section>

        {/* --- right column: the character ---------------------------- */}
        <aside className="desk__side" aria-label="Your character">
          {/* Keyed off the snapshot itself, not the loading flag: if the
              request failed we still have nothing to show, and rendering the
              card from empty state would invent a Chapter 1 with zero beans
              that the account may not have. A skeleton says "unknown"; those
              numbers would say something false. */}
          {!snapshot ? (
            <div className="desk__side-skeleton">
              <Skeleton height={150} radius="var(--r-lg)" />
              <Skeleton height={96} radius="var(--r-lg)" />
              <Skeleton height={260} radius="var(--r-lg)" />
            </div>
          ) : (
            <>
              <CharacterCard
                snapshot={snapshot}
                username={user?.username}
                equipped={snapshot?.character?.equipped}
                badgeCount={snapshot?.badges?.length ?? 0}
              />
              <StreakHearth streak={snapshot?.streak} />
              <AttributeBars attributes={snapshot?.attributes} />

              <Link to="/app/shelf" className="desk__shelf-nudge">
                <span className="desk__shelf-icon" aria-hidden="true">
                  <Icon name="shelf" size={17} />
                </span>
                <span>
                  <strong>Spend your beans</strong>
                  <em>Mugs, plants, lamps and records on The Shelf.</em>
                </span>
                <Icon name="chevronRight" size={15} />
              </Link>
            </>
          )}
        </aside>
      </div>

      {/* --- overlays ---------------------------------------------------- */}
      <IntentionComposer
        open={composerOpen}
        initial={editing}
        busy={saving}
        onSubmit={submitComposer}
        onClose={() => {
          setComposerOpen(false);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this intention?"
        body={
          pendingDelete
            ? `"${pendingDelete.title}" will be removed for good. Any experience you already earned from it stays with you.`
            : ''
        }
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <LevelUpCurtain event={levelUp} onClose={() => setLevelUp(null)} />

      <XpFloat
        bursts={bursts}
        onDone={(id) => setBursts((current) => current.filter((b) => b.id !== id))}
      />
    </div>
  );
};

export default Desk;
