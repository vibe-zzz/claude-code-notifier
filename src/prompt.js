/**
 * Interactive prompt utilities with arrow key navigation.
 * No dependencies - uses Node.js built-in readline and raw mode.
 */

import { emitKeypressEvents } from 'node:readline';

const ICON_SELECTED = '◉';
const ICON_UNSELECTED = '○';
const ICON_CURSOR = '❯';
const COLOR_CYAN = '\x1b[36m';
const COLOR_DIM = '\x1b[2m';
const COLOR_RESET = '\x1b[0m';
const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';

/**
 * Render the option list to stdout.
 */
function render(title, options, cursor, selected, isMulti) {
  // Move cursor up to overwrite previous render (if not first render)
  const lines = options.length;
  process.stdout.write(`\x1b[${lines}A`);

  for (let i = 0; i < options.length; i++) {
    const isCursor = i === cursor;
    const isSelected = selected.has(i);
    const prefix = isCursor ? `${COLOR_CYAN}${ICON_CURSOR}${COLOR_RESET}` : ' ';
    const icon = isMulti
      ? (isSelected ? `${COLOR_CYAN}${ICON_SELECTED}${COLOR_RESET}` : ICON_UNSELECTED)
      : (isSelected ? `${COLOR_CYAN}${ICON_SELECTED}${COLOR_RESET}` : ICON_UNSELECTED);
    const label = isCursor ? `${COLOR_CYAN}${options[i].label}${COLOR_RESET}` : options[i].label;
    const tag = options[i].default ? ` ${COLOR_DIM}(default)${COLOR_RESET}` : '';

    process.stdout.write(`\x1b[2K  ${prefix} ${icon} ${label}${tag}\n`);
  }
}

/**
 * Core interactive selector using raw mode keypresses.
 */
function interactiveSelect(title, options, isMulti) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      // Non-interactive fallback: return defaults
      const defaults = options
        .map((o, i) => (o.default ? i : null))
        .filter((v) => v !== null);
      resolve(defaults.length > 0 ? defaults : [0]);
      return;
    }

    // For multi-select, prepend an "All" option
    const allLabel = 'All (recommended)';
    const displayOptions = isMulti
      ? [{ label: allLabel, default: false }, ...options]
      : options;

    const selected = new Set();
    // Pre-select defaults (offset by 1 for multi due to "All" row)
    if (isMulti) {
      const allDefault = options.every((o) => o.default);
      if (allDefault) {
        // All items default on → select "All" + every real item
        selected.add(0);
        options.forEach((_, i) => selected.add(i + 1));
      } else {
        options.forEach((o, i) => { if (o.default) selected.add(i + 1); });
      }
    } else {
      options.forEach((o, i) => { if (o.default) selected.add(i); });
    }
    let cursor = 0;

    // Print title and initial options
    console.log(`\n${title}`);
    const hint = isMulti
      ? `${COLOR_DIM}  (↑↓ move, space toggle, enter confirm)${COLOR_RESET}`
      : `${COLOR_DIM}  (↑↓ move, enter confirm)${COLOR_RESET}`;
    console.log(hint);
    for (let i = 0; i < displayOptions.length; i++) {
      const isSelected = selected.has(i);
      const icon = isSelected ? `${COLOR_CYAN}${ICON_SELECTED}${COLOR_RESET}` : ICON_UNSELECTED;
      const label = i === 0 ? `${COLOR_CYAN}${displayOptions[i].label}${COLOR_RESET}` : displayOptions[i].label;
      const prefix = i === 0 ? `${COLOR_CYAN}${ICON_CURSOR}${COLOR_RESET}` : ' ';
      const tag = displayOptions[i].default ? ` ${COLOR_DIM}(default)${COLOR_RESET}` : '';
      console.log(`  ${prefix} ${icon} ${label}${tag}`);
    }

    process.stdout.write(HIDE_CURSOR);
    emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    const onKeypress = (str, key) => {
      if (!key) return;

      // Ctrl+C to exit
      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.stdout.write(SHOW_CURSOR);
        process.exit(0);
      }

      if (key.name === 'up') {
        cursor = (cursor - 1 + displayOptions.length) % displayOptions.length;
        render(title, displayOptions, cursor, selected, isMulti);
      } else if (key.name === 'down') {
        cursor = (cursor + 1) % displayOptions.length;
        render(title, displayOptions, cursor, selected, isMulti);
      } else if (key.name === 'space' && isMulti) {
        if (cursor === 0) {
          // Toggle "All": select or deselect everything
          if (selected.has(0)) {
            selected.clear();
          } else {
            for (let i = 0; i < displayOptions.length; i++) selected.add(i);
          }
        } else {
          // Toggle individual item
          if (selected.has(cursor)) {
            selected.delete(cursor);
            selected.delete(0); // uncheck "All"
          } else {
            selected.add(cursor);
            // Check if all real items are selected → auto-check "All"
            const allRealSelected = options.every((_, i) => selected.has(i + 1));
            if (allRealSelected) selected.add(0);
          }
        }
        render(title, displayOptions, cursor, selected, isMulti);
      } else if (key.name === 'return') {
        cleanup();
        process.stdout.write(SHOW_CURSOR);

        if (isMulti) {
          // Map back to original indices (subtract 1, skip "All" row)
          const result = [...selected]
            .filter((i) => i > 0)
            .map((i) => i - 1)
            .sort();
          const finalResult = result.length > 0 ? result : [0];
          const names = finalResult.map((i) => options[i].label).join(', ');
          console.log(`${COLOR_DIM}  Selected: ${names}${COLOR_RESET}`);
          resolve(finalResult);
        } else {
          // Single select: use cursor position
          const names = displayOptions[cursor].label;
          console.log(`${COLOR_DIM}  Selected: ${names}${COLOR_RESET}`);
          resolve([cursor]);
        }
      }
    };

    function cleanup() {
      process.stdin.removeListener('keypress', onKeypress);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }

    process.stdin.on('keypress', onKeypress);
  });
}

/**
 * Multi-select prompt with arrow key navigation.
 * @param {string} title
 * @param {{ label: string, default?: boolean }[]} options
 * @returns {Promise<number[]>} selected indices (0-based)
 */
export async function multiSelect(title, options) {
  return interactiveSelect(title, options, true);
}

/**
 * Single-select prompt with arrow key navigation.
 * @param {string} title
 * @param {{ label: string, default?: boolean }[]} options
 * @returns {Promise<number>} selected index (0-based)
 */
export async function singleSelect(title, options) {
  const result = await interactiveSelect(title, options, false);
  return result[0];
}

/**
 * Ask a question and return the answer string.
 * @param {string} question
 * @returns {Promise<string>}
 */
export async function ask(question) {
  const { createInterface } = await import('node:readline');
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}
