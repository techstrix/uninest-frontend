"use client";

import type { ReactNode } from "react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Check, ChevronRight, GraduationCap, Loader2, MapPin, Upload, X } from "lucide-react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { getListingPaymentStatus, initiateListingStkPush } from "../actions/mpesa-actions";
import { UniNestWordmark } from "@/components/brand/uninest-wordmark";

const amenities = [
  "High Speed WiFi",
  "24/7 Water/Borehole",
  "Tokens/Prepaid",
  "CCTV/Guard",
  "Instant Hot Shower",
  "Balcony",
  "Furnished",
  "Kitchenette",
  
];

type BedroomType = "BEDSITTER" | "ONE_BEDROOM" | "TWO_BEDROOM" | "THREE_BEDROOM";

type PostListingDraft = {
  title: string;
  description: string;
  price: number;
  address: string;
  mainWalkingMin: number;
  chiromoWalkingMin: number;
  parklandsWalkingMin: number;
  amenities: string[];
  bedroomType: BedroomType | null;
  photos: File[];
};

type FormErrors = Partial<Record<keyof PostListingDraft | "submit", string>>;

type CampusKey = "mainWalkingMin" | "chiromoWalkingMin" | "parklandsWalkingMin";

type ListingStepKey = "basics" | "location" | "photos" | "amenities" | "publish";

type ListingStep = {
  id: ListingStepKey;
  label: string;
  title: string;
  description: string;
};

const listingSteps: ListingStep[] = [
  {
    id: "basics",
    label: "Step 1",
    title: "Basic details",
    description: "Title, description, price and room type.",
  },
  {
    id: "location",
    label: "Step 2",
    title: "Location",
    description: "Address and campus distances.",
  },
  {
    id: "photos",
    label: "Step 3",
    title: "Photos",
    description: "Upload property images.",
  },
  {
    id: "amenities",
    label: "Step 4",
    title: "Amenities",
    description: "What is included.",
  },
  {
    id: "publish",
    label: "Step 5",
    title: "Publish",
    description: "Pay to go live.",
  },
];

const campusCoordinates: Record<CampusKey, { coord: string }> = {
  mainWalkingMin: { coord: "36.8219,-1.2771" },
  chiromoWalkingMin: { coord: "36.8048,-1.2727" },
  parklandsWalkingMin: { coord: "36.8149,-1.2685" },
};

function toNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getInputClassName(hasError: boolean) {
  return `h-14 w-full rounded-2xl border bg-white px-4 text-sm text-[#23312d] placeholder:text-[#8c8a80] shadow-[0_1px_0_rgba(17,24,39,0.02)] focus:bg-white focus:outline-none ${
    hasError ? "border-[#dc2626] focus:border-[#dc2626]" : "border-[#dcd6c9] focus:border-[#2b6a56]"
  }`;
}

function getTextareaClassName(hasError: boolean) {
  return `w-full resize-none rounded-2xl border bg-white px-4 py-4 text-sm text-[#23312d] placeholder:text-[#8c8a80] shadow-[0_1px_0_rgba(17,24,39,0.02)] focus:bg-white focus:outline-none ${
    hasError ? "border-[#dc2626] focus:border-[#dc2626]" : "border-[#dcd6c9] focus:border-[#2b6a56]"
  }`;
}

async function calculateWalkingTimeFromCampus(houseLat: number, houseLng: number, campusCoord: string) {
  const houseCoord = `${houseLng},${houseLat}`;
  const url = `https://router.project-osrm.org/route/v1/foot/${campusCoord};${houseCoord}?overview=false`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to calculate route.");
  }

  const data = await response.json();
  const route = data?.routes?.[0];

  if (!route) {
    throw new Error("No route returned for campus distance.");
  }

  const distanceKm = route.distance / 1000;

  return {
    durationMin: Math.round(distanceKm * 12),
  };
}

async function calculateCampusDistances(houseLat: number, houseLng: number) {
  const entries = await Promise.all(
    (Object.entries(campusCoordinates) as Array<[CampusKey, { coord: string }]>).map(async ([key, campus]) => {
      const result = await calculateWalkingTimeFromCampus(houseLat, houseLng, campus.coord);
      return [key, result] as const;
    }),
  );

  return Object.fromEntries(entries) as Record<CampusKey, { durationMin: number }>;
}

