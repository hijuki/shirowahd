import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const FFMPEG_BIN = fs.existsSync('/usr/bin/ffmpeg') ? '/usr/bin/ffmpeg' : 'ffmpeg';
const FFPROBE_BIN = fs.existsSync('/usr/bin/ffprobe') ? '/usr/bin/ffprobe' : 'ffprobe';

const pluginConfig = {
    name: 'convertsw',
    alias: ['swconvert', 'statuswa', 'swvideo', 'swhd', 'convertsw90', 'sw90'],
    category: 'convert',
    description: 'Convert video status WhatsApp 1080p Ultra HD (Support custom 60/90/120 FPS)',
    usage: '.convertsw [fps] (reply / kirim video / dokumen mp4)',
    example: '.convertsw 90',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 2,
    isEnabled: true
};

function formatSize(bytes) {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
}

function extractMediaContent(m) {
    // Cari pesan video / dokumen dari direct message atau quoted message
    const msg = m.quoted ? (m.quoted.message || m.quoted) : (m.message || m);
    if (!msg) return null;

    // Normalisasi jika terbungkus
    const unwrap = (obj) => {
        if (!obj) return null;
        if (obj.ephemeralMessage?.message) return unwrap(obj.ephemeralMessage.message);
        if (obj.viewOnceMessage?.message) return unwrap(obj.viewOnceMessage.message);
        if (obj.viewOnceMessageV2?.message) return unwrap(obj.viewOnceMessageV2.message);
        if (obj.viewOnceMessageV2Extension?.message) return unwrap(obj.viewOnceMessageV2Extension.message);
        if (obj.documentWithCaptionMessage?.message) return unwrap(obj.documentWithCaptionMessage.message);
        return obj;
    };

    const target = unwrap(msg);
    if (!target) return null;

    if (target.videoMessage) {
        return { content: target.videoMessage, type: 'video' };
    }

    if (target.documentMessage) {
        const mime = (target.documentMessage.mimetype || '').toLowerCase();
        const name = (target.documentMessage.fileName || '').toLowerCase();
        if (
            mime.startsWith('video/') ||
            mime === 'application/mp4' ||
            name.endsWith('.mp4') ||
            name.endsWith('.mkv') ||
            name.endsWith('.mov') ||
            name.endsWith('.webm')
        ) {
            return { content: target.documentMessage, type: 'document' };
        }
    }

    if (m.isVideo || m.quoted?.isVideo) {
        const directContent = target.videoMessage || target;
        return { content: directContent, type: 'video' };
    }

    return null;
}

async function downloadMediaToDisk(m, destPath) {
    // 1. Coba downloadContentFromMessage dari pustaka baileys (hillz)
    const media = extractMediaContent(m);
    if (media && media.content) {
        try {
            const { downloadContentFromMessage } = await import('hillz');
            const stream = await downloadContentFromMessage(media.content, media.type);
            const writeStream = fs.createWriteStream(destPath);
            await new Promise((resolve, reject) => {
                stream.pipe(writeStream);
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
                stream.on('error', reject);
            });
            if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
                return true;
            }
        } catch (e) {
            console.warn('[convertsw] downloadContentFromMessage fallback to m.download:', e.message);
        }
    }

    // 2. Coba m.quoted.download() atau m.download()
    try {
        const buf = (await m.quoted?.download?.()) || (await m.download?.());
        if (buf && buf.length > 1000) {
            fs.writeFileSync(destPath, buf);
            return true;
        }
    } catch (e) {
        console.error('[convertsw] m.download failed:', e.message);
    }

    return false;
}

async function getVideoDuration(filePath) {
    try {
        const { stdout } = await execFileAsync(FFPROBE_BIN, [
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            filePath
        ]);
        const duration = Math.round(parseFloat(stdout.trim()));
        return isNaN(duration) ? 0 : duration;
    } catch {
        return 0;
    }
}

async function getVideoInfo(filePath) {
    try {
        const { stdout } = await execFileAsync(FFPROBE_BIN, [
            '-v', 'error',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=width,height,r_frame_rate,avg_frame_rate',
            '-of', 'json',
            filePath
        ]);
        const data = JSON.parse(stdout);
        const stream = data?.streams?.[0] || {};
        return {
            width: stream.width || 0,
            height: stream.height || 0
        };
    } catch {
        return { width: 0, height: 0 };
    }
}

async function reencodeVideoHD(inputPath, outputPath, targetFps = 90) {
    const isAuto = !targetFps || targetFps === 'auto';
    const vf = isAuto ? [
        'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        'unsharp=3:3:0.8:3:3:0.0'
    ].join(',') : [
        `scale='if(gte(ih,iw),1080,-2)':'if(gte(ih,iw),-2,1080)':flags=lanczos`,
        `scale=trunc(iw/2)*2:trunc(ih/2)*2`,
        `unsharp=3:3:0.8:3:3:0.0`,
        `fps=${targetFps}`
    ].join(',');

    await execFileAsync(FFMPEG_BIN, [
        '-y',
        '-i', inputPath,
        '-t', '60',
        '-threads', '0',
        '-vf', vf,
        '-c:v', 'libx264',
        '-crf', '20',
        '-preset', 'fast',
        '-sn',
        '-profile:v', 'high',
        '-level', isAuto ? '4.1' : '5.1',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-ar', '44100',
        '-ac', '2',
        '-movflags', '+faststart',
        '-avoid_negative_ts', 'make_zero',
        outputPath
    ], { timeout: 240000 });
}

