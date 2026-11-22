#include "TibetVoice.h"
#include "CoreMinimal.h"
#include "Components/AudioComponent.h"
#include "Containers/Ticker.h"
#include "Engine/World.h"
#include "Kismet/GameplayStatics.h"
#include "Sound/SoundWave.h"
#include "UObject/UObjectGlobals.h"

#include <cstdio>

namespace
{
struct FPrerecordedVoicePlayer
{
    TWeakObjectPtr<UWorld> World;
    TWeakObjectPtr<UAudioComponent> Audio;
    FTSTicker::FDelegateHandle Ticker;
    TibetVoice::FWord OnWord;
    TibetVoice::FFinish OnFinish;
    TibetVoice::FVoiceSelection Selection;
    uint32 Token = 0;
    float Duration = 0.0f;
    float Elapsed = 0.0f;
    int32 TotalChars = 0;
    int32 LastWordOffset = -1;
    bool bActive = false;
    bool bPaused = false;
};

FPrerecordedVoicePlayer& VoiceState()
{
    static FPrerecordedVoicePlayer Instance;
    return Instance;
}

FString SanitizeCueId(const char* RawCueId)
{
    if (!RawCueId || !RawCueId[0]) return {};
    FString Cue = UTF8_TO_TCHAR(RawCueId);
    Cue.TrimStartAndEndInline();
    for (TCHAR& Ch : Cue)
    {
        if (!FChar::IsAlnum(Ch) && Ch != TEXT('_')) Ch = TEXT('_');
    }
    return Cue;
}

const char* RoleGender(const char* SpeakerId)
{
    if (SpeakerId && FCStringAnsi::Stricmp(SpeakerId, "yesheTsogyal") == 0) return "female";
    return "male";
}

void StopPrerecorded()
{
    auto& State = VoiceState();
    ++State.Token;
    if (State.Ticker.IsValid())
    {
        FTSTicker::RemoveTicker(State.Ticker);
        State.Ticker.Reset();
    }
    if (UAudioComponent* Comp = State.Audio.Get())
    {
        Comp->Stop();
        Comp->DestroyComponent();
    }
    State.Audio.Reset();
    State.World.Reset();
    State.OnWord = {};
    State.OnFinish = {};
    State.Duration = 0.0f;
    State.Elapsed = 0.0f;
    State.TotalChars = 0;
    State.LastWordOffset = -1;
    State.bActive = false;
    State.bPaused = false;
}
}

const TibetVoice::FVoiceSelection& TibetVoice::LastSelection()
{
    return VoiceState().Selection;
}

