"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, ValidationError } from "@formspree/react";
import { X, CheckCircle } from "lucide-react";
import { useMode } from "@/contexts/ModeContext";
import { getModeColors } from "@/lib/theme-utils";
import { LiquidButton } from "@/components/ui/liquid-glass-button";

interface SuggestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FORM_ID = "xeoyznby";

export function SuggestModal({ isOpen, onClose }: SuggestModalProps) {
  const { appMode } = useMode();
  const colors = getModeColors(appMode);
  const [state, handleSubmit] = useForm(FORM_ID);

  const handleClose = () => {
    if (!state.submitting) {
      onClose();
    }
  };

  // Close modal when Escape key is pressed
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !state.submitting) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, state.submitting, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[10000] bg-black/30 backdrop-blur-md"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4 pointer-events-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`relative w-full max-w-md max-h-[90vh] overflow-y-auto glass-card rounded-2xl md:rounded-3xl shadow-2xl pointer-events-auto ${
                appMode === "matcha"
                  ? "border-emerald-200 dark:border-emerald-800"
                  : "border-[#BAE6FD] dark:border-blue-800"
              }`}
              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
            >
              {/* Close Button */}
              <button
                onClick={handleClose}
                disabled={state.submitting}
                className={`absolute top-4 left-4 z-10 rounded-full p-2 transition-all ${
                  state.submitting
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-white/50 dark:hover:bg-slate-800/50"
                }`}
              >
                <X
                  className={`h-5 w-5 ${
                    appMode === "matcha"
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-[#075985] dark:text-blue-300"
                  }`}
                />
              </button>

              <div className="p-6 md:p-8">
                {/* Success State */}
                {state.succeeded ? (
                  <div className="text-center py-8">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                      className={`mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full ${
                        appMode === "matcha"
                          ? "bg-emerald-100 dark:bg-emerald-900/30"
                          : "bg-[#DBEAFE] dark:bg-blue-900/30"
                      }`}
                    >
                      <CheckCircle
                        className={`h-8 w-8 ${
                          appMode === "matcha"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-[#38BDF8] dark:text-blue-400"
                        }`}
                      />
                    </motion.div>
                    <h2
                      className={`text-2xl font-bold mb-2 ${colors.primary.textLight}`}
                    >
                      תודה!
                    </h2>
                    <p
                      className={`text-sm md:text-base mb-6 ${
                        appMode === "matcha"
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-[#075985] dark:text-blue-300"
                      }`}
                    >
                      ההצעה שלך נשלחה בהצלחה. נבדוק אותה ונוסיף את המקום אם הוא מתאים.
                    </p>
                    <LiquidButton
                      onClick={handleClose}
                      className={`w-full bg-gradient-to-r ${colors.primary.gradient} ${colors.primary.gradientDark} text-white shadow-lg ${colors.primary.shadow} transition-all hover:shadow-xl ${colors.primary.hoverShadow} hover:scale-[1.02]`}
                    >
                      סגור
                    </LiquidButton>
                  </div>
                ) : (
                  <>
                    {/* Header */}
                    <div className="text-center mb-6">
                      <h2
                        className={`text-2xl md:text-3xl font-bold mb-2 ${colors.primary.textLight}`}
                      >
                        הצע מקום
                      </h2>
                      <p
                        className={`text-sm md:text-base ${
                          appMode === "matcha"
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-[#075985] dark:text-blue-300"
                        }`}
                      >
                        יש לך מקום חדש להמליץ? נשמח לשמוע!
                      </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
                      {/* Place Name */}
                      <div>
                        <label
                          htmlFor="place-name"
                          className={`block text-sm font-medium mb-2 ${colors.primary.text}`}
                        >
                          שם המקום <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="place-name"
                          type="text"
                          name="place-name"
                          required
                          disabled={state.submitting}
                          className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-all outline-none glass-input ${
                            appMode === "matcha"
                              ? "border-emerald-200 dark:border-emerald-800 focus:border-emerald-400 dark:focus:border-emerald-500"
                              : "border-[#BAE6FD] dark:border-blue-800 focus:border-[#38BDF8] dark:focus:border-blue-400"
                          } ${
                            state.submitting
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                          placeholder="לדוגמה: קפה נחת"
                        />
                        <ValidationError
                          prefix="Place Name"
                          field="place-name"
                          errors={state.errors}
                          className={`text-xs mt-1 block ${
                            appMode === "matcha"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-[#0284C7] dark:text-blue-400"
                          }`}
                        />
                      </div>

                      {/* City */}
                      <div>
                        <label
                          htmlFor="city"
                          className={`block text-sm font-medium mb-2 ${colors.primary.text}`}
                        >
                          עיר <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="city"
                          type="text"
                          name="city"
                          required
                          disabled={state.submitting}
                          className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-all outline-none glass-input ${
                            appMode === "matcha"
                              ? "border-emerald-200 dark:border-emerald-800 focus:border-emerald-400 dark:focus:border-emerald-500"
                              : "border-[#BAE6FD] dark:border-blue-800 focus:border-[#38BDF8] dark:focus:border-blue-400"
                          } ${
                            state.submitting
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                          placeholder="לדוגמה: תל אביב"
                        />
                        <ValidationError
                          prefix="City"
                          field="city"
                          errors={state.errors}
                          className={`text-xs mt-1 block ${
                            appMode === "matcha"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-[#0284C7] dark:text-blue-400"
                          }`}
                        />
                      </div>

                      {/* Instagram/Website */}
                      <div>
                        <label
                          htmlFor="instagram-website"
                          className={`block text-sm font-medium mb-2 ${colors.primary.text}`}
                        >
                          אינסטגרם/אתר
                        </label>
                        <input
                          id="instagram-website"
                          type="text"
                          name="instagram-website"
                          disabled={state.submitting}
                          className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-all outline-none glass-input ${
                            appMode === "matcha"
                              ? "border-emerald-200 dark:border-emerald-800 focus:border-emerald-400 dark:focus:border-emerald-500"
                              : "border-[#BAE6FD] dark:border-blue-800 focus:border-[#38BDF8] dark:focus:border-blue-400"
                          } ${
                            state.submitting
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                          placeholder="@instagram או https://..."
                        />
                        <ValidationError
                          prefix="Instagram/Website"
                          field="instagram-website"
                          errors={state.errors}
                          className={`text-xs mt-1 block ${
                            appMode === "matcha"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-[#0284C7] dark:text-blue-400"
                          }`}
                        />
                      </div>

                      {/* Why Add */}
                      <div>
                        <label
                          htmlFor="why-add"
                          className={`block text-sm font-medium mb-2 ${colors.primary.text}`}
                        >
                          למה כדאי להוסיף אותו?{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="why-add"
                          name="why-add"
                          required
                          rows={4}
                          disabled={state.submitting}
                          className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-all outline-none glass-input resize-none ${
                            appMode === "matcha"
                              ? "border-emerald-200 dark:border-emerald-800 focus:border-emerald-400 dark:focus:border-emerald-500"
                              : "border-[#BAE6FD] dark:border-blue-800 focus:border-[#38BDF8] dark:focus:border-blue-400"
                          } ${
                            state.submitting
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                          placeholder="ספר לנו מה מיוחד במקום הזה..."
                        />
                        <ValidationError
                          prefix="Why Add"
                          field="why-add"
                          errors={state.errors}
                          className={`text-xs mt-1 block ${
                            appMode === "matcha"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-[#0284C7] dark:text-blue-400"
                          }`}
                        />
                      </div>

                      {/* Submit Button */}
                      <div className="pt-2">
                        <LiquidButton
                          type="submit"
                          disabled={state.submitting}
                          className={`w-full bg-gradient-to-r ${colors.primary.gradient} ${colors.primary.gradientDark} text-white shadow-lg ${colors.primary.shadow} transition-all hover:shadow-xl ${colors.primary.hoverShadow} hover:scale-[1.02] ${
                            state.submitting
                              ? "opacity-50 cursor-not-allowed hover:scale-100"
                              : ""
                          }`}
                        >
                          {state.submitting ? "שולח..." : "שלח הצעה"}
                        </LiquidButton>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

