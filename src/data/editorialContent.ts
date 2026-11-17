export interface GuideSection {
  heading: string;
  paragraphs: string[];
  checklist?: string[];
}

export interface EditorialGuide {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  authorName: string;
  authorRole: string;
  publishedAt: string;
  updatedAt: string;
  readingTimeMinutes: number;
  summary: string;
  keyTakeaways: string[];
  sections: GuideSection[];
}

export interface CuratorFaqItem {
  id: string;
  question: string;
  answer: string;
}

export const CURATOR_PROFILE = {
  brandName: 'APXELUZ',
  curatorName: 'Axeluf',
  curatorTitle: 'Founder & Package Maintainer',
  siteUrl: 'https://apxeluz.my.id',
  headline: 'Curated Android builds without shortlink mazes or mystery mirrors.',
  storyParagraphs: [
    'APXELUZ started as a personal archive for followers of Channel Axeluf who were tired of clicking through five layers of pop-up shortlinks only to end up with a mislabeled, corrupt, or adware-bundled APK.',
    'Before any game mod, port, or Android utility appears in this repository, we inspect its native library architecture (ARM64-v8a or armeabi-v7a), record the deterministic SHA-256 checksum on every build, document exact Android OS requirements, and preserve direct version changelogs so you know what changed before installing.',
  ],
  commitments: [
    {
      title: 'Deterministic SHA-256 Fingerprints',
      detail: 'Every release lists its package signature hash so you can confirm file integrity against tampered re-uploads.',
    },
    {
      title: 'Explicit ABI & Android Version Tags',
      detail: 'ARM64, ARM32, Universal, OBB dependencies, and minimum Android SDK levels are surfaced upfront on every listing.',
    },
    {
      title: 'Direct Releases & Transparent Support',
      detail: 'Community mods remain freely browsable with zero tracker cookies, while intensive HD ports and VIP builds offer clear 30-day or lifetime access.',
    },
  ],
};