void TibetVoice::Speak(UWorld* World, const char* CueId, const char* SpeakerId, const char* Utf8, bool English, FWord OnWord, FFinish OnFinish)
{
    Stop();

    auto& State = VoiceState();
    const FString SafeSpeaker = SpeakerId ? FString(UTF8_TO_TCHAR(SpeakerId)) : FString(TEXT("default"));
    const FString CleanCue = SanitizeCueId(CueId);

    // Priority 1: Pre-recorded Gemini 3.8 TTS USoundWave asset (/Game/Voices/<CueId>.<CueId>)
    if (World && !CleanCue.IsEmpty())
    {
        const FString ObjectPath = FString::Printf(TEXT("/Game/Voices/%s.%s"), *CleanCue, *CleanCue);
        if (USoundWave* Wave = LoadObject<USoundWave>(nullptr, *ObjectPath, nullptr, LOAD_NoWarn | LOAD_Quiet))
        {
            const float WaveDuration = Wave->GetDuration();
            if (WaveDuration > 0.05f)
            {
                if (UAudioComponent* Comp = UGameplayStatics::CreateSound2D(World, Wave, 0.92f, 1.0f, 0.0f, nullptr, false, false))
                {
                    Comp->bIsUISound = true;
                    Comp->Play(0.0f);

                    State.Selection = {};
                    State.Selection.Mode = "prerecorded";
                    std::snprintf(State.Selection.VoiceName, sizeof(State.Selection.VoiceName), "%s", TCHAR_TO_UTF8(*CleanCue));
                    std::snprintf(State.Selection.VoiceId, sizeof(State.Selection.VoiceId), "%s", TCHAR_TO_UTF8(*ObjectPath));
                    std::snprintf(State.Selection.Language, sizeof(State.Selection.Language), "%s", English ? "en-US" : "zh-TW");
                    State.Selection.Gender = RoleGender(SpeakerId);
                    State.Selection.Pitch = 1.0f;
                    State.Selection.RateMultiplier = 1.0f;

                    const FString LineText = Utf8 ? FString(UTF8_TO_TCHAR(Utf8)) : FString();
                    State.World = World;
                    State.Audio = Comp;
                    State.OnWord = std::move(OnWord);
                    State.OnFinish = std::move(OnFinish);
                    State.Duration = WaveDuration;
                    State.Elapsed = 0.0f;
                    State.TotalChars = LineText.Len();
                    State.LastWordOffset = 0;
                    State.bActive = true;
                    State.bPaused = false;
                    const uint32 ActiveToken = ++State.Token;

                    UE_LOG(LogTemp, Display,
                        TEXT("TIBET_VOICE_SELECT speaker=%s cue=%s mode=prerecorded asset=%s gender=%s duration=%.2fs"),
                        *SafeSpeaker, *CleanCue, *ObjectPath, UTF8_TO_TCHAR(State.Selection.Gender), WaveDuration);

                    if (State.OnWord) State.OnWord(0);

                    State.Ticker = FTSTicker::GetCoreTicker().AddTicker(TEXT("TibetVoice"), 0.04f, [ActiveToken](float DeltaTime) -> bool
                    {
                        auto& S = VoiceState();
                        if (!S.bActive || S.Token != ActiveToken) return false;
                        if (!S.World.IsValid())
                        {
                            StopPrerecorded();
                            return false;
                        }
                        if (S.bPaused || S.World->IsPaused()) return true;

                        S.Elapsed += DeltaTime;
                        if (S.TotalChars > 0 && S.Duration > 0.0f)
                        {
                            const float Alpha = FMath::Clamp(S.Elapsed / S.Duration, 0.0f, 1.0f);
                            const int32 Offset = FMath::Clamp(FMath::FloorToInt(Alpha * S.TotalChars), 0, FMath::Max(0, S.TotalChars - 1));
                            if (Offset > S.LastWordOffset)
                            {
                                S.LastWordOffset = Offset;
                                if (S.OnWord) S.OnWord(Offset);
                            }
                        }

                        if (S.Elapsed >= S.Duration)
                        {
                            FFinish Done = std::move(S.OnFinish);
                            StopPrerecorded();
                            if (Done) Done();
                            return false;
                        }
                        return true;
                    });
                    return;
                }
            }
        }
    }

    // Priority 2: Role-matched male/female native speech synthesizer fallback
    State.Selection = {};
    if (InspectNativeVoice(SpeakerId, English, State.Selection))
    {
        UE_LOG(LogTemp, Display,
            TEXT("TIBET_VOICE_SELECT speaker=%s cue=%s mode=%s voice=%s id=%s language=%s gender=%s pitch=%.2f rate=%.2f"),
            *SafeSpeaker, *CleanCue,
            UTF8_TO_TCHAR(State.Selection.Mode),
            UTF8_TO_TCHAR(State.Selection.VoiceName),
            UTF8_TO_TCHAR(State.Selection.VoiceId),
            UTF8_TO_TCHAR(State.Selection.Language),
            UTF8_TO_TCHAR(State.Selection.Gender),
            State.Selection.Pitch,
            State.Selection.RateMultiplier);
    }

    SpeakNative(SpeakerId, Utf8, English, std::move(OnWord), std::move(OnFinish));
}

void TibetVoice::Pause(bool Paused)
{
    auto& State = VoiceState();
    if (State.bActive)
    {
        State.bPaused = Paused;
        if (UAudioComponent* Comp = State.Audio.Get())
        {
            Comp->SetPaused(Paused);
        }
    }
    PauseNative(Paused);
}

void TibetVoice::Stop()
{
    StopPrerecorded();
    StopNative();
}
