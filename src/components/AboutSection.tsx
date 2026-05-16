"use client";

import { Instagram, Mail, Globe, Coffee, Heart } from "lucide-react";
import { motion } from "framer-motion";

export function AboutSection() {
  return (
    <div className="w-full px-4 pt-16 pb-10 md:pt-10 md:pb-16 flex justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-xl space-y-8"
        dir="rtl"
      >
        {/* Hero card */}
        <div className="rounded-3xl border border-white/60 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/70 backdrop-blur-xl p-8 shadow-xl text-center space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg">
            <Coffee className="h-10 w-10 text-white" />
          </div>
          <h1
            className="text-2xl font-bold text-[#0C4A6E] dark:text-white"
            style={{ fontFamily: "var(--font-aran), sans-serif" }}
          >
            Ca-Fe
          </h1>
          <p
            className="text-sm leading-relaxed text-[#64748B] dark:text-slate-300"
            style={{ fontFamily: "var(--font-aran), sans-serif" }}
          >
            מדריך הקפה הספיישלטי הכי עדכני בישראל — מקומות שאהבנו, שתינו בהם
            קפה טוב, ורצינו לשתף.
          </p>
        </div>

        {/* About me */}
        <div className="rounded-3xl border border-white/60 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/70 backdrop-blur-xl p-7 shadow-xl space-y-4">
          <h2
            className="text-lg font-semibold text-[#0C4A6E] dark:text-white flex items-center gap-2"
            style={{ fontFamily: "var(--font-aran), sans-serif" }}
          >
            <Heart className="h-4 w-4 text-sky-500" />
            קצת עלי
          </h2>
          <p
            className="text-sm leading-relaxed text-[#64748B] dark:text-slate-300"
            style={{ fontFamily: "var(--font-aran), sans-serif" }}
          >
            היי! אני יעלי, ואני מאמינה שכוס קפה טובה יכולה לשנות את כל היום.
            הפרויקט הזה נולד מתוך אהבה אמיתית לסצנת הקפה הישראלית — ורצון
            לאסוף את כל הגמס-ספוטס במקום אחד נגיש לכולם.
          </p>
          <p
            className="text-sm leading-relaxed text-[#64748B] dark:text-slate-300"
            style={{ fontFamily: "var(--font-aran), sans-serif" }}
          >
            Ca-Fe הוא פרויקט אישי ועצמאי — ללא פרסום בתשלום, ללא ספונסרים.
            כל מקום מופיע כי הוא פשוט טוב.
          </p>
        </div>

        {/* Mission */}
        <div className="rounded-3xl border border-white/60 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/70 backdrop-blur-xl p-7 shadow-xl space-y-4">
          <h2
            className="text-lg font-semibold text-[#0C4A6E] dark:text-white"
            style={{ fontFamily: "var(--font-aran), sans-serif" }}
          >
            המטרה
          </h2>
          <p
            className="text-sm leading-relaxed text-[#64748B] dark:text-slate-300"
            style={{ fontFamily: "var(--font-aran), sans-serif" }}
          >
            לעזור לכם למצוא את בית הקפה הבא שתאהבו — בין אם אתם מחפשים פילטר
            שקט, אספרסו מושלם, מאצ&apos;ה חלבי, או מקום להתחיל בו את הבוקר.
          </p>
        </div>

        {/* Contact */}
        <div className="rounded-3xl border border-white/60 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/70 backdrop-blur-xl p-7 shadow-xl space-y-5">
          <h2
            className="text-lg font-semibold text-[#0C4A6E] dark:text-white"
            style={{ fontFamily: "var(--font-aran), sans-serif" }}
          >
            צור קשר
          </h2>
          <div className="space-y-3">
            <a
              href="https://instagram.com/ca.fe.il"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-700/40 px-4 py-3 text-sm text-[#0C4A6E] dark:text-slate-200 transition-all hover:border-sky-400/60 hover:bg-sky-50/60 dark:hover:bg-sky-900/20"
              style={{ fontFamily: "var(--font-aran), sans-serif" }}
            >
              <Instagram className="h-5 w-5 text-pink-500 shrink-0" />
              <span>@ca.fe.il</span>
            </a>

            <a
              href="mailto:hello@ca-fe.co.il"
              className="flex items-center gap-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-700/40 px-4 py-3 text-sm text-[#0C4A6E] dark:text-slate-200 transition-all hover:border-sky-400/60 hover:bg-sky-50/60 dark:hover:bg-sky-900/20"
              style={{ fontFamily: "var(--font-aran), sans-serif" }}
            >
              <Mail className="h-5 w-5 text-sky-500 shrink-0" />
              <span>hello@ca-fe.co.il</span>
            </a>

            <a
              href="https://ca-fe.co.il"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-700/40 px-4 py-3 text-sm text-[#0C4A6E] dark:text-slate-200 transition-all hover:border-sky-400/60 hover:bg-sky-50/60 dark:hover:bg-sky-900/20"
              style={{ fontFamily: "var(--font-aran), sans-serif" }}
            >
              <Globe className="h-5 w-5 text-emerald-500 shrink-0" />
              <span>ca-fe.co.il</span>
            </a>
          </div>
        </div>

        <p
          className="text-center text-xs text-[#94A3B8] dark:text-slate-500 pb-4"
          style={{ fontFamily: "var(--font-aran), sans-serif" }}
        >
          נבנה באהבה ☕
        </p>
      </motion.div>
    </div>
  );
}
