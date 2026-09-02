"use client";

import { useState } from "react";
import type { Listing } from "@/lib/types";
import Icon, { type IconName } from "@/components/ui/icons";
import Button from "@/components/ui/Button";
import ServiceForm, { type ServiceDraft } from "@/components/services/ServiceForm";
import { useAppData } from "@/lib/store/AppDataContext";
import { CATEGORY_LABEL, PRICING_UNIT_LABEL } from "@/lib/data/services";
import { formatMoney } from "@/lib/utils/format";

const CATEGORY_ICON: Record<string, IconName> = {
  vehicles: "car",
  recreation: "kayak",
  comfort: "bed",
  services: "sparkles",
};

export default function ExtraServicesManager({ listings }: { listings: Listing[] }) {
  const { state, createExtraService, deleteExtraService } = useAppData();
  const [activeListingId, setActiveListingId] = useState(listings[0]?.id ?? "");
  const [formOpen, setFormOpen] = useState(false);

  const services = state.extraServices.filter((s) => s.listingId === activeListingId);

  function handleAdd(draft: ServiceDraft) {
    createExtraService(draft);
    setFormOpen(false);
  }

  if (listings.length === 0) {
    return <p className="text-sm text-ink/60">Publish a listing first to start selling extra services.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <select
        value={activeListingId}
        onChange={(e) => setActiveListingId(e.target.value)}
        className="w-full max-w-sm rounded-xl border border-navy/15 px-3.5 py-2.5 text-sm sm:w-auto"
      >
        {listings.map((l) => (
          <option key={l.id} value={l.id}>
            {l.title}
          </option>
        ))}
      </select>

      <div className="grid gap-3 sm:grid-cols-2">
        {services.map((s) => (
          <div key={s.id} className="flex items-start justify-between gap-3 rounded-xl border border-navy/10 bg-white p-4">
            <div>
              <div className="flex items-center gap-1.5 text-navy/50">
                <Icon name={CATEGORY_ICON[s.category]} className="h-3.5 w-3.5" />
                <span className="text-[11px] font-bold uppercase tracking-wide">{CATEGORY_LABEL[s.category]}</span>
              </div>
              <p className="text-sm font-bold text-navy">{s.name}</p>
              <p className="text-xs text-ink/60">
                {formatMoney(s.price)} {PRICING_UNIT_LABEL[s.pricingUnit]} · Qty {s.quantityAvailable} · {s.commissionPct}% commission
              </p>
            </div>
            <button onClick={() => deleteExtraService(s.id)} aria-label={`Remove ${s.name}`} className="text-navy/40 hover:text-coral">
              <Icon name="trash" className="h-4 w-4" />
            </button>
          </div>
        ))}
        {services.length === 0 && !formOpen && (
          <p className="text-sm text-ink/50">No extra services yet for this listing.</p>
        )}
      </div>

      {formOpen ? (
        <ServiceForm listingId={activeListingId} onSubmit={handleAdd} onCancel={() => setFormOpen(false)} />
      ) : (
        <Button variant="outline" size="sm" className="w-fit" onClick={() => setFormOpen(true)} icon={<Icon name="plus" className="h-4 w-4" />}>
          Add a service
        </Button>
      )}
    </div>
  );
}
