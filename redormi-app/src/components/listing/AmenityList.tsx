"use client";

import { useState } from "react";
import Icon, { type IconName } from "@/components/ui/icons";
import { amenities } from "@/lib/data/amenities";

export default function AmenityList({ amenityIds }: { amenityIds: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const list = amenities.filter((a) => amenityIds.includes(a.id));
  const shown = expanded ? list : list.slice(0, 8);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shown.map((a) => (
          <div key={a.id} className="flex items-center gap-2.5 text-sm text-navy">
            <Icon name={a.icon as IconName} className="h-[18px] w-[18px] text-navy/60" />
            {a.label}
          </div>
        ))}
      </div>
      {list.length > 8 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-4 rounded-lg border border-navy px-4 py-2 text-sm font-semibold text-navy hover:bg-navy/5"
        >
          {expanded ? "Show less" : `Show all ${list.length} amenities`}
        </button>
      )}
    </div>
  );
}
