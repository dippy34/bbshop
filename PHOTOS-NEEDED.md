# Containment Breach artwork

## Already installed

- `images/logo.png`: the supplied Containment Breach logo, cropped with its screenshot background removed. Appears in the entry, navigation, hero and footer.
- `images/bonegrit.png`: the supplied dark Bonegrit image. Appears in the hero and entity profile. CSS lifts its brightness while preserving the source file.

Original screenshots and the previous website are preserved outside the active site in the workspace's `work/containment-breach/` directory.

## Remaining artwork

- Actual level screenshots, labelled with their confirmed map names.
- Actual gameplay footage or an official trailer, if these should appear.
- Images of additional entities when their names and information are ready.
- An original transparent logo export or higher-resolution Bonegrit render is an optional quality improvement.

## Drop-in slots

| Base filename | Placement | Framing |
| --- | --- | --- |
| `images/logo` | Entry, navigation, hero and footer | Transparent wide artwork; current aspect ratio 1215:297 |
| `images/bonegrit` | Hero and Bonegrit profile | Portrait, full body; current aspect ratio 528:916 |
| `images/level-1` | Levels gallery, first image | Landscape; displayed at 16:10 |
| `images/level-2` | Levels gallery, second image | Landscape; displayed at 16:10 |
| `images/level-3` | Levels gallery, third image | Landscape; displayed at 16:10 |

PNG, JPG, JPEG and WebP are supported, in that priority order. Remove an older same-base file if changing format. Reload after adding artwork.

Empty level slots stay hidden. The supplied Python server supports automatic directory discovery; hosts without directory listings use extension probing, which can produce expected missing-file requests. Set each slot's `data-alt` in `index.html` to a useful description when the actual screenshot is supplied. Add confirmed map names and descriptions with those images.

Set `CONFIG.photoLabels` to `true` in `js/main.js` to show filenames while editing. It defaults to `false`.
