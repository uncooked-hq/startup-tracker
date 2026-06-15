'use client';

import React from 'react';
import { Bookmark } from 'lucide-react';

interface BookmarkButtonProps {
  saved: boolean;
  onClick: (e: React.MouseEvent) => void;
  size?: number;
  className?: string;
  /** Override the hover label (defaults to save/unsave). */
  tooltip?: string;
}

export function BookmarkButton({ saved, onClick, size = 18, className = '', tooltip }: BookmarkButtonProps) {
  return (
    <div className="relative group/bm">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick(e);
        }}
        className={`transition-all ${className}`}
      >
        <Bookmark
          size={size}
          className={saved
            ? 'fill-brand text-brand'
            : 'text-neutral-600 hover:text-neutral-400'
          }
        />
      </button>
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-[10px] font-bold text-white bg-[#1a1a1a] border border-white/10 rounded-lg opacity-0 group-hover/bm:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
        {tooltip ?? (saved ? 'unsave' : 'save')}
      </div>
    </div>
  );
}
