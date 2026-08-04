import Image from "next/image";
import { Icon } from "@/components/ui/Icon";

/**
 * "About" view of the guide: a static profile card with bio and contact
 * links. Self-contained — it takes no props and holds no state.
 */
export function AboutView() {
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="flex min-h-full items-start justify-center px-4 pt-6 pb-32 md:py-12" dir="rtl">
        <div className="w-full max-w-2xl">
          {/* Profile card */}
          <div className="rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-slate-200/60 dark:border-zinc-700/60 shadow-2xl p-5 md:p-8 mb-6" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
            {/* Avatar + name */}
            <div className="flex flex-col items-center gap-4 mb-8">
              {/* Profile photo — replace /images/profile.avif with the uploaded filename */}
              <div className="relative w-24 h-24 rounded-full overflow-hidden shadow-lg bg-slate-200 dark:bg-slate-700">
                <Image
                  src="/images/profile.avif"
                  alt="יהלי עוז"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="text-center">
                {/* h2, not h1 — the page's h1 is the sr-only site heading in app/page.tsx */}
                <h2 className="text-2xl font-bold text-foreground mb-1">
                  יהלי עוז
                </h2>
              </div>
            </div>

            {/* Bio */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                קצת עליי
              </h2>
              <p className="text-base leading-relaxed text-[#334155] dark:text-slate-300">
                היי, אני יהלי. Ca-Fe נולדה מתוך חוסר — לא היה מקום אחד שמאגד את בתי הקפה הספשלטי בישראל, אז בניתי אחד. תהנו מהאתר, ו-Stay caffeinated ☕
              </p>
            </div>

            {/* Divider */}
            <hr className="border-slate-200/60 dark:border-zinc-700/60 mb-8" />

            {/* Contact */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">
                צור קשר
              </h2>
              <div className="flex flex-col gap-3">
                {/* Instagram */}
                <a
                  href="https://instagram.com/whoisyali"
                  target="_blank"
                  rel="noopener noreferrer"
                  dir="rtl"
                  className="flex items-center gap-3 rounded-2xl border border-slate-200/60 dark:border-zinc-700/60 bg-white/60 dark:bg-zinc-800/60 px-5 py-3.5 text-sm font-medium text-foreground hover:bg-slate-50 dark:hover:bg-zinc-700/60 transition-all duration-200 hover:shadow-md group"
                >
                  <Icon name="Instagram" className="h-5 w-5 text-pink-500 group-hover:scale-110 transition-transform shrink-0" />
                  <span>@whoisyali באינסטגרם</span>
                </a>

                {/* Facebook */}
                <a
                  href="https://www.facebook.com/yali.oz"
                  target="_blank"
                  rel="noopener noreferrer"
                  dir="rtl"
                  className="flex items-center gap-3 rounded-2xl border border-slate-200/60 dark:border-zinc-700/60 bg-white/60 dark:bg-zinc-800/60 px-5 py-3.5 text-sm font-medium text-foreground hover:bg-slate-50 dark:hover:bg-zinc-700/60 transition-all duration-200 hover:shadow-md group"
                >
                  <svg className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.887v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
                  </svg>
                  <span>yali.oz בפייסבוק</span>
                </a>

                {/* Email */}
                <a
                  href="mailto:yalioz77@gmail.com"
                  dir="rtl"
                  className="flex items-center gap-3 rounded-2xl border border-slate-200/60 dark:border-zinc-700/60 bg-white/60 dark:bg-zinc-800/60 px-5 py-3.5 text-sm font-medium text-foreground hover:bg-slate-50 dark:hover:bg-zinc-700/60 transition-all duration-200 hover:shadow-md group"
                >
                  <Icon name="Globe" className="h-5 w-5 text-blue-500 group-hover:scale-110 transition-transform shrink-0" />
                  <span>yalioz77@gmail.com</span>
                </a>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-[#94A3B8] dark:text-slate-500 pb-4">
            נבנה עם ❤️ וקפה מדויק · Ca-Fe {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
