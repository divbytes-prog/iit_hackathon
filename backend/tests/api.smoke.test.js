/**
 * Hearthlog API smoke suite.
 *
 * Exercises every endpoint against a running server, including the paths that
 * are supposed to fail: stat tampering, cross-account access, double
 * completion, empty titles, insufficient funds. Run with:
 *
 *   npm run test:api            (expects the server on :5000)
 *   API_URL=... npm run test:api
 *
 * It creates two throwaway accounts and cleans up after itself.
 */

const BASE = process.env.API_URL ?? 'http://localhost:5000/api/v1';

let passed = 0;
let failed = 0;
const failures = [];

const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  dim: (s) => `\x1b[90m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

const check = (label, condition, detail = '') => {
  if (condition) {
    passed += 1;
    console.log(`  ${c.green('PASS')}  ${label}`);
  } else {
    failed += 1;
    failures.push(label);
    console.log(`  ${c.red('FAIL')}  ${label} ${c.dim(detail)}`);
  }
};

const section = (name) => console.log(`\n${c.bold(c.cyan(name))}`);

/** Minimal fetch wrapper that keeps a per-actor token. */
const makeClient = () => {
  const state = { token: null };
  return {
    state,
    async call(method, path, body) {
      const response = await fetch(`${BASE}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      let json = null;
      try {
        json = await response.json();
      } catch {
        json = null;
      }
      return { status: response.status, body: json };
    },
    get(path) {
      return this.call('GET', path);
    },
    post(path, body) {
      return this.call('POST', path, body);
    },
    patch(path, body) {
      return this.call('PATCH', path, body);
    },
    del(path) {
      return this.call('DELETE', path);
    },
  };
};

const stamp = Date.now();
const alice = makeClient();
const bob = makeClient();

