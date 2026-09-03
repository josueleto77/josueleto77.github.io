"use client";

import { useState } from "react";
import type { Photo } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import Icon from "@/components/ui/icons";

export default function PhotoGallery({ photos, title }: { photos: Photo[]; title: string }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  function openAt(i: number) {
    setIndex(i);
    setOpen(true);
  }

  return (
    <>
      <div className="grid grid-cols-4 gap-2 overflow-hidden rounded-2xl sm:h-[420px]">
        <button onClick={() => openAt(0)} className="relative col-span-4 row-span-2 sm:col-span-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[0]?.url} alt={photos[0]?.alt ?? title} className="h-full w-full object-cover" />
        </button>
        {photos.slice(1, 5).map((p, i) => (
          <button key={p.id} onClick={() => openAt(i + 1)} className="relative hidden sm:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.alt} className="h-full w-full object-cover" />
          </button>
        ))}
        <button
          onClick={() => openAt(0)}
          className="absolute bottom-4 right-4 hidden items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-navy shadow sm:flex"
        >
          <Icon name="grid" className="h-3.5 w-3.5" />
          Show all {photos.length} photos
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} size="full" title={title}>
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[index]?.url} alt={photos[index]?.alt ?? title} className="max-h-[65vh] w-full rounded-xl object-cover" />
          <button
            onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow"
          >
            <Icon name="chevron-left" className="h-5 w-5 text-navy" />
          </button>
          <button
            onClick={() => setIndex((i) => (i + 1) % photos.length)}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow"
          >
            <Icon name="chevron-right" className="h-5 w-5 text-navy" />
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-ink/60">
          {index + 1} / {photos.length}
        </p>
      </Modal>
    </>
  );
}
