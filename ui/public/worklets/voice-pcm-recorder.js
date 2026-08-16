/**
 * AudioWorkletProcessor that forwards raw mic PCM (Float32, mono) to the main thread.
 * Kept dependency-free (no bundler) since it runs in the isolated worklet global scope.
 */
class VoicePcmRecorderProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    const channel = input && input[0];
    if (channel && channel.length > 0) {
      // Copy — the underlying Float32Array buffer is reused by the audio engine.
      this.port.postMessage(channel.slice(0));
    }
    return true;
  }
}

registerProcessor('voice-pcm-recorder', VoicePcmRecorderProcessor);