async function handler(m, { sock, conn, args, text }) {
    const client = sock || conn;

    const media = extractMediaContent(m);
    if (!media) {
        return m.reply(
            `🎬 *CONVERT STATUS WA (CUSTOM PRESET)*\n\n` +
            `> Balas (reply) video/dokumen MP4 lalu ketik:\n` +
            `• \`${m.prefix || '.'}convertsw auto\` _(Mode Default / Asli - Cepat)_\n` +
            `• \`${m.prefix || '.'}convertsw 90\` _(Paksa 90 FPS 1080p - Rekomendasi)_\n` +
            `• \`${m.prefix || '.'}convertsw 60\` _(Paksa 60 FPS 1080p)_\n` +
            `• \`${m.prefix || '.'}convertsw 120\` _(Paksa 120 FPS 1080p Ultra)_\n` +
            `• \`${m.prefix || '.'}convertsw\` _(Default 90 FPS 1080p)_\n\n` +
            `*Catatan:*\n` +
            `Pastikan kamu me-reply/membalas video yang ingin di-convert!`
        );
    }

    // Parse FPS dari argumen user (contoh: .convertsw auto, .convertsw 90, dll)
    const rawArg = ((args && args[0]) || (text && text.trim().split(/\s+/)[0]) || '').toLowerCase();
    const isAuto = ['auto', 'default', 'asli', 'ori', 'original'].includes(rawArg);
    let targetFps = isAuto ? 'auto' : 90;
    const parsedFps = parseInt(rawArg, 10);
    if (!isAuto && parsedFps && !isNaN(parsedFps) && parsedFps >= 24 && parsedFps <= 144) {
        targetFps = parsedFps;
    }

    if (typeof m.react === 'function') await m.react('⏳');
    const prosesText = isAuto
        ? `⏳ *Sedang memproses video ke Mode Default (Resolusi & FPS Asli)...*`
        : `⏳ *Sedang memproses video ke 1080p (${targetFps} FPS)...*`;
    await m.reply(`${prosesText}\n\n_Mohon tunggu sebentar, video sedang di-render dengan filter anti-buram._`);

    const tempDir = os.tmpdir();
    const ts = Date.now();
    const inPath = path.join(tempDir, `csw_in_${ts}.mp4`);
    const outPath = path.join(tempDir, `csw_out_${ts}.mp4`);

    try {
        console.log(`[convertsw] Downloading media for chat ${m.chat}...`);
        const downloaded = await downloadMediaToDisk(m, inPath);

        if (!downloaded || !fs.existsSync(inPath)) {
            if (typeof m.react === 'function') await m.react('❌');
            return m.reply('❌ *GAGAL*\n\n> Gagal mengunduh file video. Pastikan video belum kedaluwarsa dan coba kirim ulang.');
        }

        const inStats = fs.statSync(inPath);
        if (inStats.size > 200 * 1024 * 1024) {
            if (typeof m.react === 'function') await m.react('❌');
            return m.reply('❌ *FILE TERLALU BESAR*\n\n> Maksimal ukuran video adalah 200 MB.');
        }

        const inputSize = formatSize(inStats.size);
        console.log(`[convertsw] Encoding video (${inputSize}) to 1080p @ ${targetFps}fps...`);

        await reencodeVideoHD(inPath, outPath, targetFps);

        if (!fs.existsSync(outPath) || fs.statSync(outPath).size === 0) {
            throw new Error('Gagal merender video 1080p untuk status WA.');
        }

        const videoDuration = await getVideoDuration(outPath);
        const videoInfo = await getVideoInfo(outPath);
        const outStats = fs.statSync(outPath);
        const outputSize = formatSize(outStats.size);

        console.log(`[convertsw] Success encoded! Output size: ${outputSize}, duration: ${videoDuration}s`);

        const resText = videoInfo.width && videoInfo.height ? `${videoInfo.width}x${videoInfo.height}` : (isAuto ? 'Resolusi Asli' : '1080p Ultra HD');
        const fpsText = isAuto ? 'FPS Asli (CFR Optimized)' : `${targetFps} FPS Smooth (Level 5.1)`;

        await client.sendMessage(
            m.chat,
            {
                video: { url: outPath },
                mimetype: 'video/mp4',
                fileName: `status_${targetFps}fps_${ts}.mp4`,
                caption:
                    `✅ *CONVERT STATUS WA BERHASIL*\n\n` +
                    `• Mode        : ${isAuto ? 'Default (Original Auto)' : '1080p Forced'}\n` +
                    `• Resolusi    : ${resText}\n` +
                    `• Frame Rate  : ${fpsText}\n` +
                    `• Kualitas    : CRF 20 (Anti-Blur WhatsApp Status)\n` +
                    `• Audio       : AAC 192kbps Stereo\n` +
                    `• Ukuran File : ${outputSize} (Input: ${inputSize})\n` +
                    `• Durasi      : ${videoDuration > 0 ? `${videoDuration} Detik` : '60 Detik'}\n\n` +
                    `_Video siap diupload ke Status WhatsApp tanpa buram & mulus._`,
                gifPlayback: false,
                ptv: false
            },
            { quoted: m }
        );

        if (typeof m.react === 'function') await m.react('✅');

    } catch (error) {
        console.error('[convertsw]', error);
        if (typeof m.react === 'function') await m.react('❌');
        await m.reply(`❌ *ERROR*\n\n> Terjadi kesalahan: ${error.message?.slice(0, 150)}`);
    } finally {
        if (fs.existsSync(inPath)) try { fs.unlinkSync(inPath); } catch {}
        if (fs.existsSync(outPath)) try { fs.unlinkSync(outPath); } catch {}
    }
}

export { pluginConfig as config, handler };
