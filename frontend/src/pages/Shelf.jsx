import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import Icon from '../components/Icon.jsx';
import { EmptyState, ErrorState, LoadingRegion, Skeleton } from '../components/Feedback.jsx';
import { shop as shopApi } from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useCountUp } from '../hooks/useCountUp.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js';
import { CATEGORY_LABELS, RARITY_LABELS } from '../utils/domain.js';
import './shelf.css';

const ORDER = ['mug', 'plant', 'lamp', 'record', 'badge', 'consumable'];

/**
 * The Shelf — where beans turn into a nicer room.
 *
 * Buying is the other half of the reward loop, so it gets the same treatment
 * as completing: the card reacts immediately, the balance rolls down rather
 * than jumping, and a record (theme) repaints the entire interface the instant
 * it is bought, which is the most satisfying purchase in the app.
 */
const Shelf = () => {
  const { user, applySnapshot, savePreferences } = useAuth();
  const toast = useToast();
  const reduced = usePrefersReducedMotion();

  useDocumentTitle('The Shelf', 'Spend your beans on mugs, plants, lamps, records and badges.');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('all');
  const [buying, setBuying] = useState(null);
  const [justBought, setJustBought] = useState(null);

  const beans = useCountUp(user?.character?.beans ?? 0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await shopApi.items();
      setItems(data.items);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const buy = async (item) => {
    if (buying || !item.canBuy) return;
    setBuying(item.slug);

    try {
      const result = await shopApi.purchase(item.slug);
      applySnapshot(result.snapshot);

      // Re-read the catalog so ownership and affordability are right again.
      const data = await shopApi.items();
      setItems(data.items);

      setJustBought(item.slug);
      setTimeout(() => setJustBought(null), 1400);

      const effect = result.effects?.[0];

      if (effect?.kind === 'theme') {
        toast.success(`${item.name} is on the turntable.`, {
          detail: 'Applying it now — you can switch back in Settings.',
        });
        // Put the record on straight away; that is the whole reason to buy it.
        savePreferences({ theme: effect.theme }).catch(() => {});
      } else if (effect?.kind === 'streakFreeze') {
        toast.success(`${item.name} tucked away.`, {
          detail: `You now have ${effect.freezes} in reserve for a missed day.`,
        });
      } else if (effect?.kind === 'badge') {
        toast.success(`${item.name} pinned to the corkboard.`);
      } else {
        toast.success(`${item.name} is yours.`, { detail: 'Placed on the desk.' });
      }
    } catch (caught) {
      if (caught.code === 'INSUFFICIENT_FUNDS') {
        toast.error(caught.message, { detail: 'Finish another intention or two.' });
      } else {
        toast.error(caught.message);
      }
    } finally {
      setBuying(null);
    }
  };

  const grouped = useMemo(() => {
    const visible = category === 'all' ? items : items.filter((i) => i.category === category);
    return ORDER.map((key) => ({
      key,
      label: CATEGORY_LABELS[key],
      items: visible.filter((item) => item.category === key),
    })).filter((group) => group.items.length > 0);
  }, [items, category]);

  const owned = items.filter((item) => item.owned).length;

  return (
    <div className="shelf shell">
      <header className="shelf__head">
        <div>
          <p className="eyebrow">Spend what you have earned</p>
          <h1 className="shelf__title">The Shelf</h1>
          <p className="shelf__lede">
            Everything here is earned, nothing is bought with money. Records repaint the
            whole interface; a thermos will cover for you on a day you miss.
          </p>
        </div>

        <div className="shelf__purse">
          <Icon name="bean" size={20} />
          <span className="shelf__purse-num numeral">{beans}</span>
          <span className="shelf__purse-label">beans</span>
        </div>
      </header>

      {/* --- category filter -------------------------------------------- */}
      <div className="shelf__cats" role="group" aria-label="Filter by category">
        <button
          type="button"
          className={`shelf__cat ${category === 'all' ? 'is-on' : ''}`}
          onClick={() => setCategory('all')}
          aria-pressed={category === 'all'}
        >
          Everything
        </button>
        {ORDER.map((key) => (
          <button
            key={key}
            type="button"
            className={`shelf__cat ${category === key ? 'is-on' : ''}`}
            onClick={() => setCategory(category === key ? 'all' : key)}
            aria-pressed={category === key}
          >
            {CATEGORY_LABELS[key]}
          </button>
        ))}

        {!loading ? (
          <span className="shelf__owned">
            {owned} of {items.length} collected
          </span>
        ) : null}
      </div>

      {/* --- catalogue --------------------------------------------------- */}
      {loading ? (
        <LoadingRegion label="Loading The Shelf">
          <div className="shelf__grid">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="card" style={{ padding: 'var(--s-5)' }}>
                <Skeleton width={44} height={44} radius="var(--r-md)" />
                <div style={{ marginTop: 'var(--s-4)', display: 'grid', gap: 'var(--s-3)' }}>
                  <Skeleton width="65%" height={15} />
                  <Skeleton width="100%" height={12} />
                  <Skeleton width="40%" height={30} radius="var(--r-md)" />
                </div>
              </div>
            ))}
          </div>
        </LoadingRegion>
      ) : error ? (
        <ErrorState title="We could not open The Shelf" onRetry={load}>
          {error.message}
        </ErrorState>
      ) : grouped.length === 0 ? (
        <EmptyState icon="shelf" title="Nothing in this section">
          Try another category, or come back when you have levelled up a little.
        </EmptyState>
      ) : (
        grouped.map((group) => (
          <section key={group.key} className="shelf__group" aria-labelledby={`g-${group.key}`}>
            <h2 id={`g-${group.key}`} className="shelf__group-title">
              {group.label}
            </h2>

            <ul className="shelf__grid">
              {group.items.map((item) => {
                const isBuying = buying === item.slug;
                const celebrating = justBought === item.slug;

                return (
                  <motion.li
                    key={item.slug}
                    layout={!reduced}
                    className={`good good--${item.rarity} ${item.owned ? 'good--owned' : ''} ${
                      item.locked ? 'good--locked' : ''
                    }`}
                    animate={
                      celebrating && !reduced ? { scale: [1, 1.035, 1] } : { scale: 1 }
                    }
                    transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
                  >
                    <div className="good__top">
                      <span className="good__glyph" aria-hidden="true">
                        <Icon name={item.glyph} size={24} strokeWidth={1.5} />
                      </span>

                      <span className={`good__rarity good__rarity--${item.rarity}`}>
                        {RARITY_LABELS[item.rarity]}
                      </span>
                    </div>

                    <h3 className="good__name">{item.name}</h3>
                    <p className="good__desc">{item.description}</p>

                    <div className="good__foot">
                      <span className="good__price">
                        <Icon name="bean" size={14} />
                        <span className="numeral">{item.price}</span>
                      </span>

                      <AnimatePresence mode="wait" initial={false}>
                        {item.owned && !item.repeatable ? (
                          <motion.span
                            key="owned"
                            className="good__owned"
                            initial={reduced ? false : { opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                          >
                            <Icon name="check" size={14} />
                            Collected
                          </motion.span>
                        ) : item.locked ? (
                          <span key="locked" className="good__locked">
                            <Icon name="lock" size={13} />
                            Chapter {item.requiresLevel}
                          </span>
                        ) : (
                          <motion.button
                            key="buy"
                            type="button"
                            className="btn btn--sm btn--primary"
                            onClick={() => buy(item)}
                            disabled={!item.canBuy || isBuying}
                            aria-label={`Buy ${item.name} for ${item.price} beans`}
                            initial={reduced ? false : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            {isBuying
                              ? 'Buying…'
                              : item.affordable
                                ? item.repeatable && item.owned
                                  ? 'Buy another'
                                  : 'Buy'
                                : 'Not enough'}
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
};

export default Shelf;
