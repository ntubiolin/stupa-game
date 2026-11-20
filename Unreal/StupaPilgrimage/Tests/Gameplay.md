# Tō-ji gameplay verification

Start the packaged Mac app with an empty profile. To isolate verification from your normal save, launch the app’s binary with `-TojiSaveDir=/absolute/path/to/empty-directory`.

1. Use WASD and the mouse to approach Kūkai west of the southern approach. Verify the pilgrim moves and animates and that the camera uses Kondō’s collision. Space jumps.
2. Press E to read Kūkai’s dialogue and E again to accept the task. Follow the golden marker to the Kondō and press E to light the offering lamp. Confirm the flame appears.
3. Walk around the hall to the mandala on the north walk and press E. Follow the marker to the Earth ward and press E to summon the shade. Purify it with two Q casts. Complete the Fire and Wind wards the same way. The shade recovers when you linger close to it. The next objective only appears after a successful save.
4. Press L and check the title, objectives, prompts, dialogue, and controls in both English and Traditional Chinese. Press 1, 2, and 3 to cycle daylight, dusk, and night.
5. Quit with Escape (in standalone or packaged builds). Relaunch with the same profile. Verify the language, quest progress, and lamp state persisted.

## Web save import

The [fixture](Fixtures/stupa.save.v2.json) was generated with the web runtime’s `createSave` and the first five IDs from `JAPAN_CAMPAIGN_STEPS`. It includes Qinglong, Kūkai’s Tō-ji dialogue, Yakushi, Traditional Chinese settings, and the web-only merit section.

1. In the running app press I to open the profile directory. Copy the fixture there as `stupa.save.v2.json`. Return to the app and press F9 twice within eight seconds to confirm replacement. For launch automation use `-TojiImport=/absolute/path/to/stupa.save.v2.json` on the import launch.
2. Confirm Traditional Chinese is active, the offering lamp is already lit, and the next objective is the mandala. The importer only counts Tō-ji steps in the consecutive campaign prefix. A Qinglong-only backup starts at the first Tō-ji objective.
3. Verify that the new file under `WebBackups` is byte-for-byte identical to the fixture using `cmp`. It contains the unsupported merit and settings fields along with the rest of the original document.
4. Quit and relaunch with the same profile and without `-TojiImport` to verify imported progress persisted. Progress continues from the local snapshot while the archived web backup stays intact.
5. Repeat import with malformed JSON or a root version higher than 2. Verify the warning and confirm the existing lamp, objective, and language are retained after restart.

Run the Unreal editor automation test `Stupa.Toji.Save.WebV2` for schema, language, prefix ordering, and invalid-input coverage. For fixed lighting at launch use `-TojiTime=day`, `-TojiTime=dusk`, or `-TojiTime=night`.
