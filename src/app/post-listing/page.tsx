"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import {useUser} from "@clerk/nextjs";
import {useRouter} from "next/navigation";
import { getListingPaymentStatus, initiateListingStkPush } from "../actions/mpesa-actions";
const amenities = [
  "High Speed WiFi",
  "24/7 Water/Borehole",
  "Tokens/Prepaid",
  "CCTV/Guard",
  "Instant Hot Shower",
  "Balcony",
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

function toNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getInputClassName(hasError: boolean) {
  return `h-12 w-full rounded-lg border bg-[#f1f2f5] px-3 text-sm text-gray-900 placeholder:text-[#7a8091] focus:bg-white focus:outline-none ${
    hasError ? "border-[#dc2626] focus:border-[#dc2626]" : "border-transparent focus:border-[#2b6a56]"
  }`;
}

function getTextareaClassName(hasError: boolean) {
  return `w-full resize-none rounded-lg border bg-[#f1f2f5] px-3 py-3 text-sm text-gray-900 placeholder:text-[#7a8091] focus:bg-white focus:outline-none ${
    hasError ? "border-[#dc2626] focus:border-[#dc2626]" : "border-transparent focus:border-[#2b6a56]"
  }`;
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

export default function PostListingPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPhotoCount, setSelectedPhotoCount] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentPhone, setPaymentPhone] = useState("");
  const [paymentStatusText, setPaymentStatusText] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [isPublishingAfterPayment, setIsPublishingAfterPayment] = useState(false);
  const router = useRouter();
  const {user,isLoaded} = useUser();
  useEffect(() => {
    if(!isLoaded) return;
    if (isLoaded && !user) {
        router.push("/sign-in");

     }
  const role = user?.publicMetadata.role;
  if (role !== "landlord") {
    router.push("/home");
  }




  }, [isLoaded, user]);

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
        address: String(formData.get("address") ?? "").trim(),
        mainWalkingMin: toNumber(formData.get("mainWalkingMin")),
        chiromoWalkingMin: toNumber(formData.get("chiromoWalkingMin")),
        parklandsWalkingMin: toNumber(formData.get("parklandsWalkingMin")),
        amenities: formData.getAll("amenities").filter((entry): entry is string => typeof entry === "string"),
        bedroomType:
          typeof selectedBedroomType === "string" && selectedBedroomType.length > 0
            ? (selectedBedroomType as BedroomType)
            : null,
        photos,
      };

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
    <main className="min-h-screen bg-[#f3f3f5] px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <header className="bg-[#2b6a56] px-5 py-5 sm:px-6">
          <h1 className="text-[34px] font-bold text-white">Post a New Property</h1>
          <p className="mt-1 text-sm text-[#d7efe6]">Fill in the details for your student rental near UoN</p>
        </header>

        <form className="space-y-5 px-5 py-6 sm:px-6" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="title" className="text-[15px] font-semibold text-[#111827]">
                Title:
              </label>
              {errors.title && <p className="text-xs text-[#dc2626]">{errors.title}</p>}
            </div>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="Enter property title"
              required
              onChange={() => clearError("title")}
              className={getInputClassName(Boolean(errors.title))}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="description" className="text-[15px] font-semibold text-[#111827]">
                Description:
              </label>
              {errors.description && <p className="text-xs text-[#dc2626]">{errors.description}</p>}
            </div>
            <textarea
              id="description"
              name="description"
              placeholder="Describe your property"
              rows={5}
              required
              onChange={() => clearError("description")}
              className={getTextareaClassName(Boolean(errors.description))}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="price" className="text-[15px] font-semibold text-[#111827]">
                Price:
              </label>
              {errors.price && <p className="text-xs text-[#dc2626]">{errors.price}</p>}
            </div>
            <input
              id="price"
              name="price"
              type="number"
              min="0"
              placeholder="Enter price (KES)"
              required
              onChange={() => clearError("price")}
              className={getInputClassName(Boolean(errors.price))}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="address" className="text-[15px] font-semibold text-[#111827]">
                Address:
              </label>
              {errors.address && <p className="text-xs text-[#dc2626]">{errors.address}</p>}
            </div>
            <input
              id="address"
              name="address"
              type="text"
              placeholder="Enter property address"
              required
              onChange={() => clearError("address")}
              className={getInputClassName(Boolean(errors.address))}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="mainWalkingMin" className="text-[15px] font-semibold text-[#111827]">
                  Main walking min:
                </label>
                {errors.mainWalkingMin && <p className="text-xs text-[#dc2626]">{errors.mainWalkingMin}</p>}
              </div>
              <input
                id="mainWalkingMin"
                name="mainWalkingMin"
                type="number"
                min="0"
                defaultValue={0}
                onChange={() => clearError("mainWalkingMin")}
                className={getInputClassName(Boolean(errors.mainWalkingMin))}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="chiromoWalkingMin" className="text-[15px] font-semibold text-[#111827]">
                  Chiromo walking min:
                </label>
                {errors.chiromoWalkingMin && <p className="text-xs text-[#dc2626]">{errors.chiromoWalkingMin}</p>}
              </div>
              <input
                id="chiromoWalkingMin"
                name="chiromoWalkingMin"
                type="number"
                min="0"
                defaultValue={0}
                onChange={() => clearError("chiromoWalkingMin")}
                className={getInputClassName(Boolean(errors.chiromoWalkingMin))}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="parklandsWalkingMin" className="text-[15px] font-semibold text-[#111827]">
                  Parklands walking min:
                </label>
                {errors.parklandsWalkingMin && <p className="text-xs text-[#dc2626]">{errors.parklandsWalkingMin}</p>}
              </div>
              <input
                id="parklandsWalkingMin"
                name="parklandsWalkingMin"
                type="number"
                min="0"
                defaultValue={0}
                onChange={() => clearError("parklandsWalkingMin")}
                className={getInputClassName(Boolean(errors.parklandsWalkingMin))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="photos" className="text-[15px] font-semibold text-[#111827]">
                Select Property Photos:
              </label>
              {errors.photos && <p className="text-xs text-[#dc2626]">{errors.photos}</p>}
            </div>

            <label
              htmlFor="photos"
              className={`flex h-20 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed bg-[#f7f7f9] text-base text-[#646c7f] ${
                errors.photos ? "border-[#dc2626]" : "border-[#cfd2d8]"
              }`}
            >
              <Upload className="h-5 w-5" />
              <span>Choose Files</span>
            </label>

            <input
              id="photos"
              name="photos"
              type="file"
              multiple
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                setSelectedPhotoCount(event.target.files?.length ?? 0);
                clearError("photos");
              }}
            />
            {selectedPhotoCount > 0 && <p className="text-xs text-[#646c7f]">{selectedPhotoCount} photo(s) selected</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[15px] font-semibold text-[#111827]">Select Amenities:</p>
              {errors.amenities && <p className="text-xs text-[#dc2626]">{errors.amenities}</p>}
            </div>
            <div className="grid grid-cols-1 gap-x-12 gap-y-2 sm:grid-cols-2">
              {amenities.map((amenity) => (
                <label key={amenity} className="flex items-center gap-2 text-[19px] text-[#111827]">
                  <input
                    type="checkbox"
                    name="amenities"
                    value={amenity}
                    className="h-4 w-4 rounded"
                    onChange={() => clearError("amenities")}
                  />
                  <span>{amenity}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="bedroomType" className="text-[15px] font-semibold text-[#111827]">
                Bedroom Type:
              </label>
              {errors.bedroomType && <p className="text-xs text-[#dc2626]">{errors.bedroomType}</p>}
            </div>
            <select
              id="bedroomType"
              name="bedroomType"
              defaultValue=""
              required
              onChange={() => clearError("bedroomType")}
              className={`h-12 w-full rounded-lg border bg-[#f1f2f5] px-3 text-sm text-[#6c7282] focus:bg-white focus:outline-none ${
                errors.bedroomType ? "border-[#dc2626] focus:border-[#dc2626]" : "border-transparent focus:border-[#2b6a56]"
              }`}
            >
              <option value="" disabled>
                Select bedroom type
              </option>
              <option value="BEDSITTER">Bedsitter</option>
              <option value="ONE_BEDROOM">1 Bedroom</option>
              <option value="TWO_BEDROOM">2 Bedroom</option>
              <option value="THREE_BEDROOM">3 Bedroom</option>
            </select>
          </div>

          {errors.submit && <p className="text-sm text-[#dc2626]">{errors.submit}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full rounded-lg bg-[#fb8a3c] text-base font-semibold text-white transition hover:bg-[#f07a2f]"
          >
            {isSubmitting ? "Validating..." : "Create Listing"}
          </button>
        </form>
      </section>

      {isPaymentModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close payment modal"
            className="absolute inset-0 bg-[#0d1f17]/55"
            onClick={closePaymentModal}
          />

          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-[#c9d8d1] bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#2b6a56] px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-white">Confirm Listing Payment</h2>
                <p className="text-xs text-[#d7efe6]">Pay KES 1 to publish this listing</p>
              </div>
              <button
                type="button"
                onClick={closePaymentModal}
                disabled={isInitiatingPayment || isCheckingPayment || isPublishingAfterPayment}
                className="rounded-full p-1.5 text-[#e3f7ef] transition hover:bg-[#255847] disabled:opacity-60"
              >
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
                  className="h-11 w-full rounded-lg border border-[#d6d8de] bg-[#f7f8fa] px-3 text-sm text-[#111827] placeholder:text-[#7a8091] focus:border-[#2b6a56] focus:bg-white focus:outline-none disabled:opacity-70"
                />
                <p className="text-xs text-[#6b7280]">Use format `2547XXXXXXXX` (example: 254795109135).</p>
              </div>

              {paymentStatusText ? (
                <p className="rounded-lg border border-[#d3e5e0] bg-[#f4faf8] px-3 py-2 text-sm text-[#184f43]">{paymentStatusText}</p>
              ) : null}

              {paymentError ? (
                <p className="rounded-lg border border-[#f3c7c7] bg-[#fff5f5] px-3 py-2 text-sm text-[#b42318]">{paymentError}</p>
              ) : null}

              <button
                type="button"
                onClick={handleListingPayment}
                disabled={!paymentPhone.trim() || isInitiatingPayment || isCheckingPayment || isPublishingAfterPayment}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#fb8a3c] text-sm font-semibold text-white transition hover:bg-[#f07a2f] disabled:cursor-not-allowed disabled:opacity-60"
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
    </main>
  );
}
