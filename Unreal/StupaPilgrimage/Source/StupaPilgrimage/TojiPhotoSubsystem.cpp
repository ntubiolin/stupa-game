#include "TojiPhotoSubsystem.h"
#include "TojiGameMode.h"
#include "HAL/PlatformMisc.h"
#include "HAL/PlatformTime.h"
#include "Misc/Parse.h"
#include "Camera/CameraActor.h"
#include "Camera/CameraComponent.h"
#include "Camera/PlayerCameraManager.h"
#include "Dom/JsonObject.h"
#include "Engine/Engine.h"
#include "Engine/GameViewportClient.h"
#include "Engine/World.h"
#include "GameFramework/Character.h"
#include "GameFramework/HUD.h"
#include "GameFramework/PlayerController.h"
#include "Components/CapsuleComponent.h"
#include "HAL/FileManager.h"
#include "HAL/IConsoleManager.h"
#include "Misc/CommandLine.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Misc/EngineVersion.h"
#include "Serialization/JsonSerializer.h"
#include "UnrealClient.h"

bool UTojiPhotoSubsystem::ShouldCreateSubsystem(UObject* Outer) const
{
#if UE_BUILD_SHIPPING
    return false;
#else
    FString Output;
    const UWorld* World = Cast<UWorld>(Outer);
    return World && World->WorldType == EWorldType::Game &&
        FParse::Value(FCommandLine::Get(), TEXT("TojiPhotoDir="), Output) && !Output.IsEmpty();
#endif
}

TStatId UTojiPhotoSubsystem::GetStatId() const
{
    RETURN_QUICK_DECLARE_CYCLE_STAT(UTojiPhotoSubsystem, STATGROUP_Tickables);
}

void UTojiPhotoSubsystem::Fail(const FString& Reason)
{
    UE_LOG(LogTemp, Error, TEXT("Toji photograph: %s"), *Reason);
    bFinished = true;
    FPlatformMisc::RequestExitWithStatus(false, 1, TEXT("TojiPhotoSubsystem"));
}

void UTojiPhotoSubsystem::Tick(float)
{
    if (bFinished) return;
    const double Now = FPlatformTime::Seconds();
    UWorld* World = GetWorld();
    APlayerController* PC = World->GetFirstPlayerController();
    if (!PC || !PC->GetPawn() || !PC->PlayerCameraManager || !GEngine->GameViewport ||
        !GEngine->GameViewport->Viewport) return;
    if (!Camera)
    {
        if (!World->GetMapName().EndsWith(TEXT("Toji"))) { Fail(TEXT("Unexpected map")); return; }
        FString Dir, EyeText, LookText;
        const TCHAR* Args = FCommandLine::Get();
        FVector Eye, Look;
        FParse::Value(Args, TEXT("TojiPhotoDir="), Dir);
        FParse::Value(Args, TEXT("TojiEye="), EyeText);
        FParse::Value(Args, TEXT("TojiLook="), LookText);
        if (!Eye.InitFromString(EyeText) || !Look.InitFromString(LookText) || Eye.Equals(Look)) {
            Fail(TEXT("Invalid photograph coordinates")); return;
        }
        ImagePath = FPaths::Combine(Dir, TEXT("capture.png"));
        MetadataPath = FPaths::Combine(Dir, TEXT("measurement.json"));
        if (FPaths::IsRelative(ImagePath) || FPaths::FileExists(ImagePath) || FPaths::FileExists(MetadataPath)) {
            Fail(TEXT("Expected a fresh absolute output directory")); return;
        }
        auto* Pawn = PC->GetPawn();
        FString SubjectText;
        if (FParse::Value(Args, TEXT("TojiSubject="), SubjectText))
        {
            FVector Ground;
            auto* Character = Cast<ACharacter>(Pawn);
            if (!Ground.InitFromString(SubjectText) || !Character) { Fail(TEXT("Invalid subject")); return; }
            Ground.Z += Character->GetCapsuleComponent()->GetScaledCapsuleHalfHeight();
            Character->SetActorLocationAndRotation(Ground, FRotator(0, 180, 0), false, nullptr, ETeleportType::TeleportPhysics);
        }
        else Pawn->SetActorHiddenInGame(true);

        Camera = World->SpawnActor<ACameraActor>(Eye, (Look - Eye).Rotation());
        if (!Camera) { Fail(TEXT("Could not place camera")); return; }
        const FIntPoint Size = GEngine->GameViewport->Viewport->GetSizeXY();
        if (Size.X <= 0 || Size.Y <= 0) { Fail(TEXT("Missing viewport size")); return; }
        const double Aspect = double(Size.X) / Size.Y;
        auto* Lens = Camera->GetCameraComponent();
        Lens->bConstrainAspectRatio = false;
        Lens->bOverrideAspectRatioAxisConstraint = true;
        Lens->AspectRatioAxisConstraint = EAspectRatioAxisConstraint::AspectRatio_MaintainXFOV;
        Lens->SetFieldOfView(FMath::RadiansToDegrees(2.0 * FMath::Atan(Aspect * FMath::Tan(FMath::DegreesToRadians(27.5)))));
        PC->SetViewTarget(Camera);
        if (AHUD* HUD = PC->GetHUD()) HUD->bShowHUD = false;
        WarmupFrames = 0;
        LastTime = Now;
        return;
    }
    if (ScreenshotRequestedAt > 0)
    {
        if (IFileManager::Get().FileSize(*ImagePath) > 0 && !FScreenshotRequest::IsScreenshotRequested())
        {
            SaveMeasurement();
            return;
        }
        if (Now - ScreenshotRequestedAt > 30) Fail(TEXT("Screenshot was not written"));
        return;
    }
    if (PC->GetViewTarget() != Camera || !PC->PlayerCameraManager->GetCameraLocation().Equals(Camera->GetActorLocation(), 1.0))
    {
        if (++WarmupFrames > 180) Fail(TEXT("Capture camera did not become active"));
        LastTime = Now;
        return;
    }
    if (++WarmupFrames > 90) IntervalsMs.Add((Now - LastTime) * 1000.);
    LastTime = Now;
    if (IntervalsMs.Num() >= 90)
    {
        ScreenshotRequestedAt = Now;
        FScreenshotRequest::RequestScreenshot(ImagePath, false, false, false);
    }
}

