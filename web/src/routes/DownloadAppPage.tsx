import { useState, useMemo } from "react";
import { Navigate, Link } from "react-router-dom";
import {
  Download,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  Smartphone,
  Sparkles,
  WifiOff,
  Mic,
  GraduationCap,
  Layers,
  ChevronDown,
  ChevronUp,
  Apple
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "../store/authStore";
import { useIsInsideNativeApp } from "../lib/platform";

export const APK_DOWNLOAD_URL =
  "https://github.com/Dileep-kumawat/LifeOS/releases/latest/download/lifeos.apk";
export const GITHUB_RELEASES_URL =
  "https://github.com/Dileep-kumawat/LifeOS/releases";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Why isn't LifeOS on the Google Play Store?",
    answer:
      "We distribute LifeOS directly as an APK to provide it completely free to our community without Google Play publisher fees, restrictive store policies, or third-party tracking. You get the pure, full-featured experience straight from our verified GitHub releases."
  },
  {
    question: "Is it safe to install an APK file directly?",
    answer:
      "Yes, absolutely. Android's open architecture allows users to install apps from developer releases ('sideloading'). LifeOS is 100% open-source, compiled securely via Expo EAS Build, and audited. The 'File might be harmful' warning is a standard generic Android prompt for any app downloaded outside the Play Store."
  },
  {
    question: "Will my data from the web app show up in the mobile app?",
    answer:
      "Yes! Simply sign in with your existing LifeOS account. Your calendar events, habits, financial budgets, notes, study flashcards, and AI chat history synchronize automatically across both platforms."
  },
  {
    question: "How do I receive app updates in the future?",
    answer:
      "LifeOS includes Expo Over-The-Air (OTA) updates. Minor improvements, UI enhancements, and bug fixes download seamlessly in the background when you open the app. For major native upgrades, you can always download the newest APK from this page."
  },
  {
    question: "Can I install this on an iPhone or iPad?",
    answer:
      "Apple's iOS does not support direct APK installation. However, you can use LifeOS as a Progressive Web App (PWA) on iPhone! Open this website in Safari, tap the Share button (the square with an arrow pointing up), and select 'Add to Home Screen'."
  }
];

