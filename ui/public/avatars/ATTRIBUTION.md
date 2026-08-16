# Avatar attribution

## `ui/public/avatars/receptionist-turtle-talk.mp4`

- Source art: user-provided cute turtle illustration.
- Motion: HeyGen full-body portrait clip (720×1280, 9:16), trimmed and spliced (excludes ~2.6–4s goofy eye-roll), audio-stripped.
- Idle still: `receptionist-turtle-idle.png` (last outro frame — neutral closed-smile pose).
- Playback: talk loop **only** while `phase === 'speaking'` (synced with AI PCM); idle PNG otherwise — no post-speech outro.
- Mouth motion follows the HeyGen bake, not live Gemini phonemes.

## Legacy

- `receptionist-portrait.png` — previous photoreal portrait (kept as image-load fallback path unused by default).
