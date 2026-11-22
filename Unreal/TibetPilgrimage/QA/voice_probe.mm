// Run by test_dialogue.py and test_voice_casting.py.
// Inspects role-matched Apple voice selection or renders configured utterances to offline PCM.
#import "../Source/TibetPilgrimage/Apple/TibetVoice.mm"
#include <cmath>
#include <cstdio>
#include <cstring>

int main(int argc, const char** argv)
{
    @autoreleasepool {
        if (argc == 4 && std::strcmp(argv[1], "--inspect") == 0)
        {
            const bool english = std::strcmp(argv[2], "en") == 0;
            TibetVoice::FVoiceSelection info{};
            if (!TibetVoice::InspectNativeVoice(argv[3], english, info)) return 3;
            std::printf("speaker=%s language=%s gender=%s pitch=%.2f rate=%.2f id=%s voice=%s\n",
                argv[3], info.Language, info.Gender, info.Pitch, info.RateMultiplier, info.VoiceId, info.VoiceName);
            return 0;
        }

        if (argc != 3 && argc != 4) return 2;
        const bool english = std::strcmp(argv[1], "en") == 0;
        const char* speaker = argc == 4 ? argv[2] : "oldLama";
        const char* utf8 = argc == 4 ? argv[3] : argv[2];

        TibetVoice::FVoiceSelection info{};
        auto* line = Utterance([NSString stringWithUTF8String:utf8], english, speaker, &info);
        if (!line) return 3;
        auto* synth = [[AVSpeechSynthesizer alloc] init];
        __block double energy = 0, seconds = 0;
        __block unsigned long long samples = 0;
        __block BOOL done = NO;
        [synth writeUtterance:line toBufferCallback:^(AVAudioBuffer* buffer) {
            AVAudioPCMBuffer* pcm = (AVAudioPCMBuffer*)buffer;
            if (!pcm.frameLength) { dispatch_async(dispatch_get_main_queue(), ^{done = YES;}); return; }
            for (unsigned int i = 0; i < pcm.frameLength; ++i)
            {
                double value;
                if (pcm.floatChannelData) value = pcm.floatChannelData[0][i * pcm.stride];
                else if (pcm.int16ChannelData) value = pcm.int16ChannelData[0][i * pcm.stride] / 32768.;
                else if (pcm.int32ChannelData) value = pcm.int32ChannelData[0][i * pcm.stride] / 2147483648.;
                else continue;
                energy += value * value;
                ++samples;
            }
            seconds += pcm.frameLength / pcm.format.sampleRate;
        }];
        const auto* until = [NSDate dateWithTimeIntervalSinceNow:20];
        while (!done && [until timeIntervalSinceNow] > 0)
            [[NSRunLoop mainRunLoop] runUntilDate:[NSDate dateWithTimeIntervalSinceNow:.05]];
        double rms = samples ? std::sqrt(energy / samples) : 0;
        std::printf("%s speaker=%s gender=%s id=%s language=%s pitch=%.2f duration=%.2fs rms=%.4f samples=%llu\n",
            argv[1], speaker, info.Gender, info.VoiceId, line.voice.language.UTF8String,
            info.Pitch, seconds, rms, samples);
        [synth release];
        return seconds > 2 && rms > .005 && samples > 20000 ? 0 : 1;
    }
}
