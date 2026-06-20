import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const ffmpeg = path.join(root, "node_modules", "@ffmpeg-installer", "win32-x64", "ffmpeg.exe");
const ffprobe = path.join(root, "node_modules", "ffprobe-static", "bin", "win32", "x64", "ffprobe.exe");
const source = path.join(root, "public", "assets", "carecore", "demo.mp4");
const work = path.join(root, "public", "assets", "carecore", "video-edit");
const out = path.join(work, "exports");
const voiceDir = path.join(work, "voice");
const font = "C\\:/Windows/Fonts/arial.ttf";
const fontBold = "C\\:/Windows/Fonts/arialbd.ttf";

mkdirSync(out, { recursive: true });
mkdirSync(voiceDir, { recursive: true });

function run(args, label) {
  console.log(`\n${label}`);
  execFileSync(ffmpeg, args, { stdio: "inherit", cwd: root });
}

function sh(command, args, label) {
  console.log(`\n${label}`);
  execFileSync(command, args, { stdio: "inherit", cwd: root });
}

function escText(text) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/,/g, "\\,");
}

function fmtTime(seconds, sep = ",") {
  const s = Math.max(0, seconds);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60);
  const ms = Math.round((s - Math.floor(s)) * 1000);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}${sep}${String(ms).padStart(3, "0")}`;
}

function srtBlock(i, start, end, text) {
  return `${i}\n${fmtTime(start)} --> ${fmtTime(end)}\n${text}\n`;
}

const probe = JSON.parse(execFileSync(ffprobe, [
  "-v", "error",
  "-show_entries", "format=duration",
  "-of", "json",
  source,
], { cwd: root, encoding: "utf8" }));

const sourceDuration = Number(probe.format.duration);
const introDuration = 3;
const outroDuration = 6;
const finalDuration = introDuration + sourceDuration + outroDuration;

const narration = [
  [0.6, 12.4, "Welcome to CareCore HMS by Orion Soft Limited: a connected hospital management platform for teams that need clarity, speed, and control."],
  [13.2, 25.8, "From the dashboard, administrators can see key hospital activity in real time, including patients, appointments, pharmacy stock, revenue, and operational alerts."],
  [27.0, 39.5, "Registration teams can create patient records quickly, keep demographics organized, and make sure every department works from one accurate profile."],
  [41.0, 54.0, "During consultation, clinicians can review history, capture notes, manage diagnoses, request tests, and keep care decisions attached to the patient record."],
  [55.5, 68.0, "Pharmacy workflows connect prescriptions, dispensing, stock visibility, and billing, reducing manual hand-offs and helping teams avoid preventable delays."],
  [69.5, 82.0, "Laboratory requests and results stay connected to clinical records, so doctors can move from ordering to review without chasing paper forms."],
  [83.5, 96.0, "Billing turns clinical and operational activity into clear charges, receipts, balances, and finance reports for stronger revenue control."],
  [97.5, 112.0, "Admissions and nursing workflows support ward movement, bedside updates, vitals, treatment notes, and handovers across the patient journey."],
  [113.5, 130.0, "Role-based modules keep each department focused: registration, consultation, pharmacy, laboratory, billing, admissions, nursing, reports, and dashboard analytics."],
  [131.5, 149.0, "Managers get reports that reveal trends across patients, services, payments, stock, and departmental performance, with less spreadsheet cleanup."],
  [150.5, 166.2, "CareCore helps healthcare facilities move from fragmented paper processes to a modern, auditable, real-time operating system for care delivery."],
];

let srt = "";
narration.forEach(([start, end, text], i) => {
  srt += srtBlock(i + 1, introDuration + start, introDuration + end, text);
  srt += "\n";
});
writeFileSync(path.join(work, "carecore-premium-subtitles.srt"), srt, "utf8");

const voiceFiles = narration.map(([start, , text], i) => {
  const wav = path.join(voiceDir, `voice_${String(i + 1).padStart(2, "0")}.wav`);
  if (!existsSync(wav)) {
    const ps = `
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like 'en-*' } | Select-Object -First 1
if ($voice) { $synth.SelectVoice($voice.VoiceInfo.Name) }
$synth.Rate = -1
$synth.Volume = 100
$synth.SetOutputToWaveFile('${wav.replace(/'/g, "''")}')
$synth.Speak('${text.replace(/'/g, "''")}')
$synth.Dispose()
`;
    sh("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps], `Generating voice segment ${i + 1}`);
  }
  return [wav, start + introDuration];
});

const delayedInputs = [];
const amixLabels = [];
voiceFiles.forEach(([wav, start], i) => {
  delayedInputs.push("-i", wav);
  const ms = Math.round(start * 1000);
  amixLabels.push(`[${i}:a]adelay=${ms}|${ms},volume=1.0[v${i}]`);
});
const voiceMix = path.join(work, "carecore-voiceover.wav");
run([
  ...delayedInputs,
  "-filter_complex",
  `${amixLabels.join(";")};${voiceFiles.map((_, i) => `[v${i}]`).join("")}amix=inputs=${voiceFiles.length}:duration=longest,volume=${voiceFiles.length},atrim=0:${finalDuration},asetpts=PTS-STARTPTS[out]`,
  "-map", "[out]",
  "-ar", "48000",
  "-ac", "2",
  "-y",
  voiceMix,
], "Mixing timed voice-over");

const music = path.join(work, "carecore-original-cinematic-bed.wav");
run([
  "-f", "lavfi", "-t", String(finalDuration), "-i", "sine=frequency=110:sample_rate=48000",
  "-f", "lavfi", "-t", String(finalDuration), "-i", "sine=frequency=220:sample_rate=48000",
  "-f", "lavfi", "-t", String(finalDuration), "-i", "sine=frequency=329.63:sample_rate=48000",
  "-filter_complex",
  "[0:a]volume=0.028[a0];[1:a]volume=0.018[a1];[2:a]volume=0.012[a2];[a0][a1][a2]amix=inputs=3:duration=longest,volume=3,afade=t=in:st=0:d=3,afade=t=out:st=" + (finalDuration - 5).toFixed(3) + ":d=5[out]",
  "-map", "[out]",
  "-ar", "48000",
  "-ac", "2",
  "-y",
  music,
], "Generating original low-volume cinematic music bed");

const titleScenes = [
  [0, 14, "Dashboard", "Real-time operations"],
  [14, 31, "Registration", "Fast patient intake"],
  [31, 51, "Consultation", "Clinical notes and care plans"],
  [51, 68, "Pharmacy", "Prescriptions and stock"],
  [68, 84, "Laboratory", "Orders and results"],
  [84, 99, "Billing", "Charges, receipts, balances"],
  [99, 114, "Admissions", "Ward movement and stays"],
  [114, 130, "Nursing", "Vitals, notes, handovers"],
  [130, 151, "Reports", "Performance and revenue insight"],
  [151, sourceDuration, "Dashboard", "Management visibility"],
];

const calloutFilters = [];
titleScenes.forEach(([start, end, title, sub], i) => {
  const y = i % 2 === 0 ? 86 : 560;
  calloutFilters.push(`drawbox=x=54:y=${y - 20}:w=420:h=88:color=black@0.72:t=fill:enable='between(t,${start},${end})'`);
  calloutFilters.push(`drawbox=x=54:y=${y - 20}:w=5:h=88:color=0xD4AF37@0.95:t=fill:enable='between(t,${start},${end})'`);
  calloutFilters.push(`drawtext=fontfile='${fontBold}':text='${escText(title)}':x=76:y=${y}:fontsize=30:fontcolor=white:enable='between(t,${start},${end})'`);
  calloutFilters.push(`drawtext=fontfile='${font}':text='${escText(sub)}':x=76:y=${y + 38}:fontsize=18:fontcolor=0xB9E7FF:enable='between(t,${start},${end})'`);
});

const highlights = [
  [2, 13, 150, 150, 975, 170],
  [18, 29, 8, 86, 160, 360],
  [36, 48, 300, 186, 735, 350],
  [58, 66, 610, 228, 435, 230],
  [72, 82, 304, 168, 780, 360],
  [88, 98, 900, 250, 265, 180],
  [102, 112, 300, 185, 520, 380],
  [118, 128, 10, 428, 158, 150],
  [136, 148, 675, 510, 470, 130],
  [154, 166, 298, 140, 760, 430],
];
highlights.forEach(([start, end, x, y, w, h]) => {
  calloutFilters.push(`drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=0xD4AF37@0.42:t=4:enable='between(t,${start},${end})'`);
  calloutFilters.push(`drawbox=x=${x + 6}:y=${y + 6}:w=${w - 12}:h=${h - 12}:color=0x00AEEF@0.25:t=2:enable='between(t,${start + 0.35},${end - 0.35})'`);
});

const subtitlePath = path.join(work, "carecore-premium-subtitles.srt").replace(/\\/g, "/").replace(/:/, "\\:");
const mainVideo = [
  "format=yuv420p",
  "fade=t=in:st=0:d=0.35",
  `fade=t=out:st=${(sourceDuration - 0.35).toFixed(3)}:d=0.35`,
  ...calloutFilters,
].join(",");

const master = path.join(out, "carecore-premium-master.mp4");
const filter = [
  `[0:v]${mainVideo}[mainv]`,
  `[1:a]volume=0.18,adelay=${introDuration * 1000}|${introDuration * 1000},atrim=0:${finalDuration}[orig]`,
  `[2:a]volume=1.0[voice]`,
  `[3:a]volume=0.75[music]`,
  `color=c=0x05070A:s=1280x720:d=${introDuration},format=yuv420p,drawtext=fontfile='${fontBold}':text='ORION SOFT LIMITED':x=(w-text_w)/2:y=255:fontsize=56:fontcolor=0xD4AF37:alpha='if(lt(t,0.45),t/0.45,if(gt(t,2.55),(3-t)/0.45,1))',drawtext=fontfile='${font}':text='CareCore HMS Product Demo':x=(w-text_w)/2:y=342:fontsize=25:fontcolor=0xB9E7FF:alpha='if(lt(t,0.9),(t-0.45)/0.45,if(gt(t,2.5),(3-t)/0.5,1))',drawbox=x=390:y=410:w=500:h=2:color=0x00AEEF@0.75:t=fill,fade=t=in:st=0:d=0.3,fade=t=out:st=2.65:d=0.35[intro]`,
  `color=c=0x05070A:s=1280x720:d=${outroDuration},format=yuv420p,drawtext=fontfile='${fontBold}':text='ORION SOFT LIMITED':x=(w-text_w)/2:y=128:fontsize=45:fontcolor=white,drawtext=fontfile='${fontBold}':text='Book a Free Demo':x=(w-text_w)/2:y=230:fontsize=44:fontcolor=0xD4AF37,drawtext=fontfile='${font}':text='https\\://orionsoftlimited.com':x=(w-text_w)/2:y=330:fontsize=25:fontcolor=0xB9E7FF,drawtext=fontfile='${font}':text='orionsoftlimited@gmail.com':x=(w-text_w)/2:y=375:fontsize=25:fontcolor=white,drawtext=fontfile='${font}':text='+234-816-957-7059':x=(w-text_w)/2:y=420:fontsize=25:fontcolor=white,drawbox=x=420:y=500:w=440:h=62:color=0xD4AF37@0.95:t=fill,drawtext=fontfile='${fontBold}':text='SCHEDULE YOUR DEMO':x=(w-text_w)/2:y=518:fontsize=25:fontcolor=black,fade=t=in:st=0:d=0.35,fade=t=out:st=${outroDuration - 0.45}:d=0.45[outro]`,
  "[intro][mainv][outro]concat=n=3:v=1:a=0[vcat]",
  `[vcat]subtitles='${subtitlePath}':force_style='FontName=Arial,FontSize=12,PrimaryColour=&H00FFFFFF,OutlineColour=&HAA000000,BackColour=&H88000000,BorderStyle=4,Outline=1,Shadow=0,MarginV=22'[vout]`,
  `[orig][voice][music]amix=inputs=3:duration=longest,volume=3,atrim=0:${finalDuration},afade=t=out:st=${(finalDuration - 1).toFixed(3)}:d=1[aout]`,
].join(";");

run([
  "-i", source,
  "-i", source,
  "-i", voiceMix,
  "-i", music,
  "-filter_complex", filter,
  "-map", "[vout]",
  "-map", "[aout]",
  "-c:v", "libx264",
  "-preset", "slow",
  "-crf", "20",
  "-pix_fmt", "yuv420p",
  "-c:a", "aac",
  "-b:a", "160k",
  "-movflags", "+faststart",
  "-y",
  master,
], "Rendering premium master");

const exports = [
  ["carecore-premium-website.mp4", "scale=1280:720", "26", "1200k", "96k"],
  ["carecore-premium-linkedin.mp4", "scale=1280:720", "23", "2200k", "128k"],
  ["carecore-premium-facebook.mp4", "scale=1280:720", "24", "2000k", "128k"],
  ["carecore-premium-youtube.mp4", "scale=1920:1080", "21", "4500k", "160k"],
];

for (const [name, vf, crf, maxrate, audio] of exports) {
  run([
    "-i", master,
    "-vf", vf,
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", crf,
    "-maxrate", maxrate,
    "-bufsize", String(Number.parseInt(maxrate) * 2) + "k",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", audio,
    "-movflags", "+faststart",
    "-y",
    path.join(out, name),
  ], `Exporting ${name}`);
}

const verticalVf = [
  "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:2,eq=brightness=-0.08:saturation=0.85[bg]",
  "[0:v]scale=1000:-2[fg]",
  "[bg][fg]overlay=(W-w)/2:430,drawtext=fontfile='C\\:/Windows/Fonts/arialbd.ttf':text='CareCore HMS':x=(w-text_w)/2:y=220:fontsize=66:fontcolor=white,drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='Hospital management by Orion Soft Limited':x=(w-text_w)/2:y=302:fontsize=32:fontcolor=0xB9E7FF,drawtext=fontfile='C\\:/Windows/Fonts/arialbd.ttf':text='Book a Free Demo':x=(w-text_w)/2:y=1450:fontsize=50:fontcolor=0xD4AF37"
].join(";");

for (const [name, crf, maxrate] of [
  ["carecore-premium-instagram-reels.mp4", "24", "2600k"],
  ["carecore-premium-tiktok.mp4", "24", "2600k"],
]) {
  run([
    "-i", master,
    "-filter_complex", verticalVf,
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", crf,
    "-maxrate", maxrate,
    "-bufsize", "5200k",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    "-y",
    path.join(out, name),
  ], `Exporting ${name}`);
}

copyFileSync(path.join(out, "carecore-premium-website.mp4"), path.join(root, "public", "assets", "carecore", "demo-premium-website.mp4"));
console.log("\nDone. Premium video exports are in public/assets/carecore/video-edit/exports.");
