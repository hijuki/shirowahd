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
    // Mode Paksa 1080p + Custom FPS (60 / 90 / 120 FPS):
    // 1. Skala otomatis ke 1080p (jika potret/status WA 9:16 -> 1080x1920; lanskap 16:9 -> 1920x1080)
    // 2. Lanczos high-order scaling + unsharp filter (anti-blur kompresi WhatsApp)
    // 3. Paksa FPS konstan (CFR) sesuai parameter input (misal 90 FPS)
    // 4. H.264 High Profile Level 5.1 (standar industri untuk 1080p high refresh rate 90Hz/120Hz)
    // 5. CRF 17 (visually lossless), preset fast, audio AAC 192k stereo
    // 6. Faststart moov atom di awal file untuk streaming instant di status WA
    const vf = [
        `scale='if(gte(ih,iw),1080,-2)':'if(gte(ih,iw),-2,1080)':flags=lanczos`,
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
        '-crf', '17',
        '-preset', 'fast',
        '-sn',
        '-profile:v', 'high',
        '-level', '5.1',
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

    const isVideo = m.isVideo || (m.quoted && (m.quoted.isVideo || m.quoted.type === 'videoMessage' || String(m.quoted.mimetype || '').startsWith('video')));
    const isDocVideo = (m.type === 'documentMessage' && String(m.message?.documentMessage?.mimetype || '').startsWith('video')) ||
                      (m.quoted && (m.quoted.type === 'documentMessage' || String(m.quoted.mimetype || '').startsWith('video')));

    if (!isVideo && !isDocVideo) {
        return m.reply(
            `🎬 *CONVERT STATUS WA 1080P (CUSTOM FPS)*\n\n` +
            `> Balas atau kirim video/dokumen MP4 lalu ketik:\n` +
            `• \`${m.prefix || '.'}convertsw 90\` _(Paksa 90 FPS 1080p - Rekomendasi)_\n` +
            `• \`${m.prefix || '.'}convertsw 60\` _(Paksa 60 FPS 1080p)_\n` +
            `• \`${m.prefix || '.'}convertsw 120\` _(Paksa 120 FPS 1080p Ultra)_\n` +
            `• \`${m.prefix || '.'}convertsw\` _(Default 90 FPS 1080p)_\n\n` +
            `*Fitur Unggulan:*\n` +
            `• Paksa Resolusi : 1080p Full HD (Lanczos Scaler)\n` +
            `• Refresh Rate   : High FPS (Smooth 60/90/120Hz)\n` +
            `• Encoding       : H.264 High Profile Level 5.1 (CRF 17)\n` +
            `• Anti Buram     : Unsharp Masking filter untuk WhatsApp Status`
        );
    }

    // Parse FPS dari argumen user (contoh: .convertsw 90 atau .convertsw 60)
    let targetFps = 90;
    const rawArg = (args && args[0]) || (text && text.trim().split(/\s+/)[0]) || '';
    const parsedFps = parseInt(rawArg, 10);
    if (parsedFps && !isNaN(parsedFps) && parsedFps >= 24 && parsedFps <= 144) {
        targetFps = parsedFps;
    }

    if (typeof m.react === 'function') await m.react('⏳');

    const tempDir = os.tmpdir();
    const ts = Date.now();
    const inPath = path.join(tempDir, `csw_in_${ts}.mp4`);
    const outPath = path.join(tempDir, `csw_out_${ts}.mp4`);

    try {
        const videoBuffer = (await m.quoted?.download?.()) || (await m.download?.());

        if (!videoBuffer || !videoBuffer.length) {
            if (typeof m.react === 'function') await m.react('❌');
            return m.reply('❌ *GAGAL*\n\n> Gagal mengunduh file media. Coba kirim ulang videonya.');
        }

        if (videoBuffer.length > 150 * 1024 * 1024) {
            if (typeof m.react === 'function') await m.react('❌');
            return m.reply('❌ *FILE TERLALU BESAR*\n\n> Maksimal ukuran video adalah 150 MB.');
        }

        fs.writeFileSync(inPath, videoBuffer);
        const inputSize = formatSize(videoBuffer.length);

        await reencodeVideoHD(inPath, outPath, targetFps);

        if (!fs.existsSync(outPath) || fs.statSync(outPath).size === 0) {
            throw new Error('Gagal merender video 1080p untuk status WA.');
        }

        const videoDuration = await getVideoDuration(outPath);
        const videoInfo = await getVideoInfo(outPath);
        const outStats = fs.statSync(outPath);
        const outputSize = formatSize(outStats.size);
        const outBuffer = fs.readFileSync(outPath);

        const resText = videoInfo.width && videoInfo.height ? `${videoInfo.width}x${videoInfo.height} (1080p)` : '1080p Ultra HD';

        await client.sendMessage(
            m.chat,
            {
                video: outBuffer,
                mimetype: 'video/mp4',
                fileName: `status_${targetFps}fps_${ts}.mp4`,
                caption:
                    `✅ *CONVERT STATUS WA BERHASIL*\n\n` +
                    `• Resolusi    : ${resText}\n` +
                    `• Frame Rate  : ${targetFps} FPS Smooth (Level 5.1)\n` +
                    `• Kualitas    : CRF 17 (Ultra HD Lanczos Sharpened)\n` +
                    `• Audio       : AAC 192kbps Stereo\n` +
                    `• Ukuran File : ${outputSize} (Input: ${inputSize})\n` +
                    `• Durasi      : ${videoDuration > 0 ? `${videoDuration} Detik` : '60 Detik'}\n\n` +
                    `_Video sudah dipaksa ke resolusi 1080p & ${targetFps} FPS dengan parameter anti-buram kompresi WhatsApp._`,
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
