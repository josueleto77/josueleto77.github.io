"use client";

import { useState } from "react";
import type { ExtraService } from "@/lib/types";
import Icon, { type IconName } from "@/components/ui/icons";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { formatMoney } from "@/lib/utils/format";
import { PRICING_UNIT_LABEL } from "@/lib/data/services";
import { useAppData } from "@/lib/store/AppDataContext";

const CATEGORY_ICON: Record<ExtraService["category"], IconName> = {
  vehicles: "car",
  recreation: "kayak",
  comfort: "bed",
  services: "sparkles",
};

export default function ExtraServiceCard({ service, bookingId, swapId }: { service: ExtraService; bookingId?: string; swapId?: string }) {
  const { currentUser, orderService } = useAppData();
  const [qty, setQty] = useState(1);
  const [waiver, setWaiver] = useState(false);
  const [license, setLicense] = useState(false);
  const [added, setAdded] = useState(false);

  const needsGate = service.requiresLicense;
  const canAdd = !needsGate || (waiver && license);

  function handleAdd() {
    if (!currentUser || !canAdd) return;
    orderService({
      serviceId: service.id,
      bookingId,
      swapId,
      guestId: currentUser.id,
      quantity: qty,
      totalPrice: service.price * qty,
      waiverAccepted: needsGate ? waiver : undefined,
      licenseUploaded: needsGate ? license : undefined,
    });
    setAdded(true);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-navy/10 bg-white p-4">
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={service.photos[0]} alt={service.name} className="h-16 w-20 shrink-0 rounded-xl object-cover" loading="lazy" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-navy/50">
            <Icon name={CATEGORY_ICON[service.category]} className="h-3.5 w-3.5" />
            <span className="text-[11px] font-bold uppercase tracking-wide">{service.category}</span>
          </div>
          <h4 className="text-sm font-bold text-navy">{service.name}</h4>
          <p className="line-clamp-2 text-xs text-ink/60">{service.description}</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-navy">
          {formatMoney(service.price)} <span className="font-normal text-ink/50">{PRICING_UNIT_LABEL[service.pricingUnit]}</span>
        </span>
        {service.deposit && <Badge tone="cream">{formatMoney(service.deposit)} deposit</Badge>}
      </div>

      {needsGate && !added && (
        <div className="flex flex-col gap-2 rounded-xl bg-cream p-3 text-xs text-ink/70">
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={waiver} onChange={(e) => setWaiver(e.target.checked)} className="mt-0.5 h-4 w-4 accent-coral" />
            I accept the liability waiver for this {service.category === "vehicles" ? "vehicle" : "equipment"}.
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={license} onChange={(e) => setLicense(e.target.checked)} className="mt-0.5 h-4 w-4 accent-coral" />
            I&apos;ll upload a valid driver&apos;s license
            {service.ageMinimum ? ` and confirm I'm ${service.ageMinimum}+` : ""} before pickup.
          </label>
        </div>
      )}

      <div className="flex items-center gap-2">
        {!added && (
          <div className="flex items-center rounded-lg border border-navy/15">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-2.5 py-1.5 text-navy" aria-label="Decrease quantity">
              <Icon name="minus" className="h-3.5 w-3.5" />
            </button>
            <span className="w-6 text-center text-sm font-semibold">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(service.quantityAvailable, q + 1))}
              className="px-2.5 py-1.5 text-navy"
              aria-label="Increase quantity"
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <Button size="sm" variant={added ? "outline" : "primary"} disabled={added || !canAdd} onClick={handleAdd} className="flex-1">
          {added ? "Added to trip" : `Add · ${formatMoney(service.price * qty)}`}
        </Button>
      </div>
    </div>
  );
}
