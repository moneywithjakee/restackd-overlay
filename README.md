# Restackd Neo live overlay

A standalone 2000×750 TikTok LIVE / OBS banner for Neo, built on the canonical Restackd Riser 1.0 brand system.

The overlay rotates through four stories:

1. Personalized coaching and next-move guidance
2. Live spots and newest-buyer proof
3. Restackd Academy paths included with Neo
4. Lifetime-access offer and product capabilities

Real sale events interrupt the rotation with a branded join celebration, then return to the previous frame. Empty and offline states prevent dead air.

## OBS setup

- Browser Source URL: `https://overlay.restackd.com/`
- Native width: `2000`
- Native height: `750`
- Scale the source uniformly to fit the TikTok LIVE scene
- Leave Custom CSS blank

The page background is fully occupied by the banner. No companion celebration source is required.

## Live data

- `GET https://restackd.com/api/overlay/spots`
- `GET https://restackd.com/api/founding/ticker`
- `GET https://restackd.com/api/overlay/stream` (SSE)

## Local review

```powershell
npm install
node verify.mjs --state=testimonial --out=out/coach.png
node verify.mjs --state=live --out=out/live.png
node verify.mjs --state=bnpl --out=out/academy.png
node verify.mjs --state=features --out=out/access.png
node verify.mjs --state=burst --out=out/burst.png
```

Run the behavior checks with:

```powershell
node test-rotation.mjs
node test-burst-resume.mjs
```

## Brand contract

- Parent identity: Carbon, White, Core Blue, and Riser Coral
- Neo ownership cue: Neo Violet
- Display: Instrument Sans
- Body: Inter
- Utility labels: DM Mono
- Motion: opacity and transform only; reduced-motion is respected
- Voice: direct, useful, specific, and free of guru language

The parent Restackd mark remains visible in every state. Product color identifies Neo without tinting the whole experience.
