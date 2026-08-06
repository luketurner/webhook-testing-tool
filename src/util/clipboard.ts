/**
 * Copies text to the clipboard, returning whether it succeeded.
 *
 * `navigator.clipboard` is only available in a secure context (HTTPS,
 * `localhost`, or `127.0.0.1`), so it is undefined when the dashboard is served
 * over plain HTTP on a LAN or tailnet hostname. The fallback uses the
 * deprecated `document.execCommand("copy")`, which has no such requirement and
 * remains the only option on those origins.
 *
 * Note that the fallback needs transient user activation, and how long that
 * lasts varies by browser. Copying straight from a click handler is reliable;
 * copying from a callback that runs after an awaited fetch may not be. Callers
 * in that position should handle a `false` result by showing the text so it can
 * be copied by hand.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permissions policy can reject this even in a secure context, so fall
      // through to the execCommand fallback rather than giving up.
    }
  }

  return copyWithExecCommand(text);
}

/**
 * Copies by selecting a range over an off-screen node.
 *
 * This deliberately does not focus a <textarea>, which is the more common way
 * to do this. Focusing an element escapes modal focus traps: while a dialog is
 * open, Radix's FocusScope listens for `focusin` on the document and pulls
 * focus back inside the dialog whenever it lands on a node outside it. That
 * discards the selection before the copy runs, so `execCommand` reports success
 * while putting nothing on the clipboard. Selecting a range never moves focus,
 * so the trap is never triggered — and the caller keeps their focus besides.
 */
function copyWithExecCommand(text: string): boolean {
  const selection = document.getSelection();
  const previousRanges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) =>
        selection.getRangeAt(index),
      )
    : [];

  const node = document.createElement("span");
  node.textContent = text;
  // Preserve newlines and indentation, and keep the node invisible and out of
  // layout flow so it neither flashes nor scrolls the page.
  node.style.whiteSpace = "pre";
  node.style.position = "fixed";
  node.style.top = "0";
  node.style.left = "-9999px";
  // Override any inherited `user-select: none` from the surrounding UI.
  node.style.setProperty("user-select", "text");
  node.style.setProperty("-webkit-user-select", "text");
  // iOS Safari only permits execCommand("copy") over editable content.
  node.contentEditable = "true";
  document.body.appendChild(node);

  try {
    const range = document.createRange();
    range.selectNodeContents(node);
    selection?.removeAllRanges();
    selection?.addRange(range);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(node);
    if (selection) {
      selection.removeAllRanges();
      for (const range of previousRanges) selection.addRange(range);
    }
  }
}
