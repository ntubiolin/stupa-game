#include "TojiPlaytestSubsystem.h"

#include "Engine/Engine.h"
#include "Engine/GameViewportClient.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "HAL/FileManager.h"
#include "HAL/IConsoleManager.h"
#include "HAL/PlatformMisc.h"
#include "HAL/PlatformTime.h"
#include "InputKeyEventArgs.h"
#include "Misc/CommandLine.h"
#include "Misc/EngineVersion.h"
#include "Misc/FileHelper.h"
#include "Misc/Parse.h"
#include "Misc/Paths.h"
#include "TojiGameMode.h"
#include "UnrealClient.h"

namespace
{
struct FPlayStep
{
    FVector Destination;
    FKey Key;
    const TCHAR* Evidence;
    int32 Completed;
    const TCHAR* ExpectedPrompt;
    int32 ExpectedTime;
};

const FPlayStep Story[] = {
    {{}, EKeys::SpaceBar, TEXT("jump"), -1, nullptr, -1},
    {{-4200, -900, 0}, {}, nullptr, -1, nullptr, -1},
    {{}, EKeys::E, TEXT("kukai-dialogue"), -1, TEXT("Continue to the Kondō"), -1},
    {{}, EKeys::E, TEXT("accepted"), 1, nullptr, -1},
    {{-2500, 0, 0}, {}, nullptr, -1, nullptr, -1},
    {{-2100, 0, 0}, {}, nullptr, -1, nullptr, -1},
    {{}, EKeys::E, TEXT("offering-lamp"), 2, nullptr, -1},
    {{-2300, -2200, 0}, {}, nullptr, -1, nullptr, -1},
    {{2400, -2200, 0}, {}, nullptr, -1, nullptr, -1},
    {{2400, 0, 0}, {}, nullptr, -1, nullptr, -1},
    {{}, EKeys::E, TEXT("mandala"), 3, nullptr, -1},
    {{2400, -2200, 0}, {}, nullptr, -1, nullptr, -1},
    {{-3200, -2200, 0}, {}, nullptr, -1, nullptr, -1},
    {{}, EKeys::E, TEXT("earth-shade"), -1, TEXT("2 casts to go"), -1},
    {{}, EKeys::Q, TEXT("earth-first-cast"), -1, TEXT("1 casts to go"), -1},
    {{}, EKeys::Q, TEXT("earth-complete"), 4, nullptr, -1},
    {{-3200, 2000, 0}, {}, nullptr, -1, nullptr, -1},
    {{-2600, 2000, 0}, {}, nullptr, -1, nullptr, -1},
    {{}, EKeys::E, TEXT("fire-shade"), -1, TEXT("2 casts to go"), -1},
    {{}, EKeys::Q, TEXT("fire-first-cast"), -1, TEXT("1 casts to go"), -1},
    {{}, EKeys::Q, TEXT("fire-complete"), 5, nullptr, -1},
    {{-3200, 2000, 0}, {}, nullptr, -1, nullptr, -1},
    {{-3200, -2100, 0}, {}, nullptr, -1, nullptr, -1},
    {{1800, -2100, 0}, {}, nullptr, -1, nullptr, -1},
    {{}, EKeys::E, TEXT("wind-shade"), -1, TEXT("2 casts to go"), -1},
    {{}, EKeys::Q, TEXT("wind-first-cast"), -1, TEXT("1 casts to go"), -1},
    {{}, EKeys::Q, TEXT("all-wards-complete"), 6, nullptr, -1},
    {{}, EKeys::L, TEXT("traditional-chinese"), 6, nullptr, -1},
    {{}, EKeys::Two, TEXT("dusk"), -1, nullptr, 1},
    {{}, EKeys::Three, TEXT("night"), -1, nullptr, 2},
    {{}, EKeys::One, TEXT("daylight"), -1, nullptr, 0},
};

const FKey MoveKeys[] = { EKeys::W, EKeys::S, EKeys::D, EKeys::A };

const FVector Lap[] = {
    {2400, -2200, 0}, {2400, 2150, 0}, {-3200, 2150, 0},
    {-3200, -2200, 0}, {1800, -2100, 0},
};

bool ReadProgress(int32 Expected, bool bEnglish)
{
    FTojiProgress Progress;
    return TojiSave::Load(Progress) && Progress.Completed == Expected && Progress.bEnglish == bEnglish;
}
}

