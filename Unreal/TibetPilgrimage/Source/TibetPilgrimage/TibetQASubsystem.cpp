#include "TibetQASubsystem.h"
#include "TibetGameMode.h"
#include "Camera/CameraActor.h"
#include "Camera/CameraComponent.h"
#include "Camera/PlayerCameraManager.h"
#include "Engine/Engine.h"
#include "Engine/GameViewportClient.h"
#include "Engine/World.h"
#include "GameFramework/HUD.h"
#include "GameFramework/PlayerController.h"
#include "HAL/FileManager.h"
#include "HAL/PlatformMisc.h"
#include "HAL/PlatformTime.h"
#include "InputKeyEventArgs.h"
#include "Misc/CommandLine.h"
#include "Misc/FileHelper.h"
#include "Misc/Parse.h"
#include "Misc/Paths.h"
#include "UnrealClient.h"

bool UTibetQASubsystem::ShouldCreateSubsystem(UObject* Outer) const
{
#if UE_BUILD_SHIPPING
    return false;
#else
    const UWorld* World = Cast<UWorld>(Outer);
    FString TaskName, Path;
    return World && World->WorldType == EWorldType::Game &&
        FParse::Value(FCommandLine::Get(), TEXT("TibetQA="), TaskName) &&
        FParse::Value(FCommandLine::Get(), TEXT("TibetQAOutput="), Path) && !FPaths::IsRelative(Path);
#endif
}

TStatId UTibetQASubsystem::GetStatId() const
{
    RETURN_QUICK_DECLARE_CYCLE_STAT(UTibetQASubsystem, STATGROUP_Tickables);
}

void UTibetQASubsystem::Record(const FString& Line) const
{
    const FString File = Output / TEXT("events.tsv");
    FFileHelper::SaveStringToFile(Line + LINE_TERMINATOR, *File, FFileHelper::EEncodingOptions::ForceUTF8WithoutBOM,
        &IFileManager::Get(), FILEWRITE_Append);
}

void UTibetQASubsystem::Finish(bool bSuccess, const FString& Detail)
{
    bFinished = true;
    Record(FString::Printf(TEXT("%s\t%s"), bSuccess ? TEXT("pass") : TEXT("fail"), *Detail));
    FPlatformMisc::RequestExitWithStatus(false, bSuccess ? 0 : 1, TEXT("TibetQA"));
}

void UTibetQASubsystem::Tick(float)
{
    if (bFinished) return;
    UWorld* World = GetWorld();
    APlayerController* PC = World->GetFirstPlayerController();
    auto* Mode = World->GetAuthGameMode<ATibetGameMode>();
    if (!PC || !PC->GetPawn() || !PC->PlayerCameraManager || !Mode ||
        !GEngine || !GEngine->GameViewport || !GEngine->GameViewport->Viewport) return;
    if (Task.IsEmpty())
    {
        const TCHAR* Args = FCommandLine::Get();
        FParse::Value(Args, TEXT("TibetQA="), Task);
        FParse::Value(Args, TEXT("TibetQAOutput="), Output);
        FParse::Value(Args, TEXT("TibetQAStart="), StartMap);
        Began = FPlatformTime::Seconds();
    }
    if ((Task == TEXT("Play") || Task == TEXT("GroveEntry")) && World->GetMapName() != StartMap)
    {
        Finish(true, TEXT("transition\t") + World->GetMapName());
        return;
    }
    if (Task != TEXT("Campaign") && World->GetMapName() != StartMap) { Finish(false, TEXT("Unexpected map: ") + World->GetMapName()); return; }
    if (Task == TEXT("Photo")) Photo(*PC);
    else if (Task == TEXT("Play") || Task == TEXT("Campaign") || Task == TEXT("GroveEntry")) Play(*PC, *Mode);
    else if (Task == TEXT("Resume"))
    {
        int32 Expected = INDEX_NONE;
        FParse::Value(FCommandLine::Get(), TEXT("TibetQAExpected="), Expected);
        Finish(Mode->GetStep() == Expected, FString::Printf(TEXT("resumedStep\t%d"),Mode->GetStep()));
    }
    else Finish(false, TEXT("Unknown task ") + Task);
}

