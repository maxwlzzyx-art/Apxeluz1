import { Game, GameCategory, CommunityPortRequest } from '../types/game';

// All default sample categories cleared as requested in requirement 4
export const HOT_CATEGORIES: { id: GameCategory; name: string; icon: string; count: number; color: string }[] = [];

// All sample and demo games/apps cleared as requested in requirement 4
// Keeping the underlying structure intact for future additions or user-uploaded mods
export const GAMES_DATA: Game[] = [];

// Dedicated mod registry for shareable mod URLs (requirement 5)
// Examples: /mod/stardew-falley1, /mod/hollow-knight, /mod/minecraft-mod
export const REGISTERED_MODS: Record<string, Game> = {
  'stardew-falley1': {
    id: 'mod-stardew-falley1',
    slug: 'stardew-falley1',
    type: 'mod',
    title: 'Stardew Valley Expanded Mod',
    version: 'v1.14.24',
    status: 'Unofficial',
    category: 'Simulation',
    tags: ['SMAPI', 'Expanded', 'Farm Mod', 'Content Patcher'],
    coverUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80',
    rating: 4.9,
    ratingCount: 3200,
    downloads: '185K',
    downloadCount: 185000,
    fileSize: '142 MB',
    developer: 'FlashShifter',
    porter: 'Android SMAPI Port Team',
    packageName: 'com.chucklefish.stardewvalley.mod.sve',
    minAndroid: 'Android 8.0+',
    architecture: 'arm64-v8a / armeabi-v7a',
    obbRequired: false,
    updatedDate: 'Oct 28, 2024',
    releaseDate: '2024-04-10',
    description: 'Stardew Valley Expanded is a fan-made expansion for ConcernedApe’s Stardew Valley. This mod adds 27 new NPCs, 50 locations, 260 character events, 27 fish, reimagined vanilla areas, two farm maps, a reimagined world map reflecting all changes, music, and questlines.',
    installationGuide: [
      'Ensure you have Stardew Valley and SMAPI Android installed on your device.',
      'Download the Stardew Valley Expanded zip package.',
      'Extract the folder directly into /storage/emulated/0/StardewValley/Mods/.',
      'Launch Stardew Valley through the SMAPI launcher icon.'
    ],
    features: [
      '27 new NPCs with dialogue and heart events',
      '50 new explorable areas with customized seasonal weather',
      'Fully compatible with Android touch and physical gamepads',
      'Custom questlines and farm layouts'
    ],
    screenshots: [
      'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'
    ],
    changelog: [
      {
        version: 'v1.14.24',
        date: 'Oct 28, 2024',
        changes: [
          'Fixed Android memory leak in Crimson Badlands',
          'Updated sprite scaling for 120Hz displays',
          'Resolved dialogue freeze on festival days'
        ]
      }
    ],
    sha256: 'e89a42167d40213ec9471b6932e185c78a01129f83ab412c9b83e47d12f45813',
    virusTotalClean: true,
    downloadFilename: 'Stardew_Valley_Expanded_v1.14.24.zip'
  },
  'hollow-knight': {
    id: 'mod-hollow-knight',
    slug: 'hollow-knight',
    type: 'mod',
    title: 'Hollow Knight Silk Touch & 60FPS Mod',
    version: 'v1.4.3-mod',
    status: 'Unofficial',
    category: 'Action',
    tags: ['Custom Skin', '60FPS Unlock', 'Touch Remap', 'Hallownest'],
    coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
    rating: 4.9,
    ratingCount: 5400,
    downloads: '320K',
    downloadCount: 320000,
    fileSize: '88 MB',
    developer: 'Team Cherry / Community Modders',
    porter: 'Danil_05 Modding Branch',
    packageName: 'com.teamcherry.hollowknight.silktouch',
    minAndroid: 'Android 8.0+',
    architecture: 'arm64-v8a',
    obbRequired: true,
    updatedDate: 'Nov 02, 2024',
    releaseDate: '2024-05-18',
    description: 'Essential performance and control overlay mod for Hollow Knight Android. Unlocks full 60/120 FPS frame caps, provides customizable transparent touch controls, custom knight skins, and fixes shader artifacts on Mali GPUs.',
    installationGuide: [
      'Install the base Hollow Knight Android APK.',
      'Copy the mod patch data into /Android/data/com.teamcherry.hollowknight.android/files/mods/.',
      'Launch the game and toggle the in-game Mod Menu from the pause screen.'
    ],
    features: [
      'Unlocked 60/90/120 FPS high refresh rate modes',
      'Virtual joystick deadzone calibration and haptic feedback',
      'Custom Knight sprite packs (Hornet, Pure Vessel, Void)',
      'Godhome boss rush quick selector'
    ],
    screenshots: [
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80'
    ],
    changelog: [
      {
        version: 'v1.4.3-mod',
        date: 'Nov 02, 2024',
        changes: [
          'Added custom button placement profiles for foldables',
          'Optimized particle shaders in Queen’s Gardens'
        ]
      }
    ],
    sha256: '9f83ab412c9b83e47d12f45813e89a42167d40213ec9471b6932e185c78a0112',
    virusTotalClean: true,
    downloadFilename: 'Hollow_Knight_SilkTouch_v1.4.3.apk'
  },
  'minecraft-mod': {
    id: 'mod-minecraft-mod',
    slug: 'minecraft-mod',
    type: 'mod',
    title: 'Minecraft Deferred Shaders & Ray Tracing Pack',
    version: 'v1.20.80',
    status: 'Unofficial',
    category: 'Adventure',
    tags: ['Shaders', 'Vulkan', 'PBR Textures', 'Bedrock'],
    coverUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
    rating: 4.8,
    ratingCount: 7800,
    downloads: '540K',
    downloadCount: 540000,
    fileSize: '65 MB',
    developer: 'Mojang / RenderDragon Community',
    porter: 'Deferred Render Team',
    packageName: 'com.mojang.minecraftpe.deferred',
    minAndroid: 'Android 9.0+',
    architecture: 'arm64-v8a',
    obbRequired: false,
    updatedDate: 'Nov 01, 2024',
    releaseDate: '2024-06-20',
    description: 'High-fidelity lighting, volumetric fog, dynamic sun shadows, and PBR specular reflections for Minecraft Bedrock on Android using the experimental Render Dragon Deferred Technical Preview.',
    installationGuide: [
      'Download the .mcpack resource file.',
      'Tap to open with Minecraft Bedrock, which will automatically import the package.',
      'In World Settings > Resource Packs, activate Deferred Shaders.',
      'In Video Settings, enable "Render Dragon Deferred Technical Preview".'
    ],
    features: [
      'Volumetric atmospheric fog and god rays',
      'Point lights and colored light sources from torches and lanterns',
      'Physically-based metallic and roughness textures',
      'Optimized presets for Snapdragon 7 and 8 series'
    ],
    screenshots: [
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80'
    ],
    changelog: [
      {
        version: 'v1.20.80',
        date: 'Nov 01, 2024',
        changes: [
          'Added Adreno 700 series Vulkan driver optimizations',
          'Adjusted bloom threshold for underwater caustics'
        ]
      }
    ],
    sha256: '33219481928471c678a109e45b12871b894211902a781b01c1234901f4176122',
    virusTotalClean: true,
    downloadFilename: 'Deferred_Shaders_v1.20.80.mcpack'
  }
};

export const COMMUNITY_REQUESTS: CommunityPortRequest[] = [];
