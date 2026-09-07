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
    alias: ['swconvert', 'statuswa', 'swvideo'],
    category: 'convert',
    description: 'Convert video untuk status WhatsApp (Max 60 detik, Smooth & Kompatibel)',
    usage: '.convertsw (reply / kirim video / dokumen mp4)',
    example: '.convertsw',
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

async function reencodeVideo(inputPath, outputPath) {
    await execFileAsync(FFMPEG_BIN, [
        '-y',
        '-i', inputPath,
        '-t', '60',
        '-threads', '0',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-r', '30',
        '-c:v', 'libx264',
        '-crf', '23',
        '-preset', 'veryfast',
        '-sn',
        '-profile:v', 'baseline',
        '-level', '3.0',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        '-ac', '2',
        '-movflags', '+faststart',
        '-avoid_negative_ts', 'make_zero',
        outputPath
    ], { timeout: 120000 });
}

async function handler(m, { sock, conn }) {
    const client = sock || conn;

    const isVideo = m.isVideo || (m.quoted && (m.quoted.isVideo || m.quoted.type === 'videoMessage' || String(m.quoted.mimetype || '').startsWith('video')));
    const isDocVideo = (m.type === 'documentMessage' && String(m.message?.documentMessage?.mimetype || '').startsWith('video')) ||
                      (m.quoted && (m.quoted.type === 'documentMessage' || String(m.quoted.mimetype || '').startsWith('video')));

    if (!isVideo && !isDocVideo) {
        return m.reply(
            `🎬 *CONVERT VIDEO STATUS WA*\n\n` +
            `> Kirim atau balas video/dokumen MP4 lalu ketik \`${m.prefix || '.'}convertsw\`\n\n` +
            `• Batas Durasi : Max 60 Detik\n` +
            `• Format Target: H.264 Baseline (Kompatibel Status WA & iOS/Android)`
        );
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

        if (videoBuffer.length > 100 * 1024 * 1024) {
            if (typeof m.react === 'function') await m.react('❌');
            return m.reply('❌ *FILE TERLALU BESAR*\n\n> Maksimal ukuran video adalah 100 MB.');
        }

        fs.writeFileSync(inPath, videoBuffer);
        const inputSize = formatSize(videoBuffer.length);

        await reencodeVideo(inPath, outPath);

        if (!fs.existsSync(outPath) || fs.statSync(outPath).size === 0) {
            throw new Error('Gagal merender video untuk status WA.');
        }

        const videoDuration = await getVideoDuration(outPath);
        const outStats = fs.statSync(outPath);
        const outputSize = formatSize(outStats.size);
        const outBuffer = fs.readFileSync(outPath);

        await client.sendMessage(
            m.chat,
            {
                video: outBuffer,
                mimetype: 'video/mp4',
                fileName: `status_${ts}.mp4`,
                caption:
                    `✅ *CONVERT SUCCESS*\n\n` +
                    `• Input Size  : ${inputSize}\n` +
                    `• Output Size : ${outputSize}\n` +
                    `• Durasi Video: ${videoDuration > 0 ? `${videoDuration} Detik` : '60 Detik'}\n\n` +
                    `_Video sudah dioptimalkan dan siap di-upload ke Status WhatsApp._`,
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