void UTibetQASubsystem::Photo(APlayerController& PC)
{
    const double Now = FPlatformTime::Seconds();
    if (Now - Began > 100) { Finish(false, TEXT("Photo timeout")); return; }
    if (!Camera)
    {
        FString EyeString, AtString;
        const TCHAR* Args = FCommandLine::Get();
        FParse::Value(Args, TEXT("TibetQAEye="), EyeString, false);
        FParse::Value(Args, TEXT("TibetQALook="), AtString, false);
        FVector Eye, At;
        if (!Eye.InitFromString(EyeString) || !At.InitFromString(AtString) || Eye.Equals(At))
        { Finish(false, TEXT("Invalid photograph camera")); return; }
        Camera = GetWorld()->SpawnActor<ACameraActor>(Eye,(At-Eye).Rotation());
        if (!Camera) { Finish(false, TEXT("Photo camera creation failed")); return; }
        const FIntPoint Size = GEngine->GameViewport->Viewport->GetSizeXY();
        const double Aspect = double(Size.X) / FMath::Max(1,Size.Y);
        auto* Lens = Camera->GetCameraComponent();
        Lens->bConstrainAspectRatio = false;
        Lens->bOverrideAspectRatioAxisConstraint = true;
        Lens->AspectRatioAxisConstraint = EAspectRatioAxisConstraint::AspectRatio_MaintainXFOV;
        Lens->SetFieldOfView(FMath::RadiansToDegrees(2.0 * FMath::Atan(Aspect * FMath::Tan(FMath::DegreesToRadians(27.5)))));
        PC.SetViewTarget(Camera);
        PC.GetPawn()->SetActorHiddenInGame(true);
        if (auto* HUD = PC.GetHUD()) HUD->bShowHUD = false;
        Record(FString::Printf(TEXT("view\t%s\t%s\t%s\t%d\t%d\t%s"),
            *StartMap,*Eye.ToCompactString(),*At.ToCompactString(),Size.X,Size.Y,*FPlatformMisc::GetPrimaryGPUBrand()));
        return;
    }
    if (PC.GetViewTarget() != Camera || !PC.PlayerCameraManager->GetCameraLocation().Equals(Camera->GetActorLocation(),1)) return;
    if (++Frames > 45 && Screenshot.IsEmpty()) FrameMs.Add((Now-LastFrame)*1000);
    LastFrame = Now;
    if (!Screenshot.IsEmpty())
    {
        if (!FScreenshotRequest::IsScreenshotRequested() && IFileManager::Get().FileSize(*Screenshot)>0)
            Finish(true, TEXT("photo"));
        return;
    }
    if (FrameMs.Num() == 60)
    {
        FrameMs.Sort();
        Record(FString::Printf(TEXT("frames\t60\t%.2f\t%.2f"),FrameMs[29],FrameMs[56]));
        Screenshot = Output / TEXT("capture.png");
        FScreenshotRequest::RequestScreenshot(Screenshot,false,false,false);
    }
}

namespace
{
void SendKey(APlayerController& PC, FKey Key, bool bDown)
{
    auto Input = FInputKeyEventArgs::CreateSimulated(Key, bDown ? IE_Pressed : IE_Released, bDown ? 1 : 0);
    PC.InputKey(Input);
}
}

void UTibetQASubsystem::Play(APlayerController& PC, ATibetGameMode& Mode)
{
    const double Now = FPlatformTime::Seconds();
    if (Now - Began > 240) { Finish(false, TEXT("Play timeout")); return; }
    if (Now - Began < 2.0) return;
    if (Tapped.IsValid()) { SendKey(PC,Tapped,false); Tapped = FKey(); }
    const int32 Step = Mode.GetStep(), Progress = Mode.GetStepProgress();
    const FName Kind = Mode.GetObjectiveKind();
    const FVector Pos = PC.GetPawn()->GetActorLocation();
    const FVector Goal = Task == TEXT("GroveEntry") ? FVector(-1860,-480,0) : Mode.GetObjectiveLocation();
    if (Step != PreviousStep || Progress != PreviousProgress)
    {
        Record(FString::Printf(TEXT("step\t%s\t%d\t%d\t%s\t%s\t%s"),*GetWorld()->GetMapName(),Step,Progress,*Kind.ToString(),
            *Pos.ToCompactString(),*Goal.ToCompactString()));
        if (Step != PreviousStep)
            {
            FString File = Output / FString::Printf(TEXT("%s-%03d.png"),*GetWorld()->GetMapName(),Step);
            if (FPaths::FileExists(File))
                File = Output / FString::Printf(TEXT("%s-return-%03d.png"),*GetWorld()->GetMapName(),Step);
            FScreenshotRequest::RequestScreenshot(File,true,false,false);
        }
        PreviousStep = Step; PreviousProgress = Progress;
    }
    int32 StopStep = INDEX_NONE;
    FParse::Value(FCommandLine::Get(),TEXT("TibetQAStopStep="),StopStep);
    if (StopStep != INDEX_NONE && Step == StopStep && !FScreenshotRequest::IsScreenshotRequested())
    { Finish(true,TEXT("checkpoint")); return; }
    if (Mode.IsCampaignComplete() && Task == TEXT("Campaign"))
    { Finish(true,TEXT("campaign completed")); return; }

    const bool bFight = Kind == TEXT("Combat") || Kind == TEXT("Boss");
    FVector Offset = Goal-Pos;
    Offset.Z = 0;
    if (!Offset.IsNearlyZero()) PC.SetControlRotation(Offset.Rotation());
    const bool bWalk = Offset.Size2D() > (bFight ? 320.0 : 65.0);
    if (bWalk != bMoving) { SendKey(PC,EKeys::W,bWalk); bMoving=bWalk; }
    if (!bWalk && Now - LastAction >= 0.26 && !FScreenshotRequest::IsScreenshotRequested())
    {
        Tapped = bFight ? EKeys::SpaceBar : EKeys::E;
        SendKey(PC,Tapped,true);
        LastAction=Now;
    }
}