function formatCoordinates(lat: number, lng: number) {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function formatLocationName(address: Record<string, string | undefined>, fallback: string) {
  const parts = [address.road, address.neighbourhood, address.suburb, address.city || address.town || address.village, address.county]
    .filter((part, index, all) => part && all.indexOf(part) === index)
    .slice(0, 3);

  if (parts.length > 0) {
    return parts.join(", ");
  }

  return fallback;
}

function validateDraft(draft: PostListingDraft): FormErrors {
  const errors: FormErrors = {};
  const maxPhotoBytes = 5 * 1024 * 1024;

  if (draft.title.length < 5) {
    errors.title = "Title should be at least 5 characters.";
  } else if (draft.title.length > 120) {
    errors.title = "Title should not exceed 120 characters.";
  }

  if (draft.description.length < 20) {
    errors.description = "Description should be at least 20 characters.";
  } else if (draft.description.length > 2000) {
    errors.description = "Description should not exceed 2000 characters.";
  }

  if (!Number.isFinite(draft.price) || draft.price <= 0) {
    errors.price = "Enter a valid price greater than 0.";
  } else if (draft.price > 1000000) {
    errors.price = "Price seems too high. Double-check it.";
  }

  if (draft.address.length < 10) {
    errors.address = "Address should be at least 10 characters.";
  } else if (draft.address.length > 240) {
    errors.address = "Address should not exceed 240 characters.";
  }

  if (!Number.isInteger(draft.mainWalkingMin) || draft.mainWalkingMin < 0) {
    errors.mainWalkingMin = "Use 0 or a positive whole number.";
  }
  if (!Number.isInteger(draft.chiromoWalkingMin) || draft.chiromoWalkingMin < 0) {
    errors.chiromoWalkingMin = "Use 0 or a positive whole number.";
  }
  if (!Number.isInteger(draft.parklandsWalkingMin) || draft.parklandsWalkingMin < 0) {
    errors.parklandsWalkingMin = "Use 0 or a positive whole number.";
  }

  if (draft.mainWalkingMin > 300 || draft.chiromoWalkingMin > 300 || draft.parklandsWalkingMin > 300) {
    errors.mainWalkingMin = errors.mainWalkingMin ?? "Walking minutes look too high.";
    errors.chiromoWalkingMin = errors.chiromoWalkingMin ?? "Walking minutes look too high.";
    errors.parklandsWalkingMin = errors.parklandsWalkingMin ?? "Walking minutes look too high.";
  }

  if (draft.amenities.length === 0) {
    errors.amenities = "Select at least one amenity.";
  }

  if (!draft.bedroomType) {
    errors.bedroomType = "Select a bedroom type.";
  }

  if (draft.photos.length === 0) {
    errors.photos = "Upload at least one photo.";
  } else if (draft.photos.length > 5) {
    errors.photos = "You can upload a maximum of 5 photos.";
  }

  const hasInvalidPhotoType = draft.photos.some((photo) => !photo.type.startsWith("image/"));
  if (hasInvalidPhotoType) {
    errors.photos = "Only image files are allowed.";
  }

  const hasLargePhoto = draft.photos.some((photo) => photo.size > maxPhotoBytes);
  if (hasLargePhoto) {
    errors.photos = "Each photo should be 5MB or less.";
  }

  return errors;
}

export default function PostListingClient() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPhotoCount, setSelectedPhotoCount] = useState(0);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [selectedPhotoPreviews, setSelectedPhotoPreviews] = useState<Array<{ key: string; name: string; url: string }>>([]);
  const [isDraggingPhotos, setIsDraggingPhotos] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentPhone, setPaymentPhone] = useState("");
  const [paymentStatusText, setPaymentStatusText] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [isPublishingAfterPayment, setIsPublishingAfterPayment] = useState(false);
  const [locationLabel, setLocationLabel] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [campusTimes, setCampusTimes] = useState<Record<CampusKey, number>>({
    mainWalkingMin: 0,
    chiromoWalkingMin: 0,
    parklandsWalkingMin: 0,
  });
  const [activeStep, setActiveStep] = useState<ListingStepKey>("basics");
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const sectionRefs = useRef<Record<ListingStepKey, HTMLElement | null>>({
    basics: null,
    location: null,
    photos: null,
    amenities: null,
    publish: null,
  });

  useEffect(() => {
    if (!isLoaded) return;
    if (isLoaded && !user) {
      router.push("/sign-in");
    }
    const role = user?.publicMetadata.role;
    if (role !== "landlord") {
      router.push("/home");
    }
  }, [isLoaded, user, router]);

  useEffect(() => {
    const targets = listingSteps
      .map((step) => sectionRefs.current[step.id])
      .filter((element): element is HTMLElement => Boolean(element));

    if (targets.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        const nextStep = visibleEntries[0]?.target.id as ListingStepKey | undefined;
        if (nextStep) {
          setActiveStep(nextStep);
        }
      },
      {
        root: null,
        threshold: [0.12, 0.25, 0.4, 0.6],
        rootMargin: "-18% 0px -58% 0px",
      },
    );

    targets.forEach((target) => observer.observe(target));

    return () => observer.disconnect();
  }, []);

  const scrollToStep = (stepId: ListingStepKey) => {
    sectionRefs.current[stepId]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const clearError = (key: keyof FormErrors) => {
    setErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  useEffect(() => {
    const nextPreviews = selectedPhotos.map((photo) => ({
      key: `${photo.name}-${photo.size}-${photo.lastModified}`,
      name: photo.name,
      url: URL.createObjectURL(photo),
    }));

    setSelectedPhotoPreviews(nextPreviews);

    return () => {
      nextPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [selectedPhotos]);

  const setPhotoFiles = (files: File[]) => {
    const dataTransfer = new DataTransfer();

    files.slice(0, 5).forEach((file) => dataTransfer.items.add(file));

    if (photoInputRef.current) {
      photoInputRef.current.files = dataTransfer.files;
    }

    setSelectedPhotoCount(dataTransfer.files.length);
    setSelectedPhotos(Array.from(dataTransfer.files));
    clearError("photos");
  };

  const syncPhotoFiles = (files: FileList | File[]) => {
    const incomingFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    const existingFiles = selectedPhotos;
    const mergedFiles = [...existingFiles, ...incomingFiles].filter(
      (file, index, all) => all.findIndex((current) => current.name === file.name && current.size === file.size && current.lastModified === file.lastModified) === index,
    );

    setPhotoFiles(mergedFiles);
  };

  const openPhotoPicker = () => {
    photoInputRef.current?.click();
  };

  const removePhotoAtIndex = (index: number) => {
    const nextPhotos = selectedPhotos.filter((_, currentIndex) => currentIndex !== index);
    setPhotoFiles(nextPhotos);
  };

  const handleGetLocation = async () => {
    setLocationError("");
    setErrors((current) => {
      if (!current.address && !current.mainWalkingMin && !current.chiromoWalkingMin && !current.parklandsWalkingMin) {
        return current;
      }

      const next = { ...current };
      delete next.address;
      delete next.mainWalkingMin;
      delete next.chiromoWalkingMin;
      delete next.parklandsWalkingMin;
      return next;
    });

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }

    setLocationLoading(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
        });
      }).catch((error) => {
        throw new Error(getGeolocationErrorMessage(error));
      });

      const { latitude, longitude, accuracy } = position.coords;
      if (accuracy > 100) {
        console.warn(`Low location accuracy (${accuracy} meters). Consider allowing high accuracy or trying again in an open area.`);
      }

      let placeName = "";
      try {
        const reverseResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2&zoom=18&addressdetails=1`,
        );

        if (reverseResponse.ok) {
          const reverseData = await reverseResponse.json();
          placeName = formatLocationName(reverseData?.address ?? {}, reverseData?.display_name ?? "");
        }
      } catch (error) {
        console.warn("Reverse geocoding failed", error);
      }

      let distances: Awaited<ReturnType<typeof calculateCampusDistances>>;

      try {
        distances = await calculateCampusDistances(latitude, longitude);
      } catch (error) {
        console.error("Campus routing failed", error);
        throw new Error("Could not calculate campus distances. Please try again.");
      }

      setLocationLabel(placeName || formatCoordinates(latitude, longitude));
      setCampusTimes({
        mainWalkingMin: distances.mainWalkingMin.durationMin,
        chiromoWalkingMin: distances.chiromoWalkingMin.durationMin,
        parklandsWalkingMin: distances.parklandsWalkingMin.durationMin,
      });
    } catch (error) {
      console.error("Location lookup failed", error);
      setLocationError(error instanceof Error ? error.message : "Could not get your location. Please try again.");
    } finally {
      setLocationLoading(false);
    }
  };

  function getGeolocationErrorMessage(error: GeolocationPositionError | unknown) {
    if (typeof error !== "object" || error === null) {
      return "Could not get your location. Please try again.";
    }

    const geoError = error as GeolocationPositionError;

    switch (geoError.code) {
      case geoError.PERMISSION_DENIED:
        return "Location access was denied. Please allow location permission and try again.";
      case geoError.POSITION_UNAVAILABLE:
        return "Your current location could not be determined right now. Please try again.";
      case geoError.TIMEOUT:
        return "Location request timed out. Please try again.";
      default:
        return "Could not get your location. Please try again.";
    }
  }

  const closePaymentModal = () => {
    if (isInitiatingPayment || isCheckingPayment || isPublishingAfterPayment) {
      return;
    }

    setIsPaymentModalOpen(false);
    setPaymentError("");
    setPaymentStatusText("");
    setPendingFormData(null);
  };

  const cloneFormData = (source: FormData) => {
    const cloned = new FormData();
    source.forEach((value, key) => {
      cloned.append(key, value);
    });
    return cloned;
  };

  const publishListingAfterPayment = async (checkoutRequestId: string) => {
    if (!pendingFormData) {
      return { ok: false, error: "Missing listing form data." };
    }

    const formDataToSubmit = cloneFormData(pendingFormData);
    formDataToSubmit.append("checkoutRequestId", checkoutRequestId);

    const response = await fetch("/api/listings", {
      method: "POST",
      body: formDataToSubmit,
    });

    if (!response.ok) {
      return {
        ok: false,
        error: "Could not publish listing after payment. Please try again.",
      };
    }

    return { ok: true };
  };

  const waitForPaymentResult = async (checkoutRequestId: string) => {
    const maxAttempts = 24;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      const statusResult = await getListingPaymentStatus(checkoutRequestId);

      if (!statusResult.success) {
        return { ok: false, message: statusResult.error || "Could not confirm payment status." };
      }

      if (!statusResult.data) {
        return { ok: false, message: "Missing payment status data." };
      }

      const status = statusResult.data.status;

      if (status === "SUCCESS") {
        return {
          ok: true,
          message: statusResult.data.mpesaReference
            ? `Payment successful. Receipt: ${statusResult.data.mpesaReference}`
            : "Payment successful.",
        };
      }

      if (status === "FAILED" || status === "CANCELLED") {
        return {
          ok: false,
          message: statusResult.data.resultDesc || "Payment was not successful.",
        };
      }

      setPaymentStatusText("Waiting for M-Pesa confirmation...");
    }

    return { ok: false, message: "Payment is still pending. Please try again shortly." };
  };

  const handleListingPayment = async () => {
    if (!pendingFormData) {
      setPaymentError("Listing data is missing. Please submit the form again.");
      return;
    }

    setPaymentError("");
    setPaymentStatusText("Sending M-Pesa prompt to your phone...");
    setIsInitiatingPayment(true);

    try {
      const result = await initiateListingStkPush(paymentPhone);

      if (!result.success) {
        setPaymentError(result.error || "Failed to initiate payment.");
        setPaymentStatusText("");
        return;
      }

      const paymentData = result.data;
      if (!paymentData) {
        setPaymentError("Unable to track payment. Missing payment response data.");
        setPaymentStatusText("");
        return;
      }

      const checkoutRequestId = paymentData.checkoutRequestId;
      if (!checkoutRequestId) {
        setPaymentError("Unable to track payment. Missing CheckoutRequestID.");
        setPaymentStatusText("");
        return;
      }

      setPaymentStatusText(paymentData.customerMessage || "M-Pesa prompt sent. Confirm on your phone.");
      setIsCheckingPayment(true);

      const paymentStatus = await waitForPaymentResult(checkoutRequestId);

      if (!paymentStatus.ok) {
        setPaymentError(paymentStatus.message);
        return;
      }

      setPaymentStatusText("Payment confirmed. Publishing your listing...");
      setIsPublishingAfterPayment(true);
      const publishResult = await publishListingAfterPayment(checkoutRequestId);

      if (!publishResult.ok) {
        setPaymentError(publishResult.error || "Could not publish listing.");
        return;
      }

      setIsPaymentModalOpen(false);
      setPendingFormData(null);
      router.push("/landlord-dashboard");
    } catch {
      setPaymentError("Something went wrong while processing payment.");
      setPaymentStatusText("");
    } finally {
      setIsInitiatingPayment(false);
      setIsCheckingPayment(false);
      setIsPublishingAfterPayment(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const formData = new FormData(event.currentTarget);

      const photos = formData
        .getAll("photos")
        .filter((entry): entry is File => entry instanceof File && entry.size > 0);

      const selectedBedroomType = formData.get("bedroomType");

      const draft: PostListingDraft = {
        title: String(formData.get("title") ?? "").trim(),
        description: String(formData.get("description") ?? "").trim(),
        price: toNumber(formData.get("price")),
        address: locationLabel.trim(),
        mainWalkingMin: campusTimes.mainWalkingMin,
        chiromoWalkingMin: campusTimes.chiromoWalkingMin,
        parklandsWalkingMin: campusTimes.parklandsWalkingMin,
        amenities: formData.getAll("amenities").filter((entry): entry is string => typeof entry === "string"),
        bedroomType:
          typeof selectedBedroomType === "string" && selectedBedroomType.length > 0
            ? (selectedBedroomType as BedroomType)
            : null,
        photos,
      };

      if (!locationLabel) {
        setErrors({ address: "Click Get Location to populate the address and campus distances." });
        return;
      }

      const validationErrors = validateDraft(draft);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      setPendingFormData(formData);
      setPaymentPhone("");
      setPaymentError("");
      setPaymentStatusText("");
      setIsPaymentModalOpen(true);
    } catch {
      setErrors({ submit: "Something went wrong. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f2efe6] text-[#23312d]">
      <div className="min-h-screen lg:flex">
        <aside className="hidden w-[330px] shrink-0 flex-col bg-[#1f5a48] px-6 py-6 text-white lg:sticky lg:top-0 lg:flex lg:h-screen">
          <UniNestWordmark className="text-[26px]" accentClassName="text-[#8ed4bd]" />
          <div className="text-[13px] font-semibold uppercase tracking-[0.28em] text-[#7fd0b3]">New listing</div>
          <h1 className="mt-4 text-[42px] font-semibold leading-[0.95] tracking-[-0.03em] text-white">
            Post a <span className="italic text-[#8ed4bd]">property</span> for UoN students
          </h1>
          <p className="mt-5 max-w-[260px] text-[15px] leading-7 text-[#d4ebe3]">
            Fill in the details below to reach thousands of University of Nairobi students looking for housing near Main, Chiromo, and Parklands campuses.
          </p>

          <nav className="mt-10 space-y-0 border-y border-white/10 py-2">
            {listingSteps.map((step, index) => {
              const stepIndex = index + 1;
              const isActive = activeStep === step.id;
              const isComplete = listingSteps.findIndex((item) => item.id === activeStep) > index;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => scrollToStep(step.id)}
                  className={`flex w-full items-center gap-4 border-b border-white/10 px-0 py-5 text-left transition last:border-b-0 ${
                    isActive ? "text-white" : "text-[#89b7aa]"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                      isActive
                        ? "border-[#f39a2a] bg-[#f39a2a] text-white"
                        : isComplete
                          ? "border-[#8ed4bd] bg-[#8ed4bd] text-[#10382d]"
                          : "border-white/30 text-white/70"
                    }`}
                  >
                    {isComplete && !isActive ? <ChevronRight className="h-4 w-4" /> : stepIndex}
                  </span>
                  <span>
                    <span className="block text-[15px] font-semibold">{step.title}</span>
                    <span className="block text-xs leading-5 text-current/70">{step.description}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-white/10 pt-5 text-sm leading-6 text-[#b8ddd2]">
            Your listing will be visible to students after activation.
            <br />
            Pay KES 300 via M-Pesa to activate for 30 days.
            <div className="mt-2 font-semibold text-white">
              Learn more <span aria-hidden="true">→</span>
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <div className="border-b border-white/70 bg-[#1f5a48] px-4 py-3 text-white lg:hidden">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7fd0b3]">New listing</div>
            <div className="mt-1 text-lg font-semibold">Post a property for UoN students</div>
          </div>

          <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="mb-4 flex justify-end lg:mb-6">
              <Link
                href="/landlord-dashboard"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-[#d7d0c1] bg-white px-4 text-sm font-semibold text-[#1f5a48] transition hover:border-[#1f5a48] hover:bg-[#f8f6ef]"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
                Back to dashboard
              </Link>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <section
                ref={(node) => {
                  sectionRefs.current.basics = node;
                }}
                id="basics"
                className="scroll-mt-8 border-b border-[#e3dccd] bg-[#f7f2e8] px-4 py-16 sm:px-8 lg:px-10"
              >
                <StepHeading label="Step 1" title="Property basics" description="Start with the essentials - what makes your property worth a look?" />

                <div className="grid gap-5">
                  <Field
                    label="Listing title"
                    required
                    error={errors.title}
                    id="title"
                    control={
                      <input
                        id="title"
                        name="title"
                        type="text"
                        placeholder="e.g. Bright bedsitter 5 min walk from Main Campus"
                        required
                        onChange={() => clearError("title")}
                        className={getInputClassName(Boolean(errors.title))}
                      />
                    }
                  />

                  <Field
                    label="Description"
                    helper="tell students what makes this place special"
                    error={errors.description}
                    id="description"
                    control={
                      <textarea
                        id="description"
                        name="description"
                        placeholder="Describe the space, natural light, nearby amenities, house rules, neighbourhood feel..."
                        rows={5}
                        required
                        onChange={() => clearError("description")}
                        className={getTextareaClassName(Boolean(errors.description))}
                      />
                    }
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Monthly rent"
                      required
                      error={errors.price}
                      id="price"
                      control={
                        <div className="relative">
                          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#1f5a48]">KES</span>
                          <input
                            id="price"
                            name="price"
                            type="number"
                            min="0"
                            placeholder="8,500"
                            required
                            onChange={() => clearError("price")}
                            className={`${getInputClassName(Boolean(errors.price))} pl-16`}
                          />
                        </div>
                      }
                    />

                 
                  </div>

                  <Field
                    label="Bedroom type"
                    required
                    error={errors.bedroomType}
                    id="bedroomType"
                    control={
                      <select
                        id="bedroomType"
                        name="bedroomType"
                        defaultValue=""
                      
                        onChange={() => clearError("bedroomType")}
                        className={getInputClassName(Boolean(errors.bedroomType))}
                      >
                        <option value="" disabled>
                          Select property type
                        </option>
                        <option value="BEDSITTER">Bedsitter</option>
                        <option value="ONE_BEDROOM">1 Bedroom</option>
                        <option value="TWO_BEDROOM">2 Bedroom</option>
                        <option value="THREE_BEDROOM">3 Bedroom</option>
                      </select>
                    }
                  />
                </div>
              </section>

              <section
                ref={(node) => {
                  sectionRefs.current.location = node;
                }}
                id="location"
                className="scroll-mt-8 border-b border-[#e3dccd] bg-[#f7f2e8] px-4 py-16 sm:px-8 lg:px-10"
              >
                <StepHeading label="Step 2" title="Location & distances" description="Students filter primarily by walking distance. Accurate distances put you at the top of results." />

                <div className="space-y-4">
                  <Field
                    label="Property address"
                    required
                    error={errors.address}
                    id="address"
                    control={
                      <input
                        id="address"
                        name="address"
                        type="text"
                        value={locationLabel}
                        readOnly
                        placeholder="e.g. Ngara Road, off University Way, Nairobi"
                        className={`${getInputClassName(Boolean(errors.address))} cursor-not-allowed bg-[#f2f1ec]`}
                      />
                    }
                  />

                  <div className="space-y-3 rounded-2xl border border-[#dfd8c9] bg-[#f4efe5] p-4 sm:p-5">
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1f5a48]">Use your current location</div>
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={locationLoading}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#1f5a48] px-5 text-sm font-semibold text-white transition hover:bg-[#184738] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <MapPin className="h-4 w-4" />
                      {locationLoading ? "Getting location..." : "Get my location"}
                    </button>
                    <p className="text-sm text-[#7b766c]">We’ll show the nearest place name here after detection.</p>
                    {locationError ? <p className="text-sm text-[#dc2626]">{locationError}</p> : null}
                  </div>

                  <div>
                    <div className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#1f5a48]">Walking time to each campus in minutes</div>
                    <div className="grid gap-4 lg:grid-cols-3">
                      <CampusCard label="Main" value={campusTimes.mainWalkingMin} />
                      <CampusCard label="Chiromo" value={campusTimes.chiromoWalkingMin} />
                      <CampusCard label="Parklands" value={campusTimes.parklandsWalkingMin} />
                    </div>
                  </div>
                </div>
              </section>

              <section
                ref={(node) => {
                  sectionRefs.current.photos = node;
                }}
                id="photos"
                className="scroll-mt-8 border-b border-[#e3dccd] bg-[#f7f2e8] px-4 py-16 sm:px-8 lg:px-10"
              >
                <StepHeading label="Step 3" title="Property photos" description="Listings with at least 4 photos receive 3x more student inquiries. Show the room, bathroom, kitchen, and compound." />

                <div className="space-y-4">
                  <div
                    role="button"
                    tabIndex={0}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      setIsDraggingPhotos(true);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDraggingPhotos(true);
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      setIsDraggingPhotos(false);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      setIsDraggingPhotos(false);
                      syncPhotoFiles(event.dataTransfer.files);
                    }}
                    onClick={openPhotoPicker}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openPhotoPicker();
                      }
                    }}
                    className={`flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed px-6 py-10 text-center transition ${
                      errors.photos
                        ? "border-[#dc2626] bg-[#fff8f8]"
                        : isDraggingPhotos
                          ? "border-[#1f5a48] bg-[#f4faf8]"
                          : "border-[#d9d1c3] bg-[#ede7d9]"
                    }`}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d9d6c9] text-[#1f5a48]">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div className="mt-5 text-[17px] font-semibold text-[#2a2f2b]">Drop photos here or click to browse</div>
                    <div className="mt-1 text-sm text-[#78746a]">JPG, PNG or WEBP · Max 10MB per photo</div>
                    <div className="mt-4 rounded-full bg-[#d9e6dc] px-3 py-1 text-xs font-semibold text-[#1f5a48]">Minimum 1 photo required</div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openPhotoPicker();
                      }}
                      className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-[#1f5a48] px-5 text-sm font-semibold text-white transition hover:bg-[#184738]"
                    >
                      <Upload className="h-4 w-4" />
                      Browse files
                    </button>
                  </div>
                  <input
                    ref={photoInputRef}
                    id="photos"
                    name="photos"
                    type="file"
                    multiple
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => {
                      syncPhotoFiles(event.target.files ?? []);
                    }}
                  />
                  <div className="flex items-center justify-between gap-3 text-sm text-[#6f6a60]">
                    <span>{selectedPhotoCount > 0 ? `${selectedPhotoCount} photo(s) selected` : "No photos selected yet"}</span>
                    {errors.photos && <span className="text-[#dc2626]">{errors.photos}</span>}
                  </div>
                  {selectedPhotoPreviews.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      {selectedPhotoPreviews.map((photo, index) => (
                        <figure key={photo.key} className="overflow-hidden rounded-2xl border border-[#e1d8c6] bg-white shadow-sm">
                          <div className="relative">
                            <img src={photo.url} alt={photo.name} className="h-28 w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removePhotoAtIndex(index)}
                              className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white transition hover:bg-black"
                              aria-label={`Remove ${photo.name}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <figcaption className="truncate px-3 py-2 text-xs text-[#6f6a60]">{photo.name}</figcaption>
                        </figure>
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>

              <section
                ref={(node) => {
                  sectionRefs.current.amenities = node;
                }}
                id="amenities"
                className="scroll-mt-8 border-b border-[#e3dccd] bg-[#f7f2e8] px-4 py-16 sm:px-8 lg:px-10"
              >
                <StepHeading label="Step 4" title="Amenities & features" description="Only select what is genuinely included. Accurate amenities improve your trust score and protect you from disputes." />

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {amenities.map((amenity) => (
                    <label
                      key={amenity}
                      className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-[#d9d1c3] bg-white px-4 py-3 transition hover:border-[#1f5a48]/40"
                    >
                      <input type="checkbox" name="amenities" value={amenity} className="peer sr-only" onChange={() => clearError("amenities")} />
                      <span className="flex h-5 w-5 items-center justify-center rounded-md border border-[#d0c8ba] bg-[#fbfaf6] text-white transition peer-checked:border-[#1f5a48] peer-checked:bg-[#1f5a48]">
                        <Check className="h-3.5 w-3.5 opacity-0 transition peer-checked:opacity-100" />
                      </span>
                      <span className="text-sm font-medium text-[#50605a] transition group-hover:text-[#1f5a48]">{amenity}</span>
                    </label>
                  ))}
                </div>

                {errors.amenities ? <p className="mt-4 text-sm text-[#dc2626]">{errors.amenities}</p> : null}
              </section>

              <section
                ref={(node) => {
                  sectionRefs.current.publish = node;
                }}
                id="publish"
                className="scroll-mt-8 bg-[#1f5a48] px-4 py-12 text-white sm:px-8 lg:px-10 rounded-lg"
              >
                <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center" >
                  <div>
                    <div className="text-[13px] font-semibold uppercase tracking-[0.28em] text-[#8ed4bd]">Step 5</div>
                    <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.03em]">Ready to reach students?</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#d4ebe3]">Save as draft now · Activate with payment to go live for 30 days.</p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#f2e7d8] px-6 text-sm font-semibold text-[#1f5a48] transition hover:bg-[#e8dcc7] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? "Validating..." : "Publish listing"}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {errors.submit ? <p className="mt-4 text-sm text-[#ffd0d0]">{errors.submit}</p> : null}
              </section>
            </form>
          </div>

          {isPaymentModalOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <button type="button" aria-label="Close payment modal" className="absolute inset-0 bg-[#0d1f17]/55" onClick={closePaymentModal} />
              <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-[#c9d8d1] bg-white shadow-2xl">
                <div className="flex items-center justify-between bg-[#1f5a48] px-5 py-4 text-white">
                  <div>
                    <h2 className="text-lg font-bold">Confirm Listing Payment</h2>
                    <p className="text-xs text-[#d7efe6]">Pay KES 1 to publish this listing</p>
                  </div>
                  <button type="button" onClick={closePaymentModal} disabled={isInitiatingPayment || isCheckingPayment || isPublishingAfterPayment} className="rounded-full p-1.5 text-[#e3f7ef] transition hover:bg-white/10 disabled:opacity-60">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-4 px-5 py-5">
                  <div className="space-y-1">
                    <label htmlFor="mpesaPhone" className="text-sm font-semibold text-[#111827]">
                      M-Pesa Phone Number
                    </label>
                    <input
                      id="mpesaPhone"
                      type="tel"
                      placeholder="2547XXXXXXXX"
                      value={paymentPhone}
                      onChange={(event) => setPaymentPhone(event.target.value)}
                      disabled={isInitiatingPayment || isCheckingPayment || isPublishingAfterPayment}
                      className="h-11 w-full rounded-2xl border border-[#d6d8de] bg-[#f7f8fa] px-3 text-sm text-[#111827] placeholder:text-[#7a8091] focus:border-[#2b6a56] focus:bg-white focus:outline-none disabled:opacity-70"
                    />
                    <p className="text-xs text-[#6b7280]">Use format `2547XXXXXXXX` (example: 254795109135).</p>
                  </div>
                  {paymentStatusText ? <p className="rounded-2xl border border-[#d3e5e0] bg-[#f4faf8] px-3 py-2 text-sm text-[#184f43]">{paymentStatusText}</p> : null}
                  {paymentError ? <p className="rounded-2xl border border-[#f3c7c7] bg-[#fff5f5] px-3 py-2 text-sm text-[#b42318]">{paymentError}</p> : null}
                  <button
                    type="button"
                    onClick={handleListingPayment}
                    disabled={!paymentPhone.trim() || isInitiatingPayment || isCheckingPayment || isPublishingAfterPayment}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#f39a2a] text-sm font-semibold text-white transition hover:bg-[#e78d1d] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isInitiatingPayment || isCheckingPayment || isPublishingAfterPayment ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isPublishingAfterPayment ? "Publishing listing..." : "Processing payment..."}
                      </>
                    ) : (
                      "Pay & Publish Listing"
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function StepHeading({ label, title, description }: { label: string; title: string; description: string }) {
  return (
    <div className="mb-8 max-w-3xl">
      <div className="flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.28em] text-[#ca7b27]">
        <span>{label}</span>
        <span className="h-px w-12 bg-[#d7b88b]" />
      </div>
      <h2 className="mt-3 text-[34px] font-semibold tracking-[-0.04em] text-[#2a2a24] sm:text-[38px]">{title}</h2>
      <p className="mt-2 text-[15px] leading-7 text-[#79756a]">{description}</p>
    </div>
  );
}

function Field({
  label,
  helper,
  required,
  error,
  control,
}: {
  label: string;
  helper?: string;
  required?: boolean;
  error?: string;
  id?: string;
  control: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#2f5c4e]">
          {label} {required ? <span className="text-[#ca7b27]">*</span> : null}
          {helper ? <span className="ml-2 font-normal normal-case tracking-normal text-[#7d786e]">{helper}</span> : null}
        </div>
        {error ? <p className="text-xs text-[#dc2626]">{error}</p> : null}
      </div>
      {control}
    </div>
  );
}

function CampusCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-[#d9d1c3] bg-white px-5 py-8 text-center shadow-[0_1px_0_rgba(17,24,39,0.03)]">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#eef4ef] text-[#1f5a48]">
        <GraduationCap className="h-5 w-5" />
      </div>
      <div className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#356157]">{label}</div>
      <div className="mt-3 text-[54px] leading-none font-medium text-[#2d3d37]">{value}</div>
      <div className="mt-2 border-t border-[#e9e2d6] pt-3 text-sm text-[#7a766d]">minutes on foot</div>
    </div>
  );
}
