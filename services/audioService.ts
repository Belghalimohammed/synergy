// Function to decode base64 string to Uint8Array
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Function to decode raw PCM audio data into an AudioBuffer
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let onPlaybackEndCallback: (() => void) | null = null;
let browserUtterance: SpeechSynthesisUtterance | null = null;

// Lazily creates and returns a singleton AudioContext
const getAudioContext = (): AudioContext => {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  return audioContext;
};

// Plays AI-generated audio from a base64 string
export const playAIAudioFromBase64 = async (base64Audio: string, onPlaybackEnd: () => void): Promise<void> => {
  stopAllAudio(); // Stop any currently playing audio
  
  const ctx = getAudioContext();

  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
  
  const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
  
  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination);
  source.start();
  
  currentSource = source;
  onPlaybackEndCallback = onPlaybackEnd;

  source.onended = () => {
    if (currentSource === source) {
      currentSource = null;
      if (onPlaybackEndCallback) {
        onPlaybackEndCallback();
        onPlaybackEndCallback = null;
      }
    }
  };
};

// Plays audio using the browser's native Speech Synthesis API
export const speakBrowserTTS = (
    text: string, 
    onBoundary: (e: SpeechSynthesisEvent) => void,
    onEnd: () => void
): void => {
    stopAllAudio(); // Stop any other audio first
    
    if (!('speechSynthesis' in window)) {
        console.error("Browser does not support Speech Synthesis.");
        alert("Sorry, your browser does not support this feature.");
        onEnd();
        return;
    }

    browserUtterance = new SpeechSynthesisUtterance(text);
    browserUtterance.onboundary = onBoundary;
    browserUtterance.onend = () => {
        if (browserUtterance) { // Check if it wasn't cancelled by stopAllAudio
            browserUtterance = null;
            onEnd();
        }
    };
    browserUtterance.onerror = (e) => {
        console.error("Speech Synthesis Error", e);
        browserUtterance = null;
        onEnd();
    };

    window.speechSynthesis.speak(browserUtterance);
};


// Stops any currently playing audio from either source
export const stopAllAudio = (): void => {
  // Stop AI audio (AudioContext)
  if (currentSource) {
    try {
        currentSource.stop();
    } catch (e) {
        // Ignore errors if the source has already stopped
    }
    currentSource = null;
  }
  if (onPlaybackEndCallback) {
    // onPlaybackEndCallback(); // onended event will handle this
    onPlaybackEndCallback = null;
  }
  
  // Stop Browser TTS (SpeechSynthesis)
  if (window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
    // The 'onend' event will fire naturally when we cancel.
    // We clear the utterance to prevent the original onEnd from running.
    browserUtterance = null; 
    window.speechSynthesis.cancel();
  }
};