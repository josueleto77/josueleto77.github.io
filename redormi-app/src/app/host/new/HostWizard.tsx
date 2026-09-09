"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Stepper from "@/components/ui/Stepper";
import Input, { Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Toggle from "@/components/ui/Toggle";
import RangeSlider from "@/components/ui/RangeSlider";
import Icon, { type IconName } from "@/components/ui/icons";
import ServiceForm, { type ServiceDraft } from "@/components/services/ServiceForm";
import { useAppData } from "@/lib/store/AppDataContext";
import { amenities } from "@/lib/data/amenities";
import { COMMON_RULES } from "@/lib/data/listings";
import { PROPERTY_TYPE_LABEL } from "@/lib/utils/filters";
import type { CancellationPolicy, Listing, Photo, PropertyType } from "@/lib/types";
import { seededPhoto } from "@/lib/utils/ids";
import { formatMoney, isoToday } from "@/lib/utils/format";
import { supabase } from "@/lib/supabase/client";
import { createListingInSupabase, uploadListingPhotos } from "@/lib/supabase/listings";

const STEPS = [
  "Property type",
  "Location",
  "Capacity",
  "Amenities",
  "Photos",
  "Title",
  "Pricing",
  "Availability",
  "House rules",
  "Offers",
  "Switch",
  "Services",
  "Review",
];

const PROPERTY_TYPES: PropertyType[] = ["studio", "apartment", "house", "villa", "cabin", "loft"];
const DRAFT_KEY = "redormi_host_wizard_draft";

interface WizardState {
  propertyType: PropertyType;
  city: string;
  region: string;
  country: string;
  lat: string;
  lng: string;
  guests: number;
  bedrooms: number;
  beds: number;
  baths: number;
  sqft: number;
  yearRenovated: number;
  amenityIds: string[];
  photos: Photo[];
  title: string;
  description: string;
  baseNightly: number;
  cleaningFee: number;
  extraGuestFee: number;
  weeklyDiscountPct: number;
  monthlyDiscountPct: number;
  minNights: number;
  maxNights: number;
  cancellationPolicy: CancellationPolicy;
  houseRules: string[];
  customRule: string;
  acceptsOffers: boolean;
  autoAcceptThresholdPct: number;
  autoDeclineFloorPct: number;
  switchEnabled: boolean;
  switchStart: string;
  switchEnd: string;
  switchWishlist: string;
  services: ServiceDraft[];
}

function defaultWizardState(): WizardState {
  return {
    propertyType: "apartment",
    city: "",
    region: "",
    country: "",
    lat: "0",
    lng: "0",
    guests: 2,
    bedrooms: 1,
    beds: 1,
    baths: 1,
    sqft: 700,
    yearRenovated: new Date().getFullYear(),
    amenityIds: ["wifi", "kitchen"],
    photos: [],
    title: "",
    description: "",
    baseNightly: 120,
    cleaningFee: 40,
    extraGuestFee: 15,
    weeklyDiscountPct: 10,
    monthlyDiscountPct: 20,
    minNights: 2,
    maxNights: 21,
    cancellationPolicy: "moderate",
    houseRules: [COMMON_RULES[0], COMMON_RULES[2], COMMON_RULES[3]],
    customRule: "",
    acceptsOffers: true,
    autoAcceptThresholdPct: 10,
    autoDeclineFloorPct: 25,
    switchEnabled: false,
    switchStart: isoToday(30),
    switchEnd: isoToday(44),
    switchWishlist: "",
    services: [],
  };
}

export default function HostWizard() {
  const router = useRouter();
  const { currentUser, createListing, createExtraService } = useAppData();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardState>(defaultWizardState);
  const [photoDraftId, setPhotoDraftId] = useState(1);
  // Real uploaded files, keyed by photo id — kept out of `form` since File
  // objects can't be JSON-serialized into the localStorage draft.
  const [photoFiles, setPhotoFiles] = useState<Record<string, File>>({});
  const [publishing, setPublishing] = useState(false);
  const [loadedDraft, setLoadedDraft] = useState(false);

  useEffect(() => {
    // Intentional: renders the blank default wizard first (matching the
    // static export), then restores a saved draft right after mount.
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setForm({ ...defaultWizardState(), ...JSON.parse(raw) });
    } catch {
      // ignore corrupted draft
    }
    setLoadedDraft(true);
  }, []);

  useEffect(() => {
    if (!loadedDraft) return;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form, loadedDraft]);

  function patch(p: Partial<WizardState>) {
    setForm((f) => ({ ...f, ...p }));
  }

  function toggleAmenity(id: string) {
    setForm((f) => ({
      ...f,
      amenityIds: f.amenityIds.includes(id) ? f.amenityIds.filter((a) => a !== id) : [...f.amenityIds, id],
    }));
  }

  function toggleRule(rule: string) {
    setForm((f) => ({
      ...f,
      houseRules: f.houseRules.includes(rule) ? f.houseRules.filter((r) => r !== rule) : [...f.houseRules, rule],
    }));
  }

  function addSamplePhoto() {
    const id = `draft-${photoDraftId}`;
    setForm((f) => ({
      ...f,
      photos: [
        ...f.photos,
        { id, url: seededPhoto(`${form.title || "new-listing"}-${photoDraftId}`, 900, 600), alt: `Photo ${f.photos.length + 1}`, isCover: f.photos.length === 0 },
      ],
    }));
    setPhotoDraftId((n) => n + 1);
  }

  function addUploadedPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const id = `upload-${photoDraftId}-${file.name}`;
      setPhotoFiles((p) => ({ ...p, [id]: file }));
      setForm((f) => ({
        ...f,
        photos: [...f.photos, { id, url: URL.createObjectURL(file), alt: file.name, isCover: f.photos.length === 0 }],
      }));
      setPhotoDraftId((n) => n + 1);
    });
  }

  function movePhoto(index: number, dir: -1 | 1) {
    setForm((f) => {
      const next = [...f.photos];
      const target = index + dir;
      if (target < 0 || target >= next.length) return f;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...f, photos: next };
    });
  }

  function setCover(index: number) {
    setForm((f) => ({ ...f, photos: f.photos.map((p, i) => ({ ...p, isCover: i === index })) }));
  }

  function removePhoto(index: number) {
    const removed = form.photos[index];
    if (removed && photoFiles[removed.id]) {
      setPhotoFiles((p) => {
        const next = { ...p };
        delete next[removed.id];
        return next;
      });
    }
    setForm((f) => ({ ...f, photos: f.photos.filter((_, i) => i !== index) }));
  }

  const canContinue = useMemo(() => {
    switch (step) {
      case 1:
        return form.city.trim() !== "" && form.country.trim() !== "";
      case 4:
        return form.photos.length >= 3;
      case 5:
        return form.title.trim().length > 4 && form.description.trim().length > 20;
      default:
        return true;
    }
  }, [step, form]);

  async function publish() {
    if (!currentUser) {
      router.push("/login");
      return;
    }

    const pricing = {
      baseNightly: form.baseNightly,
      weekendNightly: Math.round(form.baseNightly * 1.15),
      weeklyDiscountPct: form.weeklyDiscountPct,
      monthlyDiscountPct: form.monthlyDiscountPct,
      cleaningFee: form.cleaningFee,
      extraGuestFee: form.extraGuestFee,
      serviceFeePct: 12,
      taxPct: 8,
    };

    setPublishing(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const hostId = sessionData.session?.user.id;

    if (hostId) {
      // Real, signed-in host: upload any real photo files, then persist a
      // real row in Supabase — this listing is visible to every visitor,
      // not just this browser.
      const filesToUpload = form.photos.filter((p) => photoFiles[p.id]).map((p) => photoFiles[p.id]);
      const uploaded = filesToUpload.length ? await uploadListingPhotos(filesToUpload, hostId) : [];
      let uploadIndex = 0;
      const photos = form.photos.map((p) =>
        photoFiles[p.id] ? uploaded[uploadIndex++] ?? { url: p.url, alt: p.alt } : { url: p.url, alt: p.alt }
      );

      const created = await createListingInSupabase(
        {
          title: form.title,
          description: form.description,
          propertyType: form.propertyType,
          city: form.city,
          region: form.region,
          country: form.country,
          guests: form.guests,
          bedrooms: form.bedrooms,
          beds: form.beds,
          baths: form.baths,
          amenities: form.amenityIds,
          photos,
          pricing,
          houseRules: form.houseRules,
          cancellationPolicy: form.cancellationPolicy,
          instantBook: false,
          acceptsOffers: form.acceptsOffers,
          minNights: form.minNights,
          maxNights: form.maxNights,
          switchEnabled: form.switchEnabled,
        },
        hostId
      );
      setPublishing(false);
      if (!created) {
        return;
      }
      createListing(created);
      form.services.forEach((s) => createExtraService({ ...s, listingId: created.id }));
      window.localStorage.removeItem(DRAFT_KEY);
      router.push("/dashboard/host");
      return;
    }

    // No real session (e.g. browsing the demo account) — fall back to the
    // local-only demo listing, exactly as before.
    setPublishing(false);
    const id = `lst_new_${Date.now()}`;
    const listing: Listing = {
      id,
      hostId: currentUser.id,
      title: form.title,
      slug: id,
      description: form.description,
      propertyType: form.propertyType,
      city: form.city,
      region: form.region,
      country: form.country,
      lat: Number(form.lat) || 0,
      lng: Number(form.lng) || 0,
      guests: form.guests,
      bedrooms: form.bedrooms,
      beds: form.beds,
      baths: form.baths,
      sqft: form.sqft,
      yearRenovated: form.yearRenovated,
      amenities: form.amenityIds,
      photos: form.photos,
      pricing,
      houseRules: form.houseRules,
      cancellationPolicy: form.cancellationPolicy,
      instantBook: false,
      acceptsOffers: form.acceptsOffers,
      autoAcceptThresholdPct: form.acceptsOffers ? form.autoAcceptThresholdPct : undefined,
      autoDeclineFloorPct: form.acceptsOffers ? form.autoDeclineFloorPct : undefined,
      minNights: form.minNights,
      maxNights: form.maxNights,
      availability: [],
      ratingAvg: 0,
      ratingCount: 0,
      bookingVelocity: 0,
      repeatGuestRate: 0,
      switch: {
        enabled: form.switchEnabled,
        travelDatesStart: form.switchEnabled ? form.switchStart : undefined,
        travelDatesEnd: form.switchEnabled ? form.switchEnd : undefined,
        destinationWishlist: form.switchEnabled
          ? form.switchWishlist.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
      },
      extraServiceIds: [],
      status: "published",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    createListing(listing);
    form.services.forEach((s) => createExtraService({ ...s, listingId: id }));
    window.localStorage.removeItem(DRAFT_KEY);
    router.push("/dashboard/host");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-navy">List your home</h1>
        <button
          onClick={() => {
            window.localStorage.removeItem(DRAFT_KEY);
            setForm(defaultWizardState());
            setStep(0);
          }}
          className="text-xs font-semibold text-ink/50 hover:text-coral"
        >
          Start over
        </button>
      </div>
      <p className="mb-6 text-sm text-ink/60">Your progress saves automatically as a draft.</p>

      <div className="mb-6">
        <Stepper steps={STEPS} current={step} />
      </div>

      <div className="rounded-2xl border border-navy/10 bg-white p-6 shadow-sm sm:p-8">
        {step === 0 && (
          <StepBlock title="What type of place is it?">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {PROPERTY_TYPES.map((pt) => (
                <button
                  key={pt}
                  onClick={() => patch({ propertyType: pt })}
                  className={`rounded-xl border-2 p-4 text-left text-sm font-bold transition-colors ${
                    form.propertyType === pt ? "border-coral bg-coral/5 text-navy" : "border-navy/10 text-navy/70 hover:border-navy/25"
                  }`}
                >
                  {PROPERTY_TYPE_LABEL[pt]}
                </button>
              ))}
            </div>
          </StepBlock>
        )}

        {step === 1 && (
          <StepBlock title="Where is it located?">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="City" value={form.city} onChange={(e) => patch({ city: e.target.value })} required />
              <Input label="Region / state" value={form.region} onChange={(e) => patch({ region: e.target.value })} />
              <Input label="Country" value={form.country} onChange={(e) => patch({ country: e.target.value })} required />
              <div className="grid grid-cols-2 gap-2">
                <Input label="Latitude" value={form.lat} onChange={(e) => patch({ lat: e.target.value })} />
                <Input label="Longitude" value={form.lng} onChange={(e) => patch({ lng: e.target.value })} />
              </div>
            </div>
            <p className="mt-2 text-xs text-ink/50">Drop an approximate pin — exact coordinates aren&apos;t shared until a booking or swap is confirmed.</p>
          </StepBlock>
        )}

        {step === 2 && (
          <StepBlock title="How many people can stay?">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <NumberField label="Guests" value={form.guests} onChange={(v) => patch({ guests: v })} min={1} />
              <NumberField label="Bedrooms" value={form.bedrooms} onChange={(v) => patch({ bedrooms: v })} min={0} />
              <NumberField label="Beds" value={form.beds} onChange={(v) => patch({ beds: v })} min={1} />
              <NumberField label="Baths" value={form.baths} onChange={(v) => patch({ baths: v })} min={0.5} step={0.5} />
              <NumberField label="Sq ft" value={form.sqft} onChange={(v) => patch({ sqft: v })} min={100} step={10} />
              <NumberField label="Year renovated" value={form.yearRenovated} onChange={(v) => patch({ yearRenovated: v })} min={1950} max={new Date().getFullYear()} />
            </div>
          </StepBlock>
        )}

        {step === 3 && (
          <StepBlock title="What does your place offer?">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {amenities.map((a) => (
                <label key={a.id} className="flex items-center gap-2 rounded-lg border border-navy/10 px-3 py-2 text-sm text-navy">
                  <input type="checkbox" checked={form.amenityIds.includes(a.id)} onChange={() => toggleAmenity(a.id)} className="h-4 w-4 accent-coral" />
                  {a.label}
                </label>
              ))}
            </div>
          </StepBlock>
        )}

        {step === 4 && (
          <StepBlock title="Add photos">
            <p className="mb-3 text-sm text-ink/60">
              Add at least 3 real photos of your place — they&apos;ll upload when you publish. You can also drop in
              a sample placeholder if you just want to try the wizard.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {form.photos.map((p, i) => (
                <div key={p.id} className="group relative overflow-hidden rounded-xl border border-navy/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.alt} className="aspect-[4/3] w-full object-cover" />
                  {p.isCover && <span className="absolute left-1.5 top-1.5 rounded-full bg-coral px-2 py-0.5 text-[10px] font-bold text-white">Cover</span>}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-navy/70 px-1.5 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => movePhoto(i, -1)} aria-label="Move left" className="p-1 text-white">
                      <Icon name="chevron-left" className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setCover(i)} aria-label="Set as cover" className="p-1 text-white">
                      <Icon name="star" className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => removePhoto(i)} aria-label="Remove photo" className="p-1 text-white">
                      <Icon name="trash" className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => movePhoto(i, 1)} aria-label="Move right" className="p-1 text-white">
                      <Icon name="chevron-right" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-navy/20 text-navy/50 hover:border-coral hover:text-coral">
                <Icon name="upload" className="h-5 w-5" />
                <span className="text-xs font-semibold">Upload photos</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addUploadedPhotos(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <button
              onClick={addSamplePhoto}
              className="mt-3 text-xs font-semibold text-ink/50 hover:text-coral"
            >
              + Add a sample placeholder photo instead
            </button>
          </StepBlock>
        )}

        {step === 5 && (
          <StepBlock title="Give it a title and description">
            <div className="flex flex-col gap-4">
              <Input label="Title" value={form.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Sunlit loft near the harbor" required />
              <Textarea label="Description" value={form.description} onChange={(e) => patch({ description: e.target.value })} placeholder="What makes this place special?" required />
            </div>
          </StepBlock>
        )}

        {step === 6 && (
          <StepBlock title="Set your pricing">
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField label="Base nightly rate ($)" value={form.baseNightly} onChange={(v) => patch({ baseNightly: v })} min={10} />
              <NumberField label="Cleaning fee ($)" value={form.cleaningFee} onChange={(v) => patch({ cleaningFee: v })} min={0} />
              <NumberField label="Extra guest fee ($)" value={form.extraGuestFee} onChange={(v) => patch({ extraGuestFee: v })} min={0} />
              <NumberField label="Weekly discount (%)" value={form.weeklyDiscountPct} onChange={(v) => patch({ weeklyDiscountPct: v })} min={0} max={40} />
              <NumberField label="Monthly discount (%)" value={form.monthlyDiscountPct} onChange={(v) => patch({ monthlyDiscountPct: v })} min={0} max={60} />
            </div>
          </StepBlock>
        )}

        {step === 7 && (
          <StepBlock title="Availability & cancellation">
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField label="Minimum nights" value={form.minNights} onChange={(v) => patch({ minNights: v })} min={1} />
              <NumberField label="Maximum nights" value={form.maxNights} onChange={(v) => patch({ maxNights: v })} min={form.minNights} />
            </div>
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-semibold text-navy">Cancellation policy</label>
              <div className="flex gap-2">
                {(["flexible", "moderate", "strict"] as CancellationPolicy[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => patch({ cancellationPolicy: p })}
                    className={`rounded-full border px-4 py-1.5 text-sm font-semibold capitalize ${
                      form.cancellationPolicy === p ? "border-coral bg-coral text-white" : "border-navy/15 text-navy"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </StepBlock>
        )}

        {step === 8 && (
          <StepBlock title="House rules">
            <div className="flex flex-col gap-2">
              {COMMON_RULES.map((rule) => (
                <label key={rule} className="flex items-center gap-2 text-sm text-navy">
                  <input type="checkbox" checked={form.houseRules.includes(rule)} onChange={() => toggleRule(rule)} className="h-4 w-4 accent-coral" />
                  {rule}
                </label>
              ))}
              {form.houseRules.filter((r) => !COMMON_RULES.includes(r)).map((rule) => (
                <label key={rule} className="flex items-center gap-2 text-sm text-navy">
                  <input type="checkbox" checked onChange={() => toggleRule(rule)} className="h-4 w-4 accent-coral" />
                  {rule}
                </label>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input value={form.customRule} onChange={(e) => patch({ customRule: e.target.value })} placeholder="Add a custom rule" className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (form.customRule.trim()) {
                    patch({ houseRules: [...form.houseRules, form.customRule.trim()], customRule: "" });
                  }
                }}
              >
                Add
              </Button>
            </div>
          </StepBlock>
        )}

        {step === 9 && (
          <StepBlock title="Accept offers?">
            <Toggle
              label="Allow guests to make offers"
              description="Guests can request a percentage discount for specific dates."
              checked={form.acceptsOffers}
              onChange={(v) => patch({ acceptsOffers: v })}
            />
            {form.acceptsOffers && (
              <div className="mt-5 flex flex-col gap-4">
                <RangeSlider
                  min={0}
                  max={30}
                  value={form.autoAcceptThresholdPct}
                  onChange={(v) => patch({ autoAcceptThresholdPct: v })}
                  label="Auto-accept offers at or below"
                  formatValue={(v) => `${v}%`}
                />
                <RangeSlider
                  min={0}
                  max={40}
                  value={form.autoDeclineFloorPct}
                  onChange={(v) => patch({ autoDeclineFloorPct: v })}
                  label="Auto-decline offers above"
                  formatValue={(v) => `${v}%`}
                />
              </div>
            )}
          </StepBlock>
        )}

        {step === 10 && (
          <StepBlock title="Enable Redormi Switch?">
            <Toggle
              tone="sage"
              label="Open this home to reciprocal exchanges"
              description="Set travel dates and where you'd like to swap to."
              checked={form.switchEnabled}
              onChange={(v) => patch({ switchEnabled: v })}
            />
            {form.switchEnabled && (
              <div className="mt-5 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Travel from" type="date" value={form.switchStart} onChange={(e) => patch({ switchStart: e.target.value })} />
                  <Input label="Travel to" type="date" value={form.switchEnd} onChange={(e) => patch({ switchEnd: e.target.value })} />
                </div>
                <Input
                  label="Destination wishlist"
                  value={form.switchWishlist}
                  onChange={(e) => patch({ switchWishlist: e.target.value })}
                  placeholder="Barcelona, Lisbon, Rome"
                  hint="Comma-separated cities you'd like to swap toward."
                />
              </div>
            )}
          </StepBlock>
        )}

        {step === 11 && (
          <StepBlock title="Extra services (optional)">
            <p className="mb-3 text-sm text-ink/60">Sell vehicles, recreation gear, comfort items, or add-on services alongside the stay.</p>
            <div className="mb-3 flex flex-col gap-2">
              {form.services.map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-navy/10 px-3 py-2 text-sm">
                  <span className="font-semibold text-navy">
                    {s.name} · {formatMoney(s.price)}
                  </span>
                  <button onClick={() => patch({ services: form.services.filter((_, idx) => idx !== i) })} className="text-navy/40 hover:text-coral">
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <ServiceForm listingId="draft" onSubmit={(draft) => patch({ services: [...form.services, draft] })} />
          </StepBlock>
        )}

        {step === 12 && (
          <StepBlock title="Review & publish">
            <div className="flex flex-col gap-4">
              {form.photos[0] && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={form.photos[0].url} alt={form.title} className="aspect-video w-full rounded-xl object-cover" />
              )}
              <div>
                <h3 className="text-lg font-extrabold text-navy">{form.title || "Untitled listing"}</h3>
                <p className="text-sm text-ink/60">
                  {form.city}, {form.country} · {PROPERTY_TYPE_LABEL[form.propertyType]}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <ReviewStat label="Guests" value={form.guests} />
                <ReviewStat label="Bedrooms" value={form.bedrooms} />
                <ReviewStat label="Nightly rate" value={formatMoney(form.baseNightly)} />
                <ReviewStat label="Photos" value={form.photos.length} />
              </div>
              <div className="flex flex-wrap gap-2">
                {form.acceptsOffers && <Tag>Accepts offers</Tag>}
                {form.switchEnabled && <Tag tone="sage">Switch enabled</Tag>}
                {form.services.length > 0 && <Tag>{form.services.length} extra service{form.services.length > 1 ? "s" : ""}</Tag>}
              </div>
            </div>
          </StepBlock>
        )}

        <div className="mt-8 flex justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Back
          </Button>
          {step === STEPS.length - 1 ? (
            <Button onClick={publish} size="lg" disabled={publishing}>
              {publishing ? "Publishing…" : "Publish listing"}
            </Button>
          ) : (
            <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={!canContinue}>
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-5 text-xl font-extrabold text-navy">{title}</h2>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold text-navy">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-xl border border-navy/15 px-3 py-2"
      />
    </label>
  );
}

function ReviewStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-cream p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-navy/40">{label}</p>
      <p className="text-sm font-bold text-navy">{value}</p>
    </div>
  );
}

function Tag({ children, tone = "coral" }: { children: React.ReactNode; tone?: "coral" | "sage" }) {
  const icon: IconName = tone === "sage" ? "sparkles" : "check";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${tone === "sage" ? "bg-sage text-navy" : "bg-coral text-white"}`}>
      <Icon name={icon} className="h-3 w-3" />
      {children}
    </span>
  );
}
