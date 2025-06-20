import express from 'express'; // Framework Express.js untuk membangun server
import dotenv from 'dotenv'; // Memuat variabel lingkungan dari file .env
import multer from 'multer'; // Middleware untuk menangani unggahan file

import fs from 'fs'; // Modul sistem file Node.js
import path from 'path'; // Modul path Node.js

// Mengimpor komponen library Google Gemini
import { createPartFromUri, createUserContent, GoogleGenAI } from '@google/genai';

// --- Pengaturan Aplikasi ---
dotenv.config(); // Memuat variabel lingkungan

// Menginisialisasi aplikasi Express.js
const app = express();

// Menambahkan middleware untuk mengurai body permintaan JSON
app.use(express.json());

// --- Pengaturan API Gemini ---
// Menginisialisasi klien GoogleGenAI dengan kunci API
const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY
});

// --- Pengaturan Unggahan File ---
// Mengonfigurasi Multer untuk unggahan file, menyimpan file di direktori 'uploads/'
const upload = multer({
  dest: 'uploads/'
});

// --- Endpoint API ---

/**
 * POST /generate-text
 * Menghasilkan teks berdasarkan prompt teks menggunakan model Gemini.
 */
app.post('/generate-text', async (req, res) => {
  const { prompt } = req.body;

  // Memeriksa apakah prompt disediakan
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt diperlukan.' });
  }

  try {
    // Memanggil API Gemini untuk menghasilkan konten dari prompt teks
    const result = await genAI.models.generateContent({
      model: 'gemini-2.0-flash', // Menentukan model
      contents: prompt
    });

    console.log('Output Teks yang Dihasilkan:', result.text);

    res.json({
      output: result.text
    });
  } catch (e) {
    console.error('Error menghasilkan teks:', e);
    res.status(500).json({
      error: e.message
    });
  }
});

/**
 * POST /generate-from-image
 * Menghasilkan deskripsi teks atau analisis berdasarkan gambar yang diunggah dan prompt teks opsional.
 * Menggunakan middleware Multer untuk menangani unggahan file tunggal bernama 'image'.
 */
app.post('/generate-from-image', upload.single('image'), async (req, res) => {
  // Prompt default jika tidak disediakan
  const { prompt = "Jelaskan gambar yang diunggah ini." } = req.body;

  // Memeriksa apakah file diunggah
  if (!req.file) {
    return res.status(400).json({ error: 'File gambar diperlukan.' });
  }

  try {
    // Membaca file gambar yang diunggah
    const image = await genAI.files.upload({
      file: req.file.path, // Path ke file sementara
      config: {
        mimeType: req.file.mimetype // Tipe MIME file
      }
    });

    // Membuat bagian konten untuk prompt dan gambar
    const contents = [
      createUserContent([
        prompt, // Prompt teks
        createPartFromUri(image.uri, image.mimeType) // Bagian gambar dari URI file yang diunggah
      ]),
    ];

    // Memanggil API Gemini untuk menghasilkan konten dari prompt dan gambar
    const result = await genAI.models.generateContent({
      model: 'gemini-2.0-flash', // Menentukan model
      contents: contents,
    });

    console.log('Output Deskripsi Gambar yang Dihasilkan:', result.text);

    res.json({ output: result.text });
  } catch (error) {
    console.error("Error menghasilkan konten dari gambar:", error);
    res.status(500).json({ error: error.message });
  } finally {
    // Membersihkan file sementara yang diunggah
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

/**
 * POST /generate-from-document
 * Menghasilkan deskripsi teks atau analisis berdasarkan dokumen yang diunggah dan prompt teks opsional.
 * Menggunakan middleware Multer untuk menangani unggahan file tunggal bernama 'document'.
 */
app.post('/generate-from-document', upload.single('document'), async (req, res) => {
  // Prompt default jika tidak disediakan
  const { prompt = "Jelaskan dokumen yang diunggah ini." } = req.body;

  // Memeriksa apakah file diunggah
  if (!req.file) {
    return res.status(400).json({ error: 'File dokumen diperlukan.' });
  }

  try {
    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath); // Membaca konten file ke dalam buffer
    const base64Data = buffer.toString('base64'); // Mengonversi buffer ke string Base64
    const mimeType = req.file.mimetype; // Mendapatkan tipe MIME

    // Membuat bagian data inline untuk dokumen
    const documentPart = {
      inlineData: { data: base64Data, mimeType }
    };

    console.log('Bagian Dokumen Dibuat:', { mimeType, dataLength: base64Data.length });

    // Membuat bagian konten untuk prompt dan dokumen
    const contents = [
      createUserContent([
        prompt, // Prompt teks
        documentPart // Bagian dokumen
      ]),
    ];

    // Memanggil API Gemini untuk menghasilkan konten dari prompt dan dokumen
    const result = await genAI.models.generateContent({
      model: 'gemini-2.0-flash', // Menentukan model
      contents: contents,
    });

    console.log('Output Deskripsi Dokumen yang Dihasilkan:', result.text);

    res.json({ output: result.text });
  } catch (error) {
    console.error("Error menghasilkan konten dari dokumen:", error);
    res.status(500).json({
      error: error.message
    });
  } finally {
    // Membersihkan file sementara yang diunggah
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

/**
 * POST /generate-from-audio
 * Menghasilkan deskripsi teks atau analisis berdasarkan file audio yang diunggah dan prompt teks opsional.
 * Menggunakan middleware Multer untuk menangani unggahan file tunggal bernama 'audio'.
 */
app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
  // Prompt default jika tidak disediakan
  const { prompt = "Jelaskan audio yang diunggah ini." } = req.body;

  // Memeriksa apakah file diunggah
  if (!req.file) {
    return res.status(400).json({ error: 'File audio diperlukan.' });
  }

  try {
    const audioBuffer = fs.readFileSync(req.file.path); // Membaca konten file ke dalam buffer
    const base64Audio = audioBuffer.toString('base64'); // Mengonversi buffer ke string Base64
    const mimeType = req.file.mimetype; // Mendapatkan tipe MIME

    // Membuat bagian data inline untuk audio
    const audioPart = {
      inlineData: { data: base64Audio, mimeType }
    };

    console.log('Bagian Audio Dibuat:', { mimeType, dataLength: base64Audio.length });

    // Membuat bagian konten untuk prompt dan audio
    const contents = [
      createUserContent([
        prompt, // Prompt teks
        audioPart // Bagian audio
      ]),
    ];

    // Memanggil API Gemini untuk menghasilkan konten dari prompt dan audio
    const result = await genAI.models.generateContent({
      model: 'gemini-2.0-flash', // Menentukan model
      contents: contents,
    });

    console.log('Output Deskripsi Audio yang Dihasilkan:', result.text);

    res.json({ output: result.text });
  } catch (error) {
    console.error("Error menghasilkan konten dari audio:", error);
    res.status(500).json({ error: error.message });
  } finally {
    // Membersihkan file sementara yang diunggah
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});


// --- Server Startup ---
// Menggunakan port dari variabel lingkungan atau default ke 3000
const PORT = 3000;

// Menjalankan server pada port yang ditentukan
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});
