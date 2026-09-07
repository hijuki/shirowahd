import axios from "axios";
import FormData from "form-data";
import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const API = "https://api.unwatermark.ai";
const WEB = "https://unblurimage.ai";
const RESOLUTION = "2k";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";

function randomProductSerial() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[crypto.randomInt(chars.length)];
  return out;
}

function extToMime(file) {
  const ext = path.extname(file).toLowerCase();
  const map = { ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm", ".mkv": "video/x-matroska" };
  return map[ext] || "application/octet-stream";
}

function baseHeaders(extra = {}) {
  return {
    accept: "*/*",
    origin: WEB,
    referer: WEB + "/",
    "user-agent": UA,
    "product-code": "067003",
    "product-serial": randomProductSerial(),
    "x-request-id": crypto.randomUUID(),
    ...extra,
  };
}

async function postForm(endpoint, fields) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  const res = await axios.post(API + endpoint, form, { headers: baseHeaders(form.getHeaders()), validateStatus: () => true });
  return { status: res.status, data: res.data };
}

async function checkStatus(taskId, maxRetries = 120) {
  for (let i = 0; i < maxRetries; i++) {
    const res = await axios.get(API + "/api/v1/async/tasks/" + taskId, {
      headers: baseHeaders(),
      validateStatus: () => true,
    });
    const task = res.data?.data;
    if (task?.status === "SUCCESS") return task;
    if (task?.status === "FAILED") throw new Error("Processing failed: " + (task.error || "unknown"));
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Timeout waiting for processing");
}

async function downloadResult(url, outputPath) {
  const res = await axios.get(url, { responseType: "arraybuffer", headers: { "user-agent": UA } });
  await fsp.writeFile(outputPath, Buffer.from(res.data));
  return outputPath;
}

async function unwatermarkVideo(inputPath) {
  const { status, data } = await postForm("/api/v1/async/video-unwatermark/upload", {
    file: fs.createReadStream(inputPath),
    resolution: RESOLUTION,
  });
  if (status !== 200 || !data?.data?.task_id) throw new Error("Upload failed: " + JSON.stringify(data));
  const task = await checkStatus(data.data.task_id);
  const outputUrl = task.output_url || task.result?.output_url;
  if (!outputUrl) throw new Error("No output URL in completed task");
  const outputPath = path.join(os.tmpdir(), "hillz_uw_" + Date.now() + ".mp4");
  await downloadResult(outputUrl, outputPath);
  return outputPath;
}

async function upscaleVideo(inputPath) {
  const { status, data } = await postForm("/api/v1/async/video-quality-enhancer/upload", {
    file: fs.createReadStream(inputPath),
    resolution: RESOLUTION,
  });
  if (status !== 200 || !data?.data?.task_id) throw new Error("Upload failed");
  const task = await checkStatus(data.data.task_id);
  const outputUrl = task.output_url || task.result?.output_url;
  if (!outputUrl) throw new Error("No output URL");
  const outputPath = path.join(os.tmpdir(), "hillz_hd_" + Date.now() + ".mp4");
  await downloadResult(outputUrl, outputPath);
  return outputPath;
}

export { unwatermarkVideo, upscaleVideo };
