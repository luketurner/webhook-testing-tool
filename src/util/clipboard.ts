/**
 * Copies text to the clipboard, returning whether it succeeded.
 *
 * `navigator.clipboard` is only available in a secure context (HTTPS,
 * `localhost`, or `127.0.0.1`), so it is undefined when the dashboard is served
 * over plain HTTP on a LAN or tailnet hostname. The fallback uses the
 * deprecated `document.execCommand("copy")`, which has no such requirement and
 * remains the only option on those origins.
 *
 * Note that the fallback requires transient user activation: it works from a
 * click handler, but not from a callback that runs after an awaited fetch.
 * Callers that copy asynchronously should handle a `false` result by showing
 * the text so it can be copied by hand.
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

function copyWithExecCommand(text: string): boolean {
  const selection = document.getSelection();
  const previousRange =
    selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  const textarea = document.createElement("textarea");
  textarea.value = text;
  // Read-only keeps mobile keyboards from popping up, and positioning the
  // textarea off-screen keeps it from flashing or scrolling the page.
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);

  try {
    textarea.select();
    // iOS Safari ignores select() on its own.
    textarea.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
    if (previousRange && selection) {
      selection.removeAllRanges();
      selection.addRange(previousRange);
    }
  }
}
