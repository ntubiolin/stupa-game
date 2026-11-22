#if defined(PLATFORM_MAC) && PLATFORM_MAC
#include "Mac/MacSystemIncludes.h"
#endif
#import <AVFoundation/AVFoundation.h>
#include "../TibetVoice.h"

#include <cstdio>
#include <cstring>

namespace
{
struct FRoleVoiceProfile
{
    bool bFemale = false;
    float Pitch = 0.88f;
    float RateMultiplier = 0.90f;
    const char* const* PreferredZh = nullptr;
    const char* const* PreferredEn = nullptr;
};

bool HasRolePrefix(const char* SpeakerId, const char* Prefix)
{
    if (!SpeakerId || !Prefix) return false;
    const size_t Len = std::strlen(Prefix);
    return std::strncmp(SpeakerId, Prefix, Len) == 0 &&
        (SpeakerId[Len] == '\0' || SpeakerId[Len] == '.' || SpeakerId[Len] == '_');
}

FRoleVoiceProfile ProfileForSpeaker(const char* SpeakerId)
{
    // Yeshe Tsogyal is the sole female speaker in the pilgrimage cast.
    static const char* const TsogyalZh[] = {"Meijia", "Flo", "Shelley", "Sandy", "Tingting", "Sinji", nullptr};
    static const char* const TsogyalEn[] = {"Samantha", "Moira", "Karen", "Tessa", "Flo", "Shelley", nullptr};

    // Distinct male voice orderings & prosody for the 9 male roles.
    static const char* const ElderLamaZh[] = {"Grandpa", "Reed", "Rocko", "Eddy", "Binbin", "Yunyang", nullptr};
    static const char* const ElderLamaEn[] = {"Grandpa", "Daniel", "Reed", "Arthur", "Aaron", "Rocko", "Eddy", "Ralph", nullptr};

    static const char* const VillageElderZh[] = {"Grandpa", "Rocko", "Reed", "Eddy", "Binbin", nullptr};
    static const char* const VillageElderEn[] = {"Grandpa", "Reed", "Daniel", "Rishi", "Rocko", "Eddy", "Ralph", nullptr};

    static const char* const AbbotZh[] = {"Reed", "Grandpa", "Rocko", "Eddy", "Binbin", nullptr};
    static const char* const AbbotEn[] = {"Rishi", "Daniel", "Reed", "Grandpa", "Arthur", "Aaron", "Eddy", nullptr};

    static const char* const GuruZh[] = {"Rocko", "Reed", "Grandpa", "Eddy", "Binbin", nullptr};
    static const char* const GuruEn[] = {"Daniel", "Rocko", "Reed", "Arthur", "Rishi", "Grandpa", "Aaron", "Eddy", nullptr};

    static const char* const KingZh[] = {"Rocko", "Reed", "Eddy", "Grandpa", "Binbin", nullptr};
    static const char* const KingEn[] = {"Daniel", "Reed", "Rocko", "Aaron", "Arthur", "Eddy", "Ralph", nullptr};

    static const char* const MessengerZh[] = {"Eddy", "Reed", "Rocko", "Grandpa", "Binbin", nullptr};
    static const char* const MessengerEn[] = {"Rishi", "Eddy", "Reed", "Daniel", "Aaron", "Rocko", nullptr};

    static const char* const EnvoyZh[] = {"Reed", "Rocko", "Eddy", "Grandpa", "Binbin", nullptr};
    static const char* const EnvoyEn[] = {"Reed", "Daniel", "Aaron", "Arthur", "Rocko", "Eddy", nullptr};

    static const char* const KeeperZh[] = {"Grandpa", "Reed", "Rocko", "Eddy", "Binbin", nullptr};
    static const char* const KeeperEn[] = {"Reed", "Grandpa", "Daniel", "Rocko", "Arthur", "Eddy", nullptr};

    static const char* const HerderZh[] = {"Eddy", "Rocko", "Reed", "Grandpa", "Binbin", nullptr};
    static const char* const HerderEn[] = {"Eddy", "Rocko", "Reed", "Daniel", "Aaron", "Ralph", nullptr};

    if (SpeakerId && std::strcmp(SpeakerId, "yesheTsogyal") == 0)
        return {true, 1.05f, 0.92f, TsogyalZh, TsogyalEn};
    if (SpeakerId && std::strcmp(SpeakerId, "oldLama") == 0)
        return {false, 0.80f, 0.86f, ElderLamaZh, ElderLamaEn};
    if (SpeakerId && std::strcmp(SpeakerId, "villageElder") == 0)
        return {false, 0.80f, 0.86f, VillageElderZh, VillageElderEn};
    if (SpeakerId && std::strcmp(SpeakerId, "shantarakshita") == 0)
        return {false, 0.80f, 0.86f, AbbotZh, AbbotEn};
    if (HasRolePrefix(SpeakerId, "guruVision") || (SpeakerId && std::strcmp(SpeakerId, "skyGuru") == 0))
        return {false, 0.84f, 0.89f, GuruZh, GuruEn};
    if (SpeakerId && std::strcmp(SpeakerId, "trisongDetsen") == 0)
        return {false, 0.84f, 0.89f, KingZh, KingEn};
    if (SpeakerId && std::strcmp(SpeakerId, "messenger") == 0)
        return {false, 0.98f, 0.96f, MessengerZh, MessengerEn};
    if (SpeakerId && std::strcmp(SpeakerId, "envoyLeader") == 0)
        return {false, 0.90f, 0.91f, EnvoyZh, EnvoyEn};
    if (SpeakerId && std::strcmp(SpeakerId, "palaceKeeper") == 0)
        return {false, 0.88f, 0.89f, KeeperZh, KeeperEn};
    if (SpeakerId && std::strcmp(SpeakerId, "herder") == 0)
        return {false, 0.94f, 0.93f, HerderZh, HerderEn};

    // Default unknown speakers to a grounded male voice rather than female Meijia/Samantha.
    return {false, 0.86f, 0.89f, ElderLamaZh, ElderLamaEn};
}

bool VoiceMatchesToken(AVSpeechSynthesisVoice* Voice, NSString* Token)
{
    if (!Voice || !Token.length) return false;
    NSString* DotSuffix = [@"." stringByAppendingString:Token];
    if ([Voice.identifier rangeOfString:DotSuffix options:NSCaseInsensitiveSearch | NSAnchoredSearch | NSBackwardsSearch].location != NSNotFound)
        return true;
    if ([Voice.name caseInsensitiveCompare:Token] == NSOrderedSame)
        return true;
    NSString* NamePrefix = [Token stringByAppendingString:@" "];
    if ([Voice.name rangeOfString:NamePrefix options:NSCaseInsensitiveSearch].location == 0)
        return true;
    return false;
}

bool IsNoveltyVoice(AVSpeechSynthesisVoice* Voice)
{
    static const char* const Novelty[] = {
        "Albert", "BadNews", "Bahh", "Bells", "Boing", "Bubbles", "Cellos",
        "Deranged", "GoodNews", "Hysterical", "Jester", "Organ", "Princess",
        "Superstar", "Trinoids", "Whisper", "Wobble", "Zarvox", nullptr
    };
    for (int i = 0; Novelty[i]; ++i)
    {
        if (VoiceMatchesToken(Voice, [NSString stringWithUTF8String:Novelty[i]])) return true;
    }
    return false;
}

const char* EffectiveVoiceGender(AVSpeechSynthesisVoice* Voice)
{
    if (!Voice) return "unknown";
    if (@available(macOS 10.15, iOS 13.0, *))
    {
        if (Voice.gender == AVSpeechSynthesisVoiceGenderMale) return "male";
        if (Voice.gender == AVSpeechSynthesisVoiceGenderFemale) return "female";
    }
    // Apple's Eloquence voices report AVSpeechSynthesisVoiceGenderUnspecified (0), so classify known personas.
    static const char* const MaleTokens[] = {
        "Grandpa", "Reed", "Rocko", "Eddy", "Daniel", "Rishi", "Fred", "Ralph",
        "Junior", "Aaron", "Arthur", "Gordon", "Lee", "Oliver", "Nathan", "Evan",
        "Tom", "Binbin", "Yunyang", "Kangkang", "Li-mu", "Limu", nullptr
    };
    for (int i = 0; MaleTokens[i]; ++i)
    {
        if (VoiceMatchesToken(Voice, [NSString stringWithUTF8String:MaleTokens[i]])) return "male";
    }
    static const char* const FemaleTokens[] = {
        "Meijia", "Samantha", "Tingting", "Sinji", "Sin-ji", "Flo", "Grandma",
        "Sandy", "Shelley", "Karen", "Moira", "Tessa", "Kathy", "Nicky",
        "Allison", "Ava", "Susan", "Victoria", "Zoe", "Yu-shu", "Yushu", "Lili", nullptr
    };
    for (int i = 0; FemaleTokens[i]; ++i)
    {
        if (VoiceMatchesToken(Voice, [NSString stringWithUTF8String:FemaleTokens[i]])) return "female";
    }
    return "unknown";
}

int LocaleRank(NSString* Language, bool English)
{
    if (!Language) return 99;
    if (English)
    {
        if ([Language caseInsensitiveCompare:@"en-US"] == NSOrderedSame) return 0;
        if ([Language caseInsensitiveCompare:@"en-GB"] == NSOrderedSame) return 1;
        if ([Language caseInsensitiveCompare:@"en-IN"] == NSOrderedSame) return 2;
        if ([Language caseInsensitiveCompare:@"en-IE"] == NSOrderedSame) return 3;
        if ([Language caseInsensitiveCompare:@"en-AU"] == NSOrderedSame) return 4;
        if ([Language hasPrefix:@"en"]) return 5;
        return 99;
    }
    if ([Language caseInsensitiveCompare:@"zh-TW"] == NSOrderedSame) return 0;
    if ([Language caseInsensitiveCompare:@"zh-HK"] == NSOrderedSame) return 1;
    if ([Language caseInsensitiveCompare:@"zh-CN"] == NSOrderedSame) return 2;
    if ([Language hasPrefix:@"zh"]) return 3;
    return 99;
}

AVSpeechSynthesisVoice* SelectRoleVoice(bool English, const FRoleVoiceProfile& Profile)
{
    NSArray<AVSpeechSynthesisVoice*>* AllVoices = [AVSpeechSynthesisVoice speechVoices];
    const char* DesiredGender = Profile.bFemale ? "female" : "male";
    const char* const* Preferred = English ? Profile.PreferredEn : Profile.PreferredZh;

    // Tier 1: Match role-tailored preferred voice names in priority order, preferring higher quality & closer locale.
    if (Preferred)
    {
        for (int p = 0; Preferred[p]; ++p)
        {
            NSString* Token = [NSString stringWithUTF8String:Preferred[p]];
            AVSpeechSynthesisVoice* BestForToken = nil;
            int BestRank = 99;
            NSInteger BestQuality = -1;
            for (AVSpeechSynthesisVoice* V in AllVoices)
            {
                const int Rank = LocaleRank(V.language, English);
                if (Rank >= 99 || IsNoveltyVoice(V)) continue;
                if (!VoiceMatchesToken(V, Token)) continue;
                const char* VGender = EffectiveVoiceGender(V);
                if (std::strcmp(VGender, "unknown") != 0 && std::strcmp(VGender, DesiredGender) != 0) continue;
                if (!BestForToken || Rank < BestRank || (Rank == BestRank && V.quality > BestQuality))
                {
                    BestForToken = V;
                    BestRank = Rank;
                    BestQuality = V.quality;
                }
            }
            if (BestForToken) return BestForToken;
        }
    }

    // Tier 2: Any installed non-novelty voice matching the target gender in locale priority order.
    AVSpeechSynthesisVoice* BestGenderMatch = nil;
    int BestRank = 99;
    NSInteger BestQuality = -1;
    for (AVSpeechSynthesisVoice* V in AllVoices)
    {
        const int Rank = LocaleRank(V.language, English);
        if (Rank >= 99 || IsNoveltyVoice(V)) continue;
        if (std::strcmp(EffectiveVoiceGender(V), DesiredGender) != 0) continue;
        if (!BestGenderMatch || Rank < BestRank || (Rank == BestRank && V.quality > BestQuality))
        {
            BestGenderMatch = V;
            BestRank = Rank;
            BestQuality = V.quality;
        }
    }
    if (BestGenderMatch) return BestGenderMatch;

    // Tier 3: Last-resort OS locale default if a stripped simulator lacks gender-matched voices.
    return [AVSpeechSynthesisVoice voiceWithLanguage:English ? @"en-US" : @"zh-TW"];
}

AVSpeechUtterance* Utterance(NSString* Text, bool English, const char* SpeakerId = nullptr, TibetVoice::FVoiceSelection* OutSelection = nullptr)
{
    if (!Text) return nil;
    const FRoleVoiceProfile Profile = ProfileForSpeaker(SpeakerId);
    AVSpeechSynthesisVoice* Voice = SelectRoleVoice(English, Profile);
    if (!Voice) return nil;

    const char* ResolvedGender = EffectiveVoiceGender(Voice);
    float Pitch = Profile.Pitch;
    // If a stripped environment only has a female voice for a male role, lower pitch further.
    if (!Profile.bFemale && std::strcmp(ResolvedGender, "female") == 0) Pitch = 0.68f;

    AVSpeechUtterance* Line = [AVSpeechUtterance speechUtteranceWithString:Text];
    Line.voice = Voice;
    Line.pitchMultiplier = Pitch;
    Line.rate = AVSpeechUtteranceDefaultSpeechRate * Profile.RateMultiplier;
    Line.volume = 0.80f;

    if (OutSelection)
    {
        OutSelection->Mode = "native";
        std::snprintf(OutSelection->VoiceName, sizeof(OutSelection->VoiceName), "%s", Voice.name ? Voice.name.UTF8String : "");
        std::snprintf(OutSelection->VoiceId, sizeof(OutSelection->VoiceId), "%s", Voice.identifier ? Voice.identifier.UTF8String : "");
        std::snprintf(OutSelection->Language, sizeof(OutSelection->Language), "%s", Voice.language ? Voice.language.UTF8String : "");
        OutSelection->Gender = ResolvedGender;
        OutSelection->Pitch = Pitch;
        OutSelection->RateMultiplier = Profile.RateMultiplier;
    }
    return Line;
}
}