bool UTojiPlaytestSubsystem::ShouldCreateSubsystem(UObject* Outer) const
{
#if UE_BUILD_SHIPPING
    return false;
#else
    const UWorld* World = Cast<UWorld>(Outer);
    FString Output;
    return World && World->WorldType == EWorldType::Game &&
        FParse::Value(FCommandLine::Get(), TEXT("TojiPlaytestDir="), Output) && !Output.IsEmpty();
#endif
}

TStatId UTojiPlaytestSubsystem::GetStatId() const
{
    RETURN_QUICK_DECLARE_CYCLE_STAT(UTojiPlaytestSubsystem, STATGROUP_Tickables);
}

bool UTojiPlaytestSubsystem::Begin(ATojiGameMode& Mode, double Now)
{
    const TCHAR* Args = FCommandLine::Get();
    FString Output, Profile, OtherMode;
    FParse::Value(Args, TEXT("TojiPlaytestDir="), Output);
    FParse::Value(Args, TEXT("TojiSaveDir="), Profile);
    const bool bHasPhoto = FParse::Value(Args, TEXT("TojiPhotoDir="), OtherMode);
    const bool bHasImport = FParse::Value(Args, TEXT("TojiImport="), OtherMode);
    bResume = FParse::Param(Args, TEXT("TojiPlaytestResume"));
    bRecord = FParse::Param(Args, TEXT("TojiPlaytestRecord"));
    FParse::Value(Args, TEXT("TojiPlaytestSeconds="), Duration);
    Output = FPaths::ConvertRelativePathToFull(Output);
    FPaths::NormalizeDirectoryName(Output);
    FPaths::NormalizeDirectoryName(Profile);
    if (bHasPhoto || bHasImport || !FMath::IsFinite(Duration) || Duration < 0 ||
        Duration > 3600 || (bRecord && (bResume || Duration > 0)))
    {
        UE_LOG(LogTemp, Error, TEXT("Invalid playtest options"));
        return false;
    }

    const FString ExpectedProfile = FPaths::Combine(Output, TEXT("Profile"));
    if (FPaths::IsRelative(Profile) || !FPaths::IsSamePath(Profile, ExpectedProfile))
    {
        UE_LOG(LogTemp, Error, TEXT("Playtest profile must be '%s'; got '%s'"), *ExpectedProfile, *Profile);
        return false;
    }

    const FString MapName = GetWorld()->GetMapName();
    if (!MapName.EndsWith(TEXT("Toji")))
    {
        UE_LOG(LogTemp, Error, TEXT("Playtest expected Tō-ji; got '%s'"), *MapName);
        return false;
    }

    const FString Run = bResume ? TEXT("resume") : TEXT("gameplay");
    const FString RunDirectory = FPaths::Combine(Output, Run);
    auto& Files = IFileManager::Get();
    if (Files.DirectoryExists(*RunDirectory) || !Files.MakeDirectory(*RunDirectory, true))
    {
        UE_LOG(LogTemp, Error, TEXT("Playtest cannot create fresh output directory '%s'"), *RunDirectory);
        return false;
    }
    Directory = RunDirectory;

    if (bResume ? (!ReadProgress(6, false) || Mode.IsEnglish() ||
                   Mode.ObjectiveText().ToString() != TEXT("東寺朝聖圓滿"))
                : (Files.DirectoryExists(*Profile) || !Mode.IsEnglish()))
    {
        UE_LOG(LogTemp, Error, TEXT("Playtest startup progress mismatch in '%s'"), *Profile);
        return false;
    }

    if (bRecord && !Files.MakeDirectory(*(Directory / TEXT("video"))))
    {
        UE_LOG(LogTemp, Error, TEXT("Playtest cannot create video directory under '%s'"), *Directory);
        return false;
    }
    StartAt = LastFrameAt = StepStartedAt = NextVideoAt = Now;
    ViewportSize = GEngine->GameViewport->Viewport->GetSizeXY();
    return true;
}

