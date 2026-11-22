#pragma once

#include <functional>

// Word offsets are UTF-16, matching NSString and UE's FString on Apple targets.
namespace TibetVoice
{
    using FWord = std::function<void(int)>;
    using FFinish = std::function<void()>;
#if defined(__APPLE__)
    void Speak(const char* Utf8, bool English, FWord OnWord, FFinish OnFinish);
    void Pause(bool Paused);
    void Stop();
#else
    inline void Speak(const char*, bool, FWord, FFinish) {}
    inline void Pause(bool) {}
    inline void Stop() {}
#endif
}
