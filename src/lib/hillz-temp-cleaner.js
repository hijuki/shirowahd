import fs from 'fs'
import path from 'path'
import { logger } from './hillz-logger.js'
const CLEAN_INTERVAL = 30 * 60 * 1000
// Umur minimum sebelum berkas boleh dibuang. Sebelumnya TIDAK ADA ambang umur:
// setiap 30 menit SEMUA isi tmp/ dihapus tanpa melihat umur. Itu balapan nyata —
// konversi sticker/exif/video menulis berkas ke tmp/ lalu membacanya kembali
// beberapa detik kemudian, dan kalau pembersih kebetulan lewat di antara dua
// langkah itu, operasinya gagal dengan ENOENT tanpa sebab yang kelihatan.
const MIN_AGE = 10 * 60 * 1000
const TEMP_DIRS = ['temp', 'tmp']

let cleanerTimer = null

function startTempCleaner() {
    if (cleanerTimer) return

    cleanerTimer = setInterval(() => {
        let totalCleaned = 0
        const sekarang = Date.now()
        for (const dir of TEMP_DIRS) {
            const dirPath = path.join(process.cwd(), dir)
            if (!fs.existsSync(dirPath)) continue

            try {
                const files = fs.readdirSync(dirPath)
                for (const file of files) {
                    const berkas = path.join(dirPath, file)
                    try {
                        // Direktori dilewati: unlinkSync melempar EISDIR untuk
                        // direktori, dan galatnya dulu ditelan senyap sehingga
                        // sub-direktori menumpuk tanpa pernah terlihat.
                        const st = fs.statSync(berkas)
                        if (st.isDirectory()) continue
                        if (sekarang - st.mtimeMs < MIN_AGE) continue
                        fs.unlinkSync(berkas)
                        totalCleaned++
                    } catch { /* cleanup */ }
                }
            } catch { /* dir read */ }
        }
        if (totalCleaned > 0) {
            logger.system('temp', `cleaned ${totalCleaned} file(s)`)
        }
    }, CLEAN_INTERVAL)

    if (cleanerTimer.unref) cleanerTimer.unref()
    logger.success('temp', `Bakal bersih-bersih file tiap ${CLEAN_INTERVAL / 60000} menit (umur > ${MIN_AGE / 60000}m)`)
}

function stopTempCleaner() {
    if (cleanerTimer) {
        clearInterval(cleanerTimer)
        cleanerTimer = null
    }
}

export { startTempCleaner, stopTempCleaner }