void UTojiPlaytestSubsystem::SetKey(APlayerController& Controller, const FKey& Key, bool bDown, float Amount)
{
    const bool bAnalog = Key.IsAnalog();
    const EInputEvent Event = bAnalog ? IE_Axis : bDown ? IE_Pressed : IE_Released;
    auto Args = FInputKeyEventArgs::CreateSimulated(Key, Event, bDown ? Amount : 0, bAnalog ? 1 : 0);
    Args.DeltaTime = GetWorld()->GetDeltaSeconds();
    Controller.InputKey(Args);
}

bool UTojiPlaytestSubsystem::Walk(APlayerController& Controller, const FVector& Target)
{
    const FVector Offset = Target - Controller.GetPawn()->GetActorLocation();
    const bool bArrived = Offset.Size2D() < 120;
    const double Turn = FMath::FindDeltaAngleDegrees(Controller.GetControlRotation().Yaw, Offset.Rotation().Yaw);
    if (!bArrived && FMath::Abs(Turn) > 4)
    {
        SetKey(Controller, EKeys::MouseX, true, FMath::Clamp(Turn * 0.8, -24.0, 24.0));
    }

    const double Radians = FMath::DegreesToRadians(Turn);
    const double Forward = FMath::Cos(Radians);
    const double Right = FMath::Sin(Radians);
    const double KeyAlignment[] = {Forward, -Forward, Right, -Right};
    for (int32 Index = 0; Index < UE_ARRAY_COUNT(MoveKeys); ++Index)
    {
        // Use the nearest one- or two-key direction while the camera turns.
        const bool bShouldBeDown = !bArrived && KeyAlignment[Index] > 0.382683;
        if (Controller.IsInputKeyDown(MoveKeys[Index]) != bShouldBeDown)
        {
            SetKey(Controller, MoveKeys[Index], bShouldBeDown);
        }
    }
    return bArrived;
}

void UTojiPlaytestSubsystem::Checkpoint(const TCHAR* Name, const APlayerController& Controller, double Now)
{
    const FVector At = Controller.GetPawn()->GetActorLocation();
    Checkpoints.Add(FString::Printf(TEXT("%.3f\t%s\t%.0f\t%.0f\t%.0f"), Now - StartAt, Name, At.X, At.Y, At.Z));
    UE_LOG(LogTemp, Display, TEXT("TOJI_PLAYTEST %s at %s"), Name, *At.ToCompactString());
    if (Duration == 0)
    {
        PendingImage = Directory / (FString(Name) + TEXT(".png"));
        FScreenshotRequest::RequestScreenshot(PendingImage, true, false, false);
    }
}

