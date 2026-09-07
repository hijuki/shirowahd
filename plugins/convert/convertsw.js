import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execFileAsync = promisify(execFile);

const pluginConfig = {
    name: 'convertsw',
    alias: ['convertsw', 'swconvert'],
    category: 'convert',
    description: 'Convert video untuk status WhatsApp (Max 60 detik, Smooth)',
    usage: '.convertsw (reply video / dokumen mp4)',
    example: '.convertsw',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 15, 
    energi: 3,
    isEnabled: true
};

function getMediaType(m) {
    if (!m.quoted) return null;
    const msg = m.quoted.message;
    if (!msg) return null;

    if (  
        msg.videoMessage ||  
        msg.viewOnceMessage?.message?.videoMessage ||  
        msg.viewOnceMessageV2?.message?.videoMessage ||  
        msg.ephemeralMessage?.message?.videoMessage ||  
        m.quoted.isVideo  
    ) return 'video';

    const doc = msg.documentMessage;
    if (doc) {  
        const mime = (doc.mimetype || '').toLowerCase();
        const name = (doc.fileName || '').toLowerCase();
        if (  
            mime.startsWith('video/') ||  
            mime === 'application/mp4' ||  
            name.endsWith('.mp4') ||  
            name.endsWith('.mkv') ||  
            name.endsWith('.mov')  
        ) return 'document';
    }  

    return null;
}

async function downloadMediaToDisk(m, destPath) {
    try {
        const buf = await m.quoted.download();
        if (buf && buf.length > 1000) {
            fs.writeFileSync(destPath, buf);
            return true;
        }
    } catch {}
    return false;
}

function formatSize(bytes) {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
}

async function getVideoDuration(filePath) {
    try {
        const { stdout } = await execFileAsync('ffprobe', [
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
    await execFileAsync('ffmpeg', [  
        '-i', inputPath,  
        '-t', '60',              
        '-threads', '0',         
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-r', '30',
        '-c:v', 'libx264',  
        '-crf', '22',
        '-preset', 'ultrafast',
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
        '-y', outputPath  
    ], { timeout: 120000 });
}

async function handler(m, { sock, conn }) {
    const client = sock || conn;

    if (!m.quoted) {  
        return m.reply(  
            `🎬 *CONVERT VIDEO STATUS WA*\n\n` +  
            `Reply video atau dokumen MP4 lalu ketik:\n` +  
            `\`${m.prefix || '.'}convertsw\`\n\n` +  
            `• Batas Durasi: Max 60 Detik\n` +  
            `• Batas File: 250 MB`  
        );
    }  

    const mediaType = getMediaType(m);
    if (!mediaType) {  
        return m.reply('Format tidak valid. Harap reply video atau dokumen MP4.');
    }  

    if (typeof m.react === 'function') await m.react('⏳');

    const tmpDir = path.join(__dirname, '../../tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const ts = Date.now();
    const inPath = path.join(tmpDir, `csw_in_${ts}.mp4`);
    const outPath = path.join(tmpDir, `csw_out_${ts}.mp4`);

    try {  
        const successDownload = await downloadMediaToDisk(m, inPath);
        if (!successDownload || !fs.existsSync(inPath)) {  
            if (typeof m.react === 'function') await m.react('❌');
            return m.reply('Gagal mengunduh file media.');
        }  

        const inStats = fs.statSync(inPath);
        if (inStats.size > 250 * 1024 * 1024) {  
            if (typeof m.react === 'function') await m.react('❌');
            if (fs.existsSync(inPath)) fs.unlinkSync(inPath);
            return m.reply('Ukuran file terlalu besar. Batas maksimal adalah 250 MB.');
        }  

        const inputSize = formatSize(inStats.size);

        await reencodeVideo(inPath, outPath);
        if (!fs.existsSync(outPath)) throw new Error('Gagal merender video');

        const videoDuration = await getVideoDuration(outPath);
        const outStats = fs.statSync(outPath);
        const outputSize = formatSize(outStats.size);

        await client.sendMessage(  
            m.chat,  
            {  
                video: { url: outPath },  
                mimetype: 'video/mp4',  
                fileName: `status_${ts}.mp4`,  
                caption:  
                    `✅ *CONVERT SUCCESS*\n\n` +  
                    `• Input Size  : ${inputSize}\n` +  
                    `• Output Size : ${outputSize}\n` +  
                    `• Durasi Video: ${videoDuration > 0 ? `${videoDuration} Detik` : '60 Detik'}\n\n` +  
                    `Video siap dikirim ke status WhatsApp.`,  
                gifPlayback: false,  
                ptv: false  
            },  
            { quoted: m }  
        );

        if (typeof m.react === 'function') await m.react('✅');

    } catch (error) {  
        console.error('[convertsw]', error.message);
        if (typeof m.react === 'function') await m.react('❌');
        await m.reply(`Terjadi kesalahan: ${error.message?.slice(0, 150)}`);
    } finally {  
        if (fs.existsSync(inPath)) fs.unlinkSync(inPath);
        if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    }
}

export { pluginConfig as config, handler };