const run = async () => {
  console.log(c.bold(`\nHearthlog API smoke suite → ${BASE}\n${'─'.repeat(52)}`));

  // ---------------------------------------------------------------- health
  section('Health & discovery');
  {
    const health = await alice.get('/health');
    check('GET /health returns 200', health.status === 200, `got ${health.status}`);
    check(
      'health reports database connected',
      health.body?.data?.database === 'connected',
      health.body?.data?.database
    );

    const rules = await alice.get('/character/rules');
    check('GET /character/rules is public', rules.status === 200, `got ${rules.status}`);
    const levels = rules.body?.data?.curve?.characterLevels ?? [];
    const increasing = levels.every(
      (entry, index) => index === 0 || entry.xpToNext > levels[index - 1].xpToNext
    );
    check('level curve is strictly non-linear', increasing && levels.length >= 20);
  }

  // ------------------------------------------------------------------ auth
  section('Authentication');
  {
    const weak = await alice.post('/auth/register', {
      email: `weak${stamp}@hearthlog.test`,
      password: 'short',
      username: 'Weak',
    });
    check('rejects a weak password (422)', weak.status === 422, `got ${weak.status}`);

    const badEmail = await alice.post('/auth/register', {
      email: 'not-an-email',
      password: 'goodpass123',
      username: 'Nope',
    });
    check('rejects a malformed email (422)', badEmail.status === 422, `got ${badEmail.status}`);

    const registered = await alice.post('/auth/register', {
      email: `alice${stamp}@hearthlog.test`,
      password: 'lanternlight9',
      username: 'Alice',
      timezone: 'Asia/Kolkata',
    });
    check('registers a new account (201)', registered.status === 201, `got ${registered.status}`);
    alice.state.token = registered.body?.data?.accessToken;
    check('returns an access token', Boolean(alice.state.token));
    check(
      'new character starts at chapter 1 with 30 beans',
      registered.body?.data?.user?.character?.level === 1 &&
        registered.body?.data?.user?.character?.beans === 30
    );
    check(
      'password hash is never returned',
      !JSON.stringify(registered.body).includes('passwordHash')
    );

    const dupe = await alice.post('/auth/register', {
      email: `alice${stamp}@hearthlog.test`,
      password: 'lanternlight9',
      username: 'Alice Again',
    });
    check('rejects a duplicate email (409)', dupe.status === 409, `got ${dupe.status}`);

    const wrongPass = await makeClient().post('/auth/login', {
      email: `alice${stamp}@hearthlog.test`,
      password: 'wrongwrong1',
    });
    check('rejects a wrong password (401)', wrongPass.status === 401, `got ${wrongPass.status}`);

    const me = await alice.get('/auth/me');
    check('GET /auth/me with token (200)', me.status === 200, `got ${me.status}`);

    const anon = await makeClient().get('/auth/me');
    check('GET /auth/me without token (401)', anon.status === 401, `got ${anon.status}`);

    const junk = makeClient();
    junk.state.token = 'not.a.real.token';
    const forged = await junk.get('/auth/me');
    check('rejects a forged token (401)', forged.status === 401, `got ${forged.status}`);

    // Second account for the isolation checks.
    const bobReg = await bob.post('/auth/register', {
      email: `bob${stamp}@hearthlog.test`,
      password: 'lanternlight9',
      username: 'Bob',
    });
    bob.state.token = bobReg.body?.data?.accessToken;
    check('second account registers', bobReg.status === 201);
  }

  // ----------------------------------------------------------------- CRUD
  section('Intentions — CRUD');
  let taskId = null;
  let epicId = null;
  {
    const empty = await alice.post('/tasks', { title: '   ', attribute: 'mind' });
    check('rejects an empty title (422)', empty.status === 422, `got ${empty.status}`);

    const noAttr = await alice.post('/tasks', { title: 'Orphan task' });
    check('rejects a missing attribute (422)', noAttr.status === 422, `got ${noAttr.status}`);

    const badAttr = await alice.post('/tasks', { title: 'Bad', attribute: 'wisdom' });
    check('rejects an unknown attribute (422)', badAttr.status === 422, `got ${badAttr.status}`);

    const longTitle = await alice.post('/tasks', {
      title: 'x'.repeat(200),
      attribute: 'mind',
    });
    check('rejects an over-long title (422)', longTitle.status === 422, `got ${longTitle.status}`);

    const made = await alice.post('/tasks', {
      title: 'Read one chapter of Calvino',
      notes: 'The one about the cities.',
      attribute: 'mind',
      difficulty: 'medium',
      tags: ['reading'],
    });
    check('creates an intention (201)', made.status === 201, `got ${made.status}`);
    taskId = made.body?.data?.task?.id;
    check('returns an id', Boolean(taskId));

    const epic = await alice.post('/tasks', {
      title: 'Ship the whole feature',
      attribute: 'craft',
      difficulty: 'epic',
    });
    epicId = epic.body?.data?.task?.id;
    check('creates an epic intention', epic.status === 201);

    const list = await alice.get('/tasks?status=active');
    check('lists active intentions', list.status === 200 && list.body.data.tasks.length >= 2);

    const search = await alice.get('/tasks?q=Calvino');
    check('search finds it', search.body?.data?.tasks?.length === 1);

    const filtered = await alice.get('/tasks?attribute=craft');
    check(
      'filters by attribute',
      filtered.body?.data?.tasks?.every((t) => t.attribute === 'craft')
    );

    const patched = await alice.patch(`/tasks/${taskId}`, { title: 'Read two chapters' });
    check('updates a title (200)', patched.status === 200 && patched.body.data.task.title === 'Read two chapters');

    // Regression: a null dueDate used to coerce to the 1970 epoch, which the
    // UI then rendered as "20708 days late".
    const nullDue = await alice.post('/tasks', {
      title: 'No deadline on this one',
      attribute: 'heart',
      dueDate: null,
    });
    check(
      'a null due date stays null',
      nullDue.status === 201 && nullDue.body?.data?.task?.dueDate === null,
      `got ${nullDue.body?.data?.task?.dueDate}`
    );

    const emptyDue = await alice.post('/tasks', {
      title: 'Empty string due date',
      attribute: 'heart',
      dueDate: '',
    });
    check(
      'an empty due date stays null',
      emptyDue.status === 201 && emptyDue.body?.data?.task?.dueDate === null,
      `got ${emptyDue.body?.data?.task?.dueDate}`
    );

    const realDue = await alice.post('/tasks', {
      title: 'Has a real deadline',
      attribute: 'order',
      dueDate: '2026-12-25T12:00:00.000Z',
    });
    check(
      'a real due date is kept',
      realDue.body?.data?.task?.dueDate?.startsWith('2026-12-25'),
      `got ${realDue.body?.data?.task?.dueDate}`
    );

    const clearedDue = await alice.patch(`/tasks/${realDue.body.data.task.id}`, {
      dueDate: null,
    });
    check(
      'clearing a due date sets it back to null',
      clearedDue.body?.data?.task?.dueDate === null,
      `got ${clearedDue.body?.data?.task?.dueDate}`
    );

    const missing = await alice.get('/tasks/000000000000000000000000');
    check('404s an unknown id', missing.status === 404, `got ${missing.status}`);

    const malformed = await alice.get('/tasks/not-an-id');
    check('422s a malformed id', malformed.status === 422, `got ${malformed.status}`);
  }

  // ------------------------------------------------------- anti-tampering
  section('Anti-cheat — server-authoritative stats');
  {
    const tamperCreate = await alice.post('/tasks', {
      title: 'Free money',
      attribute: 'mind',
      xpAwarded: 999999,
      beansAwarded: 999999,
    });
    check(
      'rejects xpAwarded/beansAwarded on create (422)',
      tamperCreate.status === 422,
      `got ${tamperCreate.status}`
    );

    const tamperPatch = await alice.patch(`/tasks/${taskId}`, { xpAwarded: 999999 });
    check('rejects xpAwarded on update (422)', tamperPatch.status === 422, `got ${tamperPatch.status}`);

    const forceComplete = await alice.patch(`/tasks/${taskId}`, { status: 'completed' });
    check(
      'rejects a direct status jump to completed (422)',
      forceComplete.status === 422,
      `got ${forceComplete.status}`
    );

    const prefsTamper = await alice.patch('/character/preferences', { beans: 100000 });
    check('rejects bean injection via preferences (422)', prefsTamper.status === 422, `got ${prefsTamper.status}`);

    const themeLock = await alice.patch('/character/preferences', { theme: 'midnight' });
    check('rejects an unpurchased theme (403)', themeLock.status === 403, `got ${themeLock.status}`);
  }

  // ------------------------------------------------------------ isolation
  section('Account isolation');
  {
    const read = await bob.get(`/tasks/${taskId}`);
    check("Bob cannot read Alice's task (404)", read.status === 404, `got ${read.status}`);

    const write = await bob.patch(`/tasks/${taskId}`, { title: 'Hijacked' });
    check("Bob cannot edit Alice's task (404)", write.status === 404, `got ${write.status}`);

    const remove = await bob.del(`/tasks/${taskId}`);
    check("Bob cannot delete Alice's task (404)", remove.status === 404, `got ${remove.status}`);

    const finish = await bob.post(`/tasks/${taskId}/complete`);
    check("Bob cannot complete Alice's task (404)", finish.status === 404, `got ${finish.status}`);

    const bobList = await bob.get('/tasks?status=all');
    check("Bob's list is empty", bobList.body?.data?.tasks?.length === 0);

    const reorder = await bob.post('/tasks/reorder', { ids: [taskId] });
    check(
      "Bob's reorder matches nothing",
      reorder.status === 200 && reorder.body.data.matched === 0
    );
  }

  // ----------------------------------------------------------- completion
  section('Progression engine');
  let levelAfter = 1;
  {
    const before = await alice.get('/character');
    const beansBefore = before.body.data.character.beans;

    const done = await alice.post(`/tasks/${taskId}/complete`);
    check('completes an intention (200)', done.status === 200, `got ${done.status}`);

    const reward = done.body?.data?.reward;
    check('awards medium XP (32 base)', reward?.baseXp === 32, JSON.stringify(reward));
    check('awards beans', reward?.beans > 0);
    check('streak starts at 1', done.body?.data?.streak?.current === 1);

    const after = await alice.get('/character');
    check(
      'beans increased by the awarded amount',
      after.body.data.character.beans === beansBefore + reward.beans
    );
    check(
      'mind attribute gained XP',
      after.body.data.attributes.mind.totalXp === reward.xp,
      String(after.body.data.attributes.mind.totalXp)
    );

    const again = await alice.post(`/tasks/${taskId}/complete`);
    check('double completion is refused (409)', again.status === 409, `got ${again.status}`);

    // A burst of concurrent completes must award exactly once.
    const burstTask = await alice.post('/tasks', { title: 'Race me', attribute: 'order' });
    const burstId = burstTask.body.data.task.id;
    const beansPreRace = (await alice.get('/character')).body.data.character.beans;
    const results = await Promise.all(
      Array.from({ length: 5 }, () => alice.post(`/tasks/${burstId}/complete`))
    );
    const wins = results.filter((r) => r.status === 200).length;
    check('5 concurrent completes award exactly once', wins === 1, `${wins} succeeded`);
    const beansPostRace = (await alice.get('/character')).body.data.character.beans;
    const granted = results.find((r) => r.status === 200)?.body?.data?.reward?.beans ?? 0;
    check(
      'beans credited exactly once under race',
      beansPostRace === beansPreRace + granted,
      `${beansPreRace} -> ${beansPostRace}, granted ${granted}`
    );

    // Epic completion should push the character past level 1.
    const epicDone = await alice.post(`/tasks/${epicId}/complete`);
    check('completes the epic intention', epicDone.status === 200);
    levelAfter = epicDone.body?.data?.snapshot?.character?.level ?? 1;

    const reopened = await alice.post(`/tasks/${taskId}/reopen`);
    check('reopens a completed intention (200)', reopened.status === 200, `got ${reopened.status}`);
    check('claws back the exact XP', reopened.body?.data?.revoked?.xp === reward.xp);

    const reopenAgain = await alice.post(`/tasks/${taskId}/reopen`);
    check('cannot reopen twice (409)', reopenAgain.status === 409, `got ${reopenAgain.status}`);

    const today = await alice.get('/tasks/today');
    check('GET /tasks/today works', today.status === 200 && Array.isArray(today.body.data.active));

    // --- repeating intentions -------------------------------------------
    const ritual = await alice.post('/tasks', {
      title: 'Stretch every morning',
      attribute: 'body',
      difficulty: 'trivial',
      recurrence: 'daily',
    });
    const ritualId = ritual.body.data.task.id;

    const kept = await alice.post(`/tasks/${ritualId}/complete`);
    check('a daily ritual can be kept', kept.status === 200, `got ${kept.status}`);
    check('a kept ritual stays active', kept.body?.data?.task?.status === 'active');

    const keptAgain = await alice.post(`/tasks/${ritualId}/complete`);
    check('a ritual cannot be kept twice in a day (409)', keptAgain.status === 409, `got ${keptAgain.status}`);

    const todayAfter = await alice.get('/tasks/today');
    const inActive = todayAfter.body.data.active.some((t) => t.id === ritualId);
    const inDone = todayAfter.body.data.completedToday.some((t) => t.id === ritualId);
    check(
      'a kept ritual appears in exactly one of the two lists',
      !inActive && inDone,
      `active=${inActive} done=${inDone}`
    );

    const unkept = await alice.post(`/tasks/${ritualId}/reopen`);
    check('a kept ritual can be undone (200)', unkept.status === 200, `got ${unkept.status}`);

    const todayRestored = await alice.get('/tasks/today');
    check(
      'an undone ritual returns to the active list',
      todayRestored.body.data.active.some((t) => t.id === ritualId)
    );
  }

  // ----------------------------------------------------------------- shop
  section('The Shelf — economy');
  {
    const items = await alice.get('/shop/items');
    check('lists shop items', items.status === 200 && items.body.data.items.length >= 15);
    check(
      'items report affordability for this character',
      items.body.data.items.every((i) => 'canBuy' in i && 'locked' in i)
    );

    const unknown = await alice.post('/shop/purchase', { slug: 'a-flying-car' });
    check('404s an unknown item', unknown.status === 404, `got ${unknown.status}`);

    const priceTamper = await alice.post('/shop/purchase', { slug: 'chipped-mug', price: 0 });
    check('rejects a client-supplied price (422)', priceTamper.status === 422, `got ${priceTamper.status}`);

    const expensive = await alice.post('/shop/purchase', { slug: 'badge-hearthkeeper' });
    check(
      'refuses an unaffordable/locked item (400 or 403)',
      expensive.status === 400 || expensive.status === 403,
      `got ${expensive.status}`
    );

    const beansNow = (await alice.get('/character')).body.data.character.beans;
    if (beansNow >= 40) {
      const buy = await alice.post('/shop/purchase', { slug: 'chipped-mug' });
      check('buys an affordable item (200)', buy.status === 200, `got ${buy.status}`);
      check(
        'debits exactly the listed price',
        buy.body?.data?.snapshot?.character?.beans === beansNow - 40,
        `${beansNow} -> ${buy.body?.data?.snapshot?.character?.beans}`
      );
      check('equips the cosmetic on purchase', buy.body?.data?.snapshot?.character?.equipped?.mug === 'chipped-mug');

      const rebuy = await alice.post('/shop/purchase', { slug: 'chipped-mug' });
      check('cannot buy the same cosmetic twice (409)', rebuy.status === 409, `got ${rebuy.status}`);

      const equipUnowned = await alice.post('/shop/equip', { slot: 'plant', slug: 'window-fern' });
      check('cannot equip an unowned item (403)', equipUnowned.status === 403, `got ${equipUnowned.status}`);
    } else {
      console.log(c.dim(`  SKIP  purchase flow (only ${beansNow} beans)`));
    }

    const inventory = await alice.get('/shop/inventory');
    check('reads inventory', inventory.status === 200);
  }

  // ---------------------------------------------------------------- stats
  section('Logbook & statistics');
  {
    const summary = await alice.get('/stats/summary');
    check('GET /stats/summary (200)', summary.status === 200, `got ${summary.status}`);
    check('ribbon covers 30 days', summary.body?.data?.ribbon?.length === 30);
    check('attribute breakdown has 5 entries', summary.body?.data?.attributes?.length === 5);
    check('totals are present', typeof summary.body?.data?.totals?.completed === 'number');

    const activity = await alice.get('/stats/activity?limit=50');
    check('GET /stats/activity (200)', activity.status === 200);
    const types = (activity.body?.data?.entries ?? []).map((e) => e.type);
    check('logged account creation', types.includes('account_created'));
    check('logged task completion', types.includes('task_completed'));
    check('logged task creation', types.includes('task_created'));

    const bobActivity = await bob.get('/stats/activity');
    check(
      "Bob's logbook does not contain Alice's entries",
      (bobActivity.body?.data?.entries ?? []).every((e) => !e.message.includes('Calvino'))
    );
  }

  // ------------------------------------------------------------- sessions
  section('Session lifecycle');
  {
    // Read the level as it stands *now* — the reopen test above deliberately
    // clawed XP back, so the value captured at completion time is stale.
    const current = await alice.get('/character');
    levelAfter = current.body?.data?.character?.level;

    const out = await alice.post('/auth/logout');
    check('logs out (200)', out.status === 200, `got ${out.status}`);

    const relogin = await alice.post('/auth/login', {
      email: `alice${stamp}@hearthlog.test`,
      password: 'lanternlight9',
    });
    check('logs back in (200)', relogin.status === 200, `got ${relogin.status}`);
    alice.state.token = relogin.body?.data?.accessToken;
    check(
      'data persisted across the session',
      relogin.body?.data?.user?.character?.level === levelAfter,
      `level ${relogin.body?.data?.user?.character?.level} vs ${levelAfter}`
    );
    check(
      'streak persisted',
      relogin.body?.data?.user?.streak?.current >= 1
    );
  }

  // -------------------------------------------------------------- cleanup
  section('Cleanup');
  {
    const all = await alice.get('/tasks?status=all&limit=100');
    const ids = (all.body?.data?.tasks ?? []).map((t) => t.id);
    const removals = await Promise.all(ids.map((id) => alice.del(`/tasks/${id}`)));
    check(
      `deleted ${ids.length} test intentions`,
      removals.every((r) => r.status === 200)
    );

    const notFound = await alice.get('/no-such-route');
    check('unknown route 404s with an envelope', notFound.status === 404 && notFound.body?.success === false);
  }

  // --------------------------------------------------------------- report
  console.log(`\n${'─'.repeat(52)}`);
  const total = passed + failed;
  if (failed === 0) {
    console.log(c.green(c.bold(`  All ${total} checks passed.`)));
  } else {
    console.log(c.red(c.bold(`  ${failed} of ${total} checks failed:`)));
    failures.forEach((name) => console.log(c.red(`    • ${name}`)));
  }
  console.log('');
  process.exit(failed === 0 ? 0 : 1);
};

run().catch((error) => {
  console.error(c.red(`\nSuite crashed: ${error.message}`));
  console.error(c.dim('Is the server running?  npm run dev'));
  process.exit(1);
});