export const EDITORIAL_GUIDES: EditorialGuide[] = [
  {
    slug: 'how-we-verify-apk-sha256-and-virustotal',
    title: 'How We Verify Every APK Before Publishing: SHA-256, Signatures, and VirusTotal Triage',
    subtitle: 'Inside the APXELUZ intake checklist used to separate safe community mods from tampered mirror re-uploads.',
    category: 'Security & Verification',
    authorName: 'Axeluf',
    authorRole: 'Founder & Package Maintainer',
    publishedAt: '2026-10-14',
    updatedAt: '2026-11-12',
    readingTimeMinutes: 5,
    summary:
      'Learn how to verify an Android APK checksum with SHA-256, inspect modified signing certificates without panic, and distinguish benign mod-menu heuristics from genuine malware flags on VirusTotal.',
    keyTakeaways: [
      'Always compare the downloaded APK SHA-256 digest against the checksum displayed in the package detail sheet before tapping Install.',
      'Re-signed community mods naturally fail original Play Store signature checks; verify consistent maintainer test keys and permission diffs instead.',
      'Flag builds that silently request READ_SMS, BIND_ACCESSIBILITY_SERVICE, or QUERY_ALL_PACKAGES when the base game has no need for them.',
    ],
    sections: [
      {
        heading: 'Why Checksums Matter More Than Mirror Reputation',
        paragraphs: [
          'A clean upload link can still be re-hosted or injected downstream if a third-party file mirror modifies the APK wrapper. Calculating a cryptographic SHA-256 hash guarantees byte-for-byte identity between the binary audited by our maintainer and the file sitting in your device Downloads folder.',
          'On Android, you can verify any downloaded package locally inside MT Manager or Termux using sha256sum before running the Android package installer.',
        ],
        checklist: [
          'Open the APXELUZ item detail sheet and copy the listed SHA-256 digest.',
          'Inspect the downloaded .apk file properties in MT Manager or run sha256sum in terminal.',
          'Abort installation immediately if even a single hexadecimal character differs.',
        ],
      },
      {
        heading: 'Reading VirusTotal Results on Re-Signed Mod Menus',
        paragraphs: [
          'Modified Android binaries cannot retain the original developer Google Play signature once smali bytecode or libil2cpp.so libraries are patched. Generic heuristic engines often label test-key re-signing or Frida/overlay hooks as "PUA" or "Android.RiskTool" even when zero malicious payload exists.',
          'During APXELUZ curation, we inspect AndroidManifest.xml permission additions, outbound network endpoints added inside dex classes, and native .so imports rather than blindly trusting single-vendor heuristic labels.',
        ],
      },
    ],
  },
  {
    slug: 'arm64-v8a-vs-armeabi-v7a-android-compatibility',
    title: 'ARM64-v8a vs armeabi-v7a vs Universal APKs: Fixing "App Not Installed" on Android 12–15',
    subtitle: 'Understanding native ABI matching, 64-bit-only SoC chips, and signature conflicts.',
    category: 'Compatibility Guide',
    authorName: 'Axeluf',
    authorRole: 'Founder & Package Maintainer',
    publishedAt: '2026-10-22',
    updatedAt: '2026-11-10',
    readingTimeMinutes: 4,
    summary:
      'Modern Android phones increasingly drop 32-bit armeabi-v7a execution. Here is how to match APXELUZ architecture tags to your chipset and resolve signature mismatch errors cleanly.',
    keyTakeaways: [
      'Flagship Snapdragon 8 Gen 2/3/Elite and newer Dimensity chips enforce 64-bit-only (arm64-v8a) execution on recent Android builds.',
      'Android refuses to overwrite an existing app if the signing certificate differs—back up data and uninstall the Play Store build first.',
      'Universal builds bundle both native library folders inside lib/, trading larger APK size for broader device compatibility.',
    ],
    sections: [
      {
        heading: 'Matching Package Architecture to Your Chipset',
        paragraphs: [
          'Inside every native Android game APK sits a lib/ directory containing compiled C/C++ shared objects (.so files). Modern mod menus hook directly into lib/arm64-v8a/libil2cpp.so or lib/armeabi-v7a/libUE4.so, which means a mod built exclusively for 32-bit ARM32 will not launch on a 64-bit-only phone.',
          'Every card in APXELUZ labels its target architecture clearly—ARM64, ARM32, or Universal—so you never waste bandwidth downloading an incompatible package.',
        ],
        checklist: [
          'Check whether your device supports 32-bit apps (most Android 14+ flagships only run ARM64).',
          'Uninstall any existing retail installation of the same package name before installing a modified APK.',
          'Ensure at least 2x the package file size is free in internal storage for Android dexopt extraction.',
        ],
      },
    ],
  },
  {
    slug: 'installing-obb-and-split-apks-android-14',
    title: 'Installing Split APKs (.apks/.xapk) and OBB Data Folders Safely on Modern Android',
    subtitle: 'Navigating Scoped Storage restrictions on Android 11–15 without corrupting existing saves.',
    category: 'Installation Walkthrough',
    authorName: 'Axeluf',
    authorRole: 'Founder & Package Maintainer',
    publishedAt: '2026-11-01',
    updatedAt: '2026-11-14',
    readingTimeMinutes: 6,
    summary:
      'A practical step-by-step reference for placing external OBB archives under /Android/obb/ and deploying multi-split APKS bundles under modern Android Scoped Storage rules.',
    keyTakeaways: [
      'Move or extract the com.package.name folder into /Android/obb/ before launching the patched APK for the first time.',
      'Use Shizuku-enabled file managers like MT Manager when standard file pickers block write access to Android/data or Android/obb.',
      'Split APK archives (.apks/.xapk) require an installer that merges base.apk with split_config.arm64_v8a.apk.',
    ],
    sections: [
      {
        heading: 'Correct OBB Directory Hierarchy',
        paragraphs: [
          'Large ports and HD remasters separate multi-gigabyte textures and audio streams into an .obb expansion file. Placing the .obb file directly inside /Android/obb/ fails because Android looks inside a subdirectory matching the exact package identifier (for example, /Android/obb/com.example.game/main.100.com.example.game.obb).',
        ],
        checklist: [
          'Install the main APK first, but do NOT press Open yet.',
          'Extract the companion archive so the folder inside /Android/obb/ matches the package name exactly.',
          'Grant Storage / Media permissions if prompted on first launch so the engine mounts the OBB asset pack.',
        ],
      },
    ],
  },
  {
    slug: 'unity-il2cpp-60fps-mod-architecture-notes',
    title: 'Release Engineering Notes: Unlocking 60/120FPS & Frame Pacing in Unity IL2CPP Ports',
    subtitle: 'How community porters tune Application.targetFrameRate, shader caches, and touch overlays.',
    category: 'Engineering Notes',
    authorName: 'Axeluf',
    authorRole: 'Founder & Package Maintainer',
    publishedAt: '2026-11-06',
    updatedAt: '2026-11-15',
    readingTimeMinutes: 5,
    summary:
      'Technical notes on why mobile ports ship locked at 30FPS, how IL2CPP frame-cap patches adjust vsync intervals, and what thermal trade-offs players should expect on 120Hz displays.',
    keyTakeaways: [
      'Many mobile ports hardcode QualitySettings.vSyncCount = 2, capping 60Hz and 120Hz screens to 30FPS regardless of GPU headroom.',
      'Patching targetFrameRate without matching physics fixedDeltaTime can introduce animation jitter in combat engines.',
      'Every high-framerate build listed in APXELUZ documents tested chipset thermals and controller mapping support.',
    ],
    sections: [
      {
        heading: 'Balancing Refresh Rate Unlock With Thermal Throttling',
        paragraphs: [
          'Unlocking 120FPS on mid-range SoCs often produces brief peak smoothness followed by heavy thermal throttling after ten minutes of play. In our curated Definitive and Voidheart builds, we keep graphics presets configurable so players can choose steady 60FPS frame pacing over unstable unlocked peaks.',
        ],
      },
    ],
  },
];

export const CURATOR_FAQS: CuratorFaqItem[] = [
  {
    id: 'faq-sha256',
    question: 'How does APXELUZ verify that uploaded APKs and mods are safe?',
    answer:
      'Before publication, every package goes through manual manifest and native library inspection, receives a deterministic SHA-256 fingerprint, and undergoes VirusTotal multi-engine screening. Builds with suspicious permission escalations are rejected.',
  },
  {
    id: 'faq-arm64',
    question: 'Why does "App not installed" happen on newer Android phones?',
    answer:
      'The two most common causes are a signing certificate conflict with an existing Play Store version (which requires uninstalling the original copy first) or trying to install a 32-bit ARM32 package on a 64-bit-only ARM64 chipset.',
  },
  {
    id: 'faq-obb',
    question: 'Where should I extract OBB companion files before opening a game?',
    answer:
      'Place the folder named after the package ID directly inside Internal Storage / Android / obb / before launching the game for the first time. Tools like MT Manager with Shizuku make Android 13–15 Scoped Storage access straightforward.',
  },
  {
    id: 'faq-premium',
    question: 'What is included in APXELUZ Premium 30-Day and Lifetime builds?',
    answer:
      'Premium listings cover large HD remasters, custom controller-mapped ports, and VIP community mod menus with direct official payment links that immediately bundle the full game archive and future patch updates according to the selected duration.',
  },
];
