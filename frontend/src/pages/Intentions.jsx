import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';

import Icon from '../components/Icon.jsx';
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
} from '../components/Feedback.jsx';

import { tasks as tasksApi } from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useIntentions } from '../hooks/useIntentions.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { ATTRIBUTE_LIST, ATTRIBUTES, attributeColor } from '../utils/domain.js';
import './intentions.css';

const STATUS_TABS = [
  { key: 'active', label: 'On the desk' },
  { key: 'completed', label: 'Done' },
  { key: 'archived', label: 'Archived' },
  { key: 'all', label: 'Everything' },
];

/**
 * The full library of intentions — search, filters, sorting, and every CRUD
 * operation in one place.
 *
 * The search box is debounced by 280ms so typing does not fire a request per
 * keystroke, and each request carries an AbortController so a slow earlier
 * response can never overwrite a newer one.
 */
const Intentions = () => {
  const { snapshot, applySnapshot } = useAuth();
  const toast = useToast();

  useDocumentTitle('Intentions', 'Everything you mean to do, searchable and filterable.');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);

  const [status, setStatus] = useState('active');
  const [attribute, setAttribute] = useState('');
  const [sort, setSort] = useState('manual');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [levelUp, setLevelUp] = useState(null);
  const [bursts, setBursts] = useState([]);

  const onReward = useCallback(
    ({ reward, levelUp: gained, attributeLevelUp, origin }) => {
      if (origin) {
        setBursts((current) => [
          ...current,
          { id: `${Date.now()}`, x: origin.x, y: origin.y, xp: reward.xp, beans: reward.beans },
        ]);
      }
      toast.reward(`+${reward.xp} xp · +${reward.beans} beans`);
      if (attributeLevelUp) {
        const label = ATTRIBUTES[attributeLevelUp.attribute]?.label ?? 'An attribute';
        toast.success(`${label} reached level ${attributeLevelUp.to}.`);
      }
      if (gained) setLevelUp({ level: gained.to, title: snapshot?.character?.title ?? '' });
    },
    [toast, snapshot?.character?.title]
  );

  const { items, setItems, busyIds, complete, reopen, create, update, remove } = useIntentions({
    onReward,
  });

  // Debounce the search term.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 280);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(
    async (signal) => {
      setLoading(true);
      setError(null);
      try {
        const data = await tasksApi.list({
          status,
          attribute: attribute || undefined,
          q: debounced || undefined,
          sort,
          limit: 100,
        });
        if (signal?.aborted) return;
        setItems(data.tasks);
        setMeta(data.meta ?? null);
      } catch (caught) {
        if (caught.name === 'AbortError' || signal?.aborted) return;
        setError(caught);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [status, attribute, debounced, sort, setItems]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const onComplete = (task) => {
    const rect = document.activeElement?.getBoundingClientRect?.();
    complete(task, rect ? { x: rect.left, y: rect.top } : null);
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

  const archive = async (task) => {
    try {
      await update(task.id, { status: task.status === 'archived' ? 'active' : 'archived' });
    } catch (caught) {
      toast.error(caught.message);
    }
  };

  const activeFilters = Boolean(attribute || debounced || sort !== 'manual');

  const emptyCopy = useMemo(() => {
    if (debounced) {
      return {
        title: `Nothing matches “${debounced}”`,
        body: 'Try a shorter word, or clear the filters to see everything.',
      };
    }
    if (status === 'completed') {
      return {
        title: 'Nothing finished yet',
        body: 'Completed intentions collect here, with what each one was worth.',
      };
    }
    if (status === 'archived') {
      return {
        title: 'Nothing archived',
        body: 'Archiving is for things you have not given up on but do not want on the desk today.',
      };
    }
    return {
      title: 'The desk is clear',
      body: 'Write down one thing you mean to do. Small is fine — small is better, actually.',
    };
  }, [status, debounced]);

  return (
    <div className="intentions shell">
      <header className="intentions__head">
        <div>
          <p className="eyebrow">Everything you mean to do</p>
          <h1 className="intentions__title">Intentions</h1>
        </div>

        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            setEditing(null);
            setComposerOpen(true);
          }}
        >
          <Icon name="plus" size={16} />
          New intention
        </button>
      </header>

      {/* --- status tabs ---------------------------------------------- */}
      <div className="intentions__tabs" role="tablist" aria-label="Filter by status">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={status === tab.key}
            className={`intentions__tab ${status === tab.key ? 'is-on' : ''}`}
            onClick={() => setStatus(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* --- filters --------------------------------------------------- */}
      <div className="intentions__filters">
        <div className="intentions__search">
          <Icon name="search" size={16} />
          <input
            type="search"
            className="input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search titles and tags…"
            aria-label="Search intentions"
          />
          {search ? (
            <button
              type="button"
              className="intentions__clear"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <Icon name="close" size={13} />
            </button>
          ) : null}
        </div>

        <div className="intentions__attrs" role="group" aria-label="Filter by attribute">
          <button
            type="button"
            className={`intentions__pill ${!attribute ? 'is-on' : ''}`}
            onClick={() => setAttribute('')}
            aria-pressed={!attribute}
          >
            All
          </button>

          {ATTRIBUTE_LIST.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`intentions__pill ${attribute === item.key ? 'is-on' : ''}`}
              style={{ '--attr-hue': attributeColor(item.key) }}
              onClick={() => setAttribute(attribute === item.key ? '' : item.key)}
              aria-pressed={attribute === item.key}
            >
              <Icon name={item.icon} size={13} />
              {item.label}
            </button>
          ))}
        </div>

        <label className="intentions__sort">
          <span className="visually-hidden">Sort by</span>
          <select
            className="select"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            aria-label="Sort intentions"
          >
            <option value="manual">My order</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="due">By due date</option>
            <option value="difficulty">Hardest first</option>
          </select>
        </label>
      </div>

      {/* --- results --------------------------------------------------- */}
      {loading ? (
        <LoadingRegion label="Loading intentions">
          <IntentionSkeleton count={6} />
        </LoadingRegion>
      ) : error ? (
        <ErrorState title="We could not load your intentions" onRetry={() => load()}>
          {error.message}
        </ErrorState>
      ) : items.length === 0 ? (
        <EmptyState
          icon="scroll"
          title={emptyCopy.title}
          action={
            activeFilters ? (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setAttribute('');
                  setSearch('');
                  setSort('manual');
                }}
              >
                Clear filters
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setComposerOpen(true)}
              >
                <Icon name="plus" size={16} />
                Write one down
              </button>
            )
          }
        >
          {emptyCopy.body}
        </EmptyState>
      ) : (
        <>
          <p className="intentions__count" role="status">
            {meta?.total ?? items.length}{' '}
            {(meta?.total ?? items.length) === 1 ? 'intention' : 'intentions'}
            {activeFilters ? ' matching' : ''}
          </p>

          <ul className="intentions__list">
            <AnimatePresence initial={false} mode="popLayout">
              {items.map((task, index) => (
                <IntentionCard
                  key={task.id}
                  task={task}
                  index={index}
                  busy={busyIds.has(task.id)}
                  onComplete={onComplete}
                  onReopen={reopen}
                  onEdit={(t) => {
                    setEditing(t);
                    setComposerOpen(true);
                  }}
                  onDelete={setPendingDelete}
                />
              ))}
            </AnimatePresence>
          </ul>
        </>
      )}

      {/* --- overlays --------------------------------------------------- */}
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
            ? `"${pendingDelete.title}" will be removed for good. Experience you already earned from it stays with you.`
            : ''
        }
        onConfirm={async () => {
          const task = pendingDelete;
          setPendingDelete(null);
          await remove(task);
        }}
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

export default Intentions;
