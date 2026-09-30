# LifeOS Launch Video — Sound Design & Cues Specification

Total Video Duration: **1320 frames (44.0 seconds @ 30 FPS)**  
Music Volume: **0.55 base** (Fade in: first 15 frames; Fade out: last 45 frames)  
SFX Volume: **0.15 – 0.22** (subtle, strictly ~30–40% of music volume)

---

## 1. Sound Cue Schedule (Chronological)

| Global Frame | Timestamp | Scene | Event Description | Sound File | Relative Volume |
|:---:|:---:|:---|:---|:---|:---:|
| **0** | 00:00.00 | Scene 1 (Hook) | Giant "46" pops into center | `public/sfx/pop.wav` | 0.18 |
| **30** | 00:01.00 | Scene 1 (Hook) | Tile 1 (Calendar) pop | `public/sfx/pop.wav` | 0.15 |
| **39** | 00:01.09 | Scene 1 (Hook) | Tile 2 (Notes) pop | `public/sfx/pop.wav` | 0.15 |
| **48** | 00:01.18 | Scene 1 (Hook) | Tile 3 (Flashcards) pop | `public/sfx/pop.wav` | 0.15 |
| **57** | 00:01.27 | Scene 1 (Hook) | Tile 4 (Tasks) pop | `public/sfx/pop.wav` | 0.15 |
| **66** | 00:02.06 | Scene 1 (Hook) | Tile 5 (Habits) pop | `public/sfx/pop.wav` | 0.15 |
| **75** | 00:02.15 | Scene 1 (Hook) | Tile 6 (Budget) pop | `public/sfx/pop.wav` | 0.15 |
| **84** | 00:02.24 | Scene 1 (Hook) | Tile 7 (Timer) pop | `public/sfx/pop.wav` | 0.15 |
| **90–150**| 00:03.00 | Scene 1 (Hook) | Tension riser building towards collapse | `public/sfx/riser.wav` | 0.20 |
| **93** | 00:03.03 | Scene 1 (Hook) | Tile 8 (Docs) pop | `public/sfx/pop.wav` | 0.15 |
| **102** | 00:03.12 | Scene 1 (Hook) | Tile 9 (Reminders) pop | `public/sfx/pop.wav` | 0.15 |
| **111** | 00:03.21 | Scene 1 (Hook) | Tile 10 (Chatbot) pop | `public/sfx/pop.wav` | 0.15 |
| **180** | 00:06.00 | Scene 2 (Logo) | Soft chime at LifeOS ribbon reveal | `public/sfx/chime.wav` | 0.22 |
| **200** | 00:06.20 | Scene 2 (Logo) | "LifeOS" wordmark emerges | `public/sfx/pop.wav` | 0.16 |
| **240** | 00:08.00 | Scene 3 (Brief) | Morning notification banner drops | `public/sfx/whoosh.wav` | 0.16 |
| **300** | 00:10.00 | Scene 3 (Brief) | Priority 1 badge pop | `public/sfx/pop.wav` | 0.18 |
| **315** | 00:10.15 | Scene 3 (Brief) | Priority 2 badge pop | `public/sfx/pop.wav` | 0.18 |
| **330** | 00:11.00 | Scene 3 (Brief) | Priority 3 badge pop | `public/sfx/pop.wav` | 0.18 |
| **345** | 00:11.15 | Scene 3 (Brief) | Yesterday's Wins column reveal | `public/sfx/tick.wav` | 0.16 |
| **360** | 00:12.00 | Scene 3 (Brief) | Today's Flow column reveal | `public/sfx/tick.wav` | 0.16 |
| **435** | 00:14.15 | Scene 4 (AI) | FakeCursor clicks AI input capsule | `public/sfx/click.wav` | 0.18 |
| **495** | 00:16.15 | Scene 4 (AI) | User message submits into chat bubble | `public/sfx/pop.wav` | 0.16 |
| **560** | 00:18.20 | Scene 4 (AI) | Tool confirmation card slides up | `public/sfx/whoosh.wav` | 0.16 |
| **585** | 00:19.15 | Scene 4 (AI) | FakeCursor clicks "Confirm" button | `public/sfx/click.wav` | 0.20 |
| **592** | 00:19.22 | Scene 4 (AI) | Success chime & calendar event slot drops | `public/sfx/success.wav` | 0.22 |
| **630** | 00:21.00 | Scene 5 (Study) | Subject Card 1 stagger in | `public/sfx/pop.wav` | 0.16 |
| **642** | 00:21.12 | Scene 5 (Study) | Subject Card 2 stagger in | `public/sfx/pop.wav` | 0.16 |
| **654** | 00:21.24 | Scene 5 (Study) | Subject Card 3 stagger in | `public/sfx/pop.wav` | 0.16 |
| **692** | 00:23.02 | Scene 5 (Study) | FakeCursor clicks "Open Review Queue" | `public/sfx/click.wav` | 0.20 |
| **725** | 00:24.05 | Scene 5 (Study) | Flashcard 3D flip whoosh | `public/sfx/whoosh.wav` | 0.22 |
| **750** | 00:25.00 | Scene 5 (Study) | SM-2 rating buttons pop in | `public/sfx/pop.wav` | 0.16 |
| **765** | 00:25.15 | Scene 5 (Study) | FakeCursor clicks rating button 4 | `public/sfx/click.wav` | 0.20 |
| **775** | 00:25.25 | Scene 5 (Study) | Flashcard 1 dismisses to left | `public/sfx/whoosh.wav` | 0.16 |
| **810** | 00:27.00 | Scene 6 (Montage) | Montage Cut 1 (Focus / Pomodoro dial) | `public/sfx/hit.wav` | 0.20 |
| **855** | 00:28.15 | Scene 6 (Montage) | Montage Cut 2 (Habits / Streak tracker) | `public/sfx/hit.wav` | 0.20 |
| **871** | 00:29.01 | Scene 6 (Montage) | FakeCursor clicks "Mark Done" | `public/sfx/click.wav` | 0.20 |
| **872** | 00:29.02 | Scene 6 (Montage) | Streak counter rolls 21 -> 22 & flame pop | `public/sfx/pop.wav` | 0.18 |
| **900** | 00:30.00 | Scene 6 (Montage) | Montage Cut 3 (Finance / Budget meter) | `public/sfx/hit.wav` | 0.20 |
| **945** | 00:31.15 | Scene 6 (Montage) | Montage Cut 4 (Notes / Connected note) | `public/sfx/hit.wav` | 0.20 |
| **990** | 00:33.00 | Scene 7 (Mobile) | iPhone Pro frame slides up | `public/sfx/whoosh.wav` | 0.16 |
| **1028** | 00:34.08 | Scene 7 (Mobile) | Dock step 1 tick (Dashboard -> Habits) | `public/sfx/tick.wav` | 0.18 |
| **1061** | 00:35.11 | Scene 7 (Mobile) | Dock step 2 tick (Habits -> Study) | `public/sfx/tick.wav` | 0.18 |
| **1120** | 00:37.10 | Scene 8 (Trust) | Card 1 pop ("Export all your data") | `public/sfx/pop.wav` | 0.18 |
| **1135** | 00:37.25 | Scene 8 (Trust) | Card 2 pop ("Delete anytime") | `public/sfx/pop.wav` | 0.18 |
| **1150** | 00:38.10 | Scene 8 (Trust) | Card 3 pop ("Ad-free") | `public/sfx/pop.wav` | 0.18 |
| **1200** | 00:40.00 | Scene 9 (End) | LifeOS ribbon mark scales in | `public/sfx/pop.wav` | 0.20 |
| **1210** | 00:40.10 | Scene 9 (End) | "LifeOS" wordmark slides in | `public/sfx/whoosh.wav` | 0.16 |
| **1250** | 00:41.20 | Scene 9 (End) | "Start free" button pops in | `public/sfx/pop.wav` | 0.22 |

