#if defined(PLATFORM_MAC) && PLATFORM_MAC
#include "Mac/MacSystemIncludes.h"
#endif
#import <AVFoundation/AVFoundation.h>
#include "../TibetVoice.h"

namespace
{
AVSpeechUtterance* Utterance(NSString* Text, bool English)
{
    AVSpeechUtterance* Line = [AVSpeechUtterance speechUtteranceWithString:Text];
    Line.voice = [AVSpeechSynthesisVoice voiceWithLanguage:English ? @"en-US" : @"zh-TW"];
    if (!Line.voice) return nil;
    Line.rate = AVSpeechUtteranceDefaultSpeechRate * .93f;
    Line.volume = .78f;
    return Line;
}
}

@interface TibetSpeechPlayer : NSObject<AVSpeechSynthesizerDelegate>
{
@public
    AVSpeechSynthesizer* Synth;
    AVSpeechUtterance* Active;
    TibetVoice::FWord Word;
    TibetVoice::FFinish Finish;
}
@end

@implementation TibetSpeechPlayer
- (id)init
{
    if ((self = [super init]))
    {
        Synth = [[AVSpeechSynthesizer alloc] init];
        Synth.delegate = self;
    }
    return self;
}
- (void)clear
{
    [Active release];
    Active = nil;
    Word = {};
    Finish = {};
}
- (void)speechSynthesizer:(AVSpeechSynthesizer*)sender willSpeakRangeOfSpeechString:(NSRange)range utterance:(AVSpeechUtterance*)line
{
    if (Active == line && Word) Word((int)range.location);
}
- (void)speechSynthesizer:(AVSpeechSynthesizer*)sender didFinishSpeechUtterance:(AVSpeechUtterance*)line
{
    if (Active != line) return;
    if (Finish) Finish();
    [self clear];
}
- (void)speechSynthesizer:(AVSpeechSynthesizer*)sender didCancelSpeechUtterance:(AVSpeechUtterance*)line
{
    [self speechSynthesizer:sender didFinishSpeechUtterance:line];
}
@end

namespace
{
// AVFoundation and its delegate live on the main queue. UE may request playback from its game thread.
TibetSpeechPlayer* Player()
{
    static TibetSpeechPlayer* Instance = [[TibetSpeechPlayer alloc] init];
    return Instance;
}
}

void TibetVoice::Speak(const char* Utf8, bool English, FWord OnWord, FFinish OnFinish)
{
    NSString* Text = [NSString stringWithUTF8String:Utf8];
    dispatch_async(dispatch_get_main_queue(), ^{
        auto* P = Player();
        [P clear];
        [P->Synth stopSpeakingAtBoundary:AVSpeechBoundaryImmediate];
        AVSpeechUtterance* Line = Utterance(Text, English);
        if (!Line) return; // The in-game subtitles retain their reading timer if a voice is unavailable.
        P->Active = [Line retain];
        P->Word = OnWord;
        P->Finish = OnFinish;
        [P->Synth speakUtterance:Line];
    });
}
void TibetVoice::Pause(bool Paused)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        auto* P = Player();
        if (!P->Active) return;
        if (Paused) [P->Synth pauseSpeakingAtBoundary:AVSpeechBoundaryImmediate];
        else [P->Synth continueSpeaking];
    });
}
void TibetVoice::Stop()
{
    dispatch_async(dispatch_get_main_queue(), ^{
        auto* P = Player();
        [P clear];
        [P->Synth stopSpeakingAtBoundary:AVSpeechBoundaryImmediate];
    });
}
