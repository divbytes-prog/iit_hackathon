import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../components/Icon.jsx';
import { ATTRIBUTE_LIST, attributeColor } from '../utils/domain.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js';
import './landing.css';

const HOW = [
  {
    icon: 'scroll',
    title: 'Write down what you mean to do',
    body: 'File it under Mind, Body, Craft, Heart or Order, and say roughly how big a lift it is. That is the whole setup.',
  },
  {
    icon: 'check',
    title: 'Finish it and get paid immediately',
    body: 'Experience and coffee beans land the moment you tick the box — not in six weeks when the habit theoretically pays off.',
  },
  {
    icon: 'flame',
    title: 'Keep the hearth lit',
    body: 'Every consecutive day raises what your work is worth, up to a third again. Miss one, and a Dented Thermos can cover for you.',
  },
  {
    icon: 'shelf',
    title: 'Spend it on somewhere nice to sit',
    body: 'Beans buy mugs, plants, lamps, badges and records that repaint the whole interface. Progress you can actually look at.',
  },
];

/**
 * The public front page.
 *
 * Doing real work: it is the SEO surface (semantic sections, one h1, honest
 * prose rather than keyword soup) and the only chance to explain the premise
 * before someone decides whether to sign up.
 */
const Landing = () => {
  const reduced = usePrefersReducedMotion();

  useDocumentTitle(
    null,
    'Hearthlog turns reading, walking, making and tidying into a quiet progression system. Earn experience, grow five attributes, keep a streak, and spend beans on a desk worth sitting at.'
  );

  const rise = (delay = 0) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: '-80px' },
          transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
        };

  return (
    <div className="landing">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="landing__bar">
        <div className="landing__bar-inner shell">
          <span className="landing__brand">
            <span className="landing__mark" aria-hidden="true">
              <Icon name="flame" size={17} />
            </span>
            Hearthlog
          </span>

          <nav className="landing__bar-nav" aria-label="Account">
            <Link to="/login" className="btn btn--ghost">
              Sign in
            </Link>
            <Link to="/register" className="btn btn--primary">
              Start free
            </Link>
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        {/* --- hero -------------------------------------------------- */}
        <section className="hero">
          <div className="hero__inner shell">
            <motion.div className="hero__copy" {...rise()}>
              <p className="eyebrow">A cozy Life RPG</p>

              <h1 className="hero__title">
                Your to-do list has no idea
                <br />
                <em>how well you are doing.</em>
              </h1>

              <p className="hero__lede">
                Reading a book pays off in a year. The gym pays off in six months. A game
                pays off in four seconds — which is why you finished the game. Hearthlog
                puts the four-second loop around the rest of your life.
              </p>

              <div className="hero__actions">
                <Link to="/register" className="btn btn--primary btn--lg">
                  Pull up a chair
                  <Icon name="chevronRight" size={16} />
                </Link>
                <Link to="/login" className="btn btn--lg">
                  I have been here before
                </Link>
              </div>

              <p className="hero__footnote">
                Free, no card. Your progress lives on a server, so it survives a
                refresh, a new laptop and a cracked phone screen.
              </p>
            </motion.div>

            {/* --- the desk vignette --------------------------------- */}
            <motion.div
              className="hero__art"
              aria-hidden="true"
              {...(reduced
                ? {}
                : {
                    initial: { opacity: 0, y: 24, rotate: -1 },
                    animate: { opacity: 1, y: 0, rotate: -1.2 },
                    transition: { duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] },
                  })}
            >
              <div className="vignette">
                <div className="vignette__head">
                  <span className="vignette__ring">
                    <svg viewBox="0 0 72 72" width="60" height="60">
                      <circle cx="36" cy="36" r="31" fill="none" stroke="var(--paper-sunk)" strokeWidth="6" />
                      <motion.circle
                        cx="36"
                        cy="36"
                        r="31"
                        fill="none"
                        stroke="var(--terracotta)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 31}
                        initial={reduced ? false : { strokeDashoffset: 2 * Math.PI * 31 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 31 * 0.32 }}
                        transition={{ duration: 1.3, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        transform="rotate(-90 36 36)"
                      />
                    </svg>
                    <span className="vignette__level numeral">7</span>
                  </span>

                  <div>
                    <p className="vignette__name">Lamp Keeper</p>
                    <p className="vignette__meta">
                      <Icon name="bean" size={12} /> 412
                      <span className="vignette__dot" />
                      <Icon name="flame" size={12} /> 23 days
                    </p>
                  </div>
                </div>

                <ul className="vignette__list">
                  {[
                    { title: 'Read one chapter of Calvino', attr: 'mind', done: true },
                    { title: 'Walk the long way home', attr: 'body', done: true },
                    { title: 'Fix the date-picker bug', attr: 'craft', done: false },
                    { title: 'Ring Mum', attr: 'heart', done: false },
                  ].map((row, index) => (
                    <motion.li
                      key={row.title}
                      className={`vignette__row ${row.done ? 'is-done' : ''}`}
                      style={{ '--attr-hue': attributeColor(row.attr) }}
                      {...(reduced
                        ? {}
                        : {
                            initial: { opacity: 0, x: -10 },
                            animate: { opacity: 1, x: 0 },
                            transition: { delay: 0.4 + index * 0.09, duration: 0.4 },
                          })}
                    >
                      <span className="vignette__box">
                        {row.done ? <Icon name="check" size={11} strokeWidth={3} /> : null}
                      </span>
                      <span className="vignette__text">{row.title}</span>
                    </motion.li>
                  ))}
                </ul>

                <motion.p
                  className="vignette__pop"
                  {...(reduced
                    ? {}
                    : {
                        initial: { opacity: 0, y: 6, scale: 0.9 },
                        animate: { opacity: [0, 1, 1, 0], y: [6, -12, -16, -26] },
                        transition: { duration: 2.6, delay: 1.5, repeat: Infinity, repeatDelay: 3 },
                      })}
                >
                  +32 xp
                </motion.p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* --- how it works ------------------------------------------ */}
        <section className="section" aria-labelledby="how-heading">
          <div className="shell">
            <motion.div className="section__head" {...rise()}>
              <p className="eyebrow">How it works</p>
              <h2 id="how-heading">Four things, and none of them are a spreadsheet</h2>
            </motion.div>

            <ol className="how">
              {HOW.map((step, index) => (
                <motion.li key={step.title} className="how__item" {...rise(index * 0.07)}>
                  <span className="how__num numeral" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="how__icon" aria-hidden="true">
                    <Icon name={step.icon} size={19} />
                  </span>
                  <h3 className="how__title">{step.title}</h3>
                  <p className="how__body">{step.body}</p>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>

        {/* --- attributes --------------------------------------------- */}
        <section className="section section--sunk" aria-labelledby="attrs-heading">
          <div className="shell">
            <motion.div className="section__head" {...rise()}>
              <p className="eyebrow">Five attributes</p>
              <h2 id="attrs-heading">A character shaped like your actual week</h2>
              <p className="section__lede">
                Every intention grows one part of you. Over a month the shape of your
                attributes tells you something a streak counter never could — which is
                usually that Heart has been quiet for a while.
              </p>
            </motion.div>

            <ul className="attrgrid">
              {ATTRIBUTE_LIST.map((attribute, index) => (
                <motion.li
                  key={attribute.key}
                  className="attrgrid__item"
                  style={{ '--attr-hue': attributeColor(attribute.key) }}
                  {...rise(index * 0.05)}
                >
                  <span className="attrgrid__icon" aria-hidden="true">
                    <Icon name={attribute.icon} size={20} />
                  </span>
                  <h3 className="attrgrid__title">{attribute.label}</h3>
                  <p className="attrgrid__body">{attribute.blurb}</p>
                  <p className="attrgrid__eg">e.g. {attribute.example}</p>
                </motion.li>
              ))}
            </ul>
          </div>
        </section>

        {/* --- the honest bit ----------------------------------------- */}
        <section className="section" aria-labelledby="fair-heading">
          <div className="shell">
            <motion.div className="fair" {...rise()}>
              <div className="fair__body">
                <p className="eyebrow">Why it counts</p>
                <h2 id="fair-heading">You cannot cheat at this, which is the point</h2>
                <p>
                  Every point of experience is calculated on the server from the
                  difficulty you chose and the streak you have actually kept. The app in
                  your browser cannot award itself anything — it asks, and it is told.
                </p>
                <p>
                  Finish the same thing twice and the second one is worth nothing. Tick
                  twelve things in a day and the thirteenth starts paying less. Undo a
                  completion and the experience comes back off. The number on the ring
                  means something because it was expensive to get.
                </p>
              </div>

              <ul className="fair__list">
                {[
                  ['Server-side scoring', 'Rewards are derived from your data, never sent by the browser.'],
                  ['Idempotent completion', 'Double-clicks, retries and flaky connections pay out once.'],
                  ['Honest undo', 'Reopening a task claws back exactly what it granted.'],
                  ['Your desk is yours', 'Every query is scoped to your account. No shared reads.'],
                ].map(([title, body]) => (
                  <li key={title}>
                    <Icon name="check" size={15} />
                    <span>
                      <strong>{title}</strong>
                      {body}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </section>

        {/* --- call to action ----------------------------------------- */}
        <section className="cta" aria-labelledby="cta-heading">
          <motion.div className="cta__inner shell" {...rise()}>
            <span className="cta__mark" aria-hidden="true">
              <Icon name="flame" size={24} />
            </span>
            <h2 id="cta-heading">The kettle is already on</h2>
            <p>
              Takes about forty seconds to sign up and roughly one intention to see
              whether it works on you.
            </p>
            <Link to="/register" className="btn btn--primary btn--lg">
              Start your first chapter
              <Icon name="chevronRight" size={16} />
            </Link>
          </motion.div>
        </section>
      </main>

      <footer className="landing__foot">
        <div className="shell landing__foot-inner">
          <p>
            <strong>Hearthlog</strong> — a cozy Life RPG. Built with React, Express and
            MongoDB.
          </p>
          <p className="landing__foot-links">
            <Link to="/login">Sign in</Link>
            <span aria-hidden="true">·</span>
            <Link to="/register">Create an account</Link>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
