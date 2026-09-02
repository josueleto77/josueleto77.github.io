"use client";

import { useState } from "react";
import type { ExtraService } from "@/lib/types";
import Input, { Select, Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Toggle from "@/components/ui/Toggle";
import { CATEGORY_LABEL, PRICING_UNIT_LABEL } from "@/lib/data/services";
import { seededPhoto } from "@/lib/utils/ids";

export type ServiceDraft = Omit<ExtraService, "id">;

const CATEGORIES = Object.keys(CATEGORY_LABEL) as ExtraService["category"][];
const UNITS = Object.keys(PRICING_UNIT_LABEL) as ExtraService["pricingUnit"][];

export default function ServiceForm({
  listingId,
  onSubmit,
  onCancel,
}: {
  listingId: string;
  onSubmit: (draft: ServiceDraft) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ExtraService["category"]>("recreation");
  const [description, setDescription] = useState("");
  const [pricingUnit, setPricingUnit] = useState<ExtraService["pricingUnit"]>("per_day");
  const [price, setPrice] = useState(25);
  const [quantityAvailable, setQuantityAvailable] = useState(1);
  const [deposit, setDeposit] = useState(0);
  const [requiresLicense, setRequiresLicense] = useState(false);
  const [ageMinimum, setAgeMinimum] = useState(18);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      listingId,
      category,
      name,
      description: description || `${name} — available for guests during their stay.`,
      photos: [seededPhoto(`${listingId}-${name}`, 700, 500)],
      pricingUnit,
      price,
      quantityAvailable,
      deposit: deposit > 0 ? deposit : undefined,
      requiresLicense: category === "vehicles" ? requiresLicense : undefined,
      ageMinimum: requiresLicense ? ageMinimum : undefined,
      cancellationPolicy: "flexible",
      commissionPct: 15,
    });
    setName("");
    setDescription("");
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border border-navy/10 bg-cream/60 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Kayak (2-person)" />
        <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value as ExtraService["category"])}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </Select>
      </div>
      <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <div className="grid gap-3 sm:grid-cols-4">
        <Select label="Pricing unit" value={pricingUnit} onChange={(e) => setPricingUnit(e.target.value as ExtraService["pricingUnit"])}>
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {PRICING_UNIT_LABEL[u]}
            </option>
          ))}
        </Select>
        <Input label="Price ($)" type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        <Input label="Qty available" type="number" min={1} value={quantityAvailable} onChange={(e) => setQuantityAvailable(Number(e.target.value))} />
        <Input label="Deposit ($)" type="number" min={0} value={deposit} onChange={(e) => setDeposit(Number(e.target.value))} />
      </div>
      {category === "vehicles" && (
        <div className="flex flex-wrap items-center gap-4">
          <Toggle label="Requires driver's license" checked={requiresLicense} onChange={setRequiresLicense} />
          {requiresLicense && (
            <Input label="Minimum age" type="number" min={16} value={ageMinimum} onChange={(e) => setAgeMinimum(Number(e.target.value))} className="w-28" />
          )}
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Add service
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