---

## 2. Free SFX Replacement Library (Pixabay / Mixkit / Freesound)

*Note: High-quality procedural placeholder audio files have already been synthesized and placed in `public/sfx/` so the video can be previewed and rendered immediately with full sound design.*

To swap them with real studio-recorded Foley samples under CC0 / Royalty-Free licenses:

1. **`public/music.mp3`**:
   - *Description*: Uplifting, modern lo-fi / indie-electronic instrumental background track (~110–120 BPM)
   - *Sources*: 
     - [Mixkit Free Tech/Upbeat Lo-Fi Music](https://mixkit.co/free-stock-music/lo-fi/)
     - [Pixabay Royalty Free Background Music](https://pixabay.com/music/) (search: "modern tech upbeat acoustic")

2. **`public/sfx/pop.wav`**:
   - *Description*: Clean, soft bubble UI pop (40–80ms duration)
   - *Sources*: [Pixabay UI Pop Sound Effects](https://pixabay.com/sound-effects/search/pop/) / [Mixkit UI Pop](https://mixkit.co/free-sound-effects/pop/)

3. **`public/sfx/click.wav`**:
   - *Description*: Crisp mouse / trackpad click sound (20–40ms duration)
   - *Sources*: [Pixabay Mouse Click](https://pixabay.com/sound-effects/search/mouse-click/) / [Freesound UI Click CC0](https://freesound.org/)

4. **`public/sfx/tick.wav`**:
   - *Description*: Subtle haptic tick / wood block / clock tick (30–50ms duration)
   - *Sources*: [Pixabay Haptic Tick](https://pixabay.com/sound-effects/search/tick/)

5. **`public/sfx/whoosh.wav`**:
   - *Description*: Light, airy card whoosh / slide transition (200–350ms duration)
   - *Sources*: [Mixkit Fast Whoosh](https://mixkit.co/free-sound-effects/whoosh/) / [Pixabay Soft Whoosh](https://pixabay.com/sound-effects/search/whoosh/)

6. **`public/sfx/chime.wav`**:
   - *Description*: Elegant, warm sparkling bell chime for brand reveal (1.0–1.5s decay)
   - *Sources*: [Pixabay Magic Chime](https://pixabay.com/sound-effects/search/chime/) / [Mixkit Notification Bell](https://mixkit.co/free-sound-effects/bell/)

7. **`public/sfx/success.wav`**:
   - *Description*: Soft two-tone confirmation ding / positive action chime (300–500ms duration)
   - *Sources*: [Pixabay UI Success](https://pixabay.com/sound-effects/search/success/) / [Mixkit Achievement Bell](https://mixkit.co/free-sound-effects/win/)

8. **`public/sfx/hit.wav`**:
   - *Description*: Low-frequency soft cinematic thud / impact for hard cuts (150–250ms duration)
   - *Sources*: [Mixkit Deep Impact Hit](https://mixkit.co/free-sound-effects/hit/) / [Pixabay Soft Impact](https://pixabay.com/sound-effects/search/thud/)

9. **`public/sfx/riser.wav`**:
   - *Description*: Smooth cinematic tension riser building from low to mid frequencies (2.0s duration)
   - *Sources*: [Pixabay Tension Riser](https://pixabay.com/sound-effects/search/riser/) / [Freesound Riser CC0](https://freesound.org/)
