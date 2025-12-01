import fs from 'fs';

// Simple placeholder controller that accepts an uploaded audio file and returns
// a mock transcription / translation. Replace with real STT + translation logic.
export const translateAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded');
    }

    // For now, we won't persist the file. We could read it if needed:
    const size = req.file.size || 0;

    // Mock transcription/translation result
    const mockedText = 'Placeholder transcription: user said they have a leaking tap.';

    return res.json({
      translated_text: mockedText,
      detected_language: 'en',
      file_size: size,
    });
  } catch (err) {
    console.error('translateAudio error', err);
    return res.status(500).send('Transcription error');
  }
};
