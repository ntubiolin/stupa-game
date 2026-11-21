#include "TibetQASubsystem.h"
#include "TibetGameMode.h"
#include "AudioDevice.h"
#include "Engine/World.h"
#include "Misc/App.h"

void UTibetQASubsystem::ScoreMix(ATibetGameMode& Mode)
{
    FAudioDevice* Device = GetWorld()->GetAudioDeviceRaw();
    if (!Device) { Finish(false, TEXT("No audio device")); return; }
    const double Now = FPlatformTime::Seconds();
    const bool bCourtyard = StartMap == TEXT("stupa");
    if (SkillPhase == 0)
    {
        // Development captures may run in a background window.
        FApp::SetUnfocusedVolumeMultiplier(1.f);
        if (bCourtyard) Mode.SetSolarPhase(.5f, false);
        SkillPhase = 1;
        LastAction = Now;
    }
    if (Now - LastAction < 5.) return;
    LastAction = Now;
    if (SkillPhase == 1 || SkillPhase == 3)
    {
        Device->StartRecording(nullptr, 6.f);
        ++SkillPhase;
        return;
    }
    float Channels = 0, Rate = 0;
    const auto& Samples = Device->StopRecording(nullptr, Channels, Rate);
    double Energy = 0;
    for (float Sample : Samples) Energy += double(Sample) * Sample;
    const double RMS = Samples.IsEmpty() ? 0. : FMath::Sqrt(Energy / Samples.Num());
    Record(FString::Printf(TEXT("scoreMix\t%s\t%d\t%.0f\t%.0f\t%.6f"), *StartMap,
        Samples.Num(), Channels, Rate, RMS));
    if (RMS < .0001 || Rate <= 0 || Samples.Num() < Channels * Rate)
        { Finish(false, TEXT("Silent or incomplete game mix")); return; }
    if (bCourtyard && SkillPhase == 2)
    {
        Mode.SetSolarPhase(.95f, false);
        SkillPhase = 3;
        return;
    }
    Finish(true, TEXT("Audible game mix"));
}
