import { useCallback, useRef, useState } from 'react';
import { tasks as tasksApi } from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

/**
 * All the intention mutations, with optimistic updates.
 *
 * The pattern in each case is: change local state immediately, fire the
 * request, then either fold the server's answer back in or restore the
 * snapshot we took before touching anything. That is what makes ticking a box
 * feel instant on a slow connection without ever lying about what was saved —
 * a failed write visibly reverts and says why.
 */
export const useIntentions = ({ onReward } = {}) => {
  const { applySnapshot } = useAuth();
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [busyIds, setBusyIds] = useState(() => new Set());
  const requestId = useRef(0);

  const markBusy = useCallback((id, busy) => {
    setBusyIds((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  /** Replace one item in place, leaving order untouched. */
  const patchItem = useCallback((id, patch) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }, []);

  // --- complete ----------------------------------------------------------
  const complete = useCallback(
    async (task, origin) => {
      if (busyIds.has(task.id)) return;
      const before = items;

      markBusy(task.id, true);
      // Flip it straight away.
      patchItem(task.id, { status: 'completed', completedAt: new Date().toISOString() });

      try {
        const result = await tasksApi.complete(task.id);
        applySnapshot(result.snapshot);
        patchItem(task.id, result.task);

        onReward?.({
          reward: result.reward,
          events: result.events,
          levelUp: result.levelUp,
          attributeLevelUp: result.attributeLevelUp,
          streak: result.streak,
          origin,
        });

        return result;
      } catch (error) {
        setItems(before);
        if (error.code === 'ALREADY_COMPLETED') {
          toast.info(error.message);
        } else {
          toast.error(error.message, {
            detail: error.code === 'OFFLINE' ? 'Nothing was saved.' : undefined,
          });
        }
        return null;
      } finally {
        markBusy(task.id, false);
      }
    },
    [items, busyIds, markBusy, patchItem, applySnapshot, onReward, toast]
  );

  // --- reopen ------------------------------------------------------------
  const reopen = useCallback(
    async (task) => {
      if (busyIds.has(task.id)) return;
      const before = items;

      markBusy(task.id, true);
      patchItem(task.id, { status: 'active', completedAt: null });

      try {
        const result = await tasksApi.reopen(task.id);
        applySnapshot(result.snapshot);
        patchItem(task.id, result.task);

        if (result.revoked?.xp) {
          toast.info('Back on the desk.', {
            detail: `${result.revoked.xp} xp and ${result.revoked.beans} beans returned.`,
          });
        }

        return result;
      } catch (error) {
        setItems(before);
        toast.error(error.message);
        return null;
      } finally {
        markBusy(task.id, false);
      }
    },
    [items, busyIds, markBusy, patchItem, applySnapshot, toast]
  );

  // --- create ------------------------------------------------------------
  const create = useCallback(
    async (payload) => {
      // A temporary id keeps React's keys stable until the real one arrives.
      const tempId = `temp-${(requestId.current += 1)}`;
      const optimistic = {
        id: tempId,
        ...payload,
        status: 'active',
        tags: payload.tags ?? [],
        xpAwarded: 0,
        completionCount: 0,
        createdAt: new Date().toISOString(),
        pending: true,
      };

      setItems((current) => [optimistic, ...current]);

      try {
        const result = await tasksApi.create(payload);
        setItems((current) =>
          current.map((item) => (item.id === tempId ? result.task : item))
        );
        toast.success('Added to the desk.');
        return result.task;
      } catch (error) {
        setItems((current) => current.filter((item) => item.id !== tempId));
        throw error;
      }
    },
    [toast]
  );

  // --- update ------------------------------------------------------------
  const update = useCallback(
    async (id, payload) => {
      const before = items;
      patchItem(id, payload);

      try {
        const result = await tasksApi.update(id, payload);
        patchItem(id, result.task);
        toast.success('Saved.');
        return result.task;
      } catch (error) {
        setItems(before);
        throw error;
      }
    },
    [items, patchItem, toast]
  );

  // --- remove ------------------------------------------------------------
  const remove = useCallback(
    async (task) => {
      const before = items;
      setItems((current) => current.filter((item) => item.id !== task.id));

      try {
        await tasksApi.remove(task.id);
        toast.success('Removed from the desk.', { detail: `"${task.title}" is gone.` });
      } catch (error) {
        setItems(before);
        toast.error(error.message);
      }
    },
    [items, toast]
  );

  return { items, setItems, busyIds, complete, reopen, create, update, remove };
};

export default useIntentions;
