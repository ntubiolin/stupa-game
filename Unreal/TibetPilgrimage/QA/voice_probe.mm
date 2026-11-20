// Run by test_dialogue.py. Render the game's actual configured utterance to offline PCM on this Mac.
#import "../Source/TibetPilgrimage/Apple/TibetVoice.mm"
#include <cmath>
#include <cstdio>

int main(int argc, const char** argv)
{
    if (argc != 3) return 2;
    @autoreleasepool {
        auto* line = Utterance([NSString stringWithUTF8String:argv[2]], strcmp(argv[1], "en") == 0);
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
        double rms = samples ? sqrt(energy / samples) : 0;
        printf("%s language=%s duration=%.2fs rms=%.4f samples=%llu\n", argv[1],
            line.voice.language.UTF8String, seconds, rms, samples);
        [synth release];
        return seconds > 2 && rms > .005 && samples > 20000 ? 0 : 1;
    }
}