void UTojiPlaytestSubsystem::Finish(APlayerController& Controller, const FString& Error)
{
    bFinished = true;
    for (const FKey& Key : MoveKeys)
    {
        if (Controller.IsInputKeyDown(Key)) SetKey(Controller, Key, false);
    }
    if (HeldKey.IsValid()) SetKey(Controller, HeldKey, false);
    bool bWritten = false;
    if (!Directory.IsEmpty())
    {
        TArray<FString> Lines = {TEXT("frame_interval_ms")};
        Lines.Reserve(FrameIntervals.Num() + 1);
        for (double Interval : FrameIntervals)
        {
            Lines.Add(FString::Printf(TEXT("%.4f"), Interval));
        }
        bWritten = FFileHelper::SaveStringArrayToFile(Lines, *(Directory / TEXT("frames.csv")));
        Checkpoints.Insert(TEXT("elapsed_seconds\tcheckpoint\tx_cm\ty_cm\tz_cm"), 0);
        bWritten &= FFileHelper::SaveStringArrayToFile(Checkpoints, *(Directory / TEXT("checkpoints.tsv")));
        FString Settings = FString::Printf(TEXT("engine=%s\ngpu=%s\nwidth=%d\nheight=%d\nelapsed_seconds=%.3f\nstatus=%s\n"),
            *FEngineVersion::Current().ToString(), *FPlatformMisc::GetPrimaryGPUBrand(),
            ViewportSize.X, ViewportSize.Y, LastFrameAt - StartAt, Error.IsEmpty() ? TEXT("passed") : *Error);
        for (const TCHAR* Name : {TEXT("r.ScreenPercentage"), TEXT("r.AntiAliasingMethod"),
            TEXT("r.DynamicRes.OperationMode"), TEXT("r.DynamicGlobalIlluminationMethod"),
            TEXT("sg.ShadowQuality"), TEXT("sg.GlobalIlluminationQuality"), TEXT("r.VSync"), TEXT("t.MaxFPS")})
        {
            if (const auto* Variable = IConsoleManager::Get().FindConsoleVariable(Name))
            {
                Settings += FString::Printf(TEXT("%s=%s\n"), Name, *Variable->GetString());
            }
        }
        bWritten &= FFileHelper::SaveStringToFile(Settings, *(Directory / TEXT("run.txt")));
        if (bRecord)
        {
            VideoFrames.Insert(TEXT("seconds,image"), 0);
            bWritten &= FFileHelper::SaveStringArrayToFile(VideoFrames, *(Directory / TEXT("video.csv")));
        }
    }
    if (Error.IsEmpty() && bWritten)
    {
        UE_LOG(LogTemp, Display, TEXT("TOJI_PLAYTEST_COMPLETE"));
        FPlatformMisc::RequestExit(false, TEXT("TojiPlaytestSubsystem"));
    }
    else
    {
        UE_LOG(LogTemp, Error, TEXT("TOJI_PLAYTEST_FAILED: %s"), Error.IsEmpty() ? TEXT("Unable to write results") : *Error);
        FPlatformMisc::RequestExitWithStatus(false, 1, TEXT("TojiPlaytestSubsystem"));
    }
}

