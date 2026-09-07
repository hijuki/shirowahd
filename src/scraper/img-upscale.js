import axios from "axios";
import FormData from "form-data";
import fs from "fs";

async function upload(filePath) {
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));
  form.append("type", 13);
  form.append("scaleRadio", 2);
  const headers = {
    ...form.getHeaders(),
    accept: "application/json, text/plain, */*",
    origin: "https://imglarger.com",
    referer: "https://imglarger.com/",
    "user-agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36",
  };
  const { data } = await axios.post("https://photoai.imglarger.com/api/PhoAi/Upload", form, { headers });
  return data.data;
}

async function get(code) {
  const headers = {
    accept: "application/json, text/plain, */*",
    "content-type": "application/json",
    origin: "https://imglarger.com",
    referer: "https://imglarger.com/",
    "user-agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36",
  };
  let retries = 30;
  while (retries > 0) {
    const { data } = await axios.post("https://photoai.imglarger.com/api/PhoAi/Info", { code }, { headers });
    if (data.data?.status === 1) return data.data;
    if (data.data?.status === 3) throw new Error("Upscale failed");
    retries--;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Timeout waiting for upscale");
}

async function imgUpscale(filePath) {
  const code = await upload(filePath);
  const result = await get(code);
  return { status: true, downloadUrl: result.downloadUrl || result.url };
}

export { imgUpscale };