@interface TibetSpeechPlayer : NSObject<AVSpeechSynthesizerDelegate>
{
@public
    AVSpeechSynthesizer* Synth;
    AVSpeechUtterance* Active;
    NSTimer* ProgressTimer;
    TibetVoice::FWord Word;
    TibetVoice::FFinish Finish;
    NSUInteger TextLength;
    double CharsPerSecond;
    double ElapsedSeconds;
    int LastReportedOffset;
    BOOL bPaused;
    BOOL bSawNativeRange;
}
- (void)startProgressTimer;
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
    if (ProgressTimer)
    {
        [ProgressTimer invalidate];
        ProgressTimer = nil;
    }
    [Active release];
    Active = nil;
    Word = {};
    Finish = {};
    TextLength = 0;
    ElapsedSeconds = 0.0;
    LastReportedOffset = -1;
    bPaused = NO;
    bSawNativeRange = NO;
}
- (void)onProgressTick:(NSTimer*)timer
{
    if (!Active || bPaused || bSawNativeRange || !Word || TextLength == 0) return;
    ElapsedSeconds += 0.08;
    const int Est = (int)std::min<double>((double)(TextLength - 1), ElapsedSeconds * CharsPerSecond);
    if (Est > LastReportedOffset)
    {
        LastReportedOffset = Est;
        Word(Est);
    }
}
- (void)startProgressTimer
{
    if (ProgressTimer) [ProgressTimer invalidate];
    ProgressTimer = [NSTimer scheduledTimerWithTimeInterval:0.08 target:self selector:@selector(onProgressTick:) userInfo:nil repeats:YES];
}
- (void)speechSynthesizer:(AVSpeechSynthesizer*)sender didStartSpeechUtterance:(AVSpeechUtterance*)line
{
    if (Active == line && Word && LastReportedOffset < 0)
    {
        LastReportedOffset = 0;
        Word(0);
    }
}
- (void)speechSynthesizer:(AVSpeechSynthesizer*)sender willSpeakRangeOfSpeechString:(NSRange)range utterance:(AVSpeechUtterance*)line
{
    if (Active == line && Word)
    {
        bSawNativeRange = YES;
        LastReportedOffset = (int)range.location;
        Word((int)range.location);
    }
}
- (void)speechSynthesizer:(AVSpeechSynthesizer*)sender didFinishSpeechUtterance:(AVSpeechUtterance*)line
{
    if (Active != line) return;
    TibetVoice::FFinish Done = Finish;
    [self clear];
    if (Done) Done();
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

bool TibetVoice::InspectNativeVoice(const char* SpeakerId, bool English, FVoiceSelection& OutInfo)
{
    @autoreleasepool
    {
        AVSpeechUtterance* Probe = Utterance(@".", English, SpeakerId, &OutInfo);
        return Probe != nil;
    }
}

void TibetVoice::SpeakNative(const char* SpeakerId, const char* Utf8, bool English, FWord OnWord, FFinish OnFinish)
{
    NSString* Text = Utf8 ? [NSString stringWithUTF8String:Utf8] : @"";
    NSString* Role = SpeakerId ? [NSString stringWithUTF8String:SpeakerId] : @"";
    dispatch_async(dispatch_get_main_queue(), ^{
        auto* P = Player();
        [P clear];
        [P->Synth stopSpeakingAtBoundary:AVSpeechBoundaryImmediate];
        TibetVoice::FVoiceSelection Sel{};
        AVSpeechUtterance* Line = Utterance(Text, English, Role.length ? Role.UTF8String : nullptr, &Sel);
        if (!Line) return; // The in-game subtitles retain their reading timer if a voice is unavailable.
        P->Active = [Line retain];
        P->Word = OnWord;
        P->Finish = OnFinish;
        P->TextLength = Text.length;
        P->CharsPerSecond = (English ? 12.5 : 4.2) * (Sel.RateMultiplier > 0.1f ? Sel.RateMultiplier : 0.9);
        P->ElapsedSeconds = 0.0;
        P->LastReportedOffset = -1;
        P->bPaused = NO;
        P->bSawNativeRange = NO;
        [P startProgressTimer];
        [P->Synth speakUtterance:Line];
    });
}

void TibetVoice::PauseNative(bool Paused)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        auto* P = Player();
        if (!P->Active) return;
        P->bPaused = Paused ? YES : NO;
        if (Paused) [P->Synth pauseSpeakingAtBoundary:AVSpeechBoundaryImmediate];
        else [P->Synth continueSpeaking];
    });
}

void TibetVoice::StopNative()
{
    dispatch_async(dispatch_get_main_queue(), ^{
        auto* P = Player();
        [P clear];
        [P->Synth stopSpeakingAtBoundary:AVSpeechBoundaryImmediate];
    });
}