void UTojiPlaytestSubsystem::Tick(float)
{
    if (bFinished) return;
    UWorld* World = GetWorld();
    auto* Controller = World->GetFirstPlayerController();
    auto* Mode = World->GetAuthGameMode<ATojiGameMode>();
    if (!World->HasBegunPlay() || !Controller || !Controller->GetPawn() || !Mode ||
        !GEngine || !GEngine->GameViewport || !GEngine->GameViewport->Viewport)
    {
        return;
    }

    const double Now = FPlatformTime::Seconds();
    // Window creation or mouse capture can enqueue an initial hardware pitch delta.
    // Bring the camera back to a slight downward angle through the same MouseY binding.
    const double PitchError = FRotator::NormalizeAxis(Controller->GetControlRotation().Pitch) + 5;
    if (FMath::Abs(PitchError) > 3)
    {
        SetKey(*Controller, EKeys::MouseY, true, FMath::Clamp(PitchError * 0.8, -24.0, 24.0));
    }
    if (StartAt == 0)
    {
        ++WarmupFrames;
        if (WarmupFrames < 45 || (WarmupFrames < 180 && FMath::Abs(PitchError) > 3)) return;
        if (!Begin(*Mode, Now))
        {
            Finish(*Controller, TEXT("Expected an absolute isolated save profile, fresh output, and matching startup progress"));
            return;
        }
        StartZ = HighestZ = Controller->GetPawn()->GetActorLocation().Z;
        Checkpoint(bResume ? TEXT("resumed-traditional-chinese") : TEXT("south-approach"), *Controller, Now);
        return;
    }

    FrameIntervals.Add((Now - LastFrameAt) * 1000);
    LastFrameAt = Now;
    if (!PendingImage.IsEmpty())
    {
        if (FScreenshotRequest::IsScreenshotRequested() || IFileManager::Get().FileSize(*PendingImage) <= 0)
        {
            if (Now - StepStartedAt > 12) Finish(*Controller, TEXT("Screenshot could not be written"));
            return;
        }
        PendingImage.Reset();
    }

    if (bResume || StepIndex >= UE_ARRAY_COUNT(Story))
    {
        if (Now - StartAt >= Duration)
        {
            Finish(*Controller, FString());
            return;
        }
        if (Walk(*Controller, Lap[LoopIndex]))
        {
            if (LoopIndex == UE_ARRAY_COUNT(Lap) - 1) Checkpoint(TEXT("courtyard-lap"), *Controller, Now);
            LoopIndex = (LoopIndex + 1) % UE_ARRAY_COUNT(Lap);
            StepStartedAt = Now;
        }
        if (Now - StepStartedAt > 25)
        {
            Finish(*Controller, FString::Printf(TEXT("Stalled at courtyard waypoint %d"), LoopIndex));
        }
        return;
    }

    const FPlayStep& Step = Story[StepIndex];
    if (Now - StepStartedAt > 25)
    {
        Finish(*Controller, FString::Printf(TEXT("Step %d stalled at %s"), StepIndex,
            *Controller->GetPawn()->GetActorLocation().ToCompactString()));
        return;
    }
    if (bRecord && Now >= NextVideoAt && !Step.Key.IsValid() && !FScreenshotRequest::IsScreenshotRequested())
    {
        const FString File = FString::Printf(TEXT("video/%05d.png"), VideoFrames.Num());
        FScreenshotRequest::RequestScreenshot(Directory / File, true, false, false);
        VideoFrames.Add(FString::Printf(TEXT("%.4f,%s"), Now - StartAt, *File));
        NextVideoAt = Now + 0.25;
    }
    if (!Step.Key.IsValid())
    {
        if (!Walk(*Controller, Step.Destination)) return;
    }
    else if (!HeldKey.IsValid() && ReleasedAt == 0)
    {
        SetKey(*Controller, Step.Key, true);
        HeldKey = Step.Key;
        return;
    }
    else
    {
        if (Step.Key == EKeys::SpaceBar)
        {
            HighestZ = FMath::Max(HighestZ, Controller->GetPawn()->GetActorLocation().Z);
            if (HeldKey.IsValid() && HighestZ - StartZ < 25) return;
        }
        if (HeldKey.IsValid())
        {
            SetKey(*Controller, HeldKey, false);
            HeldKey = FKey();
            ReleasedAt = Now;
            if (Step.Key == EKeys::SpaceBar || Step.Key == EKeys::Q || Step.Key == EKeys::E)
            {
                Checkpoint(Step.Evidence, *Controller, Now);
            }
            return;
        }
        const double SettleSeconds = Step.ExpectedTime >= 0 ? 1.3 : 0.52;
        if (Now - ReleasedAt < SettleSeconds) return;
        if ((Step.ExpectedPrompt && !Mode->PromptText().ToString().Contains(Step.ExpectedPrompt)) ||
            (Step.Completed >= 0 && !ReadProgress(Step.Completed, Step.Key != EKeys::L)) ||
            (Step.ExpectedTime >= 0 && Mode->GetTimeOfDay() != Step.ExpectedTime) ||
            (Step.Key == EKeys::L && (Mode->IsEnglish() || Mode->ObjectiveText().ToString() != TEXT("東寺朝聖圓滿"))))
        {
            Finish(*Controller, FString::Printf(TEXT("Checkpoint %s did not match game state"), Step.Evidence));
            return;
        }
        if (Step.Key != EKeys::SpaceBar && Step.Key != EKeys::Q && Step.Key != EKeys::E)
        {
            Checkpoint(Step.Evidence, *Controller, Now);
        }
    }
    ReleasedAt = 0;
    ++StepIndex;
    StepStartedAt = Now;
}