void UTojiPhotoSubsystem::SaveMeasurement()
{
    TSharedRef<FJsonObject> Result = MakeShared<FJsonObject>();
    Result->SetStringField(TEXT("map"), GetWorld()->GetMapName());
    Result->SetStringField(TEXT("engine"), FEngineVersion::Current().ToString());
    Result->SetStringField(TEXT("platform"), FPlatformProperties::PlatformName());
    Result->SetStringField(TEXT("gpu"), FPlatformMisc::GetPrimaryGPUBrand());
    auto* PC = GetWorld()->GetFirstPlayerController();
    const auto* Mode = GetWorld()->GetAuthGameMode<ATojiGameMode>();
    const auto* View = PC->PlayerCameraManager;
    if (!Mode || PC->GetViewTarget() != Camera) { Fail(TEXT("Unexpected active camera or mode")); return; }
    const auto SaveVector = [&Result](const TCHAR* Key, const FVector& V)
    {
        TArray<TSharedPtr<FJsonValue>> Values;
        for (double N : { V.X, V.Y, V.Z }) Values.Add(MakeShared<FJsonValueNumber>(N));
        Result->SetArrayField(Key, Values);
    };
    SaveVector(TEXT("eyeCm"), View->GetCameraLocation());
    SaveVector(TEXT("forward"), View->GetCameraRotation().Vector());
    SaveVector(TEXT("pawnCm"), PC->GetPawn()->GetActorLocation());
    Result->SetBoolField(TEXT("pawnHidden"), PC->GetPawn()->IsHidden());
    Result->SetNumberField(TEXT("lightPreset"), Mode->GetTimeOfDay());
    Result->SetNumberField(TEXT("horizontalFov"), View->GetFOVAngle());
    const FIntPoint Size = GEngine->GameViewport->Viewport->GetSizeXY();
    Result->SetNumberField(TEXT("width"), Size.X);
    Result->SetNumberField(TEXT("height"), Size.Y);
    for (const TCHAR* Name : { TEXT("r.ScreenPercentage"), TEXT("r.AntiAliasingMethod"), TEXT("r.DynamicRes.OperationMode"), TEXT("r.DynamicGlobalIlluminationMethod"), TEXT("sg.ShadowQuality"), TEXT("sg.GlobalIlluminationQuality") })
    {
        if (const auto* Variable = IConsoleManager::Get().FindConsoleVariable(Name))
            Result->SetStringField(Name, Variable->GetString());
    }
    TArray<TSharedPtr<FJsonValue>> Samples;
    for (double Value : IntervalsMs) Samples.Add(MakeShared<FJsonValueNumber>(Value));
    Result->SetArrayField(TEXT("frameIntervalsMs"), Samples);
    FString Text;
    const auto Writer = TJsonWriterFactory<>::Create(&Text);
    if (!FJsonSerializer::Serialize(Result, Writer) || !FFileHelper::SaveStringToFile(Text, *MetadataPath))
    {
        Fail(TEXT("Could not persist measurement")); return;
    }
    bFinished = true;
    FPlatformMisc::RequestExit(false, TEXT("TojiPhotoSubsystem"));
}
