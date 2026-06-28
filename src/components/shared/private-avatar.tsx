"use client";

import * as React from 'react';
import { cn, getInitials } from '@/lib/utils';

/**
 * A profile picture that can't be casually opened, saved, dragged or copied.
 *
 * Privacy: the image is painted as a CSS `background-image` on a <div> rather
 * than an <img>, so the browser/webview offers no "Open image", "Save image" or
 * "Copy image" menu. We also block the context menu, drag-start and the iOS
 * long-press callout, and disable text selection. (A determined user with
 * devtools can still read the URL — true protection needs signed/expiring URLs
 * or a server-side proxy — but every normal save/copy path is closed.)
 */
export function PrivateAvatar({
  src,
  name,
  className,
}: {
  src?: string | null;
  name?: string;
  className?: string;
}) {
  const block = (e: React.SyntheticEvent) => e.preventDefault();

  return (
    <div
      role="img"
      aria-label={name || 'Member'}
      draggable={false}
      onContextMenu={block}
      onDragStart={block}
      className={cn(
        "relative flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full",
        "bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 dark:from-indigo-900 dark:to-slate-900 dark:text-indigo-300",
        "[-webkit-touch-callout:none] [-webkit-user-drag:none]",
        className,
      )}
      style={
        src
          ? { backgroundImage: `url("${src}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : undefined
      }
    >
      {!src && <span className="text-[40%] font-semibold leading-none">{getInitials(name)}</span>}
      {/* Transparent shield: swallows long-press / right-click over the image area. */}
      {src && <span aria-hidden className="absolute inset-0" onContextMenu={block} />}
    </div>
  );
}