export function DownloadAppPage() {
  const isInsideNative = useIsInsideNativeApp();

  if (isInsideNative) {
    return <Navigate to="/" replace />;
  }

  const user = useAuthStore((state) => state.user);
  const [copied, setCopied] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Simple client-side platform detection
  const platform = useMemo(() => {
    if (typeof window === "undefined" || !navigator?.userAgent) return "other";
    const ua = navigator.userAgent.toLowerCase();
    if (/android/i.test(ua)) return "android";
    if (/iphone|ipad|ipod/i.test(ua)) return "ios";
    return "desktop";
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(APK_DOWNLOAD_URL);
      setCopied(true);
      toast.success("Download link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy link automatically");
    }
  };

  const toggleFaq = (idx: number) => {
    setExpandedFaq(expandedFaq === idx ? null : idx);
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    APK_DOWNLOAD_URL
  )}&bgcolor=ffffff&color=005db2&margin=8`;

  return (
    <div className="flex-1 w-full bg-[#f6f5f4] text-[#1a1c1c] min-h-screen">
      {/* ─── Hero Section ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#faf9f8] to-[#f6f5f4] border-b border-[#c1c6d5]/70 pt-10 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Top Breadcrumb / Navigation */}
          <div className="flex items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-2 text-xs text-[#717784]">
              <Link
                to={user ? "/" : "/login"}
                className="hover:text-[#005db2] font-medium transition-colors"
              >
                {user ? "← Back to Dashboard" : "← Back to Sign In"}
              </Link>
              <span>/</span>
              <span className="text-[#1a1c1c] font-semibold">Mobile App Download</span>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Latest Release: v1.0.0
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Heading & Download CTA */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#005db2]/10 border border-[#005db2]/20 text-[#005db2] text-xs font-semibold tracking-wide">
                <Smartphone className="size-3.5" />
                <span>LifeOS for Android</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1a1c1c] leading-tight">
                Your entire life operating system in your pocket.
              </h1>

              <p className="text-base sm:text-lg text-[#414753] leading-relaxed max-w-xl">
                Get the native Android experience with local SQLite offline sync, real-time AI
                voice journaling, study flashcards, and the dynamic Floating Sliding Dock.
              </p>

              {/* Platform Detection Tip */}
              {platform === "android" && (
                <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 flex items-start gap-3 text-xs text-blue-900">
                  <Smartphone className="size-4 shrink-0 text-[#005db2] mt-0.5" />
                  <p>
                    <span className="font-bold">Android device detected!</span> Tap the button below
                    to start downloading the standalone APK directly onto your phone.
                  </p>
                </div>
              )}

              {platform === "ios" && (
                <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
                  <Apple className="size-4 shrink-0 text-amber-700 mt-0.5" />
                  <div>
                    <span className="font-bold">iPhone / iPad user?</span> Android APKs cannot run on
                    iOS, but you can install LifeOS as a full PWA! In Safari, tap{" "}
                    <strong>Share → Add to Home Screen</strong>.
                  </div>
                </div>
              )}

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <a
                  href={APK_DOWNLOAD_URL}
                  download="lifeos.apk"
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#005db2] hover:bg-[#00468a] text-white font-bold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 group"
                >
                  <Download className="size-4 transition-transform duration-200 group-hover:translate-y-0.5" />
                  <span>Download APK (Free)</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-white/20 font-medium">
                    v1.0.0
                  </span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white hover:bg-[#e9e8e7] text-[#414753] hover:text-[#005db2] font-semibold text-sm border border-[#c1c6d5] shadow-xs active:scale-[0.98] transition-all duration-150"
                  title="Copy direct download link"
                >
                  <Copy className="size-4" />
                  <span>{copied ? "Link Copied!" : "Copy Link"}</span>
                </button>

                <a
                  href={GITHUB_RELEASES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-xl text-xs font-semibold text-[#717784] hover:text-[#005db2] transition-colors"
                >
                  <span>Releases on GitHub</span>
                  <ExternalLink className="size-3" />
                </a>
              </div>

              {/* Specs Badge Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] text-[#717784]">
                <span className="px-2.5 py-1 rounded-md bg-[#faf9f8] border border-[#c1c6d5]/60 font-medium">
                  File: <strong className="text-[#1a1c1c]">lifeos.apk</strong>
                </span>
                <span className="px-2.5 py-1 rounded-md bg-[#faf9f8] border border-[#c1c6d5]/60 font-medium">
                  Size: <strong className="text-[#1a1c1c]">~45 MB</strong>
                </span>
                <span className="px-2.5 py-1 rounded-md bg-[#faf9f8] border border-[#c1c6d5]/60 font-medium">
                  Requires: <strong className="text-[#1a1c1c]">Android 8.0+</strong>
                </span>
                <span className="px-2.5 py-1 rounded-md bg-[#faf9f8] border border-[#c1c6d5]/60 font-medium">
                  Architecture: <strong className="text-[#1a1c1c]">Universal</strong>
                </span>
              </div>
            </div>

            {/* Right Column: QR Code Card for Desktop Visitors */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm bg-white rounded-2xl p-6 border border-[#c1c6d5]/80 shadow-lg relative overflow-hidden group hover:border-[#005db2]/40 transition-all duration-200">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#005db2]/5 rounded-bl-full pointer-events-none" />

                <div className="flex items-center gap-2 mb-4">
                  <QrCode className="size-5 text-[#005db2]" />
                  <div>
                    <h2 className="text-sm font-bold text-[#1a1c1c]">Scan with your Phone</h2>
                    <p className="text-[11px] text-[#717784]">Point your camera to download</p>
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="p-3 bg-white rounded-xl border border-[#c1c6d5]/60 flex items-center justify-center shadow-inner">
                  <img
                    src={qrCodeUrl}
                    alt="Scan QR code to download LifeOS Android APK"
                    className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-lg"
                    loading="lazy"
                  />
                </div>

                <div className="mt-4 text-center">
                  <p className="text-xs text-[#414753] font-medium">
                    Opens direct APK download in your mobile browser
                  </p>
                  <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
                    <ShieldCheck className="size-3.5" />
                    <span>Verified virus-free build from GitHub</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3-Step Visual Installation Guide ────────────────────────── */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#005db2]">
            Simple Installation
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1a1c1c] tracking-tight">
            How to Install the APK on Android
          </h2>
          <p className="text-xs sm:text-sm text-[#717784]">
            Because LifeOS is distributed directly outside the Google Play Store, Android will ask
            for standard security confirmation. It takes less than 30 seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="bg-white rounded-2xl p-6 border border-[#c1c6d5]/70 shadow-xs hover:shadow-md hover:border-[#005db2]/30 transition-all duration-200 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="size-10 rounded-xl bg-blue-50 text-[#005db2] flex items-center justify-center font-bold text-sm border border-blue-100">
                1
              </div>
              <h3 className="text-base font-bold text-[#1a1c1c]">Download the APK</h3>
              <p className="text-xs text-[#414753] leading-relaxed">
                Tap <strong>Download APK</strong> above. If Chrome or your browser warns:
                <span className="block mt-1.5 p-2 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-mono text-[11px]">
                  &quot;File might be harmful&quot;
                </span>
                Tap <strong>&quot;Download anyway&quot;</strong>. This is a standard warning for all
                APKs outside the Play Store.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#c1c6d5]/40 flex items-center gap-1.5 text-[11px] text-[#717784]">
              <Download className="size-3.5 text-[#005db2]" />
              <span>File saved to your Downloads</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-2xl p-6 border border-[#c1c6d5]/70 shadow-xs hover:shadow-md hover:border-[#005db2]/30 transition-all duration-200 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="size-10 rounded-xl bg-blue-50 text-[#005db2] flex items-center justify-center font-bold text-sm border border-blue-100">
                2
              </div>
              <h3 className="text-base font-bold text-[#1a1c1c]">Allow Unknown Sources</h3>
              <p className="text-xs text-[#414753] leading-relaxed">
                Tap the downloaded file in your notification bar. If Android prompts:
                <span className="block mt-1.5 p-2 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 font-mono text-[11px]">
                  &quot;Install unknown apps&quot;
                </span>
                Tap <strong>Settings</strong>, toggle on{" "}
                <strong>&quot;Allow from this source&quot;</strong>, and tap back.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#c1c6d5]/40 flex items-center gap-1.5 text-[11px] text-[#717784]">
              <ShieldCheck className="size-3.5 text-emerald-600" />
              <span>Standard Android permission</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-2xl p-6 border border-[#c1c6d5]/70 shadow-xs hover:shadow-md hover:border-[#005db2]/30 transition-all duration-200 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="size-10 rounded-xl bg-blue-50 text-[#005db2] flex items-center justify-center font-bold text-sm border border-blue-100">
                3
              </div>
              <h3 className="text-base font-bold text-[#1a1c1c]">Install &amp; Sign In</h3>
              <p className="text-xs text-[#414753] leading-relaxed">
                Tap <strong>Install</strong>. Once complete, launch LifeOS and log in with your
                existing account. All your habits, calendar events, notes, and AI conversations
                will sync instantly.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#c1c6d5]/40 flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold">
              <CheckCircle2 className="size-3.5" />
              <span>Ready for daily productivity</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Mobile Highlights Feature Grid ─────────────────────────── */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-[#c1c6d5]/60">
        <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#005db2]">
            Native Capabilities
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1a1c1c] tracking-tight">
            Built for speed on the go
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-white border border-[#c1c6d5]/60 shadow-2xs hover:-translate-y-0.5 transition-transform duration-150">
            <WifiOff className="size-5 text-[#005db2] mb-3" />
            <h4 className="text-sm font-bold text-[#1a1c1c] mb-1">Offline-First SQLite</h4>
            <p className="text-xs text-[#414753] leading-relaxed">
              Capture thoughts, check in habits, and track expenses with zero internet. Syncs
              cleanly once reconnected.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-[#c1c6d5]/60 shadow-2xs hover:-translate-y-0.5 transition-transform duration-150">
            <Layers className="size-5 text-[#005db2] mb-3" />
            <h4 className="text-sm font-bold text-[#1a1c1c] mb-1">Dynamic Sliding Dock</h4>
            <p className="text-xs text-[#414753] leading-relaxed">
              Instagram-style swipeable activity pager synchronized in real time with physics-based
              dock haptics.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-[#c1c6d5]/60 shadow-2xs hover:-translate-y-0.5 transition-transform duration-150">
            <Mic className="size-5 text-[#005db2] mb-3" />
            <h4 className="text-sm font-bold text-[#1a1c1c] mb-1">Voice Journaling</h4>
            <p className="text-xs text-[#414753] leading-relaxed">
              Speak your mind with real-time waveform audio capture and automatic speech-to-text
              transcription.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-[#c1c6d5]/60 shadow-2xs hover:-translate-y-0.5 transition-transform duration-150">
            <GraduationCap className="size-5 text-[#005db2] mb-3" />
            <h4 className="text-sm font-bold text-[#1a1c1c] mb-1">SM-2 Spaced Study</h4>
            <p className="text-xs text-[#414753] leading-relaxed">
              Review syllabus topics and flashcards with SuperMemo SM-2 spaced repetition during your
              daily commute.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Frequently Asked Questions ──────────────────────────────── */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-[#c1c6d5]/60">
        <div className="text-center mb-8 space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-[#1a1c1c] tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-[#717784]">
            Everything you need to know about the direct APK installation.
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, idx) => {
            const isExpanded = expandedFaq === idx;
            return (
              <div
                key={item.question}
                className="bg-white rounded-xl border border-[#c1c6d5]/70 overflow-hidden transition-all duration-150 shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full py-4 px-5 text-left flex items-center justify-between gap-4 hover:bg-[#faf9f8] transition-colors"
                  aria-expanded={isExpanded}
                >
                  <span className="text-sm font-semibold text-[#1a1c1c]">{item.question}</span>
                  {isExpanded ? (
                    <ChevronUp className="size-4 shrink-0 text-[#005db2]" />
                  ) : (
                    <ChevronDown className="size-4 shrink-0 text-[#717784]" />
                  )}
                </button>
                {isExpanded && (
                  <div className="px-5 pb-4 pt-1 text-xs text-[#414753] leading-relaxed border-t border-[#c1c6d5]/40 bg-[#faf9f8]/40">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Bottom Reassurance Footer Banner ────────────────────────── */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto mb-12">
        <div className="bg-[#005db2] text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-lg font-bold flex items-center justify-center sm:justify-start gap-2">
              <Sparkles className="size-5" />
              <span>Ready to upgrade your daily focus?</span>
            </h3>
            <p className="text-xs text-white/80 max-w-md">
              Download the standalone APK now and keep your goals, habits, and tasks synced wherever
              you go.
            </p>
          </div>

          <a
            href={APK_DOWNLOAD_URL}
            download="lifeos.apk"
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-[#005db2] font-bold text-sm hover:bg-[#faf9f8] shadow-xs active:scale-[0.98] transition-all duration-150"
          >
            <Download className="size-4" />
            <span>Download APK Now</span>
          </a>
        </div>
      </section>
    </div>
  );
}
export default DownloadAppPage;
