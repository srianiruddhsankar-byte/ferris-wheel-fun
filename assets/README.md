# Sounds

The ride looks for these four looping files. They aren't included (licences vary),
so download any you like, rename them to match, and drop them in this folder.
Any missing file is simply skipped.

| File               | What it is                                    | Plays when                               | Where to find one |
|--------------------|-----------------------------------------------|------------------------------------------|-------------------|
| `wind.mp3`         | Soft, airy wind loop                          | Always                                   | Pixabay: search "soft wind loop" · freesound.org: search "gentle wind loop" |
| `wheel-creak.mp3`  | Slow, gentle metal/wood creak                 | While the wheel moves (louder when faster) | Pixabay: search "creak loop" · freesound.org: search "ferris wheel creak" or "rope creak" |
| `fair-music.mp3`   | Distant carousel / fairground / music-box tune | Daytime, fades out at sunset             | Pixabay Music: search "carousel" or "music box" · freesound.org: search "distant carnival music" |
| `crickets.mp3`     | Night crickets ambience                        | Fades in at night                        | Pixabay: search "crickets night" · freesound.org: search "crickets loop" |

- Pixabay sounds: https://pixabay.com/sound-effects/ (Pixabay Content License, no attribution required)
- freesound.org: https://freesound.org/ (check each sound's licence; CC0 needs no credit, CC-BY needs a credit line)

Tips: keep each loop 20–60 s and under ~1 MB, and trim them so they loop
seamlessly. The volumes are set in `CONFIG.SOUND_LEVELS` at the top of `script.js`.
The `.mp3` names can be changed in `CONFIG.SOUND_FILES`.
