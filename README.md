# CycleSplit — GCD cycle separator

## Run on your Windows laptop

1. Extract the ZIP into a folder called `gcd-cycle-separator`.
2. Keep `index.html`, `style.css`, `app.js`, `core.js`, and `worker.js` together in that folder. Do not rename their extensions. Enable **View → Show → File name extensions** in File Explorer if necessary.
3. If Python is installed, double-click `start-windows.bat`. Alternatively open a terminal in this folder and run `py -m http.server 3000 --bind 127.0.0.1` (or `python -m http.server 3000 --bind 127.0.0.1`).
4. Open **http://localhost:3000** in Chrome or Edge. Keep the server terminal open. Do not open the HTML by double-clicking it: the module worker requires HTTP.
5. Enter **3** as the expected count and click **Continue to data**. Click **Try sample data**, then **Separate cycles**. You should see **3 cycle segments**. Try **Copy all cycles**, then paste into Excel: you should get six columns.
6. Load your own CSV, TSV or TXT file. If using Excel, export the sheet as CSV first. Check the time and potential columns before separating.

If `py` and `python` are not recognised, install Python, or use VS Code’s Live Server extension to serve this folder. No Python packages, npm packages, API keys or internet connection are needed to use the app once the files and a local server are available.

## Files

```
gcd-cycle-separator/
  index.html          Main page
  style.css           Appearance
  app.js              Page controls, chart and copying
  core.js             Parsing, detection and column export
  worker.js           Background processing
  start-windows.bat   Windows local launcher
  package.json        Optional Node test commands
  vercel.json         Configuration for later deployment
  README.md           This guide
  .gitignore          Git exclusions
  tests/
    core.test.js      Detection and export checks
```

## Detection and exported data

A cycle boundary is the minimum potential between discharge and the next charge. A fall and subsequent rise must each reach the reversal threshold to confirm that minimum. The automatic threshold is 20% of the sampled 1st–99th percentile voltage range. It is a starting point: noisy or changing-amplitude experiments may require adjustment. Enter a manual threshold in the same units as the potential column.

Original numeric potential text is preserved. Original time text is also preserved. No time reset or numeric recalculation is performed by the website. Only boundary rows are intentionally repeated at the end of one cycle and start of the next. All original valid rows are retained. Rows with missing or nonnumeric selected values are skipped and counted visibly. Input order is preserved; no sorting is performed, so input must be in acquisition order. Only the selected time and potential columns are exported.

The trough row completes the preceding discharge and also starts the next cycle. The same original time and potential strings appear in both cycles. The first and last segments may be partial. A final trough without a subsequent confirmed rise does not create an extra segment. For capacitance work, review your discharge endpoints separately.

Unequal segment lengths are padded with empty cells. Wide CSV and tab-separated clipboard output use two columns per cycle with one blank separator column between cycles. The preview shows up to 5,000 rows per measurement page. Measurement pages are not cycles. Preview is paginated, while exports contain all rows. Input limit: 50 MB. Clipboard limit: 20 million characters. Wide CSV limit: 150 million characters. These are browser-memory safeguards, not cycle-count limits. 10,000 cycles produce 20,000 data columns plus 9,999 blank separator columns, exceeding Excel’s 16,384-column limit; use group exports for Excel. The CSV itself can contain all 10,000 cycles when within the size limit.

The parser supports a single optional header row, comma/tab/semicolon/whitespace delimiters, quoted single-line fields, dot decimals and scientific notation. It does not support Excel workbooks, decimal commas, instrument metadata preambles or multiline quoted fields. Remove metadata before import. All file processing happens locally in a Web Worker; there is no upload server, analytics or external dependency.

## Optional developer checks

With Node.js installed, run `npm test` in this folder. The checks cover 10,000 cycles, noise, partial recordings, parsing, row preservation and wide export padding.

## Later: GitHub and Vercel

After the local version works, commit this folder to a GitHub repository, then import that repository in Vercel. Use framework preset **Other**, no build command, and output directory `.`. The included `vercel.json` describes the static deployment. No environment variables are required. Deployment is intentionally deferred until the local stage is complete.

## Potential window
The app reports the observed minimum and maximum potential. Optional user-specified potential window limits set the automatic reversal threshold to 20% of that window. With supplied window limits, internal boundaries require the preceding peak to reach maximum minus tolerance and the trough to reach minimum plus tolerance. Overshoots are accepted. E step sets that tolerance in input potential units (4 mV = 0.004 V). Without E step, tolerance defaults to 1% of the window when both limits are supplied; otherwise zero. These checks do not clip or change measurements. A manually specified reversal threshold overrides that calculation.

## Guided workflow and automatic groups
Start by entering the expected cycle count. Then load the complete experiment and separate cycles. At most 3,000 detected cycles go directly to review; more than 3,000 require choosing a group first. Groups are 3,000 cycles each except the final remainder. For 10,000 cycles, the groups are 1–3,000, 3,001–6,000, 6,001–9,000 and 9,001–10,000.

The detected count controls grouping. A mismatch with the entered count is displayed, and should be investigated before interpretation. Group exports are capped at 3,000 cycles (8,999 columns including separators). Copy this group and Download this group CSV include all the group's measurements. Smaller ranges must lie within the active group. Global cycle numbering and shared original boundary endpoints are preserved. Jumping to any cycle activates its corresponding group. The chart explicitly shows the whole experiment.

A 0.04 V tolerance is 40 mV, not 4 mV. Grouping organises measurements; it does not establish experimental validity.

## Jump directly to a cycle
Enter a cycle number in Go directly to cycle and click Go to cycle (or press Enter). The preview begins at that cycle and the individual-cycle copy/download selector is updated to the same cycle. Selecting a cycle in the dropdown also jumps the preview. Invalid cycle numbers are rejected.

## Appearance and creator
Navy headings, teal charging traces and actions, and amber discharging traces. A decorative electrochemical background can be paused using the header button and respects reduced-motion preferences. Chart phase colours follow the direction between plotted samples. Creator: Adnan Mahmood, BS MME Batch 2022–2026, made for NMP. Portfolio: https://adnan-mahmood.vercel.app/.
