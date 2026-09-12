/**
 * The icon set.
 *
 * Drawn by hand on a 24-grid with round caps and joins, deliberately a little
 * irregular — a fern frond that is not perfectly symmetrical, a mug whose
 * handle sits slightly proud. Stock icon fonts are the fastest way to make an
 * interface look like every other interface, so there are none here.
 *
 * Every glyph inherits `currentColor` and scales from a single `size` prop.
 */

const PATHS = {
  // --- interface -------------------------------------------------------
  check: <path d="M4.5 12.6 9.2 17.4 19.6 6.8" />,
  close: (
    <>
      <path d="M6 6 18 18" />
      <path d="M18 6 6 18" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5.2v13.6" />
      <path d="M5.2 12h13.6" />
    </>
  ),
  minus: <path d="M5.2 12h13.6" />,
  alert: (
    <>
      <path d="M12 3.6 21.4 20H2.6L12 3.6Z" />
      <path d="M12 10v4.2" />
      <circle cx="12" cy="17.2" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 11.2v5" />
      <circle cx="12" cy="7.9" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  chevronDown: <path d="M5.6 9 12 15.4 18.4 9" />,
  chevronRight: <path d="M9.2 5.4 15.6 12l-6.4 6.6" />,
  chevronLeft: <path d="M14.8 5.4 8.4 12l6.4 6.6" />,
  search: (
    <>
      <circle cx="10.8" cy="10.6" r="6.4" />
      <path d="M15.6 15.4 20.4 20.2" />
    </>
  ),
  trash: (
    <>
      <path d="M4.4 6.6h15.2" />
      <path d="M9.4 6.4V4.9c0-.7.6-1.3 1.3-1.3h2.6c.7 0 1.3.6 1.3 1.3v1.5" />
      <path d="M6.4 6.6 7.3 19c.1.9.8 1.5 1.7 1.5h6c.9 0 1.6-.6 1.7-1.5l.9-12.4" />
      <path d="M10.3 10.4v6" />
      <path d="M13.8 10.4v6" />
    </>
  ),
  pencil: (
    <>
      <path d="M16.4 3.9a2.1 2.1 0 0 1 3 3L8.7 17.7l-4 1.1 1.1-4L16.4 3.9Z" />
      <path d="M14.6 5.8 17.9 9.1" />
    </>
  ),
  grip: (
    <>
      <circle cx="9" cy="6.5" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6.5" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="9" cy="17.5" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="15" cy="17.5" r="1.35" fill="currentColor" stroke="none" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7.2h16" />
      <path d="M4 12h16" />
      <path d="M4 16.8h11" />
    </>
  ),
  undo: (
    <>
      <path d="M4.2 9.4h7.2a5.6 5.6 0 1 1 0 11.2H7" />
      <path d="M7.6 5.6 3.9 9.4l3.7 3.8" />
    </>
  ),
  logout: (
    <>
      <path d="M9.6 20.4H5.4A1.8 1.8 0 0 1 3.6 18.6V5.4a1.8 1.8 0 0 1 1.8-1.8h4.2" />
      <path d="M15.6 16.4 20.4 12l-4.8-4.4" />
      <path d="M20.1 12H9.2" />
    </>
  ),

  // --- the desk --------------------------------------------------------
  /** Coffee bean — the currency. */
  bean: (
    <>
      <ellipse cx="12" cy="12" rx="5.4" ry="8.1" transform="rotate(38 12 12)" />
      <path d="M8.6 15.6c1.4-1.1 1.9-2.6 1.5-4.4-.4-1.8.1-3.3 1.5-4.5" />
    </>
  ),
  /** The hearth flame — streak. */
  flame: (
    <>
      <path d="M12.4 3.2c.5 2.8-.6 4.3-2.2 5.7-1.9 1.7-3.4 3.4-3.4 6.1a5.6 5.6 0 0 0 11.2 0c0-2-.8-3.5-1.9-4.9-.3 1-.9 1.7-1.8 2 .6-3.2-.4-6.3-1.9-8.9Z" />
      <path d="M12 20.6a2.9 2.9 0 0 1-2.9-2.9c0-1.6 1.6-2.4 2.3-4 1 1.2 3.5 2 3.5 4a2.9 2.9 0 0 1-2.9 2.9Z" />
    </>
  ),
  mug: (
    <>
      <path d="M4.6 9.2h11.6v6.4a4 4 0 0 1-4 4H8.6a4 4 0 0 1-4-4V9.2Z" />
      <path d="M16.2 10.9h1.9a2.5 2.5 0 0 1 0 5h-1.9" />
      <path d="M8.2 6.1c.8-.8.8-1.6 0-2.4" />
      <path d="M12.4 6.1c.8-.8.8-1.6 0-2.4" />
    </>
  ),
  'mug-glazed': (
    <>
      <path d="M4.6 9.2h11.6v6.4a4 4 0 0 1-4 4H8.6a4 4 0 0 1-4-4V9.2Z" />
      <path d="M16.2 10.9h1.9a2.5 2.5 0 0 1 0 5h-1.9" />
      <path d="M6.4 12.6h8" />
      <path d="M8.2 6.1c.8-.8.8-1.6 0-2.4" />
    </>
  ),
  thermos: (
    <>
      <path d="M8.4 7.6h7.2v11.6a1.6 1.6 0 0 1-1.6 1.6h-4a1.6 1.6 0 0 1-1.6-1.6V7.6Z" />
      <path d="M9.2 7.6V4.8a1.4 1.4 0 0 1 1.4-1.4h2.8a1.4 1.4 0 0 1 1.4 1.4v2.8" />
      <path d="M8.4 11.4h7.2" />
    </>
  ),
  succulent: (
    <>
      <path d="M7.8 14.6h8.4l-.9 5.2a1.4 1.4 0 0 1-1.4 1.2h-3.8a1.4 1.4 0 0 1-1.4-1.2l-.9-5.2Z" />
      <path d="M12 14.4V9.6" />
      <path d="M12 11.4c-1.5-.3-2.6-1.5-2.6-3.2 1.6.1 2.6 1.2 2.6 3.2Z" />
      <path d="M12 11.4c1.5-.3 2.6-1.5 2.6-3.2-1.6.1-2.6 1.2-2.6 3.2Z" />
      <path d="M12 9.4c-.9-.9-1-2.3-.2-3.5.9.8 1.1 2.2.2 3.5Z" />
    </>
  ),
  pothos: (
    <>
      <path d="M8.2 14.4h7.6l-.8 5.4a1.4 1.4 0 0 1-1.4 1.2h-3.2a1.4 1.4 0 0 1-1.4-1.2l-.8-5.4Z" />
      <path d="M12 14.2c0-3.4 1.8-5.6 4.6-6.4" />
      <path d="M16.6 7.8c-1.6.6-2.6 0-2.9-1.6 1.6-.5 2.6.1 2.9 1.6Z" />
      <path d="M13.4 11.2c-1.6.3-2.5-.4-2.6-2 1.6-.2 2.5.5 2.6 2Z" />
      <path d="M10.9 13.9c-1.4-.6-1.8-1.6-1.1-3 1.3.7 1.7 1.7 1.1 3Z" />
    </>
  ),
  fern: (
    <>
      <path d="M8.4 14.6h7.2l-.8 5.2a1.4 1.4 0 0 1-1.4 1.2h-2.8a1.4 1.4 0 0 1-1.4-1.2l-.8-5.2Z" />
      <path d="M12 14.4V4.2" />
      <path d="M12 6.4c1.3-.7 2.5-.4 3.4.9M12 6.4c-1.3-.7-2.5-.4-3.4.9" />
      <path d="M12 9.4c1.5-.8 2.8-.4 3.8 1M12 9.4c-1.5-.8-2.8-.4-3.8 1" />
      <path d="M12 12.4c1.3-.7 2.4-.3 3.3 1M12 12.4c-1.3-.7-2.4-.3-3.3 1" />
    </>
  ),
  'clip-lamp': (
    <>
      <path d="M7.6 20.4h6.2" />
      <path d="M10.7 20.2V12" />
      <path d="M10.9 11.6 16 5.2" />
      <path d="M13.2 3.2h6.4l1 4.6h-8.4l1-4.6Z" />
      <path d="M6.4 18.4h4.4" />
    </>
  ),
  'banker-lamp': (
    <>
      <path d="M6.6 20.6h10.8" />
      <path d="M12 20.4v-6.6" />
      <path d="M5.8 13.6h12.4c0-3-2.8-5.4-6.2-5.4S5.8 10.6 5.8 13.6Z" />
      <path d="M12 8V4.4" />
      <path d="M9.6 4.2h4.8" />
    </>
  ),
  'paper-moon': (
    <>
      <circle cx="12" cy="10.4" r="6.4" />
      <path d="M5.9 9.2h12.2" />
      <path d="M6.4 12.6h11.2" />
      <path d="M12 16.8v3.6" />
      <path d="M9.4 20.6h5.2" />
    </>
  ),
  record: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <circle cx="12" cy="12" r="3.2" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <path d="M12 3.4a8.6 8.6 0 0 1 7.4 4.2" />
    </>
  ),
  sunrise: (
    <>
      <path d="M3.4 19.4h17.2" />
      <path d="M6.6 15.8a5.4 5.4 0 0 1 10.8 0" />
      <path d="M12 3.6v3" />
      <path d="M5.4 6.6 7.5 8.7" />
      <path d="M18.6 6.6 16.5 8.7" />
    </>
  ),
  quill: (
    <>
      <path d="M4.2 20.2c2-6.6 6.6-12.4 15.6-16.4-.4 9.8-4.8 14.4-10.6 15.4" />
      <path d="M4.2 20.2 9.6 14" />
      <path d="M10.6 12.2c1.8-1.4 3.6-2.6 5.6-3.6" />
    </>
  ),
  hearth: (
    <>
      <path d="M3.6 20.4V9.6l8.4-6 8.4 6v10.8" />
      <path d="M3.6 20.4h16.8" />
      <path d="M8.6 20.4v-5a3.4 3.4 0 0 1 6.8 0v5" />
      <path d="M12 17.6c-.8-.9-.5-1.9.2-2.7.5.8 1.4 1.3 1.4 2.2" />
    </>
  ),
  box: (
    <>
      <path d="M3.8 7.8 12 3.6l8.2 4.2v8.4L12 20.4l-8.2-4.2V7.8Z" />
      <path d="M3.8 7.8 12 12l8.2-4.2" />
      <path d="M12 12v8.4" />
    </>
  ),

  // --- attributes ------------------------------------------------------
  mind: (
    <>
      <path d="M4.2 5.2c2.6-.9 5.2-.9 7.8.4v13.2c-2.6-1.3-5.2-1.3-7.8-.4V5.2Z" />
      <path d="M19.8 5.2c-2.6-.9-5.2-.9-7.8.4v13.2c2.6-1.3 5.2-1.3 7.8-.4V5.2Z" />
    </>
  ),
  body: (
    <>
      <circle cx="13.4" cy="4.9" r="1.9" />
      <path d="M6.2 12.4 9.6 9.8a2.6 2.6 0 0 1 3.2.1l2.4 2.1 3.2.9" />
      <path d="m12.8 12.2-1.4 4 2.8 2.4.8 3.2" />
      <path d="m11.4 16.2-3.8 1.2-1.6 3.4" />
    </>
  ),
  craft: (
    <>
      <path d="m14.6 6.6 3.2-3.2 2.8 2.8-3.2 3.2" />
      <path d="M14.6 6.6 4.4 16.8v2.8h2.8L17.4 9.4" />
      <path d="m11.6 9.6 2.8 2.8" />
    </>
  ),
  heart: (
    <path d="M12 20.2s-7.8-4.6-7.8-9.6a4.4 4.4 0 0 1 7.8-2.8 4.4 4.4 0 0 1 7.8 2.8c0 5-7.8 9.6-7.8 9.6Z" />
  ),
  order: (
    <>
      <path d="M4.2 6.6h4.4" />
      <path d="M4.2 12h4.4" />
      <path d="M4.2 17.4h4.4" />
      <path d="M11.8 6.6h8" />
      <path d="M11.8 12h8" />
      <path d="M11.8 17.4h8" />
    </>
  ),

  // --- navigation ------------------------------------------------------
  desk: (
    <>
      <path d="M2.8 9.6h18.4" />
      <path d="M4.6 9.6v10" />
      <path d="M19.4 9.6v10" />
      <path d="M2.8 9.6 5.6 4.4h12.8l2.8 5.2" />
      <path d="M8.4 13.4h4" />
    </>
  ),
  scroll: (
    <>
      <path d="M6.4 3.6h11.2a1.8 1.8 0 0 1 1.8 1.8v13.2a1.8 1.8 0 0 1-1.8 1.8H6.4" />
      <path d="M6.4 3.6a1.8 1.8 0 0 0-1.8 1.8v2.4h3.6V5.4a1.8 1.8 0 0 0-1.8-1.8Z" />
      <path d="M6.4 20.4a1.8 1.8 0 0 0 1.8-1.8v-2.4H4.6v2.4a1.8 1.8 0 0 0 1.8 1.8Z" />
      <path d="M11.2 8.4h5.2" />
      <path d="M11.2 12h5.2" />
      <path d="M11.2 15.6h3.2" />
    </>
  ),
  shelf: (
    <>
      <path d="M3.4 20.4V4.6a1 1 0 0 1 1-1h15.2a1 1 0 0 1 1 1v15.8" />
      <path d="M3.4 12h17.2" />
      <path d="M7 3.8v8" />
      <path d="M13.4 3.8v8" />
      <path d="M9.8 12.2v8.2" />
      <path d="M16.6 12.2v8.2" />
      <path d="M3.4 20.4h17.2" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3.4 13.8 9.4 19.8 11.2 13.8 13 12 19 10.2 13 4.2 11.2 10.2 9.4 12 3.4Z" />
      <path d="M18.6 4 19.3 6.1 21.4 6.8 19.3 7.5 18.6 9.6 17.9 7.5 15.8 6.8 17.9 6.1 18.6 4Z" />
    </>
  ),
  moon: <path d="M20.4 14.6A8.8 8.8 0 0 1 9.4 3.6a8.8 8.8 0 1 0 11 11Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.6v2.2M12 19.2v2.2M4.4 12H2.2M21.8 12h-2.2" />
      <path d="m6.3 6.3-1.6-1.6M19.3 19.3l-1.6-1.6M6.3 17.7l-1.6 1.6M19.3 4.7l-1.6 1.6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.2 14.6a1.5 1.5 0 0 0 .3 1.7l.1.1a1.8 1.8 0 1 1-2.6 2.6l-.1-.1a1.5 1.5 0 0 0-1.7-.3 1.5 1.5 0 0 0-.9 1.4v.2a1.8 1.8 0 1 1-3.6 0v-.1a1.5 1.5 0 0 0-1-1.4 1.5 1.5 0 0 0-1.7.3l-.1.1a1.8 1.8 0 1 1-2.6-2.6l.1-.1a1.5 1.5 0 0 0 .3-1.7 1.5 1.5 0 0 0-1.4-.9h-.2a1.8 1.8 0 1 1 0-3.6h.1a1.5 1.5 0 0 0 1.4-1 1.5 1.5 0 0 0-.3-1.7l-.1-.1a1.8 1.8 0 1 1 2.6-2.6l.1.1a1.5 1.5 0 0 0 1.7.3h.1a1.5 1.5 0 0 0 .9-1.4v-.2a1.8 1.8 0 1 1 3.6 0v.1a1.5 1.5 0 0 0 .9 1.4 1.5 1.5 0 0 0 1.7-.3l.1-.1a1.8 1.8 0 1 1 2.6 2.6l-.1.1a1.5 1.5 0 0 0-.3 1.7v.1a1.5 1.5 0 0 0 1.4.9h.2a1.8 1.8 0 1 1 0 3.6h-.1a1.5 1.5 0 0 0-1.4.9Z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 6.8V12l3.4 2" />
    </>
  ),
  repeat: (
    <>
      <path d="M4.4 10.2V9a3 3 0 0 1 3-3h11" />
      <path d="m15.4 2.8 3.2 3.2-3.2 3.2" />
      <path d="M19.6 13.8V15a3 3 0 0 1-3 3h-11" />
      <path d="m8.6 21.2-3.2-3.2 3.2-3.2" />
    </>
  ),
  lock: (
    <>
      <rect x="4.6" y="10.4" width="14.8" height="10" rx="2" />
      <path d="M8.2 10.2V7.4a3.8 3.8 0 0 1 7.6 0v2.8" />
    </>
  ),
};

const Icon = ({ name, size = 20, strokeWidth = 1.6, className = '', ...rest }) => {
  const glyph = PATHS[name];
  if (!glyph) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {glyph}
    </svg>
  );
};

export const ICON_NAMES = Object.keys(PATHS);

export default Icon;
