import { useState } from "react";

interface VariantResult {
  phrases: string[];
  theme: string;
  duration?: number;
  variantName?: string;
}

interface UseVariantGeneratorInput {
  getTopic: () => string;
  applyVariant: (variant: any) => void;
  showToast: (message: string | null) => void;
}

/**
 * 1-Click Multi-Variant Video Generator (A/B testing).
 * Przeniesione 1:1 z VideoStudioModal.tsx (logika bez zmian).
 */
export function useVariantGenerator({ getTopic, applyVariant, showToast }: UseVariantGeneratorInput) {
  const [isGeneratingVariants, setIsGeneratingVariants] = useState<boolean>(false);
  const [multiVariants, setMultiVariants] = useState<VariantResult[]>([]);
  const [showVariantsModal, setShowVariantsModal] = useState<boolean>(false);

  const handleGenerateMultiVariants = async () => {
    setIsGeneratingVariants(true);
    showToast("Generowanie 3 wariantów A/B/C rolki...");
    try {
      const res = await fetch("/api/ai/generate-multi-variant-reels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: getTopic() }),
      });
      const json = await res.json();
      if (Array.isArray(json.variants)) {
        setMultiVariants(json.variants);
        setShowVariantsModal(true);
        showToast("✓ Wygenerowano 3 warianty A/B/C!");
      }
    } catch (e) {
      console.error(e);
      showToast("Błąd generowania wariantów.");
    } finally {
      setIsGeneratingVariants(false);
      setTimeout(() => showToast(null), 2500);
    }
  };

  const handleApplyVariant = (variant: any) => {
    applyVariant(variant);
    setShowVariantsModal(false);
    showToast(`✓ Załadowano ${variant.variantName}`);
    setTimeout(() => showToast(null), 2500);
  };

  return {
    isGeneratingVariants,
    multiVariants,
    showVariantsModal,
    setShowVariantsModal,
    handleGenerateMultiVariants,
    handleApplyVariant,
  };
}
