#pragma once

#include <functional>

class UWorld;

// Word offsets are UTF-16, matching NSString and UE's FString on Apple targets.
namespace TibetVoice
{
    using FWord = std::function<void(int)>;
    using FFinish = std::function<void()>;

    struct FVoiceSelection
    {
        const char* Mode = "none";
        char VoiceName[128] = {};
        char VoiceId[160] = {};
        char Language[32] = {};
        const char* Gender = "unknown";
        float Pitch = 1.0f;
        float RateMultiplier = 1.0f;
    };

    void Speak(UWorld* World, const char* CueId, const char* SpeakerId, const char* Utf8, bool English, FWord OnWord, FFinish OnFinish);

    inline void Speak(const char* Utf8, bool English, FWord OnWord, FFinish OnFinish)
    {
        Speak(nullptr, nullptr, nullptr, Utf8, English, std::move(OnWord), std::move(OnFinish));
    }

    void Pause(bool Paused);
    void Stop();
    const FVoiceSelection& LastSelection();

#if defined(__APPLE__)
    bool InspectNativeVoice(const char* SpeakerId, bool English, FVoiceSelection& OutInfo);
    void SpeakNative(const char* SpeakerId, const char* Utf8, bool English, FWord OnWord, FFinish OnFinish);
    void PauseNative(bool Paused);
    void StopNative();
#else
    inline bool InspectNativeVoice(const char*, bool, FVoiceSelection&) { return false; }
    inline void SpeakNative(const char*, const char*, bool, FWord, FFinish) {}
    inline void PauseNative(bool) {}
    inline void StopNative() {}
#endif
}
